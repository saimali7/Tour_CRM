"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Info,
  ChevronRight,
  Zap,
  Users,
  Calendar,
  DollarSign,
  Minus,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ProactiveInsight {
  id: string;
  type: "opportunity" | "warning" | "info" | "success";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  metric?: {
    value: string;
    trend?: "up" | "down" | "stable";
  };
}

// =============================================================================
// STYLING CONFIGURATION
// =============================================================================

const typeConfig = {
  warning: {
    cardClass: "card-warning",
    icon: AlertTriangle,
    iconColor: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    label: "Needs Attention",
  },
  opportunity: {
    cardClass: "card-info",
    icon: Zap,
    iconColor: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    label: "Opportunity",
  },
  success: {
    cardClass: "card-success",
    icon: CheckCircle2,
    iconColor: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    label: "On Track",
  },
  info: {
    cardClass: "card-muted",
    icon: Info,
    iconColor: "text-slate-700 dark:text-slate-400",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    label: "Info",
  },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface SmartAlertsPanelProps {
  className?: string;
  maxAlerts?: number;
  showSuccessAlerts?: boolean;
}

export function SmartAlertsPanel({
  className,
  maxAlerts = 5,
  showSuccessAlerts = false,
}: SmartAlertsPanelProps) {
  const { data: insights, isLoading } = trpc.analytics.getProactiveInsights.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  if (isLoading) {
    return <SmartAlertsSkeleton />;
  }

  if (!insights || insights.length === 0) {
    return <AllClearState />;
  }

  // Filter and sort alerts by priority
  const sortedAlerts = [...insights]
    .filter((insight) => showSuccessAlerts || insight.type !== "success")
    .sort((a, b) => {
      const priority = { warning: 0, opportunity: 1, info: 2, success: 3 };
      return priority[a.type] - priority[b.type];
    })
    .slice(0, maxAlerts);

  // Group by type for visual organization
  const criticalAlerts = sortedAlerts.filter((a) => a.type === "warning");
  const opportunityAlerts = sortedAlerts.filter((a) => a.type === "opportunity");
  const infoAlerts = sortedAlerts.filter((a) => a.type === "info");
  const successAlerts = sortedAlerts.filter((a) => a.type === "success");

  const hasAnyAlerts = sortedAlerts.length > 0;

  if (!hasAnyAlerts) {
    return <AllClearState />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Critical / Warning Alerts */}
      {criticalAlerts.length > 0 && (
        <AlertGroup
          title={`${criticalAlerts.length} ${criticalAlerts.length === 1 ? "issue needs" : "issues need"} attention`}
          alerts={criticalAlerts}
          variant="warning"
        />
      )}

      {/* Opportunity Alerts */}
      {opportunityAlerts.length > 0 && (
        <AlertGroup
          title={`${opportunityAlerts.length} ${opportunityAlerts.length === 1 ? "opportunity" : "opportunities"}`}
          alerts={opportunityAlerts}
          variant="opportunity"
        />
      )}

      {/* Info Alerts */}
      {infoAlerts.length > 0 && (
        <AlertGroup
          title="Insights"
          alerts={infoAlerts}
          variant="info"
        />
      )}

      {/* Success Alerts (if enabled) */}
      {showSuccessAlerts && successAlerts.length > 0 && (
        <AlertGroup
          title="Looking good"
          alerts={successAlerts}
          variant="success"
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function AlertGroup({
  title,
  alerts,
  variant,
}: {
  title: string;
  alerts: ProactiveInsight[];
  variant: keyof typeof typeConfig;
}) {
  const config = typeConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        config.cardClass
      )}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-inherit flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.iconColor)} />
        <span className={cn("text-sm font-semibold", config.iconColor)}>
          {title}
        </span>
      </div>

      {/* Alert Items */}
      <div className="divide-y divide-inherit">
        {alerts.map((alert, idx) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

function AlertItem({ alert, index }: { alert: ProactiveInsight; index: number }) {
  const config = typeConfig[alert.type];
  const TrendIcon = alert.metric?.trend ? trendIcons[alert.metric.trend] : null;

  return (
    <div
      className="px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {alert.description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Metric Badge */}
          {alert.metric && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                config.badge
              )}
            >
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span>{alert.metric.value}</span>
            </div>
          )}

          {/* Action Link */}
          {alert.action && (
            <Link
              href={alert.action.href as Route}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30",
                "border border-inherit"
              )}
            >
              {alert.action.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function AllClearState() {
  return (
    <div className="flex items-center gap-3 rounded-xl card-success px-4 py-4">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          All systems operational
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          No urgent issues or opportunities requiring attention
        </p>
      </div>
    </div>
  );
}

function SmartAlertsSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 skeleton rounded" />
        <div className="h-4 w-32 skeleton rounded" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-3/4 skeleton rounded" />
          <div className="h-3 w-1/2 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

export default SmartAlertsPanel;
