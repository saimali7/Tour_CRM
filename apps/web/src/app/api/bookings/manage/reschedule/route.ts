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
import { parseDateKeyToLocalDate } from "@/lib/date-key";
import { verifyBookingMagicToken } from "@/lib/booking-magic-link";
import {
  buildCustomerRateLimitIdentifier,
  checkCompositeRateLimits,
  getRequestIp,
} from "@/lib/booking-rate-limit";

interface RescheduleBookingBody {
  referenceNumber?: string;
  email?: string;
  bookingDate?: string;
  bookingTime?: string;
  tourId?: string;
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

    const body: RescheduleBookingBody = await request.json();
    let referenceNumber = body.referenceNumber?.trim().toUpperCase() || "";
    let email = body.email?.trim().toLowerCase() || "";
    const bookingDateRaw = body.bookingDate?.trim() || "";
    const bookingTime = body.bookingTime?.trim() || "";
    const tourId = body.tourId?.trim() || undefined;

    if (body.token) {
      const payload = verifyBookingMagicToken(body.token);
      if (payload.organizationId !== org.id) {
        return NextResponse.json({ message: "Invalid token scope" }, { status: 403 });
      }
      referenceNumber = payload.referenceNumber;
      email = payload.email;
    }

    if (!referenceNumber || !email || !bookingDateRaw || !bookingTime) {
      return NextResponse.json(
        { message: "referenceNumber, email, bookingDate, and bookingTime are required" },
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDateRaw)) {
      return NextResponse.json(
        { message: "bookingDate must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(bookingTime)) {
      return NextResponse.json(
        { message: "bookingTime must be in HH:MM format" },
        { status: 400 }
      );
    }

    let bookingDate: Date;
    try {
      bookingDate = parseDateKeyToLocalDate(bookingDateRaw);
    } catch {
      return NextResponse.json(
        { message: "bookingDate is invalid" },
        { status: 400 }
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

    const updated = await services.booking.reschedule(booking.id, {
      tourId,
      bookingDate,
      bookingTime,
    });

    return NextResponse.json({
      message: "Booking rescheduled successfully",
      booking: {
        id: updated.id,
        referenceNumber: updated.referenceNumber,
        status: updated.status,
        bookingDate: updated.bookingDate,
        bookingTime: updated.bookingTime,
        tour: updated.tour
          ? {
              id: updated.tour.id,
              name: updated.tour.name,
              slug: updated.tour.slug,
            }
          : null,
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

    console.error("Booking reschedule API error:", error);
    return NextResponse.json(
      { message: "Failed to reschedule booking" },
      { status: 500 }
    );
  }
}
