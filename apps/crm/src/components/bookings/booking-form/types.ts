// Booking Form Types
// Shared types for the booking form components

export interface BookingFormCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface BookingFormSchedule {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

export interface BookingFormTour {
  id: string;
  name: string;
  basePrice?: string;
}

export interface ExistingBooking {
  id: string;
  customerId: string;
  scheduleId: string | null;
  // New availability-based fields
  tourId?: string | null;
  bookingDate?: Date | null; // Date object from database
  bookingTime?: string | null;
  adultCount: number;
  childCount: number | null;
  infantCount: number | null;
  subtotal: string;
  discount: string | null;
  tax: string | null;
  total: string;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  customer?: BookingFormCustomer;
  schedule?: BookingFormSchedule;
  tour?: BookingFormTour;
}

export interface BookingFormProps {
  booking?: ExistingBooking;
  preselectedCustomerId?: string;
  preselectedScheduleId?: string;
  preselectedTourId?: string;
}

export interface BookingFormData {
  customerId: string;
  // New availability-based fields
  tourId: string;
  bookingDate: string | null; // YYYY-MM-DD format
  bookingTime: string | null; // HH:MM format
  // Legacy field - kept for backward compatibility
  scheduleId: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  discount: string;
  tax: string;
  specialRequests: string;
  dietaryRequirements: string;
  accessibilityNeeds: string;
  internalNotes: string;
}

export interface CalculatedPrice {
  subtotal: string;
  total: string;
}

export interface ScheduleWithDetails {
  id: string;
  startsAt: Date;
  endsAt: Date;
  maxParticipants: number;
  bookedCount?: number;
  price: string | null;
  tour?: {
    id: string;
    name: string;
    basePrice: string;
  } | null;
}

export interface PricingTier {
  id: string;
  name: string;
  label: string;
  price: string;
  isActive: boolean;
}

export type FormUpdateFn = <K extends keyof BookingFormData>(
  field: K,
  value: BookingFormData[K]
) => void;
