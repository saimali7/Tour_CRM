/**
 * Simple Timeline Components
 *
 * A simplified, booking-centric timeline system for the Command Center.
 * Replaces the complex segment-based approach with direct booking manipulation.
 *
 * Key components:
 * - BookingBlock: The core draggable unit representing a single booking
 * - BookingLane: Container for a guide's bookings with drop zone support
 * - SimpleGuideRow: Guide row with info column + booking lane
 * - SimpleHopper: Unassigned bookings panel with search/filter
 * - EditModeProvider: Single context for all edit state
 * - TimelineGrid: Time scale header and grid lines
 * - SimpleTimelineContainer: Main container that brings it all together
 *
 * Design principles:
 * 1. A booking IS the draggable unit (not segments)
 * 2. Single source of truth (one context)
 * 3. Instant mutations (no pending state)
 * 4. Native HTML5 drag (simpler than @dnd-kit)
 */

// Main container
export { SimpleTimelineContainer } from "./simple-timeline-container"

// Data transformer
export {
  transformDispatchData,
  getGuideCapacityInfo,
  wouldExceedCapacity,
  findBookingGuide,
  type TransformedData,
  type GuideWithBookings,
} from "./data-transformer"

// Core booking component
export { BookingBlock, BookingBlockGroup, type BookingData } from "../booking-block"

// Booking lane for guide rows
export { BookingLane } from "../booking-lane"

// Guide row component
export { SimpleGuideRow, DroppableAddGuideRow, type GuideInfo } from "../simple-guide-row"

// Hopper panel
export { SimpleHopper } from "../simple-hopper"

// Edit mode context
export {
  EditModeProvider,
  EditModeToggle,
  useEditMode,
  useEditModeOptional,
} from "../edit-mode-provider"

// Timeline grid
export {
  TimelineGrid,
  TimelineGridLines,
  CurrentTimeIndicator,
} from "../timeline-grid"

// Timeline utilities
export {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  GUIDE_COLUMN_WIDTH,
  SNAP_INTERVAL_MINUTES,
  parseTime,
  formatTime,
  snapMinutes,
  timeToPercent,
  percentToTime,
  durationToPercent,
  positionToTime,
  timeToPixels,
  durationToPixels,
  timesOverlap,
  generateTimeMarkers,
  formatTimeDisplay,
  getZoneColor,
  findConflicts,
  // Layout utilities (shared between booking-block and booking-lane)
  doBookingsOverlap,
  layoutBookingsIntoLanes,
  comparePickupTimes,
  type BookingForLayout,
} from "../timeline/timeline-utils"
