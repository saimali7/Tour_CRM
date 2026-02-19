import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, NotFoundError, ServiceError, ValidationError } from "@tour/services";

interface SignWaiverBody {
  bookingId?: string;
  waiverTemplateId?: string;
  signedByName?: string;
  signedByEmail?: string;
  signatureData?: string;
  signatureType?: "drawn" | "typed";
}

function getIpAddress(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") || undefined;
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
      return NextResponse.json({ message: "Organization not found or inactive" }, { status: 400 });
    }

    const body = (await request.json()) as SignWaiverBody;

    if (!body.bookingId || !body.waiverTemplateId || !body.signedByName || !body.signedByEmail || !body.signatureData) {
      return NextResponse.json(
        { message: "bookingId, waiverTemplateId, signedByName, signedByEmail and signatureData are required" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });
    const waiverStatus = await services.waiver.getBookingWaiverStatus(body.bookingId);
    const targetWaiver = waiverStatus.requiredWaivers.find(
      (waiver) => waiver.waiverTemplateId === body.waiverTemplateId
    );

    if (!targetWaiver) {
      return NextResponse.json(
        { message: "Selected waiver is not required for this booking" },
        { status: 400 }
      );
    }

    if (targetWaiver.isSigned) {
      return NextResponse.json(
        { message: "Waiver is already signed" },
        { status: 409 }
      );
    }

    const signedWaiver = await services.waiver.signWaiver({
      bookingId: body.bookingId,
      waiverTemplateId: body.waiverTemplateId,
      signedByName: body.signedByName,
      signedByEmail: body.signedByEmail,
      signatureData: body.signatureData,
      signatureType: body.signatureType || "typed",
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      message: "Waiver signed successfully",
      signedWaiver,
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

    console.error("Waiver sign API error:", error);
    return NextResponse.json({ message: "Failed to sign waiver" }, { status: 500 });
  }
}
