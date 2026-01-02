/**
 * Tour Command Center - Timeline Components
 *
 * A complete timeline visualization system for the guide dispatch interface.
 * Displays guide schedules as horizontal "segmented tapes" showing:
 * - Idle time (available periods)
 * - Drive time (travel between locations)
 * - Pickups (customer pickup points)
 * - Tours (the main activity)
 *
 * @example
 * ```tsx
 * import {
 *   TimelineContainer,
 *   type GuideTimeline,
 *   type TimelineSegment,
 * } from "@/components/command-center/timeline";
 *
 * function CommandCenter() {
 *   const timelines: GuideTimeline[] = [...];
 *
 *   return (
 *     <TimelineContainer
 *       timelines={timelines}
 *       startHour={6}
 *       endHour={20}
 *       onSegmentClick={(segment, guide) => {
 *         console.log("Clicked", segment, "for guide", guide);
 *       }}
 *     />
 *   );
 * }
 * ```
 */

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

export { TimelineContainer, type TimelineContainerProps } from "./timeline-container";
export { TimelineHeader } from "./timeline-header";
export { GuideRow } from "./guide-row";

// =============================================================================
// SEGMENT COMPONENTS
// =============================================================================

export { Segment, SegmentWrapper } from "./segment";
export { IdleSegment } from "./idle-segment";
export { DriveSegment } from "./drive-segment";
export { PickupSegment, GuestDots } from "./pickup-segment";
export { TourSegment } from "./tour-segment";

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Confidence
  ConfidenceLevel,

  // Segment types
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

  // Time utilities
  timeToPercent,
  segmentWidthPercent,
  formatDuration,
  formatTimeDisplay,
  generateHourMarkers,

  // Guide utilities
  getGuideFullName,
  getGuideInitials,
} from "./types";
