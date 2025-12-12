import { eq, and, desc, asc, sql, count, gte, lte, ilike, or } from "drizzle-orm";
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
    email: string;
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
  };
  participants?: BookingParticipant[];
}

export interface CreateBookingInput {
  customerId: string;
  scheduleId: string;
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
      where: eq(bookingParticipants.bookingId, id),
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

    const [booking] = await this.db
      .insert(bookings)
      .values({
        organizationId: this.organizationId,
        referenceNumber,
        customerId: input.customerId,
        scheduleId: input.scheduleId,
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

    if (input.participants && input.participants.length > 0) {
      await this.db.insert(bookingParticipants).values(
        input.participants.map((p) => ({
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

    await this.db
      .update(schedules)
      .set({
        bookedCount: sql`${schedules.bookedCount} + ${totalParticipants}`,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, input.scheduleId));

    return this.getById(booking.id);
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
          .where(eq(schedules.id, booking.scheduleId));
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
      .where(eq(schedules.id, booking.scheduleId));

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
          eq(bookingParticipants.bookingId, bookingId)
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
    const result = await this.getAll(
      { scheduleId, status: "confirmed" },
      { limit: 100 }
    );
    return result.data;
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
}
