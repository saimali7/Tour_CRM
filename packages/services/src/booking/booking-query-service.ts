/**
 * BookingQueryService - Read operations for bookings
 *
 * This service handles all read/query operations:
 * - getAll: Paginated list with filters
 * - getById: Single booking lookup
 * - getByReference: Lookup by reference number
 * - getForTourRun: Bookings for a tour run (tourId + date + time)
 * - getTodaysBookings: Today's confirmed bookings
 */

import { eq, and, desc, asc, sql, count, gte, lte, ilike, or, inArray } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
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
    if (filters.tourId) {
      conditions.push(eq(bookings.tourId, filters.tourId));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(bookings.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(bookings.createdAt, filters.dateRange.to));
    }
    // Filter by booking date (for calendar view)
    if (filters.bookingDateRange?.from) {
      conditions.push(gte(bookings.bookingDate, filters.bookingDateRange.from));
    }
    if (filters.bookingDateRange?.to) {
      conditions.push(lte(bookings.bookingDate, filters.bookingDateRange.to));
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

    const orderByClauses = (() => {
      if (sort.field === "bookingDate") {
        if (sort.direction === "asc") {
          return [asc(bookings.bookingDate), asc(bookings.bookingTime), desc(bookings.createdAt)] as const;
        }
        return [desc(bookings.bookingDate), desc(bookings.bookingTime), desc(bookings.createdAt)] as const;
      }

      const primarySort = sort.direction === "asc" ? asc(bookings[sort.field]) : desc(bookings[sort.field]);
      return [primarySort, desc(bookings.createdAt)] as const;
    })();

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
        .leftJoin(tours, this.core.getTourJoinCondition())
        .where(and(...conditions))
        .orderBy(...orderByClauses)
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
      tour: row.tour?.id ? {
        id: row.tour.id,
        name: row.tour.name,
        slug: row.tour.slug,
        meetingPoint: row.tour.meetingPoint,
        meetingPointDetails: row.tour.meetingPointDetails,
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
      tour: row.tour?.id ? row.tour : undefined,
    };
  }

  /**
   * Get bookings for a "tour run" (tourId + date + time)
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
      tour: row.tour?.id ? row.tour : undefined,
      participants: participantsByBooking.get(row.booking.id) || [],
    }));
  }

  /**
   * Get today's confirmed bookings.
   */
  async getTodaysBookings(): Promise<BookingWithRelations[]> {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

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
      .leftJoin(tours, this.core.getTourJoinCondition())
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "confirmed"),
          sql`${bookings.bookingDate}::text = ${todayStr}`
        )
      )
      .orderBy(
        sql`(${bookings.bookingDate}::date + ${bookings.bookingTime}::time)::timestamp`
      );

    return result.map((row) => ({
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      tour: row.tour?.id ? row.tour : undefined,
    }));
  }
}
