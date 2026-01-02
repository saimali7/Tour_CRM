// Booking Form Types
// Shared types for the booking form components

export interface BookingFormCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface BookingFormTour {
  id: string;
  name: string;
  basePrice?: string;
}

export interface ExistingBooking {
  id: string;
  customerId: string;
  // Availability-based fields
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
  tour?: BookingFormTour;
}

export interface BookingFormProps {
  booking?: ExistingBooking;
  preselectedCustomerId?: string;
  preselectedTourId?: string;
}

export interface BookingFormData {
  customerId: string;
  // Availability-based fields
  tourId: string;
  bookingDate: string | null; // YYYY-MM-DD format
  bookingTime: string | null; // HH:MM format
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
