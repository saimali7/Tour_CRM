// Booking Form Components
// Modular form for creating and editing bookings

export { BookingFormContainer as BookingForm } from "./BookingFormContainer";

// Individual sections for advanced use cases
export { CustomerSection } from "./CustomerSection";
export { TourSection } from "./TourSection";
export { DateTimeSection } from "./DateTimeSection";
export { ScheduleSection } from "./ScheduleSection";
export { ParticipantSection } from "./ParticipantSection";
export { PricingSection } from "./PricingSection";
export { NotesSection } from "./NotesSection";

// Hook for custom form implementations
export { useBookingForm, formatScheduleDate } from "./useBookingForm";

// Types
export type {
  BookingFormProps,
  BookingFormData,
  CalculatedPrice,
  ExistingBooking,
  ScheduleWithDetails,
  PricingTier,
  FormUpdateFn,
  BookingFormCustomer,
  BookingFormSchedule,
  BookingFormTour,
} from "./types";
