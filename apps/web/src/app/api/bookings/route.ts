import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, bookings, eq, and } from "@tour/database";
import { createServices } from "@tour/services";
import { checkBookingRateLimit, getRequestIp } from "@/lib/booking-rate-limit";
import { verifyAndCalculateBookingPricing } from "@/lib/booking-pricing";
import { createBookingCheckoutSession } from "@/lib/stripe-checkout";
import { sendBookingCreatedEvent } from "@/lib/inngest-events";
import { getOrganizationBookingUrl } from "@/lib/organization";
import { parseDateKeyToLocalDate } from "@/lib/date-key";

interface BookingRequestBody {
  tourId: string;
  bookingDate: string;
  bookingTime: string;
  bookingOptionId?: string;
  selectedAddOns?: Array<{
    addOnProductId: string;
    quantity: number;
  }>;
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
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
  discountCode?: string | null;
  abandonedCartId?: string | null;
}

type DiscountCodeType = "promo" | "voucher";

interface ParsedDiscountCode {
  type: DiscountCodeType;
  code: string;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function centsToMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseMoneyToCents(
  value: string | number | null | undefined
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? toCents(value) : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? toCents(parsed) : null;
  }

  return null;
}

function amountsMatch(expected: number, provided: string | number | null | undefined): boolean {
  const cents = parseMoneyToCents(provided);
  if (cents === null) {
    return false;
  }
  return Math.abs(cents - expected) <= 1;
}

function parseDiscountCode(
  rawDiscountCode: string | null | undefined
): ParsedDiscountCode | { error: string } | null {
  const trimmed = rawDiscountCode?.trim();
  if (!trimmed) {
    return null;
  }

  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex === -1) {
    // Backward compatibility for existing clients that send plain promo codes.
    return {
      type: "promo",
      code: trimmed.toUpperCase(),
    };
  }

  if (separatorIndex === 0 || separatorIndex === trimmed.length - 1) {
    return {
      error: "Invalid discount code format. Expected promo:<CODE> or voucher:<CODE>.",
    };
  }

  const rawType = trimmed.slice(0, separatorIndex).toLowerCase();
  const code = trimmed.slice(separatorIndex + 1).trim().toUpperCase();

  if (!code) {
    return {
      error: "Invalid discount code format. Code value cannot be empty.",
    };
  }

  if (rawType !== "promo" && rawType !== "voucher") {
    return {
      error: "Invalid discount code type. Use promo:<CODE> or voucher:<CODE>.",
    };
  }

  return {
    type: rawType,
    code,
  };
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIp(request);
    const rateLimit = checkBookingRateLimit(ipAddress);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      );

      return NextResponse.json(
        { message: "Too many booking attempts. Please try again in a minute." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

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

    let body: BookingRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.tourId || !body.bookingDate || !body.bookingTime) {
      return NextResponse.json(
        { message: "Tour ID, booking date, and booking time are required" },
        { status: 400 }
      );
    }

    if (
      !body.customer?.email ||
      !body.customer?.firstName ||
      !body.customer?.lastName
    ) {
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

    const selectedAddOnsInput = Array.isArray(body.selectedAddOns)
      ? body.selectedAddOns
      : [];

    let bookingDate: Date;
    try {
      bookingDate = parseDateKeyToLocalDate(body.bookingDate);
    } catch {
      return NextResponse.json(
        { message: "Invalid booking date" },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(body.bookingTime)) {
      return NextResponse.json(
        { message: "Invalid booking time format" },
        { status: 400 }
      );
    }

    const parsedDiscountCodeResult = parseDiscountCode(body.discountCode);
    if (parsedDiscountCodeResult && "error" in parsedDiscountCodeResult) {
      return NextResponse.json(
        { message: parsedDiscountCodeResult.error },
        { status: 400 }
      );
    }

    const parsedDiscountCode = parsedDiscountCodeResult || null;
    const providedDiscountCentsRaw = parseMoneyToCents(body.discount);
    const providedDiscountCents = providedDiscountCentsRaw ?? 0;
    if (!parsedDiscountCode && providedDiscountCents > 0) {
      return NextResponse.json(
        { message: "A valid promo or voucher code is required for discounts." },
        { status: 400 }
      );
    }
    const services = createServices({ organizationId: org.id });

    const getOrCreateCustomer = async () =>
      services.customer.getOrCreate({
        email: body.customer.email,
        firstName: body.customer.firstName,
        lastName: body.customer.lastName,
        phone: body.customer.phone,
        source: "website",
      });

    let customer: { id: string } | null = null;

    if (parsedDiscountCode?.type === "promo") {
      customer = await getOrCreateCustomer();
    }

    const pricingVerification = await verifyAndCalculateBookingPricing({
      organization: {
        id: org.id,
        currency: org.currency,
        settings: org.settings,
      },
      tourId: body.tourId,
      participants: body.participants.map((participant) => ({ type: participant.type })),
      clientPricing: {
        discount: body.discount,
      },
    });

    if (!pricingVerification.isValid) {
      return NextResponse.json(
        {
          message: "Pricing validation failed",
          details: pricingVerification.mismatches,
          pricing: pricingVerification.pricing,
        },
        { status: 400 }
      );
    }

    const participantSubtotalCents = parseMoneyToCents(pricingVerification.pricing.subtotal) ?? 0;
    const validatedAddOns = await services.addOn.getAvailableAddOnsForTour(body.tourId);
    const addOnLookup = new Map(validatedAddOns.map((addOn) => [addOn.id, addOn]));
    const normalizedAddOns: Array<{
      addOnProductId: string;
      quantity: number;
      unitPriceCents: number;
    }> = [];
    let addOnSubtotalCents = 0;

    for (const addOnInput of selectedAddOnsInput) {
      const addOnId = addOnInput.addOnProductId?.trim();
      if (!addOnId) {
        return NextResponse.json({ message: "Invalid add-on selection payload." }, { status: 400 });
      }

      const addOn = addOnLookup.get(addOnId);
      if (!addOn) {
        return NextResponse.json({ message: `Selected add-on ${addOnId} is not available for this tour.` }, { status: 400 });
      }

      if (!Number.isFinite(addOnInput.quantity) || addOnInput.quantity <= 0) {
        return NextResponse.json({ message: `Invalid quantity for add-on ${addOn.name}.` }, { status: 400 });
      }

      const normalizedQuantity = Math.min(99, Math.floor(addOnInput.quantity));
      const unitPriceCents = parseMoneyToCents(addOn.effectivePrice) ?? 0;
      const effectiveQuantity =
        addOn.type === "per_booking"
          ? 1
          : addOn.type === "per_person"
            ? Math.max(1, body.participants.length)
            : normalizedQuantity;

      addOnSubtotalCents += unitPriceCents * effectiveQuantity;
      normalizedAddOns.push({
        addOnProductId: addOnId,
        quantity: effectiveQuantity,
        unitPriceCents,
      });
    }

    if (parsedDiscountCode) {
      if (participantSubtotalCents === 0) {
        return NextResponse.json(
          { message: "Unable to validate discount against booking subtotal." },
          { status: 400 }
        );
      }

      if (providedDiscountCentsRaw === null) {
        return NextResponse.json(
          {
            message: `Discount amount is required when using ${parsedDiscountCode.type} codes.`,
          },
          { status: 400 }
        );
      }

      let expectedDiscountCents = 0;

      if (parsedDiscountCode.type === "promo") {
        if (!customer) {
          customer = await getOrCreateCustomer();
        }

        const promoValidation = await services.promoCode.validateCode(
          parsedDiscountCode.code,
          body.tourId,
          customer.id,
          participantSubtotalCents / 100
        );

        if (!promoValidation.valid || !promoValidation.discount) {
          return NextResponse.json(
            { message: promoValidation.error || "Invalid promo code" },
            { status: 400 }
          );
        }

        if (promoValidation.discount.type === "percentage") {
          expectedDiscountCents = Math.round(
            (participantSubtotalCents * promoValidation.discount.value) / 100
          );
        } else {
          expectedDiscountCents = toCents(promoValidation.discount.value);
        }
      } else {
        const voucherValidation = await services.voucher.validateVoucher(
          parsedDiscountCode.code
        );

        if (!voucherValidation.valid) {
          return NextResponse.json(
            { message: voucherValidation.error || "Invalid voucher" },
            { status: 400 }
          );
        }

        if (
          voucherValidation.voucher?.tourId &&
          voucherValidation.voucher.tourId !== body.tourId
        ) {
          return NextResponse.json(
            { message: "This voucher is not valid for the selected tour" },
            { status: 400 }
          );
        }

        if (voucherValidation.type === "tour") {
          expectedDiscountCents = participantSubtotalCents;
        } else if (voucherValidation.type === "percentage") {
          expectedDiscountCents = Math.round(
            (participantSubtotalCents * (voucherValidation.value ?? 0)) / 100
          );
        } else {
          expectedDiscountCents = toCents(voucherValidation.value ?? 0);
        }
      }

      expectedDiscountCents = Math.min(
        participantSubtotalCents,
        Math.max(0, expectedDiscountCents)
      );

      if (Math.abs(providedDiscountCents - expectedDiscountCents) > 1) {
        return NextResponse.json(
          {
            message: `Discount mismatch for ${parsedDiscountCode.type} code ${parsedDiscountCode.code}. Received ${centsToMoney(providedDiscountCents)}, expected ${centsToMoney(expectedDiscountCents)}.`,
          },
          { status: 400 }
        );
      }
    }

    const discountCents = parseMoneyToCents(pricingVerification.pricing.discount) ?? 0;
    const subtotalCents = participantSubtotalCents + addOnSubtotalCents;
    const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
    const taxSettings = org.settings?.tax;
    const taxEnabled = Boolean(taxSettings?.enabled && (taxSettings.rate ?? 0) > 0);
    const taxRate = taxEnabled ? taxSettings?.rate ?? 0 : 0;
    const includeTaxInPrice = Boolean(taxSettings?.includeInPrice);

    const taxCents = !taxEnabled
      ? 0
      : includeTaxInPrice
        ? Math.round((taxableBaseCents * taxRate) / (100 + taxRate))
        : Math.round((taxableBaseCents * taxRate) / 100);

    const totalCents = includeTaxInPrice
      ? taxableBaseCents
      : taxableBaseCents + taxCents;

    if (!amountsMatch(subtotalCents, body.subtotal)) {
      return NextResponse.json(
        {
          message: `Subtotal mismatch. Received ${body.subtotal}, expected ${centsToMoney(subtotalCents)}.`,
        },
        { status: 400 }
      );
    }

    if (!amountsMatch(discountCents, body.discount ?? 0)) {
      return NextResponse.json(
        {
          message: `Discount mismatch. Received ${body.discount}, expected ${centsToMoney(discountCents)}.`,
        },
        { status: 400 }
      );
    }

    if (!amountsMatch(taxCents, body.tax ?? 0)) {
      return NextResponse.json(
        {
          message: `Tax mismatch. Received ${body.tax}, expected ${centsToMoney(taxCents)}.`,
        },
        { status: 400 }
      );
    }

    if (!amountsMatch(totalCents, body.total)) {
      return NextResponse.json(
        {
          message: `Total mismatch. Received ${body.total}, expected ${centsToMoney(totalCents)}.`,
        },
        { status: 400 }
      );
    }

    // Get or create customer
    if (!customer) {
      customer = await getOrCreateCustomer();
    }

    // Count participants by type
    const adultCount = body.participants.filter((p) => p.type === "adult").length;
    const childCount = body.participants.filter((p) => p.type === "child").length;
    const infantCount = body.participants.filter((p) => p.type === "infant").length;

    // Create booking using verified server-side pricing
    const booking = await services.booking.create({
      customerId: customer.id,
      tourId: body.tourId,
      bookingDate,
      bookingTime: body.bookingTime,
      bookingOptionId: body.bookingOptionId,
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
      subtotal: centsToMoney(subtotalCents),
      discount: centsToMoney(discountCents),
      tax: centsToMoney(taxCents),
      total: centsToMoney(totalCents),
    });

    if (normalizedAddOns.length > 0) {
      await Promise.all(
        normalizedAddOns.map((addOn) =>
          services.addOn.addToBooking({
            bookingId: booking.id,
            addOnProductId: addOn.addOnProductId,
            quantity: addOn.quantity,
            unitPrice: centsToMoney(addOn.unitPriceCents),
          })
        )
      );
    }

    if (body.abandonedCartId) {
      try {
        await services.abandonedCart.markRecovered(body.abandonedCartId, booking.id);
      } catch {
        // Non-blocking: booking creation should not fail when cart recovery update fails.
      }
    }

    const emailTourDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: org.timezone || "UTC",
    }).format(bookingDate);

    await sendBookingCreatedEvent({
      organizationId: org.id,
      bookingId: booking.id,
      customerId: customer.id,
      customerEmail: body.customer.email,
      customerName: `${body.customer.firstName} ${body.customer.lastName}`,
      bookingReference: booking.referenceNumber,
      tourName: booking.tour?.name || pricingVerification.tour.name,
      tourDate: emailTourDate,
      tourTime: booking.bookingTime || body.bookingTime,
      participants: booking.totalParticipants,
      totalAmount: booking.total,
      currency: booking.currency,
      meetingPoint: booking.tour?.meetingPoint || undefined,
      meetingPointDetails: booking.tour?.meetingPointDetails || undefined,
    });

    const total = totalCents / 100;
    const deposit = await services.deposit.calculateDeposit(
      body.tourId,
      total,
      bookingDate
    );
    const amountToCharge = deposit.depositRequired ? deposit.depositAmount : total;

    await db
      .update(bookings)
      .set({
        depositRequired: deposit.depositRequired
          ? deposit.depositAmount.toFixed(2)
          : null,
        balanceDueDate: deposit.balanceDueDate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, booking.id),
          eq(bookings.organizationId, org.id)
        )
      );

    if (amountToCharge === 0) {
      // Free booking - mark as paid and ensure status is confirmed
      const confirmedBooking =
        booking.status === "confirmed"
          ? booking
          : await services.booking.confirm(booking.id);

      await services.booking.updatePaymentStatus(booking.id, "paid", "0");

      return NextResponse.json({
        booking: {
          id: confirmedBooking.id,
          referenceNumber: confirmedBooking.referenceNumber,
        },
        message: "Booking confirmed successfully",
      });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");
        const checkoutTourDate = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: org.timezone || "UTC",
        }).format(bookingDate);

        const session = await createBookingCheckoutSession({
          organizationId: org.id,
          bookingId: booking.id,
          customerId: customer.id,
          bookingReference: booking.referenceNumber,
          customerEmail: body.customer.email,
          currency:
            pricingVerification.pricing.currency ||
            org.settings?.defaultCurrency ||
            "USD",
          amountInCents: Math.round(amountToCharge * 100),
          tourName: booking.tour?.name || pricingVerification.tour.name,
          tourDate: checkoutTourDate,
          participants: body.participants.length,
          successUrl: `${baseUrl}/booking/success?ref=${booking.referenceNumber}`,
          cancelUrl: `${baseUrl}/booking/cancelled?ref=${booking.referenceNumber}`,
        });

        if (!session.url) {
          throw new Error("Stripe checkout URL was not returned");
        }

        return NextResponse.json({
          booking: {
            id: booking.id,
            referenceNumber: booking.referenceNumber,
          },
          paymentUrl: session.url,
          paymentAmount: amountToCharge.toFixed(2),
          remainingBalance: Math.max(0, total - amountToCharge).toFixed(2),
          paymentMode: deposit.depositRequired ? "deposit" : "full",
          message: deposit.depositRequired
            ? "Booking created, redirecting to deposit payment"
            : "Booking created, redirecting to payment",
        });
      } catch (stripeError) {
        console.error("Stripe checkout session error:", stripeError);
        return NextResponse.json(
          {
            message: "Unable to start secure checkout. Please try again.",
          },
          { status: 502 }
        );
      }
    }

    // Stripe is not configured in this environment.
    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      paymentAmount: amountToCharge.toFixed(2),
      remainingBalance: Math.max(0, total - amountToCharge).toFixed(2),
      paymentMode: deposit.depositRequired ? "deposit" : "full",
      message: "Booking created, payment setup is unavailable right now",
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    if (error instanceof Error) {
      // Handle known errors
      if (error.message.includes("Not enough availability")) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (error.message.includes("Cannot book")) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (
        error.message.includes("Tour not found") ||
        error.message.includes("Discount cannot")
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { message: "Failed to create booking" },
      { status: 500 }
    );
  }
}
