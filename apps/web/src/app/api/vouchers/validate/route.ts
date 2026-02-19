import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, ServiceError, ValidationError } from "@tour/services";

interface VoucherValidateBody {
  code?: string;
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

    const body: VoucherValidateBody = await request.json();
    const code = body.code?.trim() || "";

    if (!code) {
      return NextResponse.json(
        { message: "Voucher code is required" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });
    const validation = await services.voucher.validateVoucher(code);

    return NextResponse.json({
      valid: validation.valid,
      error: validation.error,
      value: validation.value,
      type: validation.type,
      voucher: validation.voucher
        ? {
            id: validation.voucher.id,
            code: validation.voucher.code,
            status: validation.voucher.status,
            type: validation.voucher.type,
            expiresAt: validation.voucher.expiresAt,
            remainingValue: validation.voucher.remainingValue,
            monetaryValue: validation.voucher.monetaryValue,
            percentageValue: validation.voucher.percentageValue,
            tourId: validation.voucher.tourId,
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

    console.error("Voucher validation API error:", error);
    return NextResponse.json(
      { message: "Failed to validate voucher" },
      { status: 500 }
    );
  }
}
