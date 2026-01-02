"use client";

import { format } from "date-fns";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Settings,
  RefreshCw,
  Lock,
  Users,
  Clock,
  Gauge,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DispatchStatus } from "./command-center";

interface StatusBannerProps {
  status: DispatchStatus;
  totalGuests: number;
  totalGuides: number;
  totalDriveMinutes: number;
  efficiencyScore: number;
  warningsCount: number;
  dispatchedAt?: Date;
  onAdjust: () => void;
  onOptimize: () => void;
  onDispatch: () => void;
  /** Slot for rendering the adjust mode toggle */
  adjustModeSlot?: ReactNode;
  /** Whether adjust mode is currently active */
  isAdjustMode?: boolean;
}

export function StatusBanner({
  status,
  totalGuests,
  totalGuides,
  totalDriveMinutes,
  efficiencyScore,
  warningsCount,
  dispatchedAt,
  onAdjust,
  onOptimize,
  onDispatch,
  adjustModeSlot,
  isAdjustMode = false,
}: StatusBannerProps) {
  // Status-based styling
  const statusConfig = {
    pending: {
      icon: RefreshCw,
      label: "PENDING OPTIMIZATION",
      bgClass: "bg-muted border-muted-foreground/20",
      textClass: "text-muted-foreground",
      iconClass: "text-muted-foreground animate-spin",
    },
    optimized: {
      icon: CheckCircle2,
      label: "OPTIMIZED",
      bgClass: "bg-emerald-500/10 border-emerald-500/30",
      textClass: "text-emerald-600 dark:text-emerald-400",
      iconClass: "text-emerald-500",
    },
    needs_review: {
      icon: AlertTriangle,
      label: `NEEDS REVIEW (${warningsCount} ${warningsCount === 1 ? "issue" : "issues"})`,
      bgClass: "bg-amber-500/10 border-amber-500/30",
      textClass: "text-amber-600 dark:text-amber-400",
      iconClass: "text-amber-500",
    },
    ready: {
      icon: CheckCircle2,
      label: "READY TO DISPATCH",
      bgClass: "bg-emerald-500/10 border-emerald-500/30",
      textClass: "text-emerald-600 dark:text-emerald-400",
      iconClass: "text-emerald-500",
    },
    dispatched: {
      icon: Lock,
      label: `DISPATCHED AT ${dispatchedAt ? format(dispatchedAt, "HH:mm") : "--:--"}`,
      bgClass: "bg-muted border-muted-foreground/20",
      textClass: "text-muted-foreground",
      iconClass: "text-muted-foreground",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isDispatched = status === "dispatched";
  const isReady = status === "ready";
  const needsReview = status === "needs_review";

  return (
    <div className={cn("rounded-lg border p-4", config.bgClass)}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Status and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", config.iconClass)} />
            <span className={cn("font-semibold text-sm uppercase tracking-wide", config.textClass)}>
              {config.label}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground tabular-nums">{totalGuests}</span>
              <span>guests</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <div className="flex items-center gap-1.5">
              <Car className="h-4 w-4" />
              <span className="font-medium text-foreground tabular-nums">{totalGuides}</span>
              <span>guides</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-foreground tabular-nums">{totalDriveMinutes}</span>
              <span>min driving</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4" />
              <span className={cn(
                "font-medium tabular-nums",
                efficiencyScore >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : efficiencyScore >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              )}>
                {efficiencyScore}%
              </span>
              <span>efficiency</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isAdjustMode ? (
            // Adjust Mode - show the adjust mode controls
            adjustModeSlot
          ) : isDispatched ? (
            // Dispatched - show manifest and undo buttons
            <>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="h-4 w-4" />
                View Manifests
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                Undo Dispatch
              </Button>
            </>
          ) : (
            // Normal Mode - show adjust, optimize, dispatch buttons
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onAdjust}
                className="gap-1.5"
              >
                <Settings className="h-4 w-4" />
                Adjust
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOptimize}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Optimize
              </Button>
              <Button
                size="sm"
                onClick={onDispatch}
                disabled={needsReview}
                className={cn(
                  "gap-1.5",
                  isReady && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <Send className="h-4 w-4" />
                {isReady ? "Send to All Guides" : "Dispatch"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Ready state subtitle */}
      {isReady && (
        <p className="text-xs text-muted-foreground mt-3 text-center sm:text-left">
          Manifests will be sent via WhatsApp and Email to all assigned guides.
        </p>
      )}
    </div>
  );
}
