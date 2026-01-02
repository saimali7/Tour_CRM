/**
 * Timeline Types for Tour Command Center
 *
 * These types power the segmented tape visualization showing
 * guide schedules with drive, pickup, and tour segments.
 */

// =============================================================================
// CONFIDENCE TYPES
// =============================================================================

/**
 * Confidence level for an assignment
 * Used for color-coding segments based on optimization quality
 */
export type ConfidenceLevel = "optimal" | "good" | "review" | "problem";

/**
 * Maps confidence levels to Tailwind color classes
 */
export const confidenceColors: Record<ConfidenceLevel, {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
}> = {
  optimal: {
    bg: "bg-emerald-500",
    bgHover: "hover:bg-emerald-600",
    text: "text-emerald-50",
    border: "border-emerald-600",
  },
  good: {
    bg: "bg-blue-500",
    bgHover: "hover:bg-blue-600",
    text: "text-blue-50",
    border: "border-blue-600",
  },
  review: {
    bg: "bg-amber-500",
    bgHover: "hover:bg-amber-600",
    text: "text-amber-50",
    border: "border-amber-600",
  },
  problem: {
    bg: "bg-red-500",
    bgHover: "hover:bg-red-600",
    text: "text-red-50",
    border: "border-red-600",
  },
};

// =============================================================================
// SEGMENT TYPES
// =============================================================================

/**
 * Segment type identifiers
 *
 * idle: Guide is free during this time (light gray, subtle)
 * drive: Travel time between locations (dark gray, thin)
 * pickup: Customer pickup at a location (colored by confidence)
 * tour: The actual tour/activity (bold, saturated)
 */
export type SegmentType = "idle" | "drive" | "pickup" | "tour";

/**
 * Base segment interface - common properties for all segments
 */
export interface BaseSegment {
  id: string;
  type: SegmentType;
  startTime: string; // HH:MM format, e.g., "08:15"
  endTime: string; // HH:MM format, e.g., "09:30"
  durationMinutes: number;
  confidence: ConfidenceLevel;
}

/**
 * Idle segment - represents available/free time
 */
export interface IdleSegment extends BaseSegment {
  type: "idle";
}

/**
 * Drive segment - represents travel time between locations
 */
export interface DriveSegment extends BaseSegment {
  type: "drive";
  fromLocation?: string;
  toLocation?: string;
}

/**
 * Booking with customer info for pickup segments
 */
export interface BookingWithCustomer {
  id: string;
  referenceNumber: string;
  totalParticipants: number;
  adultCount: number;
  childCount?: number | null;
  specialRequests?: string | null;
  specialOccasion?: string | null;
  pickupNotes?: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

/**
 * Pickup segment - represents a customer pickup at a location
 */
export interface PickupSegment extends BaseSegment {
  type: "pickup";
  booking: BookingWithCustomer;
  pickupLocation: string;
  pickupZoneName?: string;
  guestCount: number;
  isFirstTimer?: boolean;
  hasSpecialOccasion?: boolean;
}

/**
 * Tour info for tour segments
 */
export interface TourInfo {
  id: string;
  name: string;
  durationMinutes: number;
  meetingPoint?: string | null;
  coverImageUrl?: string | null;
}

/**
 * Tour segment - represents the actual tour activity
 */
export interface TourSegment extends BaseSegment {
  type: "tour";
  tour: TourInfo;
  totalGuests: number;
  scheduleId?: string;
}

/**
 * Union type for all segment types
 */
export type TimelineSegment = IdleSegment | DriveSegment | PickupSegment | TourSegment;

// =============================================================================
// GUIDE TIMELINE TYPES
// =============================================================================

/**
 * Extended guide info for timeline display
 */
export interface GuideInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  vehicleCapacity: number;
  vehicleDescription?: string | null;
  languages?: string[] | null;
  status: "active" | "inactive" | "on_leave";
}

/**
 * A guide's complete timeline for the day
 */
export interface GuideTimeline {
  guide: GuideInfo;
  segments: TimelineSegment[];
  totalDriveMinutes: number;
  totalGuests: number;
  utilization: number; // 0-100 percentage
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert a time string to percentage position on the timeline
 *
 * @param time - Time in HH:MM format
 * @param startHour - Timeline start hour (e.g., 6 for 6 AM)
 * @param endHour - Timeline end hour (e.g., 20 for 8 PM)
 * @returns Percentage position (0-100)
 */
export function timeToPercent(
  time: string,
  startHour: number,
  endHour: number
): number {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const range = endMinutes - startMinutes;

  if (range === 0) return 0;

  return Math.max(0, Math.min(100, ((totalMinutes - startMinutes) / range) * 100));
}

/**
 * Calculate the width of a segment as a percentage
 *
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @param startHour - Timeline start hour
 * @param endHour - Timeline end hour
 * @returns Width as percentage (0-100)
 */
export function segmentWidthPercent(
  startTime: string,
  endTime: string,
  startHour: number,
  endHour: number
): number {
  const startPercent = timeToPercent(startTime, startHour, endHour);
  const endPercent = timeToPercent(endTime, startHour, endHour);
  return Math.max(0, endPercent - startPercent);
}

/**
 * Format duration in minutes to human-readable string
 *
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "15m", "1h 30m", "2h")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format time for display (12h format)
 *
 * @param time - Time in HH:MM format
 * @returns Formatted time string (e.g., "8:15 AM")
 */
export function formatTimeDisplay(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Generate hour markers for the timeline header
 *
 * @param startHour - Start hour (e.g., 6)
 * @param endHour - End hour (e.g., 20)
 * @returns Array of hour markers with position info
 */
export function generateHourMarkers(
  startHour: number,
  endHour: number
): Array<{ hour: number; label: string; percent: number }> {
  const markers: Array<{ hour: number; label: string; percent: number }> = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    const percent = timeToPercent(time, startHour, endHour);
    const displayHour = hour % 12 || 12;
    const period = hour >= 12 ? "PM" : "AM";

    markers.push({
      hour,
      label: `${displayHour}${period}`,
      percent,
    });
  }

  return markers;
}

/**
 * Get the full name of a guide
 */
export function getGuideFullName(guide: GuideInfo | Pick<GuideInfo, "firstName" | "lastName">): string {
  return `${guide.firstName} ${guide.lastName}`;
}

/**
 * Get initials for a guide (for avatar fallback)
 */
export function getGuideInitials(guide: GuideInfo | Pick<GuideInfo, "firstName" | "lastName">): string {
  return `${guide.firstName[0] || ""}${guide.lastName[0] || ""}`.toUpperCase();
}
