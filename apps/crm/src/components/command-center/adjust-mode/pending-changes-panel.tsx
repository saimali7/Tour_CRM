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

/** Segment time data for overlap checking */
interface SegmentTime {
  id: string;
  startTime: string;
  endTime: string;
  type: "tour" | "pickup";
}

/** Guide timeline for overlap validation */
interface GuideTimelineForValidation {
  guideId: string;
  guideName: string;
  segments: SegmentTime[];
}

interface PendingChangesPanelProps {
  /** Callback when apply is clicked */
  onApply: () => void;
  /** Whether apply is in progress */
  isApplying?: boolean;
  /** Guide capacity info for impact calculation */
  guideCapacities?: Map<string, { current: number; capacity: number; name: string }>;
  /** Guide timelines for overlap validation */
  guideTimelines?: GuideTimelineForValidation[];
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Convert HH:MM time to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Check if two time ranges overlap */
function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  // Overlap if one starts before the other ends AND ends after the other starts
  return s1 < e2 && e1 > s2;
}

/** Add minutes to HH:MM time string */
function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = timeToMinutes(time) + minutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface OverlapError {
  guideId: string;
  guideName: string;
  segment1: string;
  segment2: string;
  time1: string;
  time2: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PendingChangesPanel({
  onApply,
  isApplying = false,
  guideCapacities,
  guideTimelines,
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

  // Check for tour overlaps
  const overlapStatus = useMemo(() => {
    if (!guideTimelines) return { hasOverlap: false, errors: [] as OverlapError[] };

    const errors: OverlapError[] = [];

    // Build a map of guide -> segments (including pending changes)
    const guideSegmentsMap = new Map<string, Array<{ id: string; startTime: string; endTime: string; label: string }>>();

    // Initialize with existing timeline segments
    for (const timeline of guideTimelines) {
      const segments = timeline.segments
        .filter((s) => s.type === "tour" || s.type === "pickup")
        .map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          label: s.type === "tour" ? "Tour" : "Pickup",
        }));
      guideSegmentsMap.set(timeline.guideId, segments);
    }

    // Apply pending time shifts
    for (const change of pendingChanges) {
      if (change.type === "time-shift") {
        const segments = guideSegmentsMap.get(change.guideId);
        if (segments) {
          const segmentIdx = segments.findIndex((s) => s.id === change.segmentId);
          const existingSegment = segments[segmentIdx];
          if (segmentIdx !== -1 && existingSegment) {
            segments[segmentIdx] = {
              id: existingSegment.id,
              label: existingSegment.label,
              startTime: change.newStartTime,
              endTime: change.newEndTime,
            };
          }
        }
      }
    }

    // Add pending assignments
    for (const change of pendingChanges) {
      if (change.type === "assign") {
        const segments = guideSegmentsMap.get(change.toGuideId) || [];
        const tourDuration = change.bookingData.tourDurationMinutes || 120;
        segments.push({
          id: `pending_${change.bookingId}`,
          startTime: change.bookingData.tourTime,
          endTime: addMinutesToTime(change.bookingData.tourTime, tourDuration),
          label: change.bookingData.customerName,
        });
        guideSegmentsMap.set(change.toGuideId, segments);
      }
    }

    // Check each guide for overlaps
    for (const timeline of guideTimelines) {
      const segments = guideSegmentsMap.get(timeline.guideId) || [];

      // Compare each pair of segments
      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          const seg1 = segments[i];
          const seg2 = segments[j];

          // TypeScript safety: ensure both segments exist
          if (!seg1 || !seg2) continue;

          if (timesOverlap(seg1.startTime, seg1.endTime, seg2.startTime, seg2.endTime)) {
            errors.push({
              guideId: timeline.guideId,
              guideName: timeline.guideName,
              segment1: seg1.label,
              segment2: seg2.label,
              time1: `${seg1.startTime}-${seg1.endTime}`,
              time2: `${seg2.startTime}-${seg2.endTime}`,
            });
          }
        }
      }
    }

    return { hasOverlap: errors.length > 0, errors };
  }, [guideTimelines, pendingChanges]);

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
          {overlapStatus.hasOverlap && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Tours overlap - cannot save</TooltipContent>
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
          disabled={isApplying || capacityStatus.hasError || overlapStatus.hasOverlap}
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
        {overlapStatus.hasOverlap && (
          <p className="text-[10px] text-destructive mt-1 text-center">
            Cannot apply: tours overlap for {overlapStatus.errors[0]?.guideName}
          </p>
        )}
        {!overlapStatus.hasOverlap && capacityStatus.hasError && (
          <p className="text-[10px] text-destructive mt-1 text-center">
            Cannot apply: some guides would exceed capacity
          </p>
        )}
      </div>
    </div>
  );
}

PendingChangesPanel.displayName = "PendingChangesPanel";
