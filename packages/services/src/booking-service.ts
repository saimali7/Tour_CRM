import { eq, and, desc, asc, sql, count, gte, lte, ilike, or, inArray } from "drizzle-orm";
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

export interface BookingFilters {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  source?: BookingSource;
  customerId?: string;
  scheduleId?: string;
  tourId?: string;
  dateRange?: DateRangeFilter;
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

export interface CreateBookingInput {
  customerId: string;
  scheduleId: string;
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
      conditions.push(eq(schedules.tourId, filters.tourId));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(bookings.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(bookings.createdAt, filters.dateRange.to));
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
        .leftJoin(tours, eq(schedules.tourId, tours.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(bookings)
        .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    const formattedData = data.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: row.tour?.id ? row.tour : undefined,
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
      .leftJoin(tours, eq(schedules.tourId, tours.id))
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
      .leftJoin(tours, eq(schedules.tourId, tours.id))
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

  async create(input: CreateBookingInput): Promise<BookingWithRelations> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, input.customerId),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", input.customerId);
    }

    const scheduleResult = await this.db
      .select({
        schedule: schedules,
        tour: tours,
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.id, input.scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const scheduleRow = scheduleResult[0];
    if (!scheduleRow) {
      throw new NotFoundError("Schedule", input.scheduleId);
    }

    const { schedule: sched, tour } = scheduleRow;

    if (sched.status === "cancelled") {
      throw new ValidationError("Cannot book a cancelled schedule");
    }

    const totalParticipants =
      input.adultCount + (input.childCount || 0) + (input.infantCount || 0);
    const availableSpots = sched.maxParticipants - (sched.bookedCount || 0);

    if (totalParticipants > availableSpots) {
      throw new ValidationError(
        `Not enough availability. Only ${availableSpots} spots remaining.`
      );
    }

    const pricePerPerson = parseFloat(sched.price || tour?.basePrice || "0");
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
    // This prevents orphaned records if any operation fails
    const bookingId = await this.db.transaction(async (tx) => {
      // 1. Insert the booking
      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: this.organizationId,
          referenceNumber,
          customerId: input.customerId,
          scheduleId: input.scheduleId,
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
          currency: sched.currency || tour?.currency || "USD",
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

      // 3. Atomic update with capacity check to prevent race conditions
      const updateResult = await tx
        .update(schedules)
        .set({
          bookedCount: sql`COALESCE(${schedules.bookedCount}, 0) + ${totalParticipants}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, input.scheduleId),
            eq(schedules.organizationId, this.organizationId),
            // Atomic capacity check - only update if there's room
            sql`COALESCE(${schedules.bookedCount}, 0) + ${totalParticipants} <= ${schedules.maxParticipants}`
          )
        )
        .returning();

      // If no rows updated, capacity was exceeded (race condition caught)
      // The transaction will automatically rollback all previous operations
      if (updateResult.length === 0) {
        bookingLogger.warn({
          organizationId: this.organizationId,
          scheduleId: input.scheduleId,
          requestedParticipants: totalParticipants,
        }, "Booking failed: capacity exceeded during transaction");
        throw new ValidationError("Schedule capacity exceeded. Please try again with fewer participants.");
      }

      return booking.id;
    });

    bookingLogger.info({
      organizationId: this.organizationId,
      bookingId,
      referenceNumber,
      customerId: input.customerId,
      scheduleId: input.scheduleId,
      totalParticipants,
      total,
      source: input.source || "manual",
    }, "Booking created successfully");

    // Recalculate guide requirements after booking creation
    await this.recalculateGuideRequirements(input.scheduleId);

    return this.getById(bookingId);
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

      if (diff !== 0) {
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
      input.adultCount !== undefined ||
      input.childCount !== undefined ||
      input.infantCount !== undefined
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
    await this.recalculateGuideRequirements(booking.scheduleId);

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

    // Decrement old schedule's booked count
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
    await Promise.all([
      this.recalculateGuideRequirements(booking.scheduleId),
      this.recalculateGuideRequirements(newScheduleId),
    ]);

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

  async getTodaysBookings(): Promise<BookingWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "confirmed"),
          gte(schedules.startsAt, today),
          lte(schedules.startsAt, tomorrow)
        )
      )
      .orderBy(asc(schedules.startsAt));

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
    const cancellableBookings: Array<{ id: string; scheduleId: string; totalParticipants: number }> = [];

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
        const current = scheduleUpdates.get(booking.scheduleId) || 0;
        scheduleUpdates.set(booking.scheduleId, current + booking.totalParticipants);
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
}
