import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, NotFoundError, ServiceError, ValidationError } from "@tour/services";

/**
 * GET /api/availability/slot
 *
 * Lightweight endpoint for polling a single slot's availability.
 * Used by the booking flow to detect sold-out or low-availability
 * conditions while the customer is mid-checkout.
 *
 * Query params: tourId, date (YYYY-MM-DD), time (HH:MM)
 * Returns: { spotsRemaining, maxCapacity, available, almostFull }
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get("tourId");
    const date = searchParams.get("date");
    const time = searchParams.get("time");

    if (!tourId || !date || !time) {
      return NextResponse.json(
        { message: "tourId, date, and time are required" },
        { status: 400 }
      );
    }

    // Parse date — expecting YYYY-MM-DD
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.exec(date);
    if (!dateMatch) {
      return NextResponse.json(
        { message: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Parse time — expecting HH:MM
    const timeMatch = /^\d{2}:\d{2}$/.exec(time);
    if (!timeMatch) {
      return NextResponse.json(
        { message: "time must be in HH:MM format" },
        { status: 400 }
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    const bookingDate = new Date(year!, month! - 1, day!);

    const services = createServices({ organizationId: org.id });
    const result = await services.tourAvailability.checkSlotAvailability({
      tourId,
      date: bookingDate,
      time,
      requestedSpots: 0, // Capacity-only check — don't block on same-day rules
    });

    const almostFull = result.available && result.spotsRemaining <= 3;

    return NextResponse.json({
      spotsRemaining: result.spotsRemaining,
      maxCapacity: result.maxCapacity,
      available: result.available,
      almostFull,
      reason: result.reason ?? null,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Slot availability API error:", error);
    return NextResponse.json(
      { message: "Failed to check slot availability" },
      { status: 500 }
    );
  }
}
