import { Inngest, EventSchemas } from "inngest";

// Define event types for type safety
type BookingEvents = {
  "booking/confirmed": {
    data: {
      organizationId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      tourDate: string;
      tourTime: string;
      participants: number;
      totalAmount: string;
      currency: string;
      meetingPoint?: string;
      meetingPointDetails?: string;
    };
  };
  "booking/cancelled": {
    data: {
      organizationId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      tourDate: string;
      tourTime: string;
      cancellationReason?: string;
      refundAmount?: string;
      currency?: string;
    };
  };
  "booking/reminder": {
    data: {
      organizationId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      tourDate: string;
      tourTime: string;
      participants: number;
      meetingPoint?: string;
      meetingPointDetails?: string;
      hoursUntilTour: number;
    };
  };
  "schedule/reminder-check": {
    data: {
      organizationId: string;
    };
  };
  // Phase 2 events
  "cart/abandoned": {
    data: {
      organizationId: string;
      cartId: string;
      email: string;
      customerName?: string;
      tourName: string;
      tourDate?: string;
      cartTotal?: string;
      currency?: string;
      recoveryToken: string;
    };
  };
  "automation/process-abandoned-carts": {
    data: {
      organizationId: string;
    };
  };
  "automation/send-review-requests": {
    data: {
      organizationId: string;
    };
  };
  "automation/check-availability-alerts": {
    data: {
      organizationId: string;
      scheduleId: string;
      availableSpots: number;
    };
  };
  "automation/check-price-drops": {
    data: {
      organizationId: string;
      tourId: string;
      oldPrice: string;
      newPrice: string;
    };
  };
};

// Create the Inngest client
export const inngest = new Inngest({
  id: "tour-crm",
  schemas: new EventSchemas().fromRecord<BookingEvents>(),
});

export type { BookingEvents };
