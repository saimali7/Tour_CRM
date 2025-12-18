"use client";

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Zap,
  Plus,
  Printer,
  ArrowRight,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";

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
  if (mins < 60) return `${mins}m`;
  if (mins < 120) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return format(date, "h:mm a");
}

function getUtilization(booked: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((booked / max) * 100);
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const {
    data: operationsData,
    isLoading,
    error,
  } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s
  });

  // Generate alerts from operations data
  const alerts = useMemo((): Alert[] => {
    if (!operationsData) return [];

    const items: Alert[] = [];
    const now = new Date();

    // Critical: Unassigned guides for today
    operationsData.upcomingSchedules
      .filter((s) => s.hasUnconfirmedGuide)
      .forEach((schedule) => {
        items.push({
          id: `unassigned-${schedule.scheduleId}`,
          type: "critical",
          title: "No guide assigned",
          subtitle: `${schedule.tourName} · ${getTimeLabel(new Date(schedule.startsAt))} · ${schedule.bookedCount} guests`,
          action: { label: "Assign", href: `/org/${slug}/calendar` },
        });
      });

    // Warning: Low capacity (< 30%) for upcoming tours
    operationsData.upcomingSchedules
      .filter((s) => {
        const util = getUtilization(s.bookedCount, s.maxParticipants);
        const daysAway = Math.ceil(
          (new Date(s.startsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return util < 30 && util > 0 && daysAway > 1 && daysAway <= 7 && !s.hasUnconfirmedGuide;
      })
      .slice(0, 2)
      .forEach((schedule) => {
        const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
        items.push({
          id: `low-${schedule.scheduleId}`,
          type: "warning",
          title: `${util}% booked`,
          subtitle: `${schedule.tourName} · ${format(new Date(schedule.startsAt), "EEE, MMM d")}`,
          action: { label: "View", href: `/org/${slug}/calendar` },
        });
      });

    return items;
  }, [operationsData, slug]);

  // Separate today's and upcoming schedules
  const { todaySchedules, upcomingSchedules } = useMemo(() => {
    if (!operationsData) return { todaySchedules: [], upcomingSchedules: [] };

    const today: ScheduleItem[] = [];
    const upcoming: ScheduleItem[] = [];

    operationsData.upcomingSchedules.forEach((s) => {
      const date = new Date(s.startsAt);
      if (isToday(date)) {
        today.push(s);
      } else {
        upcoming.push(s);
      }
    });

    return { todaySchedules: today, upcomingSchedules: upcoming.slice(0, 5) };
  }, [operationsData]);

  // Stats
  const stats = useMemo(() => {
    if (!operationsData) return null;
    return {
      tours: operationsData.todaysOperations.scheduledTours,
      guests: operationsData.todaysOperations.totalParticipants,
      guides: operationsData.todaysOperations.guidesWorking,
      alerts: alerts.filter((a) => a.type === "critical").length,
    };
  }, [operationsData, alerts]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== HEADER: Date + Inline Stats ===== */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {format(new Date(), "EEEE, MMMM d")}
          </h1>
          {isLoading ? (
            <div className="h-4 w-48 bg-muted animate-pulse rounded mt-1" />
          ) : stats && (
            <p className="text-sm text-muted-foreground mt-0.5 font-mono tabular-nums">
              <span className="text-foreground font-medium">{stats.tours}</span> tours
              <span className="mx-1.5 text-border">·</span>
              <span className="text-foreground font-medium">{stats.guests}</span> guests
              <span className="mx-1.5 text-border">·</span>
              <span className="text-foreground font-medium">{stats.guides}</span> guides
              {stats.alerts > 0 && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  <span className="text-destructive font-medium">{stats.alerts}</span>
                  <span className="text-destructive"> alerts</span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/org/${slug}/bookings?quick=1` as Route}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Book
          </Link>
        </div>
      </header>

      {/* ===== ALERTS BANNER ===== */}
      {alerts.length > 0 && (
        <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 overflow-hidden">
          <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {alerts.length} {alerts.length === 1 ? "issue" : "issues"} need attention
              </span>
            </div>
          </div>
          <div className="divide-y divide-destructive/10">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-destructive/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full flex-shrink-0",
                      alert.type === "critical" && "bg-destructive",
                      alert.type === "warning" && "bg-yellow-500",
                      alert.type === "info" && "bg-blue-500"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.subtitle}
                    </p>
                  </div>
                </div>
                <Link
                  href={alert.action.href as Route}
                  className="flex-shrink-0 text-xs font-medium text-destructive hover:underline"
                >
                  {alert.action.label}
                  <ChevronRight className="h-3 w-3 inline ml-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ALL CLEAR STATE ===== */}
      {alerts.length === 0 && !isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              All clear
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              No urgent issues need your attention
            </p>
          </div>
        </div>
      )}

      {/* ===== TODAY'S SCHEDULE ===== */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Today's Schedule
          </h2>
          {todaySchedules.length > 0 && (
            <button
              onClick={() => window.print()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Printer className="h-3 w-3" />
              Print All
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : todaySchedules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No tours scheduled for today</p>
            <Link
              href={`/org/${slug}/calendar` as Route}
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View calendar
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {todaySchedules.map((schedule) => (
              <ScheduleRow
                key={schedule.scheduleId}
                schedule={schedule}
                slug={slug}
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== UPCOMING (Next 7 Days) ===== */}
      {upcomingSchedules.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Coming Up
            </h2>
            <Link
              href={`/org/${slug}/calendar` as Route}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {upcomingSchedules.map((schedule) => (
              <UpcomingRow
                key={schedule.scheduleId}
                schedule={schedule}
                slug={slug}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== QUICK ACTIONS ===== */}
      <section className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickAction
            href={`/org/${slug}/bookings/new`}
            icon={Plus}
            label="New Booking"
          />
          <QuickAction
            href={`/org/${slug}/tours/new`}
            icon={MapPin}
            label="New Tour"
          />
          <QuickAction
            href={`/org/${slug}/customers/new`}
            icon={Users}
            label="Add Customer"
          />
          <QuickAction
            href={`/org/${slug}/analytics`}
            icon={ChevronRight}
            label="Analytics"
          />
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ScheduleRowProps {
  schedule: ScheduleItem;
  slug: string;
}

function ScheduleRow({ schedule, slug }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const isStartingSoon = differenceInMinutes(startTime, new Date()) <= 60 && differenceInMinutes(startTime, new Date()) > 0;

  return (
    <Link
      href={`/org/${slug}/availability/${schedule.scheduleId}` as Route}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      {/* Time */}
      <div className="w-16 flex-shrink-0">
        <p className={cn(
          "text-sm font-mono tabular-nums",
          isStartingSoon ? "text-primary font-semibold" : "text-foreground"
        )}>
          {getTimeLabel(startTime)}
        </p>
        {isStartingSoon && (
          <p className="text-[10px] text-primary font-medium">
            {getRelativeTime(startTime)}
          </p>
        )}
      </div>

      {/* Tour Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {schedule.tourName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {schedule.bookedCount}/{schedule.maxParticipants}
          </span>
          {schedule.guideName ? (
            <span className="text-xs text-muted-foreground truncate">
              · {schedule.guideName}
            </span>
          ) : (
            <span className="text-xs text-destructive font-medium">
              · No guide
            </span>
          )}
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="w-20 flex-shrink-0 hidden sm:block">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              util >= 80 ? "bg-emerald-500" : util >= 50 ? "bg-primary" : "bg-yellow-500"
            )}
            style={{ width: `${util}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-0.5">
          {util}%
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </Link>
  );
}

function UpcomingRow({ schedule, slug }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);

  const dayLabel = isTomorrow(startTime)
    ? "Tomorrow"
    : format(startTime, "EEE, MMM d");

  return (
    <Link
      href={`/org/${slug}/availability/${schedule.scheduleId}` as Route}
      className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
    >
      {/* Date */}
      <div className="w-24 flex-shrink-0">
        <p className="text-xs text-muted-foreground">{dayLabel}</p>
        <p className="text-sm font-mono tabular-nums text-foreground">
          {getTimeLabel(startTime)}
        </p>
      </div>

      {/* Tour */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{schedule.tourName}</p>
      </div>

      {/* Booked */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {schedule.bookedCount}/{schedule.maxParticipants}
        {schedule.hasUnconfirmedGuide && (
          <span className="text-destructive">⚠</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </Link>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function QuickAction({ href, icon: Icon, label }: QuickActionProps) {
  return (
    <Link
      href={href as Route}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/20 transition-all text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
