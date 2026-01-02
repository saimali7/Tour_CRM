/**
 * BookingQueryService - Read operations for bookings
 *
 * This service handles all read/query operations:
 * - getAll: Paginated list with filters
 * - getById: Single booking lookup
 * - getByReference: Lookup by reference number
 * - getForSchedule: Bookings for a schedule
 * - getForTourRun: Bookings for a tour run (availability-based)
 * - getTodaysBookings: Today's confirmed bookings
 */

import { eq, and, desc, asc, sql, count, gte, lte, ilike, or, inArray, isNotNull } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
  schedules,
  tours,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext, PaginationOptions, PaginatedResult, SortOptions } from "../types";
import { NotFoundError } from "../types";
import { BookingCore } from "./booking-core";
import type {
  BookingFilters,
  BookingSortField,
  BookingWithRelations,
} from "./types";

export class BookingQueryService extends BaseService {
  constructor(
    ctx: ServiceContext,
    private core: BookingCore
  ) {
    super(ctx);
  }

  /**
   * Get all bookings with filtering, pagination, and sorting
   */
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
        .leftJoin(tours, this.core.getTourJoinCondition())
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      // Count query needs to join schedules if filtering by scheduleDateRange
      filters.scheduleDateRange
        ? this.db
            .select({ total: count() })
            .from(bookings)
            .leftJoin(customers, eq(bookings.customerId, customers.id))
            .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
            .where(and(...conditions))
        : this.db
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

  /**
   * Get a single booking by ID with all relations
   */
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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

  /**
   * Get a booking by its reference number
   */
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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
   * Get all active bookings for a schedule (excluding cancelled and no-show)
   */
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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
}
