// Booking Detail Components
// Action-first, operator-optimized booking detail view

export { BookingHeader } from "./booking-header";
export { OperationsAlertBar } from "./operations-alert-bar";
export { StatusCards } from "./status-cards";
export { QuickContactMenu } from "./quick-contact-menu";
export { FloatingActionBar } from "./floating-action-bar";
export { GuestSummaryCard } from "./guest-summary-card";
export { ActionItemsCard } from "./action-items-card";

// Collapsible Sections
export {
  GuestsSection,
  GuideSection,
  PaymentsSection,
  ActivitySection,
} from "./collapsible-sections";

// Design Tokens
export {
  typography,
  spacing,
  colors,
  animations,
  layout,
  getStatusColors,
} from "./tokens";

// Types
export type {
  BookingData,
  BookingCustomer,
  BookingSchedule,
  BookingTour,
  BookingParticipant,
  BookingGuideAssignment,
  BalanceInfo,
  BookingStatus,
  PaymentStatus,
  BookingSource,
  UrgencyLevel,
  PrimaryAction,
} from "./types";

export type { BookingStatus as TokenBookingStatus, ActionVariant } from "./tokens";
