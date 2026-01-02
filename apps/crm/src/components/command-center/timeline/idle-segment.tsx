"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SegmentWrapper } from "./segment";
import type { IdleSegment as IdleSegmentType } from "./types";
import { formatDuration, formatTimeDisplay } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface IdleSegmentProps {
  /**
   * The idle segment data
   */
  segment: IdleSegmentType;

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
// IDLE SEGMENT COMPONENT
// =============================================================================

/**
 * Idle/Available segment
 *
 * Represents free time when the guide is available.
 * Light gray, subtle styling to indicate inactive time.
 *
 * Symbol: [][][][][] (subtle pattern)
 */
export function IdleSegment({
  segment,
  isSelected = false,
  onClick,
  className,
}: IdleSegmentProps) {
  const ariaLabel = `Available from ${formatTimeDisplay(segment.startTime)} to ${formatTimeDisplay(segment.endTime)} (${formatDuration(segment.durationMinutes)})`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-full">
            <SegmentWrapper
              type="idle"
              isSelected={isSelected}
              isInteractive={!!onClick}
              onClick={onClick}
              ariaLabel={ariaLabel}
              className={cn(
                // Light gray background - subtle
                "bg-muted/50",
                // Slightly transparent to show grid lines
                "opacity-60",
                // Border for subtle definition
                "border border-dashed border-muted-foreground/20",
                // Reduced hover effect for idle segments
                onClick && "hover:bg-muted/70 hover:opacity-80",
                className
              )}
            >
              {/* Pattern indicator for idle time */}
              <div className="flex h-full items-center justify-center overflow-hidden">
                {/* Show pattern only for segments wider than 30px */}
                <span
                  className="text-[10px] tracking-widest text-muted-foreground/40 select-none"
                  aria-hidden="true"
                >
                  {/* Repeat dots based on duration */}
                  {segment.durationMinutes > 30 && "..."}
                </span>
              </div>
            </SegmentWrapper>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

IdleSegment.displayName = "IdleSegment";
