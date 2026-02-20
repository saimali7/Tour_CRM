import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices } from "@tour/services";
import { verifyBookingMagicToken } from "@/lib/booking-magic-link";
import { checkCompositeRateLimits, getRequestIp } from "@/lib/booking-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const AUTO_EXPIRED_REASON = "Booking expired after 30 minutes without payment";
    const ipAddress = getRequestIp(request);
    const rateLimit = await checkCompositeRateLimits([
      { scope: "magic_verify_ip", identifier: ipAddress },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many verification attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ message: "Missing token" }, { status: 400 });
    }

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

    const payload = verifyBookingMagicToken(token);
    if (payload.organizationId !== org.id) {
      return NextResponse.json({ message: "Invalid token scope" }, { status: 403 });
    }

    const services = createServices({ organizationId: org.id });
    const booking = await services.booking.getByReference(payload.referenceNumber);
    if (!booking.customer?.email || booking.customer.email.toLowerCase() !== payload.email) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

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
              name: booking.tour.name,
              slug: booking.tour.slug,
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
    const message =
      error instanceof Error && error.message ? error.message : "Invalid token";
    return NextResponse.json({ message }, { status: 400 });
  }
}
