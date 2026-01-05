"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimelineHeader } from "./timeline-header";
import { GuideRow } from "./guide-row";
import { DroppableGuideRow } from "../adjust-mode";
import { getGuideFullName, timeToPercent, generateHourMarkers } from "./types";
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
   * Ref for the timeline content area (used for time calculations in drag/drop)
   */
  timelineContentRef?: React.RefObject<HTMLDivElement | null>;

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
  startHour = 7,
  endHour = 20,
  onSegmentClick,
  onGuideClick,
  selectedSegmentId,
  guideColumnWidth = 200,
  showGridLines = true,
  isLocked = false,
  isAdjustMode = false,
  timelineContentRef,
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

  // Empty state - visually distinct with helpful guidance
  if (timelines.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-gradient-to-b from-muted/20 to-muted/5 p-12 min-h-[300px]",
          className
        )}
      >
        <div className="text-center space-y-3">
          {/* Icon */}
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-muted-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          {/* Text */}
          <div>
            <p className="text-sm font-semibold text-foreground">
              No schedules yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
              Guides with tour assignments will appear here on the timeline
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="grid"
        aria-label="Guide dispatch timeline"
        aria-readonly={isLocked}
        className={cn(
          "relative flex flex-col rounded-lg border bg-card h-full transition-all duration-200",
          isLocked && "opacity-90 pointer-events-auto",
          // Subtle adjust mode indicator - just a slightly brighter border
          isAdjustMode && "border-border",
          className
        )}
        aria-disabled={isLocked}
      >
        {/* Removed: Adjust mode overlay tint was too prominent */}
        {/* Scrollable container - both horizontal and vertical */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-auto"
        >
          {/* Inner container with minimum width based on hours */}
          <div
            ref={timelineContentRef}
            className="flex flex-col min-h-full"
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

            {/* Guide rows - flex-1 ensures it fills remaining space for full-height gridlines */}
            <div className="relative flex-1">
              {/* Grid lines - vertical (hours) and horizontal (rows) */}
              {showGridLines && (
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  aria-hidden="true"
                >
                  {/* Horizontal row lines - span full width */}
                  <div className="absolute inset-0">
                    {Array.from({ length: Math.max(8, timelines.length + 1) }).map((_, index) => (
                      <div
                        key={`row-${index}`}
                        className="absolute left-0 right-0 h-px bg-border/40"
                        style={{ top: `${(index + 1) * 60}px` }}
                      />
                    ))}
                  </div>

                  {/* Vertical hour lines - only in timeline area */}
                  <div
                    className="absolute inset-0"
                    style={{ marginLeft: `${guideColumnWidth}px` }}
                  >
                    <div className="relative h-full w-full">
                      {/* Hour lines - use same calculation as header for exact alignment */}
                      {generateHourMarkers(startHour, endHour).map((marker, index, arr) => {
                        const isFirst = index === 0;
                        const isLast = index === arr.length - 1;
                        return (
                          <div
                            key={marker.hour}
                            className={cn(
                              "absolute top-0 h-full w-px",
                              isFirst || isLast
                                ? "bg-border"
                                : "bg-border/70"
                            )}
                            style={{ left: `${marker.percent}%` }}
                          />
                        );
                      })}

                      {/* 15-minute interval lines (visible in adjust mode) - subtle */}
                      {isAdjustMode &&
                        Array.from({ length: totalHours * 4 }).map((_, index) => {
                          // Skip hour marks (0, 4, 8, etc.)
                          if (index % 4 === 0) return null;

                          // Calculate time for this quarter-hour mark
                          const minutesFromStart = index * 15;
                          const hour = startHour + Math.floor(minutesFromStart / 60);
                          const minute = minutesFromStart % 60;
                          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                          const percent = timeToPercent(timeString, startHour, endHour);

                          const isHalfHour = index % 2 === 0;

                          // Only show half-hour marks, skip 15/45 minute marks for cleaner UI
                          if (!isHalfHour) return null;

                          return (
                            <div
                              key={`quarter-${index}`}
                              className="absolute top-0 h-full w-px bg-border/50"
                              style={{ left: `${percent}%` }}
                            />
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Current time indicator spanning all rows */}
              <CurrentTimeIndicatorOverlay
                startHour={startHour}
                endHour={endHour}
                guideColumnWidth={guideColumnWidth}
              />

              {/* Guide rows list */}
              <div className="relative z-10 divide-y divide-border">
                {timelines.map((timeline, index) => (
                  <DroppableGuideRow
                    key={`${timeline.guide.id}-${index}`}
                    rowId={`${timeline.guide.id}-${index}`}
                    guideId={timeline.guide.id}
                    guideName={getGuideFullName(timeline.guide)}
                    vehicleCapacity={timeline.guide.vehicleCapacity}
                    currentGuests={timeline.totalGuests}
                    timelineIndex={index}
                    guideColumnWidth={guideColumnWidth}
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

{/* Removed: Left edge gradient shadow was causing glass-like visual artifact */}

        {/* Adjust mode keyboard hint */}
        {isAdjustMode && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 animate-hint-fade-in"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/90 backdrop-blur-sm border border-border/50 shadow-sm">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium text-muted-foreground bg-background rounded border border-border">
                Esc
              </kbd>
              <span className="text-xs text-muted-foreground">
                to exit edit mode
              </span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// CURRENT TIME INDICATOR OVERLAY
// =============================================================================

interface CurrentTimeIndicatorOverlayProps {
  startHour: number;
  endHour: number;
  guideColumnWidth: number;
}

/**
 * Shows a vertical line indicating current time across all guide rows
 */
function CurrentTimeIndicatorOverlay({
  startHour,
  endHour,
  guideColumnWidth,
}: CurrentTimeIndicatorOverlayProps) {
  const [currentPercent, setCurrentPercent] = React.useState<number | null>(null);

  React.useEffect(() => {
    function updateCurrentTime() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      // Check if within range
      if (hours >= startHour && hours < endHour) {
        setCurrentPercent(timeToPercent(timeString, startHour, endHour));
      } else {
        setCurrentPercent(null);
      }
    }

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startHour, endHour]);

  if (currentPercent === null) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{ marginLeft: `${guideColumnWidth}px` }}
      aria-hidden="true"
    >
      <div
        className="absolute top-0 h-full w-0.5 bg-primary/70"
        style={{ left: `${currentPercent}%` }}
      />
    </div>
  );
}

TimelineContainer.displayName = "TimelineContainer";
