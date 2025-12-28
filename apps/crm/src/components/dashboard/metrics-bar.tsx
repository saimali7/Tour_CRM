"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";

interface MetricsBarProps {
  todayRevenue?: number;
  todayChange?: number;
  weekRevenue?: number;
  todayBookings?: number;
  todayGuests?: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * Metrics Bar - Compact Business Health Display
 *
 * Single-row display of key business metrics.
 * Designed to be scannable at a glance.
 *
 * Principles:
 * - Tier 2 information: Context, not primary focus
 * - Single row: No vertical stacking
 * - Neutral styling: Don't compete with action items
 */
export function MetricsBar({
  todayRevenue = 0,
  todayChange,
  weekRevenue = 0,
  todayBookings = 0,
  todayGuests = 0,
  isLoading,
  className,
}: MetricsBarProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-4 px-4 py-2.5 rounded-lg border border-border bg-card",
        className
      )}>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const isPositive = todayChange && todayChange > 0;
  const isNegative = todayChange && todayChange < 0;

  return (
    <div className={cn(
      "flex items-center gap-4 sm:gap-6 px-4 py-2.5 rounded-lg border border-border bg-card overflow-x-auto",
      className
    )}>
      {/* Today's Revenue */}
      <div className="flex items-center gap-2 shrink-0">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatCurrency(todayRevenue)}
          </span>
          <span className="text-xs text-muted-foreground">today</span>
          {todayChange !== undefined && todayChange !== 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded",
              isPositive && "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
              isNegative && "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
            )}>
              {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {isPositive && "+"}{todayChange.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border shrink-0" />

      {/* Week Revenue */}
      <div className="flex items-center gap-2 shrink-0">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatCurrency(weekRevenue)}
          </span>
          <span className="text-xs text-muted-foreground">this week</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border shrink-0" />

      {/* Today's Activity */}
      <div className="flex items-center gap-2 shrink-0">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {todayBookings}
          </span>
          <span className="text-xs text-muted-foreground">
            booking{todayBookings !== 1 ? "s" : ""}
          </span>
          {todayGuests > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {todayGuests}
              </span>
              <span className="text-xs text-muted-foreground">
                guest{todayGuests !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
