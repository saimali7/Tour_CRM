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
  Lock,
  Sparkles,
  Undo2,
  Redo2,
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
  date: Date;
  formattedDate: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  status: DispatchStatus;
  totalGuests: number;
  totalGuides: number;
  efficiencyScore: number;
  unassignedCount: number;
  warningsCount: number;
  warnings: DispatchWarning[];
  selectedWarningId?: string | null;
  onSelectWarning?: (warningId: string) => void;
  onResolveWarning?: (warningId: string, suggestionId: string) => void;
  availableGuides?: Array<{
    id: string;
    name: string;
    vehicleCapacity: number;
    currentGuests: number;
  }>;
  dispatchedAt?: Date;
  tourRuns?: Array<{
    key: string;
    date: string;
    time: string;
    totalGuests: number;
    tour?: { id: string; name: string } | null;
  }>;
  onOptimize: () => void;
  onDispatch: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isMutating: boolean;
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isMutating,
}: CommandStripProps) {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : undefined;

  const isDateToday = isToday(date);
  const isPastDate = isPast(startOfDay(date)) && !isDateToday;
  const isDispatched = status === "dispatched";
  const isReadOnly = isPastDate || isDispatched;
  const hasUnassigned = unassignedCount > 0;
  const hasWarnings = warningsCount > 0;
  const manifestRuns = (tourRuns ?? []).filter((run) => run.tour?.id && run.time);

  type HealthState = "critical" | "warning" | "ready" | "dispatched";
  const healthState: HealthState = isDispatched
    ? "dispatched"
    : hasUnassigned
      ? "critical"
      : hasWarnings
        ? "warning"
        : "ready";

  const borderColor = {
    critical: "border-b-destructive",
    warning: "border-b-warning",
    ready: "border-b-success",
    dispatched: "border-b-muted-foreground/50",
  }[healthState];

  const healthIcon = {
    critical: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
    warning: <AlertCircle className="h-3.5 w-3.5 text-warning" />,
    ready: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    dispatched: <Lock className="h-3.5 w-3.5 text-muted-foreground" />,
  }[healthState];

  return (
    <div className={cn(
      "relative rounded-md border border-b-2 bg-card overflow-hidden transition-all duration-200",
      borderColor,
      isPastDate && "opacity-60"
    )}>
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <button
            onClick={onToday}
            disabled={isDateToday}
            className={cn(
              "px-2.5 py-1 rounded-md text-sm font-semibold transition-colors",
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
            className="h-7 w-7"
            onClick={onNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Center: Status + Inline Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            {healthIcon}
            <span className="text-foreground">
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
                <span className="text-success font-medium">Ready</span>
              ) : (
                <span className="text-muted-foreground">Sent {dispatchedAt ? format(dispatchedAt, "HH:mm") : "--:--"}</span>
              )}
            </span>
          </div>

          <span className="hidden text-muted-foreground/40 sm:inline">|</span>

          <div className="hidden items-center gap-2.5 text-muted-foreground sm:flex">
            <span className="tabular-nums"><span className="font-medium text-foreground">{totalGuests}</span> guests</span>
            <span className="tabular-nums"><span className="font-medium text-foreground">{totalGuides}</span> guides</span>
            <span className={cn(
              "tabular-nums font-medium",
              efficiencyScore >= 90 ? "text-success" :
              efficiencyScore >= 70 ? "text-warning" :
              "text-destructive"
            )}>
              {efficiencyScore}%
            </span>
          </div>

          {hasWarnings && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
                    selectedWarningId ? "border-warning/50 bg-warning/10 text-foreground" : "border-border bg-muted/25 text-muted-foreground",
                    "hover:bg-muted/40"
                  )}
                >
                  <AlertCircle className="h-3 w-3 text-warning" />
                  <span className="font-semibold tabular-nums">{warningsCount}</span>
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

        {/* Right: Undo/Redo + Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onUndo}
            disabled={!canUndo || isMutating || isReadOnly}
            aria-label="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRedo}
            disabled={!canRedo || isMutating || isReadOnly}
            aria-label="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          {isDispatched ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px]">
                  Manifests
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
          ) : !isPastDate && (
            <>
              {hasUnassigned ? (
                <Button size="sm" onClick={onOptimize} className="h-7 gap-1.5 text-[11px]">
                  <Sparkles className="h-3 w-3" />
                  Auto-Assign
                </Button>
              ) : hasWarnings ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button size="sm" disabled className="h-7 gap-1.5 text-[11px]">
                          <Send className="h-3 w-3" />
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
                  className="h-7 gap-1.5 text-[11px] bg-success hover:bg-success"
                >
                  <Send className="h-3 w-3" />
                  Dispatch
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

CommandStrip.displayName = "CommandStrip";
