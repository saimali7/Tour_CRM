/**
 * Timeline Utilities
 *
 * THE single source of truth for all time ↔ position calculations.
 * No other file should do time math - import from here.
 */

// Timeline boundaries
export const TIMELINE_START_HOUR = 6  // 6 AM
export const TIMELINE_END_HOUR = 24   // Midnight
export const TIMELINE_START_MINUTES = TIMELINE_START_HOUR * 60  // 360
export const TIMELINE_END_MINUTES = TIMELINE_END_HOUR * 60      // 1440
export const TIMELINE_DURATION_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES // 1080

// Snap interval (15 minutes)
export const SNAP_INTERVAL_MINUTES = 15

// Guide column width (fixed)
export const GUIDE_COLUMN_WIDTH = 200

/**
 * Parse a time string "HH:MM" to minutes since midnight
 * Returns 0 for invalid input (safe fallback)
 */
export function parseTime(time: string | null | undefined): number {
  if (!time || typeof time !== 'string') return 0
  const parts = time.split(':')
  if (parts.length !== 2) return 0
  const hours = parseInt(parts[0] ?? '', 10)
  const mins = parseInt(parts[1] ?? '', 10)
  if (isNaN(hours) || isNaN(mins)) return 0
  return hours * 60 + mins
}

/**
 * Format minutes since midnight to "HH:MM"
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Snap minutes to the nearest interval
 */
export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES
}

/**
 * Convert a time string to a percentage position on the timeline (0-100)
 */
export function timeToPercent(time: string): number {
  const minutes = parseTime(time)
  const clampedMinutes = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, minutes))
  return ((clampedMinutes - TIMELINE_START_MINUTES) / TIMELINE_DURATION_MINUTES) * 100
}

/**
 * Convert a percentage position (0-100) to a time string
 */
export function percentToTime(percent: number): string {
  const clampedPercent = Math.max(0, Math.min(100, percent))
  const minutes = TIMELINE_START_MINUTES + (clampedPercent / 100) * TIMELINE_DURATION_MINUTES
  const snappedMinutes = snapMinutes(minutes)
  return formatTime(snappedMinutes)
}

/**
 * Convert duration in minutes to a width percentage
 */
export function durationToPercent(durationMinutes: number): number {
  return (durationMinutes / TIMELINE_DURATION_MINUTES) * 100
}

/**
 * Convert a pixel X position to a time string
 * @param clientX - The mouse/touch X position
 * @param timelineRect - The bounding rect of the timeline container
 * @param guideColumnWidth - Width of the guide info column (default 200)
 */
export function positionToTime(
  clientX: number,
  timelineRect: DOMRect,
  guideColumnWidth: number = GUIDE_COLUMN_WIDTH
): string {
  const timelineWidth = timelineRect.width - guideColumnWidth
  const relativeX = clientX - timelineRect.left - guideColumnWidth
  const percent = Math.max(0, Math.min(1, relativeX / timelineWidth)) * 100
  return percentToTime(percent)
}

/**
 * Convert a time string to pixel position
 * @param time - Time string "HH:MM"
 * @param timelineWidth - Width of the timeline area (excluding guide column)
 */
export function timeToPixels(time: string, timelineWidth: number): number {
  const percent = timeToPercent(time)
  return (percent / 100) * timelineWidth
}

/**
 * Convert duration to pixel width
 */
export function durationToPixels(durationMinutes: number, timelineWidth: number): number {
  const percent = durationToPercent(durationMinutes)
  return (percent / 100) * timelineWidth
}

/**
 * Check if two time ranges overlap
 */
export function timesOverlap(
  start1: string,
  duration1: number,
  start2: string,
  duration2: number
): boolean {
  const startMinutes1 = parseTime(start1)
  const endMinutes1 = startMinutes1 + duration1
  const startMinutes2 = parseTime(start2)
  const endMinutes2 = startMinutes2 + duration2

  return startMinutes1 < endMinutes2 && startMinutes2 < endMinutes1
}

/**
 * Generate time markers for the timeline header
 * Returns an array of { time: string, percent: number }
 */
export function generateTimeMarkers(intervalHours: number = 1): Array<{ time: string; percent: number }> {
  const markers: Array<{ time: string; percent: number }> = []

  for (let hour = TIMELINE_START_HOUR; hour <= TIMELINE_END_HOUR; hour += intervalHours) {
    const time = formatTime(hour * 60)
    const percent = timeToPercent(time)
    markers.push({ time, percent })
  }

  return markers
}

/**
 * Format time for display (12-hour format)
 */
export function formatTimeDisplay(time: string): string {
  const minutes = parseTime(time)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return '12:00 AM'
  if (hours === 12) return mins === 0 ? '12 PM' : `12:${mins.toString().padStart(2, '0')} PM`
  if (hours === 24) return '12 AM'

  const displayHour = hours > 12 ? hours - 12 : hours
  const amPm = hours >= 12 ? 'PM' : 'AM'

  if (mins === 0) {
    return `${displayHour} ${amPm}`
  }
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${amPm}`
}

/**
 * Get a CSS color for a pickup zone
 * Uses a consistent hash to generate colors
 */
export function getZoneColor(zoneName: string | null | undefined): string {
  if (!zoneName) return '#6b7280' // gray-500

  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ]

  // Simple hash of zone name
  let hash = 0
  for (let i = 0; i < zoneName.length; i++) {
    hash = zoneName.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length] ?? colors[0]!
}

/**
 * Calculate if a booking at a given time would conflict with existing bookings
 */
export function findConflicts(
  bookings: Array<{ id: string; pickupTime: string; durationMinutes: number }>,
  newTime: string,
  newDuration: number,
  excludeBookingId?: string
): string[] {
  return bookings
    .filter(b => b.id !== excludeBookingId)
    .filter(b => timesOverlap(b.pickupTime, b.durationMinutes, newTime, newDuration))
    .map(b => b.id)
}

// =============================================================================
// TOUR RUN GROUPING (for shared bookings on same tour+time)
// =============================================================================

export interface BookingWithExperience {
  id: string
  pickupTime: string | null
  tourId: string
  tourName: string
  tourDurationMinutes: number
  totalParticipants: number
  experienceMode?: 'join' | 'book' | 'charter' | null
  bookingTime?: string | null
  // Include other booking fields for display
  customerName: string
  referenceNumber: string
  pickupZoneName?: string | null
  pickupZoneColor?: string | null
  adultCount: number
  childCount?: number | null
  specialOccasion?: string | null
  isFirstTime?: boolean
}

/**
 * A tour run represents a single tour departure.
 * For shared tours: may contain multiple bookings
 * For charter tours: always contains exactly one booking
 */
export interface TourRun {
  /** Unique key: "tourId|bookingTime" for shared, "charter_bookingId" for charter */
  key: string
  tourId: string
  tourName: string
  /** The tour start time (used for positioning) */
  startTime: string
  tourDurationMinutes: number
  /** All bookings in this tour run */
  bookings: BookingWithExperience[]
  /** Total guests across all bookings */
  totalGuests: number
  /** Whether this is a private charter */
  isCharter: boolean
  /** Earliest pickup time among bookings */
  earliestPickup: string | null
  /** Latest pickup time among bookings */
  latestPickup: string | null
  /** Pickup zones summary */
  pickupZones: { name: string; color: string; count: number }[]
}

/**
 * Group bookings into tour runs.
 * - Shared bookings (join/book) with same tourId + bookingTime = one tour run
 * - Charter bookings = always their own tour run
 */
export function groupBookingsIntoTourRuns(bookings: BookingWithExperience[]): TourRun[] {
  const tourRunMap = new Map<string, TourRun>()

  for (const booking of bookings) {
    const isCharter = booking.experienceMode === 'charter'
    const tourTime = booking.bookingTime ?? booking.pickupTime ?? '00:00'

    // Key: charter bookings get their own run, shared bookings grouped by tour+time
    const key = isCharter
      ? `charter_${booking.id}`
      : `shared_${booking.tourId}_${tourTime}`

    if (!tourRunMap.has(key)) {
      tourRunMap.set(key, {
        key,
        tourId: booking.tourId,
        tourName: booking.tourName,
        startTime: tourTime,
        tourDurationMinutes: booking.tourDurationMinutes,
        bookings: [],
        totalGuests: 0,
        isCharter,
        earliestPickup: null,
        latestPickup: null,
        pickupZones: [],
      })
    }

    const tourRun = tourRunMap.get(key)!
    tourRun.bookings.push(booking)
    tourRun.totalGuests += booking.totalParticipants

    // Update pickup time range
    if (booking.pickupTime) {
      if (!tourRun.earliestPickup || booking.pickupTime < tourRun.earliestPickup) {
        tourRun.earliestPickup = booking.pickupTime
      }
      if (!tourRun.latestPickup || booking.pickupTime > tourRun.latestPickup) {
        tourRun.latestPickup = booking.pickupTime
      }
    }

    // Update pickup zones
    if (booking.pickupZoneName) {
      const existingZone = tourRun.pickupZones.find(z => z.name === booking.pickupZoneName)
      if (existingZone) {
        existingZone.count += booking.totalParticipants
      } else {
        tourRun.pickupZones.push({
          name: booking.pickupZoneName,
          color: booking.pickupZoneColor ?? '#888888',
          count: booking.totalParticipants,
        })
      }
    }
  }

  // Sort bookings within each tour run by pickup time
  for (const tourRun of tourRunMap.values()) {
    tourRun.bookings.sort((a, b) => parseTime(a.pickupTime) - parseTime(b.pickupTime))
  }

  return Array.from(tourRunMap.values())
}

// =============================================================================
// BOOKING LAYOUT UTILITIES (shared between booking-block and booking-lane)
// =============================================================================

export interface BookingForLayout {
  id: string
  pickupTime: string | null
  tourDurationMinutes: number
}

/**
 * Check if two bookings overlap in time
 * Uses parseTime for robust time comparison
 */
export function doBookingsOverlap<T extends BookingForLayout>(a: T, b: T): boolean {
  const startA = parseTime(a.pickupTime)
  const endA = startA + a.tourDurationMinutes
  const startB = parseTime(b.pickupTime)
  const endB = startB + b.tourDurationMinutes

  return startA < endB && startB < endA
}

/**
 * Layout bookings into non-overlapping lanes
 * Uses a greedy algorithm to minimize the number of lanes
 *
 * @returns Array of lanes, each containing non-overlapping bookings
 */
export function layoutBookingsIntoLanes<T extends BookingForLayout>(bookings: T[]): T[][] {
  if (bookings.length === 0) return []
  if (bookings.length === 1) return [[bookings[0]!]]

  // Sort by start time using parseTime for robust comparison
  const sorted = [...bookings].sort((a, b) => {
    const timeA = parseTime(a.pickupTime)
    const timeB = parseTime(b.pickupTime)
    return timeA - timeB
  })

  const lanes: T[][] = []

  for (const booking of sorted) {
    // Try to find a lane where this booking fits
    let placed = false
    for (const lane of lanes) {
      const lastInLane = lane[lane.length - 1]
      if (lastInLane && !doBookingsOverlap(lastInLane, booking)) {
        lane.push(booking)
        placed = true
        break
      }
    }

    // Create new lane if needed
    if (!placed) {
      lanes.push([booking])
    }
  }

  return lanes
}

/**
 * Compare two time strings for sorting
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function comparePickupTimes(a: string | null, b: string | null): number {
  return parseTime(a) - parseTime(b)
}

// =============================================================================
// CAPACITY VALIDATION (shared vs charter booking rules)
// =============================================================================

/**
 * Result of validating whether a booking can be dropped at a specific time slot
 */
export interface DropValidation {
  allowed: boolean
  reason?: 'charter_occupied' | 'charter_conflict' | 'capacity_exceeded' | 'different_tour'
  message?: string
}

/**
 * Find a tour run that overlaps with a given time
 */
export function findOverlappingTourRun(
  tourRuns: TourRun[],
  targetTime: string,
  targetDuration: number
): TourRun | undefined {
  const targetMinutes = parseTime(targetTime)
  const targetEnd = targetMinutes + targetDuration

  return tourRuns.find(run => {
    const runStart = parseTime(run.startTime)
    const runEnd = runStart + run.tourDurationMinutes
    // Check if the time ranges overlap
    return targetMinutes < runEnd && targetEnd > runStart
  })
}

/**
 * Validate whether a booking can be dropped at a specific time slot on a guide's timeline
 *
 * Business Rules:
 * 1. Charter bookings block the entire slot - no other bookings can be added
 * 2. You cannot add a charter to a slot that already has bookings
 * 3. Shared bookings can share a slot if they're for the same tour
 * 4. Total guests cannot exceed guide vehicle capacity
 */
export function validateDrop(params: {
  tourRuns: TourRun[]
  draggedBooking: {
    id: string
    tourId: string
    tourDurationMinutes: number
    totalParticipants: number
    experienceMode?: 'join' | 'book' | 'charter' | null
    bookingTime?: string | null
  }
  targetTime: string
  guideCapacity: number
}): DropValidation {
  const { tourRuns, draggedBooking, targetTime, guideCapacity } = params

  // Find tour run that overlaps with drop time
  const overlappingRun = findOverlappingTourRun(
    tourRuns,
    targetTime,
    draggedBooking.tourDurationMinutes
  )

  const isDraggedCharter = draggedBooking.experienceMode === 'charter'

  // If no overlapping tour run, check if guide can do this new tour
  if (!overlappingRun) {
    // Empty slot - always allowed (capacity doesn't matter for empty slot)
    // Just check if this would exceed capacity (for display purposes)
    if (draggedBooking.totalParticipants > guideCapacity && guideCapacity > 0) {
      return {
        allowed: false,
        reason: 'capacity_exceeded',
        message: `Booking has ${draggedBooking.totalParticipants} guests, vehicle seats ${guideCapacity}`
      }
    }
    return { allowed: true }
  }

  // Case 1: Target slot has a charter - can't add anything
  if (overlappingRun.isCharter) {
    // Unless we're moving the same charter (same booking ID)
    if (overlappingRun.bookings.some(b => b.id === draggedBooking.id)) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'charter_occupied',
      message: 'This slot has a private charter'
    }
  }

  // Case 2: Dragging a charter to slot with existing bookings
  if (isDraggedCharter && overlappingRun.bookings.length > 0) {
    // Unless all bookings in the run are the same booking being moved
    const otherBookings = overlappingRun.bookings.filter(b => b.id !== draggedBooking.id)
    if (otherBookings.length > 0) {
      return {
        allowed: false,
        reason: 'charter_conflict',
        message: 'Cannot add charter to slot with existing bookings'
      }
    }
  }

  // Case 3: Shared booking being added to existing shared tour run
  // Must be the same tour to share a time slot
  if (!isDraggedCharter && !overlappingRun.isCharter) {
    if (overlappingRun.tourId !== draggedBooking.tourId) {
      return {
        allowed: false,
        reason: 'different_tour',
        message: `Guide has ${overlappingRun.tourName} at this time`
      }
    }
  }

  // Case 4: Would exceed guest capacity
  // Count current guests (excluding the dragged booking if it's already in this run)
  const currentGuests = overlappingRun.bookings
    .filter(b => b.id !== draggedBooking.id)
    .reduce((sum, b) => sum + b.totalParticipants, 0)
  const projectedGuests = currentGuests + draggedBooking.totalParticipants

  if (projectedGuests > guideCapacity && guideCapacity > 0) {
    return {
      allowed: false,
      reason: 'capacity_exceeded',
      message: `Exceeds capacity (${projectedGuests}/${guideCapacity})`
    }
  }

  return { allowed: true }
}

/**
 * Get capacity status for display
 */
export interface CapacityStatus {
  current: number
  max: number
  available: number
  percentage: number
  isAtCapacity: boolean
  isNearCapacity: boolean // 80%+
  isCharter: boolean
}

export function getCapacityStatus(
  tourRun: TourRun,
  guideCapacity: number
): CapacityStatus {
  if (tourRun.isCharter) {
    return {
      current: tourRun.totalGuests,
      max: guideCapacity,
      available: 0,
      percentage: 100,
      isAtCapacity: true,
      isNearCapacity: true,
      isCharter: true,
    }
  }

  const percentage = guideCapacity > 0
    ? (tourRun.totalGuests / guideCapacity) * 100
    : 0

  return {
    current: tourRun.totalGuests,
    max: guideCapacity,
    available: Math.max(0, guideCapacity - tourRun.totalGuests),
    percentage,
    isAtCapacity: tourRun.totalGuests >= guideCapacity,
    isNearCapacity: percentage >= 80,
    isCharter: false,
  }
}
