"use client";

import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Clock, Users, User, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay } from "date-fns";

interface ToursDayViewProps {
  orgSlug: string;
  selectedDate: Date;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getTimeSlotLabel(time: string): string {
  const [hours] = time.split(":");
  const hour = parseInt(hours || "0", 10);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function ToursDayView({ orgSlug, selectedDate }: ToursDayViewProps) {
  // Query tour runs for the selected date
  const dateRange = useMemo(() => {
    const from = startOfDay(selectedDate);
    const to = endOfDay(selectedDate);
    return { from, to };
  }, [selectedDate]);

  const { data, isLoading, error } = trpc.tourRun.list.useQuery({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const tourRuns = data?.tourRuns || [];

  // Group tour runs by time slot (Morning, Afternoon, Evening)
  type TourRunItem = {
    tourId: string;
    tourName: string;
    time: string;
    date: string;
    bookedCount: number;
    capacity: number;
    guidesAssigned: number;
    guidesRequired: number;
    durationMinutes?: number;
  };
  type TourRunList = TourRunItem[];
  const groupedTourRuns = useMemo((): Record<"Morning" | "Afternoon" | "Evening", TourRunList> => {
    const groups: Record<"Morning" | "Afternoon" | "Evening", TourRunList> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const tourRun of tourRuns) {
      const slot = getTimeSlotLabel(tourRun.time) as "Morning" | "Afternoon" | "Evening";
      // Convert Date to YYYY-MM-DD string for URL params
      const dateStr = tourRun.date instanceof Date
        ? tourRun.date.toISOString().split('T')[0]!
        : String(tourRun.date);
      groups[slot].push({
        tourId: tourRun.tourId,
        tourName: tourRun.tourName,
        time: tourRun.time,
        date: dateStr,
        bookedCount: tourRun.bookedCount || 0,
        capacity: tourRun.capacity || 0,
        guidesAssigned: tourRun.guidesAssigned || 0,
        guidesRequired: tourRun.guidesRequired || 1,
        durationMinutes: tourRun.durationMinutes,
      });
    }

    return groups;
  }, [tourRuns]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalTourRuns = tourRuns.length;
    const totalCapacity = tourRuns.reduce((sum, tr) => sum + (tr.capacity || 0), 0);
    const totalBooked = tourRuns.reduce((sum, tr) => sum + (tr.bookedCount || 0), 0);
    const spotsRemaining = totalCapacity - totalBooked;
    const needsGuide = tourRuns.filter((tr) => (tr.guidesRequired || 1) > 0 && (tr.guidesAssigned || 0) < (tr.guidesRequired || 1)).length;
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    return { totalTourRuns, totalCapacity, totalBooked, spotsRemaining, needsGuide, utilizationPercent };
  }, [tourRuns]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Failed to load tour runs: {error.message}</p>
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
          <div className="text-2xl font-bold text-foreground mt-1">{stats.totalTourRuns}</div>
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

      {/* No tour runs */}
      {tourRuns.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">No tours scheduled for this day</p>
          <p className="text-sm text-muted-foreground">
            Tour runs appear when customers book tours
          </p>
        </div>
      )}

      {/* Tour Runs by Time Slot */}
      {(["Morning", "Afternoon", "Evening"] as const).map((slot) => {
        const slotTourRuns = groupedTourRuns[slot];
        if (slotTourRuns.length === 0) return null;

        return (
          <div key={slot} className="space-y-3">
            {/* Time Slot Header */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{slot}</h3>
              <span className="text-xs text-muted-foreground">
                ({slotTourRuns.length} tour{slotTourRuns.length !== 1 ? "s" : ""})
              </span>
            </div>

            {/* Tour Run Cards */}
            <div className="grid gap-3">
              {slotTourRuns.map((tourRun) => {
                const booked = tourRun.bookedCount;
                const max = tourRun.capacity;
                const remaining = max - booked;
                const percentage = max > 0 ? Math.round((booked / max) * 100) : 0;

                return (
                  <Link
                    key={`${tourRun.tourId}-${tourRun.date}-${tourRun.time}`}
                    href={`/org/${orgSlug}/command-center?date=${tourRun.date}` as Route}
                    className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Time + Tour Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Time */}
                        <div className="flex-shrink-0 w-20">
                          <div className="text-lg font-bold text-foreground">
                            {formatTime(tourRun.time)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tourRun.durationMinutes ?? 60} min
                          </div>
                        </div>

                        {/* Tour Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {tourRun.tourName ?? "Unknown Tour"}
                          </div>
                          {tourRun.guidesAssigned > 0 ? (
                            <div className="flex items-center gap-1.5 text-sm text-success mt-1">
                              <User className="h-3.5 w-3.5" />
                              {tourRun.guidesAssigned}/{tourRun.guidesRequired} guides
                            </div>
                          ) : tourRun.guidesRequired > 0 ? (
                            <div className="flex items-center gap-1.5 text-sm text-warning mt-1">
                              <User className="h-3.5 w-3.5" />
                              Needs {tourRun.guidesRequired} guide{tourRun.guidesRequired !== 1 ? 's' : ''}
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
