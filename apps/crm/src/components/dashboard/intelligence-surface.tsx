"use client";

import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface IntelligenceSurfaceProps {
  orgSlug: string;
}

export function IntelligenceSurface({ orgSlug }: IntelligenceSurfaceProps) {
  const { data: forecasting, isLoading: forecastingLoading } =
    trpc.analytics.getRevenueForecasting.useQuery();

  const { data: insights, isLoading: insightsLoading } =
    trpc.analytics.getProactiveInsights.useQuery();

  if (forecastingLoading || insightsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4" />
          <div className="h-20 bg-muted rounded mb-4" />
          <div className="h-12 bg-muted rounded" />
        </div>
        <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Intelligence Surface</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecasting Card */}
        <div className="card-info rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Revenue Forecast
              </h3>
            </div>
            {forecasting && (
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  forecasting.currentMonth.confidence === "high"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : forecasting.currentMonth.confidence === "medium"
                    ? "bg-orange-500/10 text-orange-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {forecasting.currentMonth.confidence} confidence
              </span>
            )}
          </div>

          {forecasting && (
            <>
              <div className="mb-4">
                <p className="text-3xl font-bold text-foreground">
                  ${forecasting.currentMonth.projectedRevenue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  projected for {forecasting.currentMonth.name}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    ${forecasting.currentMonth.revenueToDate.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    earned
                  </span>
                  <span>
                    {forecasting.currentMonth.daysElapsed} of{" "}
                    {forecasting.currentMonth.daysElapsed + forecasting.currentMonth.daysRemaining}{" "}
                    days
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${
                        (forecasting.currentMonth.daysElapsed /
                          (forecasting.currentMonth.daysElapsed +
                            forecasting.currentMonth.daysRemaining)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Comparisons */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">
                    vs {forecasting.comparison.lastMonth.name}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    ${forecasting.comparison.lastMonth.totalRevenue.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                {forecasting.comparison.sameMonthLastYear && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      vs {forecasting.comparison.sameMonthLastYear.name}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium flex items-center gap-1",
                        forecasting.comparison.sameMonthLastYear.percentChange >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      )}
                    >
                      {forecasting.comparison.sameMonthLastYear.percentChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(forecasting.comparison.sameMonthLastYear.percentChange)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Weekly trend mini chart */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Weekly trend</p>
                <div className="flex items-end gap-1 h-12">
                  {forecasting.weeklyTrend.map((week, idx) => {
                    const maxRevenue = Math.max(...forecasting.weeklyTrend.map((w) => w.revenue));
                    const height = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "w-full rounded-t",
                            idx === forecasting.weeklyTrend.length - 1
                              ? "bg-primary"
                              : "bg-muted"
                          )}
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {week.weekLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Proactive Insights Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Proactive Insights
            </h3>
          </div>

          {insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    insight.type === "warning" && "bg-warning-subtle border-warning-subtle",
                    insight.type === "opportunity" && "bg-info-subtle border-info-subtle",
                    insight.type === "success" && "bg-success-subtle border-success-subtle",
                    insight.type === "info" && "bg-muted border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-1.5 rounded-md",
                          insight.type === "warning" && "bg-muted",
                          insight.type === "opportunity" && "bg-muted",
                          insight.type === "success" && "bg-muted",
                          insight.type === "info" && "bg-muted"
                        )}
                      >
                        {insight.type === "warning" && (
                          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        )}
                        {insight.type === "opportunity" && (
                          <Lightbulb className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        )}
                        {insight.type === "success" && (
                          <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        )}
                        {insight.type === "info" && (
                          <Target className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {insight.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    {insight.metric && (
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            insight.metric.trend === "up" && "text-emerald-600",
                            insight.metric.trend === "down" && "text-red-600",
                            !insight.metric.trend && "text-foreground"
                          )}
                        >
                          {insight.metric.value}
                        </p>
                      </div>
                    )}
                  </div>
                  {insight.action && (
                    <Link
                      href={`/org/${orgSlug}${insight.action.href}` as Route}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {insight.action.label}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No insights to show at the moment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
