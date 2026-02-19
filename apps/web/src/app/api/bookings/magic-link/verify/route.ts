import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices } from "@tour/services";
import { verifyBookingMagicToken } from "@/lib/booking-magic-link";

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
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
