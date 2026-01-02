/**
 * BookingCommandService - Write operations for bookings
 *
 * This service handles all write/mutation operations:
 * - create: Create a new booking (schedule or availability model)
 * - update: Update booking fields
 * - confirm: Confirm a pending booking
 * - cancel: Cancel a booking
 * - markNoShow: Mark booking as no-show
 * - complete: Mark booking as completed
 * - reschedule: Move booking to different schedule
 * - updatePaymentStatus: Update payment status
 */

import { eq, and, sql } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
  schedules,
  tours,
  type PaymentStatus,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext } from "../types";
import { NotFoundError, ValidationError } from "../types";
import { bookingLogger } from "../lib/logger";
import { TourAvailabilityService } from "../tour-availability-service";
import { BookingCore } from "./booking-core";
import { BookingQueryService } from "./booking-query-service";
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingWithRelations,
} from "./types";

export class BookingCommandService extends BaseService {
  private queryService: BookingQueryService;

  constructor(
    ctx: ServiceContext,
    private core: BookingCore
  ) {
    super(ctx);
    this.queryService = new BookingQueryService(ctx, core);
  }

  /**
   * Create a booking - supports both schedule-based and availability-based models.
   *
   * During migration, both models are supported:
   * - Schedule-based: Provide scheduleId -> capacity tracked via schedule.bookedCount
   * - Availability-based: Provide tourId + bookingDate + bookingTime -> capacity computed dynamically
   *
   * If scheduleId is provided, the new fields (tourId, bookingDate, bookingTime) are also
   * populated from the schedule data for forward compatibility (dual-write).
   */
  async create(input: CreateBookingInput): Promise<BookingWithRelations> {
    // Determine which booking model to use
    const useScheduleModel = !!input.scheduleId;
    const useAvailabilityModel = !!(input.tourId && input.bookingDate && input.bookingTime);

    // Validate: must have at least one complete set
    if (!useScheduleModel && !useAvailabilityModel) {
      throw new ValidationError(
        "Must provide either scheduleId (legacy) or tourId + bookingDate + bookingTime (new model)"
      );
    }

    // Validate customer
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, input.customerId),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", input.customerId);
    }

    const totalParticipants =
      input.adultCount + (input.childCount || 0) + (input.infantCount || 0);

    // Variables to be populated by either model
    let scheduleId: string | undefined = input.scheduleId;
    let tourId: string;
    let bookingDate: Date;
    let bookingTime: string;
    let pricePerPerson: number;
    let currency: string;
    let tour: typeof tours.$inferSelect | null = null;

    if (useScheduleModel) {
      // ========== SCHEDULE-BASED MODEL (LEGACY) ==========
      // Fetch schedule and tour info
      const scheduleResult = await this.db
        .select({
          schedule: schedules,
          tour: tours,
        })
        .from(schedules)
        .leftJoin(tours, eq(schedules.tourId, tours.id))
        .where(
          and(
            eq(schedules.id, input.scheduleId!),
            eq(schedules.organizationId, this.organizationId)
          )
        )
        .limit(1);

      const scheduleRow = scheduleResult[0];
      if (!scheduleRow) {
        throw new NotFoundError("Schedule", input.scheduleId!);
      }

      const { schedule: sched, tour: scheduleTour } = scheduleRow;
      tour = scheduleTour;

      if (sched.status === "cancelled") {
        throw new ValidationError("Cannot book a cancelled schedule");
      }

      const availableSpots = sched.maxParticipants - (sched.bookedCount || 0);
      if (totalParticipants > availableSpots) {
        throw new ValidationError(
          `Not enough availability. Only ${availableSpots} spots remaining.`
        );
      }

      // Extract tourId, date, and time from schedule for dual-write
      tourId = sched.tourId;
      bookingDate = new Date(sched.startsAt);
      bookingDate.setHours(0, 0, 0, 0); // Normalize to start of day
      bookingTime = this.core.extractTimeFromDate(sched.startsAt);

      pricePerPerson = parseFloat(sched.price || scheduleTour?.basePrice || "0");
      currency = sched.currency || scheduleTour?.currency || "USD";

    } else {
      // ========== AVAILABILITY-BASED MODEL (NEW) ==========
      // Validate tour exists
      const tourResult = await this.db.query.tours.findFirst({
        where: and(
          eq(tours.id, input.tourId!),
          eq(tours.organizationId, this.organizationId)
        ),
      });

      if (!tourResult) {
        throw new NotFoundError("Tour", input.tourId!);
      }

      tour = tourResult;
      tourId = input.tourId!;
      bookingDate = input.bookingDate!;
      bookingTime = input.bookingTime!;

      // Check availability via TourAvailabilityService
      const availabilityService = new TourAvailabilityService(this.ctx);
      const availability = await availabilityService.checkSlotAvailability({
        tourId,
        date: bookingDate,
        time: bookingTime,
        requestedSpots: totalParticipants,
      });

      if (!availability.available) {
        const reasons: Record<string, string> = {
          blackout: "Tour is not operating on this date (blackout)",
          not_operating: "Tour does not operate on this date",
          sold_out: "This tour is sold out",
          insufficient_capacity: `Not enough availability. Only ${availability.spotsRemaining} spots remaining.`,
          past_date: "Cannot book a date in the past",
        };
        throw new ValidationError(
          reasons[availability.reason || ""] || "Slot is not available"
        );
      }

      pricePerPerson = parseFloat(tourResult.basePrice || "0");
      currency = tourResult.currency || "USD";
      scheduleId = undefined; // No schedule for availability-based bookings
    }

    // Calculate pricing
    const subtotal =
      input.subtotal || (pricePerPerson * input.adultCount).toFixed(2);
    const discount = input.discount || "0";
    const tax = input.tax || "0";
    const total =
      input.total ||
      (
        parseFloat(subtotal) -
        parseFloat(discount) +
        parseFloat(tax)
      ).toFixed(2);

    const referenceNumber = this.generateReferenceNumber("BK");

    // Use a transaction to ensure all-or-nothing semantics
    const bookingId = await this.db.transaction(async (tx) => {
      // 1. Insert the booking
      // For availability-based bookings: only write new fields (tourId, bookingDate, bookingTime, guestAdults, etc.)
      // For schedule-based bookings: write both old and new fields for backward compatibility
      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: this.organizationId,
          referenceNumber,
          customerId: input.customerId,
          // Legacy field - only write for schedule-based bookings
          scheduleId: useScheduleModel ? scheduleId : null,
          // New fields for availability-based model
          tourId: tourId,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          // Rest of the fields
          bookingOptionId: input.bookingOptionId,
          // Guest counts - always use new fields
          guestAdults: input.guestAdults ?? input.adultCount,
          guestChildren: input.guestChildren ?? input.childCount ?? 0,
          guestInfants: input.guestInfants ?? input.infantCount ?? 0,
          pricingSnapshot: input.pricingSnapshot,
          // Legacy guest count fields - only write for schedule-based bookings
          adultCount: useScheduleModel ? input.adultCount : 0,
          childCount: useScheduleModel ? (input.childCount || 0) : 0,
          infantCount: useScheduleModel ? (input.infantCount || 0) : 0,
          totalParticipants,
          subtotal,
          discount,
          tax,
          total,
          currency,
          status: "pending",
          paymentStatus: "pending",
          source: input.source || "manual",
          sourceDetails: input.sourceDetails,
          specialRequests: input.specialRequests,
          dietaryRequirements: input.dietaryRequirements,
          accessibilityNeeds: input.accessibilityNeeds,
          internalNotes: input.internalNotes,
        })
        .returning();

      if (!booking) {
        throw new Error("Failed to create booking");
      }

      // 2. Insert participants if provided
      if (input.participants && input.participants.length > 0) {
        await tx.insert(bookingParticipants).values(
          input.participants.map((p) => ({
            organizationId: this.organizationId,
            bookingId: booking.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
            type: p.type,
            dietaryRequirements: p.dietaryRequirements,
            accessibilityNeeds: p.accessibilityNeeds,
            notes: p.notes,
          }))
        );
      }

      // 3. For schedule-based bookings, update schedule bookedCount with atomic capacity check
      if (useScheduleModel && scheduleId) {
        const updateResult = await tx
          .update(schedules)
          .set({
            bookedCount: sql`COALESCE(${schedules.bookedCount}, 0) + ${totalParticipants}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schedules.id, scheduleId),
              eq(schedules.organizationId, this.organizationId),
              // Atomic capacity check - only update if there's room
              sql`COALESCE(${schedules.bookedCount}, 0) + ${totalParticipants} <= ${schedules.maxParticipants}`
            )
          )
          .returning();

        // If no rows updated, capacity was exceeded (race condition caught)
        if (updateResult.length === 0) {
          bookingLogger.warn({
            organizationId: this.organizationId,
            scheduleId,
            requestedParticipants: totalParticipants,
          }, "Booking failed: capacity exceeded during transaction");
          throw new ValidationError("Schedule capacity exceeded. Please try again with fewer participants.");
        }
      }

      // For availability-based bookings, no schedule update needed.
      // Capacity is computed dynamically by counting bookings.

      return booking.id;
    });

    bookingLogger.info({
      organizationId: this.organizationId,
      bookingId,
      referenceNumber,
      customerId: input.customerId,
      scheduleId: scheduleId || null,
      tourId,
      bookingDate: bookingDate.toISOString().split("T")[0],
      bookingTime,
      totalParticipants,
      total,
      source: input.source || "manual",
      model: useScheduleModel ? "schedule" : "availability",
    }, "Booking created successfully");

    // Recalculate guide requirements after booking creation (schedule-based only)
    if (scheduleId) {
      await this.core.recalculateGuideRequirements(scheduleId);
    }

    return this.queryService.getById(bookingId);
  }

  /**
   * Update booking fields (counts, notes, etc.)
   */
  async update(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };

    if (
      input.adultCount !== undefined ||
      input.childCount !== undefined ||
      input.infantCount !== undefined
    ) {
      const newAdults = input.adultCount ?? booking.adultCount;
      const newChildren = input.childCount ?? booking.childCount ?? 0;
      const newInfants = input.infantCount ?? booking.infantCount ?? 0;
      const newTotal = newAdults + newChildren + newInfants;
      const oldTotal = booking.totalParticipants;
      const diff = newTotal - oldTotal;

      if (diff !== 0 && booking.scheduleId) {
        if (diff > 0 && booking.schedule) {
          const schedule = await this.db.query.schedules.findFirst({
            where: eq(schedules.id, booking.scheduleId),
          });

          if (schedule) {
            const available =
              schedule.maxParticipants - (schedule.bookedCount || 0);
            if (diff > available) {
              throw new ValidationError(
                `Not enough availability. Only ${available} additional spots remaining.`
              );
            }
          }
        }

        await this.db
          .update(schedules)
          .set({
            bookedCount: sql`${schedules.bookedCount} + ${diff}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schedules.id, booking.scheduleId),
              eq(schedules.organizationId, this.organizationId)
            )
          );
      }

      updateData.totalParticipants = newTotal;
    }

    const [updated] = await this.db
      .update(bookings)
      .set(updateData)
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    // Recalculate guide requirements if participant counts changed
    if (
      booking.scheduleId &&
      (input.adultCount !== undefined ||
       input.childCount !== undefined ||
       input.infantCount !== undefined)
    ) {
      await this.core.recalculateGuideRequirements(booking.scheduleId);
    }

    return this.queryService.getById(updated.id);
  }

  /**
   * Confirm a pending booking
   */
  async confirm(id: string): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status !== "pending") {
      throw new ValidationError(
        `Cannot confirm booking with status "${booking.status}"`
      );
    }

    const [updated] = await this.db
      .update(bookings)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    return this.queryService.getById(updated.id);
  }

  /**
   * Cancel a booking and release capacity
   */
  async cancel(id: string, reason?: string): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status === "cancelled") {
      throw new ValidationError("Booking is already cancelled");
    }

    if (booking.status === "completed") {
      throw new ValidationError("Cannot cancel a completed booking");
    }

    // Update schedule booked count if this booking has a schedule
    if (booking.scheduleId) {
      await this.db
        .update(schedules)
        .set({
          bookedCount: sql`GREATEST(0, ${schedules.bookedCount} - ${booking.totalParticipants})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, booking.scheduleId),
            eq(schedules.organizationId, this.organizationId)
          )
        );
    }

    const [updated] = await this.db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    // Recalculate guide requirements after cancellation
    if (booking.scheduleId) {
      await this.core.recalculateGuideRequirements(booking.scheduleId);
    }

    return this.queryService.getById(updated.id);
  }

  /**
   * Mark a confirmed booking as no-show
   */
  async markNoShow(id: string): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status !== "confirmed") {
      throw new ValidationError(
        `Cannot mark as no-show. Current status: "${booking.status}"`
      );
    }

    const [updated] = await this.db
      .update(bookings)
      .set({
        status: "no_show",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    return this.queryService.getById(updated.id);
  }

  /**
   * Mark a confirmed booking as completed
   */
  async complete(id: string): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status !== "confirmed") {
      throw new ValidationError(
        `Cannot complete booking with status "${booking.status}"`
      );
    }

    const [updated] = await this.db
      .update(bookings)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    return this.queryService.getById(updated.id);
  }

  /**
   * Reschedule a booking to a different schedule
   */
  async reschedule(id: string, newScheduleId: string): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new ValidationError(
        `Cannot reschedule a ${booking.status} booking`
      );
    }

    // Store old scheduleId for later updates
    const oldScheduleId = booking.scheduleId;

    // Get new schedule
    const newScheduleResult = await this.db
      .select({
        schedule: schedules,
        tour: tours,
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.id, newScheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const newScheduleRow = newScheduleResult[0];
    if (!newScheduleRow) {
      throw new NotFoundError("Schedule", newScheduleId);
    }

    const newSchedule = newScheduleRow.schedule;

    if (newSchedule.status === "cancelled") {
      throw new ValidationError("Cannot reschedule to a cancelled schedule");
    }

    // Check availability on new schedule
    const availableSpots = newSchedule.maxParticipants - (newSchedule.bookedCount || 0);
    if (booking.totalParticipants > availableSpots) {
      throw new ValidationError(
        `Not enough availability on new schedule. Only ${availableSpots} spots remaining.`
      );
    }

    // Decrement old schedule's booked count (if there was one)
    if (oldScheduleId) {
      await this.db
        .update(schedules)
        .set({
          bookedCount: sql`GREATEST(0, ${schedules.bookedCount} - ${booking.totalParticipants})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, oldScheduleId),
            eq(schedules.organizationId, this.organizationId)
          )
        );
    }

    // Increment new schedule's booked count
    await this.db
      .update(schedules)
      .set({
        bookedCount: sql`COALESCE(${schedules.bookedCount}, 0) + ${booking.totalParticipants}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schedules.id, newScheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      );

    // Update the booking
    const [updated] = await this.db
      .update(bookings)
      .set({
        scheduleId: newScheduleId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    // Recalculate guide requirements for both old and new schedules
    const recalcPromises = [this.core.recalculateGuideRequirements(newScheduleId)];
    if (oldScheduleId) {
      recalcPromises.push(this.core.recalculateGuideRequirements(oldScheduleId));
    }
    await Promise.all(recalcPromises);

    return this.queryService.getById(updated.id);
  }

  /**
   * Reschedule an availability-based booking to a different date/time.
   *
   * This method handles rescheduling for bookings that use the new availability model
   * (tourId + bookingDate + bookingTime) rather than the legacy schedule model.
   * It validates availability at the new slot and updates the booking date/time.
   */
  async rescheduleByAvailability(
    id: string,
    input: {
      tourId?: string;
      bookingDate: Date;
      bookingTime: string;
    }
  ): Promise<BookingWithRelations> {
    const booking = await this.queryService.getById(id);

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new ValidationError(
        `Cannot reschedule a ${booking.status} booking`
      );
    }

    // Use existing tourId if not provided
    const newTourId = input.tourId || booking.tourId;
    if (!newTourId) {
      throw new ValidationError(
        "Cannot reschedule: booking has no tourId and none was provided"
      );
    }

    // Validate tour exists
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, newTourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", newTourId);
    }

    // Check availability at the new slot
    const availabilityService = new TourAvailabilityService(this.ctx);
    const availability = await availabilityService.checkSlotAvailability({
      tourId: newTourId,
      date: input.bookingDate,
      time: input.bookingTime,
      requestedSpots: booking.totalParticipants,
      // Exclude this booking from capacity check (it's being moved, not added)
      excludeBookingId: id,
    });

    if (!availability.available) {
      const reasons: Record<string, string> = {
        blackout: "Tour is not operating on this date (blackout)",
        not_operating: "Tour does not operate on this date",
        sold_out: "This tour is sold out",
        insufficient_capacity: `Not enough availability. Only ${availability.spotsRemaining} spots remaining.`,
        past_date: "Cannot reschedule to a date in the past",
      };
      throw new ValidationError(
        reasons[availability.reason || ""] || "Slot is not available"
      );
    }

    // Update the booking with new date/time (and optionally new tour)
    const [updated] = await this.db
      .update(bookings)
      .set({
        tourId: newTourId,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    bookingLogger.info({
      organizationId: this.organizationId,
      bookingId: id,
      oldTourId: booking.tourId,
      newTourId,
      oldDate: booking.bookingDate?.toISOString().split("T")[0],
      newDate: input.bookingDate.toISOString().split("T")[0],
      oldTime: booking.bookingTime,
      newTime: input.bookingTime,
    }, "Booking rescheduled (availability model)");

    return this.queryService.getById(updated.id);
  }

  /**
   * Update payment status for a booking
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paidAmount?: string,
    stripePaymentIntentId?: string
  ): Promise<BookingWithRelations> {
    await this.queryService.getById(id);

    const [updated] = await this.db
      .update(bookings)
      .set({
        paymentStatus,
        paidAmount,
        stripePaymentIntentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Booking", id);
    }

    return this.queryService.getById(updated.id);
  }
}
