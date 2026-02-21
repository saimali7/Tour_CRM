import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, logger } from "@tour/services";
import { markCheckoutAttemptPaid } from "@/lib/checkout-attempts";
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

/**
 * POST /api/bookings/confirm-payment
 *
 * Called after the client-side Stripe Elements payment succeeds.
 * Verifies the PaymentIntent status and returns waiver requirements.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      paymentIntentId: string;
      bookingId: string;
    };

    if (!body.paymentIntentId || !body.bookingId) {
      return NextResponse.json(
        { message: "Missing paymentIntentId or bookingId" },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 400 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 404 }
      );
    }

    const services = createServices({ organizationId: org.id });

    // Verify the PaymentIntent with Stripe
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { message: "Payment has not been completed" },
        { status: 400 }
      );
    }

    // Verify the payment is for the correct booking
    const piBookingId = paymentIntent.metadata?.bookingId;
    if (piBookingId !== body.bookingId) {
      return NextResponse.json(
        { message: "Payment does not match booking" },
        { status: 400 }
      );
    }

    // Verify the booking belongs to this organization
    const piOrgId = paymentIntent.metadata?.organizationId;
    if (piOrgId !== org.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Mark checkout attempt as paid (the webhook will also do this,
    // but this provides immediate confirmation to the client)
    await markCheckoutAttemptPaid({
      organizationId: org.id,
      bookingId: body.bookingId,
      stripePaymentIntentId: body.paymentIntentId,
    }).catch((err: unknown) => {
      logger.warn(
        { err, bookingId: body.bookingId },
        "Failed to mark checkout attempt as paid (webhook will handle)"
      );
    });

    // Get booking details for the response
    const booking = await services.booking.getById(body.bookingId);

    // Check for required waivers
    let requiredWaivers: Array<{
      waiverTemplateId: string;
      waiverName: string;
      waiverContent: string | null;
    }> = [];

    if (booking.tourId) {
      try {
        const tourWaivers = await services.waiver.getTourWaivers(booking.tourId);
        requiredWaivers = tourWaivers
          .filter((item) => item.isRequired)
          .map((item) => ({
            waiverTemplateId: item.waiverTemplateId,
            waiverName: item.waiverTemplate?.name || "Waiver",
            waiverContent: item.waiverTemplate?.content || null,
          }));
      } catch (err: unknown) {
        logger.warn(
          { err, bookingId: body.bookingId },
          "Failed to fetch required waivers"
        );
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      requiredWaivers,
    });
  } catch (error) {
    logger.error({ err: error }, "Confirm payment error");

    return NextResponse.json(
      { message: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
