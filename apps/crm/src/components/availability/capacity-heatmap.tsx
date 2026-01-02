"use client";

import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface CapacityHeatmapProps {
  orgSlug: string;
}

function formatDate(dateStr: string): { day: string; weekday: string; isToday: boolean; isWeekend: boolean } {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = date.toDateString() === today.toDateString();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    day: date.getDate().toString(),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    isToday,
    isWeekend,
  };
}

function getUtilizationColor(utilization: number, hasTourRuns: boolean): string {
  if (!hasTourRuns) return "bg-muted/30"; // No tour runs
  if (utilization === 0) return "bg-success/20"; // Empty
  if (utilization < 50) return "bg-success/40"; // Plenty available
  if (utilization < 80) return "bg-warning/50"; // Filling up
  if (utilization < 100) return "bg-destructive/60"; // Almost full
  return "bg-destructive"; // Completely full
}

function getUtilizationTextColor(utilization: number): string {
  if (utilization >= 90) return "text-destructive-foreground";
  return "text-foreground";
}

export function CapacityHeatmap({ orgSlug }: CapacityHeatmapProps) {
  const [dateOffset, setDateOffset] = useState(0); // Weeks offset from today
  const daysToShow = 14; // Show 2 weeks

  // Calculate date range
  const dateRange = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() + dateOffset * 7);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setDate(to.getDate() + daysToShow - 1);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }, [dateOffset]);

  const { data: heatmapEntries, isLoading, error } = trpc.availability.getCapacityHeatmap.useQuery({
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Transform flat array to grid structure
  const { tours, dates, cells } = useMemo(() => {
    if (!heatmapEntries || heatmapEntries.length === 0) {
      return { tours: [] as { id: string; name: string }[], dates: [] as string[], cells: {} as Record<string, { tourRunCount: number; bookedCount: number; totalCapacity: number; utilization: number }> };
    }

    // Extract unique tours
    const tourMap = new Map<string, string>();
    heatmapEntries.forEach((entry) => {
      if (!tourMap.has(entry.tourId)) {
        tourMap.set(entry.tourId, entry.tourName);
      }
    });
    const tours = Array.from(tourMap.entries()).map(([id, name]) => ({ id, name }));

    // Extract unique dates
    const dateSet = new Set<string>();
    heatmapEntries.forEach((entry) => {
      dateSet.add(entry.date);
    });
    const dates = Array.from(dateSet).sort();

    // Build cells lookup - aggregate by tour+date
    const cells: Record<string, { tourRunCount: number; bookedCount: number; totalCapacity: number; utilization: number }> = {};
    heatmapEntries.forEach((entry) => {
      const cellKey = `${entry.tourId}-${entry.date}`;
      if (!cells[cellKey]) {
        cells[cellKey] = {
          tourRunCount: 0,
          bookedCount: 0,
          totalCapacity: 0,
          utilization: 0,
        };
      }
      cells[cellKey].tourRunCount += 1;
      cells[cellKey].bookedCount += entry.bookedCount;
      cells[cellKey].totalCapacity += entry.maxCapacity;
    });

    // Calculate utilization for each cell
    Object.values(cells).forEach((cell) => {
      cell.utilization = cell.totalCapacity > 0
        ? Math.round((cell.bookedCount / cell.totalCapacity) * 100)
        : 0;
    });

    return { tours, dates, cells };
  }, [heatmapEntries]);

  const navigateWeek = (direction: "prev" | "next") => {
    setDateOffset((prev) => prev + (direction === "next" ? 1 : -1));
  };

  const goToToday = () => {
    setDateOffset(0);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Failed to load heatmap: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                {[...Array(14)].map((_, j) => (
                  <div key={j} className="h-10 w-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground mb-4">No active tours to display</p>
        <Link
          href={`/org/${orgSlug}/tours/new` as Route}
          className="text-primary hover:underline"
        >
          Create your first tour
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek("prev")}
            className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-input hover:bg-accent transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek("next")}
            className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-3 text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(dateRange.from)}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-muted/30" />
            <span className="text-muted-foreground">No availability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-success/40" />
            <span className="text-muted-foreground">&lt;50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-warning/50" />
            <span className="text-muted-foreground">50-80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive/60" />
            <span className="text-muted-foreground">&gt;80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span className="text-muted-foreground">Full</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Date Header */}
          <thead>
            <tr>
              <th className="sticky left-0 bg-card z-10 px-4 py-3 text-left text-sm font-medium text-muted-foreground border-b border-border min-w-[140px]">
                Tour
              </th>
              {dates.map((dateStr) => {
                const { day, weekday, isToday, isWeekend } = formatDate(dateStr);
                return (
                  <th
                    key={dateStr}
                    className={cn(
                      "px-1 py-2 text-center border-b border-border min-w-[48px]",
                      isToday && "bg-primary/10",
                      isWeekend && "bg-muted/30"
                    )}
                  >
                    <div className="text-xs text-muted-foreground">{weekday}</div>
                    <div className={cn("text-sm font-medium", isToday && "text-primary")}>
                      {day}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Tour Rows */}
          <tbody>
            {tours.map((tour) => (
              <tr key={tour.id} className="hover:bg-muted/20">
                {/* Tour Name (sticky) */}
                <td className="sticky left-0 bg-card z-10 px-4 py-2 border-b border-border">
                  <Link
                    href={`/org/${orgSlug}/tours/${tour.id}` as Route}
                    className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block max-w-[120px]"
                    title={tour.name}
                  >
                    {tour.name}
                  </Link>
                </td>

                {/* Capacity Cells */}
                {dates.map((dateStr) => {
                  const cellKey = `${tour.id}-${dateStr}`;
                  const cell = cells[cellKey];
                  const hasTourRuns = cell && cell.tourRunCount > 0;
                  const utilization = cell?.utilization ?? 0;
                  const { isToday, isWeekend } = formatDate(dateStr);

                  return (
                    <td
                      key={cellKey}
                      className={cn(
                        "px-1 py-2 text-center border-b border-border",
                        isToday && "bg-primary/5",
                        isWeekend && !isToday && "bg-muted/20"
                      )}
                    >
                      <Link
                        href={`/org/${orgSlug}/availability?date=${dateStr}&tourId=${tour.id}` as Route}
                        className={cn(
                          "w-10 h-10 mx-auto rounded flex items-center justify-center text-xs font-medium transition-all hover:ring-2 hover:ring-primary/50",
                          getUtilizationColor(utilization, !!hasTourRuns),
                          !!hasTourRuns && getUtilizationTextColor(utilization)
                        )}
                        title={
                          hasTourRuns
                            ? `${cell!.bookedCount}/${cell!.totalCapacity} booked (${utilization}%)`
                            : "No availability"
                        }
                      >
                        {hasTourRuns ? (
                          <span>{utilization}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Info className="h-4 w-4" />
          <span>Click a cell to view that day's availability</span>
        </div>
        <span>
          Showing {tours.length} tours over {dates.length} days
        </span>
      </div>
    </div>
  );
}
