import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, logger } from "@tour/services";
import {
  buildCustomerRateLimitIdentifier,
  checkCompositeRateLimits,
  getRequestIp,
} from "@/lib/booking-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const AUTO_EXPIRED_REASON = "Booking expired after 30 minutes without payment";
    const { searchParams } = new URL(request.url);
    const referenceNumber = searchParams.get("reference");
    const email = searchParams.get("email");

    if (!referenceNumber || !email) {
      return NextResponse.json(
        { message: "Reference number and email are required" },
        { status: 400 }
      );
    }

    const ipAddress = getRequestIp(request);
    const rateLimit = await checkCompositeRateLimits([
      { scope: "booking_lookup_ip", identifier: ipAddress },
      {
        scope: "booking_lookup_customer",
        identifier: buildCustomerRateLimitIdentifier(referenceNumber, email),
      },
    ]);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many lookup attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    // Get organization slug from header (set by middleware)
    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 400 }
      );
    }

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { message: "Organization not found or inactive" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });

    // Look up booking by reference number
    let booking;
    try {
      booking = await services.booking.getByReference(referenceNumber.toUpperCase());
    } catch (error) {
      logger.debug({ err: error, referenceNumber, orgSlug }, "Booking not found by reference number");
      return NextResponse.json(
        { message: "Booking not found. Please check your reference number." },
        { status: 404 }
      );
    }

    // Verify email matches (customer must have email for web lookup)
    if (!booking.customer?.email || booking.customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { message: "Booking not found. Please check your email address." },
        { status: 404 }
      );
    }

    // Return booking details (without sensitive internal data)
    const canResumePayment =
      (booking.paymentStatus === "pending" ||
        booking.paymentStatus === "partial" ||
        booking.paymentStatus === "failed") &&
      (booking.status === "confirmed" ||
        booking.status === "pending" ||
        (booking.status === "cancelled" &&
          booking.cancellationReason === AUTO_EXPIRED_REASON));

    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        cancellationReason: booking.cancellationReason,
        paymentStatus: booking.paymentStatus,
        canResumePayment,
        totalParticipants: booking.totalParticipants,
        total: booking.total,
        currency: booking.currency,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        tour: booking.tour
          ? {
              id: booking.tour.id,
              slug: booking.tour.slug,
              name: booking.tour.name,
              meetingPoint: booking.tour.meetingPoint,
            }
          : null,
        customer: booking.customer
          ? {
              firstName: booking.customer.firstName,
              lastName: booking.customer.lastName,
              email: booking.customer.email,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Booking lookup failed");
    return NextResponse.json(
      { message: "Failed to look up booking" },
      { status: 500 }
    );
  }
}
