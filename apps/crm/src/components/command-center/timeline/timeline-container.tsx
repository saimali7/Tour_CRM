"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TimelineHeader } from "./timeline-header";
import { GuideRow } from "./guide-row";
import { DroppableGuideRow } from "../adjust-mode";
import { getGuideFullName } from "./types";
import type { GuideTimeline, TimelineSegment, GuideInfo } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineContainerProps {
  /**
   * Array of guide timelines to display
   * Use this prop for the standard format
   */
  timelines?: GuideTimeline[];

  /**
   * Array of guide timelines (legacy format)
   * @deprecated Use `timelines` instead
   */
  guideTimelines?: GuideTimeline[];

  /**
   * Start hour of the timeline (e.g., 6 for 6 AM)
   * @default 6
   */
  startHour?: number;

  /**
   * End hour of the timeline (e.g., 20 for 8 PM)
   * @default 20
   */
  endHour?: number;

  /**
   * Callback when a segment is clicked
   */
  onSegmentClick?: (segment: TimelineSegment, guide: GuideInfo) => void;

  /**
   * Callback when a guide row is clicked
   */
  onGuideClick?: (guide: GuideInfo) => void;

  /**
   * Currently selected segment ID
   */
  selectedSegmentId?: string | null;

  /**
   * Width of the guide info column in pixels
   * @default 200
   */
  guideColumnWidth?: number;

  /**
   * Show vertical grid lines at each hour
   * @default true
   */
  showGridLines?: boolean;

  /**
   * Whether the timeline is locked (e.g., after dispatch)
   * When locked, segments are not interactive
   * @default false
   */
  isLocked?: boolean;

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
// TIMELINE CONTAINER COMPONENT
// =============================================================================

export function TimelineContainer({
  timelines: timelinesProp,
  guideTimelines,
  startHour = 6,
  endHour = 20,
  onSegmentClick,
  onGuideClick,
  selectedSegmentId,
  guideColumnWidth = 200,
  showGridLines = true,
  isLocked = false,
  isAdjustMode = false,
  className,
}: TimelineContainerProps) {
  // Support both `timelines` and legacy `guideTimelines` prop
  const timelines = timelinesProp ?? guideTimelines ?? [];
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Handle horizontal scroll to update header shadow
  const handleScroll = React.useCallback(() => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollLeft > 0);
    }
  }, []);

  // Set up scroll listener
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Calculate the number of hours to display
  const totalHours = endHour - startHour;

  // Empty state
  if (timelines.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12",
          className
        )}
      >
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No guide schedules to display
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assign guides to tours to see their timelines here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card",
        isLocked && "opacity-90 pointer-events-auto",
        className
      )}
      aria-disabled={isLocked}
    >
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        style={{
          // Minimum width to ensure timeline is readable
          minWidth: "100%",
        }}
      >
        {/* Inner container with minimum width based on hours */}
        <div
          style={{
            // Each hour takes at least 80px, plus guide column
            minWidth: `${guideColumnWidth + totalHours * 80}px`,
          }}
        >
          {/* Sticky header with time axis */}
          <div
            className={cn(
              "sticky top-0 z-20 border-b bg-card transition-shadow duration-150",
              isScrolled && "shadow-sm"
            )}
          >
            <TimelineHeader
              startHour={startHour}
              endHour={endHour}
              guideColumnWidth={guideColumnWidth}
              showGridLines={showGridLines}
            />
          </div>

          {/* Guide rows */}
          <div className="relative">
            {/* Vertical grid lines */}
            {showGridLines && (
              <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{ marginLeft: `${guideColumnWidth}px` }}
                aria-hidden="true"
              >
                <div className="relative h-full w-full">
                  {Array.from({ length: totalHours + 1 }).map((_, index) => {
                    const percent = (index / totalHours) * 100;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "absolute top-0 h-full w-px",
                          index === 0 || index === totalHours
                            ? "bg-border"
                            : "bg-border/50"
                        )}
                        style={{ left: `${percent}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guide rows list */}
            <div className="relative z-10 divide-y divide-border">
              {timelines.map((timeline) => (
                <DroppableGuideRow
                  key={timeline.guide.id}
                  guideId={timeline.guide.id}
                  guideName={getGuideFullName(timeline.guide)}
                  vehicleCapacity={timeline.guide.vehicleCapacity}
                >
                  <GuideRow
                    guide={timeline.guide}
                    timeline={timeline}
                    startHour={startHour}
                    endHour={endHour}
                    guideColumnWidth={guideColumnWidth}
                    selectedSegmentId={selectedSegmentId}
                    onSegmentClick={
                      !isLocked && onSegmentClick
                        ? (segment) => onSegmentClick(segment, timeline.guide)
                        : undefined
                    }
                    onGuideClick={!isLocked ? onGuideClick : undefined}
                    isAdjustMode={isAdjustMode}
                  />
                </DroppableGuideRow>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Left edge shadow when scrolled */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-30 w-4 bg-gradient-to-r from-card to-transparent opacity-0 transition-opacity duration-150",
          isScrolled && "opacity-100"
        )}
        style={{ left: `${guideColumnWidth}px` }}
        aria-hidden="true"
      />
    </div>
  );
}

TimelineContainer.displayName = "TimelineContainer";
