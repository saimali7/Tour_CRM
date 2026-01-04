"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAdjustMode } from "./adjust-mode-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  X,
  ChevronDown,
  ChevronUp,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface PendingChangesPanelProps {
  /** Callback when apply is clicked */
  onApply: () => void;
  /** Whether apply is in progress */
  isApplying?: boolean;
  /** Guide capacity info for impact calculation */
  guideCapacities?: Map<string, { current: number; capacity: number; name: string }>;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PendingChangesPanel({
  onApply,
  isApplying = false,
  guideCapacities,
  className,
}: PendingChangesPanelProps) {
  const {
    pendingChanges,
    hasPendingChanges,
    pendingChangesCount,
    removePendingChange,
    clearPendingChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    getPendingChangesSummary,
  } = useAdjustMode();

  const summary = useMemo(() => getPendingChangesSummary(), [getPendingChangesSummary]);

  // Calculate capacity impact
  const capacityStatus = useMemo(() => {
    if (!guideCapacities) return { hasWarning: false, hasError: false, details: [] };

    const details: Array<{
      guideName: string;
      currentGuests: number;
      newGuests: number;
      capacity: number;
      status: "ok" | "warning" | "over";
    }> = [];

    let hasWarning = false;
    let hasError = false;

    for (const [guideId, impact] of summary.impactByGuide) {
      const capacityInfo = guideCapacities.get(guideId);
      if (capacityInfo) {
        const newGuests = capacityInfo.current + impact.guestDelta;
        const utilization = (newGuests / capacityInfo.capacity) * 100;

        let status: "ok" | "warning" | "over" = "ok";
        if (newGuests > capacityInfo.capacity) {
          status = "over";
          hasError = true;
        } else if (utilization >= 90) {
          status = "warning";
          hasWarning = true;
        }

        details.push({
          guideName: impact.guideName,
          currentGuests: capacityInfo.current,
          newGuests,
          capacity: capacityInfo.capacity,
          status,
        });
      }
    }

    return { hasWarning, hasError, details };
  }, [summary.impactByGuide, guideCapacities]);

  if (!hasPendingChanges) {
    return null;
  }

  return (
    <div
      className={cn(
        "border rounded-lg bg-card shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {pendingChangesCount} {pendingChangesCount === 1 ? "change" : "changes"}
          </Badge>
          {capacityStatus.hasError && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Capacity exceeded for some guides</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Undo/Redo buttons */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo (Cmd+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Undo <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px]">⌘Z</kbd>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo (Cmd+Shift+Z)"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Redo <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px]">⇧⌘Z</kbd>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={clearPendingChanges}
                  aria-label="Clear all changes"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Clear all changes
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Changes List */}
      <div className="max-h-[200px] overflow-y-auto">
        <div className="divide-y divide-border/50">
          {/* Assignments from hopper */}
          {summary.assignments.map((assign) => (
            <div
              key={assign.id}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30 group"
            >
              {/* Zone color indicator */}
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{
                  backgroundColor: assign.pickupZone?.color || "#6B7280",
                }}
              />

              {/* Customer info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">
                    {assign.customerName}
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {assign.guestCount}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{assign.tourTime}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span className="text-foreground">{assign.toGuideName}</span>
                </div>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => removePendingChange(assign.id)}
                aria-label={`Remove ${assign.customerName} assignment`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Reassignments */}
          {summary.reassignments.map((reassign) => (
            <div
              key={reassign.id}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30 group"
            >
              {/* Reassign indicator */}
              <div className="w-1 h-6 rounded-full shrink-0 bg-amber-500" />

              {/* Reassign info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Reassign</span>
                  {reassign.bookingCount > 1 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {reassign.bookingCount} bookings
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span className="text-foreground">
                    {reassign.toGuideName || "Guide"}
                  </span>
                </div>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => removePendingChange(reassign.id)}
                aria-label="Remove reassignment"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Impact Summary */}
      {capacityStatus.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-1.5 text-xs border-t hover:bg-muted/30">
              <span className="text-muted-foreground">Impact Summary</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2 border-t bg-muted/20">
              {capacityStatus.details.map((detail, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="text-muted-foreground">{detail.guideName}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "font-mono",
                        detail.status === "over" && "text-destructive",
                        detail.status === "warning" && "text-amber-500"
                      )}
                    >
                      {detail.currentGuests} → {detail.newGuests}
                    </span>
                    <span className="text-muted-foreground">/ {detail.capacity}</span>
                    {detail.status === "over" && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Apply Button */}
      <div className="px-3 py-2 border-t bg-muted/30">
        <Button
          className="w-full h-8"
          size="sm"
          onClick={onApply}
          disabled={isApplying || capacityStatus.hasError}
        >
          {isApplying ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Applying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply {pendingChangesCount} {pendingChangesCount === 1 ? "Change" : "Changes"}
            </>
          )}
        </Button>
        {capacityStatus.hasError && (
          <p className="text-[10px] text-destructive mt-1 text-center">
            Cannot apply: some guides would exceed capacity
          </p>
        )}
      </div>
    </div>
  );
}

PendingChangesPanel.displayName = "PendingChangesPanel";
