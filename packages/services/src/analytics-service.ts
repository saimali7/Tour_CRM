import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import {
  bookings,
  tours,
  refunds,
  activityLogs,
  guideAssignments,
  type BookingSource,
} from "@tour/database";
import { BaseService } from "./base-service";
import { type DateRangeFilter, ValidationError } from "./types";
import { createServiceLogger } from "./lib/logger";

const logger = createServiceLogger("analytics");

// Revenue metrics interfaces
export interface RevenueStats {
  totalRevenue: string;
  refunds: string;
  netRevenue: string;
  averageBookingValue: string;
  revenueByTour: Array<{
    tourId: string;
    tourName: string;
    revenue: string;
    bookingCount: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: string;
    bookingCount: number;
  }>;
  comparisonToPreviousPeriod: {
    revenueChange: number; // Percentage
    bookingChange: number; // Percentage
  };
}

export interface PeriodRevenueData {
  period: string; // Date label
  revenue: string;
  bookingCount: number;
  participantCount: number;
}

// Booking metrics interfaces
export interface BookingStats {
  totalBookings: number;
  totalParticipants: number;
  averagePartySize: number;
  averageLeadTime: number; // Days between booking and tour
  cancellationRate: number; // Percentage
  noShowRate: number; // Percentage
  bookingsByTour: Array<{
    tourId: string;
    tourName: string;
    bookingCount: number;
    participantCount: number;
  }>;
  bookingsBySource: Array<{
    source: BookingSource;
    count: number;
    percentage: number;
  }>;
}

export interface BookingTrendData {
  period: string;
  bookings: number;
  participants: number;
  cancelled: number;
  completed: number;
}

// Capacity metrics interfaces
export interface CapacityUtilization {
  overallUtilization: number; // Percentage
  utilizationByTour: Array<{
    tourId: string;
    tourName: string;
    totalCapacity: number;
    bookedCount: number;
    utilization: number; // Percentage
    scheduleCount: number;
  }>;
  utilizationByDayOfWeek: Array<{
    dayOfWeek: number; // 0=Sunday
    dayName: string;
    utilization: number; // Percentage
  }>;
  utilizationByTimeSlot: Array<{
    hour: number;
    timeLabel: string;
    utilization: number; // Percentage
    scheduleCount: number;
  }>;
  underperformingSchedules: Array<{
    scheduleId: string;
    tourName: string;
    startsAt: Date;
    utilization: number;
    bookedCount: number;
    maxParticipants: number;
  }>;
}

// Today's operations interfaces
export interface TodaysOperations {
  scheduledTours: number;
  totalParticipants: number;
  guidesWorking: number;
  upcomingSchedules: Array<{
    scheduleId: string;
    tourName: string;
    startsAt: Date;
    endsAt: Date;
    bookedCount: number;
    maxParticipants: number;
    status: string;
    guidesRequired: number;
    guidesAssigned: number;
    needsMoreGuides: boolean;
    guideDeficit: number;
    /** @deprecated Use needsMoreGuides instead */
    hasUnconfirmedGuide: boolean;
  }>;
}

// Recent activity interfaces
export interface RecentActivityItem {
  type: "booking_created" | "booking_cancelled" | "payment_received" | "guide_confirmed";
  timestamp: Date;
  description: string;
  entityId: string;
  entityType: string;
}

export class AnalyticsService extends BaseService {
  /**
   * Get revenue statistics for a date range
   */
  async getRevenueStats(dateRange: DateRangeFilter): Promise<RevenueStats> {
    const { from, to } = dateRange;

    if (!from || !to) {
      throw new ValidationError("Both from and to dates are required for revenue stats");
    }

    // Calculate previous period for comparison
    const duration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - duration);
    const previousTo = new Date(to.getTime() - duration);

    // Current period revenue (excluding cancelled bookings)
    const revenueQuery = await this.db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const totalRevenue = revenueQuery[0]?.totalRevenue || "0";
    const currentBookings = revenueQuery[0]?.bookingCount || 0;

    // Total refunds in period
    const refundsQuery = await this.db
      .select({
        totalRefunds: sql<string>`COALESCE(SUM(CAST(${refunds.amount} AS DECIMAL)), 0)::TEXT`,
      })
      .from(refunds)
      .where(
        and(
          eq(refunds.organizationId, this.organizationId),
          gte(refunds.createdAt, from),
          lte(refunds.createdAt, to),
          eq(refunds.status, "succeeded")
        )
      );

    const totalRefunds = refundsQuery[0]?.totalRefunds || "0";
    const netRevenue = (parseFloat(totalRevenue) - parseFloat(totalRefunds)).toFixed(2);
    const averageBookingValue = currentBookings > 0
      ? (parseFloat(totalRevenue) / currentBookings).toFixed(2)
      : "0";

    // Revenue by tour (using bookings.tourId directly)
    const revenueByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        revenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(tours.id, tours.name)
      .orderBy(desc(sql`SUM(CAST(${bookings.total} AS DECIMAL))`));

    const revenueByTour = revenueByTourQuery.map(row => ({
      tourId: row.tourId || "",
      tourName: row.tourName || "Unknown",
      revenue: row.revenue,
      bookingCount: Number(row.bookingCount),
    }));

    // Revenue by day
    const revenueByDayQuery = await this.db
      .select({
        date: sql<string>`DATE(${bookings.createdAt})::TEXT`,
        revenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(sql`DATE(${bookings.createdAt})`)
      .orderBy(sql`DATE(${bookings.createdAt})`);

    const revenueByDay = revenueByDayQuery.map(row => ({
      date: row.date,
      revenue: row.revenue,
      bookingCount: Number(row.bookingCount),
    }));

    // Previous period comparison
    const previousRevenueQuery = await this.db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, previousFrom),
          lte(bookings.createdAt, previousTo),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const previousRevenue = parseFloat(previousRevenueQuery[0]?.totalRevenue || "0");
    const previousBookings = previousRevenueQuery[0]?.bookingCount || 0;

    const revenueChange = previousRevenue > 0
      ? ((parseFloat(totalRevenue) - previousRevenue) / previousRevenue) * 100
      : 0;
    const bookingChange = previousBookings > 0
      ? ((currentBookings - previousBookings) / previousBookings) * 100
      : 0;

    return {
      totalRevenue,
      refunds: totalRefunds,
      netRevenue,
      averageBookingValue,
      revenueByTour,
      revenueByDay,
      comparisonToPreviousPeriod: {
        revenueChange: parseFloat(revenueChange.toFixed(2)),
        bookingChange: parseFloat(bookingChange.toFixed(2)),
      },
    };
  }

  /**
   * Get revenue data over a period
   */
  async getRevenueByPeriod(
    period: "day" | "week" | "month" | "year",
    count: number
  ): Promise<PeriodRevenueData[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - count * 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - count * 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - count, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear() - count, 0, 1);
        break;
    }

    let groupByClause: ReturnType<typeof sql>;
    let periodLabel: ReturnType<typeof sql>;

    switch (period) {
      case "day":
        groupByClause = sql`DATE(${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE(${bookings.createdAt}), 'YYYY-MM-DD')`;
        break;
      case "week":
        groupByClause = sql`DATE_TRUNC('week', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('week', ${bookings.createdAt}), 'YYYY-MM-DD')`;
        break;
      case "month":
        groupByClause = sql`DATE_TRUNC('month', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('month', ${bookings.createdAt}), 'YYYY-MM')`;
        break;
      case "year":
        groupByClause = sql`DATE_TRUNC('year', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('year', ${bookings.createdAt}), 'YYYY')`;
        break;
    }

    const results = await this.db
      .select({
        period: sql<string>`${periodLabel}::TEXT`,
        revenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: sql<number>`COUNT(${bookings.id})`,
        participantCount: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, startDate),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(groupByClause)
      .orderBy(groupByClause);

    return results.map(row => ({
      period: row.period,
      revenue: row.revenue,
      bookingCount: Number(row.bookingCount),
      participantCount: Number(row.participantCount),
    }));
  }

  /**
   * Get booking statistics for a date range
   */
  async getBookingStats(dateRange: DateRangeFilter): Promise<BookingStats> {
    const { from, to } = dateRange;

    if (!from || !to) {
      throw new ValidationError("Both from and to dates are required for booking stats");
    }

    // Overall stats (using bookingDate for lead time calculation)
    const statsQuery = await this.db
      .select({
        totalBookings: count(),
        totalParticipants: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`,
        avgLeadTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${bookings.bookingDate}::timestamp - ${bookings.createdAt})) / 86400), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to)
        )
      );

    const stats = statsQuery[0];
    const totalBookings = Number(stats?.totalBookings || 0);
    const totalParticipants = Number(stats?.totalParticipants || 0);
    const cancelled = Number(stats?.cancelled || 0);
    const noShows = Number(stats?.noShows || 0);
    const avgLeadTime = Number(stats?.avgLeadTime || 0);

    const averagePartySize = totalBookings > 0 ? totalParticipants / totalBookings : 0;
    const cancellationRate = totalBookings > 0 ? (cancelled / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShows / totalBookings) * 100 : 0;

    // Bookings by tour (using bookings.tourId directly)
    const bookingsByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        bookingCount: count(bookings.id),
        participantCount: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to)
        )
      )
      .groupBy(tours.id, tours.name)
      .orderBy(desc(count(bookings.id)));

    const bookingsByTour = bookingsByTourQuery.map(row => ({
      tourId: row.tourId || "",
      tourName: row.tourName || "Unknown",
      bookingCount: Number(row.bookingCount),
      participantCount: Number(row.participantCount),
    }));

    // Bookings by source
    const bookingsBySourceQuery = await this.db
      .select({
        source: bookings.source,
        count: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to)
        )
      )
      .groupBy(bookings.source)
      .orderBy(desc(count()));

    const bookingsBySource = bookingsBySourceQuery.map(row => ({
      source: row.source as BookingSource,
      count: Number(row.count),
      percentage: totalBookings > 0 ? (Number(row.count) / totalBookings) * 100 : 0,
    }));

    return {
      totalBookings,
      totalParticipants,
      averagePartySize: parseFloat(averagePartySize.toFixed(2)),
      averageLeadTime: parseFloat(avgLeadTime.toFixed(1)),
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      noShowRate: parseFloat(noShowRate.toFixed(2)),
      bookingsByTour,
      bookingsBySource,
    };
  }

  /**
   * Get booking trends over time
   */
  async getBookingTrends(
    period: "day" | "week" | "month" | "year",
    count: number
  ): Promise<BookingTrendData[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - count * 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - count * 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - count, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear() - count, 0, 1);
        break;
    }

    let groupByClause: ReturnType<typeof sql>;
    let periodLabel: ReturnType<typeof sql>;

    switch (period) {
      case "day":
        groupByClause = sql`DATE(${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE(${bookings.createdAt}), 'YYYY-MM-DD')`;
        break;
      case "week":
        groupByClause = sql`DATE_TRUNC('week', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('week', ${bookings.createdAt}), 'YYYY-MM-DD')`;
        break;
      case "month":
        groupByClause = sql`DATE_TRUNC('month', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('month', ${bookings.createdAt}), 'YYYY-MM')`;
        break;
      case "year":
        groupByClause = sql`DATE_TRUNC('year', ${bookings.createdAt})`;
        periodLabel = sql`TO_CHAR(DATE_TRUNC('year', ${bookings.createdAt}), 'YYYY')`;
        break;
    }

    const results = await this.db
      .select({
        period: sql<string>`${periodLabel}::TEXT`,
        bookings: sql<number>`COUNT(*)`,
        participants: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, startDate)
        )
      )
      .groupBy(groupByClause)
      .orderBy(groupByClause);

    return results.map(row => ({
      period: row.period,
      bookings: Number(row.bookings),
      participants: Number(row.participants),
      cancelled: Number(row.cancelled),
      completed: Number(row.completed),
    }));
  }

  /**
   * Get capacity utilization metrics
   * Note: With schedules table removed, this uses booking-based approximations
   */
  async getCapacityUtilization(dateRange: DateRangeFilter): Promise<CapacityUtilization> {
    const { from, to } = dateRange;

    if (!from || !to) {
      throw new ValidationError("Both from and to dates are required for capacity utilization");
    }

    const fromStr = from.toISOString().split("T")[0]!;
    const toStr = to.toISOString().split("T")[0]!;

    // Get booking-based stats grouped by tour
    const bookingsByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        tourMaxParticipants: tours.maxParticipants,
        totalBooked: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        uniqueDates: sql<number>`COUNT(DISTINCT ${bookings.bookingDate})`,
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${fromStr}`,
          sql`${bookings.bookingDate}::text <= ${toStr}`,
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(tours.id, tours.name, tours.maxParticipants)
      .orderBy(desc(sql`SUM(${bookings.totalParticipants})`));

    let totalBooked = 0;
    let totalCapacity = 0;

    const utilizationByTour = bookingsByTourQuery.map(row => {
      const booked = Number(row.totalBooked);
      const uniqueDates = Number(row.uniqueDates);
      const maxPerTour = Number(row.tourMaxParticipants) || 10;
      // Estimate capacity as max participants per unique booking date
      const estimatedCapacity = uniqueDates * maxPerTour;

      totalBooked += booked;
      totalCapacity += estimatedCapacity;

      return {
        tourId: row.tourId || "",
        tourName: row.tourName || "Unknown",
        totalCapacity: estimatedCapacity,
        bookedCount: booked,
        utilization: estimatedCapacity > 0 ? parseFloat(((booked / estimatedCapacity) * 100).toFixed(2)) : 0,
        scheduleCount: uniqueDates,
      };
    });

    const overallUtilization = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

    // Utilization by day of week (from booking dates)
    const utilizationByDayQuery = await this.db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${bookings.bookingDate}::timestamp)`,
        totalBooked: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        bookingCount: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${fromStr}`,
          sql`${bookings.bookingDate}::text <= ${toStr}`,
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(sql`EXTRACT(DOW FROM ${bookings.bookingDate}::timestamp)`)
      .orderBy(sql`EXTRACT(DOW FROM ${bookings.bookingDate}::timestamp)`);

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const maxDailyParticipants = totalBooked > 0 ? totalBooked / 7 : 10; // Average as baseline
    const utilizationByDayOfWeek = utilizationByDayQuery.map(row => {
      const booked = Number(row.totalBooked);
      const dow = Number(row.dayOfWeek);
      return {
        dayOfWeek: dow,
        dayName: dayNames[dow] || "Unknown",
        utilization: parseFloat(((booked / maxDailyParticipants) * 100).toFixed(2)),
      };
    });

    // Utilization by time slot (from booking time)
    const utilizationByTimeQuery = await this.db
      .select({
        hour: sql<number>`CAST(SPLIT_PART(${bookings.bookingTime}, ':', 1) AS INT)`,
        totalBooked: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        bookingCount: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${fromStr}`,
          sql`${bookings.bookingDate}::text <= ${toStr}`,
          sql`${bookings.status} != 'cancelled'`,
          sql`${bookings.bookingTime} IS NOT NULL`
        )
      )
      .groupBy(sql`SPLIT_PART(${bookings.bookingTime}, ':', 1)`)
      .orderBy(sql`CAST(SPLIT_PART(${bookings.bookingTime}, ':', 1) AS INT)`);

    const maxHourlyParticipants = totalBooked > 0 ? totalBooked / 10 : 10; // Estimate
    const utilizationByTimeSlot = utilizationByTimeQuery.map(row => {
      const hour = Number(row.hour);
      const booked = Number(row.totalBooked);
      return {
        hour,
        timeLabel: `${hour.toString().padStart(2, "0")}:00`,
        utilization: parseFloat(((booked / maxHourlyParticipants) * 100).toFixed(2)),
        scheduleCount: Number(row.bookingCount),
      };
    });

    // Without schedules table, we cannot identify underperforming schedules
    const underperformingSchedules: Array<{
      scheduleId: string;
      tourName: string;
      startsAt: Date;
      utilization: number;
      bookedCount: number;
      maxParticipants: number;
    }> = [];

    return {
      overallUtilization: parseFloat(overallUtilization.toFixed(2)),
      utilizationByTour,
      utilizationByDayOfWeek,
      utilizationByTimeSlot,
      underperformingSchedules,
    };
  }

  /**
   * Get today's operations summary
   * Uses availability-based booking model (bookingDate, bookingTime)
   */
  async getTodaysOperations(): Promise<TodaysOperations> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0]!;

    // Count today's bookings (grouped by unique tour runs)
    const statsQuery = await this.db
      .select({
        bookingCount: count(),
        totalParticipants: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        uniqueTourRuns: sql<number>`COUNT(DISTINCT CONCAT(${bookings.tourId}, '-', ${bookings.bookingTime}))`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text = ${todayStr}`,
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const scheduledTours = Number(statsQuery[0]?.uniqueTourRuns || 0);
    const totalParticipants = Number(statsQuery[0]?.totalParticipants || 0);

    // Count unique guides working today via guide assignments
    let guidesWorking = 0;
    try {
      const guidesQuery = await this.db
        .select({
          guideCount: sql<number>`COUNT(DISTINCT ${guideAssignments.guideId})`,
        })
        .from(guideAssignments)
        .leftJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
        .where(
          and(
            eq(guideAssignments.organizationId, this.organizationId),
            sql`${bookings.bookingDate}::text = ${todayStr}`,
            eq(guideAssignments.status, "confirmed")
          )
        );
      guidesWorking = Number(guidesQuery[0]?.guideCount || 0);
    } catch (error) {
      logger.error({ err: error }, "Failed to get guides working count");
      guidesWorking = 0;
    }

    // Get upcoming tour runs for next 24 hours (grouped by tour + time)
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next24Str = next24Hours.toISOString().split("T")[0]!;

    const upcomingBookings = await this.db
      .select({
        tourId: bookings.tourId,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        tourName: tours.name,
        tourDuration: tours.durationMinutes,
        tourMax: tours.maxParticipants,
        bookedCount: sql<number>`SUM(${bookings.totalParticipants})`,
        bookingCount: count(),
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${todayStr}`,
          sql`${bookings.bookingDate}::text <= ${next24Str}`,
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(bookings.tourId, bookings.bookingDate, bookings.bookingTime, tours.name, tours.durationMinutes, tours.maxParticipants)
      .orderBy(bookings.bookingDate, bookings.bookingTime)
      .limit(10);

    // Map results to output format
    const upcomingSchedules = upcomingBookings.map(row => {
      const startsAt = row.bookingDate ? new Date(row.bookingDate) : new Date();
      if (row.bookingTime) {
        const [hours, minutes] = row.bookingTime.split(":").map(Number);
        startsAt.setHours(hours || 0, minutes || 0, 0, 0);
      }
      const endsAt = new Date(startsAt.getTime() + (row.tourDuration || 60) * 60 * 1000);
      const maxParticipants = Number(row.tourMax) || 10;
      const bookedCount = Number(row.bookedCount) || 0;

      return {
        scheduleId: `${row.tourId}-${row.bookingDate}-${row.bookingTime}`,
        tourName: row.tourName || "Unknown",
        startsAt,
        endsAt,
        bookedCount,
        maxParticipants,
        status: "scheduled" as const,
        guidesRequired: 0,
        guidesAssigned: 0,
        needsMoreGuides: false,
        guideDeficit: 0,
        hasUnconfirmedGuide: false,
      };
    });

    return {
      scheduledTours,
      totalParticipants,
      guidesWorking,
      upcomingSchedules,
    };
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivityItem[]> {
    const relevantActions = [
      "booking.created",
      "booking.cancelled",
      "payment.received",
      "guide_assignment.confirmed",
    ];

    const activities = await this.db
      .select({
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        description: activityLogs.description,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.organizationId, this.organizationId),
          sql`${activityLogs.action} IN (${sql.join(relevantActions.map(a => sql`${a}`), sql`, `)})`
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return activities.map(log => {
      let type: RecentActivityItem["type"] = "booking_created";

      if (log.action === "booking.created") type = "booking_created";
      else if (log.action === "booking.cancelled") type = "booking_cancelled";
      else if (log.action === "payment.received") type = "payment_received";
      else if (log.action.includes("guide") && log.action.includes("confirmed")) type = "guide_confirmed";

      return {
        type,
        timestamp: log.createdAt,
        description: log.description,
        entityId: log.entityId,
        entityType: log.entityType,
      };
    });
  }

  // ==========================================================================
  // FORECASTING & INTELLIGENCE
  // ==========================================================================

  /**
   * Revenue forecasting based on booking pace
   * Compares current month pace to historical data to predict month-end revenue
   */
  async getRevenueForecasting(): Promise<{
    currentMonth: {
      name: string;
      revenueToDate: number;
      daysElapsed: number;
      daysRemaining: number;
      projectedRevenue: number;
      dailyPace: number;
      confidence: "low" | "medium" | "high";
    };
    comparison: {
      lastMonth: {
        name: string;
        totalRevenue: number;
        avgDailyRevenue: number;
      };
      sameMonthLastYear: {
        name: string;
        totalRevenue: number;
        percentChange: number;
      } | null;
    };
    weeklyTrend: Array<{
      weekLabel: string;
      revenue: number;
      bookings: number;
    }>;
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = currentMonthEnd.getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    // Get current month revenue (excluding cancelled)
    const currentMonthResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
        count: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, currentMonthStart),
          lte(bookings.createdAt, now),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const revenueToDate = parseFloat(currentMonthResult[0]?.total ?? "0");
    const dailyPace = daysElapsed > 0 ? revenueToDate / daysElapsed : 0;
    const projectedRevenue = dailyPace * daysInMonth;

    // Get last month revenue
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthDays = lastMonthEnd.getDate();

    const lastMonthResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, lastMonthStart),
          lte(bookings.createdAt, lastMonthEnd),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const lastMonthRevenue = parseFloat(lastMonthResult[0]?.total ?? "0");

    // Get same month last year (if available)
    let sameMonthLastYear = null;
    const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);

    const lastYearResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, lastYearStart),
          lte(bookings.createdAt, lastYearEnd),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const lastYearRevenue = parseFloat(lastYearResult[0]?.total ?? "0");
    if (lastYearRevenue > 0) {
      const percentChange = ((projectedRevenue - lastYearRevenue) / lastYearRevenue) * 100;
      sameMonthLastYear = {
        name: lastYearStart.toLocaleString("default", { month: "long", year: "numeric" }),
        totalRevenue: lastYearRevenue,
        percentChange: Math.round(percentChange * 10) / 10,
      };
    }

    // Get weekly trend (last 4 weeks)
    const weeklyTrend: Array<{ weekLabel: string; revenue: number; bookings: number }> = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekResult = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
          count: count(),
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.organizationId, this.organizationId),
            gte(bookings.createdAt, weekStart),
            lte(bookings.createdAt, weekEnd),
            sql`${bookings.status} != 'cancelled'`
          )
        );

      weeklyTrend.push({
        weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        revenue: parseFloat(weekResult[0]?.total ?? "0"),
        bookings: weekResult[0]?.count ?? 0,
      });
    }

    // Determine confidence based on data availability
    let confidence: "low" | "medium" | "high" = "low";
    if (daysElapsed >= 20) confidence = "high";
    else if (daysElapsed >= 10) confidence = "medium";

    return {
      currentMonth: {
        name: currentMonthStart.toLocaleString("default", { month: "long", year: "numeric" }),
        revenueToDate,
        daysElapsed,
        daysRemaining,
        projectedRevenue,
        dailyPace,
        confidence,
      },
      comparison: {
        lastMonth: {
          name: lastMonthStart.toLocaleString("default", { month: "long" }),
          totalRevenue: lastMonthRevenue,
          avgDailyRevenue: lastMonthDays > 0 ? lastMonthRevenue / lastMonthDays : 0,
        },
        sameMonthLastYear,
      },
      weeklyTrend,
    };
  }

  /**
   * Generate proactive business insights
   * Returns actionable alerts about opportunities and risks
   * Note: With schedules table removed, uses booking-based insights
   */
  async getProactiveInsights(): Promise<Array<{
    id: string;
    type: "opportunity" | "warning" | "info" | "success";
    title: string;
    description: string;
    action?: {
      label: string;
      href: string;
    };
    metric?: {
      value: string;
      trend?: "up" | "down" | "stable";
    };
  }>> {
    const insights: Array<{
      id: string;
      type: "opportunity" | "warning" | "info" | "success";
      title: string;
      description: string;
      action?: { label: string; href: string };
      metric?: { value: string; trend?: "up" | "down" | "stable" };
    }> = [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Revenue pace - Compare to last month's same point
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthSamePoint = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentRevenue, lastMonthRevenue] = await Promise.all([
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text` })
        .from(bookings)
        .where(
          and(
            eq(bookings.organizationId, this.organizationId),
            gte(bookings.createdAt, currentMonthStart),
            lte(bookings.createdAt, now),
            sql`${bookings.status} != 'cancelled'`
          )
        ),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text` })
        .from(bookings)
        .where(
          and(
            eq(bookings.organizationId, this.organizationId),
            gte(bookings.createdAt, lastMonthStart),
            lte(bookings.createdAt, lastMonthSamePoint),
            sql`${bookings.status} != 'cancelled'`
          )
        ),
    ]);

    const currentRev = parseFloat(currentRevenue[0]?.total ?? "0");
    const lastMonthRev = parseFloat(lastMonthRevenue[0]?.total ?? "0");
    const percentChange = lastMonthRev > 0 ? ((currentRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    if (percentChange >= 10) {
      insights.push({
        id: "revenue-pace-up",
        type: "success",
        title: "Revenue ahead of last month's pace",
        description: `You're ${Math.round(percentChange)}% ahead of where you were at this point last month.`,
        metric: {
          value: `+${Math.round(percentChange)}%`,
          trend: "up",
        },
      });
    } else if (percentChange <= -10) {
      insights.push({
        id: "revenue-pace-down",
        type: "warning",
        title: "Revenue behind last month's pace",
        description: `You're ${Math.abs(Math.round(percentChange))}% behind where you were at this point last month.`,
        action: {
          label: "View reports",
          href: "/reports",
        },
        metric: {
          value: `${Math.round(percentChange)}%`,
          trend: "down",
        },
      });
    }

    // 2. Tour trending up (>20% booking increase WoW)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const trendingToursQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        thisWeekBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.createdAt} >= ${thisWeekStart})`,
        lastWeekBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.createdAt} >= ${lastWeekStart} AND ${bookings.createdAt} < ${thisWeekStart})`,
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, lastWeekStart),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(tours.id, tours.name);

    for (const tour of trendingToursQuery) {
      const thisWeek = Number(tour.thisWeekBookings || 0);
      const lastWeek = Number(tour.lastWeekBookings || 0);
      if (lastWeek > 0 && thisWeek > lastWeek) {
        const increase = ((thisWeek - lastWeek) / lastWeek) * 100;
        if (increase >= 20 && tour.tourName) {
          insights.push({
            id: `trending-up-${tour.tourId}`,
            type: "opportunity",
            title: `${tour.tourName} is trending up`,
            description: `Bookings increased ${Math.round(increase)}% this week compared to last week.`,
            action: {
              label: "View tour",
              href: `/tours/${tour.tourId}`,
            },
            metric: {
              value: `+${Math.round(increase)}%`,
              trend: "up",
            },
          });
          break; // Only show one trending insight
        }
      }
    }

    // 3. Seasonal opportunity (Compare to same period last year)
    const lastYearSamePeriodStart = new Date(now);
    lastYearSamePeriodStart.setFullYear(lastYearSamePeriodStart.getFullYear() - 1);
    lastYearSamePeriodStart.setDate(lastYearSamePeriodStart.getDate() - 7);
    const lastYearSamePeriodEnd = new Date(lastYearSamePeriodStart);
    lastYearSamePeriodEnd.setDate(lastYearSamePeriodEnd.getDate() + 14);

    const lastYearSeasonalResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
        count: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, lastYearSamePeriodStart),
          lte(bookings.createdAt, lastYearSamePeriodEnd),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const lastYearSeasonalRevenue = parseFloat(lastYearSeasonalResult[0]?.total ?? "0");
    const lastYearSeasonalBookings = lastYearSeasonalResult[0]?.count ?? 0;

    if (lastYearSeasonalRevenue > currentRev * 1.2 && lastYearSeasonalBookings > 5) {
      insights.push({
        id: "seasonal-opportunity",
        type: "opportunity",
        title: "Seasonal booking opportunity",
        description: `This time last year had ${Math.round(((lastYearSeasonalRevenue - currentRev) / currentRev) * 100)}% higher revenue. Consider targeted marketing.`,
        action: {
          label: "View reports",
          href: "/reports/revenue",
        },
        metric: {
          value: `$${Math.round(lastYearSeasonalRevenue - currentRev)} potential`,
          trend: "up",
        },
      });
    }

    // 4. Operations healthy (if no warnings or opportunities)
    if (insights.length === 0 || (insights.length === 1 && insights[0]?.type === "success")) {
      insights.push({
        id: "operations-healthy",
        type: "success",
        title: "Operations looking good",
        description: "Your business metrics are healthy with stable booking levels.",
      });
    }

    return insights;
  }
}
