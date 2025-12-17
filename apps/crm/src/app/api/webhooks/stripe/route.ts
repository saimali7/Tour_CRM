import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@tour/database";
import { bookings, customers, schedules } from "@tour/database";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest";
import { format } from "date-fns";

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 *
 * Events handled:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund processed
 * - checkout.session.completed - Checkout session completed
 */

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`Received Stripe webhook: ${event.type}`, {
    eventId: event.id,
  });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event);
        break;

      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log("Payment succeeded:", {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata,
  });

  const { organizationId, bookingId } = paymentIntent.metadata;

  if (!organizationId || !bookingId) {
    console.error("Missing organizationId or bookingId in payment intent metadata");
    return;
  }

  // Get the booking
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, organizationId)
    ),
  });

  if (!booking) {
    console.error(`Booking not found: ${bookingId} for org: ${organizationId}`);
    return;
  }

  // Check if we've already processed this payment intent (idempotency)
  if (booking.stripePaymentIntentId === paymentIntent.id && booking.paymentStatus === "paid") {
    console.log(`Payment intent ${paymentIntent.id} already processed for booking ${bookingId}`);
    return;
  }

  // Update booking payment status
  const amountInDollars = (paymentIntent.amount / 100).toFixed(2);

  await db
    .update(bookings)
    .set({
      paymentStatus: "paid",
      paidAmount: amountInDollars,
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId))
    );

  console.log(`Updated booking ${bookingId} to paid status`);

  // Get customer details for the email
  const customer = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, booking.customerId),
      eq(customers.organizationId, organizationId)
    ),
  });

  // Get schedule and tour details
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, booking.scheduleId),
    with: {
      tour: true,
    },
  });

  // Send payment confirmation email via Inngest
  if (customer?.email) {
    await inngest.send({
      name: "payment/succeeded",
      data: {
        organizationId,
        bookingId,
        customerId: booking.customerId,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        bookingReference: booking.referenceNumber,
        tourName: schedule?.tour?.name || "Tour",
        tourDate: schedule?.startsAt
          ? format(new Date(schedule.startsAt), "MMMM d, yyyy")
          : "Scheduled Date",
        amount: amountInDollars,
        currency: paymentIntent.currency.toUpperCase(),
        stripeReceiptUrl: paymentIntent.latest_charge
          ? typeof paymentIntent.latest_charge === "string"
            ? undefined
            : (paymentIntent.latest_charge as Stripe.Charge).receipt_url || undefined
          : undefined,
      },
    });

    console.log(`Sent payment/succeeded event for booking ${bookingId}`);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log("Payment failed:", {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata,
    lastPaymentError: paymentIntent.last_payment_error,
  });

  const { organizationId, bookingId } = paymentIntent.metadata;

  if (!organizationId || !bookingId) {
    console.error("Missing organizationId or bookingId in payment intent metadata");
    return;
  }

  // Get the booking first
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, organizationId)
    ),
  });

  if (!booking) {
    console.error(`Booking not found: ${bookingId} for org: ${organizationId}`);
    return;
  }

  // Update booking payment status to failed
  await db
    .update(bookings)
    .set({
      paymentStatus: "failed",
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId))
    );

  console.log(`Updated booking ${bookingId} to failed payment status`);

  // Get customer details for the email
  const customer = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, booking.customerId),
      eq(customers.organizationId, organizationId)
    ),
  });

  // Send payment failed notification via Inngest
  if (customer?.email) {
    await inngest.send({
      name: "payment/failed",
      data: {
        organizationId,
        bookingId,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        bookingReference: booking.referenceNumber,
        errorMessage: paymentIntent.last_payment_error?.message || "Payment could not be processed",
      },
    });

    console.log(`Sent payment/failed event for booking ${bookingId}`);
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  console.log("Charge refunded:", {
    id: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    refunded: charge.refunded,
  });

  if (!charge.payment_intent) {
    console.log("No payment intent associated with charge");
    return;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent.id;

  // Find booking by payment intent ID
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.stripePaymentIntentId, paymentIntentId),
  });

  if (!booking) {
    console.error(`Booking not found for payment intent: ${paymentIntentId}`);
    return;
  }

  // If fully refunded, update booking status
  if (charge.refunded) {
    await db
      .update(bookings)
      .set({
        paymentStatus: "refunded",
        paidAmount: "0",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, booking.id),
          eq(bookings.organizationId, booking.organizationId)
        )
      );

    console.log(`Updated booking ${booking.id} to refunded status`);
  } else {
    // Partial refund
    const remainingAmount = ((charge.amount - charge.amount_refunded) / 100).toFixed(2);

    await db
      .update(bookings)
      .set({
        paymentStatus: parseFloat(remainingAmount) > 0 ? "partial" : "refunded",
        paidAmount: remainingAmount,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, booking.id),
          eq(bookings.organizationId, booking.organizationId)
        )
      );

    console.log(`Updated booking ${booking.id} with partial refund`);
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  console.log("Checkout session completed:", {
    id: session.id,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
  });

  // Payment intent succeeded event will handle the actual booking update
  // This event is just for logging/tracking
  if (session.payment_status === "paid") {
    console.log(`Checkout session ${session.id} paid successfully`);
  }
}
