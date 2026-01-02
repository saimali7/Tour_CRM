import Stripe from "stripe";
import { ServiceError } from "@tour/services";

// Lazy initialization to avoid breaking the app when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ServiceError("Missing STRIPE_SECRET_KEY environment variable", "CONFIG_MISSING", 503);
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Export stripe as a getter to allow lazy initialization
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Check if Stripe is in test mode
 */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;
}

// =============================================================================
// Payment Intent Operations (Direct Mode)
// =============================================================================

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents (e.g., 9900 for $99.00)
  currency: string;
  metadata: {
    organizationId: string;
    bookingId: string;
    customerId: string;
    [key: string]: string;
  };
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const { amount, currency, metadata } = params;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Create a Checkout Session for a booking
 * Uses Stripe Checkout for a hosted payment page
 */
export async function createCheckoutSession(params: {
  amount: number; // Amount in cents
  currency: string;
  metadata: {
    organizationId: string;
    bookingId: string;
    customerId: string;
    bookingReference: string;
  };
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  expiresInHours?: number; // Link expiration in hours (optional, default 24)
}) {
  const {
    amount,
    currency,
    metadata,
    successUrl,
    cancelUrl,
    customerEmail,
    expiresInHours = 24,
  } = params;

  // Calculate expiration time (Stripe uses Unix timestamp in seconds)
  // Minimum is 30 minutes from now, maximum is 24 hours
  const expiresAt = Math.floor(Date.now() / 1000) + Math.min(expiresInHours, 24) * 60 * 60;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    expires_at: expiresAt,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Booking ${metadata.bookingReference}`,
            description: "Tour booking payment",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata,
    },
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return session;
}

/**
 * Retrieve a payment intent by ID
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent;
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
  return paymentIntent;
}

/**
 * Retrieve a Checkout Session by ID
 */
export async function retrieveCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session;
}

// =============================================================================
// Refund Operations
// =============================================================================

export interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number; // Amount in cents (optional, defaults to full refund)
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund(params: CreateRefundParams) {
  const { paymentIntentId, amount, reason, metadata } = params;

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount && { amount }),
    ...(reason && { reason }),
    ...(metadata && { metadata }),
  });

  return refund;
}

/**
 * Retrieve a refund by ID
 */
export async function retrieveRefund(refundId: string) {
  const refund = await stripe.refunds.retrieve(refundId);
  return refund;
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
