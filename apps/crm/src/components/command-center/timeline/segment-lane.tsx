"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useAdjustMode, type PendingTimeShiftChange } from "../adjust-mode/adjust-mode-context";
import { GripVertical, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimelineSegment, GuideInfo } from "./types";
import { timeToPercent, segmentWidthPercent, formatTimeDisplay, formatDuration, confidenceColors, getZoneColorFromName } from "./types";
import { Users, MapPin, Calendar, Car, Cake, Star } from "lucide-react";

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
  isAdjustMode,
}: SegmentItemProps) {
  const { addPendingChange, getTimeShiftForSegment } = useAdjustMode();

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
    return undefined;
  }, [segment]);

  // Get tour run ID
  const tourRunId = segment.type === "tour" && "scheduleId" in segment
    ? segment.scheduleId || segment.id
    : segment.id;

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
      // Include times for time-shift tracking
      startTime: segment.startTime,
      endTime: segment.endTime,
      durationMinutes: segment.durationMinutes,
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute top-0 h-full",
        isDragging && "opacity-50 z-50",
        isAdjustMode && canDrag && "group/draggable",
        // Time shift styling - dashed border and subtle animation
        hasTimeShift && [
          "ring-2 ring-primary/50 ring-offset-1",
          "animate-pulse",
        ]
      )}
      style={positionStyle}
      role="option"
      aria-selected={isSelected}
    >
      {/* Time Shift Indicator Badge */}
      {hasTimeShift && (
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
          {pendingTimeShift?.newStartTime}
        </Badge>
      )}

      {/* Drag Handle - Only visible in adjust mode for draggable segments */}
      {isAdjustMode && canDrag && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-1 top-1/2 -translate-y-1/2 z-10",
            "flex items-center justify-center",
            "w-4 h-6 rounded-sm",
            "bg-background border shadow-sm",
            // Only capture pointer events when visible (on hover or dragging)
            "pointer-events-none group-hover/draggable:pointer-events-auto",
            "opacity-0 group-hover/draggable:opacity-100",
            "transition-opacity duration-150",
            "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-100 pointer-events-auto"
          )}
          aria-label="Drag to reassign"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Segment Content */}
      <SegmentContent
        segment={segment}
        isSelected={isSelected}
        onClick={onClick}
        isDragging={isDragging}
        hasTimeShift={hasTimeShift}
      />
    </div>
  );
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
}

function SegmentContent({ segment, isSelected, onClick, isDragging, hasTimeShift }: SegmentContentProps) {
  const content = React.useMemo(() => {
    switch (segment.type) {
      case "tour":
        return <TourContent segment={segment} />;
      case "pickup":
        return <PickupContent segment={segment} />;
      case "drive":
        return <DriveContent segment={segment} />;
      case "idle":
        return <IdleContent segment={segment} />;
      default:
        return null;
    }
  }, [segment]);

  const tooltipContent = React.useMemo(() => {
    switch (segment.type) {
      case "tour":
        return <TourTooltip segment={segment} />;
      case "pickup":
        return <PickupTooltip segment={segment} />;
      case "drive":
        return <DriveTooltip segment={segment} />;
      case "idle":
        return <IdleTooltip segment={segment} />;
      default:
        return null;
    }
  }, [segment]);

  // Don't show tooltip while dragging
  if (isDragging) {
    return (
      <div
        className={cn(
          "h-full w-full rounded-sm transition-all duration-150",
          isSelected && "ring-2 ring-ring ring-offset-1",
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
            "h-full w-full rounded-sm transition-all duration-150",
            onClick && "cursor-pointer",
            onClick && "hover:scale-[1.02] active:scale-[0.98]",
            isSelected && "ring-2 ring-ring ring-offset-1",
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

// =============================================================================
// TOUR CONTENT
// =============================================================================

function TourContent({ segment }: { segment: Extract<TimelineSegment, { type: "tour" }> }) {
  const colors = confidenceColors[segment.confidence];
  const startTime = formatTimeDisplay(segment.startTime);
  const endTime = formatTimeDisplay(segment.endTime);

  return (
    <div
      className={cn(
        "h-full w-full rounded-sm",
        colors.bg,
        "text-white shadow-md",
        "bg-gradient-to-b from-white/10 to-transparent"
      )}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0 opacity-80" />
          <span className="truncate text-xs font-semibold">{segment.tour.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] opacity-80">
          <span className="tabular-nums">{startTime}</span>
          <span className="flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            <span className="tabular-nums">{segment.totalGuests}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function TourTooltip({ segment }: { segment: Extract<TimelineSegment, { type: "tour" }> }) {
  const colors = confidenceColors[segment.confidence];
  return (
    <div className="divide-y divide-border">
      <div className={cn("px-3 py-2", colors.bg, "text-white")}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{segment.tour.name}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {segment.totalGuests} guests
          </span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}</span>
          <span className="text-muted-foreground">({formatDuration(segment.durationMinutes)})</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PICKUP CONTENT
// =============================================================================

function PickupContent({ segment }: { segment: Extract<TimelineSegment, { type: "pickup" }> }) {
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280";
  const colors = confidenceColors[segment.confidence];

  return (
    <div
      className={cn(
        "h-full w-full rounded-sm shadow-sm",
        !useZoneColor && colors.bg,
        !useZoneColor && "text-white"
      )}
      style={useZoneColor ? { backgroundColor: zoneColor, color: "#FFFFFF" } : undefined}
    >
      <div className="flex h-full items-center justify-between gap-1 overflow-hidden px-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <MapPin className="h-3 w-3 shrink-0 opacity-80" />
          <span className="truncate text-[10px] font-medium">
            {segment.pickupZoneName || segment.pickupLocation}
          </span>
        </div>
        <div className="shrink-0 rounded-full px-1.5 py-0.5 bg-white/20 text-[10px] font-bold tabular-nums">
          {segment.guestCount}
        </div>
        {(segment.hasSpecialOccasion || segment.isFirstTimer) && (
          <div className="flex items-center gap-0.5">
            {segment.hasSpecialOccasion && <Cake className="h-2.5 w-2.5 opacity-80" />}
            {segment.isFirstTimer && <Star className="h-2.5 w-2.5 opacity-80" />}
          </div>
        )}
      </div>
    </div>
  );
}

function PickupTooltip({ segment }: { segment: Extract<TimelineSegment, { type: "pickup" }> }) {
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280";
  const colors = confidenceColors[segment.confidence];
  const customerName = segment.booking.customer
    ? `${segment.booking.customer.firstName} ${segment.booking.customer.lastName}`
    : "Guest";

  return (
    <div className="divide-y divide-border">
      <div
        className={cn("px-3 py-2", !useZoneColor && colors.bg, !useZoneColor && "text-white")}
        style={useZoneColor ? { backgroundColor: zoneColor, color: "#FFFFFF" } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{customerName}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {segment.guestCount} guests
          </span>
        </div>
        <div className="mt-0.5 text-xs opacity-90">#{segment.booking.referenceNumber}</div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{segment.pickupLocation}</div>
            {segment.pickupZoneName && segment.pickupZoneName !== segment.pickupLocation && (
              <div className="text-xs text-muted-foreground">{segment.pickupZoneName}</div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Pickup: {formatTimeDisplay(segment.startTime)}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {segment.booking.adultCount} {segment.booking.adultCount === 1 ? "Adult" : "Adults"}
            {segment.booking.childCount && segment.booking.childCount > 0 && (
              <>, {segment.booking.childCount} {segment.booking.childCount === 1 ? "Child" : "Children"}</>
            )}
          </span>
        </div>
        {segment.booking.specialOccasion && (
          <div className="flex items-center gap-2 text-xs">
            <Cake className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600">{segment.booking.specialOccasion}</span>
          </div>
        )}
        {segment.isFirstTimer && (
          <div className="flex items-center gap-2 text-xs">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-yellow-600">First time with us</span>
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 text-center text-xs text-muted-foreground">
        Click for full details
      </div>
    </div>
  );
}

// =============================================================================
// DRIVE CONTENT
// =============================================================================

function DriveContent({ segment }: { segment: Extract<TimelineSegment, { type: "drive" }> }) {
  return (
    <div className="flex h-full items-center">
      <div className="h-3 w-full rounded-full bg-muted-foreground/30">
        {segment.durationMinutes >= 10 && (
          <div className="flex h-full items-center justify-center">
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap">
              <Car className="h-2.5 w-2.5" />
              <span className="tabular-nums">{formatDuration(segment.durationMinutes)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DriveTooltip({ segment }: { segment: Extract<TimelineSegment, { type: "drive" }> }) {
  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Car className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">Drive Time</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {formatDuration(segment.durationMinutes)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}
      </div>
    </div>
  );
}

// =============================================================================
// IDLE CONTENT
// =============================================================================

function IdleContent({ segment }: { segment: Extract<TimelineSegment, { type: "idle" }> }) {
  return (
    <div className="h-full w-full rounded-sm bg-muted/40 border border-dashed border-muted-foreground/20 opacity-60">
      {segment.durationMinutes > 30 && (
        <div className="flex h-full items-center justify-center">
          <span className="text-[10px] text-muted-foreground/40 select-none">...</span>
        </div>
      )}
    </div>
  );
}

function IdleTooltip({ segment }: { segment: Extract<TimelineSegment, { type: "idle" }> }) {
  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">Available</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatDuration(segment.durationMinutes)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}
      </div>
    </div>
  );
}

SegmentLane.displayName = "SegmentLane";
