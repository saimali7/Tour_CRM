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
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useCallback, useRef, type ReactNode } from "react";
import { useAdjustMode, type PendingReassignChange, type PendingAssignChange, type PendingTimeShiftChange } from "./adjust-mode-context";
import { useGhostPreview, calculateEfficiency, estimateDriveTimeImpact } from "./ghost-preview-context";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import type { DraggableSegmentData } from "./draggable-segment";
import type { DroppableGuideRowData } from "./droppable-guide-row";
import type { HopperBooking } from "../hopper/hopper-card";

// =============================================================================
// TYPES
// =============================================================================

interface DndProviderProps {
  /** Children to wrap with drag and drop context */
  children: ReactNode;
  /** Callback when a booking is assigned to a guide */
  onBookingAssign?: (bookingId: string, guideId: string) => void;
  /** Guide timelines for calculating impact */
  guideTimelines?: Array<{
    guide: { id: string; firstName: string; lastName: string };
    totalGuests: number;
    vehicleCapacity?: number;
  }>;
  /** Timeline configuration for time-based drops */
  timelineConfig?: {
    startHour: number;
    endHour: number;
    /** Snap to nearest N minutes (default: 15) */
    snapMinutes?: number;
    /** Width of the guide column in pixels (default: 200) */
    guideColumnWidth?: number;
  };
  /** Reference to the timeline container for position calculations */
  timelineContainerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Data from hopper booking drag
 */
interface HopperBookingDragData {
  type: "hopper-booking";
  booking: HopperBooking;
}

type ActiveDragData = DraggableSegmentData | HopperBookingDragData;

interface DragState {
  activeId: string;
  data: ActiveDragData;
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
 * - Updating ghost preview for map panel
 * - Rendering the drag overlay
 */
export function DndProvider({
  children,
  onBookingAssign,
  guideTimelines = [],
  timelineConfig,
  timelineContainerRef,
}: DndProviderProps) {
  const { addPendingChange, isAdjustMode } = useAdjustMode();
  const { startDrag, setDragTarget, clearDragTarget, endDrag } = useGhostPreview();
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Track the initial drag position for time calculations
  const dragStartRef = useRef<{
    clientX: number;
    segmentStartTime?: string;
    segmentEndTime?: string;
    durationMinutes?: number;
  } | null>(null);

  // Configure sensors with pointer and keyboard support for accessibility
  // Pointer: Requires 8px of movement to start dragging (prevents accidental drags)
  // Keyboard: Enables drag-and-drop via keyboard navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find guide timeline by ID
  const findGuideTimeline = useCallback(
    (guideId: string) => guideTimelines.find((t) => t.guide.id === guideId),
    [guideTimelines]
  );

  // Calculate time from horizontal position delta
  const calculateTimeFromDelta = useCallback(
    (deltaX: number, startTime: string): { newStartTime: string; newEndTime: string } | null => {
      if (!timelineConfig || !timelineContainerRef?.current) return null;

      const { startHour, endHour, snapMinutes = 15, guideColumnWidth = 200 } = timelineConfig;
      // Subtract guide column width from container width to get just the timeline area
      const fullWidth = timelineContainerRef.current.offsetWidth;
      const containerWidth = Math.max(1, fullWidth - guideColumnWidth); // Ensure positive

      // Calculate total minutes in timeline
      const totalMinutes = (endHour - startHour) * 60;

      // Calculate minutes delta from pixel delta
      const minutesDelta = Math.round((deltaX / containerWidth) * totalMinutes);

      // Parse original start time
      const [startH, startM] = startTime.split(":").map(Number);
      const originalMinutes = (startH ?? 0) * 60 + (startM ?? 0);

      // Calculate new start time in minutes
      let newMinutes = originalMinutes + minutesDelta;

      // Snap to nearest interval
      newMinutes = Math.round(newMinutes / snapMinutes) * snapMinutes;

      // Clamp to timeline bounds
      const minMinutes = startHour * 60;
      const maxMinutes = endHour * 60;
      newMinutes = Math.max(minMinutes, Math.min(maxMinutes - 30, newMinutes)); // Leave room for at least 30min

      // Convert back to time string
      const newHours = Math.floor(newMinutes / 60);
      const newMins = newMinutes % 60;
      const newStartTime = `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;

      // Calculate new end time (preserve duration)
      const durationMinutes = dragStartRef.current?.durationMinutes ?? 60;
      const endMinutes = newMinutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

      return { newStartTime, newEndTime };
    },
    [timelineConfig, timelineContainerRef]
  );

  // Check if time has meaningfully changed (beyond snap threshold)
  const hasTimeChanged = useCallback(
    (originalTime: string, newTime: string): boolean => {
      if (!timelineConfig) return false;
      const snapMinutes = timelineConfig.snapMinutes ?? 15;

      const [origH, origM] = originalTime.split(":").map(Number);
      const [newH, newM] = newTime.split(":").map(Number);

      const origMinutes = (origH ?? 0) * 60 + (origM ?? 0);
      const newMinutes = (newH ?? 0) * 60 + (newM ?? 0);

      // Consider changed if difference is at least one snap interval
      return Math.abs(newMinutes - origMinutes) >= snapMinutes;
    },
    [timelineConfig]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as ActiveDragData | undefined;

    if (!data) return;

    if (data.type === "segment") {
      setDragState({
        activeId: event.active.id as string,
        data,
      });

      // Capture initial position and segment times for time-shift detection
      const rect = event.active.rect.current.initial;
      dragStartRef.current = {
        clientX: rect?.left ?? 0,
        segmentStartTime: data.startTime,
        segmentEndTime: data.endTime,
        durationMinutes: data.durationMinutes,
      };

      // Start ghost preview for segment drag
      const guideTimeline = findGuideTimeline(data.guideId);
      startDrag({
        type: "segment",
        fromGuideId: data.guideId,
        fromGuideName: guideTimeline
          ? `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`
          : undefined,
      });
    } else if (data.type === "hopper-booking") {
      setDragState({
        activeId: event.active.id as string,
        data,
      });

      // Start ghost preview for hopper booking drag
      startDrag({
        type: "hopper-booking",
        bookingId: data.booking.id,
        customerName: data.booking.customerName,
        guestCount: data.booking.guestCount,
        pickupZone: data.booking.pickupZone ?? undefined,
      });
    }
  }, [findGuideTimeline, startDrag]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over || !dragState) {
      clearDragTarget();
      return;
    }

    const overData = over.data.current as DroppableGuideRowData | { type: "hopper" } | undefined;

    // Handle hovering over the hopper (for unassigning)
    if (overData?.type === "hopper") {
      clearDragTarget();
      return;
    }

    // Handle hovering over a guide row
    if (overData?.type === "guide-row") {
      const activeData = active.data.current as ActiveDragData;
      const guideTimeline = findGuideTimeline(overData.guideId);

      // Don't show preview if dragging to same guide
      if (activeData.type === "segment" && activeData.guideId === overData.guideId) {
        clearDragTarget();
        return;
      }

      // Calculate guest count being moved
      let guestCount = 0;
      let bookingZoneId: string | undefined;

      if (activeData.type === "hopper-booking") {
        guestCount = activeData.booking.guestCount;
        bookingZoneId = activeData.booking.pickupZone?.id;
      }

      // Calculate impact
      const currentGuests = guideTimeline?.totalGuests ?? 0;
      const vehicleCapacity = overData.vehicleCapacity;
      const newTotal = currentGuests + guestCount;
      const exceedsCapacity = newTotal > vehicleCapacity;
      const capacityUtilization = Math.round((newTotal / vehicleCapacity) * 100);

      // Estimate drive time impact
      const existingPickups = Math.floor(currentGuests / 2); // Rough estimate
      const driveTimeChange = estimateDriveTimeImpact(bookingZoneId, undefined, existingPickups);
      const efficiency = calculateEfficiency(driveTimeChange);

      setDragTarget(
        {
          guideId: overData.guideId,
          guideName: overData.guideName,
          vehicleCapacity,
          currentGuestCount: currentGuests,
        },
        {
          driveTimeChange,
          efficiency,
          exceedsCapacity,
          capacityUtilization,
        }
      );
    }
  }, [dragState, findGuideTimeline, setDragTarget, clearDragTarget]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;

    // Capture time shift data before clearing
    const timeShiftData = dragStartRef.current;

    // Clear all drag state
    setDragState(null);
    dragStartRef.current = null;
    endDrag();

    // Validate we have valid drop data
    if (!over || !active.data.current || !over.data.current) {
      return;
    }

    const activeData = active.data.current as ActiveDragData;
    const overData = over.data.current as DroppableGuideRowData | { type: "hopper" };

    // Handle dropping on hopper (unassign)
    if (overData.type === "hopper") {
      // TODO: Implement unassign logic
      return;
    }

    // Handle dropping on guide row
    if (overData.type === "guide-row") {
      if (activeData.type === "segment") {
        // Segment reassignment or time shift
        const sourceGuideId = activeData.guideId;
        const targetGuideId = overData.guideId;
        const isSameGuide = sourceGuideId === targetGuideId;

        // Check for time shift (horizontal drag) when we have timeline config
        if (timeShiftData?.segmentStartTime && timelineConfig) {
          const newTimes = calculateTimeFromDelta(delta.x, timeShiftData.segmentStartTime);

          if (newTimes && hasTimeChanged(timeShiftData.segmentStartTime, newTimes.newStartTime)) {
            // Time shift detected!
            addPendingChange({
              type: "time-shift",
              segmentId: activeData.segmentId,
              guideId: isSameGuide ? sourceGuideId : targetGuideId,
              bookingIds: activeData.bookingIds,
              originalStartTime: timeShiftData.segmentStartTime,
              newStartTime: newTimes.newStartTime,
              originalEndTime: timeShiftData.segmentEndTime ?? "",
              newEndTime: newTimes.newEndTime,
              durationMinutes: timeShiftData.durationMinutes ?? 60,
            } as Omit<PendingTimeShiftChange, "id" | "timestamp">);

            // If also changing guide, add a reassignment too
            if (!isSameGuide) {
              addPendingChange({
                type: "reassign",
                tourRunId: activeData.tourRunId,
                segmentId: activeData.segmentId,
                fromGuideId: sourceGuideId,
                toGuideId: targetGuideId,
                bookingIds: activeData.bookingIds,
              } as Omit<PendingReassignChange, "id" | "timestamp">);

              toast.success(`Time & guide changed`, {
                description: `Moved to ${newTimes.newStartTime} and ${overData.guideName.split(" ")[0]}`,
              });
            } else {
              toast.success(`Time changed`, {
                description: `Moved to ${newTimes.newStartTime}`,
              });
            }
            return;
          }
        }

        // No time shift - check for guide reassignment
        if (isSameGuide) {
          // Dropped on same guide with no time change
          toast.info("No change made", {
            description: "Drag horizontally to change time, or to a different guide to reassign",
          });
          return;
        }

        addPendingChange({
          type: "reassign",
          tourRunId: activeData.tourRunId,
          segmentId: activeData.segmentId,
          fromGuideId: sourceGuideId,
          toGuideId: targetGuideId,
          bookingIds: activeData.bookingIds,
        } as Omit<PendingReassignChange, "id" | "timestamp">);

        toast.success(`Reassignment queued`, {
          description: `Will move to ${overData.guideName.split(" ")[0]} when saved`,
        });
      } else if (activeData.type === "hopper-booking") {
        // New booking assignment from hopper - add as pending change
        const { booking } = activeData;
        addPendingChange({
          type: "assign",
          bookingId: booking.id,
          toGuideId: overData.guideId,
          toGuideName: overData.guideName,
          timelineIndex: overData.timelineIndex,
          bookingData: {
            customerName: booking.customerName,
            guestCount: booking.guestCount,
            tourName: booking.tourName,
            tourTime: booking.tourTime,
            pickupZone: booking.pickupZone,
          },
        } as Omit<PendingAssignChange, "id" | "timestamp">);
        // Also call the callback for toast notification
        onBookingAssign?.(booking.id, overData.guideId);
      }
    }
  }, [addPendingChange, endDrag, onBookingAssign, timelineConfig, calculateTimeFromDelta, hasTimeChanged]);

  const handleDragCancel = useCallback(() => {
    setDragState(null);
    dragStartRef.current = null;
    endDrag();
  }, [endDrag]);

  // When not in adjust mode, just render children without DnD context
  if (!isAdjustMode) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag Overlay - follows cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {dragState && <DragOverlayContent data={dragState.data} />}
      </DragOverlay>
    </DndContext>
  );
}

DndProvider.displayName = "DndProvider";

// =============================================================================
// DRAG OVERLAY CONTENT
// =============================================================================

interface DragOverlayContentProps {
  data: ActiveDragData;
}

/**
 * Visual representation shown during drag
 */
function DragOverlayContent({ data }: DragOverlayContentProps) {
  if (data.type === "segment") {
    const segmentLabel =
      data.segmentType === "pickup"
        ? "Pickup"
        : data.segmentType === "tour"
          ? "Tour"
          : "Segment";

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
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  }

  if (data.type === "hopper-booking") {
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
        {/* Zone color indicator */}
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

        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    );
  }

  return null;
}
