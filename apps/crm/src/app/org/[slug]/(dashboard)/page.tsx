"use client";

import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  ChevronRight,
  Zap,
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  MapPin,
  User,
  CreditCard,
  XCircle,
  PlayCircle,
  Sun,
  Cloud,
  CloudRain,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  format,
  isToday,
  isTomorrow,
  differenceInMinutes,
  isWithinInterval,
  addHours,
} from "date-fns";
import { UnifiedBookingSheet } from "@/components/bookings/unified-booking-sheet";
import { PriorityScheduleList } from "@/components/dashboard";

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
  const [showQuickBook, setShowQuickBook] = useState(false);

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
          action: { label: "Assign", href: `/org/${slug}/guides` },
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

  // Stats for today - use actual displayed tours count for consistency
  const stats = useMemo(() => {
    if (!operationsData) return null;

    // Count today's tours from what we actually display (live + upcoming today)
    const todayTourCount = todaySchedules.length + liveSchedules.length;

    // Sum participants from today's actual tours
    const todayGuests = [...todaySchedules, ...liveSchedules].reduce(
      (sum, s) => sum + s.bookedCount,
      0
    );

    return {
      tours: todayTourCount,
      guests: todayGuests,
      guides: operationsData.todaysOperations.guidesWorking,
      alerts: alerts.filter((a) => a.type === "critical").length,
    };
  }, [operationsData, alerts, todaySchedules, liveSchedules]);

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

  if (opsError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">
          Error loading dashboard: {opsError.message}
        </p>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* ================================================================
          COMPACT HEADER - Date, Stats, Metrics, Action
          ================================================================ */}
      <header className="space-y-3">
        {/* Top row: Greeting + Quick Book */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {format(new Date(), "EEEE, MMM d")}
            </h1>
            <span className="text-sm text-muted-foreground font-medium">{greeting}</span>
          </div>
          <button
            onClick={() => setShowQuickBook(true)}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Book
          </button>
        </div>

        {/* Bottom row: Stats + Status + Revenue (all inline) */}
        <div className="flex items-center gap-6 py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
          {/* Today's Operations */}
          {isLoading ? (
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 skeleton rounded" />
              <div className="h-4 w-20 skeleton rounded" />
              <div className="h-4 w-20 skeleton rounded" />
            </div>
          ) : (
            stats && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">{stats.tours}</span>
                  <span className="text-muted-foreground">tours</span>
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">{stats.guests}</span>
                  <span className="text-muted-foreground">guests</span>
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">{stats.guides}</span>
                  <span className="text-muted-foreground">guides</span>
                </span>
              </div>
            )
          )}

          {/* Divider */}
          <div className="h-4 w-px bg-border" />

          {/* Status Indicator (compact) */}
          {alerts.length > 0 ? (
            <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">{alerts.length} alert{alerts.length !== 1 && 's'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">All clear</span>
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Revenue Metrics (inline) */}
          {isLoading ? (
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 skeleton rounded" />
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          ) : (
            revenueMetrics && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Today</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(revenueMetrics.todayRevenue)}</span>
                  {revenueMetrics.todayChange !== 0 && (
                    <span className={cn(
                      "text-xs font-medium",
                      revenueMetrics.todayChange > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {revenueMetrics.todayChange > 0 && "+"}{revenueMetrics.todayChange.toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="text-border">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Week</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(revenueMetrics.weekRevenue)}</span>
                </div>
              </div>
            )
          )}
        </div>
      </header>

      {/* ================================================================
          LIVE NOW (if any tours are happening)
          ================================================================ */}
      {liveSchedules.length > 0 && (
        <section className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Live Now
            </h2>
          </div>
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 overflow-hidden">
            {liveSchedules.map((schedule, idx) => (
              <LiveTourRow
                key={schedule.scheduleId}
                schedule={schedule}
                slug={slug}
                isLast={idx === liveSchedules.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          TODAY'S SCHEDULE
          ================================================================ */}
      <section className="animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Today&apos;s Schedule
          </h2>
          {todaySchedules.length > 0 && (
            <Link
              href={`/org/${slug}/calendar` as Route}
              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:gap-1.5 transition-all"
            >
              View calendar
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 skeleton rounded-xl"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : todaySchedules.length === 0 && liveSchedules.length === 0 ? (
          <EmptySchedule slug={slug} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
            {todaySchedules.map((schedule, idx) => (
              <ScheduleRow
                key={schedule.scheduleId}
                schedule={schedule}
                slug={slug}
                index={idx}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================
          RECENT ACTIVITY
          ================================================================ */}
      {operationsData?.recentActivity && operationsData.recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
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

      {/* ================================================================
          NEEDS ATTENTION (Priority-sorted schedules)
          ================================================================ */}
      <PriorityScheduleList
        schedules={upcomingSchedules}
        slug={slug}
        maxItems={5}
        title="Needs Attention"
        emptyMessage="All upcoming tours have healthy booking levels"
      />

      {/* Unified Booking Sheet */}
      <UnifiedBookingSheet
        open={showQuickBook}
        onOpenChange={setShowQuickBook}
        orgSlug={slug}
      />
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
        "relative rounded-xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden",
        variant === "primary" && "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10",
        variant === "success" && "border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20",
        variant === "default" && "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className={cn(
          "p-1.5 rounded-lg",
          variant === "primary" && "bg-primary/10 text-primary",
          variant === "success" && "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
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
                isPositive && "text-emerald-600 dark:text-emerald-400",
                isNegative && "text-red-600 dark:text-red-400",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                isPositive && "bg-emerald-100 dark:bg-emerald-900/50",
                isNegative && "bg-red-100 dark:bg-red-900/50"
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
    <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <div className="px-4 py-2.5 bg-destructive/10 border-b border-destructive/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">
            {alerts.length} {alerts.length === 1 ? "issue needs" : "issues need"} attention
          </span>
        </div>
      </div>
      <div className="divide-y divide-destructive/10">
        {alerts.map((alert, idx) => (
          <div
            key={alert.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-destructive/5 transition-colors animate-in fade-in duration-300"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
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
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-emerald-950/10 px-4 py-3 animate-in fade-in duration-500">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          All clear
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
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
        <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center shadow-inner">
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

  return (
    <Link
      href={`/org/${slug}/schedules/${schedule.scheduleId}` as Route}
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

  return (
    <Link
      href={`/org/${slug}/schedules/${schedule.scheduleId}` as Route}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
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
            <span className="text-xs text-destructive font-medium flex items-center gap-0.5">
              · <AlertTriangle className="h-3 w-3" /> No guide
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
                ? "bg-emerald-500"
                : util >= 50
                  ? "bg-primary"
                  : util >= 20
                    ? "bg-amber-500"
                    : "bg-red-400"
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

  return (
    <Link
      href={`/org/${slug}/schedules/${schedule.scheduleId}` as Route}
      className={cn(
        "flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 transition-colors group animate-in fade-in slide-in-from-bottom-1 duration-300",
        needsAttention && "bg-amber-50/50 dark:bg-amber-950/20"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
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
          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}
        {util < 30 && util > 0 && (
          <span className="text-amber-600 dark:text-amber-400 text-[10px]">Low</span>
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
    booking_created: <Calendar className="h-3.5 w-3.5 text-emerald-500" />,
    booking_cancelled: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    payment_received: <DollarSign className="h-3.5 w-3.5 text-emerald-500" />,
    guide_confirmed: <User className="h-3.5 w-3.5 text-primary" />,
  };

  const icon = icons[activity.type] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  const time = new Date(activity.timestamp);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 animate-in fade-in duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
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
