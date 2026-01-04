"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAdjustMode } from "./adjust-mode-context";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DraggableSegmentData } from "./draggable-segment";
import type { HopperBooking } from "../hopper/hopper-card";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data from hopper booking drag
 */
interface HopperBookingDragData {
  type: "hopper-booking";
  booking: HopperBooking;
}

type ActiveDragData = DraggableSegmentData | HopperBookingDragData;

/**
 * Data attached to droppable guide rows for drop handling
 */
export interface DroppableGuideRowData {
  type: "guide-row";
  guideId: string;
  guideName: string;
  vehicleCapacity: number;
  /** Index of this row in the timelines array */
  timelineIndex: number;
}

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
  className,
}: DroppableGuideRowProps) {
  const { isAdjustMode } = useAdjustMode();

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

  // Determine if this is a valid drop target based on drag type
  const isHopperBookingDrag = activeData?.type === "hopper-booking";
  const isSegmentDrag = activeData?.type === "segment";
  const sourceGuideId = isSegmentDrag ? activeData.guideId : undefined;

  // For hopper bookings: always valid (no source guide)
  // For segments: only valid if from a different guide
  const isDifferentGuide = isSegmentDrag ? sourceGuideId !== guideId : false;
  const isValidDropTarget = isHopperBookingDrag || isDifferentGuide;

  // Calculate capacity status when hovering with a booking
  const capacityStatus = useMemo((): {
    status: CapacityStatus;
    newTotal: number;
    utilization: number;
    guestCount: number;
  } | null => {
    if (!isOver || !activeData) return null;

    // Get guest count from the dragged item
    let guestCount = 0;
    if (activeData.type === "hopper-booking") {
      guestCount = activeData.booking.guestCount;
    } else if (activeData.type === "segment") {
      // For segment drags, we could add guest count to DraggableSegmentData
      // For now, estimate based on typical booking size
      guestCount = 0; // Segments don't carry guest count currently
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

      {/* Row Content */}
      {children}
    </div>
  );
}

DroppableGuideRow.displayName = "DroppableGuideRow";
