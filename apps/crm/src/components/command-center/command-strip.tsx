"use client";

import { format, isToday, isPast, startOfDay } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { WarningsPanel } from "./warnings-panel";
import type { DispatchWarning } from "./types";

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
  /** Warning rows for quick resolution */
  warnings: DispatchWarning[];
  /** Currently selected warning id */
  selectedWarningId?: string | null;
  /** Warning selection callback */
  onSelectWarning?: (warningId: string) => void;
  /** Resolve a warning suggestion */
  onResolveWarning?: (warningId: string, suggestionId: string) => void;
  /** Available guides for quick-assign suggestions */
  availableGuides?: Array<{
    id: string;
    name: string;
    vehicleCapacity: number;
    currentGuests: number;
  }>;
  /** When dispatch was sent */
  dispatchedAt?: Date;
  /** Tour runs for manifest access */
  tourRuns?: Array<{
    key: string;
    date: string;
    time: string;
    totalGuests: number;
    tour?: { id: string; name: string } | null;
  }>;
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
  warnings,
  selectedWarningId,
  onSelectWarning,
  onResolveWarning,
  availableGuides = [],
  dispatchedAt,
  tourRuns,
  onOptimize,
  onDispatch,
}: CommandStripProps) {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : undefined;

  const isDateToday = isToday(date);
  // Check if date is in the past (before today)
  const isPastDate = isPast(startOfDay(date)) && !isDateToday;
  const isDispatched = status === "dispatched";
  const hasUnassigned = unassignedCount > 0;
  const hasWarnings = warningsCount > 0;
  const hasBlockingIssues = hasUnassigned || hasWarnings;
  const manifestRuns = (tourRuns ?? []).filter((run) => run.tour?.id && run.time);

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
      accent: "bg-destructive",
      text: "text-foreground",
      icon: AlertCircle,
      iconColor: "text-destructive",
    },
    warning: {
      bg: "bg-card border-border",
      accent: "bg-warning",
      text: "text-foreground",
      icon: AlertCircle,
      iconColor: "text-warning",
    },
    ready: {
      bg: "bg-card border-border",
      accent: "bg-success",
      text: "text-foreground",
      icon: CheckCircle2,
      iconColor: "text-success",
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

      <div className="flex items-center justify-between gap-3 pl-3 pr-2 py-2">
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
        <div className="flex items-center gap-3">
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
                <span className="text-success dark:text-success font-medium">Ready to Dispatch</span>
              ) : (
                <span>Sent {dispatchedAt ? format(dispatchedAt, "HH:mm") : "--:--"}</span>
              )}
            </span>
          </div>

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
                <span className="text-[11px] text-muted-foreground">guests</span>
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
                    efficiencyScore >= 90 ? "text-success" :
                    efficiencyScore >= 70 ? "text-warning" :
                    "text-destructive"
                  )}>
                    {efficiencyScore}%
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasWarnings && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors",
                    selectedWarningId ? "border-warning/50 bg-warning/10 text-foreground" : "border-border bg-muted/25 text-muted-foreground",
                    "hover:bg-muted/40"
                  )}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  <span className="font-semibold tabular-nums">{warningsCount}</span>
                  <span className="hidden sm:inline">issues</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-[360px] p-2">
                <WarningsPanel
                  inline
                  warnings={warnings}
                  onResolve={(warningId, suggestionId) => onResolveWarning?.(warningId, suggestionId)}
                  selectedWarningId={selectedWarningId}
                  onSelectWarning={onSelectWarning}
                  availableGuides={availableGuides}
                />
              </PopoverContent>
            </Popover>
          )}
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  View Manifests
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-72 p-2">
                <div className="px-2 py-1 text-[11px] text-muted-foreground">
                  Open a tour run manifest
                </div>
                {manifestRuns.length === 0 || !slug ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No tour runs available.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {manifestRuns.map((run) => {
                      const href = {
                        pathname: `/org/${slug}/tour-run`,
                        query: {
                          tourId: run.tour?.id ?? "",
                          date: run.date,
                          time: run.time,
                        },
                      }
                      return (
                        <Link
                          key={run.key}
                          href={href}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md px-2 py-1.5",
                            "hover:bg-muted/60 transition-colors"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {run.tour?.name ?? "Tour"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {run.time}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {run.totalGuests} guests
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
                  className="h-8 gap-1.5 text-xs bg-success hover:bg-success"
                >
                  <Send className="h-3.5 w-3.5" />
                  Dispatch
                </Button>
              )}

              <span className={cn("hidden text-[11px] text-muted-foreground lg:inline", hasBlockingIssues && "text-warning")}>
                {hasBlockingIssues ? `${unassignedCount + warningsCount} blockers` : "Ready"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

CommandStrip.displayName = "CommandStrip";
