"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { generateHourMarkers } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface TimelineHeaderProps {
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
   */
  guideColumnWidth: number;

  /**
   * Show vertical guide lines at each hour
   * @default true
   */
  showGridLines?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// TIMELINE HEADER COMPONENT
// =============================================================================

/**
 * Renders the time axis header for the timeline
 *
 * Displays hour markers (7AM, 8AM, 9AM, etc.) with vertical guide lines.
 * Sticky to top when scrolling.
 */
export function TimelineHeader({
  startHour,
  endHour,
  guideColumnWidth,
  showGridLines = true,
  className,
}: TimelineHeaderProps) {
  const hourMarkers = React.useMemo(
    () => generateHourMarkers(startHour, endHour),
    [startHour, endHour]
  );

  const totalHours = endHour - startHour;

  return (
    <div
      className={cn("flex h-10 items-end", className)}
      role="row"
      aria-label="Timeline hours"
    >
      {/* Guide column placeholder */}
      <div
        className="flex-shrink-0 border-r bg-muted/30 px-3 py-2"
        style={{ width: `${guideColumnWidth}px` }}
        role="columnheader"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Guides
        </span>
      </div>

      {/* Time axis */}
      <div className="relative flex-1" role="row">
        {/* Hour markers */}
        <div className="relative h-full">
          {hourMarkers.map((marker, index) => {
            const isFirst = index === 0;
            const isLast = index === hourMarkers.length - 1;

            return (
              <div
                key={marker.hour}
                className="absolute bottom-0 -translate-x-1/2 transform"
                style={{ left: `${marker.percent}%` }}
                role="columnheader"
                aria-label={`${marker.hour}:00`}
              >
                {/* Hour label */}
                <div
                  className={cn(
                    "pb-2 text-xs font-medium tabular-nums",
                    isFirst || isLast
                      ? "text-muted-foreground"
                      : "text-muted-foreground/80"
                  )}
                >
                  {marker.label}
                </div>

                {/* Tick mark */}
                {showGridLines && (
                  <div
                    className={cn(
                      "absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 transform",
                      isFirst || isLast ? "bg-border" : "bg-border/70"
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}

          {/* Half-hour markers (smaller) */}
          {Array.from({ length: totalHours }).map((_, index) => {
            const halfHourPercent = ((index + 0.5) / totalHours) * 100;

            return (
              <div
                key={`half-${index}`}
                className="absolute bottom-0 -translate-x-1/2 transform"
                style={{ left: `${halfHourPercent}%` }}
                aria-hidden="true"
              >
                {/* Small tick mark for half hour */}
                {showGridLines && (
                  <div className="h-1 w-px bg-border/50" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current time indicator (if within range) */}
        <CurrentTimeIndicator
          startHour={startHour}
          endHour={endHour}
        />
      </div>
    </div>
  );
}

TimelineHeader.displayName = "TimelineHeader";

// =============================================================================
// CURRENT TIME INDICATOR
// =============================================================================

interface CurrentTimeIndicatorProps {
  startHour: number;
  endHour: number;
}

/**
 * Shows a vertical line indicating the current time
 * Only visible if current time is within the timeline range
 */
function CurrentTimeIndicator({ startHour, endHour }: CurrentTimeIndicatorProps) {
  const [currentPercent, setCurrentPercent] = React.useState<number | null>(null);

  React.useEffect(() => {
    function updateCurrentTime() {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      // Check if current time is within the timeline range
      const currentTotalMinutes = currentHour * 60 + currentMinutes;
      const startMinutes = startHour * 60;
      const endMinutes = endHour * 60;

      if (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes) {
        const percent = ((currentTotalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
        setCurrentPercent(percent);
      } else {
        setCurrentPercent(null);
      }
    }

    // Update immediately
    updateCurrentTime();

    // Update every minute
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, [startHour, endHour]);

  if (currentPercent === null) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-10 flex flex-col items-center"
      style={{ left: `${currentPercent}%` }}
      aria-label="Current time"
    >
      {/* Dot at top */}
      <div className="h-2 w-2 rounded-full bg-primary shadow-sm" />
      {/* Vertical line (extends through the header) */}
      <div className="h-full w-0.5 bg-primary/50" />
    </div>
  );
}

CurrentTimeIndicator.displayName = "CurrentTimeIndicator";
