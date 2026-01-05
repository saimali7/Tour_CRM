/**
 * Data Transformers for Command Center
 *
 * Pure functions that transform service API responses to component-friendly formats.
 * Extracted from command-center.tsx for better maintainability and testability.
 */

import type { GuideTimeline, TimelineSegment } from "./timeline/types";
import type { DispatchWarning, DispatchStatus, DispatchSuggestion } from "./types";

// =============================================================================
// SERVICE TYPE DEFINITIONS (from API responses)
// =============================================================================

export interface ServiceBooking {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerEmail: string | null;
  totalParticipants: number;
  adultCount: number;
  childCount: number;
  specialOccasion: string | null;
  isFirstTime: boolean;
}

export interface ServiceSegment {
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  booking?: ServiceBooking;
  pickupLocation?: string;
  pickupZoneName?: string;
  pickupZoneColor?: string;
  guestCount?: number;
  tour?: { id: string; name: string; slug: string };
  tourRunKey?: string;
  bookingIds?: string[];
  confidence: string;
}

export interface ServiceGuide {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export interface ServiceTimeline {
  guide: ServiceGuide;
  vehicleCapacity: number;
  segments: ServiceSegment[];
  totalDriveMinutes: number;
  totalGuests: number;
  utilization: number;
}

export interface ServiceWarning {
  id: string;
  type: string;
  message: string;
  bookingId?: string;
  tourRunKey?: string;
  resolutions: Array<{
    id: string;
    label: string;
    action: string;
    guideId?: string;
    impactMinutes?: number;
  }>;
}

// =============================================================================
// WARNING TRANSFORMERS
// =============================================================================

/**
 * Map service warning type to component warning type
 */
export function mapWarningType(type: string): DispatchWarning["type"] {
  switch (type) {
    case "insufficient_guides":
    case "capacity_exceeded":
      return "capacity";
    case "no_qualified_guide":
    case "no_available_guide":
      return "no_guide";
    case "conflict":
      return "conflict";
    default:
      return "capacity";
  }
}

/**
 * Transform service warnings to component warnings format
 */
export function transformWarnings(warnings: ServiceWarning[]): DispatchWarning[] {
  return warnings.map((warning) => ({
    id: warning.id,
    type: mapWarningType(warning.type),
    message: warning.message,
    bookingId: warning.bookingId,
    suggestions: warning.resolutions.map((resolution) => ({
      id: resolution.id,
      label: resolution.label,
      impact: resolution.impactMinutes ? `+${resolution.impactMinutes}m` : undefined,
      guideId: resolution.guideId,
    })),
  }));
}

// =============================================================================
// STATUS TRANSFORMERS
// =============================================================================

/**
 * Map service status to component dispatch status
 */
export function mapDispatchStatus(status: string, unresolvedWarnings: number): DispatchStatus {
  if (status === "dispatched") return "dispatched";
  if (status === "ready") return "ready";
  if (status === "optimized" && unresolvedWarnings > 0) return "needs_review";
  if (status === "optimized") return "optimized";
  return "pending";
}

// =============================================================================
// TIMELINE TRANSFORMERS
// =============================================================================

/**
 * Generate stable segment ID based on type and content
 * Ensures IDs are consistent across re-renders
 */
function generateSegmentId(segment: ServiceSegment, index: number): string {
  if (segment.type === "pickup" && segment.booking?.id) {
    return `pickup_${segment.booking.id}`;
  }
  if (segment.type === "tour" && segment.tourRunKey) {
    return `tour_${segment.tourRunKey}`;
  }
  if (segment.type === "tour" && segment.tour?.id) {
    return `tour_${segment.tour.id}_${segment.startTime}`;
  }
  // Fallback for idle/drive segments - use type + time for uniqueness
  return `${segment.type}_${segment.startTime}_${index}`;
}

/**
 * Transform service timeline segment to component segment format
 */
export function transformTimelineSegment(
  segment: ServiceSegment,
  index: number
): TimelineSegment {
  const segmentId = generateSegmentId(segment, index);

  const baseSegment = {
    id: segmentId,
    startTime: segment.startTime,
    endTime: segment.endTime,
    durationMinutes: segment.durationMinutes,
    confidence: (segment.confidence || "optimal") as "optimal" | "good" | "review" | "problem",
  };

  switch (segment.type) {
    case "idle":
      return { ...baseSegment, type: "idle" };
    case "drive":
      return { ...baseSegment, type: "drive" };
    case "pickup":
      return {
        ...baseSegment,
        type: "pickup",
        pickupLocation: segment.pickupLocation || "Unknown Location",
        pickupZoneName: segment.pickupZoneName,
        pickupZoneColor: segment.pickupZoneColor,
        guestCount: segment.guestCount || 0,
        booking: segment.booking
          ? {
              id: segment.booking.id,
              referenceNumber: segment.booking.referenceNumber,
              totalParticipants: segment.booking.totalParticipants,
              adultCount: segment.booking.adultCount,
              childCount: segment.booking.childCount,
              specialOccasion: segment.booking.specialOccasion,
              customer: {
                id: segment.booking.id,
                firstName: segment.booking.customerName?.split(" ")[0] ?? "",
                lastName: segment.booking.customerName?.split(" ").slice(1).join(" ") ?? "",
                email: segment.booking.customerEmail,
              },
            }
          : {
              id: "unknown",
              referenceNumber: "N/A",
              totalParticipants: segment.guestCount || 0,
              adultCount: segment.guestCount || 0,
            },
        isFirstTimer: segment.booking?.isFirstTime,
        hasSpecialOccasion: !!segment.booking?.specialOccasion,
      };
    case "tour":
      return {
        ...baseSegment,
        type: "tour",
        tour: segment.tour
          ? {
              id: segment.tour.id,
              name: segment.tour.name,
              durationMinutes: segment.durationMinutes,
            }
          : {
              id: "unknown",
              name: "Tour",
              durationMinutes: segment.durationMinutes,
            },
        totalGuests: segment.guestCount || 0,
        scheduleId: segment.tourRunKey, // For tracking which tour run this belongs to
        bookingIds: segment.bookingIds, // For drag-to-unassign
      };
    default:
      return { ...baseSegment, type: "idle" };
  }
}

/**
 * Transform service guide timeline to component format
 */
export function transformGuideTimeline(timeline: ServiceTimeline): GuideTimeline {
  return {
    guide: {
      id: timeline.guide.id,
      firstName: timeline.guide.firstName,
      lastName: timeline.guide.lastName,
      email: timeline.guide.email || "",
      phone: timeline.guide.phone,
      avatarUrl: timeline.guide.avatarUrl,
      vehicleCapacity: timeline.vehicleCapacity,
      status: "active",
    },
    segments: timeline.segments.map((seg, idx) => transformTimelineSegment(seg, idx)),
    totalDriveMinutes: timeline.totalDriveMinutes,
    totalGuests: timeline.totalGuests,
    utilization: timeline.utilization,
  };
}
