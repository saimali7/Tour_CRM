"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { useAdjustMode } from "./adjust-mode-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, Users } from "lucide-react";
import type { DraggableSegmentData } from "./draggable-segment";
import type { DroppableGuideRowData } from "./droppable-guide-row";

// =============================================================================
// TYPES
// =============================================================================

interface DndProviderProps {
  /** Children to wrap with drag and drop context */
  children: ReactNode;
}

interface DragState {
  activeId: string;
  data: DraggableSegmentData;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Provides the DnD context for adjust mode
 *
 * Handles:
 * - Setting up sensors (pointer with distance constraint)
 * - Tracking active drag state
 * - Processing drop events and creating pending changes
 * - Rendering the drag overlay
 */
export function DndProvider({ children }: DndProviderProps) {
  const { addPendingChange, isAdjustMode } = useAdjustMode();
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Configure pointer sensor with activation constraint
  // Requires 8px of movement to start dragging (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggableSegmentData | undefined;
    if (data?.type === "segment") {
      setDragState({
        activeId: event.active.id as string,
        data,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state
    setDragState(null);

    // Validate we have valid drop data
    if (!over || !active.data.current || !over.data.current) {
      return;
    }

    const activeData = active.data.current as DraggableSegmentData;
    const overData = over.data.current as DroppableGuideRowData;

    // Ensure we're dropping on a guide row
    if (overData.type !== "guide-row") {
      return;
    }

    const sourceGuideId = activeData.guideId;
    const targetGuideId = overData.guideId;

    // Only create change if dropping on a different guide
    if (sourceGuideId !== targetGuideId) {
      addPendingChange({
        type: "reassign",
        tourRunId: activeData.tourRunId,
        segmentId: activeData.segmentId,
        fromGuideId: sourceGuideId,
        toGuideId: targetGuideId,
      });
    }
  };

  const handleDragCancel = () => {
    setDragState(null);
  };

  // When not in adjust mode, just render children without DnD context
  if (!isAdjustMode) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag Overlay - follows cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {dragState && (
          <DragOverlayContent
            segmentType={dragState.data.segmentType}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

DndProvider.displayName = "DndProvider";

// =============================================================================
// DRAG OVERLAY CONTENT
// =============================================================================

interface DragOverlayContentProps {
  segmentType: DraggableSegmentData["segmentType"];
}

/**
 * Visual representation shown during drag
 */
function DragOverlayContent({ segmentType }: DragOverlayContentProps) {
  const segmentLabel = segmentType === "pickup" ? "Pickup" : segmentType === "tour" ? "Tour" : "Segment";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "px-3 py-2 rounded-lg",
        "bg-card border shadow-lg",
        "text-sm font-medium",
        "opacity-95"
      )}
    >
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          segmentType === "pickup" && "bg-blue-500",
          segmentType === "tour" && "bg-emerald-500"
        )}
      />
      <span>Moving {segmentLabel}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
