"use client";

import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Clock, Users, User, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface ToursDayViewProps {
  orgSlug: string;
  selectedDate: Date;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getTimeSlotLabel(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function ToursDayView({ orgSlug, selectedDate }: ToursDayViewProps) {
  // Query schedules for the selected date
  const dateRange = useMemo(() => {
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [selectedDate]);

  const { data, isLoading, error } = trpc.schedule.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: {
      dateRange,
    },
    sort: { field: "startsAt", direction: "asc" },
  });

  const schedules = data?.data || [];

  // Group schedules by time slot (Morning, Afternoon, Evening)
  type ScheduleList = typeof schedules;
  const groupedSchedules = useMemo((): Record<"Morning" | "Afternoon" | "Evening", ScheduleList> => {
    const groups: Record<"Morning" | "Afternoon" | "Evening", ScheduleList> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const schedule of schedules) {
      const hour = new Date(schedule.startsAt).getHours();
      const slot = getTimeSlotLabel(hour) as "Morning" | "Afternoon" | "Evening";
      groups[slot].push(schedule);
    }

    return groups;
  }, [schedules]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalSchedules = schedules.length;
    const totalCapacity = schedules.reduce((sum, s) => sum + s.maxParticipants, 0);
    const totalBooked = schedules.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
    const spotsRemaining = totalCapacity - totalBooked;
    const needsGuide = schedules.filter((s) => (s.guidesRequired ?? 0) > 0 && (s.guidesAssigned ?? 0) < (s.guidesRequired ?? 0)).length;
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    return { totalSchedules, totalCapacity, totalBooked, spotsRemaining, needsGuide, utilizationPercent };
  }, [schedules]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Failed to load schedules: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Schedule skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="space-y-2">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-16 bg-muted rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tours</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.totalSchedules}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Booked</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.totalBooked}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spots Left</div>
          <div className={cn(
            "text-2xl font-bold mt-1",
            stats.spotsRemaining > 10 ? "text-success" : stats.spotsRemaining > 0 ? "text-warning" : "text-destructive"
          )}>
            {stats.spotsRemaining}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilization</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.utilizationPercent}%</div>
        </div>
        {stats.needsGuide > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="text-xs font-medium text-warning uppercase tracking-wider">Needs Guide</div>
            <div className="text-2xl font-bold text-warning mt-1">{stats.needsGuide}</div>
          </div>
        )}
      </div>

      {/* No schedules */}
      {schedules.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">No tours scheduled for this day</p>
          <p className="text-sm text-muted-foreground">
            Create schedules from individual tour pages
          </p>
        </div>
      )}

      {/* Schedules by Time Slot */}
      {(["Morning", "Afternoon", "Evening"] as const).map((slot) => {
        const slotSchedules = groupedSchedules[slot];
        if (slotSchedules.length === 0) return null;

        return (
          <div key={slot} className="space-y-3">
            {/* Time Slot Header */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{slot}</h3>
              <span className="text-xs text-muted-foreground">
                ({slotSchedules.length} tour{slotSchedules.length !== 1 ? "s" : ""})
              </span>
            </div>

            {/* Schedule Cards */}
            <div className="grid gap-3">
              {slotSchedules.map((schedule) => {
                const booked = schedule.bookedCount ?? 0;
                const max = schedule.maxParticipants;
                const remaining = max - booked;
                const percentage = max > 0 ? Math.round((booked / max) * 100) : 0;

                return (
                  <Link
                    key={schedule.id}
                    href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
                    className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Time + Tour Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Time */}
                        <div className="flex-shrink-0 w-20">
                          <div className="text-lg font-bold text-foreground">
                            {formatTime(schedule.startsAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {schedule.tour?.durationMinutes ?? 60} min
                          </div>
                        </div>

                        {/* Tour Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {schedule.tour?.name ?? "Unknown Tour"}
                          </div>
                          {(schedule.guidesAssigned ?? 0) > 0 ? (
                            <div className="flex items-center gap-1.5 text-sm text-success mt-1">
                              <User className="h-3.5 w-3.5" />
                              {schedule.guidesAssigned}/{schedule.guidesRequired} guides
                            </div>
                          ) : (schedule.guidesRequired ?? 0) > 0 ? (
                            <div className="flex items-center gap-1.5 text-sm text-warning mt-1">
                              <User className="h-3.5 w-3.5" />
                              Needs {schedule.guidesRequired} guide{schedule.guidesRequired !== 1 ? 's' : ''}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: Booking Stats */}
                      <div className="flex items-center gap-4">
                        {/* Capacity Bar & Numbers */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className={cn(
                              "text-lg font-bold",
                              remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-success"
                            )}>
                              {remaining}
                            </span>
                            <span className="text-sm text-muted-foreground">left</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percentage >= 100 ? "bg-destructive" : percentage >= 80 ? "bg-warning" : "bg-success"
                                )}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-14 text-right">
                              {booked}/{max}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
