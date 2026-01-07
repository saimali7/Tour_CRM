"use client";

import { format, isToday, isPast, startOfDay } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Users,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DispatchStatus } from "./types";

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
  /** Optimize assignments */
  onOptimize: () => void;
  /** Send dispatch */
  onDispatch: () => void;
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
  onOptimize,
  onDispatch,
}: CommandStripProps) {
  const isDateToday = isToday(date);
  // Check if date is in the past (before today)
  const isPastDate = isPast(startOfDay(date)) && !isDateToday;
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
      bg: "bg-card border-border",
      accent: "bg-red-500",
      text: "text-foreground",
      icon: AlertCircle,
      iconColor: "text-red-500",
    },
    warning: {
      bg: "bg-card border-border",
      accent: "bg-amber-500",
      text: "text-foreground",
      icon: AlertCircle,
      iconColor: "text-amber-500",
    },
    ready: {
      bg: "bg-card border-border",
      accent: "bg-emerald-500",
      text: "text-foreground",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
    },
    dispatched: {
      bg: "bg-card border-border",
      accent: "bg-muted-foreground/50",
      text: "text-muted-foreground",
      icon: Lock,
      iconColor: "text-muted-foreground",
    },
  };

  const config = healthConfig[healthState];
  const HealthIcon = config.icon;

  return (
    <div className={cn(
      "relative rounded-lg border overflow-hidden transition-all duration-200",
      config.bg
    )}>
      {/* Left accent bar - status indicator */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors",
        config.accent
      )} />

      <div className="flex items-center justify-between gap-4 pl-4 pr-3 py-2">
        {/* Left: Date Navigation - compact */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={onToday}
            disabled={isDateToday}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors",
              isDateToday
                ? "bg-primary/10 text-primary cursor-default"
                : "hover:bg-muted"
            )}
          >
            {formattedDate}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Status + Stats - clean and minimal */}
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <HealthIcon className={cn("h-4 w-4", config.iconColor)} />
            <span className={cn("text-sm", config.text)}>
              {healthState === "critical" ? (
                <span>
                  <span className="font-semibold tabular-nums">{unassignedCount}</span>
                  <span className="text-muted-foreground ml-1">unassigned</span>
                </span>
              ) : healthState === "warning" ? (
                <span>
                  <span className="font-semibold tabular-nums">{warningsCount}</span>
                  <span className="text-muted-foreground ml-1">{pluralize(warningsCount, "issue")}</span>
                </span>
              ) : healthState === "ready" ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
              ) : (
                <span>Sent {dispatchedAt ? format(dispatchedAt, "HH:mm") : "--:--"}</span>
              )}
            </span>
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-border" />

          {/* Guest count - expandable */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  "hover:text-foreground transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                )}
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums font-medium">{totalGuests}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-44 p-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="font-medium tabular-nums">{totalGuests}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guides</span>
                  <span className="font-medium tabular-nums">{totalGuides}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Efficiency</span>
                  <span className={cn(
                    "font-medium tabular-nums",
                    efficiencyScore >= 90 ? "text-emerald-500" :
                    efficiencyScore >= 70 ? "text-amber-500" :
                    "text-red-500"
                  )}>
                    {efficiencyScore}%
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isPastDate ? (
            /* Past date - read-only mode */
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">View Only</span>
            </div>
          ) : isDispatched ? (
            <Button variant="outline" size="sm" className="h-8 text-xs">
              View Manifests
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {hasUnassigned ? (
                <Button size="sm" onClick={onOptimize} className="h-8 gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Assign
                </Button>
              ) : hasWarnings ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button size="sm" disabled className="h-8 gap-1.5 text-xs">
                          <Send className="h-3.5 w-3.5" />
                          Dispatch
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Resolve issues first
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  size="sm"
                  onClick={onDispatch}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-3.5 w-3.5" />
                  Dispatch
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

CommandStrip.displayName = "CommandStrip";
