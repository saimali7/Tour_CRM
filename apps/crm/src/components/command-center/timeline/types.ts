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
    bg: "bg-success",
    bgHover: "hover:bg-success",
    text: "text-success",
    border: "border-success",
  },
  good: {
    bg: "bg-info",
    bgHover: "hover:bg-info",
    text: "text-info",
    border: "border-info",
  },
  review: {
    bg: "bg-warning",
    bgHover: "hover:bg-warning",
    text: "text-warning",
    border: "border-warning",
  },
  problem: {
    bg: "bg-destructive",
    bgHover: "hover:bg-destructive",
    text: "text-destructive",
    border: "border-destructive",
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
  /** Whether this segment represents a pending (unsaved) change in adjust mode */
  isPending?: boolean;
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
  pickupZoneColor?: string; // Hex color for zone-based coloring
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
  bookingIds?: string[]; // All booking IDs in this tour run (for drag-to-unassign)
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

    // Handle midnight (hour 24 or 0) and noon (hour 12) correctly
    const normalizedHour = hour % 24; // Handle hour 24 as 0
    const displayHour = normalizedHour % 12 || 12;
    const period = normalizedHour >= 12 && normalizedHour < 24 ? "PM" : "AM";

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

// =============================================================================
// ZONE COLOR UTILITIES
// =============================================================================

/**
 * Default zone colors - DISTINCT categorical palette
 * Designed for instant visual differentiation at a glance
 * Each color is perceptually unique (hue, saturation, brightness vary)
 */
export const DEFAULT_ZONE_COLORS: Record<string, string> = {
  // Primary zones - bold, saturated, instantly recognizable
  jbr: "#8B5CF6", // Violet - premium beach area
  marina: "#0EA5E9", // Sky blue - waterfront
  downtown: "#F97316", // Orange - urban core
  palm: "#10B981", // Emerald - island greenery
  business: "#3B82F6", // Blue - corporate district

  // Secondary zones - distinct from primaries
  airport: "#64748B", // Slate - transit hub
  beach: "#06B6D4", // Cyan - coastal (distinct from marina blue)
  creek: "#14B8A6", // Teal - historic waterway
  old: "#EAB308", // Yellow - heritage district
  jumeirah: "#EC4899", // Pink - luxury residential

  // Fallback patterns
  deira: "#F59E0B", // Amber - traditional area
  bur: "#84CC16", // Lime - commercial
  karama: "#A855F7", // Purple - mixed use
  satwa: "#F43F5E", // Rose - residential
  tecom: "#6366F1", // Indigo - business
};

/**
 * Get zone color from name with fallback
 * Attempts to match zone name to known patterns
 */
export function getZoneColorFromName(zoneName: string | null | undefined): string {
  if (!zoneName) return "#6B7280"; // Gray fallback

  const nameLower = zoneName.toLowerCase();

  // Check for known zone patterns
  for (const [key, color] of Object.entries(DEFAULT_ZONE_COLORS)) {
    if (nameLower.includes(key)) return color;
  }

  // Generate a consistent color from the name hash
  return generateColorFromString(zoneName);
}

/**
 * Generate a consistent pastel color from a string
 * Uses simple hash to ensure same input always produces same color
 */
function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  // Convert to HSL with fixed saturation/lightness for consistent pastel look
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}
