"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Car, Users } from "lucide-react";
import { SegmentLane } from "./segment-lane";
import type { GuideTimeline, TimelineSegment, GuideInfo } from "./types";
import { getGuideFullName, formatDuration } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface GuideRowProps {
  /**
   * Guide information
   */
  guide: GuideInfo;

  /**
   * The guide's timeline data
   */
  timeline: GuideTimeline;

  /**
   * Start hour of the timeline (e.g., 6 for 6 AM)
   */
  startHour: number;

  /**
   * End hour of the timeline (e.g., 20 for 8 PM)
   */
  endHour: number;

  /**
   * Width of the guide info column in pixels
   * @default 200
   */
  guideColumnWidth?: number;

  /**
   * Currently selected segment ID
   */
  selectedSegmentId?: string | null;

  /**
   * Callback when a segment is clicked
   */
  onSegmentClick?: (segment: TimelineSegment) => void;

  /**
   * Callback when the guide info area is clicked
   */
  onGuideClick?: (guide: GuideInfo) => void;

  /**
   * Whether adjust mode is active
   * When active, segments can be dragged to reassign guides
   * @default false
   */
  isAdjustMode?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// GUIDE ROW COMPONENT
// =============================================================================

/**
 * Renders a single guide's row in the timeline
 *
 * Left side: Guide info (name, vehicle capacity, avatar)
 * Right side: Timeline bar with segments
 */
export function GuideRow({
  guide,
  timeline,
  startHour,
  endHour,
  guideColumnWidth = 200,
  selectedSegmentId,
  onSegmentClick,
  onGuideClick,
  isAdjustMode = false,
  className,
}: GuideRowProps) {
  const fullName = getGuideFullName(guide);

  // Calculate utilization color
  const utilizationColor = getUtilizationColor(timeline.utilization);

  // Calculate capacity status for the vertical meter
  const capacityUtilization = guide.vehicleCapacity > 0
    ? (timeline.totalGuests / guide.vehicleCapacity) * 100
    : 0;
  const capacityMeterColor = getCapacityMeterColor(capacityUtilization);

  return (
    <div
      className={cn(
        "group relative flex min-h-[60px] items-stretch transition-all duration-150 ease-out",
        "hover:bg-muted/40",
        className
      )}
      role="row"
      aria-label={`${fullName}'s schedule`}
    >
      {/* Vertical Capacity Meter - shows guest capacity at a glance */}
      <div
        className={cn(
          "absolute left-0 top-1 bottom-1 w-1 rounded-full transition-colors duration-200",
          capacityMeterColor
        )}
        aria-hidden="true"
        title={`${timeline.totalGuests}/${guide.vehicleCapacity} capacity`}
      />
      {/* Guide Info Column */}
      <div
        className={cn(
          "flex flex-shrink-0 items-center gap-2 border-r bg-card px-2 py-1.5 transition-all duration-150 ease-out",
          onGuideClick && "cursor-pointer hover:bg-muted/50 active:bg-muted/70",
          onGuideClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
        style={{ width: `${guideColumnWidth}px` }}
        onClick={() => onGuideClick?.(guide)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onGuideClick?.(guide);
          }
        }}
        tabIndex={onGuideClick ? 0 : undefined}
        role="gridcell"
        aria-label={`View ${fullName}'s details`}
      >
        {/* Avatar */}
        <UserAvatar
          name={fullName}
          src={guide.avatarUrl}
          size="sm"
          className="flex-shrink-0"
        />

        {/* Guide Details */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Name */}
          <span className="truncate text-xs font-medium text-foreground leading-tight">
            {fullName}
          </span>

          {/* Metadata Row - simplified with visual grouping */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {/* Capacity: guests / vehicle seats */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                    "bg-muted/50 hover:bg-muted transition-colors"
                  )}>
                    <Users className="h-2.5 w-2.5" aria-hidden="true" />
                    <span className="font-mono font-medium tabular-nums">
                      {timeline.totalGuests}/{guide.vehicleCapacity}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <span className="font-semibold">{timeline.totalGuests}</span> guests assigned
                  <br />
                  <span className="text-muted-foreground">
                    Vehicle capacity: {guide.vehicleCapacity} seats
                    {guide.vehicleDescription && ` (${guide.vehicleDescription})`}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Drive Time - only show if > 0 */}
            {timeline.totalDriveMinutes > 0 && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground/70">
                      <Car className="h-2.5 w-2.5" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{formatDuration(timeline.totalDriveMinutes)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {formatDuration(timeline.totalDriveMinutes)} total drive time
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Utilization Bar - larger and more readable */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  "bg-gradient-to-r",
                  utilizationColor
                )}
                style={{ width: `${Math.min(100, timeline.utilization)}%` }}
                role="progressbar"
                aria-valuenow={timeline.utilization}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Utilization"
              />
            </div>
            <span className={cn(
              "text-[10px] font-semibold tabular-nums min-w-[28px] text-right",
              timeline.utilization >= 80 ? "text-emerald-500" :
              timeline.utilization >= 50 ? "text-blue-500" :
              timeline.utilization >= 25 ? "text-amber-500" :
              "text-muted-foreground"
            )}>
              {Math.round(timeline.utilization)}%
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Area - no padding to ensure alignment with header grid lines */}
      <div
        className="relative flex flex-1 items-center"
        role="gridcell"
        aria-label={`${fullName}'s timeline`}
      >
        <SegmentLane
          segments={timeline.segments}
          guide={guide}
          startHour={startHour}
          endHour={endHour}
          selectedSegmentId={selectedSegmentId}
          onSegmentClick={onSegmentClick}
          isAdjustMode={isAdjustMode}
        />
      </div>
    </div>
  );
}

GuideRow.displayName = "GuideRow";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the color class for the utilization bar with gradient support
 */
function getUtilizationColor(utilization: number): string {
  if (utilization >= 80) {
    return "from-emerald-400 to-emerald-500";
  }
  if (utilization >= 50) {
    return "from-blue-400 to-blue-500";
  }
  if (utilization >= 25) {
    return "from-amber-400 to-amber-500";
  }
  return "from-muted-foreground/40 to-muted-foreground/50";
}

/**
 * Get the color class for the vertical capacity meter
 * Based on guest count vs vehicle capacity
 */
function getCapacityMeterColor(capacityPercent: number): string {
  if (capacityPercent >= 100) {
    // Over capacity - pulsing red
    return "bg-red-500 animate-pulse";
  }
  if (capacityPercent >= 90) {
    // Near capacity - warning amber
    return "bg-amber-500";
  }
  if (capacityPercent >= 70) {
    // Good utilization - blue
    return "bg-blue-500";
  }
  if (capacityPercent >= 40) {
    // Moderate load - emerald
    return "bg-emerald-500";
  }
  // Light load - muted
  return "bg-muted-foreground/30";
}
