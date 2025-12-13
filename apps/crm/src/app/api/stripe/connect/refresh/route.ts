import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServices } from "@tour/services";
import { createAccountLink } from "@/lib/stripe";

/**
 * Handle Stripe Connect refresh
 * This route is called when the onboarding link expires and needs to be regenerated
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    const orgSlug = searchParams.get("org");

    // Validate auth
    if (!userId || !orgId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!orgSlug) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Get organization
    const services = createServices({ organizationId: orgId });
    const org = await services.organization.get();

    if (!org.stripeConnectAccountId) {
      return NextResponse.redirect(
        new URL(`/org/${orgSlug}/settings?tab=payments&error=no_account`, request.url)
      );
    }

    // Create a new account link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.redirect(
        new URL(`/org/${orgSlug}/settings?tab=payments&error=configuration_error`, request.url)
      );
    }
    const accountLink = await createAccountLink(
      org.stripeConnectAccountId,
      `${baseUrl}/api/stripe/connect/refresh?org=${orgSlug}`,
      `${baseUrl}/api/stripe/connect/callback?org=${orgSlug}&account=${org.stripeConnectAccountId}`
    );

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("Stripe Connect refresh error:", error);
    const searchParams = request.nextUrl.searchParams;
    const orgSlug = searchParams.get("org");
    return NextResponse.redirect(
      new URL(`/org/${orgSlug}/settings?tab=payments&error=refresh_failed`, request.url)
    );
  }
}
