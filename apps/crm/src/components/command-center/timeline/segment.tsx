"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IdleSegment as IdleSegmentComponent } from "./idle-segment";
import { DriveSegment as DriveSegmentComponent } from "./drive-segment";
import { PickupSegment as PickupSegmentComponent } from "./pickup-segment";
import { TourSegment as TourSegmentComponent } from "./tour-segment";
import type {
  TimelineSegment,
  IdleSegment,
  DriveSegment,
  PickupSegment,
  TourSegment,
} from "./types";
import { timeToPercent, segmentWidthPercent } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface SegmentProps {
  /**
   * The segment data to render
   */
  segment: TimelineSegment;

  /**
   * Start hour of the timeline
   */
  startHour: number;

  /**
   * End hour of the timeline
   */
  endHour: number;

  /**
   * Whether this segment is currently selected
   */
  isSelected?: boolean;

  /**
   * Click handler for the segment
   */
  onClick?: () => void;

  /**
   * Whether adjust mode is active (for styling)
   */
  isAdjustMode?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// SEGMENT COMPONENT
// =============================================================================

/**
 * Base segment component that calculates position and delegates to type-specific components
 *
 * Handles:
 * - Position calculation based on start/end times
 * - Width calculation based on duration
 * - Rendering the appropriate segment type component
 */
export function Segment({
  segment,
  startHour,
  endHour,
  isSelected = false,
  onClick,
  isAdjustMode = false,
  className,
}: SegmentProps) {
  // Calculate position and width
  const leftPercent = timeToPercent(segment.startTime, startHour, endHour);
  const widthPercent = segmentWidthPercent(
    segment.startTime,
    segment.endTime,
    startHour,
    endHour
  );

  // Common props for all segment types
  const commonProps = {
    isSelected,
    onClick,
    className,
  };

  // Render the appropriate segment type
  const renderSegment = () => {
    switch (segment.type) {
      case "idle":
        return (
          <IdleSegmentComponent
            segment={segment as IdleSegment}
            {...commonProps}
          />
        );
      case "drive":
        return (
          <DriveSegmentComponent
            segment={segment as DriveSegment}
            {...commonProps}
          />
        );
      case "pickup":
        return (
          <PickupSegmentComponent
            segment={segment as PickupSegment}
            {...commonProps}
          />
        );
      case "tour":
        return (
          <TourSegmentComponent
            segment={segment as TourSegment}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="absolute top-0 h-full"
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`, // Minimum width for visibility
      }}
    >
      {renderSegment()}
    </div>
  );
}

Segment.displayName = "Segment";

// =============================================================================
// SHARED SEGMENT WRAPPER
// =============================================================================

interface SegmentWrapperProps {
  /**
   * Segment type for styling
   */
  type: TimelineSegment["type"];

  /**
   * Whether segment is selected
   */
  isSelected?: boolean;

  /**
   * Whether segment is interactive (clickable)
   */
  isInteractive?: boolean;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Inline styles (for zone colors, etc.)
   */
  style?: React.CSSProperties;

  /**
   * Children to render inside the segment
   */
  children: React.ReactNode;

  /**
   * Accessible label for the segment
   */
  ariaLabel?: string;
}

/**
 * Shared wrapper component for all segment types
 * Provides consistent interaction states and accessibility
 */
export function SegmentWrapper({
  type,
  isSelected = false,
  isInteractive = true,
  onClick,
  className,
  style,
  children,
  ariaLabel,
}: SegmentWrapperProps) {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (isInteractive && onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    },
    [isInteractive, onClick]
  );

  return (
    <div
      className={cn(
        // Base styles
        "h-full rounded-sm transition-all duration-150",
        // Interactive styles
        isInteractive && [
          "cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        ],
        // Selected state
        isSelected && "ring-2 ring-ring ring-offset-1",
        // Hover state
        isInteractive && "hover:scale-[1.02]",
        // Active state
        isInteractive && "active:scale-[0.98]",
        className
      )}
      style={style}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? "button" : undefined}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
    >
      {children}
    </div>
  );
}

SegmentWrapper.displayName = "SegmentWrapper";
