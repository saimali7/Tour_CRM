import { eq, and, sql, desc } from "drizzle-orm";
import { bookings, tours, customers } from "@tour/database";
import { BaseService } from "./base-service";
import { type DateRangeFilter } from "./types";
import { AnalyticsService } from "./analytics-service";
import { getCache, orgCacheKey, CacheTTL } from "./cache-service";
import {
  addDaysToDateKey,
  dateKeyToDate,
  formatDateKeyInTimeZone,
  formatDateOnlyKey,
  parseDateOnlyKeyToLocalDate,
} from "./lib/date-time";
import type {
  TodaysOperations,
  RecentActivityItem,
  RevenueStats,
  BookingStats,
  CapacityUtilization,
} from "./analytics-service";

// Operations dashboard interfaces
export interface OperationsDashboard {
  todaysOperations: TodaysOperations;
  recentActivity: RecentActivityItem[];
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
  alerts: Alert[];
}

export interface Alert {
  type: "warning" | "error" | "info";
  message: string;
  entityType: string;
  entityId: string;
  actionLabel?: string;
  actionUrl?: string;
}

// Business dashboard interfaces
export interface BusinessDashboard {
  revenueStats: RevenueStats;
  bookingStats: BookingStats;
  capacityUtilization: CapacityUtilization;
  keyMetrics: KeyMetrics;
  trendData: TrendData;
}

export interface KeyMetrics {
  todayVsYesterday: {
    revenue: {
      today: string;
      yesterday: string;
      change: number; // Percentage
    };
    bookings: {
      today: number;
      yesterday: number;
      change: number; // Percentage
    };
  };
  thisWeekVsLastWeek: {
    revenue: {
      thisWeek: string;
      lastWeek: string;
      change: number; // Percentage
    };
    bookings: {
      thisWeek: number;
      lastWeek: number;
      change: number; // Percentage
    };
  };
}

export interface TrendData {
  last7Days: {
    revenue: Array<{ date: string; amount: string }>;
    bookings: Array<{ date: string; count: number }>;
  };
  last30Days: {
    revenue: Array<{ date: string; amount: string }>;
    bookings: Array<{ date: string; count: number }>;
  };
}

export class DashboardService extends BaseService {
  private analytics: AnalyticsService;

  constructor(ctx: { organizationId: string; userId?: string; timezone?: string }) {
    super(ctx);
    this.analytics = new AnalyticsService(ctx);
  }

  /**
   * Get operations dashboard data
   * This combines real-time operational data with alerts and recent activity
   */
  async getOperationsDashboard(): Promise<OperationsDashboard> {
    const cache = getCache();
    const todayKey = new Date().toISOString().slice(0, 10);
    const opsDashboardCacheKey = orgCacheKey(this.organizationId, "dashboard:operations", todayKey);
    const cachedOpsDashboard = await cache.get<OperationsDashboard>(opsDashboardCacheKey);
    if (cachedOpsDashboard) return cachedOpsDashboard;

    // Get today's operations data
    const todaysOperations = await this.analytics.getTodaysOperations();

    // Get recent activity (last 10 items)
    const recentActivity = await this.analytics.getRecentActivity(10);

    // Upcoming schedules are already in todaysOperations
    const upcomingSchedules = todaysOperations.upcomingSchedules.slice(0, 5);

    // Generate alerts based on current data
    const alerts: Alert[] = [];

    // Alert for schedules needing more guides
    for (const schedule of upcomingSchedules) {
      if (schedule.needsMoreGuides) {
        const guideMessage = schedule.guideDeficit === 1
          ? `Needs 1 more guide`
          : `Needs ${schedule.guideDeficit} more guides`;
        alerts.push({
          type: "warning",
          message: `${guideMessage} for ${schedule.tourName} at ${schedule.startsAt.toLocaleTimeString()}`,
          entityType: "schedule",
          entityId: schedule.scheduleId,
          actionLabel: "Assign Guide",
          actionUrl: `/schedules/${schedule.scheduleId}`,
        });
      }

      // Alert for low capacity schedules
      const utilization = (schedule.bookedCount / schedule.maxParticipants) * 100;
      if (utilization < 30 && schedule.bookedCount === 0) {
        alerts.push({
          type: "info",
          message: `No bookings yet for ${schedule.tourName} at ${schedule.startsAt.toLocaleTimeString()}`,
          entityType: "schedule",
          entityId: schedule.scheduleId,
          actionLabel: "View Schedule",
          actionUrl: `/schedules/${schedule.scheduleId}`,
        });
      }
    }

    const opsDashboardResult: OperationsDashboard = {
      todaysOperations,
      recentActivity,
      upcomingSchedules,
      alerts,
    };
    await cache.set(opsDashboardCacheKey, opsDashboardResult, CacheTTL.SHORT);
    return opsDashboardResult;
  }

  /**
   * Get business dashboard data
   * This provides high-level business metrics and trends
   */
  async getBusinessDashboard(dateRange?: DateRangeFilter): Promise<BusinessDashboard> {
    // Default to last 30 days if not specified
    const to = dateRange?.to || new Date();
    const from = dateRange?.from || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const cache = getCache();
    const fromKey = from.toISOString().slice(0, 10);
    const toKey = to.toISOString().slice(0, 10);
    const businessDashboardCacheKey = orgCacheKey(this.organizationId, "dashboard:business", fromKey, toKey);
    const cachedBusinessDashboard = await cache.get<BusinessDashboard>(businessDashboardCacheKey);
    if (cachedBusinessDashboard) return cachedBusinessDashboard;

    // Get main stats
    const [revenueStats, bookingStats, capacityUtilization] = await Promise.all([
      this.analytics.getRevenueStats({ from, to }),
      this.analytics.getBookingStats({ from, to }),
      this.analytics.getCapacityUtilization({ from, to }),
    ]);

    // Get key metrics (today vs yesterday, this week vs last week)
    const keyMetrics = await this.getKeyMetrics();

    // Get trend data
    const trendData = await this.getTrendData();

    const businessDashboardResult: BusinessDashboard = {
      revenueStats,
      bookingStats,
      capacityUtilization,
      keyMetrics,
      trendData,
    };
    await cache.set(businessDashboardCacheKey, businessDashboardResult, CacheTTL.MEDIUM);
    return businessDashboardResult;
  }

  /**
   * Get key comparison metrics
   */
  private async getKeyMetrics(): Promise<KeyMetrics> {
    const now = new Date();

    // Today
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // This week (Monday to Sunday)
    const thisWeekStart = new Date(now);
    const dayOfWeek = thisWeekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    thisWeekStart.setDate(thisWeekStart.getDate() + diff);
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    // Last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    // Get data for all periods
    const [
      todayRevenue,
      yesterdayRevenue,
      todayBookings,
      yesterdayBookings,
      thisWeekRevenue,
      lastWeekRevenue,
      thisWeekBookings,
      lastWeekBookings,
    ] = await Promise.all([
      this.analytics.getRevenueStats({ from: today, to: tomorrow }),
      this.analytics.getRevenueStats({ from: yesterday, to: today }),
      this.analytics.getBookingStats({ from: today, to: tomorrow }),
      this.analytics.getBookingStats({ from: yesterday, to: today }),
      this.analytics.getRevenueStats({ from: thisWeekStart, to: thisWeekEnd }),
      this.analytics.getRevenueStats({ from: lastWeekStart, to: lastWeekEnd }),
      this.analytics.getBookingStats({ from: thisWeekStart, to: thisWeekEnd }),
      this.analytics.getBookingStats({ from: lastWeekStart, to: lastWeekEnd }),
    ]);

    // Calculate changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    return {
      todayVsYesterday: {
        revenue: {
          today: todayRevenue.totalRevenue,
          yesterday: yesterdayRevenue.totalRevenue,
          change: calculateChange(
            parseFloat(todayRevenue.totalRevenue),
            parseFloat(yesterdayRevenue.totalRevenue)
          ),
        },
        bookings: {
          today: todayBookings.totalBookings,
          yesterday: yesterdayBookings.totalBookings,
          change: calculateChange(todayBookings.totalBookings, yesterdayBookings.totalBookings),
        },
      },
      thisWeekVsLastWeek: {
        revenue: {
          thisWeek: thisWeekRevenue.totalRevenue,
          lastWeek: lastWeekRevenue.totalRevenue,
          change: calculateChange(
            parseFloat(thisWeekRevenue.totalRevenue),
            parseFloat(lastWeekRevenue.totalRevenue)
          ),
        },
        bookings: {
          thisWeek: thisWeekBookings.totalBookings,
          lastWeek: lastWeekBookings.totalBookings,
          change: calculateChange(thisWeekBookings.totalBookings, lastWeekBookings.totalBookings),
        },
      },
    };
  }

  /**
   * Get trend data for charts
   */
  private async getTrendData(): Promise<TrendData> {
    // Get last 7 days
    const last7DaysRevenue = await this.analytics.getRevenueByPeriod("day", 7);
    const last7DaysBookings = await this.analytics.getBookingTrends("day", 7);

    // Get last 30 days
    const last30DaysRevenue = await this.analytics.getRevenueByPeriod("day", 30);
    const last30DaysBookings = await this.analytics.getBookingTrends("day", 30);

    return {
      last7Days: {
        revenue: last7DaysRevenue.map(d => ({
          date: d.period,
          amount: d.revenue,
        })),
        bookings: last7DaysBookings.map(d => ({
          date: d.period,
          count: d.bookings,
        })),
      },
      last30Days: {
        revenue: last30DaysRevenue.map(d => ({
          date: d.period,
          amount: d.revenue,
        })),
        bookings: last30DaysBookings.map(d => ({
          date: d.period,
          count: d.bookings,
        })),
      },
    };
  }

  /**
   * Get dashboard summary (quick overview)
   */
  async getDashboardSummary(): Promise<{
    todaySchedules: number;
    todayParticipants: number;
    pendingAssignments: number;
    recentBookings: number;
    todayRevenue: string;
  }> {
    const cache = getCache();
    const todayKey = new Date().toISOString().slice(0, 10);
    const summaryCacheKey = orgCacheKey(this.organizationId, "dashboard:summary", todayKey);
    type SummaryResult = { todaySchedules: number; todayParticipants: number; pendingAssignments: number; recentBookings: number; todayRevenue: string };
    const cachedSummary = await cache.get<SummaryResult>(summaryCacheKey);
    if (cachedSummary) return cachedSummary;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [operations, revenue, bookings] = await Promise.all([
      this.analytics.getTodaysOperations(),
      this.analytics.getRevenueStats({ from: today, to: tomorrow }),
      this.analytics.getBookingStats({ from: today, to: tomorrow }),
    ]);

    // Count schedules that need more guides
    const pendingAssignments = operations.upcomingSchedules.filter(
      s => s.needsMoreGuides
    ).length;

    const summaryResult = {
      todaySchedules: operations.scheduledTours,
      todayParticipants: operations.totalParticipants,
      pendingAssignments,
      recentBookings: bookings.totalBookings,
      todayRevenue: revenue.totalRevenue,
    };
    await cache.set(summaryCacheKey, summaryResult, CacheTTL.SHORT);
    return summaryResult;
  }

  /**
   * Get bookings for a specific date range
   * Core method used by getTodayBookings and getTomorrowBookings
   * Uses booking.bookingDate for date-based queries (availability-based model)
   */
  private async getBookingsForDateRange(startDateKey: string, endDateKey: string): Promise<TodayBooking[]> {

    const result = await this.db
      .select({
        bookingId: bookings.id,
        referenceNumber: bookings.referenceNumber,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        adultCount: bookings.adultCount,
        childCount: bookings.childCount,
        infantCount: bookings.infantCount,
        total: bookings.total,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        tourName: tours.name,
        tourId: tours.id,
        tourDurationMinutes: tours.durationMinutes,
        tourMaxParticipants: tours.maxParticipants,
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${startDateKey}`,
          sql`${bookings.bookingDate}::text < ${endDateKey}`,
          sql`${bookings.status} NOT IN ('cancelled')`
        )
      )
      .orderBy(bookings.bookingDate, bookings.bookingTime, desc(bookings.createdAt));

    return result.map(row => {
      const bookingDateKey = row.bookingDate
        ? formatDateOnlyKey(row.bookingDate)
        : "";
      // Rebuild run start from stable YYYY-MM-DD key to avoid DATE timezone shifts.
      const startsAt = bookingDateKey
        ? parseDateOnlyKeyToLocalDate(bookingDateKey)
        : new Date();
      if (row.bookingTime) {
        const [hours, minutes] = row.bookingTime.split(":").map(Number);
        startsAt.setHours(hours || 0, minutes || 0, 0, 0);
      }
      // Calculate end time based on tour duration
      const endsAt = new Date(startsAt.getTime() + (row.tourDurationMinutes || 60) * 60 * 1000);

      return {
        bookingId: row.bookingId,
        referenceNumber: row.referenceNumber,
        status: row.status as "pending" | "confirmed" | "completed" | "no_show",
        paymentStatus: row.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed",
        participants: (row.adultCount || 0) + (row.childCount || 0) + (row.infantCount || 0),
        total: row.total,
        customer: {
          firstName: row.customerFirstName,
          lastName: row.customerLastName,
          email: row.customerEmail,
          phone: row.customerPhone,
        },
        tour: {
          id: row.tourId,
          name: row.tourName || "Unknown",
        },
        schedule: {
          id: `${row.tourId}-${bookingDateKey}-${row.bookingTime}`, // Virtual schedule ID
          dateKey: bookingDateKey,
          startsAt,
          endsAt,
          maxParticipants: row.tourMaxParticipants ?? 0,
          guidesRequired: 0, // Guide info not available without schedules
          guidesAssigned: 0,
        },
      };
    });
  }

  /**
   * Get today's bookings - actual customers with bookings for today
   */
  async getTodayBookings(): Promise<TodayBooking[]> {
    const timezone = await this.getOrganizationTimezone();
    const todayDateKey = formatDateKeyInTimeZone(new Date(), timezone);
    const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);
    return this.getBookingsForDateRange(todayDateKey, tomorrowDateKey);
  }

  /**
   * Get tomorrow's bookings - preview for preparation
   */
  async getTomorrowBookings(): Promise<TodayBooking[]> {
    const timezone = await this.getOrganizationTimezone();
    const todayDateKey = formatDateKeyInTimeZone(new Date(), timezone);
    const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);
    const dayAfterDateKey = addDaysToDateKey(todayDateKey, 2);
    return this.getBookingsForDateRange(tomorrowDateKey, dayAfterDateKey);
  }

  /**
   * Get comprehensive tomorrow preview - everything needed to plan for tomorrow
   * Uses availability-based booking model (bookingDate, bookingTime)
   */
  async getTomorrowPreview(): Promise<TomorrowPreview> {
    const timezone = await this.getOrganizationTimezone();
    const todayDateKey = formatDateKeyInTimeZone(new Date(), timezone);
    const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);
    const dayAfterDateKey = addDaysToDateKey(todayDateKey, 2);

    // Get all bookings for tomorrow
    const tomorrowBookings = await this.getBookingsForDateRange(
      tomorrowDateKey,
      dayAfterDateKey
    );

    // Group bookings by tour run (tourId + date + time) to simulate schedules
    const tourRunsMap = new Map<string, {
      tourId: string;
      tourName: string;
      bookingDate: Date;
      bookingTime: string;
      bookedCount: number;
      maxParticipants: number;
    }>();

    for (const booking of tomorrowBookings) {
      const key = booking.schedule.id; // This is the virtual schedule ID
      const existing = tourRunsMap.get(key);
      if (existing) {
        existing.bookedCount += booking.participants;
      } else {
        tourRunsMap.set(key, {
          tourId: booking.tour.id,
          tourName: booking.tour.name,
          bookingDate: booking.schedule.startsAt,
          bookingTime: booking.schedule.startsAt.toTimeString().slice(0, 5),
          bookedCount: booking.participants,
          maxParticipants: booking.schedule.maxParticipants,
        });
      }
    }

    // Convert to array (represents tour runs with bookings)
    const tourRunsWithBookings = Array.from(tourRunsMap.values());

    // Calculate stats
    const totalBookings = tomorrowBookings.length;
    const totalGuests = tomorrowBookings.reduce((sum, b) => sum + b.participants, 0);
    const expectedRevenue = tomorrowBookings.reduce((sum, b) => sum + parseFloat(b.total), 0);

    // Bookings needing attention
    const pendingConfirmation = tomorrowBookings.filter(b => b.status === "pending");
    const unpaidBookings = tomorrowBookings.filter(b => b.paymentStatus === "pending" || b.paymentStatus === "partial");

    return {
      date: dateKeyToDate(tomorrowDateKey),
      stats: {
        totalBookings,
        totalGuests,
        expectedRevenue: expectedRevenue.toFixed(2),
        schedulesWithBookings: tourRunsWithBookings.length,
      },
      schedulesNeedingGuides: [], // Guide assignments not available without schedules table
      pendingConfirmation,
      unpaidBookings,
      allBookings: tomorrowBookings,
    };
  }
}

// Interface for tomorrow's preview
export interface TomorrowPreview {
  date: Date;
  stats: {
    totalBookings: number;
    totalGuests: number;
    expectedRevenue: string;
    schedulesWithBookings: number;
  };
  schedulesNeedingGuides: Array<{
    scheduleId: string;
    tourName: string;
    startsAt: Date;
    bookedCount: number;
    maxParticipants: number;
    guidesRequired: number;
    guidesAssigned: number;
    guideDeficit: number;
  }>;
  pendingConfirmation: TodayBooking[];
  unpaidBookings: TodayBooking[];
  allBookings: TodayBooking[];
}

// Interface for today's bookings
export interface TodayBooking {
  bookingId: string;
  referenceNumber: string;
  status: "pending" | "confirmed" | "completed" | "no_show";
  paymentStatus: "pending" | "partial" | "paid" | "refunded" | "failed";
  participants: number;
  total: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  tour: {
    id: string;
    name: string;
  };
  schedule: {
    id: string;
    dateKey: string;
    startsAt: Date;
    endsAt: Date;
    maxParticipants: number;
    guidesRequired: number;
    guidesAssigned: number;
  };
}
