import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq, type AbandonedCartStep } from "@tour/database";
import { createServices } from "@tour/services";
import { sendCartAbandonedEvent } from "@/lib/inngest-events";

interface AbandonedCartBody {
  tourId?: string;
  bookingDate?: string;
  bookingTime?: string;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  participants?: Array<{ type?: "adult" | "child" | "infant" }>;
  subtotal?: string;
  total?: string;
  currency?: string;
  lastStep?: AbandonedCartStep;
}

function countParticipantsByType(
  participants: Array<{ type?: "adult" | "child" | "infant" }>
) {
  return {
    adultCount: participants.filter((participant) => participant.type === "adult").length,
    childCount: participants.filter((participant) => participant.type === "child").length,
    infantCount: participants.filter((participant) => participant.type === "infant").length,
  };
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

    const body: AbandonedCartBody = await request.json();
    const tourId = body.tourId?.trim();
    const email = body.customer?.email?.trim().toLowerCase();

    if (!tourId || !email) {
      return NextResponse.json(
        { message: "tourId and customer email are required" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });
    const tour = await services.tour.getById(tourId);
    const counts = countParticipantsByType(body.participants || []);

    const cart = await services.abandonedCart.createOrUpdate({
      email,
      firstName: body.customer?.firstName?.trim() || undefined,
      lastName: body.customer?.lastName?.trim() || undefined,
      phone: body.customer?.phone?.trim() || undefined,
      tourId,
      adultCount: counts.adultCount || undefined,
      childCount: counts.childCount || undefined,
      infantCount: counts.infantCount || undefined,
      subtotal: body.subtotal,
      total: body.total,
      currency: body.currency || org.settings?.defaultCurrency || org.currency || "USD",
      lastStep: body.lastStep || "payment",
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      metadata: {
        bookingDate: body.bookingDate || null,
        bookingTime: body.bookingTime || null,
      },
    });

    if (cart.recoveryToken) {
      await sendCartAbandonedEvent({
        organizationId: org.id,
        cartId: cart.id,
        email,
        customerName:
          body.customer?.firstName && body.customer?.lastName
            ? `${body.customer.firstName} ${body.customer.lastName}`
            : undefined,
        tourName: tour.name,
        tourDate: body.bookingDate,
        cartTotal: cart.total || body.total,
        currency: cart.currency || body.currency,
        recoveryToken: cart.recoveryToken,
      });
    }

    return NextResponse.json({
      cartId: cart.id,
      recoveryToken: cart.recoveryToken,
      status: cart.status,
    });
  } catch (error) {
    console.error("Failed to upsert abandoned cart:", error);
    return NextResponse.json(
      { message: "Failed to save cart progress" },
      { status: 500 }
    );
  }
}
