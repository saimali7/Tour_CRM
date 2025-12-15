"use client";

import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourScheduleStatsProps {
  upcomingCount: number;
  totalCapacity: number;
  totalBooked: number;
  utilizationPercent: number;
  nextScheduleDate: Date | string | null;
  isLoading?: boolean;
  className?: string;
}

function formatNextDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset times for date comparison
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  }
  if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function TourScheduleStats({
  upcomingCount,
  totalCapacity,
  totalBooked,
  utilizationPercent,
  nextScheduleDate,
  isLoading,
  className,
}: TourScheduleStatsProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // No schedules case
  if (upcomingCount === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No upcoming schedules
      </div>
    );
  }

  // Get color based on utilization
  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "bg-destructive";
    if (percent >= 70) return "bg-warning";
    return "bg-success";
  };

  const getUtilizationTextColor = (percent: number) => {
    if (percent >= 90) return "text-destructive";
    if (percent >= 70) return "text-warning";
    return "text-success";
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Upcoming count and next date */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{upcomingCount}</span>
          <span className="text-muted-foreground">upcoming</span>
        </div>
        {nextScheduleDate && (
          <span className="text-muted-foreground">
            Next: {formatNextDate(nextScheduleDate)}
          </span>
        )}
      </div>

      {/* Capacity bar */}
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", getUtilizationColor(utilizationPercent))}
            style={{ width: `${Math.min(100, utilizationPercent)}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium", getUtilizationTextColor(utilizationPercent))}>
          {utilizationPercent}%
        </span>
        <span className="text-xs text-muted-foreground">
          ({totalBooked}/{totalCapacity})
        </span>
      </div>
    </div>
  );
}

// Compact version for narrow spaces
export function TourScheduleStatsCompact({
  upcomingCount,
  utilizationPercent,
  nextScheduleDate,
  isLoading,
  className,
}: Omit<TourScheduleStatsProps, "totalCapacity" | "totalBooked">) {
  if (isLoading) {
    return <div className={cn("h-4 w-16 bg-muted animate-pulse rounded", className)} />;
  }

  if (upcomingCount === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No schedules
      </span>
    );
  }

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "text-destructive";
    if (percent >= 70) return "text-warning";
    return "text-success";
  };

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className="font-medium">{upcomingCount}</span>
      <span className={cn("font-medium", getUtilizationColor(utilizationPercent))}>
        {utilizationPercent}%
      </span>
      {nextScheduleDate && (
        <span className="text-muted-foreground hidden sm:inline">
          {formatNextDate(nextScheduleDate)}
        </span>
      )}
    </div>
  );
}
