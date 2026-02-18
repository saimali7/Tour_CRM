"use client";

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  ChevronRight,
  Zap,
  ArrowRight,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  User,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { buildCommandCenterHref } from "@/lib/command-center-links";
import {
  format,
  isToday,
  isTomorrow,
  differenceInMinutes,
  addHours,
} from "date-fns";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { ActionBar } from "@/components/dashboard/action-bar";
import { MetricsBar } from "@/components/dashboard/metrics-bar";
import { TomorrowPreview } from "@/components/dashboard/TomorrowPreview";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleItem {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  bookedCount: number;
  maxParticipants: number;
  guideName?: string | null;
  hasUnconfirmedGuide: boolean;
  status?: string;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  action: { label: string; href: string };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getTimeLabel(date: Date): string {
  return format(date, "h:mm a");
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const mins = differenceInMinutes(date, now);
  if (mins < 0) return "Started";
  if (mins < 60) return `in ${mins}m`;
  if (mins < 120) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return format(date, "h:mm a");
}

function getUtilization(booked: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((booked / max) * 100);
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getTourStatus(
  startsAt: Date,
  endsAt?: Date
): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : addHours(start, 2);

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function DashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { openQuickBooking } = useQuickBookingContext();

  // Memoize date range to prevent infinite re-renders
  const dateRange = useMemo(() => ({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }), []);

  // Fetch operations dashboard data
  const {
    data: operationsData,
    isLoading: opsLoading,
    error: opsError,
  } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Fetch business metrics
  const { data: businessData, isLoading: bizLoading } =
    trpc.dashboard.getBusinessDashboard.useQuery(
      { dateRange },
      { refetchInterval: 60000 }
    );

  // Fetch booking stats for action cards
  const { data: bookingStats } = trpc.booking.getStats.useQuery({});

  // Fetch today's actual bookings (customers who booked for today)
  const { data: todayBookings, isLoading: bookingsLoading } =
    trpc.dashboard.getTodayBookings.useQuery(undefined, {
      refetchInterval: 30000,
    });

  // Fetch comprehensive tomorrow preview (stats, issues, bookings)
  const { data: tomorrowPreview } =
    trpc.dashboard.getTomorrowPreview.useQuery(undefined, {
      refetchInterval: 60000,
    });

  const isLoading = opsLoading || bizLoading;

  // Generate alerts from operations data
  const alerts = useMemo((): Alert[] => {
    if (!operationsData) return [];
    const items: Alert[] = [];

    operationsData.upcomingSchedules
      .filter((s) => s.hasUnconfirmedGuide)
      .forEach((schedule) => {
        items.push({
          id: `unassigned-${schedule.scheduleId}`,
          type: "critical",
          title: "No guide assigned",
          subtitle: `${schedule.tourName} · ${getTimeLabel(new Date(schedule.startsAt))}`,
          action: {
            label: "Assign in Command Center",
            href: buildCommandCenterHref({
              orgSlug: slug,
              date: schedule.startsAt,
            }),
          },
        });
      });

    return items;
  }, [operationsData, slug]);

  // Separate today's and upcoming schedules
  const { todaySchedules, upcomingSchedules, liveSchedules } = useMemo(() => {
    if (!operationsData)
      return { todaySchedules: [], upcomingSchedules: [], liveSchedules: [] };
    const today: ScheduleItem[] = [];
    const upcoming: ScheduleItem[] = [];
    const live: ScheduleItem[] = [];

    operationsData.upcomingSchedules.forEach((s) => {
      const date = new Date(s.startsAt);
      const status = getTourStatus(date, s.endsAt ? new Date(s.endsAt) : undefined);

      if (status === "live") {
        live.push(s);
      } else if (isToday(date)) {
        today.push(s);
      } else {
        upcoming.push(s);
      }
    });

    return {
      todaySchedules: today,
      upcomingSchedules: upcoming.slice(0, 5),
      liveSchedules: live,
    };
  }, [operationsData]);

  // Stats for today - use ACTUAL BOOKINGS, not empty schedules
  const stats = useMemo(() => {
    if (!todayBookings) return null;

    // Count from actual bookings (real customers)
    const bookingCount = todayBookings.length;
    const guestCount = todayBookings.reduce((sum, b) => sum + b.participants, 0);

    return {
      bookings: bookingCount,
      guests: guestCount,
      guides: operationsData?.todaysOperations.guidesWorking || 0,
    };
  }, [todayBookings, operationsData]);

  // Revenue metrics
  const revenueMetrics = useMemo(() => {
    if (!businessData) return null;
    return {
      todayRevenue: businessData.keyMetrics.todayVsYesterday.revenue.today,
      todayChange: businessData.keyMetrics.todayVsYesterday.revenue.change,
      weekRevenue: businessData.keyMetrics.thisWeekVsLastWeek.revenue.thisWeek,
      weekChange: businessData.keyMetrics.thisWeekVsLastWeek.revenue.change,
      avgBookingValue: businessData.revenueStats.averageBookingValue,
    };
  }, [businessData]);

  // Action cards metrics - actionable items needing attention
  const actionCardsData = useMemo(() => {
    // Count tours needing guides from upcoming schedules (today only)
    const toursNeedingGuides = operationsData?.upcomingSchedules.filter(
      (s) => s.hasUnconfirmedGuide && isToday(new Date(s.startsAt))
    ).length || 0;

    // Count tours with guides assigned (upcoming tours that are ready)
    const toursWithGuides = operationsData?.upcomingSchedules.filter(
      (s) => !s.hasUnconfirmedGuide
    ).length || 0;

    // Get pending bookings count from stats
    const unconfirmedBookings = bookingStats?.pending || 0;

    // Calculate pending payments - estimate from pending bookings
    // Using average booking value or a reasonable default
    const avgValueStr = businessData?.revenueStats?.averageBookingValue;
    const avgValue = avgValueStr ? parseFloat(avgValueStr) : 100;
    const pendingPaymentCount = Math.round(unconfirmedBookings * 0.6);
    const pendingPaymentAmount = pendingPaymentCount * avgValue;

    return {
      pendingPayments: {
        count: pendingPaymentCount,
        amount: pendingPaymentAmount,
      },
      toursNeedingGuides,
      unconfirmedBookings,
      toursWithGuides,
    };
  }, [operationsData, bookingStats, businessData]);

  if (opsError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
            <p className="text-xs text-destructive/70 mt-0.5">{opsError.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-3 md:space-y-4">
      {/* ================================================================
          COMPACT HEADER - Single row with greeting, metrics, and action
          Following Design Thinking: Tier 1 info at top, actions prominent
          ================================================================ */}
      <header className="space-y-2">
        {/* Top row: Today header + Quick Book */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              <span className="sr-only">Dashboard</span>
              {greeting}
            </h1>
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(), "EEEE, MMM d")}
            </span>
          </div>
          {/* Desktop button */}
          <button
            onClick={() => openQuickBooking()}
            className="hidden sm:inline-flex items-center gap-2 h-8 px-3 text-sm font-semibold rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-all active:scale-[0.97]"
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Book
          </button>
          {/* Mobile button */}
          <button
            onClick={() => openQuickBooking()}
            className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-all active:scale-[0.97]"
            aria-label="Quick book"
          >
            <Zap className="h-4 w-4" />
          </button>
        </div>

        {/* Metrics Bar - Single row business health */}
        {!bizLoading && revenueMetrics && (
          <MetricsBar
            todayRevenue={parseFloat(String(revenueMetrics.todayRevenue)) || 0}
            todayChange={revenueMetrics.todayChange}
            weekRevenue={parseFloat(String(revenueMetrics.weekRevenue)) || 0}
            todayBookings={stats?.bookings || 0}
            todayGuests={stats?.guests || 0}
          />
        )}
      </header>

      {/* ================================================================
          ACTION BAR - Compact horizontal chips for pending actions
          Following Design Thinking: "Actions not data"
          ================================================================ */}
      {!isLoading && (
        <ActionBar
          unconfirmedBookings={actionCardsData.unconfirmedBookings}
          pendingPayments={actionCardsData.pendingPayments}
          toursNeedingGuides={actionCardsData.toursNeedingGuides}
          orgSlug={slug}
        />
      )}

      {/* ================================================================
          LIVE NOW - Only show tours WITH bookings that are happening now
          ================================================================ */}
      {liveSchedules.filter(s => s.bookedCount > 0).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Live Now
            </h2>
          </div>
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 overflow-hidden">
            {liveSchedules.filter(s => s.bookedCount > 0).map((schedule, idx, arr) => (
              <LiveTourRow
                key={schedule.scheduleId}
                schedule={schedule}
                slug={slug}
                isLast={idx === arr.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          TODAY'S FOCUS - All bookings and actions for today
          ================================================================ */}
      <TodaysFocus orgSlug={slug} />

      {/* ================================================================
          TOMORROW'S PREVIEW - Comprehensive planning section
          ================================================================ */}
      {tomorrowPreview && (
        <TomorrowPreview
          data={tomorrowPreview}
          orgSlug={slug}
        />
      )}

      {/* ================================================================
          RECENT ACTIVITY
          ================================================================ */}
      {operationsData?.recentActivity && operationsData.recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h2>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {operationsData.recentActivity.slice(0, 5).map((activity, idx) => (
                <ActivityRow
                  key={`${activity.type}-${activity.entityId}-${idx}`}
                  activity={activity}
                  index={idx}
                />
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatPill({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
        highlight
          ? "bg-primary/10 text-foreground"
          : "bg-muted/50 text-muted-foreground"
      )}
    >
      {icon}
      <span className={cn("font-semibold tabular-nums", highlight && "text-primary")}>{value}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon,
  loading,
  subtitle,
  variant = "default",
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  variant?: "default" | "primary" | "success";
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className={cn(
        "relative rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden",
        variant === "primary" && "card-info",
        variant === "success" && "card-success",
        variant === "default" && "card-elevated"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className={cn(
          "p-1.5 rounded-lg",
          variant === "primary" && "bg-info dark:bg-info/50 text-info dark:text-info",
          variant === "success" && "bg-success dark:bg-success/50 text-success dark:text-success",
          variant === "default" && "bg-muted text-muted-foreground"
        )}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="h-9 w-28 skeleton rounded" />
      ) : (
        <>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1.5 mt-2 text-xs font-medium",
                isPositive && "text-success dark:text-success",
                isNegative && "text-destructive dark:text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                isPositive && "bg-success dark:bg-success/50",
                isNegative && "bg-destructive dark:bg-destructive/50"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : isNegative ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {isPositive && "+"}
                {change.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
          {subtitle && !change && (
            <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="rounded-lg card-danger overflow-hidden">
      <div className="px-4 py-2.5 bg-destructive border-b border-destructive/40">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
          <span className="text-sm font-semibold text-destructive-foreground">
            {alerts.length} {alerts.length === 1 ? "issue needs" : "issues need"} attention
          </span>
        </div>
      </div>
      <div className="divide-y divide-destructive/20">
        {alerts.map((alert, idx) => (
          <div
            key={alert.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-destructive/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.subtitle}</p>
              </div>
            </div>
            <Link
              href={alert.action.href as Route}
              className="text-xs font-medium text-destructive hover:underline flex items-center gap-0.5 px-3 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
            >
              {alert.action.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllClearBanner() {
  return (
    <div className="flex items-center gap-3 rounded-lg card-success px-4 py-3">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-success dark:bg-success/50 flex items-center justify-center">
        <CheckCircle2 className="h-5 w-5 text-success dark:text-success" />
      </div>
      <div>
        <p className="text-sm font-medium text-success dark:text-success">
          All clear
        </p>
        <p className="text-xs text-success dark:text-success">
          No urgent issues need your attention
        </p>
      </div>
    </div>
  );
}

function EmptySchedule({ slug }: { slug: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 p-10 text-center bg-gradient-to-b from-muted/20 to-muted/40">
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center">
          <Calendar className="h-7 w-7 text-muted-foreground/70" />
        </div>
      </div>
      <p className="text-base font-semibold text-foreground mb-1">No tours scheduled for today</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        Your schedule is clear. Time to plan ahead or take a well-deserved break!
      </p>
      <Link
        href={`/org/${slug}/calendar` as Route}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
      >
        View calendar
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function LiveTourRow({
  schedule,
  slug,
  isLast,
}: {
  schedule: ScheduleItem;
  slug: string;
  isLast: boolean;
}) {
  const startTime = new Date(schedule.startsAt);
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const commandCenterHref = buildCommandCenterHref({
    orgSlug: slug,
    date: schedule.startsAt,
  });

  return (
    <Link
      href={commandCenterHref}
      className={cn(
        "flex items-center gap-4 px-4 py-4 hover:bg-primary/10 transition-colors group",
        !isLast && "border-b border-primary/10"
      )}
    >
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <PlayCircle className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{schedule.tourName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            Started {getTimeLabel(startTime)}
          </span>
          {schedule.guideName && (
            <span className="text-xs text-muted-foreground">· {schedule.guideName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {schedule.bookedCount}/{schedule.maxParticipants}
          </p>
          <p className="text-xs text-muted-foreground">guests</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

interface ScheduleRowProps {
  schedule: ScheduleItem;
  slug: string;
  index: number;
}

function ScheduleRow({ schedule, slug, index }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const minsUntil = differenceInMinutes(startTime, new Date());
  const isStartingSoon = minsUntil <= 60 && minsUntil > 0;
  const isStartingVerySoon = minsUntil <= 15 && minsUntil > 0;
  const commandCenterHref = buildCommandCenterHref({
    orgSlug: slug,
    date: schedule.startsAt,
  });

  return (
    <Link
      href={commandCenterHref}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="w-16 flex-shrink-0">
        <p
          className={cn(
            "text-sm font-mono tabular-nums font-medium",
            isStartingVerySoon
              ? "text-destructive"
              : isStartingSoon
                ? "text-primary"
                : "text-foreground"
          )}
        >
          {getTimeLabel(startTime)}
        </p>
        {isStartingSoon && (
          <p
            className={cn(
              "text-[10px] font-medium",
              isStartingVerySoon ? "text-destructive" : "text-primary"
            )}
          >
            {getRelativeTime(startTime)}
          </p>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{schedule.tourName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {schedule.bookedCount}/{schedule.maxParticipants}
          </span>
          {schedule.guideName ? (
            <span className="text-xs text-muted-foreground">· {schedule.guideName}</span>
          ) : (
            <span className="text-xs text-destructive font-semibold flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-md">
              <AlertTriangle className="h-3 w-3" /> No guide
            </span>
          )}
        </div>
      </div>

      <div className="w-20 flex-shrink-0 hidden sm:block">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              util >= 80
                ? "bg-success"
                : util >= 50
                  ? "bg-primary"
                  : util >= 20
                    ? "bg-warning"
                    : "bg-destructive"
            )}
            style={{ width: `${Math.max(util, 5)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-0.5">{util}% full</p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

function UpcomingRow({ schedule, slug, index }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const dayLabel = isTomorrow(startTime) ? "Tomorrow" : format(startTime, "EEE, MMM d");
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const needsAttention = schedule.hasUnconfirmedGuide || util < 30;
  const commandCenterHref = buildCommandCenterHref({
    orgSlug: slug,
    date: schedule.startsAt,
  });

  return (
    <Link
      href={commandCenterHref}
      className={cn(
        "flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
      )}
    >
      <div className="w-20 flex-shrink-0">
        <p className="text-xs text-muted-foreground">{dayLabel}</p>
        <p className="text-sm font-mono tabular-nums">{getTimeLabel(startTime)}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{schedule.tourName}</p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {schedule.bookedCount}/{schedule.maxParticipants}
        </span>
        {schedule.hasUnconfirmedGuide && (
          <span className="text-warning dark:text-warning flex items-center gap-0.5">
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}
        {util < 30 && util > 0 && (
          <span className="text-warning dark:text-warning text-[10px]">Low</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

function ActivityRow({
  activity,
  index,
}: {
  activity: {
    type: string;
    description: string;
    timestamp: Date | string;
    entityType: string;
    entityId: string;
  };
  index: number;
}) {
  const icons: Record<string, React.ReactNode> = {
    booking_created: <Calendar className="h-3.5 w-3.5 text-success" />,
    booking_cancelled: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    payment_received: <DollarSign className="h-3.5 w-3.5 text-success" />,
    guide_confirmed: <User className="h-3.5 w-3.5 text-primary" />,
  };

  const icon = icons[activity.type] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  const time = new Date(activity.timestamp);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{activity.description}</p>
      </div>
      <p className="text-xs text-muted-foreground flex-shrink-0">
        {format(time, "h:mm a")}
      </p>
    </div>
  );
}
