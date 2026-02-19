import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, NotFoundError, ServiceError, ValidationError } from "@tour/services";

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug) {
      return NextResponse.json({ message: "Organization not found" }, { status: 400 });
    }

    const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });

    if (!org || org.status !== "active") {
      return NextResponse.json({ message: "Organization not found or inactive" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get("tourId");

    if (!tourId) {
      return NextResponse.json({ message: "tourId is required" }, { status: 400 });
    }

    const services = createServices({ organizationId: org.id });
    const addOns = await services.addOn.getAvailableAddOnsForTour(tourId);

    return NextResponse.json({
      addOns: addOns.map((addOn) => ({
        id: addOn.id,
        name: addOn.name,
        description: addOn.description,
        shortDescription: addOn.shortDescription,
        imageUrl: addOn.imageUrl,
        type: addOn.type,
        isRequired: addOn.isRequired,
        isRecommended: addOn.isRecommended,
        effectivePrice: Number(addOn.effectivePrice),
      })),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ message: error.message, details: error.details }, { status: 400 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    console.error("Tour add-ons API error:", error);
    return NextResponse.json({ message: "Failed to fetch tour add-ons" }, { status: 500 });
  }
}
