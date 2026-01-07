"use client"

/**
 * TimelineGrid Component
 *
 * Renders the time scale header and vertical grid lines for the timeline.
 * Used as a reference for positioning bookings.
 */

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  generateTimeMarkers,
  formatTimeDisplay,
  GUIDE_COLUMN_WIDTH,
} from "./timeline/timeline-utils"

// =============================================================================
// TYPES
// =============================================================================

interface TimelineGridProps {
  /** Show hour labels every N hours (default 1) */
  hourInterval?: number
  /** Show vertical grid lines */
  showGridLines?: boolean
  /** Custom class name */
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TimelineGrid({
  hourInterval = 1,
  showGridLines = true,
  className,
}: TimelineGridProps) {
  const markers = useMemo(() => generateTimeMarkers(hourInterval), [hourInterval])

  return (
    <div className={cn("relative", className)}>
      {/* Hour markers */}
      <div className="flex h-8 border-b bg-muted/30">
        {/* Spacer for guide column */}
        <div
          className="shrink-0 border-r bg-muted/50"
          style={{ width: GUIDE_COLUMN_WIDTH }}
        />

        {/* Time markers */}
        <div className="relative flex-1">
          {markers.map((marker, idx) => (
            <div
              key={marker.time}
              className={cn(
                "absolute top-0 bottom-0 flex items-center",
                // First marker has left padding, others are centered
                idx === 0 ? "pl-1" : "-translate-x-1/2"
              )}
              style={{ left: `${marker.percent}%` }}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {formatTimeDisplay(marker.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// GRID LINES OVERLAY
// =============================================================================

interface TimelineGridLinesProps {
  className?: string
}

export function TimelineGridLines({ className }: TimelineGridLinesProps) {
  const markers = useMemo(() => generateTimeMarkers(1), [])

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Spacer for guide column */}
      <div
        className="absolute top-0 bottom-0 left-0 border-r bg-muted/20"
        style={{ width: GUIDE_COLUMN_WIDTH }}
      />

      {/* Vertical grid lines */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: GUIDE_COLUMN_WIDTH, right: 0 }}
      >
        {markers.map((marker) => (
          <div
            key={marker.time}
            className="absolute top-0 bottom-0 w-px bg-border/30"
            style={{ left: `${marker.percent}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// CURRENT TIME INDICATOR
// =============================================================================

interface CurrentTimeIndicatorProps {
  /** Current time in HH:MM format */
  currentTime?: string
  className?: string
}

export function CurrentTimeIndicator({ currentTime, className }: CurrentTimeIndicatorProps) {
  // Default to current time if not provided
  const time = useMemo(() => {
    if (currentTime) return currentTime
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }, [currentTime])

  // Calculate position
  const parts = time.split(':')
  const hours = parseInt(parts[0] ?? '0', 10)
  const mins = parseInt(parts[1] ?? '0', 10)
  const totalMinutes = (isNaN(hours) ? 0 : hours) * 60 + (isNaN(mins) ? 0 : mins)
  const startMinutes = TIMELINE_START_HOUR * 60
  const endMinutes = TIMELINE_END_HOUR * 60
  const range = endMinutes - startMinutes

  // Don't show if outside timeline range
  if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
    return null
  }

  const percent = ((totalMinutes - startMinutes) / range) * 100

  return (
    <>
      {/* Spacer for guide column - matches grid lines structure */}
      <div
        className="absolute top-0 bottom-0 left-0 pointer-events-none"
        style={{ width: GUIDE_COLUMN_WIDTH }}
      />
      {/* Time indicator line - positioned within the timeline area */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: GUIDE_COLUMN_WIDTH, right: 0 }}
      >
        <div
          className={cn(
            "absolute top-0 bottom-0 w-0.5 bg-red-500 z-20",
            className
          )}
          style={{ left: `${percent}%` }}
        >
          {/* Time badge at top */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-red-500 text-white text-[10px] font-mono whitespace-nowrap">
            {formatTimeDisplay(time)}
          </div>

          {/* Triangle indicator */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-500" />
        </div>
      </div>
    </>
  )
}
