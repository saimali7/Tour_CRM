import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    });
  }

  return stripeClient;
}

export interface CreateBookingCheckoutSessionInput {
  stripeAccountId?: string;
  organizationId: string;
  bookingId: string;
  customerId: string;
  bookingReference: string;
  customerEmail: string;
  currency: string;
  amountInCents: number;
  tourName: string;
  tourDate: string;
  participants: number;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}

export async function createBookingCheckoutSession(
  input: CreateBookingCheckoutSessionInput
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();

  const createParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: input.currency.toLowerCase(),
          product_data: {
            name: input.tourName,
            description: `${input.tourDate} - ${input.participants} ${
              input.participants === 1 ? "participant" : "participants"
            }`,
          },
          unit_amount: input.amountInCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: {
        organizationId: input.organizationId,
        bookingId: input.bookingId,
        customerId: input.customerId,
        bookingReference: input.bookingReference,
      },
    },
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      organizationId: input.organizationId,
      bookingId: input.bookingId,
      customerId: input.customerId,
      bookingReference: input.bookingReference,
    },
  };

  return stripe.checkout.sessions.create(
    createParams,
    {
      stripeAccount: input.stripeAccountId,
      idempotencyKey: input.idempotencyKey,
    }
  );
}

export interface CreateBookingPaymentIntentInput {
  stripeAccountId?: string;
  organizationId: string;
  bookingId: string;
  customerId: string;
  bookingReference: string;
  customerEmail: string;
  currency: string;
  amountInCents: number;
  tourName: string;
  tourDate: string;
  participants: number;
  idempotencyKey?: string;
}

export async function createBookingPaymentIntent(
  input: CreateBookingPaymentIntentInput
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  const createParams: Stripe.PaymentIntentCreateParams = {
    amount: input.amountInCents,
    currency: input.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    description: `${input.tourName} — ${input.tourDate} — ${input.participants} ${
      input.participants === 1 ? "participant" : "participants"
    }`,
    receipt_email: input.customerEmail,
    metadata: {
      organizationId: input.organizationId,
      bookingId: input.bookingId,
      customerId: input.customerId,
      bookingReference: input.bookingReference,
    },
  };

  return stripe.paymentIntents.create(createParams, {
    stripeAccount: input.stripeAccountId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function retrieveBookingCheckoutSession(
  sessionId: string,
  stripeAccountId?: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, {
    stripeAccount: stripeAccountId,
  });
}

/**
 * Verify and construct a Stripe webhook event from a raw request body and signature.
 * Uses the same Stripe client singleton as the rest of the web app.
 */
export function constructWebhookEvent(
  payload: string,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
