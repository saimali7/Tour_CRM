import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, ServiceError, ValidationError } from "@tour/services";

interface PromoValidateBody {
  code?: string;
  tourId?: string;
  bookingAmount?: number | string;
  customer?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

function deriveFirstName(email: string): string {
  const local = email.split("@")[0] || "Guest";
  const cleaned = local.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const firstWord = cleaned.split(/\s+/).filter(Boolean)[0];
  if (!firstWord) {
    return "Guest";
  }
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function parseBookingAmount(value: number | string | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

export async function POST(request: NextRequest) {
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

    const body: PromoValidateBody = await request.json();
    const code = body.code?.trim() || "";
    const tourId = body.tourId?.trim() || "";
    const bookingAmount = parseBookingAmount(body.bookingAmount);

    if (!code || !tourId || !Number.isFinite(bookingAmount)) {
      return NextResponse.json(
        { message: "code, tourId, and bookingAmount are required" },
        { status: 400 }
      );
    }

    if (bookingAmount < 0) {
      return NextResponse.json(
        { message: "bookingAmount cannot be negative" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });

    let customerId = body.customer?.id?.trim() || "";
    if (!customerId) {
      const customerEmail = body.customer?.email?.trim().toLowerCase() || "";
      if (!customerEmail) {
        return NextResponse.json(
          { message: "customer.email is required when customer.id is not provided" },
          { status: 400 }
        );
      }

      const firstName = body.customer?.firstName?.trim() || deriveFirstName(customerEmail);
      const lastName = body.customer?.lastName?.trim() || "Guest";

      const customer = await services.customer.getOrCreate({
        email: customerEmail,
        firstName,
        lastName,
        phone: body.customer?.phone?.trim() || undefined,
        source: "website",
        sourceDetails: "promo_validation",
      });
      customerId = customer.id;
    }

    const validation = await services.promoCode.validateCode(
      code,
      tourId,
      customerId,
      bookingAmount
    );

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error || "Invalid promo code" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      discount: validation.discount,
      promoCode: validation.promoCode
        ? {
            id: validation.promoCode.id,
            code: validation.promoCode.code,
            discountType: validation.promoCode.discountType,
            discountValue: validation.promoCode.discountValue,
            description: validation.promoCode.description,
          }
        : null,
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

    console.error("Promo validation API error:", error);
    return NextResponse.json(
      { message: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
