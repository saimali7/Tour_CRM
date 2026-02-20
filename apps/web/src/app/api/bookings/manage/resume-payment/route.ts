import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, logger, NotFoundError } from "@tour/services";
import {
  buildCustomerRateLimitIdentifier,
  checkCompositeRateLimits,
  getRequestIp,
} from "@/lib/booking-rate-limit";
import {
  getCheckoutAttemptByBooking,
  getCheckoutReusePayload,
  hashCheckoutFingerprint,
  markCheckoutAttemptFailure,
  markCheckoutSessionCreated,
  reserveCheckoutAttempt,
} from "@/lib/checkout-attempts";
import {
  createBookingCheckoutSession,
  retrieveBookingCheckoutSession,
} from "@/lib/stripe-checkout";
import { verifyBookingMagicToken } from "@/lib/booking-magic-link";
import { getOrganizationBookingUrl } from "@/lib/organization";

const AUTO_EXPIRED_REASON = "Booking expired after 30 minutes without payment";

type ResumePaymentBody = {
  referenceNumber?: string;
  email?: string;
  token?: string;
};

function getChargeAmounts(booking: {
  total: string;
  paidAmount: string | null;
  depositRequired: string | null;
  depositPaid: string | null;
}) {
  const total = parseFloat(booking.total || "0");
  const paidAmount = parseFloat(booking.paidAmount || "0");
  const depositRequired = parseFloat(booking.depositRequired || "0");
  const depositPaid = parseFloat(booking.depositPaid || "0");
  const remainingBalance = Math.max(0, total - paidAmount);

  if (remainingBalance <= 0) {
    return {
      amountToCharge: 0,
      paymentMode: "full" as const,
      remainingBalance,
    };
  }

  if (depositRequired > 0 && depositPaid < depositRequired) {
    return {
      amountToCharge: Math.min(remainingBalance, Math.max(0, depositRequired - depositPaid)),
      paymentMode: "deposit" as const,
      remainingBalance,
    };
  }

  return {
    amountToCharge: remainingBalance,
    paymentMode: "full" as const,
    remainingBalance,
  };
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIp(request);
    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug) {
      return NextResponse.json({ message: "Organization not found" }, { status: 400 });
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { message: "Organization not found or inactive" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ResumePaymentBody;
    let referenceNumber = body.referenceNumber?.trim().toUpperCase() || "";
    let email = body.email?.trim().toLowerCase() || "";

    if (body.token) {
      const payload = verifyBookingMagicToken(body.token);
      if (payload.organizationId !== org.id) {
        return NextResponse.json({ message: "Invalid token scope" }, { status: 403 });
      }
      referenceNumber = payload.referenceNumber;
      email = payload.email;
    }

    if (!referenceNumber || !email) {
      return NextResponse.json(
        { message: "referenceNumber and email are required" },
        { status: 400 }
      );
    }

    const rateLimit = await checkCompositeRateLimits([
      { scope: "resume_payment_ip", identifier: ipAddress },
      {
        scope: "resume_payment_customer",
        identifier: buildCustomerRateLimitIdentifier(referenceNumber, email),
      },
    ]);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many payment resume attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { message: "Secure payment is not configured right now." },
        { status: 503 }
      );
    }

    const services = createServices({ organizationId: org.id });
    let booking;
    try {
      booking = await services.booking.getByReference(referenceNumber);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { message: "Booking not found. Please check your reference number." },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!booking.customer?.email || booking.customer.email.toLowerCase() !== email) {
      return NextResponse.json(
        { message: "Booking not found. Please check your email address." },
        { status: 404 }
      );
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        status: "paid",
        message: "This booking is already paid.",
        booking: {
          id: booking.id,
          referenceNumber: booking.referenceNumber,
        },
      });
    }

    const canAutoReactivate =
      booking.status === "cancelled" &&
      booking.cancellationReason === AUTO_EXPIRED_REASON;

    if (
      booking.status === "completed" ||
      booking.status === "no_show" ||
      (booking.status === "cancelled" && !canAutoReactivate)
    ) {
      return NextResponse.json(
        { message: `Cannot resume payment for a ${booking.status} booking.` },
        { status: 400 }
      );
    }

    const charge = getChargeAmounts({
      total: booking.total,
      paidAmount: booking.paidAmount,
      depositRequired: booking.depositRequired,
      depositPaid: booking.depositPaid,
    });

    if (charge.amountToCharge <= 0) {
      return NextResponse.json({
        status: "paid",
        message: "No balance is due on this booking.",
        booking: {
          id: booking.id,
          referenceNumber: booking.referenceNumber,
        },
      });
    }

    const existingAttempt = await getCheckoutAttemptByBooking({
      organizationId: org.id,
      bookingId: booking.id,
    });

    if (existingAttempt?.status === "session_created" && existingAttempt.stripeSessionId) {
      try {
        const existingSession = await retrieveBookingCheckoutSession(existingAttempt.stripeSessionId);
        if (existingSession.status === "open" && existingSession.url) {
          const payload = getCheckoutReusePayload(existingAttempt);
          return NextResponse.json({
            booking: {
              id: booking.id,
              referenceNumber: booking.referenceNumber,
            },
            paymentUrl: existingSession.url,
            paymentAmount: payload?.paymentAmount ?? formatAmount(charge.amountToCharge),
            remainingBalance:
              payload?.remainingBalance ??
              formatAmount(Math.max(0, charge.remainingBalance - charge.amountToCharge)),
            paymentMode: payload?.paymentMode ?? charge.paymentMode,
            resumed: true,
            message: "Resuming existing secure checkout session.",
          });
        }
      } catch {
        // Continue with creating a fresh session.
      }
    }

    const fingerprintHash = hashCheckoutFingerprint({
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      total: booking.total,
      paidAmount: booking.paidAmount,
      depositRequired: booking.depositRequired,
      depositPaid: booking.depositPaid,
      bookingDate: booking.bookingDate ? booking.bookingDate.toISOString() : null,
      bookingTime: booking.bookingTime,
    });

    const resumeIdempotencyKey = `resume:${booking.id}:${booking.updatedAt.getTime()}`;
    const reservation = await reserveCheckoutAttempt({
      organizationId: org.id,
      idempotencyKey: resumeIdempotencyKey,
      fingerprintHash,
      amountCents: Math.round(charge.amountToCharge * 100),
      currency: booking.currency,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    if (
      !reservation.created &&
      reservation.attempt.fingerprintHash !== fingerprintHash
    ) {
      return NextResponse.json(
        { message: "Existing payment recovery attempt is out of date. Please try again." },
        { status: 409 }
      );
    }

    const bookingDate = booking.bookingDate ? new Date(booking.bookingDate) : new Date();

    const checkoutTourDate = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: org.timezone || "UTC",
    }).format(bookingDate);

    const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");
    const session = await createBookingCheckoutSession({
      organizationId: org.id,
      bookingId: booking.id,
      customerId: booking.customerId,
      bookingReference: booking.referenceNumber,
      customerEmail: booking.customer.email,
      currency: booking.currency,
      amountInCents: Math.round(charge.amountToCharge * 100),
      tourName: booking.tour?.name || "Tour",
      tourDate: checkoutTourDate,
      participants: booking.totalParticipants,
      successUrl: `${baseUrl}/booking/success?ref=${booking.referenceNumber}`,
      cancelUrl: `${baseUrl}/booking/cancelled?ref=${booking.referenceNumber}`,
      idempotencyKey: `resume:${org.id}:${booking.id}:${Math.round(charge.amountToCharge * 100)}`,
    });

    if (!session.url) {
      await markCheckoutAttemptFailure({
        organizationId: org.id,
        attemptId: reservation.attempt.id,
        errorMessage: "Stripe checkout URL was not returned",
      });
      return NextResponse.json(
        { message: "Unable to resume secure checkout right now." },
        { status: 502 }
      );
    }

    await markCheckoutSessionCreated({
      organizationId: org.id,
      attemptId: reservation.attempt.id,
      bookingId: booking.id,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      paymentUrl: session.url,
      paymentAmount: formatAmount(charge.amountToCharge),
      remainingBalance: formatAmount(
        Math.max(0, charge.remainingBalance - charge.amountToCharge)
      ),
      paymentMode: charge.paymentMode,
      bookingReference: booking.referenceNumber,
    });

    logger.info(
      {
        event: "resume_payment_used",
        organizationId: org.id,
        bookingId: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      "Customer resumed payment from booking management flow"
    );

    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      paymentUrl: session.url,
      paymentAmount: formatAmount(charge.amountToCharge),
      remainingBalance: formatAmount(
        Math.max(0, charge.remainingBalance - charge.amountToCharge)
      ),
      paymentMode: charge.paymentMode,
      resumed: true,
      message: "Payment session ready.",
    });
  } catch (error) {
    console.error("Resume payment API error:", error);
    return NextResponse.json(
      { message: "Failed to resume payment" },
      { status: 500 }
    );
  }
}
