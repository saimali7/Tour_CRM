"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useCallback, useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ArrowRight, Users, MapPin, Clock } from "lucide-react";

import { useAdjustMode, type PendingTimeShiftChange } from "./adjust-mode-context";
import { useGhostPreview, calculateEfficiency, estimateDriveTimeImpact } from "./ghost-preview-context";
import { useLiveAssignmentContextSafe } from "../live-assignment-context";

// Import centralized types and utilities
import {
  type ActiveDragData,
  type DraggableSegmentData,
  type DroppableGuideRowData,
  type DragState,
  type DragStartCapture,
  type DndTimelineConfig,
  isSegmentDrag,
  isHopperBookingDrag,
  isGuideRowDrop,
  isHopperDrop,
} from "./types";

import {
  formatTimeDisplay,
  calculateTimeShift,
  hasTimeChanged,
  durationToWidthPercent,
  timeToPercent,
  DEFAULT_TIMELINE_CONFIG,
} from "../timeline/time-utils";

// Re-export types that other components need
export type { DraggableSegmentData } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAG_ACTIVATION_DISTANCE = 8; // pixels before drag starts

// =============================================================================
// PROPS
// =============================================================================

interface DndProviderProps {
  /** Children to wrap with drag and drop context */
  children: ReactNode;
  /** Callback when a booking is assigned to a guide (legacy, kept for compatibility) */
  onBookingAssign?: (bookingId: string, guideId: string) => void;
  /** Guide timelines for calculating impact */
  guideTimelines?: Array<{
    guide: { id: string; firstName: string; lastName: string };
    totalGuests: number;
    vehicleCapacity?: number;
  }>;
  /** Timeline configuration for time-based drops */
  timelineConfig?: DndTimelineConfig;
  /** Reference to the timeline container for position calculations */
  timelineContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Additional CSS classes for the container */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Provides the DnD context for adjust mode
 *
 * Responsibilities:
 * - Configure drag sensors (pointer, keyboard)
 * - Track active drag state
 * - Process drop events (assign, reassign, unassign, time-shift)
 * - Update ghost preview for visual feedback
 * - Render drag overlay
 */
export function DndProvider({
  children,
  guideTimelines = [],
  timelineConfig,
  timelineContainerRef,
  className,
}: DndProviderProps) {
  const { isAdjustMode, addPendingChange } = useAdjustMode();
  const liveAssignment = useLiveAssignmentContextSafe();
  const { startDrag, setDragTarget, setTargetTime, clearDragTarget, endDrag } = useGhostPreview();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStartRef = useRef<DragStartCapture | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  const findGuideTimeline = useCallback(
    (guideId: string) => guideTimelines.find((t) => t.guide.id === guideId),
    [guideTimelines]
  );

  const getGuideName = useCallback(
    (guideId: string): string => {
      const timeline = findGuideTimeline(guideId);
      return timeline ? `${timeline.guide.firstName} ${timeline.guide.lastName}` : "Guide";
    },
    [findGuideTimeline]
  );

  const getBookingLabel = useCallback(
    (activeData: ActiveDragData): string => {
      if (isHopperBookingDrag(activeData)) {
        return activeData.booking.customerName || "Booking";
      }
      // For segments, we don't have easy access to customer name
      // Use a generic label
      return "Booking";
    },
    []
  );

  const getTimelineWidth = useCallback((): number => {
    if (!timelineContainerRef?.current || !timelineConfig) return 0;
    const guideColumnWidth = timelineConfig.guideColumnWidth ?? DEFAULT_TIMELINE_CONFIG.guideColumnWidth;
    return Math.max(1, timelineContainerRef.current.offsetWidth - guideColumnWidth);
  }, [timelineContainerRef, timelineConfig]);

  // ==========================================================================
  // DRAG HANDLERS
  // ==========================================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as ActiveDragData | undefined;
    if (!data) return;

    if (isSegmentDrag(data)) {
      setDragState({ activeId: event.active.id as string, data });

      // Capture initial position for time-shift calculations
      const rect = event.active.rect.current.initial;
      dragStartRef.current = {
        clientX: rect?.left ?? 0,
        segmentStartTime: data.startTime,
        segmentEndTime: data.endTime,
        durationMinutes: data.durationMinutes,
      };

      // Start ghost preview
      const guideTimeline = findGuideTimeline(data.guideId);
      startDrag({
        type: "segment",
        fromGuideId: data.guideId,
        fromGuideName: guideTimeline
          ? `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`
          : undefined,
        guestCount: data.guestCount,
        durationMinutes: data.durationMinutes,
        originalStartTime: data.startTime,
      });
    } else if (isHopperBookingDrag(data)) {
      setDragState({ activeId: event.active.id as string, data });

      startDrag({
        type: "hopper-booking",
        bookingId: data.booking.id,
        customerName: data.booking.customerName,
        guestCount: data.booking.guestCount,
        pickupZone: data.booking.pickupZone ?? undefined,
        durationMinutes: data.booking.tourDurationMinutes ?? 60,
      });
    }
  }, [findGuideTimeline, startDrag]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!timelineConfig || !timelineContainerRef?.current || !dragState) return;

    const { startHour, endHour, snapMinutes = 15, guideColumnWidth = 200 } = timelineConfig;

    // Get current position
    const activeRect = event.active.rect.current.translated;
    if (!activeRect) return;

    const clientX = activeRect.left + activeRect.width / 2;
    const containerRect = timelineContainerRef.current.getBoundingClientRect();

    // Calculate position as percentage
    const timelineStart = containerRect.left + guideColumnWidth;
    const timelineWidth = containerRect.width - guideColumnWidth;
    const relativeX = clientX - timelineStart;
    const percent = Math.max(0, Math.min(1, relativeX / timelineWidth));

    // Calculate time from position
    const totalMinutes = (endHour - startHour) * 60;
    const currentMinutes = startHour * 60 + percent * totalMinutes;
    const snappedMinutes = Math.round(currentMinutes / snapMinutes) * snapMinutes;
    const clampedMinutes = Math.max(startHour * 60, Math.min(endHour * 60, snappedMinutes));

    // Convert to time string
    const hours = Math.floor(clampedMinutes / 60);
    const mins = clampedMinutes % 60;
    const time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

    // Get duration for width calculation
    let durationMinutes = 60;
    if (isSegmentDrag(dragState.data)) {
      durationMinutes = dragState.data.durationMinutes ?? 60;
    } else if (isHopperBookingDrag(dragState.data)) {
      durationMinutes = dragState.data.booking.tourDurationMinutes ?? 60;
    }

    const widthPercent = durationToWidthPercent(durationMinutes, startHour, endHour);
    const positionPercent = timeToPercent(time, startHour, endHour);

    // Update state
    setDragState((prev) =>
      prev ? { ...prev, targetTime: time, targetDisplayTime: formatTimeDisplay(time) } : null
    );

    setTargetTime({
      time,
      displayTime: formatTimeDisplay(time),
      percent: positionPercent,
      widthPercent,
    });
  }, [timelineConfig, timelineContainerRef, dragState, setTargetTime]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over || !dragState) {
      clearDragTarget();
      return;
    }

    const overData = over.data.current as DroppableGuideRowData | { type: "hopper" } | undefined;

    // Hovering over hopper - no preview needed
    if (overData?.type === "hopper") {
      clearDragTarget();
      return;
    }

    // Hovering over guide row
    if (isGuideRowDrop(overData as DroppableGuideRowData)) {
      const guideRowData = overData as DroppableGuideRowData;
      const activeData = active.data.current as ActiveDragData;

      // Don't show preview when dragging to same guide
      if (isSegmentDrag(activeData) && activeData.guideId === guideRowData.guideId) {
        clearDragTarget();
        return;
      }

      // Calculate impact
      const guideTimeline = findGuideTimeline(guideRowData.guideId);
      let guestCount = 0;
      let bookingZoneId: string | undefined;

      if (isHopperBookingDrag(activeData)) {
        guestCount = activeData.booking.guestCount;
        bookingZoneId = activeData.booking.pickupZone?.id;
      }

      const currentGuests = guideTimeline?.totalGuests ?? 0;
      const vehicleCapacity = guideRowData.vehicleCapacity;
      const newTotal = currentGuests + guestCount;
      const exceedsCapacity = newTotal > vehicleCapacity;
      const capacityUtilization = Math.round((newTotal / vehicleCapacity) * 100);

      const existingPickups = Math.floor(currentGuests / 2);
      const driveTimeChange = estimateDriveTimeImpact(bookingZoneId, undefined, existingPickups);
      const efficiency = calculateEfficiency(driveTimeChange);

      setDragTarget(
        {
          guideId: guideRowData.guideId,
          guideName: guideRowData.guideName,
          vehicleCapacity,
          currentGuestCount: currentGuests,
        },
        { driveTimeChange, efficiency, exceedsCapacity, capacityUtilization }
      );
    }
  }, [dragState, findGuideTimeline, setDragTarget, clearDragTarget]);

  // ==========================================================================
  // DROP HANDLERS (defined before handleDragEnd to avoid hoisting issues)
  // ==========================================================================

  const handleHopperDrop = useCallback((activeData: ActiveDragData) => {
    if (isSegmentDrag(activeData)) {
      // Only pickup/tour segments can be unassigned
      if (activeData.segmentType !== "pickup" && activeData.segmentType !== "tour") {
        toast.info("Cannot unassign drive or idle segments");
        return;
      }

      const bookingIds = activeData.bookingIds;
      if (!bookingIds?.length) {
        toast.error("Cannot unassign - no booking IDs found");
        return;
      }

      const guideName = getGuideName(activeData.guideId);
      const bookingLabel = getBookingLabel(activeData);

      if (liveAssignment) {
        const unassignAll = async () => {
          for (const bookingId of bookingIds) {
            try {
              await liveAssignment.unassignBooking(bookingId, activeData.guideId, guideName, bookingLabel);
            } catch (error) {
              console.error(`Failed to unassign booking ${bookingId}:`, error);
            }
          }
        };
        unassignAll();
      }
    } else if (isHopperBookingDrag(activeData)) {
      toast.info("Booking is already unassigned");
    }
  }, [getGuideName, getBookingLabel, liveAssignment]);

  const handleGuideRowDrop = useCallback((
    activeData: ActiveDragData,
    overData: DroppableGuideRowData,
    deltaX: number,
    dragStartData: DragStartCapture | null
  ) => {
    if (isSegmentDrag(activeData)) {
      const sourceGuideId = activeData.guideId;
      const targetGuideId = overData.guideId;
      const isSameGuide = sourceGuideId === targetGuideId;

      // Same guide - check for time shift
      if (isSameGuide) {
        handleTimeShift(activeData, deltaX, dragStartData);
        return;
      }

      // Different guide - reassign
      handleReassign(activeData, sourceGuideId, targetGuideId, overData.guideName);
    } else if (isHopperBookingDrag(activeData)) {
      // New assignment from hopper
      if (liveAssignment) {
        const bookingLabel = activeData.booking.customerName || "Booking";
        liveAssignment.assignBooking(
          activeData.booking.id,
          overData.guideId,
          overData.guideName,
          bookingLabel
        );
      }
    }
  }, [liveAssignment, timelineConfig, timelineContainerRef, addPendingChange]);

  const handleTimeShift = useCallback((
    activeData: DraggableSegmentData,
    deltaX: number,
    dragStartData: DragStartCapture | null
  ) => {
    if (!timelineConfig || !activeData.startTime) {
      toast.info("No change made", { description: "Drag to a different guide or time" });
      return;
    }

    const containerWidth = getTimelineWidth();
    const segmentDuration = dragStartData?.durationMinutes ?? activeData.durationMinutes ?? 60;

    const result = calculateTimeShift(
      deltaX,
      activeData.startTime,
      segmentDuration,
      containerWidth,
      timelineConfig
    );

    if (result && hasTimeChanged(activeData.startTime, result.newStartTime, timelineConfig.snapMinutes)) {
      addPendingChange({
        type: "time-shift",
        segmentId: activeData.segmentId,
        guideId: activeData.guideId,
        bookingIds: activeData.bookingIds,
        originalStartTime: activeData.startTime,
        newStartTime: result.newStartTime,
        originalEndTime: activeData.endTime ?? "",
        newEndTime: result.newEndTime,
        durationMinutes: segmentDuration,
      } as Omit<PendingTimeShiftChange, "id" | "timestamp">);

      toast.success(`Moved to ${formatTimeDisplay(result.newStartTime)}`, {
        description: "This change is pending - click Apply to save",
      });
      return;
    }

    toast.info("No change made", { description: "Drag to a different guide or time" });
  }, [timelineConfig, getTimelineWidth, addPendingChange]);

  const handleReassign = useCallback((
    activeData: DraggableSegmentData,
    sourceGuideId: string,
    targetGuideId: string,
    targetGuideName: string
  ) => {
    const bookingIds = activeData.bookingIds;
    if (!bookingIds?.length) {
      toast.error("Cannot reassign - no booking IDs found");
      return;
    }

    const sourceGuideName = getGuideName(sourceGuideId);
    const bookingLabel = getBookingLabel(activeData);

    if (liveAssignment) {
      const reassignAll = async () => {
        for (const bookingId of bookingIds) {
          try {
            await liveAssignment.reassignBooking(
              bookingId,
              sourceGuideId,
              sourceGuideName,
              targetGuideId,
              targetGuideName,
              bookingLabel
            );
          } catch (error) {
            console.error(`Failed to reassign booking ${bookingId}:`, error);
          }
        }
      };
      reassignAll();
    }
  }, [liveAssignment, getGuideName, getBookingLabel]);

  // ==========================================================================
  // MAIN DRAG END HANDLER (defined after drop handlers to avoid hoisting issues)
  // ==========================================================================

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Capture ref data before clearing
    const dragStartData = dragStartRef.current;

    // Clear all state
    setDragState(null);
    dragStartRef.current = null;
    endDrag();

    // Validate drop - ensure we have valid active and over data
    if (!over || !active.data.current || !over.data.current) {
      return;
    }

    const activeData = active.data.current as ActiveDragData;
    const overData = over.data.current as DroppableGuideRowData | { type: "hopper" };

    // Handle drop on hopper (unassign)
    if (isHopperDrop(overData)) {
      handleHopperDrop(activeData);
      return;
    }

    // Handle drop on guide row
    if (isGuideRowDrop(overData)) {
      handleGuideRowDrop(activeData, overData, event.delta?.x ?? 0, dragStartData);
    }
  }, [endDrag, handleHopperDrop, handleGuideRowDrop, liveAssignment]);

  const handleDragCancel = useCallback(() => {
    setDragState(null);
    dragStartRef.current = null;
    endDrag();
  }, [endDrag]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // When not in adjust mode, render children without DnD context
  if (!isAdjustMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          {dragState && (
            <DragOverlayContent
              data={dragState.data}
              targetTime={dragState.targetDisplayTime}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

DndProvider.displayName = "DndProvider";

// =============================================================================
// DRAG OVERLAY CONTENT
// =============================================================================

interface DragOverlayContentProps {
  data: ActiveDragData;
  targetTime?: string;
}

function DragOverlayContent({ data, targetTime }: DragOverlayContentProps) {
  if (isSegmentDrag(data)) {
    const segmentLabel =
      data.segmentType === "pickup" ? "Pickup" :
      data.segmentType === "tour" ? "Tour" : "Segment";

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
            data.segmentType === "pickup" && "bg-blue-500",
            data.segmentType === "tour" && "bg-emerald-500"
          )}
        />
        <span>Moving {segmentLabel}</span>
        {targetTime && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">
            <Clock className="h-3 w-3" />
            {targetTime}
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  }

  if (isHopperBookingDrag(data)) {
    const { booking } = data;
    const zoneColor = booking.pickupZone?.color || "#6B7280";

    return (
      <div
        className={cn(
          "flex items-center gap-3",
          "px-3 py-2 rounded-lg",
          "bg-card border shadow-lg",
          "text-sm font-medium",
          "opacity-95",
          "min-w-[200px]"
        )}
      >
        <div
          className="w-1.5 h-8 rounded-full shrink-0"
          style={{ backgroundColor: zoneColor }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate">{booking.customerName}</span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              {booking.guestCount}
            </span>
          </div>

          {booking.pickupZone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{booking.pickupZone.name}</span>
            </div>
          )}
        </div>

        {targetTime && (
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono shrink-0">
            <Clock className="h-3 w-3" />
            {targetTime}
          </span>
        )}

        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    );
  }

  return null;
}
