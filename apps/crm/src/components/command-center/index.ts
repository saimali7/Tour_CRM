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
export { DispatchHeader } from "./dispatch-header";
export { StatusBanner } from "./status-banner";
export { WarningsPanel } from "./warnings-panel";

// =============================================================================
// DETAIL PANELS
// =============================================================================

export { GuestCard, type GuestCardProps, type GuestCardBooking } from "./guest-card";
export { GuideCard, type GuideCardProps, type GuideCardData, type GuideAssignment } from "./guide-card";

// =============================================================================
// ADJUST MODE (drag-and-drop guide reassignment)
// =============================================================================

export {
  AdjustModeProvider,
  AdjustModeToggle,
  DraggableSegment,
  DroppableGuideRow,
  DndProvider,
  useAdjustMode,
  type PendingChange,
  type DraggableSegmentData,
  type DroppableGuideRowData,
} from "./adjust-mode";

// =============================================================================
// HOPPER (unassigned bookings)
// =============================================================================

export { HopperPanel, HopperCard, type HopperBooking } from "./hopper";

// =============================================================================
// MAP PANEL (route context)
// =============================================================================

export {
  MapPanel,
  type RouteStop,
  type GhostPreviewData,
} from "./map-panel";

// =============================================================================
// TIMELINE (re-export from timeline submodule)
// =============================================================================

export {
  // Components
  TimelineContainer,
  TimelineHeader,
  GuideRow,
  Segment,
  SegmentWrapper,
  IdleSegment,
  DriveSegment,
  PickupSegment,
  TourSegment,
  GuestDots,

  // Types
  type TimelineContainerProps,
  type ConfidenceLevel,
  type SegmentType,
  type BaseSegment,
  type IdleSegmentType,
  type DriveSegmentType,
  type PickupSegmentType,
  type TourSegmentType,
  type TimelineSegment,
  type BookingWithCustomer,
  type TourInfo,
  type GuideInfo,
  type GuideTimeline,

  // Utilities
  confidenceColors,
  timeToPercent,
  segmentWidthPercent,
  formatDuration,
  formatTimeDisplay,
  generateHourMarkers,
  getGuideFullName,
  getGuideInitials,
} from "./timeline";
