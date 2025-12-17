"use client";

import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface ToursWeekViewProps {
  orgSlug: string;
  weekStart: Date;
  onDayClick?: (date: Date) => void;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getWeekDates(start: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  // Start from Sunday
  const day = current.getDay();
  current.setDate(current.getDate() - day);

  for (let i = 0; i < 7; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function ToursWeekView({ orgSlug, weekStart, onDayClick }: ToursWeekViewProps) {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const dateRange = useMemo(() => {
    const firstDate = weekDates[0];
    const lastDate = weekDates[6];
    if (!firstDate || !lastDate) {
      const now = new Date();
      return { from: now, to: now };
    }
    const from = new Date(firstDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(lastDate);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [weekDates]);

  const { data, isLoading, error } = trpc.schedule.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: {
      dateRange,
    },
    sort: { field: "startsAt", direction: "asc" },
  });

  const schedules = data?.data || [];

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, typeof schedules> = {};
    for (const date of weekDates) {
      grouped[date.toDateString()] = [];
    }
    for (const schedule of schedules) {
      const dateKey = new Date(schedule.startsAt).toDateString();
      if (grouped[dateKey]) {
        grouped[dateKey].push(schedule);
      }
    }
    return grouped;
  }, [schedules, weekDates]);

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const stats: Record<string, { totalSchedules: number; totalBooked: number; totalCapacity: number; spotsLeft: number }> = {};
    for (const date of weekDates) {
      const daySchedules = schedulesByDate[date.toDateString()] || [];
      const totalCapacity = daySchedules.reduce((sum, s) => sum + s.maxParticipants, 0);
      const totalBooked = daySchedules.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
      stats[date.toDateString()] = {
        totalSchedules: daySchedules.length,
        totalBooked,
        totalCapacity,
        spotsLeft: totalCapacity - totalBooked,
      };
    }
    return stats;
  }, [schedulesByDate, weekDates]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Failed to load schedules: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 min-h-[200px] animate-pulse">
            <div className="h-4 w-12 bg-muted rounded mb-2" />
            <div className="h-6 w-8 bg-muted rounded mb-4" />
            <div className="space-y-2">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Week of {weekDates[0] ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(weekDates[0]) : ""}
        </span>
        <span>
          {schedules.length} tours scheduled
        </span>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dateKey = date.toDateString();
          const daySchedules = schedulesByDate[dateKey] || [];
          const stats = dailyStats[dateKey];
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={dateKey}
              className={cn(
                "rounded-lg border bg-card min-h-[200px] flex flex-col",
                isToday ? "border-primary ring-1 ring-primary/20" : "border-border",
                isPast && "opacity-60"
              )}
            >
              {/* Day Header */}
              <button
                onClick={() => onDayClick?.(date)}
                className={cn(
                  "p-3 border-b border-border text-left hover:bg-muted/50 transition-colors",
                  isWeekend && "bg-muted/30"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
                </div>
                <div className={cn(
                  "text-xl font-bold",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {date.getDate()}
                </div>
                {/* Day Stats */}
                {stats && stats.totalSchedules > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {stats.totalSchedules} tour{stats.totalSchedules !== 1 ? "s" : ""}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      stats.spotsLeft > 10 ? "text-success" : stats.spotsLeft > 0 ? "text-warning" : "text-destructive"
                    )}>
                      {stats.spotsLeft} left
                    </span>
                  </div>
                )}
              </button>

              {/* Schedules */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[300px]">
                {daySchedules.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No tours
                  </div>
                ) : (
                  daySchedules.map((schedule) => {
                    const booked = schedule.bookedCount ?? 0;
                    const max = schedule.maxParticipants;
                    const remaining = max - booked;
                    const percentage = max > 0 ? Math.round((booked / max) * 100) : 0;

                    return (
                      <Link
                        key={schedule.id}
                        href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
                        className={cn(
                          "block rounded p-2 text-xs hover:ring-1 hover:ring-primary/50 transition-all",
                          percentage >= 100 ? "bg-destructive/10" : percentage >= 80 ? "bg-warning/10" : "bg-muted/50"
                        )}
                      >
                        {/* Time */}
                        <div className="font-medium text-foreground">
                          {formatTime(schedule.startsAt)}
                        </div>
                        {/* Tour Name */}
                        <div className="text-muted-foreground truncate" title={schedule.tour?.name}>
                          {schedule.tour?.name ?? "Unknown"}
                        </div>
                        {/* Booking Stats */}
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className={cn(
                            "font-medium",
                            remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-success"
                          )}>
                            {remaining}
                          </span>
                          <span className="text-muted-foreground">/ {max}</span>
                        </div>
                        {/* Capacity Bar */}
                        <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              percentage >= 100 ? "bg-destructive" : percentage >= 80 ? "bg-warning" : "bg-success"
                            )}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
