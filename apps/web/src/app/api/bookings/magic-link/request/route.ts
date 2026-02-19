import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices } from "@tour/services";
import { NotFoundError } from "@tour/services";
import { createBookingMagicToken } from "@/lib/booking-magic-link";
import { getOrganizationBookingUrl } from "@/lib/organization";

interface RequestBody {
  referenceNumber?: string;
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
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

    const body: RequestBody = await request.json();
    const referenceNumber = body.referenceNumber?.trim().toUpperCase();
    const email = body.email?.trim().toLowerCase();

    if (!referenceNumber || !email) {
      return NextResponse.json(
        { message: "referenceNumber and email are required" },
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
          { message: "Booking not found. Please check your details." },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!booking.customer?.email || booking.customer.email.toLowerCase() !== email) {
      return NextResponse.json(
        { message: "Booking not found. Please check your details." },
        { status: 404 }
      );
    }

    const token = createBookingMagicToken({
      organizationId: org.id,
      referenceNumber,
      email,
    });
    const magicLink = getOrganizationBookingUrl(
      org,
      `/booking?token=${encodeURIComponent(token)}`
    );

    return NextResponse.json({
      message: "Magic link generated",
      token,
      magicLink,
      expiresInMinutes: 30,
    });
  } catch (error) {
    console.error("Failed to request booking magic link:", error);
    return NextResponse.json(
      { message: "Failed to create magic link" },
      { status: 500 }
    );
  }
}
