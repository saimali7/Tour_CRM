import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
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

  return stripe.checkout.sessions.create(createParams, {
    stripeAccount: input.stripeAccountId,
  });
}
