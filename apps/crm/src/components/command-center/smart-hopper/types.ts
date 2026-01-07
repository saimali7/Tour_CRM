/**
 * Smart Hopper Types
 *
 * Types for the intelligent booking grouping system.
 */

import type { BookingData } from "../booking-block"

// =============================================================================
// BOOKING GROUP
// =============================================================================

/**
 * A group of bookings that can potentially be assigned together.
 * - Charter bookings: Each gets its own group (private experience)
 * - Shared bookings: Grouped by tourId + bookingTime (can share a guide)
 */
export interface BookingGroup {
  /** Unique key for the group: "shared_tourId_time" or "charter_bookingId" */
  key: string

  /** Group type */
  type: "shared" | "charter"

  /** Tour info */
  tourId: string
  tourName: string
  tourTime: string
  tourDurationMinutes: number

  /** Bookings in this group */
  bookings: BookingData[]

  /** Aggregated stats */
  totalGuests: number
  totalBookings: number

  /** Pickup summary */
  pickupZones: PickupZoneSummary[]
  earliestPickup: string | null
  latestPickup: string | null
}

export interface PickupZoneSummary {
  name: string
  color: string
  count: number
}

// =============================================================================
// HOPPER STATE
// =============================================================================

export type SortOption = "time" | "tour" | "guests" | "type"

export type TypeFilter = "all" | "shared" | "charter"

export type TimeFilter = "all" | "morning" | "afternoon" | "evening"

export interface HopperFilters {
  search: string
  tours: Set<string>
  type: TypeFilter
  time: TimeFilter
}

export const defaultFilters: HopperFilters = {
  search: "",
  tours: new Set(),
  type: "all",
  time: "all",
}

// =============================================================================
// VIEW MODE
// =============================================================================

export type ViewMode = "grouped" | "flat"
