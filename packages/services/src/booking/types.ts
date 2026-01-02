/**
 * Shared types for booking services
 *
 * These types are used across all booking-related services and
 * are re-exported from the main booking index for external use.
 */

import type {
  Booking,
  BookingParticipant,
  BookingStatus,
  PaymentStatus,
  BookingSource,
} from "@tour/database";
import type { DateRangeFilter } from "../types";

// ============================================================================
// Booking Filters & Sorting
// ============================================================================

export interface BookingFilters {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  source?: BookingSource;
  customerId?: string;
  scheduleId?: string;
  tourId?: string;
  dateRange?: DateRangeFilter;
  scheduleDateRange?: DateRangeFilter; // Filter by schedule start date
  search?: string;
}

export type BookingSortField = "createdAt" | "total" | "referenceNumber";

// ============================================================================
// Booking With Relations
// ============================================================================

export interface BookingWithRelations extends Booking {
  customer?: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  schedule?: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
  };
  tour?: {
    id: string;
    name: string;
    slug: string;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
  };
  participants?: BookingParticipant[];
}

// ============================================================================
// Pricing
// ============================================================================

export interface PricingSnapshot {
  optionId?: string;
  optionName?: string;
  pricingModel?: unknown;
  experienceMode?: "join" | "book" | "charter";
  priceBreakdown?: string;
}

// ============================================================================
// Create & Update Inputs
// ============================================================================

/**
 * CreateBookingInput supports two booking models:
 *
 * 1. **Schedule-based (legacy)**: Provide `scheduleId`
 *    - Booking is linked to a pre-created schedule
 *    - Capacity tracked via schedule.bookedCount
 *    - tourId, bookingDate, bookingTime auto-populated from schedule (dual-write)
 *
 * 2. **Availability-based (new)**: Provide `tourId`, `bookingDate`, `bookingTime`
 *    - No schedule record needed
 *    - Capacity computed dynamically by counting bookings
 *    - Validated against TourAvailabilityService
 *
 * During migration, you can provide either or both. If scheduleId is provided,
 * the schedule-based flow is used and new fields are back-filled. If only
 * tourId+date+time is provided, the availability-based flow is used.
 */
export interface CreateBookingInput {
  customerId: string;

  // Schedule-based model (legacy) - optional during migration
  scheduleId?: string;

  // Availability-based model (new) - required if no scheduleId
  tourId?: string;
  bookingDate?: Date;
  bookingTime?: string; // "HH:MM" format

  bookingOptionId?: string;
  guestAdults?: number;
  guestChildren?: number;
  guestInfants?: number;
  pricingSnapshot?: PricingSnapshot;
  adultCount: number;
  childCount?: number;
  infantCount?: number;
  specialRequests?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  internalNotes?: string;
  source?: BookingSource;
  sourceDetails?: string;
  participants?: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    type: "adult" | "child" | "infant";
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
    notes?: string;
  }>;
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
}

export interface UpdateBookingInput {
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  specialRequests?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  internalNotes?: string;
  discount?: string;
  tax?: string;
}

// ============================================================================
// Participant Types
// ============================================================================

export interface ParticipantInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type: "adult" | "child" | "infant";
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  notes?: string;
}

// ============================================================================
// Bulk Operation Results
// ============================================================================

export interface BulkConfirmResult {
  confirmed: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface BulkCancelResult {
  cancelled: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface BulkPaymentUpdateResult {
  updated: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface BulkRescheduleResult {
  rescheduled: string[];
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// Stats Types
// ============================================================================

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: string;
  averageBookingValue: string;
  participantCount: number;
}

export interface UrgencyGroupedBookings {
  critical: BookingWithRelations[];
  high: BookingWithRelations[];
  medium: BookingWithRelations[];
  low: BookingWithRelations[];
  stats: {
    needsAction: number;
    critical: number;
    pendingConfirmation: number;
    unpaid: number;
  };
}

export interface ActionableBookings {
  unconfirmed: BookingWithRelations[];
  unpaid: BookingWithRelations[];
  stats: {
    total: number;
    unconfirmed: number;
    unpaid: number;
  };
}

export interface DayBookings {
  date: string;
  dayLabel: string;
  bookings: BookingWithRelations[];
  stats: {
    total: number;
    guests: number;
    revenue: number;
    needsAction: number;
  };
}

export interface UpcomingBookings {
  byDay: DayBookings[];
  stats: {
    totalBookings: number;
    totalGuests: number;
    totalRevenue: number;
    needsAction: number;
  };
}

export interface TodayBookingsWithUrgency {
  bookings: Array<BookingWithRelations & {
    urgency: "critical" | "high" | "medium" | "low" | "none" | "past";
    timeUntil: string;
  }>;
  stats: {
    total: number;
    guests: number;
    revenue: number;
    confirmed: number;
    pending: number;
    paid: number;
  };
}
