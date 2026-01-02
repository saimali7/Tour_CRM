import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, logger } from "@tour/services";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceNumber = searchParams.get("reference");
    const email = searchParams.get("email");

    if (!referenceNumber || !email) {
      return NextResponse.json(
        { message: "Reference number and email are required" },
        { status: 400 }
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
    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalParticipants: booking.totalParticipants,
        total: booking.total,
        currency: booking.currency,
        schedule: booking.schedule
          ? {
              startsAt: booking.schedule.startsAt,
              endsAt: booking.schedule.endsAt,
            }
          : null,
        tour: booking.tour
          ? {
              name: booking.tour.name,
              meetingPoint: null, // Would need to fetch tour details
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
