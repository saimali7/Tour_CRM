import Stripe from "stripe";

// Lazy initialization to avoid breaking the app when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
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
 * Create a Stripe Connect account for an organization
 */
export async function createConnectAccount(organizationId: string, email?: string) {
  const account = await stripe.accounts.create({
    type: "standard",
    email,
    metadata: {
      organizationId,
    },
  });

  return account;
}

/**
 * Create an account link for Stripe Connect onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink;
}

/**
 * Get Stripe Connect account details
 */
export async function getConnectAccount(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return account;
}

/**
 * Check if a Stripe Connect account has completed onboarding
 */
export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);
  return account.details_submitted === true;
}

/**
 * Create a login link for the Stripe Dashboard
 */
export async function createDashboardLink(accountId: string) {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink;
}

// =============================================================================
// Payment Intent Operations (Stripe Connect)
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
  stripeAccountId: string; // Organization's Stripe Connect account
  applicationFeeAmount?: number; // Platform fee in cents (optional)
}

/**
 * Create a payment intent with Stripe Connect (for destination charges)
 * The organization receives the payment, platform optionally takes a fee
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const {
    amount,
    currency,
    metadata,
    stripeAccountId,
    applicationFeeAmount,
  } = params;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      // For destination charges (organization receives payment)
      ...(applicationFeeAmount && { application_fee_amount: applicationFeeAmount }),
    },
    {
      stripeAccount: stripeAccountId, // Charge to the organization's account
    }
  );

  return paymentIntent;
}

/**
 * Create a payment link for a booking
 * Uses Stripe Checkout for a hosted payment page
 */
export async function createPaymentLink(params: {
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
  stripeAccountId: string; // Organization's Stripe Connect account
  applicationFeeAmount?: number; // Platform fee in cents (optional)
  expiresInHours?: number; // Link expiration in hours (optional, default 24)
}) {
  const {
    amount,
    currency,
    metadata,
    successUrl,
    cancelUrl,
    customerEmail,
    stripeAccountId,
    applicationFeeAmount,
    expiresInHours = 24,
  } = params;

  // Calculate expiration time (Stripe uses Unix timestamp in seconds)
  // Minimum is 30 minutes from now, maximum is 24 hours
  const expiresAt = Math.floor(Date.now() / 1000) + Math.min(expiresInHours, 24) * 60 * 60;

  const session = await stripe.checkout.sessions.create(
    {
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
        ...(applicationFeeAmount && {
          application_fee_amount: applicationFeeAmount,
        }),
      },
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    },
    {
      stripeAccount: stripeAccountId, // Charge to the organization's account
    }
  );

  return session;
}

/**
 * Retrieve a payment intent by ID
 */
export async function retrievePaymentIntent(
  paymentIntentId: string,
  stripeAccountId: string
) {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    paymentIntentId,
    {},
    {
      stripeAccount: stripeAccountId,
    }
  );
  return paymentIntent;
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  stripeAccountId: string
) {
  const paymentIntent = await stripe.paymentIntents.cancel(
    paymentIntentId,
    {},
    {
      stripeAccount: stripeAccountId,
    }
  );
  return paymentIntent;
}

// =============================================================================
// Refund Operations
// =============================================================================

export interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number; // Amount in cents (optional, defaults to full refund)
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
  stripeAccountId: string; // Organization's Stripe Connect account
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund(params: CreateRefundParams) {
  const { paymentIntentId, amount, reason, metadata, stripeAccountId } = params;

  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(amount && { amount }),
      ...(reason && { reason }),
      ...(metadata && { metadata }),
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  return refund;
}

/**
 * Retrieve a refund by ID
 */
export async function retrieveRefund(refundId: string, stripeAccountId: string) {
  const refund = await stripe.refunds.retrieve(
    refundId,
    {},
    {
      stripeAccount: stripeAccountId,
    }
  );
  return refund;
}
