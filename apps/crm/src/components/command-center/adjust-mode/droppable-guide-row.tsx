"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAdjustMode } from "./adjust-mode-context";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { DraggableSegmentData } from "./draggable-segment";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data attached to droppable guide rows for drop handling
 */
export interface DroppableGuideRowData {
  type: "guide-row";
  guideId: string;
  guideName: string;
  vehicleCapacity: number;
}

interface DroppableGuideRowProps {
  /** ID of the guide this row represents */
  guideId: string;
  /** Name of the guide (for accessibility) */
  guideName: string;
  /** Vehicle capacity for validation hints */
  vehicleCapacity: number;
  /** Content to render inside the droppable area */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Wrapper component that makes a guide row a valid drop target
 *
 * Provides visual feedback when a draggable segment is hovering over.
 * Shows drop indicator only when dragging from a different guide.
 */
export function DroppableGuideRow({
  guideId,
  guideName,
  vehicleCapacity,
  children,
  className,
}: DroppableGuideRowProps) {
  const { isAdjustMode } = useAdjustMode();

  const { setNodeRef, isOver, active } = useDroppable({
    id: `guide-row-${guideId}`,
    data: {
      type: "guide-row",
      guideId,
      guideName,
      vehicleCapacity,
    } satisfies DroppableGuideRowData,
    disabled: !isAdjustMode,
  });

  // Extract source guide ID from active draggable
  const activeData = active?.data?.current as DraggableSegmentData | undefined;
  const sourceGuideId = activeData?.guideId;

  // Only show drop indicator if dragging from a different guide
  const isDifferentGuide = sourceGuideId && sourceGuideId !== guideId;
  const showDropIndicator = isAdjustMode && isOver && isDifferentGuide;
  const showPotentialDrop = isAdjustMode && active && isDifferentGuide && !isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-150",
        // Highlight when can receive drop
        showDropIndicator && "bg-primary/5",
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
            "border-2 border-dashed border-primary/50 rounded-lg"
          )}
          aria-hidden="true"
        />
      )}

      {/* Drop Hint Badge */}
      {showDropIndicator && (
        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-30",
            "flex items-center gap-1.5",
            "px-2.5 py-1 rounded-full",
            "bg-primary text-primary-foreground",
            "text-xs font-medium",
            "shadow-sm",
            "pointer-events-none"
          )}
        >
          <ArrowRight className="h-3 w-3" />
          <span>Assign to {guideName.split(" ")[0]}</span>
        </div>
      )}

      {/* Row Content */}
      {children}
    </div>
  );
}

DroppableGuideRow.displayName = "DroppableGuideRow";
