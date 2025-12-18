"use client";

import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  ChevronRight,
  Zap,
  Printer,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import { UnifiedBookingSheet } from "@/components/bookings/unified-booking-sheet";

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
  const slug = params.slug as string;
  const [showQuickBook, setShowQuickBook] = useState(false);

  const {
    data: operationsData,
    isLoading,
    error,
  } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });

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
          action: { label: "Assign", href: `/org/${slug}/calendar` },
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
        <p className="text-sm text-destructive">
          Error loading dashboard: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {format(new Date(), "EEEE, MMMM d")}
              </h1>
              {isLoading ? (
                <div className="h-4 w-48 skeleton rounded mt-1" />
              ) : (
                stats && (
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span><span className="text-foreground font-medium">{stats.tours}</span> tours</span>
                    <span><span className="text-foreground font-medium">{stats.guests}</span> guests</span>
                    <span><span className="text-foreground font-medium">{stats.guides}</span> guides</span>
                  </div>
                )
              )}
            </div>
            <button
              onClick={() => setShowQuickBook(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Quick Book
            </button>
          </header>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 overflow-hidden">
              <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/10">
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
                      className="text-xs font-medium text-destructive hover:underline flex items-center"
                    >
                      {alert.action.label}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Clear */}
          {alerts.length === 0 && !isLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">All clear</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">No urgent issues</p>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Today's Schedule
              </h2>
              {todaySchedules.length > 0 && (
                <button
                  onClick={() => window.print()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" />
                  Print
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 skeleton rounded-lg" />
                ))}
              </div>
            ) : todaySchedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tours scheduled for today</p>
                <Link
                  href={`/org/${slug}/calendar` as Route}
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  View calendar
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                {todaySchedules.map((schedule) => (
                  <ScheduleRow key={schedule.scheduleId} schedule={schedule} slug={slug} />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming */}
          {upcomingSchedules.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
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
                  <UpcomingRow key={schedule.scheduleId} schedule={schedule} slug={slug} />
                ))}
              </div>
            </section>
          )}

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

interface ScheduleRowProps {
  schedule: ScheduleItem;
  slug: string;
}

function ScheduleRow({ schedule, slug }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const util = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const isStartingSoon =
    differenceInMinutes(startTime, new Date()) <= 60 &&
    differenceInMinutes(startTime, new Date()) > 0;

  return (
    <Link
      href={`/org/${slug}/availability/${schedule.scheduleId}` as Route}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="w-16 flex-shrink-0">
        <p className={cn(
          "text-sm font-mono tabular-nums",
          isStartingSoon ? "text-primary font-semibold" : "text-foreground"
        )}>
          {getTimeLabel(startTime)}
        </p>
        {isStartingSoon && (
          <p className="text-[10px] text-primary font-medium">{getRelativeTime(startTime)}</p>
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
            <span className="text-xs text-destructive font-medium">· No guide</span>
          )}
        </div>
      </div>

      <div className="w-16 flex-shrink-0 hidden sm:block">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full",
              util >= 80 ? "bg-emerald-500" : util >= 50 ? "bg-primary" : "bg-yellow-500"
            )}
            style={{ width: `${util}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-0.5">{util}%</p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

function UpcomingRow({ schedule, slug }: ScheduleRowProps) {
  const startTime = new Date(schedule.startsAt);
  const dayLabel = isTomorrow(startTime) ? "Tomorrow" : format(startTime, "EEE, MMM d");

  return (
    <Link
      href={`/org/${slug}/availability/${schedule.scheduleId}` as Route}
      className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
    >
      <div className="w-20 flex-shrink-0">
        <p className="text-xs text-muted-foreground">{dayLabel}</p>
        <p className="text-sm font-mono tabular-nums">{getTimeLabel(startTime)}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{schedule.tourName}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {schedule.bookedCount}/{schedule.maxParticipants}
        {schedule.hasUnconfirmedGuide && <span className="text-destructive">⚠</span>}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

