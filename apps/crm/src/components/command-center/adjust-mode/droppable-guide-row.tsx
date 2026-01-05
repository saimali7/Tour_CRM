"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAdjustMode } from "./adjust-mode-context";
import { useGhostPreview } from "./ghost-preview-context";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import type { ReactNode } from "react";

// Import centralized types
import {
  type ActiveDragData,
  type DroppableGuideRowData,
  isSegmentDrag,
  isHopperBookingDrag,
} from "./types";

// Re-export for backward compatibility
export type { DroppableGuideRowData } from "./types";

interface DroppableGuideRowProps {
  /** Unique ID for this row (to avoid collision when same guide appears multiple times) */
  rowId: string;
  /** ID of the guide this row represents */
  guideId: string;
  /** Name of the guide (for accessibility) */
  guideName: string;
  /** Vehicle capacity for validation hints */
  vehicleCapacity: number;
  /** Current guest count for this guide */
  currentGuests?: number;
  /** Index of this row in the timelines array */
  timelineIndex: number;
  /** Content to render inside the droppable area */
  children: ReactNode;
  /** Width of the guide info column in pixels (for positioning ghost preview) */
  guideColumnWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

type CapacityStatus = "ok" | "warning" | "over";

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Wrapper component that makes a guide row a valid drop target
 *
 * Provides visual feedback when a draggable segment is hovering over.
 * Shows drop indicator only when dragging from a different guide.
 * Shows real-time capacity validation during drag.
 */
export function DroppableGuideRow({
  rowId,
  guideId,
  guideName,
  vehicleCapacity,
  currentGuests = 0,
  timelineIndex,
  children,
  guideColumnWidth = 200,
  className,
}: DroppableGuideRowProps) {
  const { isAdjustMode } = useAdjustMode();
  const { ghostPreview } = useGhostPreview();

  const { setNodeRef, isOver, active } = useDroppable({
    id: `guide-row-${rowId}`,
    data: {
      type: "guide-row",
      guideId,
      guideName,
      vehicleCapacity,
      timelineIndex,
    } satisfies DroppableGuideRowData,
    disabled: !isAdjustMode,
  });

  // Extract data from active draggable
  const activeData = active?.data?.current as ActiveDragData | undefined;

  // Determine drop validity based on drag type
  // For hopper bookings: always valid (no source guide)
  // For segments: only valid if from a different guide
  const { isHopperDrag, isSegmentDragType, sourceGuideId } = useMemo(() => {
    if (!activeData) {
      return { isHopperDrag: false, isSegmentDragType: false, sourceGuideId: undefined };
    }
    if (isHopperBookingDrag(activeData)) {
      return { isHopperDrag: true, isSegmentDragType: false, sourceGuideId: undefined };
    }
    if (isSegmentDrag(activeData)) {
      return { isHopperDrag: false, isSegmentDragType: true, sourceGuideId: activeData.guideId };
    }
    return { isHopperDrag: false, isSegmentDragType: false, sourceGuideId: undefined };
  }, [activeData]);

  const isDifferentGuide = isSegmentDragType && sourceGuideId !== guideId;
  const isValidDropTarget = isHopperDrag || isDifferentGuide;

  // Calculate capacity status when hovering with a booking
  const capacityStatus = useMemo((): {
    status: CapacityStatus;
    newTotal: number;
    utilization: number;
    guestCount: number;
  } | null => {
    if (!isOver || !activeData) return null;

    // Get guest count from the dragged item (using type guards for type narrowing)
    let guestCount = 0;
    if (isHopperBookingDrag(activeData)) {
      guestCount = activeData.booking.guestCount;
    } else if (isSegmentDrag(activeData)) {
      // Use guestCount from segment data (available for pickup and tour segments)
      guestCount = activeData.guestCount ?? 0;
    }

    const newTotal = currentGuests + guestCount;
    const utilization = vehicleCapacity > 0 ? (newTotal / vehicleCapacity) * 100 : 0;

    let status: CapacityStatus = "ok";
    if (newTotal > vehicleCapacity) {
      status = "over";
    } else if (utilization >= 90) {
      status = "warning";
    }

    return { status, newTotal, utilization, guestCount };
  }, [isOver, activeData, currentGuests, vehicleCapacity]);

  const showDropIndicator = isAdjustMode && isOver && isValidDropTarget;
  const showPotentialDrop = isAdjustMode && active && isValidDropTarget && !isOver;

  // Determine drop indicator color based on capacity
  const dropIndicatorColor = useMemo(() => {
    if (!capacityStatus) return "border-primary/50";
    switch (capacityStatus.status) {
      case "over":
        return "border-destructive/70";
      case "warning":
        return "border-amber-500/70";
      default:
        return "border-emerald-500/70";
    }
  }, [capacityStatus]);

  const dropBadgeColor = useMemo(() => {
    if (!capacityStatus) return "bg-primary text-primary-foreground";
    switch (capacityStatus.status) {
      case "over":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-amber-500 text-white";
      default:
        return "bg-emerald-500 text-white";
    }
  }, [capacityStatus]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-150",
        // Highlight when can receive drop
        showDropIndicator && capacityStatus?.status === "ok" && "bg-emerald-500/5",
        showDropIndicator && capacityStatus?.status === "warning" && "bg-amber-500/5",
        showDropIndicator && capacityStatus?.status === "over" && "bg-destructive/5",
        // Subtle highlight when drag is active and this is a valid target
        showPotentialDrop && "bg-muted/30",
        className
      )}
      aria-label={showDropIndicator ? `Drop to assign to ${guideName}` : undefined}
    >
      {/* Drop Indicator Border */}
      {showDropIndicator && (
        <div
          className={cn(
            "absolute inset-0 z-20 pointer-events-none",
            "border-2 border-dashed rounded-lg",
            dropIndicatorColor
          )}
          aria-hidden="true"
        />
      )}

      {/* Capacity Status Badge - shown during hover */}
      {showDropIndicator && capacityStatus && capacityStatus.guestCount > 0 && (
        <div
          className={cn(
            "absolute right-2 top-1 z-30",
            "pointer-events-none"
          )}
        >
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-medium gap-1",
              capacityStatus.status === "over" && "bg-destructive/10 text-destructive border-destructive/30",
              capacityStatus.status === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
              capacityStatus.status === "ok" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            )}
          >
            {capacityStatus.status === "over" ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                Over Capacity!
              </>
            ) : capacityStatus.status === "warning" ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                {Math.round(capacityStatus.utilization)}% Full
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                {currentGuests + capacityStatus.guestCount}/{vehicleCapacity}
              </>
            )}
          </Badge>
        </div>
      )}

      {/* Drop Hint Badge */}
      {showDropIndicator && (
        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-30",
            "flex items-center gap-1.5",
            "px-2.5 py-1 rounded-full",
            "text-xs font-medium",
            "shadow-sm",
            "pointer-events-none",
            dropBadgeColor
          )}
        >
          <ArrowRight className="h-3 w-3" />
          <span>
            {capacityStatus?.status === "over"
              ? "Over Capacity"
              : `Assign to ${guideName.split(" ")[0]}`}
          </span>
        </div>
      )}

      {/* Ghost Preview Segment - shows where the booking will land */}
      {showDropIndicator && ghostPreview.targetTime && (
        <div
          className="absolute pointer-events-none z-15"
          style={{
            left: `calc(${guideColumnWidth}px + ${ghostPreview.targetTime.percent}%)`,
            width: `${ghostPreview.targetTime.widthPercent}%`,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          aria-hidden="true"
        >
          <GhostSegment
            displayTime={ghostPreview.targetTime.displayTime}
            customerName={ghostPreview.source?.customerName}
            guestCount={ghostPreview.source?.guestCount}
            zoneColor={ghostPreview.source?.pickupZone?.color}
            isSegment={ghostPreview.source?.type === "segment"}
          />
        </div>
      )}

      {/* Row Content */}
      {children}
    </div>
  );
}

DroppableGuideRow.displayName = "DroppableGuideRow";

// =============================================================================
// GHOST SEGMENT COMPONENT
// =============================================================================

interface GhostSegmentProps {
  displayTime: string;
  customerName?: string;
  guestCount?: number;
  zoneColor?: string;
  isSegment?: boolean;
}

/**
 * Translucent preview segment showing where the booking will land
 */
function GhostSegment({
  displayTime,
  customerName,
  guestCount,
  zoneColor = "#6B7280",
  isSegment = false,
}: GhostSegmentProps) {
  return (
    <div
      className={cn(
        "relative h-10 rounded-md",
        "border-2 border-dashed",
        "flex items-center justify-between px-2",
        "transition-all duration-150",
        "animate-pulse"
      )}
      style={{
        backgroundColor: `${zoneColor}15`,
        borderColor: `${zoneColor}60`,
      }}
    >
      {/* Time badge - positioned at top left */}
      <div
        className={cn(
          "absolute -top-5 left-0",
          "flex items-center gap-1",
          "px-1.5 py-0.5 rounded",
          "text-[10px] font-mono font-medium",
          "bg-card border shadow-sm"
        )}
        style={{ color: zoneColor }}
      >
        <Clock className="h-3 w-3" />
        {displayTime}
      </div>

      {/* Left side - zone indicator and name */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-1 h-6 rounded-full shrink-0"
          style={{ backgroundColor: zoneColor }}
        />
        {customerName && (
          <span
            className="text-xs font-medium truncate opacity-70"
            style={{ color: zoneColor }}
          >
            {isSegment ? "Moving..." : customerName.split(" ")[0]}
          </span>
        )}
      </div>

      {/* Right side - guest count */}
      {guestCount !== undefined && guestCount > 0 && (
        <div
          className="flex items-center gap-1 shrink-0 opacity-70"
          style={{ color: zoneColor }}
        >
          <Users className="h-3 w-3" />
          <span className="text-xs font-medium">{guestCount}</span>
        </div>
      )}
    </div>
  );
}

GhostSegment.displayName = "GhostSegment";
