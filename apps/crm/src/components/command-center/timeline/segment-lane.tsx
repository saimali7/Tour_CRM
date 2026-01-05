"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useAdjustMode, type PendingTimeShiftChange } from "../adjust-mode/adjust-mode-context";
import { useLiveAssignmentContextSafe } from "../live-assignment-context";
import { Clock, X, Loader2, Eye, UserMinus, ArrowRightLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { TimelineSegment, GuideInfo } from "./types";
import { timeToPercent, segmentWidthPercent, formatTimeDisplay } from "./types";
// Import segment content components from extracted module
import {
  TourContent,
  TourTooltip,
  PickupContent,
  PickupTooltip,
  DriveContent,
  DriveTooltip,
  IdleContent,
  IdleTooltip,
} from "./segment-content";

// =============================================================================
// TYPES
// =============================================================================

interface SegmentLaneProps {
  /** Array of segments to render in this lane */
  segments: TimelineSegment[];
  /** Guide info for drag data */
  guide: GuideInfo;
  /** Timeline start hour */
  startHour: number;
  /** Timeline end hour */
  endHour: number;
  /** Currently selected segment ID */
  selectedSegmentId?: string | null;
  /** Click handler for segments */
  onSegmentClick?: (segment: TimelineSegment) => void;
  /** Context menu: View segment details */
  onViewDetails?: (segment: TimelineSegment) => void;
  /** Context menu: Reassign to different guide */
  onReassign?: (segment: TimelineSegment) => void;
  /** Context menu: View booking */
  onViewBooking?: (bookingId: string) => void;
  /** Whether adjust mode is active */
  isAdjustMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface SegmentItemProps {
  segment: TimelineSegment;
  guide: GuideInfo;
  startHour: number;
  endHour: number;
  isSelected: boolean;
  onClick?: () => void;
  onViewDetails?: (segment: TimelineSegment) => void;
  onReassign?: (segment: TimelineSegment) => void;
  onViewBooking?: (bookingId: string) => void;
  isAdjustMode: boolean;
}

// =============================================================================
// SEGMENT LANE - Container for all segments
// =============================================================================

export function SegmentLane({
  segments,
  guide,
  startHour,
  endHour,
  selectedSegmentId,
  onSegmentClick,
  onViewDetails,
  onReassign,
  onViewBooking,
  isAdjustMode = false,
  className,
}: SegmentLaneProps) {
  // Filter and validate segments within timeline bounds
  const validSegments = React.useMemo(() => {
    return segments.filter((segment) => {
      const [startH] = segment.startTime.split(":").map(Number);
      const [endH] = segment.endTime.split(":").map(Number);
      // Segment must overlap with timeline range
      return (startH ?? 0) < endHour && (endH ?? 0) > startHour;
    });
  }, [segments, startHour, endHour]);

  // Empty state - guide has no assignments
  if (validSegments.length === 0) {
    return (
      <div
        className={cn(
          "relative h-10 w-full",
          "flex items-center justify-center",
          className
        )}
        role="listbox"
        aria-label="Timeline segments - no assignments"
      >
        {/* Subtle dashed border pattern to indicate intentional emptiness */}
        <div
          className={cn(
            "absolute inset-x-0 inset-y-1",
            "rounded border border-dashed border-muted-foreground/20",
            "bg-muted/30"
          )}
          aria-hidden="true"
        />
        {/* Centered availability message */}
        <span
          className={cn(
            "relative z-10",
            "text-xs italic text-muted-foreground/60",
            "select-none"
          )}
        >
          Available all day
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("relative h-10 w-full", className)}
      role="listbox"
      aria-label="Timeline segments"
    >
      {validSegments.map((segment) => (
        <SegmentItem
          key={segment.id}
          segment={segment}
          guide={guide}
          startHour={startHour}
          endHour={endHour}
          isSelected={selectedSegmentId === segment.id}
          onClick={() => onSegmentClick?.(segment)}
          onViewDetails={onViewDetails}
          onReassign={onReassign}
          onViewBooking={onViewBooking}
          isAdjustMode={isAdjustMode}
        />
      ))}
    </div>
  );
}

// =============================================================================
// SEGMENT ITEM - Individual segment with drag support
// =============================================================================

function SegmentItem({
  segment,
  guide,
  startHour,
  endHour,
  isSelected,
  onClick,
  onViewDetails,
  onReassign,
  onViewBooking,
  isAdjustMode,
}: SegmentItemProps) {
  const { getTimeShiftForSegment } = useAdjustMode();
  const liveAssignment = useLiveAssignmentContextSafe();

  // Get booking ID for this segment (first booking for unassign button)
  const bookingId = React.useMemo(() => {
    if (segment.type === "pickup" && segment.booking?.id) {
      return segment.booking.id;
    }
    if (segment.type === "tour" && segment.bookingIds?.[0]) {
      return segment.bookingIds[0];
    }
    return null;
  }, [segment]);

  // Check if this segment is currently being modified
  const isPending = bookingId ? liveAssignment?.isBookingPending(bookingId) : false;

  // Get booking label for toast messages (customer name or reference number)
  const bookingLabel = React.useMemo(() => {
    if (segment.type === "pickup" && segment.booking) {
      const customer = segment.booking.customer;
      if (customer?.firstName) {
        return `${customer.firstName} ${customer.lastName}`.trim();
      }
      return segment.booking.referenceNumber || "Booking";
    }
    if (segment.type === "tour") {
      return segment.tour?.name || "Tour booking";
    }
    return "Booking";
  }, [segment]);

  // Handler to unassign this segment - now uses live assignment
  const handleUnassign = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!bookingId || !liveAssignment) return;

    const guideName = `${guide.firstName} ${guide.lastName}`.trim();
    liveAssignment.unassignBooking(bookingId, guide.id, guideName, bookingLabel);
  }, [bookingId, guide, liveAssignment, bookingLabel]);

  // Check for pending time shift
  const pendingTimeShift = isAdjustMode ? getTimeShiftForSegment(segment.id) : null;

  // Use shifted times if there's a pending change, otherwise use original
  const displayStartTime = pendingTimeShift?.newStartTime ?? segment.startTime;
  const displayEndTime = pendingTimeShift?.newEndTime ?? segment.endTime;
  const hasTimeShift = !!pendingTimeShift;

  // Calculate position and width
  const leftPercent = timeToPercent(displayStartTime, startHour, endHour);
  const widthPercent = segmentWidthPercent(displayStartTime, displayEndTime, startHour, endHour);

  // Clamp values to visible range
  const clampedLeft = Math.max(0, Math.min(100, leftPercent));
  const clampedWidth = Math.max(2, Math.min(100 - clampedLeft, widthPercent)); // Min 2% width for visibility

  // Determine if this segment type can be dragged
  const canDrag = segment.type === "pickup" || segment.type === "tour";

  // Extract booking IDs for drag data
  const bookingIds = React.useMemo(() => {
    if (segment.type === "pickup" && segment.booking?.id) {
      return [segment.booking.id];
    }
    if (segment.type === "tour" && segment.bookingIds?.length) {
      return segment.bookingIds;
    }
    return undefined;
  }, [segment]);

  // Get tour run ID
  const tourRunId = segment.type === "tour" && "scheduleId" in segment
    ? segment.scheduleId || segment.id
    : segment.id;

  // Get guest count for capacity validation during drag
  const guestCount = React.useMemo(() => {
    if (segment.type === "pickup") {
      return segment.guestCount ?? 0;
    }
    if (segment.type === "tour") {
      return segment.totalGuests ?? 0;
    }
    return 0;
  }, [segment]);

  // Draggable setup - always call hook but disable based on conditions
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: segment.id,
    data: {
      type: "segment",
      segmentId: segment.id,
      guideId: guide.id,
      tourRunId,
      segmentType: segment.type,
      bookingIds,
      // Include CURRENT display times for time-shift tracking
      // (accounts for any pending time shifts)
      startTime: displayStartTime,
      endTime: displayEndTime,
      durationMinutes: segment.durationMinutes,
      // Include guest count for capacity validation
      guestCount,
    },
    disabled: !isAdjustMode || !canDrag,
  });

  // Transform style for dragging
  const dragStyle: React.CSSProperties = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
      }
    : {};

  // Combined positioning style
  const positionStyle: React.CSSProperties = {
    left: `${clampedLeft}%`,
    width: `${clampedWidth}%`,
    ...dragStyle,
  };

  // Show context menu only for interactive segments (tour/pickup)
  const showContextMenu = segment.type === "tour" || segment.type === "pickup";

  // Z-index layering: idle/drive (1) < tour/pickup (10) < dragging (50)
  const segmentZIndex = segment.type === "idle" || segment.type === "drive" ? "z-[1]" : "z-10";

  const segmentElement = (
    <div
      ref={setNodeRef}
      {...(isAdjustMode && canDrag ? { ...attributes, ...listeners } : {})}
      className={cn(
        "absolute top-0 h-full group",
        // Z-index layering based on segment type
        segmentZIndex,
        // Container query support for responsive segments
        "@container",
        isDragging && "opacity-50 z-50",
        isAdjustMode && canDrag && "cursor-grab active:cursor-grabbing",
        // Adjust mode glow animation for draggable segments
        isAdjustMode && canDrag && !isDragging && !hasTimeShift && "animate-adjust-glow",
        // Time shift styling - dashed border and subtle animation
        hasTimeShift && [
          "ring-2 ring-primary/50",
          "animate-pulse",
        ]
      )}
      style={positionStyle}
      role="option"
      aria-selected={isSelected}
      aria-label={isAdjustMode && canDrag ? "Drag to reassign or drop on hopper to unassign" : undefined}
    >
      {/* Time Shift Indicator Badge */}
      {hasTimeShift && pendingTimeShift && (
        <Badge
          variant="secondary"
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 z-20",
            "h-5 px-1.5 text-[10px] font-semibold",
            "bg-primary text-primary-foreground",
            "shadow-sm pointer-events-none",
            "flex items-center gap-1 whitespace-nowrap"
          )}
        >
          <Clock className="h-2.5 w-2.5" />
          {formatTimeDisplay(pendingTimeShift.newStartTime)}
        </Badge>
      )}

      {/* Segment Content */}
      <SegmentContent
        segment={segment}
        isSelected={isSelected}
        onClick={onClick}
        isDragging={isDragging}
        hasTimeShift={hasTimeShift}
        displayStartTime={displayStartTime}
        displayEndTime={displayEndTime}
      />

      {/* Unassign Button - appears on hover in adjust mode */}
      {isAdjustMode && canDrag && !isDragging && bookingId && (
        <button
          type="button"
          onClick={handleUnassign}
          disabled={isPending}
          className={cn(
            "absolute -top-1.5 -right-1.5 z-20",
            "flex items-center justify-center",
            "w-5 h-5 rounded-full",
            "bg-destructive text-destructive-foreground",
            "shadow-md border-2 border-background",
            "opacity-0 hover:opacity-100 group-hover:opacity-100",
            "hover:scale-110 active:scale-95",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-destructive",
            isPending && "opacity-100 cursor-wait"
          )}
          aria-label="Remove from guide"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Loading overlay when pending */}
      {isPending && (
        <div className="absolute inset-0 bg-background/50 rounded-sm flex items-center justify-center z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );

  // Wrap in context menu for tour/pickup segments
  if (showContextMenu) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {segmentElement}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() => onViewDetails?.(segment)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </ContextMenuItem>
          {isAdjustMode && (
            <ContextMenuItem
              onClick={() => onReassign?.(segment)}
              className="gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Reassign Guide
            </ContextMenuItem>
          )}
          {isAdjustMode && bookingId && (
            <ContextMenuItem
              onClick={handleUnassign}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <UserMinus className="h-4 w-4" />
              Unassign
            </ContextMenuItem>
          )}
          {bookingId && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onViewBooking?.(bookingId)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Booking
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return segmentElement;
}

// =============================================================================
// SEGMENT CONTENT - Visual rendering based on type
// =============================================================================

interface SegmentContentProps {
  segment: TimelineSegment;
  isSelected: boolean;
  onClick?: () => void;
  isDragging: boolean;
  hasTimeShift?: boolean;
  /** Display start time (may differ from segment.startTime if time-shifted) */
  displayStartTime?: string;
  /** Display end time (may differ from segment.endTime if time-shifted) */
  displayEndTime?: string;
}

function SegmentContent({ segment, isSelected, onClick, isDragging, hasTimeShift, displayStartTime, displayEndTime }: SegmentContentProps) {
  // Use display times if provided (for time-shifted segments), otherwise use segment times
  const effectiveStartTime = displayStartTime ?? segment.startTime;
  const effectiveEndTime = displayEndTime ?? segment.endTime;

  const content = React.useMemo(() => {
    switch (segment.type) {
      case "tour":
        return <TourContent segment={segment} displayStartTime={effectiveStartTime} displayEndTime={effectiveEndTime} />;
      case "pickup":
        return <PickupContent segment={segment} displayStartTime={effectiveStartTime} />;
      case "drive":
        return <DriveContent segment={segment} />;
      case "idle":
        return <IdleContent segment={segment} />;
      default:
        return null;
    }
  }, [segment, effectiveStartTime, effectiveEndTime]);

  const tooltipContent = React.useMemo(() => {
    switch (segment.type) {
      case "tour":
        return <TourTooltip segment={segment} displayStartTime={effectiveStartTime} displayEndTime={effectiveEndTime} />;
      case "pickup":
        return <PickupTooltip segment={segment} displayStartTime={effectiveStartTime} />;
      case "drive":
        return <DriveTooltip segment={segment} />;
      case "idle":
        return <IdleTooltip segment={segment} />;
      default:
        return null;
    }
  }, [segment, effectiveStartTime, effectiveEndTime]);

  // Don't show tooltip while dragging
  if (isDragging) {
    return (
      <div
        className={cn(
          "h-full w-full rounded-sm transition-all duration-150",
          isSelected && "ring-2 ring-ring",
          hasTimeShift && "border-2 border-dashed border-primary/70"
        )}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-full w-full rounded-sm transition-all duration-150 ease-out",
            onClick && "cursor-pointer",
            // Enhanced hover states with glow effect
            onClick && [
              "hover:scale-[1.03] hover:shadow-lg hover:z-10",
              "hover:ring-2 hover:ring-white/20",
              "active:scale-[0.98] active:shadow-sm"
            ],
            isSelected && "ring-2 ring-ring shadow-lg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasTimeShift && "border-2 border-dashed border-primary/70"
          )}
          onClick={onClick}
          onKeyDown={(e) => {
            if (onClick && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onClick();
            }
          }}
          tabIndex={onClick ? 0 : undefined}
          role={onClick ? "button" : undefined}
        >
          {content}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm p-0">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

SegmentLane.displayName = "SegmentLane";
