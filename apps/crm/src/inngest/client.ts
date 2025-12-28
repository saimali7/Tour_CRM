import { Inngest, EventSchemas } from "inngest";

// Define event types for type safety
type BookingEvents = {
  "booking/created": {
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
  "booking/rescheduled": {
    data: {
      organizationId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      oldTourDate: string;
      oldTourTime: string;
      newTourDate: string;
      newTourTime: string;
      participants: number;
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
  "booking/completed": {
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
      guideId?: string;
      guideName?: string;
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
  // Guide notification events
  "guide/assignment.created": {
    data: {
      organizationId: string;
      assignmentId: string;
      scheduleId: string;
      guideId: string;
      guideName: string;
      guideEmail: string;
      tourName: string;
      startsAt: string;
      endsAt: string;
      meetingPoint?: string;
      meetingPointDetails?: string;
    };
  };
  "guide/assignment.pending-reminder": {
    data: {
      organizationId: string;
      assignmentId: string;
      scheduleId: string;
      guideId: string;
      guideName: string;
      guideEmail: string;
      tourName: string;
      startsAt: string;
      endsAt: string;
      meetingPoint?: string;
      meetingPointDetails?: string;
    };
  };
  "guide/schedule.reminder": {
    data: {
      organizationId: string;
      scheduleId: string;
      guideId: string;
      guideName: string;
      guideEmail: string;
      tourName: string;
      startsAt: string;
      endsAt: string;
      participantCount: number;
      meetingPoint?: string;
      meetingPointDetails?: string;
    };
  };
  "guide/daily-manifest": {
    data: {
      organizationId: string;
    };
  };
  // Refund events
  "refund/processed": {
    data: {
      organizationId: string;
      refundId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      refundAmount: string;
      currency: string;
      reason?: string;
    };
  };
  // Payment events
  "payment/succeeded": {
    data: {
      organizationId: string;
      bookingId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      tourName: string;
      tourDate: string;
      amount: string;
      currency: string;
      stripeReceiptUrl?: string;
    };
  };
  "payment/failed": {
    data: {
      organizationId: string;
      bookingId: string;
      customerEmail: string;
      customerName: string;
      bookingReference: string;
      errorMessage: string;
    };
  };
};

// Test/health check events
type TestEvents = {
  "test/health-check": {
    data: {
      organizationId: string;
      timestamp: string;
      test: boolean;
    };
  };
};

// Combined events
type AllEvents = BookingEvents & TestEvents;

// Create the Inngest client
export const inngest = new Inngest({
  id: "tour-crm",
  schemas: new EventSchemas().fromRecord<AllEvents>(),
});

export type { BookingEvents, TestEvents, AllEvents };
