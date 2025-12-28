"use client";

import * as React from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DayStats {
  tourCount: number;
  totalGuests: number;
  totalCapacity: number;
  needsGuide: number;
  pendingPayments: number;
  unconfirmed: number;
}

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  stats: DayStats;
  orgSlug: string;
}

export function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  stats,
  orgSlug,
}: CalendarDayCellProps) {
  const router = useRouter();
  const dayNumber = date.getDate();

  const hasSchedules = stats.tourCount > 0;
  const hasBookings = stats.totalGuests > 0;
  const hasAlerts = stats.needsGuide > 0 || stats.pendingPayments > 0 || stats.unconfirmed > 0;

  // Calculate utilization percentage
  const utilization = stats.totalCapacity > 0
    ? (stats.totalGuests / stats.totalCapacity) * 100
    : 0;

  // Capacity bar color based on utilization
  const getBarColor = () => {
    if (utilization >= 80) return "bg-emerald-500";
    if (utilization >= 50) return "bg-primary";
    return "bg-amber-500";
  };

  // Build alert tooltip text
  const getAlertTooltip = () => {
    const parts: string[] = [];
    if (stats.needsGuide > 0) parts.push(`${stats.needsGuide} needs guide`);
    if (stats.pendingPayments > 0) parts.push(`${stats.pendingPayments} pending payment`);
    if (stats.unconfirmed > 0) parts.push(`${stats.unconfirmed} unconfirmed`);
    return parts.join(", ");
  };

  const handleClick = () => {
    if (!isCurrentMonth) return;
    const dateStr = format(date, "yyyy-MM-dd");
    router.push(`/org/${orgSlug}/calendar/${dateStr}` as Route);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isCurrentMonth}
      className={cn(
        "relative flex flex-col p-2 h-24 w-full text-left transition-colors rounded-md",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        !isCurrentMonth && "opacity-40 pointer-events-none",
        isToday && "bg-accent/30"
      )}
    >
      {/* Top row: Date + Alert indicators */}
      <div className="flex items-start justify-between">
        {/* Date number */}
        <span
          className={cn(
            "flex items-center justify-center text-sm font-medium",
            isToday && "h-7 w-7 rounded-full bg-primary text-primary-foreground",
            !isToday && !hasSchedules && "text-muted-foreground"
          )}
        >
          {dayNumber}
        </span>

        {/* Alert indicators */}
        {hasAlerts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                {stats.needsGuide > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
                {stats.pendingPayments > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                )}
                {stats.unconfirmed > 0 && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {getAlertTooltip()}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section: Capacity bar + counts */}
      {hasSchedules && (
        <div className="space-y-1.5">
          {/* Capacity bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getBarColor())}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>

          {/* Booked / Capacity */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {stats.tourCount} {stats.tourCount === 1 ? "tour" : "tours"}
            </p>
            <div className="flex items-center gap-1">
              {utilization >= 100 ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
                  Full
                </span>
              ) : (
                <span className="text-xs tabular-nums">
                  <span className="font-medium text-foreground">{stats.totalGuests}</span>
                  <span className="text-muted-foreground">/{stats.totalCapacity}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
