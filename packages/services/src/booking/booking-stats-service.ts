/**
 * BookingStatsService - Statistics and urgency grouping for bookings
 *
 * This service handles all analytics/stats operations:
 * - getStats: Aggregate statistics
 * - getGroupedByUrgency: Bookings grouped by urgency level
 * - getNeedsAction: Actionable bookings (unconfirmed, unpaid)
 * - getUpcoming: Upcoming bookings by day
 * - getTodayWithUrgency: Today's bookings with urgency info
 */

import { eq, and, sql, count, gte, lte, or, isNotNull } from "drizzle-orm";
import {
  bookings,
  customers,
  schedules,
  tours,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext, DateRangeFilter } from "../types";
import { BookingCore } from "./booking-core";
import { BookingQueryService } from "./booking-query-service";
import type {
  BookingWithRelations,
  BookingStats,
  UrgencyGroupedBookings,
  ActionableBookings,
  UpcomingBookings,
  TodayBookingsWithUrgency,
} from "./types";

export class BookingStatsService extends BaseService {
  private queryService: BookingQueryService;

  constructor(
    ctx: ServiceContext,
    private core: BookingCore
  ) {
    super(ctx);
    this.queryService = new BookingQueryService(ctx, core);
  }

  /**
   * Get aggregate booking statistics
   */
  async getStats(dateRange?: DateRangeFilter): Promise<BookingStats> {
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

  /**
   * Get all bookings grouped by urgency level for "Needs Action" view
   */
  async getGroupedByUrgency(): Promise<UrgencyGroupedBookings> {
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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
      const urgency = this.core.getBookingUrgency(booking);

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
  async getNeedsAction(): Promise<ActionableBookings> {
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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
  async getUpcoming(days: number = 7): Promise<UpcomingBookings> {
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
      .leftJoin(tours, this.core.getTourJoinCondition())
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
  async getTodayWithUrgency(): Promise<TodayBookingsWithUrgency> {
    const todaysBookings = await this.queryService.getTodaysBookings();
    const now = new Date();

    const enhanced = todaysBookings.map(booking => {
      const urgency = this.core.getBookingUrgency(booking);

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
