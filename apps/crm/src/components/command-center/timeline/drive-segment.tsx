"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Car, ArrowRight } from "lucide-react";
import { SegmentWrapper } from "./segment";
import type { DriveSegment as DriveSegmentType } from "./types";
import { formatDuration, formatTimeDisplay } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface DriveSegmentProps {
  /**
   * The drive segment data
   */
  segment: DriveSegmentType;

  /**
   * Whether this segment is currently selected
   */
  isSelected?: boolean;

  /**
   * Click handler for the segment
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// DRIVE SEGMENT COMPONENT
// =============================================================================

/**
 * Drive segment
 *
 * Represents travel time between locations.
 * Dark gray, thin bar that connects pickups.
 * Shows duration on hover.
 *
 * Symbol: ===== (thin connecting line)
 */
export function DriveSegment({
  segment,
  isSelected = false,
  onClick,
  className,
}: DriveSegmentProps) {
  const hasLocations = segment.fromLocation || segment.toLocation;

  const ariaLabel = [
    `Drive time: ${formatDuration(segment.durationMinutes)}`,
    segment.fromLocation && `from ${segment.fromLocation}`,
    segment.toLocation && `to ${segment.toLocation}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-full flex items-center">
            <SegmentWrapper
              type="drive"
              isSelected={isSelected}
              isInteractive={!!onClick}
              onClick={onClick}
              ariaLabel={ariaLabel}
              className={cn(
                // Thin bar in the middle
                "h-3 w-full",
                // Dark gray background
                "bg-muted-foreground/30",
                // Slightly rounded
                "rounded-full",
                // Hover state
                onClick && "hover:bg-muted-foreground/40",
                className
              )}
            >
              {/* Drive time label - show for segments >= 15 min */}
              <div className="flex h-full items-center justify-center overflow-hidden px-1">
                {segment.durationMinutes >= 10 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/80 select-none whitespace-nowrap">
                    <Car className="h-2.5 w-2.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {formatDuration(segment.durationMinutes)}
                    </span>
                  </span>
                )}
              </div>
            </SegmentWrapper>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Car className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">Drive Time</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                {formatDuration(segment.durationMinutes)}
              </span>
            </div>

            {/* Time range */}
            <div className="text-xs text-muted-foreground">
              {formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}
            </div>

            {/* Route info */}
            {hasLocations && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {segment.fromLocation && (
                  <span className="truncate max-w-[100px]">{segment.fromLocation}</span>
                )}
                <ArrowRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                {segment.toLocation && (
                  <span className="truncate max-w-[100px]">{segment.toLocation}</span>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

DriveSegment.displayName = "DriveSegment";
