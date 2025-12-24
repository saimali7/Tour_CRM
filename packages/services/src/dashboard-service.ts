import { eq, and, gte, lte, sql, desc, isNull, isNotNull } from "drizzle-orm";
import { bookings, schedules, tours, customers } from "@tour/database";
import { BaseService } from "./base-service";
import { type DateRangeFilter } from "./types";
import { AnalyticsService } from "./analytics-service";
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

  constructor(ctx: { organizationId: string; userId?: string }) {
    super(ctx);
    this.analytics = new AnalyticsService(ctx);
  }

  /**
   * Get operations dashboard data
   * This combines real-time operational data with alerts and recent activity
   */
  async getOperationsDashboard(): Promise<OperationsDashboard> {
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

    return {
      todaysOperations,
      recentActivity,
      upcomingSchedules,
      alerts,
    };
  }

  /**
   * Get business dashboard data
   * This provides high-level business metrics and trends
   */
  async getBusinessDashboard(dateRange?: DateRangeFilter): Promise<BusinessDashboard> {
    // Default to last 30 days if not specified
    const to = dateRange?.to || new Date();
    const from = dateRange?.from || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

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

    return {
      revenueStats,
      bookingStats,
      capacityUtilization,
      keyMetrics,
      trendData,
    };
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

    return {
      todaySchedules: operations.scheduledTours,
      todayParticipants: operations.totalParticipants,
      pendingAssignments,
      recentBookings: bookings.totalBookings,
      todayRevenue: revenue.totalRevenue,
    };
  }

  /**
   * Get bookings for a specific date range
   * Core method used by getTodayBookings and getTomorrowBookings
   */
  private async getBookingsForDateRange(startDate: Date, endDate: Date): Promise<TodayBooking[]> {
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
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        tourName: tours.name,
        tourId: tours.id,
        scheduleId: schedules.id,
        startsAt: schedules.startsAt,
        endsAt: schedules.endsAt,
        guidesRequired: schedules.guidesRequired,
        guidesAssigned: schedules.guidesAssigned,
      })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .innerJoin(tours, eq(schedules.tourId, tours.id))
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(schedules.startsAt, startDate),
          lte(schedules.startsAt, endDate),
          sql`${bookings.status} NOT IN ('cancelled')`
        )
      )
      .orderBy(schedules.startsAt, desc(bookings.createdAt));

    return result.map(row => ({
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
        id: row.scheduleId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        guidesRequired: row.guidesRequired ?? 0,
        guidesAssigned: row.guidesAssigned ?? 0,
      },
    }));
  }

  /**
   * Get today's bookings - actual customers with bookings for today
   */
  async getTodayBookings(): Promise<TodayBooking[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getBookingsForDateRange(today, tomorrow);
  }

  /**
   * Get tomorrow's bookings - preview for preparation
   */
  async getTomorrowBookings(): Promise<TodayBooking[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return this.getBookingsForDateRange(tomorrow, dayAfter);
  }

  /**
   * Get comprehensive tomorrow preview - everything needed to plan for tomorrow
   */
  async getTomorrowPreview(): Promise<TomorrowPreview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Get all bookings for tomorrow
    const bookings = await this.getBookingsForDateRange(tomorrow, dayAfter);

    // Get schedules for tomorrow (to check guide assignments)
    const schedulesResult = await this.db
      .select({
        scheduleId: schedules.id,
        tourName: tours.name,
        startsAt: schedules.startsAt,
        endsAt: schedules.endsAt,
        bookedCount: schedules.bookedCount,
        maxParticipants: schedules.maxParticipants,
        guidesRequired: schedules.guidesRequired,
        guidesAssigned: schedules.guidesAssigned,
      })
      .from(schedules)
      .innerJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, tomorrow),
          lte(schedules.startsAt, dayAfter),
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .orderBy(schedules.startsAt);

    // Filter to only schedules with bookings
    const schedulesWithBookings = schedulesResult.filter(s => (s.bookedCount ?? 0) > 0);

    // Find schedules needing more guides (guidesAssigned < guidesRequired)
    const schedulesNeedingGuides = schedulesWithBookings
      .filter(s => (s.guidesAssigned ?? 0) < (s.guidesRequired ?? 0))
      .map(s => ({
        scheduleId: s.scheduleId,
        tourName: s.tourName || "Unknown",
        startsAt: s.startsAt,
        bookedCount: s.bookedCount ?? 0,
        maxParticipants: s.maxParticipants,
        guidesRequired: s.guidesRequired ?? 0,
        guidesAssigned: s.guidesAssigned ?? 0,
        guideDeficit: Math.max(0, (s.guidesRequired ?? 0) - (s.guidesAssigned ?? 0)),
      }));

    // Calculate stats
    const totalBookings = bookings.length;
    const totalGuests = bookings.reduce((sum, b) => sum + b.participants, 0);
    const expectedRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total), 0);

    // Bookings needing attention
    const pendingConfirmation = bookings.filter(b => b.status === "pending");
    const unpaidBookings = bookings.filter(b => b.paymentStatus === "pending" || b.paymentStatus === "partial");

    return {
      date: tomorrow,
      stats: {
        totalBookings,
        totalGuests,
        expectedRevenue: expectedRevenue.toFixed(2),
        schedulesWithBookings: schedulesWithBookings.length,
      },
      schedulesNeedingGuides,
      pendingConfirmation,
      unpaidBookings,
      allBookings: bookings,
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
    startsAt: Date;
    endsAt: Date;
    guidesRequired: number;
    guidesAssigned: number;
  };
}
