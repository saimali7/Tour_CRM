import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import {
  createServices,
  NotFoundError,
  ServiceError,
  ValidationError,
} from "@tour/services";
import { verifyBookingMagicToken } from "@/lib/booking-magic-link";
import {
  buildCustomerRateLimitIdentifier,
  checkCompositeRateLimits,
  getRequestIp,
} from "@/lib/booking-rate-limit";

interface CancelBookingBody {
  referenceNumber?: string;
  email?: string;
  reason?: string;
  token?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIp(request);
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
        { message: "Organization not found or inactive" },
        { status: 400 }
      );
    }

    const body: CancelBookingBody = await request.json();
    let referenceNumber = body.referenceNumber?.trim().toUpperCase() || "";
    let email = body.email?.trim().toLowerCase() || "";
    const reason = body.reason?.trim() || "Cancelled by customer";

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
      { scope: "booking_manage_ip", identifier: ipAddress },
      {
        scope: "booking_manage_customer",
        identifier: buildCustomerRateLimitIdentifier(referenceNumber, email),
      },
    ]);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many booking management attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
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

    const cancelled = await services.booking.cancel(booking.id, reason);

    return NextResponse.json({
      message: "Booking cancelled successfully",
      booking: {
        id: cancelled.id,
        referenceNumber: cancelled.referenceNumber,
        status: cancelled.status,
        bookingDate: cancelled.bookingDate,
        bookingTime: cancelled.bookingTime,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: 400 }
      );
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Booking cancel API error:", error);
    return NextResponse.json(
      { message: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
