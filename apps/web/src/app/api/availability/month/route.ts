import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, NotFoundError, ServiceError, ValidationError } from "@tour/services";

function parseInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

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
    const year = parseInteger(searchParams.get("year"));
    const month = parseInteger(searchParams.get("month"));

    if (!tourId || !year || !month) {
      return NextResponse.json(
        { message: "tourId, year, and month are required" },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: "month must be between 1 and 12" },
        { status: 400 }
      );
    }

    if (year < 2000 || year > 2100) {
      return NextResponse.json(
        { message: "year is out of range" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });
    const availability = await services.tourAvailability.getAvailableDatesForMonth(
      tourId,
      year,
      month
    );

    return NextResponse.json({ availability });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
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

    console.error("Month availability API error:", error);
    return NextResponse.json(
      { message: "Failed to fetch month availability" },
      { status: 500 }
    );
  }
}
