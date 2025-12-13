import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices } from "@tour/services";

interface BookingRequestBody {
  scheduleId: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    specialRequests?: string;
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
  };
  participants: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    type: "adult" | "child" | "infant";
  }>;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  discountCode?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Get organization slug from header (set by middleware)
    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 400 }
      );
    }

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { message: "Organization not found or inactive" },
        { status: 400 }
      );
    }

    const body: BookingRequestBody = await request.json();

    // Validate required fields
    if (!body.scheduleId) {
      return NextResponse.json(
        { message: "Schedule ID is required" },
        { status: 400 }
      );
    }

    if (!body.customer?.email || !body.customer?.firstName || !body.customer?.lastName) {
      return NextResponse.json(
        { message: "Customer details are required" },
        { status: 400 }
      );
    }

    if (!body.participants || body.participants.length === 0) {
      return NextResponse.json(
        { message: "At least one participant is required" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });

    // Get or create customer
    const customer = await services.customer.getOrCreate({
      email: body.customer.email,
      firstName: body.customer.firstName,
      lastName: body.customer.lastName,
      phone: body.customer.phone,
      source: "website",
    });

    // Count participants by type
    const adultCount = body.participants.filter((p) => p.type === "adult").length;
    const childCount = body.participants.filter((p) => p.type === "child").length;
    const infantCount = body.participants.filter((p) => p.type === "infant").length;

    // Create booking
    const booking = await services.booking.create({
      customerId: customer.id,
      scheduleId: body.scheduleId,
      adultCount,
      childCount,
      infantCount,
      specialRequests: body.customer.specialRequests,
      dietaryRequirements: body.customer.dietaryRequirements,
      accessibilityNeeds: body.customer.accessibilityNeeds,
      source: "website",
      participants: body.participants.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        type: p.type,
      })),
      subtotal: body.subtotal,
      discount: body.discount,
      tax: body.tax,
      total: body.total,
    });

    // For paid bookings, we would create a Stripe payment intent here
    // For now, we'll auto-confirm free bookings and return the booking
    const total = parseFloat(body.total);

    if (total === 0) {
      // Free booking - auto-confirm
      const confirmedBooking = await services.booking.confirm(booking.id);
      await services.booking.updatePaymentStatus(booking.id, "paid", "0");

      return NextResponse.json({
        booking: {
          id: confirmedBooking.id,
          referenceNumber: confirmedBooking.referenceNumber,
        },
        message: "Booking confirmed successfully",
      });
    }

    // For paid bookings, return booking ID for payment flow
    // In production, this would create a Stripe checkout session
    // and return the checkout URL
    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      // paymentUrl would be the Stripe checkout URL
      message: "Booking created, awaiting payment",
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    if (error instanceof Error) {
      // Handle known errors
      if (error.message.includes("Not enough availability")) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes("Cannot book")) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "Failed to create booking" },
      { status: 500 }
    );
  }
}
