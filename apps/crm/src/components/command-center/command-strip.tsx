"use client";

import { format } from "date-fns";
import { isToday, isTomorrow } from "date-fns";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronLeft,
  ChevronRight,
  Users,
  Car,
  Gauge,
  Lock,
  Sparkles,
  Undo2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DispatchStatus } from "./command-center";

// =============================================================================
// TYPES
// =============================================================================

interface CommandStripProps {
  /** Current date being viewed */
  date: Date;
  /** Formatted date string for display */
  formattedDate: string;
  /** Go to previous day */
  onPreviousDay: () => void;
  /** Go to next day */
  onNextDay: () => void;
  /** Go to today */
  onToday: () => void;
  /** Current dispatch status */
  status: DispatchStatus;
  /** Total guests for the day */
  totalGuests: number;
  /** Total guides assigned */
  totalGuides: number;
  /** Efficiency score 0-100 */
  efficiencyScore: number;
  /** Number of unassigned bookings */
  unassignedCount: number;
  /** Number of warnings */
  warningsCount: number;
  /** When dispatch was sent */
  dispatchedAt?: Date;
  /** Whether adjust mode is active */
  isAdjustMode: boolean;
  /** Number of pending changes in adjust mode */
  pendingChangesCount: number;
  /** Enter adjust mode */
  onEnterAdjustMode: () => void;
  /** Exit adjust mode */
  onExitAdjustMode: () => void;
  /** Apply adjust mode changes */
  onApplyChanges: () => void;
  /** Optimize assignments */
  onOptimize: () => void;
  /** Send dispatch */
  onDispatch: () => void;
  /** Whether changes are being applied */
  isApplying?: boolean;
}

// =============================================================================
// HELPER
// =============================================================================

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CommandStrip({
  date,
  formattedDate,
  onPreviousDay,
  onNextDay,
  onToday,
  status,
  totalGuests,
  totalGuides,
  efficiencyScore,
  unassignedCount,
  warningsCount,
  dispatchedAt,
  isAdjustMode,
  pendingChangesCount,
  onEnterAdjustMode,
  onExitAdjustMode,
  onApplyChanges,
  onOptimize,
  onDispatch,
  isApplying = false,
}: CommandStripProps) {
  const isDateToday = isToday(date);
  const isDateTomorrow = isTomorrow(date);
  const isDispatched = status === "dispatched";
  const hasUnassigned = unassignedCount > 0;
  const hasWarnings = warningsCount > 0;

  // Determine the health state
  type HealthState = "critical" | "warning" | "ready" | "dispatched";
  const healthState: HealthState = isDispatched
    ? "dispatched"
    : hasUnassigned
      ? "critical"
      : hasWarnings
        ? "warning"
        : "ready";

  const healthConfig = {
    critical: {
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-600 dark:text-red-400",
      icon: AlertTriangle,
      label: `${unassignedCount} ${pluralize(unassignedCount, "booking")} unassigned`,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
      label: `${warningsCount} ${pluralize(warningsCount, "issue")} to review`,
    },
    ready: {
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
      label: "Ready to dispatch",
    },
    dispatched: {
      bg: "bg-muted border-border",
      text: "text-muted-foreground",
      icon: Lock,
      label: `Sent at ${dispatchedAt ? format(dispatchedAt, "HH:mm") : "--:--"}`,
    },
  };

  const config = healthConfig[healthState];
  const HealthIcon = config.icon;

  return (
    <div className={cn(
      "rounded-md border transition-all duration-200",
      config.bg,
      // Adjust mode indicator - prominent border
      isAdjustMode && "ring-2 ring-primary/50 border-primary/50"
    )}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 min-w-[36px]"
            onClick={onPreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={onToday}
            disabled={isDateToday}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-colors min-h-[36px]",
              isDateToday
                ? "bg-primary/10 text-primary cursor-default"
                : isDateTomorrow
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                  : "hover:bg-muted"
            )}
          >
            {formattedDate}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 min-w-[36px]"
            onClick={onNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Health Status + Stats */}
        <div className="flex items-center gap-3">
          {/* Health Status Badge */}
          <div className={cn("flex items-center gap-1", config.text)}>
            <HealthIcon className={cn("h-3.5 w-3.5", healthState === "critical" && "animate-pulse")} />
            <span className="text-xs font-medium">{config.label}</span>
          </div>

          {/* Divider */}
          <div className="h-3 w-px bg-border" />

          {/* Stats - Compact */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    <span className="font-medium text-foreground tabular-nums">{totalGuests}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{totalGuests} {pluralize(totalGuests, "guest")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <Car className="h-3 w-3" />
                    <span className="font-medium text-foreground tabular-nums">{totalGuides}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{totalGuides} {pluralize(totalGuides, "guide")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <Gauge className="h-3 w-3" />
                    <span className={cn(
                      "font-medium tabular-nums",
                      efficiencyScore >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                      efficiencyScore >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                    )}>{efficiencyScore}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Efficiency</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Right: Primary Action */}
        <div className="flex items-center gap-2">
          {isAdjustMode ? (
            /* Adjust Mode Controls */
            <>
              {/* Adjust Mode Badge with keyboard hints */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs border-primary/50 text-primary bg-primary/5 animate-pulse"
                >
                  Editing
                </Badge>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
                        <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] border border-border/50">⌘Z</kbd>
                        <span>undo</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border">⌘Z</kbd>
                          <span>Undo change</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border">⇧⌘Z</kbd>
                          <span>Redo change</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onExitAdjustMode}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onApplyChanges}
                disabled={pendingChangesCount === 0 || isApplying}
                className="h-8 gap-1.5 text-xs bg-primary relative"
              >
                <Save className="h-3.5 w-3.5" />
                {isApplying ? "Saving..." : "Save Changes"}
                {pendingChangesCount > 0 && !isApplying && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white border-2 border-background"
                  >
                    {pendingChangesCount}
                  </Badge>
                )}
              </Button>
            </>
          ) : isDispatched ? (
            /* Dispatched State */
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">View Manifests</Button>
          ) : hasUnassigned ? (
            /* Need to Assign */
            <>
              <Button variant="outline" size="sm" onClick={onEnterAdjustMode} className="h-8 gap-1.5 text-xs">
                Manual
              </Button>
              <Button size="sm" onClick={onOptimize} className="h-8 gap-1.5 text-xs bg-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Assign
              </Button>
            </>
          ) : hasWarnings ? (
            /* Has Warnings */
            <>
              <Button variant="outline" size="sm" onClick={onEnterAdjustMode} className="h-8 text-xs">Adjust</Button>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button size="sm" disabled className="h-8 gap-1.5 text-xs pointer-events-none">
                        <Send className="h-3.5 w-3.5" />
                        Dispatch
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Resolve {warningsCount} {pluralize(warningsCount, "issue")} first</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            /* Ready to Dispatch */
            <>
              <Button variant="outline" size="sm" onClick={onEnterAdjustMode} className="h-8 text-xs">Adjust</Button>
              <Button size="sm" onClick={onDispatch} className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
                <Send className="h-3.5 w-3.5" />
                Dispatch
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

CommandStrip.displayName = "CommandStrip";
