"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useAdjustMode } from "./adjust-mode-context";
import { GripVertical } from "lucide-react";
import type { ReactNode, CSSProperties } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data attached to draggable segments for drop handling
 */
export interface DraggableSegmentData {
  type: "segment";
  segmentId: string;
  guideId: string;
  tourRunId: string;
  segmentType: "pickup" | "tour" | "drive" | "idle";
  /** Booking IDs associated with this segment (for reassignment tracking) */
  bookingIds?: string[];
  /** Segment start time in HH:MM format (for time-shift tracking) */
  startTime?: string;
  /** Segment end time in HH:MM format (for time-shift tracking) */
  endTime?: string;
  /** Duration in minutes (for time-shift tracking) */
  durationMinutes?: number;
}

interface DraggableSegmentProps {
  /** Unique identifier for the draggable segment */
  id: string;
  /** ID of the guide this segment belongs to */
  guideId: string;
  /** ID of the tour run this segment is part of */
  tourRunId: string;
  /** Type of segment (for filtering what can be dragged) */
  segmentType: "pickup" | "tour" | "drive" | "idle";
  /** Booking IDs associated with this segment */
  bookingIds?: string[];
  /** Segment start time in HH:MM format (for time-shift tracking) */
  startTime?: string;
  /** Segment end time in HH:MM format (for time-shift tracking) */
  endTime?: string;
  /** Duration in minutes (for time-shift tracking) */
  durationMinutes?: number;
  /** Content to render inside the draggable wrapper */
  children: ReactNode;
  /** Whether dragging is disabled for this segment */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Wrapper component that makes a segment draggable in adjust mode
 *
 * When adjust mode is inactive, renders children directly.
 * When active, adds drag handle and drag functionality.
 */
export function DraggableSegment({
  id,
  guideId,
  tourRunId,
  segmentType,
  bookingIds,
  startTime,
  endTime,
  durationMinutes,
  children,
  disabled = false,
  className,
}: DraggableSegmentProps) {
  const { isAdjustMode } = useAdjustMode();

  // Only pickup and tour segments can be dragged
  const canDrag = segmentType === "pickup" || segmentType === "tour";

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: {
        type: "segment",
        segmentId: id,
        guideId,
        tourRunId,
        segmentType,
        bookingIds,
        startTime,
        endTime,
        durationMinutes,
      } satisfies DraggableSegmentData,
      disabled: !isAdjustMode || disabled || !canDrag,
    });

  // Calculate transform styles for drag animation
  const style: CSSProperties | undefined = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
      }
    : undefined;

  // When not in adjust mode or segment can't be dragged, render children directly
  if (!isAdjustMode || !canDrag) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/draggable",
        isDragging && "opacity-60 ring-2 ring-primary ring-offset-1 rounded-sm",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Drag Handle - appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full",
          "flex items-center justify-center",
          "w-5 h-8 pr-0.5",
          "opacity-0 group-hover/draggable:opacity-100",
          "transition-opacity duration-150",
          !disabled && "cursor-grab",
          isDragging && "cursor-grabbing opacity-100"
        )}
        aria-label="Drag to reassign"
      >
        <div
          className={cn(
            "flex items-center justify-center",
            "w-4 h-6 rounded-sm",
            "bg-card border shadow-sm",
            "text-muted-foreground",
            "hover:bg-muted hover:text-foreground",
            "transition-colors duration-150"
          )}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Dragging Indicator */}
      {isDragging && (
        <div
          className="absolute inset-0 bg-primary/10 rounded-sm pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Segment Content */}
      {children}
    </div>
  );
}

DraggableSegment.displayName = "DraggableSegment";
