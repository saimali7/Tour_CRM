import { eq, and, gte, lte, sql, desc, count, sum } from "drizzle-orm";
import {
  bookings,
  schedules,
  tours,
  guides,
  guideAssignments,
  refunds,
  activityLogs,
  type BookingStatus,
  type BookingSource,
} from "@tour/database";
import { BaseService } from "./base-service";
import { type DateRangeFilter } from "./types";

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
    guideName: string | null;
    bookedCount: number;
    maxParticipants: number;
    status: string;
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
      throw new Error("Both from and to dates are required for revenue stats");
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

    // Revenue by tour
    const revenueByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        revenue: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .leftJoin(tours, eq(schedules.tourId, tours.id))
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
      throw new Error("Both from and to dates are required for booking stats");
    }

    // Overall stats
    const statsQuery = await this.db
      .select({
        totalBookings: count(),
        totalParticipants: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`,
        avgLeadTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${schedules.startsAt} - ${bookings.createdAt})) / 86400), 0)`,
      })
      .from(bookings)
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
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

    // Bookings by tour
    const bookingsByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        bookingCount: count(bookings.id),
        participantCount: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
      })
      .from(bookings)
      .leftJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .leftJoin(tours, eq(schedules.tourId, tours.id))
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
   */
  async getCapacityUtilization(dateRange: DateRangeFilter): Promise<CapacityUtilization> {
    const { from, to } = dateRange;

    if (!from || !to) {
      throw new Error("Both from and to dates are required for capacity utilization");
    }

    // Overall utilization
    const overallQuery = await this.db
      .select({
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)`,
        totalBooked: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, from),
          lte(schedules.startsAt, to),
          sql`${schedules.status} != 'cancelled'`
        )
      );

    const totalCapacity = Number(overallQuery[0]?.totalCapacity || 0);
    const totalBooked = Number(overallQuery[0]?.totalBooked || 0);
    const overallUtilization = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

    // Utilization by tour
    const utilizationByTourQuery = await this.db
      .select({
        tourId: tours.id,
        tourName: tours.name,
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)`,
        bookedCount: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
        scheduleCount: count(schedules.id),
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, from),
          lte(schedules.startsAt, to),
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .groupBy(tours.id, tours.name)
      .orderBy(desc(sql`SUM(${schedules.bookedCount})`));

    const utilizationByTour = utilizationByTourQuery.map(row => {
      const capacity = Number(row.totalCapacity);
      const booked = Number(row.bookedCount);
      return {
        tourId: row.tourId || "",
        tourName: row.tourName || "Unknown",
        totalCapacity: capacity,
        bookedCount: booked,
        utilization: capacity > 0 ? parseFloat(((booked / capacity) * 100).toFixed(2)) : 0,
        scheduleCount: Number(row.scheduleCount),
      };
    });

    // Utilization by day of week
    const utilizationByDayQuery = await this.db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${schedules.startsAt})`,
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)`,
        bookedCount: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, from),
          lte(schedules.startsAt, to),
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .groupBy(sql`EXTRACT(DOW FROM ${schedules.startsAt})`)
      .orderBy(sql`EXTRACT(DOW FROM ${schedules.startsAt})`);

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const utilizationByDayOfWeek = utilizationByDayQuery.map(row => {
      const capacity = Number(row.totalCapacity);
      const booked = Number(row.bookedCount);
      const dow = Number(row.dayOfWeek);
      return {
        dayOfWeek: dow,
        dayName: dayNames[dow] || "Unknown",
        utilization: capacity > 0 ? parseFloat(((booked / capacity) * 100).toFixed(2)) : 0,
      };
    });

    // Utilization by time slot (hour of day)
    const utilizationByTimeQuery = await this.db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${schedules.startsAt})`,
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)`,
        bookedCount: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
        scheduleCount: count(schedules.id),
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, from),
          lte(schedules.startsAt, to),
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${schedules.startsAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${schedules.startsAt})`);

    const utilizationByTimeSlot = utilizationByTimeQuery.map(row => {
      const hour = Number(row.hour);
      const capacity = Number(row.totalCapacity);
      const booked = Number(row.bookedCount);
      return {
        hour,
        timeLabel: `${hour.toString().padStart(2, "0")}:00`,
        utilization: capacity > 0 ? parseFloat(((booked / capacity) * 100).toFixed(2)) : 0,
        scheduleCount: Number(row.scheduleCount),
      };
    });

    // Underperforming schedules (< 50% utilization)
    const underperformingQuery = await this.db
      .select({
        scheduleId: schedules.id,
        tourName: tours.name,
        startsAt: schedules.startsAt,
        bookedCount: schedules.bookedCount,
        maxParticipants: schedules.maxParticipants,
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, from),
          lte(schedules.startsAt, to),
          sql`${schedules.status} != 'cancelled'`,
          sql`(CAST(${schedules.bookedCount} AS FLOAT) / NULLIF(${schedules.maxParticipants}, 0)) < 0.5`
        )
      )
      .orderBy(schedules.startsAt)
      .limit(20);

    const underperformingSchedules = underperformingQuery.map(row => {
      const booked = Number(row.bookedCount || 0);
      const capacity = Number(row.maxParticipants);
      return {
        scheduleId: row.scheduleId,
        tourName: row.tourName || "Unknown",
        startsAt: row.startsAt,
        utilization: capacity > 0 ? parseFloat(((booked / capacity) * 100).toFixed(2)) : 0,
        bookedCount: booked,
        maxParticipants: capacity,
      };
    });

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
   */
  async getTodaysOperations(): Promise<TodaysOperations> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's scheduled tours
    const statsQuery = await this.db
      .select({
        scheduledTours: count(schedules.id),
        totalParticipants: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, today),
          lte(schedules.startsAt, tomorrow),
          sql`${schedules.status} != 'cancelled'`
        )
      );

    const scheduledTours = Number(statsQuery[0]?.scheduledTours || 0);
    const totalParticipants = Number(statsQuery[0]?.totalParticipants || 0);

    // Count unique guides working today
    const guidesQuery = await this.db
      .select({
        guideCount: sql<number>`COUNT(DISTINCT ${guideAssignments.guideId})`,
      })
      .from(guideAssignments)
      .leftJoin(schedules, eq(guideAssignments.scheduleId, schedules.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          gte(schedules.startsAt, today),
          lte(schedules.startsAt, tomorrow),
          eq(guideAssignments.status, "confirmed")
        )
      );

    const guidesWorking = Number(guidesQuery[0]?.guideCount || 0);

    // Get upcoming schedules for next 24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingQuery = await this.db
      .select({
        scheduleId: schedules.id,
        tourName: tours.name,
        startsAt: schedules.startsAt,
        endsAt: schedules.endsAt,
        bookedCount: schedules.bookedCount,
        maxParticipants: schedules.maxParticipants,
        status: schedules.status,
        guideFirstName: guides.firstName,
        guideLastName: guides.lastName,
        assignmentStatus: guideAssignments.status,
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .leftJoin(guideAssignments, eq(schedules.id, guideAssignments.scheduleId))
      .leftJoin(guides, eq(guideAssignments.guideId, guides.id))
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, now),
          lte(schedules.startsAt, next24Hours),
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .orderBy(schedules.startsAt)
      .limit(10);

    const upcomingSchedules = upcomingQuery.map(row => ({
      scheduleId: row.scheduleId,
      tourName: row.tourName || "Unknown",
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      guideName: row.guideFirstName && row.guideLastName
        ? `${row.guideFirstName} ${row.guideLastName}`
        : null,
      bookedCount: Number(row.bookedCount || 0),
      maxParticipants: Number(row.maxParticipants),
      status: row.status,
      hasUnconfirmedGuide: row.assignmentStatus !== "confirmed" && row.assignmentStatus !== null,
    }));

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
}
