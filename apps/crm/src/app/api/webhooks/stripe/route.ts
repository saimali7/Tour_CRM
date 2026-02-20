import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { db } from "@tour/database";
import {
  bookings,
  checkoutAttempts,
  customers,
  stripeWebhookEvents,
  tours,
} from "@tour/database";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest";
import { format } from "date-fns";
import { webhookLogger } from "@tour/services";
import { formatDbDateKey, parseDateKeyToLocalDate } from "@/lib/date-time";

const AUTO_EXPIRED_REASON = "Booking expired after 30 minutes without payment";

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

function extractEventScope(event: Stripe.Event): {
  organizationId: string | null;
  bookingId: string | null;
} {
  const object = event.data.object as {
    metadata?: Record<string, string | undefined> | null;
  };
  const metadata = object?.metadata ?? null;
  const organizationId = metadata?.organizationId ?? null;
  const bookingId = metadata?.bookingId ?? null;
  return { organizationId, bookingId };
}

async function registerWebhookEvent(event: Stripe.Event): Promise<boolean> {
  const scope = extractEventScope(event);
  const inserted = await db
    .insert(stripeWebhookEvents)
    .values({
      eventId: event.id,
      type: event.type,
      organizationId: scope.organizationId,
      bookingId: scope.bookingId,
      metadata: {
        livemode: event.livemode,
        apiVersion: event.api_version,
        pendingWebhooks: event.pending_webhooks,
      },
      processedAt: new Date(),
    })
    .onConflictDoNothing({
      target: stripeWebhookEvents.eventId,
    })
    .returning({ id: stripeWebhookEvents.id });

  return inserted.length > 0;
}

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
    webhookLogger.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
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
    webhookLogger.error({ err }, "Webhook signature verification failed");

    // Capture signature verification failures in Sentry
    Sentry.captureException(err, {
      tags: {
        service: "stripe-webhook",
        operation: "signature-verification",
      },
      extra: {
        hasSignature: !!signature,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
    });

    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Log webhook receipt with structured data for debugging
  webhookLogger.info({
    eventType: event.type,
    eventId: event.id,
    created: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
  }, "Stripe webhook received");

  const isNewEvent = await registerWebhookEvent(event);
  if (!isNewEvent) {
    webhookLogger.info(
      {
        eventType: event.type,
        eventId: event.id,
      },
      "Duplicate webhook event ignored (already processed)"
    );
    return NextResponse.json({ received: true, duplicate: true, eventId: event.id });
  }

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
        webhookLogger.info({
          eventType: event.type,
          eventId: event.id,
        }, "Unhandled Stripe webhook event type");
    }

    // Always return 200 to acknowledge receipt - Stripe will retry on non-2xx
    return NextResponse.json({
      received: true,
      eventId: event.id,
    });
  } catch (error) {
    await db
      .delete(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.eventId, event.id))
      .catch(() => undefined);

    // Log detailed error for debugging but don't expose to client
    webhookLogger.error({
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, "Error processing Stripe webhook event");

    // Capture payment processing errors in Sentry with full context
    Sentry.captureException(error, {
      tags: {
        service: "stripe-webhook",
        operation: "event-processing",
        eventType: event.type,
      },
      extra: {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        created: new Date(event.created * 1000).toISOString(),
      },
    });

    // Return 500 to trigger Stripe retry - include event ID for correlation
    // Don't expose internal error details to the webhook caller
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        eventId: event.id,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  webhookLogger.info({
    event: "payment_succeeded",
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    organizationId: paymentIntent.metadata.organizationId,
    bookingId: paymentIntent.metadata.bookingId,
  }, "Payment succeeded");

  const { organizationId, bookingId } = paymentIntent.metadata;

  if (!organizationId || !bookingId) {
    webhookLogger.error({
      paymentIntentId: paymentIntent.id,
      hasOrganizationId: !!organizationId,
      hasBookingId: !!bookingId,
    }, "Missing metadata in payment intent");
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
    webhookLogger.error({
      bookingId,
      organizationId,
      paymentIntentId: paymentIntent.id,
    }, "Booking not found for payment intent");
    return;
  }

  const paymentAmount = (paymentIntent.amount_received || paymentIntent.amount) / 100;
  const amountInDollars = paymentAmount.toFixed(2);
  const previousPaidAmount = parseFloat(booking.paidAmount || "0");
  const totalAmount = parseFloat(booking.total || "0");
  const nextPaidAmount = Math.min(totalAmount, previousPaidAmount + paymentAmount);
  const depositRequired = parseFloat(booking.depositRequired || "0");
  const previousDepositPaid = parseFloat(booking.depositPaid || "0");
  const nextDepositPaid =
    depositRequired > 0
      ? Math.min(depositRequired, previousDepositPaid + paymentAmount)
      : previousDepositPaid;

  const shouldPreserveTerminalStatus =
    booking.status === "completed" || booking.status === "no_show";
  const isAutoExpiredCancelled =
    booking.status === "cancelled" &&
    booking.cancellationReason === AUTO_EXPIRED_REASON;
  const shouldKeepManualCancel =
    booking.status === "cancelled" && !isAutoExpiredCancelled;

  const nextPaymentStatus =
    nextPaidAmount >= totalAmount ? "paid" : nextPaidAmount > 0 ? "partial" : "pending";

  const nextStatus = shouldPreserveTerminalStatus
    ? booking.status
    : shouldKeepManualCancel
      ? booking.status
      : "confirmed";
  const shouldConfirmBooking = nextStatus === "confirmed" && booking.status !== "confirmed";

  await db
    .update(bookings)
    .set({
      paymentStatus: nextPaymentStatus,
      paidAmount: nextPaidAmount.toFixed(2),
      stripePaymentIntentId: paymentIntent.id,
      depositPaid: depositRequired > 0 ? nextDepositPaid.toFixed(2) : booking.depositPaid,
      depositPaidAt:
        depositRequired > 0 && nextDepositPaid > 0
          ? booking.depositPaidAt || new Date()
          : booking.depositPaidAt,
      balancePaidAt:
        nextPaymentStatus === "paid" ? booking.balancePaidAt || new Date() : booking.balancePaidAt,
      status: nextStatus,
      confirmedAt: shouldConfirmBooking ? new Date() : booking.confirmedAt,
      cancelledAt: isAutoExpiredCancelled ? null : booking.cancelledAt,
      cancellationReason: isAutoExpiredCancelled ? null : booking.cancellationReason,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId))
    );

  await db
    .update(checkoutAttempts)
    .set({
      status: "paid",
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.organizationId, organizationId),
        eq(checkoutAttempts.bookingId, bookingId)
      )
    );

  webhookLogger.info({
    bookingId,
    paymentIntentId: paymentIntent.id,
    amount: amountInDollars,
    status: nextPaymentStatus,
    bookingStatus: nextStatus,
  }, "Booking payment status updated");

  if (shouldKeepManualCancel || shouldPreserveTerminalStatus) {
    webhookLogger.warn(
      {
        bookingId,
        paymentIntentId: paymentIntent.id,
        bookingStatus: booking.status,
      },
      "Payment succeeded for booking in terminal status; status preserved"
    );
  }

  // Get customer details for the email
  const customer = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, booking.customerId),
      eq(customers.organizationId, organizationId)
    ),
  });

  // Get tour details (only if booking has tourId)
  const tour = booking.tourId
    ? await db.query.tours.findFirst({
        where: eq(tours.id, booking.tourId),
      })
    : null;

  // Format tour date from booking fields
  const tourDate = booking.bookingDate
    ? format(parseDateKeyToLocalDate(formatDbDateKey(booking.bookingDate)), "MMMM d, yyyy")
    : "Scheduled Date";

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
        tourName: tour?.name || "Tour",
        tourDate,
        amount: amountInDollars,
        currency: paymentIntent.currency.toUpperCase(),
        stripeReceiptUrl: paymentIntent.latest_charge
          ? typeof paymentIntent.latest_charge === "string"
            ? undefined
            : (paymentIntent.latest_charge as Stripe.Charge).receipt_url || undefined
          : undefined,
      },
    });

    webhookLogger.info({
      bookingId,
      customerEmail: customer.email,
    }, "Sent payment confirmation event");
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  webhookLogger.warn({
    event: "payment_failed",
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata,
    lastPaymentError: paymentIntent.last_payment_error,
  }, "Payment failed");

  const { organizationId, bookingId } = paymentIntent.metadata;

  if (!organizationId || !bookingId) {
    webhookLogger.error({ paymentIntentId: paymentIntent.id }, "Missing organizationId or bookingId in payment intent metadata");
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
    webhookLogger.error({ bookingId, organizationId }, "Booking not found for failed payment");
    return;
  }

  const currentPaidAmount = parseFloat(booking.paidAmount || "0");
  const nextPaymentStatus = currentPaidAmount > 0 ? "partial" : "failed";

  // Update booking payment status
  await db
    .update(bookings)
    .set({
      paymentStatus: nextPaymentStatus,
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId))
    );

  await db
    .update(checkoutAttempts)
    .set({
      status: "failed",
      stripePaymentIntentId: paymentIntent.id,
      lastError: paymentIntent.last_payment_error?.message || "Payment failed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.organizationId, organizationId),
        eq(checkoutAttempts.bookingId, bookingId)
      )
    );

  webhookLogger.info({ bookingId, paymentStatus: nextPaymentStatus }, "Updated booking payment status after failure");

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

    webhookLogger.info({ bookingId, customerEmail: customer.email }, "Sent payment/failed event");
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  webhookLogger.info({
    chargeId: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    refunded: charge.refunded,
  }, "Charge refunded");

  if (!charge.payment_intent) {
    webhookLogger.info({ chargeId: charge.id }, "No payment intent associated with charge");
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
    webhookLogger.error({ paymentIntentId }, "Booking not found for refund");
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

    webhookLogger.info({ bookingId: booking.id }, "Updated booking to refunded status");
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

    webhookLogger.info({ bookingId: booking.id, remainingAmount }, "Updated booking with partial refund");
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  webhookLogger.info({
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
  }, "Checkout session completed");

  // Payment intent succeeded event will handle the actual booking update
  // This event is just for logging/tracking
  const organizationId = session.metadata?.organizationId;
  const bookingId = session.metadata?.bookingId;

  if (organizationId && bookingId) {
    await db
      .update(checkoutAttempts)
      .set({
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        status: session.payment_status === "paid" ? "paid" : "session_created",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(checkoutAttempts.organizationId, organizationId),
          eq(checkoutAttempts.bookingId, bookingId)
        )
      );
  }

  if (session.payment_status === "paid") {
    webhookLogger.info({ sessionId: session.id }, "Checkout session paid successfully");
  }
}
