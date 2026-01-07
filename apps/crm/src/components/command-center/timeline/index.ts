/**
 * Tour Command Center - Timeline Components
 *
 * Timeline utilities and types for the guide dispatch interface.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Confidence
  ConfidenceLevel,

  // Segment types (for compatibility)
  SegmentType,
  BaseSegment,
  IdleSegment as IdleSegmentType,
  DriveSegment as DriveSegmentType,
  PickupSegment as PickupSegmentType,
  TourSegment as TourSegmentType,
  TimelineSegment,

  // Booking/Tour types
  BookingWithCustomer,
  TourInfo,

  // Guide types
  GuideInfo,
  GuideTimeline,
} from "./types";

// =============================================================================
// UTILITIES
// =============================================================================

export {
  // Color utilities
  confidenceColors,

  // Time utilities (from types.ts)
  timeToPercent,
  segmentWidthPercent,
  formatDuration,
  formatTimeDisplay,
  generateHourMarkers,

  // Guide utilities
  getGuideFullName,
  getGuideInitials,
} from "./types";

// New timeline utilities
export * from "./timeline-utils";

// =============================================================================
// COMPONENTS (kept for potential reuse)
// =============================================================================

export { AddGuideRow, type AvailableGuide } from "./add-guide-row";
