/**
 * Tour Command Center Components
 *
 * The Command Center is the dispatch interface for tour operators.
 * It provides a visual timeline showing guide assignments, pickups,
 * and tours for any given day.
 *
 * @example
 * ```tsx
 * import {
 *   CommandCenter,
 *   GuestCard,
 *   GuideCard,
 * } from "@/components/command-center";
 *
 * function DispatchPage() {
 *   const [date, setDate] = useState(new Date());
 *   const [selectedBooking, setSelectedBooking] = useState(null);
 *   const [selectedGuide, setSelectedGuide] = useState(null);
 *
 *   return (
 *     <>
 *       <CommandCenter
 *         date={date}
 *         onDateChange={setDate}
 *         onPreviousDay={() => setDate(prev => subDays(prev, 1))}
 *         onNextDay={() => setDate(prev => addDays(prev, 1))}
 *         onToday={() => setDate(new Date())}
 *       />
 *
 *       <GuestCard
 *         open={!!selectedBooking}
 *         onClose={() => setSelectedBooking(null)}
 *         booking={selectedBooking}
 *       />
 *
 *       <GuideCard
 *         open={!!selectedGuide}
 *         onClose={() => setSelectedGuide(null)}
 *         guide={selectedGuide}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

export { CommandCenter } from "./command-center";
export { CommandCenterErrorBoundary } from "./command-center-error-boundary";
export { CommandStrip } from "./command-strip";
export { WarningsPanel } from "./warnings-panel";

// =============================================================================
// TYPES (exported from dedicated types module)
// =============================================================================

export type {
  DispatchStatus,
  DispatchWarning,
  DispatchSuggestion,
  DispatchData,
  CommandCenterProps,
} from "./types";

// =============================================================================
// DATA TRANSFORMERS (for external use if needed)
// =============================================================================

export {
  transformGuideTimeline,
  transformTimelineSegment,
  transformWarnings,
  mapDispatchStatus,
  mapWarningType,
} from "./data-transformers";

// =============================================================================
// DETAIL PANELS
// =============================================================================

export { GuestCard, type GuestCardProps, type GuestCardBooking } from "./guest-card";
export { GuideCard, type GuideCardProps, type GuideCardData, type GuideAssignment } from "./guide-card";

// =============================================================================
// HOPPER (unassigned bookings)
// =============================================================================

export { HopperCard, type HopperBooking, MobileHopperSheet } from "./hopper";

// =============================================================================
// MAP PANEL (route context)
// =============================================================================

export {
  MapPanel,
  type RouteStop,
  type GhostPreviewData,
  type ZoneDistribution,
  type TourRunSummary,
} from "./map-panel";

// =============================================================================
// SIMPLE TIMELINE (new booking-centric timeline)
// =============================================================================

export {
  SimpleTimelineContainer,
  BookingBlock,
  BookingBlockGroup,
  BookingLane,
  SimpleGuideRow,
  DroppableAddGuideRow,
  SimpleHopper,
  EditModeProvider,
  EditModeToggle,
  useEditMode,
  useEditModeOptional,
  TimelineGrid,
  TimelineGridLines,
  CurrentTimeIndicator,
  transformDispatchData,
  getGuideCapacityInfo,
  wouldExceedCapacity,
  findBookingGuide,
  type BookingData,
  type TransformedData,
  type GuideWithBookings,
  type GuideInfo,
} from "./simple-timeline";

// =============================================================================
// TIMELINE TYPES (re-export common types)
// =============================================================================

export type {
  ConfidenceLevel,
  SegmentType,
  BaseSegment,
  IdleSegmentType,
  DriveSegmentType,
  PickupSegmentType,
  TourSegmentType,
  TimelineSegment,
  BookingWithCustomer,
  TourInfo,
  GuideTimeline,
} from "./timeline";

// =============================================================================
// TIMELINE UTILITIES
// =============================================================================

export {
  confidenceColors,
  timeToPercent,
  segmentWidthPercent,
  formatDuration,
  formatTimeDisplay,
  generateHourMarkers,
  getGuideFullName,
  getGuideInitials,
  AddGuideRow,
  type AvailableGuide,
} from "./timeline";
