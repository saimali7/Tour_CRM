/**
 * Booking Grouping Logic
 *
 * Groups unassigned bookings intelligently:
 * - Charter bookings: Each gets its own group (private experience)
 * - Shared bookings: Grouped by tourId + bookingTime (can share a guide)
 */

import type { BookingData } from "../booking-block"
import type {
  BookingGroup,
  PickupZoneSummary,
  SortOption,
  HopperFilters,
  TimeFilter,
} from "./types"

// =============================================================================
// GROUPING
// =============================================================================

/**
 * Group unassigned bookings into logical units.
 *
 * Rules:
 * - Charter bookings → Each gets its own group (private experience)
 * - Shared bookings (join/book) → Grouped by tourId + bookingTime
 */
export function groupBookings(bookings: BookingData[]): BookingGroup[] {
  const groups = new Map<string, BookingGroup>()

  for (const booking of bookings) {
    const isCharter = booking.experienceMode === "charter"
    const key = isCharter
      ? `charter_${booking.id}` // Each charter is its own group
      : `shared_${booking.tourId}_${booking.bookingTime ?? "00:00"}` // Shared grouped by tour+time

    if (!groups.has(key)) {
      groups.set(key, createEmptyGroup(booking, isCharter))
    }

    const group = groups.get(key)!
    addBookingToGroup(group, booking)
  }

  return Array.from(groups.values())
}

function createEmptyGroup(booking: BookingData, isCharter: boolean): BookingGroup {
  return {
    key: isCharter
      ? `charter_${booking.id}`
      : `shared_${booking.tourId}_${booking.bookingTime ?? "00:00"}`,
    type: isCharter ? "charter" : "shared",
    tourId: booking.tourId,
    tourName: booking.tourName,
    tourTime: booking.bookingTime ?? booking.pickupTime ?? "00:00",
    tourDurationMinutes: booking.tourDurationMinutes,
    bookings: [],
    totalGuests: 0,
    totalBookings: 0,
    pickupZones: [],
    earliestPickup: null,
    latestPickup: null,
  }
}

function addBookingToGroup(group: BookingGroup, booking: BookingData): void {
  group.bookings.push(booking)
  group.totalGuests += booking.totalParticipants
  group.totalBookings += 1

  // Update pickup zones
  if (booking.pickupZoneName) {
    const existingZone = group.pickupZones.find((z) => z.name === booking.pickupZoneName)
    if (existingZone) {
      existingZone.count += booking.totalParticipants
    } else {
      group.pickupZones.push({
        name: booking.pickupZoneName,
        color: booking.pickupZoneColor ?? "#888888",
        count: booking.totalParticipants,
      })
    }
  }

  // Update pickup time range
  if (booking.pickupTime) {
    if (!group.earliestPickup || booking.pickupTime < group.earliestPickup) {
      group.earliestPickup = booking.pickupTime
    }
    if (!group.latestPickup || booking.pickupTime > group.latestPickup) {
      group.latestPickup = booking.pickupTime
    }
  }
}

// =============================================================================
// SORTING
// =============================================================================

/**
 * Sort groups by the specified option
 */
export function sortGroups(groups: BookingGroup[], sortBy: SortOption): BookingGroup[] {
  const sorted = [...groups]

  switch (sortBy) {
    case "time":
      // Sort by tour time (earliest first)
      sorted.sort((a, b) => {
        const timeA = parseTime(a.tourTime)
        const timeB = parseTime(b.tourTime)
        if (timeA !== timeB) return timeA - timeB
        // Secondary sort by tour name
        return a.tourName.localeCompare(b.tourName)
      })
      break

    case "tour":
      // Sort by tour name, then by time
      sorted.sort((a, b) => {
        const nameCompare = a.tourName.localeCompare(b.tourName)
        if (nameCompare !== 0) return nameCompare
        return parseTime(a.tourTime) - parseTime(b.tourTime)
      })
      break

    case "guests":
      // Sort by total guests (largest first)
      sorted.sort((a, b) => {
        if (b.totalGuests !== a.totalGuests) return b.totalGuests - a.totalGuests
        // Secondary sort by time
        return parseTime(a.tourTime) - parseTime(b.tourTime)
      })
      break

    case "type":
      // Sort charters first, then by time
      sorted.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "charter" ? -1 : 1
        }
        return parseTime(a.tourTime) - parseTime(b.tourTime)
      })
      break
  }

  // Also sort bookings within each group by pickup time
  for (const group of sorted) {
    group.bookings.sort((a, b) => {
      const timeA = parseTime(a.pickupTime)
      const timeB = parseTime(b.pickupTime)
      return timeA - timeB
    })
  }

  return sorted
}

// =============================================================================
// FILTERING
// =============================================================================

/**
 * Filter groups based on the current filters
 */
export function filterGroups(groups: BookingGroup[], filters: HopperFilters): BookingGroup[] {
  return groups.filter((group) => {
    // Search filter (searches tour name and customer names)
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase()
      const matchesTour = group.tourName.toLowerCase().includes(query)
      const matchesCustomer = group.bookings.some((b) =>
        b.customerName.toLowerCase().includes(query) ||
        b.referenceNumber.toLowerCase().includes(query)
      )
      const matchesZone = group.pickupZones.some((z) =>
        z.name.toLowerCase().includes(query)
      )
      if (!matchesTour && !matchesCustomer && !matchesZone) {
        return false
      }
    }

    // Tour filter
    if (filters.tours.size > 0 && !filters.tours.has(group.tourId)) {
      return false
    }

    // Type filter
    if (filters.type !== "all") {
      if (filters.type === "charter" && group.type !== "charter") return false
      if (filters.type === "shared" && group.type !== "shared") return false
    }

    // Time filter
    if (filters.time !== "all") {
      const time = parseTime(group.tourTime)
      const hour = Math.floor(time / 60)

      switch (filters.time) {
        case "morning":
          if (hour >= 12) return false
          break
        case "afternoon":
          if (hour < 12 || hour >= 17) return false
          break
        case "evening":
          if (hour < 17) return false
          break
      }
    }

    return true
  })
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse a time string (HH:MM) into minutes since midnight
 */
function parseTime(time: string | null): number {
  if (!time) return 0
  const parts = time.split(":")
  const hours = parseInt(parts[0] ?? "0", 10)
  const mins = parseInt(parts[1] ?? "0", 10)
  return isNaN(hours) || isNaN(mins) ? 0 : hours * 60 + mins
}

/**
 * Format a time range for display
 */
export function formatTimeRange(earliest: string | null, latest: string | null): string {
  if (!earliest && !latest) return "No pickup times"
  if (earliest === latest || !latest) return earliest ?? ""
  return `${earliest} - ${latest}`
}

/**
 * Get unique tours from bookings for filter options
 */
export function getUniqueTours(bookings: BookingData[]): { id: string; name: string; count: number }[] {
  const tourMap = new Map<string, { name: string; count: number }>()

  for (const booking of bookings) {
    const existing = tourMap.get(booking.tourId)
    if (existing) {
      existing.count += 1
    } else {
      tourMap.set(booking.tourId, { name: booking.tourName, count: 1 })
    }
  }

  return Array.from(tourMap.entries())
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get time period label for display
 */
export function getTimePeriodLabel(filter: TimeFilter): string {
  switch (filter) {
    case "morning":
      return "Morning (before 12:00)"
    case "afternoon":
      return "Afternoon (12:00-17:00)"
    case "evening":
      return "Evening (after 17:00)"
    default:
      return "All times"
  }
}
