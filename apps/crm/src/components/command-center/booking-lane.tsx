"use client"

/**
 * BookingLane Component
 *
 * The container for a guide's bookings on the timeline.
 * Handles:
 * - Grouping bookings into tour runs (shared bookings combined)
 * - Positioning TourRunBlocks based on time
 * - Drop zone for receiving dragged bookings
 * - Visual feedback during drag operations
 *
 * Phase 3 Enhancements:
 * - Animated drop zone pulse
 * - Capacity preview (shows projected capacity)
 * - Better time indicator styling
 *
 * Phase 4 Update:
 * - Groups shared bookings by tour+time into single visual blocks
 * - Charter bookings displayed separately
 */

import { useRef, useState, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, Lock, Ban } from "lucide-react"
import type { BookingData } from "./booking-block"
import { TourRunBlock } from "./tour-run-block"
import {
  positionToTime,
  formatTimeDisplay,
  groupBookingsIntoTourRuns,
  parseTime,
  validateDrop,
  type TourRun,
  type DropValidation,
} from "./timeline/timeline-utils"
import { useEditModeOptional } from "./edit-mode-provider"

// =============================================================================
// TYPES
// =============================================================================

interface BookingLaneProps {
  /** Guide ID for this lane */
  guideId: string

  /** Bookings assigned to this guide */
  bookings: BookingData[]

  /** Whether edit mode is active */
  isEditing?: boolean

  /** Currently selected booking ID */
  selectedBookingId?: string | null

  /** Guide's vehicle capacity (for showing warnings) */
  guideCapacity?: number

  /** Current total guests assigned to this guide */
  currentGuests?: number

  /** Callback when a booking is clicked */
  onBookingClick?: (booking: BookingData) => void

  /** Callback when a booking starts being dragged */
  onDragStart?: (booking: BookingData) => void

  /** Callback when a booking is dropped on this lane */
  onDrop?: (bookingId: string, targetGuideId: string, targetTime: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingLane({
  guideId,
  bookings,
  isEditing = false,
  selectedBookingId,
  guideCapacity,
  currentGuests = 0,
  onBookingClick,
  onDragStart,
  onDrop,
}: BookingLaneProps) {
  const laneRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropIndicator, setDropIndicator] = useState<{ time: string; x: number } | null>(null)

  // Get edit mode context for capacity preview
  const editMode = useEditModeOptional()
  const draggedBooking = editMode?.dragState?.booking

  // Group bookings into tour runs (shared bookings combined)
  const tourRuns = useMemo(() => {
    // Cast bookings to include required fields for grouping
    const bookingsWithExperience = bookings.map(b => ({
      ...b,
      experienceMode: b.experienceMode ?? null,
      bookingTime: b.bookingTime ?? null,
    }))
    return groupBookingsIntoTourRuns(bookingsWithExperience)
  }, [bookings])

  // Validate if the dragged booking can be dropped at the current position
  const dropValidation = useMemo((): DropValidation => {
    if (!isDragOver || !dropIndicator || !draggedBooking) {
      return { allowed: true }
    }

    return validateDrop({
      tourRuns,
      draggedBooking: {
        id: draggedBooking.id,
        tourId: draggedBooking.tourId,
        tourDurationMinutes: draggedBooking.tourDurationMinutes,
        totalParticipants: draggedBooking.totalParticipants,
        experienceMode: draggedBooking.experienceMode,
        bookingTime: draggedBooking.bookingTime,
      },
      targetTime: dropIndicator.time,
      guideCapacity: guideCapacity ?? Infinity,
    })
  }, [tourRuns, draggedBooking, isDragOver, dropIndicator, guideCapacity])

  // Helper booleans for UI
  const isDropBlocked = !dropValidation.allowed
  const isCharterIssue = dropValidation.reason === 'charter_occupied' || dropValidation.reason === 'charter_conflict'
  const isCapacityIssue = dropValidation.reason === 'capacity_exceeded'
  const isDifferentTourIssue = dropValidation.reason === 'different_tour'

  // Projected capacity text (for valid drops)
  const capacityPreview = useMemo(() => {
    if (!isDragOver || !guideCapacity || !draggedBooking || guideCapacity === Infinity) return null
    // Only show capacity for valid drops or capacity-specific issues
    if (isDropBlocked && !isCapacityIssue) return null

    const isAlreadyHere = bookings.some(b => b.id === draggedBooking.id)
    const projectedGuests = isAlreadyHere
      ? currentGuests
      : currentGuests + draggedBooking.totalParticipants
    return `${projectedGuests}/${guideCapacity}`
  }, [isDragOver, guideCapacity, currentGuests, draggedBooking, bookings, isDropBlocked, isCapacityIssue])

  // Handle drag over - show drop indicator
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isEditing) return

    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    // Calculate drop time from position
    if (laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect()
      const time = positionToTime(e.clientX, rect, 0) // 0 because lane excludes guide column
      const x = e.clientX - rect.left

      setDropIndicator({ time, x })
      setIsDragOver(true)
    }
  }, [isEditing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're actually leaving the lane, not just moving to a child
    const rect = laneRef.current?.getBoundingClientRect()
    if (rect) {
      const isOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom

      if (isOutside) {
        setIsDragOver(false)
        setDropIndicator(null)
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDropIndicator(null)

    if (!isEditing) return

    const bookingId = e.dataTransfer.getData('text/plain')
    if (!bookingId) return

    // Get drop time
    if (laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect()
      const time = positionToTime(e.clientX, rect, 0)

      onDrop?.(bookingId, guideId, time)
    }
  }, [isEditing, guideId, onDrop])

  // Layout tour runs into lanes for overlaps
  const tourRunLanes = useMemo(() => {
    if (tourRuns.length === 0) return []
    if (tourRuns.length === 1) return [[tourRuns[0]!]]

    // Sort by start time
    const sorted = [...tourRuns].sort((a, b) =>
      parseTime(a.startTime) - parseTime(b.startTime)
    )

    const lanes: TourRun[][] = []

    for (const run of sorted) {
      // Check if this tour run overlaps with the last in any lane
      let placed = false
      for (const lane of lanes) {
        const lastInLane = lane[lane.length - 1]
        if (lastInLane) {
          const lastEnd = parseTime(lastInLane.startTime) + lastInLane.tourDurationMinutes
          const runStart = parseTime(run.startTime)
          // No overlap if this run starts after the last one ends
          if (runStart >= lastEnd) {
            lane.push(run)
            placed = true
            break
          }
        }
      }
      if (!placed) {
        lanes.push([run])
      }
    }

    return lanes
  }, [tourRuns])

  const laneCount = Math.max(tourRunLanes.length, 1)

  return (
    <div
      ref={laneRef}
      className={cn(
        "relative h-full",
        // Base styles
        "border-l border-border/50",
        // Drag over state - animated pulse (when drop is valid)
        isDragOver && !isDropBlocked && "animate-drop-zone-pulse",
        // Charter issue - amber warning state
        isDragOver && isCharterIssue && "bg-amber-500/10 ring-2 ring-amber-500/30 ring-inset",
        // Capacity issue - red warning state
        isDragOver && isCapacityIssue && "bg-destructive/10 ring-2 ring-destructive/30 ring-inset",
        // Different tour issue - orange warning state
        isDragOver && isDifferentTourIssue && "bg-orange-500/10 ring-2 ring-orange-500/30 ring-inset",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tour run blocks organized by lane */}
      {tourRunLanes.map((lane, laneIndex) => (
        <div
          key={laneIndex}
          className="absolute left-0 right-0"
          style={{
            top: `${(laneIndex / laneCount) * 100}%`,
            height: `${100 / laneCount}%`,
          }}
        >
          {lane.map((tourRun) => (
            <TourRunBlock
              key={tourRun.key}
              tourRun={tourRun}
              guideCapacity={guideCapacity}
              isEditing={isEditing}
              isSelected={tourRun.bookings.some(b => b.id === selectedBookingId)}
              onClick={() => {
                // Select the first booking in the tour run
                const firstBooking = tourRun.bookings[0]
                if (firstBooking) {
                  onBookingClick?.(firstBooking as BookingData)
                }
              }}
              onDragStart={() => {
                // Trigger drag with the first booking
                const firstBooking = tourRun.bookings[0]
                if (firstBooking) {
                  onDragStart?.(firstBooking as BookingData)
                }
              }}
            />
          ))}
        </div>
      ))}

      {/* Empty state for guides with no bookings */}
      {bookings.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground/50">
            No bookings assigned
          </span>
        </div>
      )}

      {/* Drop indicator */}
      {dropIndicator && isDragOver && (
        <div
          className={cn(
            "absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none animate-drop-indicator",
            isDropBlocked
              ? isCharterIssue ? "bg-amber-500" : isCapacityIssue ? "bg-destructive" : "bg-orange-500"
              : "bg-primary"
          )}
          style={{ left: dropIndicator.x }}
        >
          {/* Time badge */}
          <div className={cn(
            "absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap",
            isDropBlocked
              ? isCharterIssue ? "bg-amber-500 text-white" : isCapacityIssue ? "bg-destructive text-destructive-foreground" : "bg-orange-500 text-white"
              : "bg-primary text-primary-foreground"
          )}>
            {formatTimeDisplay(dropIndicator.time)}
          </div>

          {/* Capacity preview badge (shows on indicator for valid drops or capacity issues) */}
          {capacityPreview && (
            <div className={cn(
              "absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap flex items-center gap-1",
              isCapacityIssue
                ? "bg-destructive/90 text-destructive-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {isCapacityIssue && <AlertTriangle className="h-3 w-3" />}
              {capacityPreview}
            </div>
          )}
        </div>
      )}

      {/* Warning overlay when drop is blocked */}
      {isDragOver && isDropBlocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-lg",
            isCharterIssue && "bg-amber-500 text-white",
            isCapacityIssue && "bg-destructive text-destructive-foreground animate-capacity-shake",
            isDifferentTourIssue && "bg-orange-500 text-white",
          )}>
            {isCharterIssue && <Lock className="h-3.5 w-3.5" />}
            {isCapacityIssue && <AlertTriangle className="h-3.5 w-3.5" />}
            {isDifferentTourIssue && <Ban className="h-3.5 w-3.5" />}
            {dropValidation.message}
          </div>
        </div>
      )}
    </div>
  )
}
