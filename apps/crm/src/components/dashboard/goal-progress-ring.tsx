"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import { Target, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface GoalWithProgress {
  id: string;
  name: string;
  metricType: "revenue" | "bookings" | "capacity_utilization" | "new_customers";
  targetValue: string;
  currentValue: string | null;
  periodEnd: Date | string;
  progress: number;
  remaining: string;
  daysRemaining: number;
  isOnTrack: boolean;
  projectedValue: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatValue(value: string | number, metricType: string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  switch (metricType) {
    case "revenue":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    case "capacity_utilization":
      return `${Math.round(num)}%`;
    default:
      return num.toLocaleString();
  }
}

function getMetricLabel(metricType: string): string {
  switch (metricType) {
    case "revenue":
      return "Revenue";
    case "bookings":
      return "Bookings";
    case "capacity_utilization":
      return "Capacity";
    case "new_customers":
      return "New Customers";
    default:
      return "Goal";
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface GoalProgressRingProps {
  className?: string;
  orgSlug: string;
}

export function GoalProgressRing({ className, orgSlug }: GoalProgressRingProps) {
  const { data: goals, isLoading } = trpc.goal.getActive.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <GoalProgressSkeleton />;
  }

  // Get the primary goal (first active goal, preferring revenue)
  const primaryGoal = goals?.find((g) => g.metricType === "revenue") || goals?.[0];

  if (!primaryGoal) {
    return <NoGoalsState orgSlug={orgSlug} />;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Progress Ring */}
        <ProgressRing
          progress={primaryGoal.progress}
          isOnTrack={primaryGoal.isOnTrack}
        />

        {/* Goal Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {getMetricLabel(primaryGoal.metricType)} Goal
            </span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                primaryGoal.isOnTrack
                  ? "bg-success/10 text-success dark:text-success"
                  : "bg-warning/10 text-warning dark:text-warning"
              )}
            >
              {primaryGoal.isOnTrack ? "On Track" : "Behind"}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {formatValue(primaryGoal.currentValue || "0", primaryGoal.metricType)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatValue(primaryGoal.targetValue, primaryGoal.metricType)}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {primaryGoal.isOnTrack ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-warning" />
              )}
              <span>
                Projected: {formatValue(primaryGoal.projectedValue, primaryGoal.metricType)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {primaryGoal.daysRemaining} days left
            </span>
          </div>
        </div>

        {/* Link to Goals */}
        <Link
          href={`/org/${orgSlug}/settings/goals` as Route}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
          title="View all goals"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Additional Goals Summary */}
      {goals && goals.length > 1 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {goals.length} active {goals.length === 1 ? "goal" : "goals"}
            </span>
            <span className="text-muted-foreground">
              {goals.filter((g) => g.isOnTrack).length} on track
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ProgressRing({
  progress,
  isOnTrack,
  size = 64,
}: {
  progress: number;
  isOnTrack: boolean;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const progressColor = isOnTrack
    ? "stroke-success"
    : progress >= 50
      ? "stroke-warning"
      : "stroke-destructive";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-500", progressColor)}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

function NoGoalsState({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Target className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">No active goals</p>
          <p className="text-xs text-muted-foreground">
            Set targets to track your progress
          </p>
        </div>
        <Link
          href={`/org/${orgSlug}/settings/goals` as Route}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          Set goals
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function GoalProgressSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 skeleton rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 skeleton rounded" />
          <div className="h-6 w-32 skeleton rounded" />
          <div className="h-3 w-40 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

export default GoalProgressRing;
