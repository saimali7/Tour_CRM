import { Inngest } from "inngest";
import { logger } from "@tour/services";

const inngestLogger = logger.child({ service: "web-inngest" });

const inngest = new Inngest({ id: "tour-web" });

export interface BookingCreatedEventData {
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
}

export async function sendBookingCreatedEvent(
  data: BookingCreatedEventData
): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    inngestLogger.debug(
      { bookingId: data.bookingId },
      "Skipping booking/created event: INNGEST_EVENT_KEY not configured"
    );
    return;
  }

  try {
    await inngest.send({
      name: "booking/created",
      data,
    });

    inngestLogger.debug(
      { bookingId: data.bookingId, organizationId: data.organizationId },
      "Sent booking/created event"
    );
  } catch (error) {
    inngestLogger.error(
      { err: error, bookingId: data.bookingId, organizationId: data.organizationId },
      "Failed to send booking/created event"
    );
  }
}

export interface CartAbandonedEventData {
  organizationId: string;
  cartId: string;
  email: string;
  customerName?: string;
  tourName: string;
  tourDate?: string;
  cartTotal?: string;
  currency?: string;
  recoveryToken: string;
}

export async function sendCartAbandonedEvent(
  data: CartAbandonedEventData
): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    return;
  }

  try {
    await inngest.send({
      name: "cart/abandoned",
      data,
    });
  } catch (error) {
    inngestLogger.error(
      { err: error, cartId: data.cartId, organizationId: data.organizationId },
      "Failed to send cart/abandoned event"
    );
  }
}
