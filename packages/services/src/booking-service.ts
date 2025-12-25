import { eq, and, desc, asc, sql, count, gte, lte, ilike, or, inArray, isNotNull } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
  schedules,
  tours,
  type Booking,
  type BookingParticipant,
  type BookingStatus,
  type PaymentStatus,
  type BookingSource,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  type DateRangeFilter,
  NotFoundError,
  ValidationError,
} from "./types";
import { bookingLogger } from "./lib/logger";
import { ScheduleService } from "./schedule-service";
import { TourAvailabilityService } from "./tour-availability-service";

export interface BookingFilters {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  source?: BookingSource;
  customerId?: string;
  scheduleId?: string;
  tourId?: string;
  dateRange?: DateRangeFilter;
  scheduleDateRange?: DateRangeFilter; // Filter by schedule start date
  search?: string;
}

export type BookingSortField = "createdAt" | "total" | "referenceNumber";

export interface BookingWithRelations extends Booking {
  customer?: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  schedule?: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
  };
  tour?: {
    id: string;
    name: string;
    slug: string;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
  };
  participants?: BookingParticipant[];
}

export interface PricingSnapshot {
  optionId?: string;
  optionName?: string;
  pricingModel?: unknown;
  experienceMode?: "join" | "book" | "charter";
  priceBreakdown?: string;
}

/**
 * CreateBookingInput supports two booking models:
 *
 * 1. **Schedule-based (legacy)**: Provide `scheduleId`
 *    - Booking is linked to a pre-created schedule
 *    - Capacity tracked via schedule.bookedCount
 *    - tourId, bookingDate, bookingTime auto-populated from schedule (dual-write)
 *
 * 2. **Availability-based (new)**: Provide `tourId`, `bookingDate`, `bookingTime`
 *    - No schedule record needed
 *    - Capacity computed dynamically by counting bookings
 *    - Validated against TourAvailabilityService
 *
 * During migration, you can provide either or both. If scheduleId is provided,
 * the schedule-based flow is used and new fields are back-filled. If only
 * tourId+date+time is provided, the availability-based flow is used.
 */
export interface CreateBookingInput {
  customerId: string;

  // Schedule-based model (legacy) - optional during migration
  scheduleId?: string;

  // Availability-based model (new) - required if no scheduleId
  tourId?: string;
  bookingDate?: Date;
  bookingTime?: string; // "HH:MM" format

  bookingOptionId?: string;
  guestAdults?: number;
  guestChildren?: number;
  guestInfants?: number;
  pricingSnapshot?: PricingSnapshot;
  adultCount: number;
  childCount?: number;
  infantCount?: number;
  specialRequests?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  internalNotes?: string;
  source?: BookingSource;
  sourceDetails?: string;
  participants?: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    type: "adult" | "child" | "infant";
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
    notes?: string;
  }>;
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
}

export interface UpdateBookingInput {
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  specialRequests?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  internalNotes?: string;
  discount?: string;
  tax?: string;
}

export class BookingService extends BaseService {
  /**
   * Helper to recalculate guide requirements after booking changes
   */
  private async recalculateGuideRequirements(scheduleId: string): Promise<void> {
    try {
      const scheduleService = new ScheduleService(this.ctx);
      await scheduleService.recalculateGuideRequirements(scheduleId);
    } catch (error) {
      // Log but don't fail the booking operation
      bookingLogger.warn({
        organizationId: this.organizationId,
        scheduleId,
        error: error instanceof Error ? error.message : "Unknown error",
      }, "Failed to recalculate guide requirements");
    }
  }

  async getAll(
    filters: BookingFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<BookingSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<BookingWithRelations>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(bookings.organizationId, this.organizationId)];

    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status));
    }
    if (filters.paymentStatus) {
      conditions.push(eq(bookings.paymentStatus, filters.paymentStatus));
    }
    if (filters.source) {
      conditions.push(eq(bookings.source, filters.source));
    }
    if (filters.customerId) {
      conditions.push(eq(bookings.customerId, filters.customerId));
    }
    if (filters.scheduleId) {
      conditions.push(eq(bookings.scheduleId, filters.scheduleId));
    }
    if (filters.tourId) {
      // Filter by tourId - works for both schedule-based and availability-based bookings
      conditions.push(eq(bookings.tourId, filters.tourId));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(bookings.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(bookings.createdAt, filters.dateRange.to));
    }
    // Filter by schedule start date (for calendar view)
    if (filters.scheduleDateRange?.from) {
      conditions.push(gte(schedules.startsAt, filters.scheduleDateRange.from));
    }
    if (filters.scheduleDateRange?.to) {
      conditions.push(lte(schedules.startsAt, filters.scheduleDateRange.to));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(bookings.referenceNumber, `%${filters.search}%`),
          ilike(customers.email, `%${filters.search}%`),
          ilike(customers.firstName, `%${filters.search}%`),
          ilike(customers.lastName, `%${filters.search}%`)
        )!
      );
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(bookings[sort.field])
        : desc(bookings[sort.field]);

    // We use two left joins for tour:
    // 1. Via schedule (for legacy schedule-based bookings where scheduleId is set)
    // 2. Via bookings.tourId directly (for new availability-based bookings)
    // COALESCE picks the first non-null value
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          booking: bookings,
          customer: {
            id: customers.id,
            email: customers.email,
            firstName: customers.firstName,
            lastName: customers.lastName,
            phone: customers.phone,
          },
          schedule: {
            id: schedules.id,
            startsAt: schedules.startsAt,
            endsAt: schedules.endsAt,
            status: schedules.status,
          },
          scheduleTour: {
            id: sql<string>`${tours.id}`.as("schedule_tour_id"),
            name: sql<string>`${tours.name}`.as("schedule_tour_name"),
            slug: sql<string>`${tours.slug}`.as("schedule_tour_slug"),
            meetingPoint: sql<string | null>`${tours.meetingPoint}`.as("schedule_tour_mp"),
            meetingPointDetails: sql<string | null>`${tours.meetingPointDetails}`.as("schedule_tour_mpd"),
          },
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .leftJoin(tours, or(
          eq(schedules.tourId, tours.id),
          and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
        ))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    const formattedData = data.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.scheduleTour?.id ? {
        id: row.scheduleTour.id,
        name: row.scheduleTour.name,
        slug: row.scheduleTour.slug,
        meetingPoint: row.scheduleTour.meetingPoint,
        meetingPointDetails: row.scheduleTour.meetingPointDetails,
      } : undefined,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<BookingWithRelations> {
    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      // Join tour via schedule OR directly via booking.tourId
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const row = result[0];
    if (!row) {
      throw new NotFoundError("Booking", id);
    }

    const participants = await this.db.query.bookingParticipants.findMany({
      where: and(
        eq(bookingParticipants.bookingId, id),
        eq(bookingParticipants.organizationId, this.organizationId)
      ),
    });

    return {
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.tour?.id ? row.tour : undefined,
      participants,
    };
  }

  async getByReference(referenceNumber: string): Promise<BookingWithRelations> {
    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      // Join tour via schedule OR directly via booking.tourId
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.referenceNumber, referenceNumber),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const row = result[0];
    if (!row) {
      throw new NotFoundError("Booking");
    }

    return {
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.tour?.id ? row.tour : undefined,
    };
  }

  /**
   * Create a booking - supports both schedule-based and availability-based models.
   *
   * During migration, both models are supported:
   * - Schedule-based: Provide scheduleId → capacity tracked via schedule.bookedCount
   * - Availability-based: Provide tourId + bookingDate + bookingTime → capacity computed dynamically
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
      bookingTime = this.extractTimeFromDate(sched.startsAt);

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
      // 1. Insert the booking with both old and new fields
      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: this.organizationId,
          referenceNumber,
          customerId: input.customerId,
          // Legacy field (nullable for availability-based bookings)
          scheduleId: scheduleId,
          // New fields for availability-based model
          tourId: tourId,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          // Rest of the fields
          bookingOptionId: input.bookingOptionId,
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
      await this.recalculateGuideRequirements(scheduleId);
    }

    return this.getById(bookingId);
  }

  /**
   * Extract time (HH:MM) from a Date object
   */
  private extractTimeFromDate(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  async update(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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
      await this.recalculateGuideRequirements(booking.scheduleId);
    }

    return this.getById(updated.id);
  }

  async confirm(id: string): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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

    return this.getById(updated.id);
  }

  async cancel(id: string, reason?: string): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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
      await this.recalculateGuideRequirements(booking.scheduleId);
    }

    return this.getById(updated.id);
  }

  async markNoShow(id: string): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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

    return this.getById(updated.id);
  }

  async complete(id: string): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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

    return this.getById(updated.id);
  }

  async reschedule(id: string, newScheduleId: string): Promise<BookingWithRelations> {
    const booking = await this.getById(id);

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
    const recalcPromises = [this.recalculateGuideRequirements(newScheduleId)];
    if (oldScheduleId) {
      recalcPromises.push(this.recalculateGuideRequirements(oldScheduleId));
    }
    await Promise.all(recalcPromises);

    return this.getById(updated.id);
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paidAmount?: string,
    stripePaymentIntentId?: string
  ): Promise<BookingWithRelations> {
    await this.getById(id);

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

    return this.getById(updated.id);
  }

  async addParticipant(
    bookingId: string,
    participant: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      type: "adult" | "child" | "infant";
      dietaryRequirements?: string;
      accessibilityNeeds?: string;
      notes?: string;
    }
  ): Promise<BookingParticipant> {
    await this.getById(bookingId);

    const [created] = await this.db
      .insert(bookingParticipants)
      .values({
        organizationId: this.organizationId,
        bookingId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        phone: participant.phone,
        type: participant.type,
        dietaryRequirements: participant.dietaryRequirements,
        accessibilityNeeds: participant.accessibilityNeeds,
        notes: participant.notes,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to add participant");
    }

    return created;
  }

  async removeParticipant(
    bookingId: string,
    participantId: string
  ): Promise<void> {
    await this.getById(bookingId);

    await this.db
      .delete(bookingParticipants)
      .where(
        and(
          eq(bookingParticipants.id, participantId),
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.organizationId)
        )
      );
  }

  async getStats(dateRange?: DateRangeFilter): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenue: string;
    averageBookingValue: string;
    participantCount: number;
  }> {
    const conditions = [eq(bookings.organizationId, this.organizationId)];

    if (dateRange?.from) {
      conditions.push(gte(bookings.createdAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(bookings.createdAt, dateRange.to));
    }

    const statsResult = await this.db
      .select({
        total: count(),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'pending')`,
        confirmed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'confirmed')`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        revenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)) FILTER (WHERE ${bookings.status} != 'cancelled'), 0)::TEXT`,
        participantCount: sql<number>`COALESCE(SUM(${bookings.totalParticipants}) FILTER (WHERE ${bookings.status} != 'cancelled'), 0)`,
      })
      .from(bookings)
      .where(and(...conditions));

    const stats = statsResult[0];
    const totalCount = stats?.total ?? 0;
    const cancelledCount = Number(stats?.cancelled ?? 0);
    const nonCancelledCount = totalCount - cancelledCount;
    const revenue = stats?.revenue ?? "0";
    const averageBookingValue =
      nonCancelledCount > 0
        ? (parseFloat(revenue) / nonCancelledCount).toFixed(2)
        : "0";

    return {
      total: totalCount,
      pending: Number(stats?.pending ?? 0),
      confirmed: Number(stats?.confirmed ?? 0),
      completed: Number(stats?.completed ?? 0),
      cancelled: cancelledCount,
      revenue,
      averageBookingValue,
      participantCount: Number(stats?.participantCount ?? 0),
    };
  }

  async getForSchedule(scheduleId: string): Promise<BookingWithRelations[]> {
    // Get all active bookings for this schedule (pending, confirmed, completed - exclude cancelled and no_show)
    const result = await this.getAll(
      { scheduleId },
      { limit: 100 }
    );
    // Filter out cancelled and no_show bookings
    return result.data.filter(b => b.status !== "cancelled" && b.status !== "no_show");
  }

  /**
   * Get bookings for a "tour run" (availability-based virtual grouping)
   * A tour run is a unique combination of tourId + date + time
   */
  async getForTourRun(
    tourId: string,
    date: Date,
    time: string
  ): Promise<BookingWithRelations[]> {
    const dateStr = date.toISOString().split("T")[0];

    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          // Include pending and confirmed, exclude cancelled/no_show/completed
          inArray(bookings.status, ["pending", "confirmed"])
        )
      );

    // Fetch participants for all bookings
    const bookingIds = result.map(r => r.booking.id);
    const allParticipants = bookingIds.length > 0
      ? await this.db.query.bookingParticipants.findMany({
          where: and(
            inArray(bookingParticipants.bookingId, bookingIds),
            eq(bookingParticipants.organizationId, this.organizationId)
          ),
        })
      : [];

    // Group participants by booking
    const participantsByBooking = new Map<string, typeof allParticipants>();
    for (const p of allParticipants) {
      const existing = participantsByBooking.get(p.bookingId) || [];
      existing.push(p);
      participantsByBooking.set(p.bookingId, existing);
    }

    return result.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: undefined, // Tour runs don't have schedules
      tour: row.tour?.id ? row.tour : undefined,
      participants: participantsByBooking.get(row.booking.id) || [],
    }));
  }

  /**
   * Get today's confirmed bookings.
   * Supports both schedule-based (schedules.startsAt) and availability-based (bookings.bookingDate) bookings.
   */
  async getTodaysBookings(): Promise<BookingWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      // Join tour via schedule OR directly via booking.tourId
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "confirmed"),
          // Match today's bookings via either:
          // 1. Schedule-based: schedule.startsAt is today
          // 2. Availability-based: booking.bookingDate is today
          or(
            and(
              isNotNull(schedules.startsAt),
              gte(schedules.startsAt, today),
              lte(schedules.startsAt, tomorrow)
            ),
            sql`${bookings.bookingDate}::text = ${todayStr}`
          )
        )
      )
      .orderBy(
        // Sort by schedule.startsAt if available, else by bookingTime
        sql`COALESCE(${schedules.startsAt}, (${bookings.bookingDate}::date + ${bookings.bookingTime}::time)::timestamp)`
      );

    return result.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.tour?.id ? row.tour : undefined,
    }));
  }

  /**
   * Bulk confirm multiple bookings
   * @returns Array of successfully confirmed booking IDs and any errors
   * Optimized to use batch queries instead of N+1
   */
  async bulkConfirm(ids: string[]): Promise<{
    confirmed: string[];
    errors: Array<{ id: string; error: string }>;
  }> {
    if (ids.length === 0) {
      return { confirmed: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all bookings in one query
    const allBookings = await this.db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(allBookings.map(b => b.id));
    const confirmableIds: string[] = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }

      const booking = allBookings.find(b => b.id === id);
      if (booking?.status !== "pending") {
        errors.push({ id, error: `Cannot confirm booking with status "${booking?.status}"` });
        continue;
      }

      confirmableIds.push(id);
    }

    // Batch update all confirmable bookings in one query
    if (confirmableIds.length > 0) {
      await this.db
        .update(bookings)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, confirmableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        confirmedCount: confirmableIds.length,
        ids: confirmableIds,
      }, "Bulk confirmed bookings");
    }

    return { confirmed: confirmableIds, errors };
  }

  /**
   * Bulk cancel multiple bookings
   * @returns Array of successfully cancelled booking IDs and any errors
   * Optimized to use batch queries instead of N+1
   */
  async bulkCancel(
    ids: string[],
    reason?: string
  ): Promise<{
    cancelled: string[];
    errors: Array<{ id: string; error: string }>;
  }> {
    if (ids.length === 0) {
      return { cancelled: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all bookings in one query
    const allBookings = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        scheduleId: bookings.scheduleId,
        totalParticipants: bookings.totalParticipants,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(allBookings.map(b => b.id));
    const cancellableBookings: Array<{ id: string; scheduleId: string | null; totalParticipants: number }> = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }

      const booking = allBookings.find(b => b.id === id);
      if (booking?.status === "cancelled") {
        errors.push({ id, error: "Booking is already cancelled" });
        continue;
      }
      if (booking?.status === "completed") {
        errors.push({ id, error: "Cannot cancel a completed booking" });
        continue;
      }

      cancellableBookings.push({
        id: booking!.id,
        scheduleId: booking!.scheduleId,
        totalParticipants: booking!.totalParticipants,
      });
    }

    if (cancellableBookings.length > 0) {
      const cancellableIds = cancellableBookings.map(b => b.id);

      // Group by schedule to update booked counts efficiently
      const scheduleUpdates = new Map<string, number>();
      for (const booking of cancellableBookings) {
        if (booking.scheduleId) {
          const current = scheduleUpdates.get(booking.scheduleId) || 0;
          scheduleUpdates.set(booking.scheduleId, current + booking.totalParticipants);
        }
      }

      // Update each schedule's booked count (can't batch different decrements easily)
      for (const [scheduleId, totalToDecrement] of scheduleUpdates) {
        await this.db
          .update(schedules)
          .set({
            bookedCount: sql`GREATEST(0, ${schedules.bookedCount} - ${totalToDecrement})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schedules.id, scheduleId),
              eq(schedules.organizationId, this.organizationId)
            )
          );
      }

      // Batch cancel all bookings in one query
      await this.db
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, cancellableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        cancelledCount: cancellableIds.length,
        ids: cancellableIds,
        reason,
      }, "Bulk cancelled bookings");

      // Recalculate guide requirements for all affected schedules
      const affectedScheduleIds = [...scheduleUpdates.keys()];
      await Promise.all(
        affectedScheduleIds.map((scheduleId) =>
          this.recalculateGuideRequirements(scheduleId)
        )
      );

      return { cancelled: cancellableIds, errors };
    }

    return { cancelled: [], errors };
  }

  /**
   * Bulk update payment status for multiple bookings
   * @returns Array of successfully updated booking IDs and any errors
   * Optimized to use batch queries instead of N+1
   */
  async bulkUpdatePaymentStatus(
    ids: string[],
    paymentStatus: PaymentStatus
  ): Promise<{
    updated: string[];
    errors: Array<{ id: string; error: string }>;
  }> {
    if (ids.length === 0) {
      return { updated: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all booking IDs in one query to verify they exist
    const existingBookings = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(existingBookings.map(b => b.id));
    const updatableIds: string[] = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }
      updatableIds.push(id);
    }

    // Batch update all valid bookings in one query
    if (updatableIds.length > 0) {
      await this.db
        .update(bookings)
        .set({
          paymentStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, updatableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        updatedCount: updatableIds.length,
        ids: updatableIds,
        paymentStatus,
      }, "Bulk updated payment status");
    }

    return { updated: updatableIds, errors };
  }

  /**
   * Bulk reschedule multiple bookings to a new schedule
   * @returns Array of successfully rescheduled booking IDs and any errors
   */
  async bulkReschedule(
    ids: string[],
    newScheduleId: string
  ): Promise<{
    rescheduled: string[];
    errors: Array<{ id: string; error: string }>;
  }> {
    const rescheduled: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.reschedule(id, newScheduleId);
        rescheduled.push(id);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { rescheduled, errors };
  }

  // ==========================================================================
  // URGENCY-BASED GROUPING METHODS (for Needs Action / Inbox Zero UI)
  // ==========================================================================

  /**
   * Urgency level based on tour time and booking status
   */
  private getBookingUrgency(booking: BookingWithRelations): "critical" | "high" | "medium" | "low" | "none" | "past" {
    const now = new Date();
    let tourDate: Date | null = null;

    // Determine tour date from schedule or booking fields
    if (booking.schedule?.startsAt) {
      tourDate = new Date(booking.schedule.startsAt);
    } else if (booking.bookingDate && booking.bookingTime) {
      const parts = booking.bookingTime.split(":");
      const hours = parseInt(parts[0] ?? "0", 10);
      const minutes = parseInt(parts[1] ?? "0", 10);
      tourDate = new Date(booking.bookingDate);
      tourDate.setHours(hours, minutes, 0, 0);
    }

    if (!tourDate) return "none";

    // Past tours
    if (tourDate < now) return "past";

    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hasStatusIssue = booking.status === "pending";
    const hasPaymentIssue = booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded";
    const hasIssue = hasStatusIssue || hasPaymentIssue;

    if (!hasIssue) return "none";

    // Critical: Tour is within 24 hours AND has issues
    if (hoursUntilTour <= 24) return "critical";

    // High: Tour is within 48 hours AND has issues
    if (hoursUntilTour <= 48) return "high";

    // Medium: Tour is within 7 days AND has issues
    if (hoursUntilTour <= 168) return "medium";

    // Low: Has issues but tour is far out
    return "low";
  }

  /**
   * Get all bookings grouped by urgency level for "Needs Action" view
   */
  async getGroupedByUrgency(): Promise<{
    critical: BookingWithRelations[];
    high: BookingWithRelations[];
    medium: BookingWithRelations[];
    low: BookingWithRelations[];
    stats: {
      needsAction: number;
      critical: number;
      pendingConfirmation: number;
      unpaid: number;
    };
  }> {
    const now = new Date();
    const sevenDaysOut = new Date(now);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 30); // Look 30 days out for issues

    // Get all upcoming bookings that might need action
    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          // Exclude cancelled and completed
          or(
            eq(bookings.status, "pending"),
            eq(bookings.status, "confirmed")
          ),
          // Only upcoming tours (within 30 days)
          or(
            and(
              isNotNull(schedules.startsAt),
              gte(schedules.startsAt, now),
              lte(schedules.startsAt, sevenDaysOut)
            ),
            and(
              isNotNull(bookings.bookingDate),
              gte(bookings.bookingDate, now),
              lte(bookings.bookingDate, sevenDaysOut)
            )
          )
        )
      )
      .orderBy(
        // Sort by tour date (soonest first)
        sql`COALESCE(${schedules.startsAt}, ${bookings.bookingDate}::timestamp)`
      );

    const bookingsWithRelations = result.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.tour?.id ? row.tour : undefined,
    }));

    // Group by urgency
    const critical: BookingWithRelations[] = [];
    const high: BookingWithRelations[] = [];
    const medium: BookingWithRelations[] = [];
    const low: BookingWithRelations[] = [];
    let pendingConfirmation = 0;
    let unpaid = 0;

    for (const booking of bookingsWithRelations) {
      const urgency = this.getBookingUrgency(booking);

      // Track stats
      if (booking.status === "pending") pendingConfirmation++;
      if (booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded") unpaid++;

      // Only include bookings that need action
      if (urgency === "critical") critical.push(booking);
      else if (urgency === "high") high.push(booking);
      else if (urgency === "medium") medium.push(booking);
      else if (urgency === "low") low.push(booking);
      // Skip "none" and "past" - these don't need action
    }

    return {
      critical,
      high,
      medium,
      low,
      stats: {
        needsAction: critical.length + high.length + medium.length + low.length,
        critical: critical.length,
        pendingConfirmation,
        unpaid,
      },
    };
  }

  /**
   * Get bookings that need action, grouped by issue type
   */
  async getNeedsAction(): Promise<{
    unconfirmed: BookingWithRelations[];
    unpaid: BookingWithRelations[];
    stats: {
      total: number;
      unconfirmed: number;
      unpaid: number;
    };
  }> {
    const now = new Date();

    // Get all pending or unpaid bookings for upcoming tours
    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          // Not cancelled or completed
          or(
            eq(bookings.status, "pending"),
            eq(bookings.status, "confirmed")
          ),
          // Only upcoming tours
          or(
            and(isNotNull(schedules.startsAt), gte(schedules.startsAt, now)),
            and(isNotNull(bookings.bookingDate), gte(bookings.bookingDate, now))
          ),
          // Has some issue (pending status OR unpaid)
          or(
            eq(bookings.status, "pending"),
            and(
              eq(bookings.status, "confirmed"),
              or(
                eq(bookings.paymentStatus, "pending"),
                eq(bookings.paymentStatus, "partial"),
                eq(bookings.paymentStatus, "failed")
              )
            )
          )
        )
      )
      .orderBy(
        // Sort by tour date (soonest first)
        sql`COALESCE(${schedules.startsAt}, ${bookings.bookingDate}::timestamp)`
      );

    const unconfirmed: BookingWithRelations[] = [];
    const unpaid: BookingWithRelations[] = [];

    for (const row of result) {
      const booking: BookingWithRelations = {
        ...row.booking,
        customer: row.customer?.id ? row.customer : undefined,
        schedule: row.schedule?.id ? row.schedule : undefined,
        tour: row.tour?.id ? row.tour : undefined,
      };

      if (booking.status === "pending") {
        unconfirmed.push(booking);
      } else if (booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded") {
        unpaid.push(booking);
      }
    }

    return {
      unconfirmed,
      unpaid,
      stats: {
        total: unconfirmed.length + unpaid.length,
        unconfirmed: unconfirmed.length,
        unpaid: unpaid.length,
      },
    };
  }

  /**
   * Get upcoming bookings grouped by day
   */
  async getUpcoming(days: number = 7): Promise<{
    byDay: Array<{
      date: string;
      dayLabel: string;
      bookings: BookingWithRelations[];
      stats: { total: number; guests: number; revenue: number; needsAction: number };
    }>;
    stats: {
      totalBookings: number;
      totalGuests: number;
      totalRevenue: number;
      needsAction: number;
    };
  }> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endDate = new Date(startOfToday);
    endDate.setDate(endDate.getDate() + days);

    const result = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        },
        schedule: {
          id: schedules.id,
          startsAt: schedules.startsAt,
          endsAt: schedules.endsAt,
          status: schedules.status,
        },
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          meetingPoint: tours.meetingPoint,
          meetingPointDetails: tours.meetingPointDetails,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .leftJoin(tours, or(
        eq(schedules.tourId, tours.id),
        and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
      ))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          // Not cancelled
          or(
            eq(bookings.status, "pending"),
            eq(bookings.status, "confirmed")
          ),
          // Within date range
          or(
            and(
              isNotNull(schedules.startsAt),
              gte(schedules.startsAt, startOfToday),
              lte(schedules.startsAt, endDate)
            ),
            and(
              isNotNull(bookings.bookingDate),
              gte(bookings.bookingDate, startOfToday),
              lte(bookings.bookingDate, endDate)
            )
          )
        )
      )
      .orderBy(
        sql`COALESCE(${schedules.startsAt}, ${bookings.bookingDate}::timestamp)`
      );

    // Group by day
    const dayMap = new Map<string, BookingWithRelations[]>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (const row of result) {
      const booking: BookingWithRelations = {
        ...row.booking,
        customer: row.customer?.id ? row.customer : undefined,
        schedule: row.schedule?.id ? row.schedule : undefined,
        tour: row.tour?.id ? row.tour : undefined,
      };

      // Determine the tour date
      let tourDate: Date;
      if (booking.schedule?.startsAt) {
        tourDate = new Date(booking.schedule.startsAt);
      } else if (booking.bookingDate) {
        tourDate = new Date(booking.bookingDate);
      } else {
        continue; // Skip if no date
      }

      const dateKey = tourDate.toISOString().split("T")[0] ?? "";
      const existing = dayMap.get(dateKey) || [];
      existing.push(booking);
      dayMap.set(dateKey, existing);
    }

    // Convert to array with labels
    const today = startOfToday.toISOString().split("T")[0];
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let totalBookings = 0;
    let totalGuests = 0;
    let totalRevenue = 0;
    let totalNeedsAction = 0;

    const byDay = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, dayBookings]) => {
        const date = new Date(dateStr);
        let dayLabel: string;

        if (dateStr === today) {
          dayLabel = "Today";
        } else if (dateStr === tomorrowStr) {
          dayLabel = "Tomorrow";
        } else {
          dayLabel = `${dayNames[date.getDay()]} ${monthNames[date.getMonth()]} ${date.getDate()}`;
        }

        const dayStats = {
          total: dayBookings.length,
          guests: dayBookings.reduce((sum, b) => sum + b.totalParticipants, 0),
          revenue: dayBookings.reduce((sum, b) => sum + parseFloat(b.total || "0"), 0),
          needsAction: dayBookings.filter(b =>
            b.status === "pending" ||
            (b.paymentStatus !== "paid" && b.paymentStatus !== "refunded")
          ).length,
        };

        totalBookings += dayStats.total;
        totalGuests += dayStats.guests;
        totalRevenue += dayStats.revenue;
        totalNeedsAction += dayStats.needsAction;

        return {
          date: dateStr,
          dayLabel,
          bookings: dayBookings,
          stats: dayStats,
        };
      });

    return {
      byDay,
      stats: {
        totalBookings,
        totalGuests,
        totalRevenue,
        needsAction: totalNeedsAction,
      },
    };
  }

  /**
   * Get today's bookings with enhanced urgency info
   */
  async getTodayWithUrgency(): Promise<{
    bookings: Array<BookingWithRelations & { urgency: "critical" | "high" | "medium" | "low" | "none" | "past"; timeUntil: string }>;
    stats: {
      total: number;
      guests: number;
      revenue: number;
      confirmed: number;
      pending: number;
      paid: number;
    };
  }> {
    const todaysBookings = await this.getTodaysBookings();
    const now = new Date();

    const enhanced = todaysBookings.map(booking => {
      const urgency = this.getBookingUrgency(booking);

      // Calculate time until tour
      let timeUntil = "";
      let tourDate: Date | null = null;

      if (booking.schedule?.startsAt) {
        tourDate = new Date(booking.schedule.startsAt);
      } else if (booking.bookingDate && booking.bookingTime) {
        const parts = booking.bookingTime.split(":");
        const hours = parseInt(parts[0] ?? "0", 10);
        const minutes = parseInt(parts[1] ?? "0", 10);
        tourDate = new Date(booking.bookingDate);
        tourDate.setHours(hours, minutes, 0, 0);
      }

      if (tourDate) {
        const diffMs = tourDate.getTime() - now.getTime();
        if (diffMs < 0) {
          timeUntil = "Started";
        } else {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          if (diffHours > 0) {
            timeUntil = `In ${diffHours}h ${diffMins}m`;
          } else {
            timeUntil = `In ${diffMins}m`;
          }
        }
      }

      return { ...booking, urgency, timeUntil };
    });

    // Sort by tour time (soonest first)
    enhanced.sort((a, b) => {
      const aTime = a.schedule?.startsAt || a.bookingDate;
      const bTime = b.schedule?.startsAt || b.bookingDate;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    return {
      bookings: enhanced,
      stats: {
        total: enhanced.length,
        guests: enhanced.reduce((sum, b) => sum + b.totalParticipants, 0),
        revenue: enhanced.reduce((sum, b) => sum + parseFloat(b.total || "0"), 0),
        confirmed: enhanced.filter(b => b.status === "confirmed").length,
        pending: enhanced.filter(b => b.status === "pending").length,
        paid: enhanced.filter(b => b.paymentStatus === "paid").length,
      },
    };
  }
}
