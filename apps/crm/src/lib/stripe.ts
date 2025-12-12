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
