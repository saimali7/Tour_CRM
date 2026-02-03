"use client"

/**
 * SimpleTimelineContainer
 *
 * The main container for the simplified booking-centric timeline.
 * Always in edit mode - bookings can be dragged between guides and hopper.
 *
 * Features:
 * - Time scale header with grid lines
 * - Current time indicator
 * - Guide rows with booking blocks
 * - Hopper panel for unassigned bookings (always visible)
 * - Native HTML5 drag-and-drop
 */

import { useMemo, useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { format, isToday, isPast, startOfDay } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, Clock } from "lucide-react"

import { EditModeProvider, useEditMode, EditModeToggle } from "../edit-mode-provider"
import { TimelineGrid, TimelineGridLines, CurrentTimeIndicator } from "../timeline-grid"
import { SimpleGuideRow, type GuideInfo } from "../simple-guide-row"
import { SmartHopper } from "../smart-hopper"
import type { BookingData } from "../booking-block"
import { transformDispatchData, type GuideWithBookings } from "./data-transformer"

// =============================================================================
// TYPES
// =============================================================================

interface SimpleTimelineContainerProps {
  /** The date being displayed */
  date: Date
  /** Tour runs from API */
  tourRuns: any[]
  /** Guide timelines from API */
  guideTimelines: any[]
  /** Read-only mode (e.g. dispatched day) */
  isReadOnly?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: Error | null
  /** Callback when a guide is clicked */
  onGuideClick?: (guide: GuideInfo) => void
  /** Callback when a booking is clicked */
  onBookingClick?: (booking: BookingData) => void
  /** Additional class name */
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SimpleTimelineContainer({
  date,
  tourRuns,
  guideTimelines,
  isReadOnly = false,
  isLoading = false,
  error = null,
  onGuideClick,
  onBookingClick,
  className,
}: SimpleTimelineContainerProps) {
  const dateString = format(date, "yyyy-MM-dd")
  const isPastDate = isPast(startOfDay(date)) && !isToday(date)
  const isReadOnlyMode = isPastDate || isReadOnly

  // Transform data into booking-centric format
  const { guides, unassignedBookings } = useMemo(() => {
    if (!tourRuns || !guideTimelines) {
      return { guides: [], unassignedBookings: [] }
    }
    return transformDispatchData(tourRuns, guideTimelines)
  }, [tourRuns, guideTimelines])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <Skeleton className="h-8 w-full" />
        <div className="flex-1 space-y-2 mt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center p-8">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1.5">Failed to load timeline</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (guides.length === 0 && unassignedBookings.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center p-8">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1.5">No Tours Scheduled</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No confirmed bookings for this date. Tours appear here once booked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <EditModeProvider date={dateString}>
      <SimpleTimelineContent
        date={date}
        isPastDate={isPastDate}
        isReadOnly={isReadOnlyMode}
        guides={guides}
        unassignedBookings={unassignedBookings}
        onGuideClick={onGuideClick}
        onBookingClick={onBookingClick}
        className={className}
      />
    </EditModeProvider>
  )
}

// =============================================================================
// INNER CONTENT (uses EditMode context)
// =============================================================================

interface SimpleTimelineContentProps {
  date: Date
  isPastDate: boolean
  isReadOnly: boolean
  guides: GuideWithBookings[]
  unassignedBookings: BookingData[]
  onGuideClick?: (guide: GuideInfo) => void
  onBookingClick?: (booking: BookingData) => void
  className?: string
}

function SimpleTimelineContent({
  date,
  isPastDate,
  isReadOnly,
  guides,
  unassignedBookings,
  onGuideClick,
  onBookingClick,
  className,
}: SimpleTimelineContentProps) {
  const { setIsEditing } = useEditMode()
  const containerRef = useRef<HTMLDivElement>(null)

  // Always enable edit mode on mount
  useEffect(() => {
    setIsEditing(!isReadOnly)
  }, [setIsEditing, isReadOnly])

  // Current time for the indicator (updates every minute)
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
  })

  useEffect(() => {
    if (!isToday(date)) return

    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      )
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [date])

  // Calculate totals
  const totalGuests = guides.reduce((sum, g) => sum + g.totalGuests, 0) +
    unassignedBookings.reduce((sum, b) => sum + b.totalParticipants, 0)
  const assignedGuests = guides.reduce((sum, g) => sum + g.totalGuests, 0)

  return (
    <div className={cn("flex h-full", className)}>
      {/* Smart Hopper Panel - Left side for grouped bookings */}
      <div className="w-80 border-r flex-none">
        <SmartHopper
          bookings={unassignedBookings}
          onBookingClick={onBookingClick}
          className="h-full"
        />
      </div>

      {/* Main Timeline */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with stats */}
        <div className="flex-none flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">{guides.length}</span>
              <span className="text-muted-foreground"> guides</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">{assignedGuests}</span>
              <span className="text-muted-foreground">/{totalGuests} guests assigned</span>
            </div>
            {unassignedBookings.length > 0 && (
              <div className="text-sm text-amber-600">
                <span className="font-medium">{unassignedBookings.length}</span>
                <span> unassigned</span>
              </div>
            )}
          </div>
          <EditModeToggle isPastDate={isPastDate} isReadOnly={isReadOnly} />
        </div>

        {/* Timeline grid with scrollable content */}
        <div ref={containerRef} className="flex-1 overflow-auto relative">
          {/* Time scale header */}
          <TimelineGrid className="sticky top-0 z-10" />

          {/* Guide rows */}
          <div className="relative">
            {/* Grid lines (behind content) */}
            <TimelineGridLines />

            {/* Current time indicator (only for today) */}
            {isToday(date) && <CurrentTimeIndicator currentTime={currentTime} />}

            {/* Guide rows */}
            {guides.map((guideData) => (
              <SimpleGuideRow
                key={guideData.guide.id}
                guide={guideData.guide}
                bookings={guideData.bookings}
                totalGuests={guideData.totalGuests}
                utilization={guideData.utilization}
                onClick={() => onGuideClick?.(guideData.guide)}
              />
            ))}

            {/* Empty state row when no guides */}
            {guides.length === 0 && unassignedBookings.length > 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No guides available</p>
                  <p className="text-xs mt-1">Add guides to assign bookings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleTimelineContainer
