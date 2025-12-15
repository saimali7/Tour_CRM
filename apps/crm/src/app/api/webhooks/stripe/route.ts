import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@tour/database";
import { bookings, organizations } from "@tour/database";
import { eq, and } from "drizzle-orm";
// import { inngest } from "@/inngest"; // TODO: Add inngest events later

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 * Multi-tenant: Routes events to correct organization based on Connect account.
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
    account: event.account,
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

  // Get organization to verify Stripe Connect account
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    console.error(`Organization not found: ${organizationId}`);
    return;
  }

  // Verify the payment intent belongs to the organization's Stripe account
  if (event.account !== organization.stripeConnectAccountId) {
    console.error(
      `Account mismatch: event.account=${event.account}, org.stripeConnectAccountId=${organization.stripeConnectAccountId}`
    );
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

  // TODO: Send payment confirmation email via Inngest
  // await inngest.send({
  //   name: "booking/payment.succeeded",
  //   data: {
  //     organizationId,
  //     bookingId,
  //     paymentIntentId: paymentIntent.id,
  //     amount: amountInDollars,
  //     currency: paymentIntent.currency,
  //   },
  // });
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

  // TODO: Send payment failed notification via Inngest
  // await inngest.send({
  //   name: "booking/payment.failed",
  //   data: {
  //     organizationId,
  //     bookingId,
  //     paymentIntentId: paymentIntent.id,
  //     errorMessage: paymentIntent.last_payment_error?.message || "Unknown error",
  //   },
  // });
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

    // TODO: Send refund notification via Inngest
    // await inngest.send({
    //   name: "booking/refunded",
    //   data: {
    //     organizationId: booking.organizationId,
    //     bookingId: booking.id,
    //     refundAmount: (charge.amount_refunded / 100).toFixed(2),
    //     currency: charge.currency,
    //   },
    // });
  } else {
    // Partial refund
    const refundedAmount = (charge.amount_refunded / 100).toFixed(2);
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
