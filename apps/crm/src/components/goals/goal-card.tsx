"use client";

import { trpc } from "@/lib/trpc";
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  orgSlug: string;
  onAddGoal?: () => void;
}

const METRIC_LABELS = {
  revenue: "Revenue",
  bookings: "Bookings",
  capacity_utilization: "Capacity",
  new_customers: "New Customers",
} as const;

const METRIC_FORMATTERS = {
  revenue: (v: string) => `$${parseFloat(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  bookings: (v: string) => parseInt(v).toLocaleString(),
  capacity_utilization: (v: string) => `${parseFloat(v).toFixed(1)}%`,
  new_customers: (v: string) => parseInt(v).toLocaleString(),
} as const;

export function GoalCard({ orgSlug, onAddGoal }: GoalCardProps) {
  const { data: activeGoals, isLoading } = trpc.goal.getActive.useQuery();
  const { data: summary } = trpc.goal.getSummary.useQuery();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const hasGoals = activeGoals && activeGoals.length > 0;

  return (
    <div className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 rounded-xl border border-emerald-500/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-foreground">Goals</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddGoal} className="h-8 gap-1">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && hasGoals && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{summary.totalActive}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{summary.onTrack}</p>
            <p className="text-xs text-muted-foreground">On Track</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-orange-600">{summary.offTrack}</p>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
          </div>
        </div>
      )}

      {/* Goals List */}
      {hasGoals ? (
        <div className="space-y-3">
          {activeGoals.slice(0, 3).map((goal) => {
            const formatter = METRIC_FORMATTERS[goal.metricType];
            const targetFormatted = formatter(goal.targetValue);
            const currentFormatted = formatter(goal.currentValue || "0");

            return (
              <div
                key={goal.id}
                className="bg-background rounded-lg border border-border p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {METRIC_LABELS[goal.metricType]} • {goal.daysRemaining} days left
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                      goal.isOnTrack
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-orange-500/10 text-orange-600"
                    )}
                  >
                    {goal.isOnTrack ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        On Track
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        Behind
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentFormatted}</span>
                    <span>{targetFormatted}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        goal.isOnTrack ? "bg-emerald-500" : "bg-orange-500"
                      )}
                      style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {goal.progress.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}

          {activeGoals.length > 3 && (
            <Link
              href={`/org/${orgSlug}/settings/goals` as Route}
              className="block text-center text-xs text-primary hover:underline"
            >
              View all {activeGoals.length} goals
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground mb-3">
            No active goals set
          </p>
          <Button variant="outline" size="sm" onClick={onAddGoal}>
            <Plus className="h-4 w-4 mr-1" />
            Set Your First Goal
          </Button>
        </div>
      )}

      {/* Past Goals Summary */}
      {summary && (summary.completed > 0 || summary.missed > 0) && (
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {summary.completed > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                {summary.completed} completed
              </span>
            )}
            {summary.missed > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                {summary.missed} missed
              </span>
            )}
          </div>
          <Link
            href={`/org/${orgSlug}/settings/goals` as Route}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Manage goals
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
