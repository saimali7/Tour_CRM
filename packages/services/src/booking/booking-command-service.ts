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

import { eq, and } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
  tours,
  type PaymentStatus,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext } from "../types";
import { NotFoundError, ValidationError, ServiceError } from "../types";
import { createServiceLogger } from "../lib/logger";
import { TourAvailabilityService } from "../tour-availability-service";
import type { BookingCore } from "./booking-core";
import { BookingQueryService } from "./booking-query-service";
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingWithRelations,
} from "./types";

export class BookingCommandService extends BaseService {
  private queryService: BookingQueryService;
  private logger: ReturnType<typeof createServiceLogger>;

  constructor(
    ctx: ServiceContext,
    private core: BookingCore
  ) {
    super(ctx);
    this.queryService = new BookingQueryService(ctx, core);
    this.logger = createServiceLogger("booking-command", ctx.organizationId);
  }

  /**
   * Create a booking using the availability-based model.
   *
   * Requires tourId + bookingDate + bookingTime. Capacity is computed dynamically
   * by counting existing bookings against tour availability settings.
   */
  async create(input: CreateBookingInput): Promise<BookingWithRelations> {
    this.logger.info(
      {
        tourId: input.tourId,
        customerId: input.customerId,
        bookingDate: input.bookingDate?.toISOString().split("T")[0],
        bookingTime: input.bookingTime,
        adultCount: input.adultCount,
        childCount: input.childCount,
        source: input.source || "manual",
      },
      "Creating booking"
    );

    // Validate required fields for availability-based model
    if (!input.tourId || !input.bookingDate || !input.bookingTime) {
      this.logger.warn({ input: { tourId: input.tourId, bookingDate: !!input.bookingDate, bookingTime: input.bookingTime } }, "Booking creation failed: missing required fields");
      throw new ValidationError(
        "Must provide tourId, bookingDate, and bookingTime"
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

    // Validate tour exists
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, input.tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", input.tourId);
    }

    const tourId = input.tourId;
    const bookingDate = input.bookingDate;
    const bookingTime = input.bookingTime;

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
        not_operating: "Tour does not operate on this date",
        sold_out: "This tour is sold out",
        insufficient_capacity: `Not enough spots. Only ${availability.spotsRemaining} spots remaining.`,
        past_date: "Cannot book a date in the past",
        tour_inactive: "This tour is not active and cannot be booked",
        same_day_booking_disabled: "Same-day booking is disabled for this tour",
        same_day_cutoff_passed: "Same-day booking cutoff has passed for this tour",
      };
      throw new ValidationError(
        reasons[availability.reason || ""] || "Slot is not available"
      );
    }

    const pricePerPerson = parseFloat(tour.basePrice || "0");
    const currency = tour.currency || "USD";

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
      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: this.organizationId,
          referenceNumber,
          customerId: input.customerId,
          // Availability-based model fields
          tourId: tourId,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          bookingOptionId: input.bookingOptionId,
          // Guest counts
          guestAdults: input.guestAdults ?? input.adultCount,
          guestChildren: input.guestChildren ?? input.childCount ?? 0,
          guestInfants: input.guestInfants ?? input.infantCount ?? 0,
          pricingSnapshot: input.pricingSnapshot,
          adultCount: input.adultCount,
          childCount: input.childCount || 0,
          infantCount: input.infantCount || 0,
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
        throw new ServiceError("Failed to create booking", "CREATE_FAILED", 500);
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

      // Capacity is computed dynamically by counting bookings - no schedule update needed.

      return booking.id;
    });

    this.logger.info(
      {
        bookingId,
        referenceNumber,
        customerId: input.customerId,
        tourId,
        bookingDate: bookingDate.toISOString().split("T")[0],
        bookingTime,
        totalParticipants,
        total,
        source: input.source || "manual",
      },
      "Booking created successfully"
    );

    return this.queryService.getById(bookingId);
  }

  /**
   * Update booking fields (counts, notes, etc.)
   */
  async update(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
    this.logger.info(
      { bookingId: id, fields: Object.keys(input) },
      "Updating booking"
    );

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

      // For availability-based bookings, check capacity via TourAvailabilityService
      if (diff > 0 && booking.tourId && booking.bookingDate && booking.bookingTime) {
        const availabilityService = new TourAvailabilityService(this.ctx);
        const availability = await availabilityService.checkSlotAvailability({
          tourId: booking.tourId,
          date: booking.bookingDate,
          time: booking.bookingTime,
          requestedSpots: diff,
          excludeBookingId: id, // Exclude current booking from count
        });

        if (!availability.available) {
          const reasons: Record<string, string> = {
            not_operating: "Tour does not operate on this date",
            sold_out: "This tour is sold out",
            insufficient_capacity: `Not enough spots. Only ${availability.spotsRemaining} additional spots remaining.`,
            past_date: "Cannot update participants for a date in the past",
            tour_inactive: "This tour is not active and cannot be booked",
            same_day_booking_disabled:
              "Same-day booking is disabled for this tour",
            same_day_cutoff_passed:
              "Same-day booking cutoff has passed for this tour",
          };
          throw new ValidationError(
            reasons[availability.reason || ""] || "Slot is not available"
          );
        }
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

    this.logger.info({ bookingId: id }, "Booking updated successfully");

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
    this.logger.info(
      { bookingId: id, reason: reason || "not provided" },
      "Cancelling booking"
    );

    const booking = await this.queryService.getById(id);

    if (booking.status === "cancelled") {
      this.logger.warn({ bookingId: id }, "Booking cancellation failed: already cancelled");
      throw new ValidationError("Booking is already cancelled");
    }

    if (booking.status === "completed") {
      this.logger.warn({ bookingId: id }, "Booking cancellation failed: already completed");
      throw new ValidationError("Cannot cancel a completed booking");
    }

    // Capacity is computed dynamically by counting bookings - no schedule update needed.

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

    this.logger.info(
      {
        bookingId: id,
        referenceNumber: booking.referenceNumber,
        customerId: booking.customerId,
        reason,
      },
      "Booking cancelled successfully"
    );

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
   * Reschedule a booking to a different date/time.
   *
   * This method validates availability at the new slot and updates the booking date/time.
   * Optionally allows moving to a different tour.
   */
  async reschedule(
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
        not_operating: "Tour does not operate on this date",
        sold_out: "This tour is sold out",
        insufficient_capacity: `Not enough spots. Only ${availability.spotsRemaining} spots remaining.`,
        past_date: "Cannot reschedule to a date in the past",
        tour_inactive: "This tour is not active and cannot be booked",
        same_day_booking_disabled: "Same-day booking is disabled for this tour",
        same_day_cutoff_passed: "Same-day booking cutoff has passed for this tour",
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

    this.logger.info(
      {
        bookingId: id,
        oldTourId: booking.tourId,
        newTourId,
        oldDate: booking.bookingDate?.toISOString().split("T")[0],
        newDate: input.bookingDate.toISOString().split("T")[0],
        oldTime: booking.bookingTime,
        newTime: input.bookingTime,
      },
      "Booking rescheduled"
    );

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
