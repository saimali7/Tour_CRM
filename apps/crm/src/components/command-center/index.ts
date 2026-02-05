/**
 * Tour Command Center
 *
 * Production exports for the dispatch surface.
 */

export { CommandCenter } from "./command-center";
export { CommandStrip } from "./command-strip";
export { WarningsPanel } from "./warnings-panel";
export { DispatchConfirmDialog } from "./dispatch-confirm-dialog";
export { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
export { GuestCard, type GuestCardProps, type GuestCardBooking } from "./guest-card";
export { GuideCard, type GuideCardProps, type GuideCardData, type GuideAssignment } from "./guide-card";
export { DispatchCanvas } from "./dispatch-canvas";
export { LiveAnnouncerProvider, useLiveAnnouncer } from "./live-announcer";
export { HopperCard, type HopperBooking, MobileHopperSheet } from "./hopper";
export { buildCommandCenterViewModel, mapStatus, mapWarningType } from "./dispatch-model";

export type {
  DispatchStatus,
  DispatchWarning,
  DispatchSuggestion,
  DispatchData,
  CommandCenterProps,
} from "./types";

export type {
  CanvasRun,
  CanvasRow,
  HopperGroup,
  CommandCenterViewModel,
} from "./dispatch-model";

export type {
  ConfidenceLevel,
  SegmentType,
  BaseSegment,
  IdleSegment,
  DriveSegment,
  PickupSegment,
  TourSegment,
  TimelineSegment,
  BookingWithCustomer,
  TourInfo,
  GuideInfo,
  GuideTimeline,
} from "./timeline/types";
