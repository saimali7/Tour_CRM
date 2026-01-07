/**
 * Data Transformer for Simple Timeline
 *
 * Transforms the API response (tourRuns + guideTimelines) into
 * the simplified booking-centric format for the new timeline.
 */

import type { BookingData } from "../booking-block"
import type { GuideInfo } from "../simple-guide-row"

// =============================================================================
// INPUT TYPES (from API response)
// =============================================================================

interface ApiTourRun {
  key: string
  tourId: string
  tour: {
    id: string
    name: string
    slug?: string
    durationMinutes: number
    meetingPoint?: string | null
    meetingPointDetails?: string | null
  } | null
  date: string
  time: string
  bookings: ApiBooking[]
  totalGuests: number
  guidesNeeded: number
  guidesAssigned: number
  status: "unassigned" | "partial" | "assigned" | "overstaffed"
}

interface ApiBooking {
  id: string
  referenceNumber: string
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  totalParticipants: number
  adultCount: number
  childCount: number
  infantCount: number
  pickupZone: {
    id: string
    name: string
    color: string
  } | null
  pickupLocation: string | null
  pickupTime: string | null
  specialOccasion: string | null
  isFirstTime: boolean
  specialRequests?: string | null
  experienceMode?: "join" | "book" | "charter" | null
  bookingTime?: string | null
}

interface ApiGuideTimeline {
  guide: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    avatarUrl?: string | null
  }
  vehicleCapacity: number
  segments: ApiSegment[]
  totalDriveMinutes: number
  totalGuests: number
  utilization: number
}

interface ApiSegment {
  type: "idle" | "drive" | "pickup" | "tour"
  startTime: string
  endTime: string
  durationMinutes: number
  booking?: ApiBooking
  bookingIds?: string[]
  tour?: { id: string; name: string }
  tourRunKey?: string
  pickupLocation?: string
  pickupZoneName?: string
  pickupZoneColor?: string
  guestCount?: number
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface TransformedData {
  guides: GuideWithBookings[]
  unassignedBookings: BookingData[]
  allBookings: Map<string, BookingData>
}

export interface GuideWithBookings {
  guide: GuideInfo
  bookings: BookingData[]
  totalGuests: number
  utilization: number
  totalDriveMinutes: number
}

// =============================================================================
// TRANSFORMER
// =============================================================================

/**
 * Transform API response into the simplified booking-centric format
 */
export function transformDispatchData(
  tourRuns: ApiTourRun[],
  guideTimelines: ApiGuideTimeline[]
): TransformedData {
  // Step 1: Create a map of ALL bookings from tour runs
  const allBookings = new Map<string, BookingData>()

  for (const run of tourRuns) {
    const tour = run.tour
    if (!tour) continue

    for (const booking of run.bookings) {
      const bookingData: BookingData = {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        customerName: booking.customerName,
        totalParticipants: booking.totalParticipants,
        adultCount: booking.adultCount,
        childCount: booking.childCount,
        pickupTime: booking.pickupTime || run.time, // Fallback to tour time
        pickupLocation: booking.pickupLocation,
        pickupZoneName: booking.pickupZone?.name,
        pickupZoneColor: booking.pickupZone?.color,
        tourId: tour.id,
        tourName: tour.name,
        tourDurationMinutes: tour.durationMinutes,
        specialOccasion: booking.specialOccasion,
        isFirstTime: booking.isFirstTime,
        guideId: null, // Will be set below if assigned
        guideName: null,
        experienceMode: booking.experienceMode ?? null,
        bookingTime: run.time, // The scheduled tour time (used for grouping)
      }
      allBookings.set(booking.id, bookingData)
    }
  }

  // Step 2: Process guide timelines to find assigned bookings
  const guides: GuideWithBookings[] = []
  const assignedBookingIds = new Set<string>()

  for (const timeline of guideTimelines) {
    const guideInfo: GuideInfo = {
      id: timeline.guide.id,
      firstName: timeline.guide.firstName,
      lastName: timeline.guide.lastName,
      email: timeline.guide.email,
      phone: timeline.guide.phone,
      avatarUrl: timeline.guide.avatarUrl,
      vehicleCapacity: timeline.vehicleCapacity,
      status: "active",
    }

    const guideBookings: BookingData[] = []

    // Find bookings from pickup segments
    for (const segment of timeline.segments) {
      if (segment.type === "pickup" && segment.booking) {
        const bookingId = segment.booking.id
        const bookingData = allBookings.get(bookingId)

        if (bookingData) {
          // Update the booking with guide assignment
          bookingData.guideId = timeline.guide.id
          bookingData.guideName = `${timeline.guide.firstName} ${timeline.guide.lastName}`

          // Use the segment's calculated pickup time if available
          if (segment.startTime) {
            bookingData.pickupTime = segment.startTime
          }

          guideBookings.push(bookingData)
          assignedBookingIds.add(bookingId)
        }
      }

      // Also check tour segments for booking IDs
      if (segment.type === "tour" && segment.bookingIds) {
        for (const bookingId of segment.bookingIds) {
          if (!assignedBookingIds.has(bookingId)) {
            const bookingData = allBookings.get(bookingId)
            if (bookingData) {
              bookingData.guideId = timeline.guide.id
              bookingData.guideName = `${timeline.guide.firstName} ${timeline.guide.lastName}`

              // Use tour segment start time as fallback for pickup time
              if (!bookingData.pickupTime) {
                bookingData.pickupTime = segment.startTime
              }

              guideBookings.push(bookingData)
              assignedBookingIds.add(bookingId)
            }
          }
        }
      }
    }

    guides.push({
      guide: guideInfo,
      bookings: guideBookings,
      totalGuests: timeline.totalGuests,
      utilization: timeline.utilization,
      totalDriveMinutes: timeline.totalDriveMinutes,
    })
  }

  // Step 3: Collect unassigned bookings
  const unassignedBookings: BookingData[] = []
  for (const [bookingId, bookingData] of allBookings) {
    if (!assignedBookingIds.has(bookingId)) {
      unassignedBookings.push(bookingData)
    }
  }

  // Sort unassigned by time using numeric comparison for robustness
  unassignedBookings.sort((a, b) => {
    const parseTimeLocal = (time: string | null) => {
      if (!time) return 0
      const parts = time.split(':')
      const hours = parseInt(parts[0] ?? '0', 10)
      const mins = parseInt(parts[1] ?? '0', 10)
      return isNaN(hours) || isNaN(mins) ? 0 : hours * 60 + mins
    }
    return parseTimeLocal(a.pickupTime) - parseTimeLocal(b.pickupTime)
  })

  return {
    guides,
    unassignedBookings,
    allBookings,
  }
}

/**
 * Get booking count per guide for capacity display
 */
export function getGuideCapacityInfo(guide: GuideWithBookings): {
  current: number
  capacity: number
  isOver: boolean
  isFull: boolean
} {
  return {
    current: guide.totalGuests,
    capacity: guide.guide.vehicleCapacity,
    isOver: guide.totalGuests > guide.guide.vehicleCapacity,
    isFull: guide.totalGuests === guide.guide.vehicleCapacity,
  }
}

/**
 * Check if a booking would cause capacity overflow
 * Accounts for the booking already being assigned to this guide (no double-counting)
 */
export function wouldExceedCapacity(
  guide: GuideWithBookings,
  booking: BookingData
): boolean {
  // If the booking is already assigned to this guide, don't double-count
  const isAlreadyAssigned = guide.bookings.some(b => b.id === booking.id)
  const effectiveTotal = isAlreadyAssigned
    ? guide.totalGuests
    : guide.totalGuests + booking.totalParticipants

  return effectiveTotal > guide.guide.vehicleCapacity
}

/**
 * Find which guide a booking is assigned to
 */
export function findBookingGuide(
  bookingId: string,
  guides: GuideWithBookings[]
): GuideWithBookings | null {
  for (const guide of guides) {
    if (guide.bookings.some((b) => b.id === bookingId)) {
      return guide
    }
  }
  return null
}
