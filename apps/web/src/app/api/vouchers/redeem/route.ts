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

interface VoucherRedeemBody {
  code?: string;
  referenceNumber?: string;
  email?: string;
  amountToRedeem?: number | string;
}

function parseOptionalAmount(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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

    const body: VoucherRedeemBody = await request.json();
    const code = body.code?.trim() || "";
    const referenceNumber = body.referenceNumber?.trim().toUpperCase() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const amountToRedeem = parseOptionalAmount(body.amountToRedeem);

    if (!code || !referenceNumber || !email) {
      return NextResponse.json(
        { message: "code, referenceNumber, and email are required" },
        { status: 400 }
      );
    }

    if (amountToRedeem !== undefined && (!Number.isFinite(amountToRedeem) || amountToRedeem <= 0)) {
      return NextResponse.json(
        { message: "amountToRedeem must be a positive number" },
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

    if (booking.status === "cancelled" || booking.status === "completed") {
      return NextResponse.json(
        { message: `Voucher cannot be redeemed for a ${booking.status} booking` },
        { status: 400 }
      );
    }

    const redemption = await services.voucher.redeemVoucher(
      code,
      booking.id,
      amountToRedeem
    );

    if (!redemption.success) {
      return NextResponse.json(
        { success: false, message: redemption.error || "Voucher redemption failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      redemption: {
        amountRedeemed: redemption.amountRedeemed,
        remainingValue: redemption.remainingValue,
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

    console.error("Voucher redeem API error:", error);
    return NextResponse.json(
      { message: "Failed to redeem voucher" },
      { status: 500 }
    );
  }
}
