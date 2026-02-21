import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq, type AbandonedCartStep } from "@tour/database";
import { createServices } from "@tour/services";
import { sendCartAbandonedEvent } from "@/lib/inngest-events";

type BookingFlowStep =
  | "options"
  | "select"
  | "addons"
  | "details"
  | "review"
  | "payment"
  | "waiver"
  | "confirmation";

interface AbandonedCartBody {
  tourId?: string;
  bookingDate?: string;
  bookingTime?: string;
  bookingOptionId?: string;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    specialRequests?: string;
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
  };
  participants?: Array<{ type?: "adult" | "child" | "infant" }>;
  selectedAddOns?: Array<{
    addOnProductId?: string;
    quantity?: number;
  }>;
  subtotal?: string;
  discount?: string;
  discountCode?: string | null;
  total?: string;
  currency?: string;
  lastStep?: AbandonedCartStep | BookingFlowStep;
}

function mapStepToAbandonedCartStep(
  step: AbandonedCartBody["lastStep"]
): AbandonedCartStep {
  switch (step) {
    case "tour_selected":
    case "date_selected":
    case "participants_added":
    case "customer_info":
    case "payment":
      return step;
    case "options":
    case "select":
    case "addons":
      return "participants_added";
    case "details":
      return "customer_info";
    case "review":
    case "waiver":
    case "confirmation":
      return "payment";
    default:
      return "payment";
  }
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
    const existingActiveCart = await services.abandonedCart.getActiveCartByEmail(email);
    const counts = countParticipantsByType(body.participants || []);
    const selectedAddOns = (body.selectedAddOns || [])
      .map((addOn) => ({
        addOnProductId: addOn.addOnProductId?.trim() || "",
        quantity: Math.max(1, Math.round(addOn.quantity || 0)),
      }))
      .filter((addOn) => addOn.addOnProductId.length > 0);

    const lastStep = mapStepToAbandonedCartStep(body.lastStep);

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
      lastStep,
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      metadata: {
        bookingDate: body.bookingDate || null,
        bookingTime: body.bookingTime || null,
        bookingOptionId: body.bookingOptionId?.trim() || null,
        selectedAddOns,
        discount: body.discount || null,
        discountCode: body.discountCode?.trim() || null,
        customerSpecialRequests: body.customer?.specialRequests || null,
        customerDietaryRequirements: body.customer?.dietaryRequirements || null,
        customerAccessibilityNeeds: body.customer?.accessibilityNeeds || null,
        bookingFlowStep:
          body.lastStep &&
          [
            "options",
            "select",
            "addons",
            "details",
            "review",
            "payment",
            "waiver",
            "confirmation",
          ].includes(body.lastStep)
            ? (body.lastStep as BookingFlowStep)
            : null,
      },
    });

    const shouldSendRecoveryEvent =
      !existingActiveCart ||
      existingActiveCart.id !== cart.id ||
      existingActiveCart.tourId !== cart.tourId;

    if (cart.recoveryToken && shouldSendRecoveryEvent) {
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
