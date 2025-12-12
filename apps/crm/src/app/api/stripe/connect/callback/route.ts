import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServices } from "@tour/services";
import { getConnectAccount } from "@/lib/stripe";

/**
 * Handle Stripe Connect onboarding callback
 * This route is called after the user completes Stripe Connect onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("account");
    const orgSlug = searchParams.get("org");

    // Validate auth
    if (!userId || !orgId) {
      return NextResponse.redirect(
        new URL("/sign-in", request.url)
      );
    }

    // Validate parameters
    if (!accountId || !orgSlug) {
      return NextResponse.redirect(
        new URL(`/org/${orgSlug}/settings?tab=payments&error=missing_params`, request.url)
      );
    }

    // Get the Stripe account to check onboarding status
    const account = await getConnectAccount(accountId);

    // Verify this account belongs to the organization
    if (account.metadata?.organizationId !== orgId) {
      return NextResponse.redirect(
        new URL(`/org/${orgSlug}/settings?tab=payments&error=invalid_account`, request.url)
      );
    }

    // Update organization with Stripe Connect info
    const services = createServices({ organizationId: orgId });
    await services.organization.updateStripeConnect(
      accountId,
      account.details_submitted === true
    );

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL(
        `/org/${orgSlug}/settings?tab=payments&success=${account.details_submitted ? "connected" : "pending"}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Stripe Connect callback error:", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=stripe_callback_failed", request.url)
    );
  }
}
