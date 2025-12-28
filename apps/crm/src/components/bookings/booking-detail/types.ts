// Booking Detail Component Types
// These types represent the data structures used across booking detail components

export interface BookingCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

export interface BookingSchedule {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  maxParticipants: number;
  bookedCount?: number;
}

export interface BookingTour {
  id: string;
  name: string;
  duration: number | null;
}

export interface BookingParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  type: "adult" | "child" | "infant";
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
}

export interface BookingGuideAssignment {
  id: string;
  guideId: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
}

export interface BalanceInfo {
  total: string;
  totalPaid: string;
  balance: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed";
export type BookingSource = "manual" | "website" | "api" | "phone" | "walk_in";

export interface BookingData {
  id: string;
  referenceNumber: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  source: BookingSource;

  // Guest counts
  totalParticipants: number;
  adultCount: number;
  childCount: number | null;
  infantCount: number | null;

  // Financial
  subtotal: string;
  discount: string | null;
  tax: string | null;
  total: string;
  paidAmount: string | null;

  // Special requirements
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;

  // Timestamps
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;

  // Relations
  customer: BookingCustomer | null;
  schedule: BookingSchedule | null;
  tour: BookingTour | null;
  participants: BookingParticipant[] | null;

  // Stripe
  stripePaymentIntentId: string | null;

  // Pricing snapshot
  pricingSnapshot: {
    optionName?: string;
    [key: string]: unknown;
  } | null;
}

// Urgency levels for time context
export type UrgencyLevel = {
  type: "past" | "today" | "tomorrow" | "soon" | "normal";
  label: string;
  daysUntil: number;
};

// Primary action configuration
export interface PrimaryAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  loading: boolean;
  variant: "confirm" | "complete" | "refund" | "default";
}
