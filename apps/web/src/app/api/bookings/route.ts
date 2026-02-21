import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, bookings, db, eq, organizations } from "@tour/database";
import { createServices, logger } from "@tour/services";
import {
  checkCompositeRateLimits,
  getRequestIp,
  type RateLimitResult,
} from "@/lib/booking-rate-limit";
import {
  attachBookingToAttempt,
  getCheckoutReusePayload,
  hashCheckoutFingerprint,
  isValidIdempotencyKey,
  markCheckoutAttemptFailure,
  markCheckoutAttemptPaid,
  markCheckoutSessionCreated,
  reserveCheckoutAttempt,
} from "@/lib/checkout-attempts";
import { parseDateKeyToLocalDate } from "@/lib/date-key";
import { sendBookingCreatedEvent } from "@/lib/inngest-events";
import { getOrganizationBookingUrl } from "@/lib/organization";
import { verifyAndCalculateBookingPricing } from "@/lib/booking-pricing";
import {
  createBookingCheckoutSession,
  createBookingPaymentIntent,
  retrieveBookingCheckoutSession,
} from "@/lib/stripe-checkout";

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
  paymentMode?: "redirect" | "embedded";
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

function rateLimitedResponse(message: string, rateLimit: RateLimitResult) {
  return NextResponse.json(
    { message },
    {
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    }
  );
}

function buildCheckoutFingerprintInput(input: {
  tourId: string;
  bookingDate: string;
  bookingTime: string;
  bookingOptionId?: string;
  customerEmail: string;
  participants: BookingRequestBody["participants"];
  selectedAddOns: Array<{ addOnProductId: string; quantity: number }>;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  discountCode: string | null | undefined;
}) {
  return {
    tourId: input.tourId,
    bookingDate: input.bookingDate,
    bookingTime: input.bookingTime,
    bookingOptionId: input.bookingOptionId ?? null,
    customerEmail: input.customerEmail.trim().toLowerCase(),
    participants: input.participants.map((participant) => ({
      type: participant.type,
      firstName: participant.firstName.trim().toLowerCase(),
      lastName: participant.lastName.trim().toLowerCase(),
      email: participant.email?.trim().toLowerCase() ?? null,
    })),
    selectedAddOns: input.selectedAddOns
      .map((addOn) => ({
        addOnProductId: addOn.addOnProductId,
        quantity: addOn.quantity,
      }))
      .sort((a, b) => a.addOnProductId.localeCompare(b.addOnProductId)),
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    taxCents: input.taxCents,
    totalCents: input.totalCents,
    discountCode: input.discountCode?.trim() || null,
  };
}

function getChargeAmounts(booking: {
  total: string;
  paidAmount: string | null;
  depositRequired: string | null;
  depositPaid: string | null;
}): {
  amountToCharge: number;
  paymentMode: "deposit" | "full";
  remainingBalance: number;
} {
  const total = parseFloat(booking.total || "0");
  const paidAmount = parseFloat(booking.paidAmount || "0");
  const depositRequired = parseFloat(booking.depositRequired || "0");
  const depositPaid = parseFloat(booking.depositPaid || "0");

  const remainingBalance = Math.max(0, total - paidAmount);
  if (remainingBalance <= 0) {
    return {
      amountToCharge: 0,
      paymentMode: "full",
      remainingBalance: 0,
    };
  }

  if (depositRequired > 0 && depositPaid < depositRequired) {
    return {
      amountToCharge: Math.min(remainingBalance, Math.max(0, depositRequired - depositPaid)),
      paymentMode: "deposit",
      remainingBalance,
    };
  }

  return {
    amountToCharge: remainingBalance,
    paymentMode: "full",
    remainingBalance,
  };
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);
  let attemptId: string | null = null;
  let attemptOrgId: string | null = null;

  try {
    const ipRateLimit = await checkCompositeRateLimits([
      { scope: "booking_create_ip", identifier: ipAddress },
    ]);
    if (!ipRateLimit.allowed) {
      return rateLimitedResponse(
        "Too many booking attempts. Please try again shortly.",
        ipRateLimit
      );
    }

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

    const idempotencyKeyHeader = request.headers.get("x-idempotency-key")?.trim() || null;
    if (!isValidIdempotencyKey(idempotencyKeyHeader)) {
      return NextResponse.json(
        { message: "Missing or invalid X-Idempotency-Key header." },
        { status: 400 }
      );
    }
    const idempotencyKey = idempotencyKeyHeader as string;

    let body: BookingRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

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

    const customerRateLimit = await checkCompositeRateLimits([
      {
        scope: "booking_create_customer",
        identifier: body.customer.email.trim().toLowerCase(),
      },
    ]);
    if (!customerRateLimit.allowed) {
      return rateLimitedResponse(
        "Too many booking attempts for this customer. Please try again shortly.",
        customerRateLimit
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

    const fingerprintHash = hashCheckoutFingerprint(
      buildCheckoutFingerprintInput({
        tourId: body.tourId,
        bookingDate: body.bookingDate,
        bookingTime: body.bookingTime,
        bookingOptionId: body.bookingOptionId,
        customerEmail: body.customer.email,
        participants: body.participants,
        selectedAddOns: normalizedAddOns.map((addOn) => ({
          addOnProductId: addOn.addOnProductId,
          quantity: addOn.quantity,
        })),
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        discountCode: body.discountCode,
      })
    );

    const reservation = await reserveCheckoutAttempt({
      organizationId: org.id,
      idempotencyKey,
      fingerprintHash,
      amountCents: totalCents,
      currency:
        pricingVerification.pricing.currency ||
        org.settings?.defaultCurrency ||
        org.currency ||
        "USD",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    attemptId = reservation.attempt.id;
    attemptOrgId = org.id;

    if (!reservation.created) {
      if (reservation.attempt.fingerprintHash !== fingerprintHash) {
        return NextResponse.json(
          {
            message:
              "This idempotency key was already used with different checkout details.",
          },
          { status: 409 }
        );
      }

      if (reservation.attempt.status === "paid") {
        const attemptBooking = reservation.attempt.bookingId
          ? await db.query.bookings.findFirst({
              where: and(
                eq(bookings.id, reservation.attempt.bookingId),
                eq(bookings.organizationId, org.id)
              ),
            })
          : null;

        return NextResponse.json({
          booking: {
            id: attemptBooking?.id ?? reservation.attempt.bookingId ?? null,
            referenceNumber: attemptBooking?.referenceNumber ?? null,
          },
          message: "Payment already completed for this checkout attempt.",
        });
      }

      if (reservation.attempt.status === "session_created") {
        if (process.env.STRIPE_SECRET_KEY && reservation.attempt.stripeSessionId) {
          try {
            const session = await retrieveBookingCheckoutSession(
              reservation.attempt.stripeSessionId
            );
            if (
              session.payment_status === "paid" ||
              session.status === "complete"
            ) {
              return NextResponse.json({
                booking: {
                  id: reservation.attempt.bookingId,
                  referenceNumber: null,
                },
                message: "Payment already completed for this checkout attempt.",
              });
            }

            if (session.status === "open" && session.url) {
              const payload = getCheckoutReusePayload(reservation.attempt);
              return NextResponse.json({
                booking: {
                  id: reservation.attempt.bookingId,
                  referenceNumber: payload?.bookingReference ?? null,
                },
                paymentUrl: session.url,
                paymentAmount: payload?.paymentAmount ?? centsToMoney(reservation.attempt.amountCents),
                remainingBalance:
                  payload?.remainingBalance ?? centsToMoney(reservation.attempt.amountCents),
                paymentMode: payload?.paymentMode ?? "full",
                idempotentReplay: true,
                message: "Resuming existing secure checkout session",
              });
            }
          } catch (error) {
            logger.warn(
              { err: error, attemptId: reservation.attempt.id },
              "Failed to retrieve existing checkout session, will create a new one"
            );
          }
        }

        const payload = getCheckoutReusePayload(reservation.attempt);
        if (payload?.paymentUrl) {
          return NextResponse.json({
            booking: {
              id: payload.bookingId,
              referenceNumber: payload.bookingReference,
            },
            paymentUrl: payload.paymentUrl,
            paymentAmount: payload.paymentAmount,
            remainingBalance: payload.remainingBalance,
            paymentMode: payload.paymentMode,
            idempotentReplay: true,
            message: "Resuming existing secure checkout session",
          });
        }
      }

      if (
        reservation.attempt.status === "initiated" &&
        !reservation.attempt.bookingId
      ) {
        const ageMs = Date.now() - new Date(reservation.attempt.updatedAt).getTime();
        if (ageMs < 120_000) {
          return NextResponse.json(
            {
              message: "Checkout is already being prepared. Please retry in a moment.",
            },
            {
              status: 409,
              headers: {
                "Retry-After": "2",
              },
            }
          );
        }
      }
    }

    if (!customer) {
      customer = await getOrCreateCustomer();
    }

    const adultCount = body.participants.filter((p) => p.type === "adult").length;
    const childCount = body.participants.filter((p) => p.type === "child").length;
    const infantCount = body.participants.filter((p) => p.type === "infant").length;

    let booking =
      !reservation.created && reservation.attempt.bookingId
        ? await services.booking
            .getById(reservation.attempt.bookingId)
            .catch(() => null)
        : null;

    if (!booking) {
      logger.info(
        {
          event: "booking_create_attempted",
          organizationId: org.id,
          tourId: body.tourId,
          bookingDate: body.bookingDate,
          bookingTime: body.bookingTime,
        },
        "Creating booking from website checkout"
      );

      booking = await services.booking.create({
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
      const createdBooking = booking;

      await attachBookingToAttempt({
        organizationId: org.id,
        attemptId: reservation.attempt.id,
        bookingId: createdBooking.id,
      });

      if (normalizedAddOns.length > 0) {
        await Promise.all(
          normalizedAddOns.map((addOn) =>
            services.addOn.addToBooking({
              bookingId: createdBooking.id,
              addOnProductId: addOn.addOnProductId,
              quantity: addOn.quantity,
              unitPrice: centsToMoney(addOn.unitPriceCents),
            })
          )
        );
      }

      if (body.abandonedCartId) {
        try {
          await services.abandonedCart.markRecovered(body.abandonedCartId, createdBooking.id);
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
        bookingId: createdBooking.id,
        customerId: customer.id,
        customerEmail: body.customer.email,
        customerName: `${body.customer.firstName} ${body.customer.lastName}`,
        bookingReference: createdBooking.referenceNumber,
        tourName: createdBooking.tour?.name || pricingVerification.tour.name,
        tourDate: emailTourDate,
        tourTime: createdBooking.bookingTime || body.bookingTime,
        participants: createdBooking.totalParticipants,
        totalAmount: createdBooking.total,
        currency: createdBooking.currency,
        meetingPoint: createdBooking.tour?.meetingPoint || undefined,
        meetingPointDetails: createdBooking.tour?.meetingPointDetails || undefined,
      });

      logger.info(
        {
          event: "booking_create_succeeded",
          organizationId: org.id,
          bookingId: booking.id,
          referenceNumber: booking.referenceNumber,
        },
        "Website booking created successfully"
      );

      const total = totalCents / 100;
      const deposit = await services.deposit.calculateDeposit(
        body.tourId,
        total,
        bookingDate
      );

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
            eq(bookings.id, createdBooking.id),
            eq(bookings.organizationId, org.id)
          )
        );

      booking = await services.booking.getById(createdBooking.id);
    }

    const chargeAmounts = getChargeAmounts({
      total: booking.total,
      paidAmount: booking.paidAmount,
      depositRequired: booking.depositRequired,
      depositPaid: booking.depositPaid,
    });

    if (chargeAmounts.amountToCharge <= 0) {
      await services.booking.updatePaymentStatus(booking.id, "paid", booking.total);
      await markCheckoutAttemptPaid({
        organizationId: org.id,
        bookingId: booking.id,
        stripePaymentIntentId: booking.stripePaymentIntentId,
      });

      return NextResponse.json({
        booking: {
          id: booking.id,
          referenceNumber: booking.referenceNumber,
        },
        message: "Booking confirmed successfully",
      });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      const useEmbeddedPayment = body.paymentMode === "embedded";

      try {
        const checkoutTourDate = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: org.timezone || "UTC",
        }).format(bookingDate);

        const checkoutStartedAt = Date.now();
        logger.info(
          {
            event: "checkout_started",
            bookingId: booking.id,
            organizationId: org.id,
            idempotencyKey,
            paymentMode: useEmbeddedPayment ? "embedded" : "redirect",
          },
          "Checkout started"
        );

        const stripeCurrency =
          pricingVerification.pricing.currency ||
          org.settings?.defaultCurrency ||
          "USD";
        const stripeAmountInCents = Math.round(chargeAmounts.amountToCharge * 100);
        const stripeTourName = booking.tour?.name || pricingVerification.tour.name;

        if (useEmbeddedPayment) {
          // --- Embedded payment mode: create PaymentIntent, return clientSecret ---
          const paymentIntent = await createBookingPaymentIntent({
            organizationId: org.id,
            bookingId: booking.id,
            customerId: booking.customerId,
            bookingReference: booking.referenceNumber,
            customerEmail: body.customer.email,
            currency: stripeCurrency,
            amountInCents: stripeAmountInCents,
            tourName: stripeTourName,
            tourDate: checkoutTourDate,
            participants: body.participants.length,
            idempotencyKey: `pi:${org.id}:${idempotencyKey}`,
          });

          await markCheckoutSessionCreated({
            organizationId: org.id,
            attemptId: reservation.attempt.id,
            bookingId: booking.id,
            stripeSessionId: null,
            stripePaymentIntentId: paymentIntent.id,
            paymentUrl: null,
            paymentAmount: chargeAmounts.amountToCharge.toFixed(2),
            remainingBalance: Math.max(
              0,
              chargeAmounts.remainingBalance - chargeAmounts.amountToCharge
            ).toFixed(2),
            paymentMode: chargeAmounts.paymentMode,
            bookingReference: booking.referenceNumber,
          });

          logger.info(
            {
              event: "stripe_payment_intent_created",
              bookingId: booking.id,
              organizationId: org.id,
              paymentIntentId: paymentIntent.id,
              durationMs: Date.now() - checkoutStartedAt,
            },
            "Stripe PaymentIntent created for embedded checkout"
          );

          return NextResponse.json({
            booking: {
              id: booking.id,
              referenceNumber: booking.referenceNumber,
            },
            clientSecret: paymentIntent.client_secret,
            paymentAmount: chargeAmounts.amountToCharge.toFixed(2),
            remainingBalance: Math.max(
              0,
              chargeAmounts.remainingBalance - chargeAmounts.amountToCharge
            ).toFixed(2),
            paymentMode: chargeAmounts.paymentMode,
            message: "Booking created, ready for inline payment",
          });
        }

        // --- Redirect payment mode: create Checkout Session ---
        const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");

        const session = await createBookingCheckoutSession({
          organizationId: org.id,
          bookingId: booking.id,
          customerId: booking.customerId,
          bookingReference: booking.referenceNumber,
          customerEmail: body.customer.email,
          currency: stripeCurrency,
          amountInCents: stripeAmountInCents,
          tourName: stripeTourName,
          tourDate: checkoutTourDate,
          participants: body.participants.length,
          successUrl: `${baseUrl}/booking/success?ref=${booking.referenceNumber}`,
          cancelUrl: `${baseUrl}/booking/cancelled?ref=${booking.referenceNumber}`,
          idempotencyKey: `booking:${org.id}:${idempotencyKey}`,
        });

        if (!session.url) {
          throw new Error("Stripe checkout URL was not returned");
        }

        await markCheckoutSessionCreated({
          organizationId: org.id,
          attemptId: reservation.attempt.id,
          bookingId: booking.id,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          paymentUrl: session.url,
          paymentAmount: chargeAmounts.amountToCharge.toFixed(2),
          remainingBalance: Math.max(
            0,
            chargeAmounts.remainingBalance - chargeAmounts.amountToCharge
          ).toFixed(2),
          paymentMode: chargeAmounts.paymentMode,
          bookingReference: booking.referenceNumber,
        });

        logger.info(
          {
            event: "stripe_session_created",
            bookingId: booking.id,
            organizationId: org.id,
            stripeSessionId: session.id,
            durationMs: Date.now() - checkoutStartedAt,
          },
          "Stripe checkout session created"
        );

        return NextResponse.json({
          booking: {
            id: booking.id,
            referenceNumber: booking.referenceNumber,
          },
          paymentUrl: session.url,
          paymentAmount: chargeAmounts.amountToCharge.toFixed(2),
          remainingBalance: Math.max(
            0,
            chargeAmounts.remainingBalance - chargeAmounts.amountToCharge
          ).toFixed(2),
          paymentMode: chargeAmounts.paymentMode,
          message:
            chargeAmounts.paymentMode === "deposit"
              ? "Booking created, redirecting to deposit payment"
              : "Booking created, redirecting to payment",
        });
      } catch (stripeError) {
        await markCheckoutAttemptFailure({
          organizationId: org.id,
          attemptId: reservation.attempt.id,
          errorMessage:
            stripeError instanceof Error
              ? stripeError.message
              : "Unable to create Stripe checkout",
        });

        logger.error(
          {
            err: stripeError,
            event: "checkout_failed",
            bookingId: booking.id,
            organizationId: org.id,
          },
          "Stripe checkout creation failed"
        );

        return NextResponse.json(
          {
            message: "Unable to start secure checkout. Please try again.",
            booking: {
              id: booking.id,
              referenceNumber: booking.referenceNumber,
            },
          },
          { status: 502 }
        );
      }
    }

    await markCheckoutAttemptFailure({
      organizationId: org.id,
      attemptId: reservation.attempt.id,
      errorMessage: "Stripe checkout is not configured in this environment",
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
      },
      paymentAmount: chargeAmounts.amountToCharge.toFixed(2),
      remainingBalance: Math.max(
        0,
        chargeAmounts.remainingBalance - chargeAmounts.amountToCharge
      ).toFixed(2),
      paymentMode: chargeAmounts.paymentMode,
      message: "Booking created, payment setup is unavailable right now",
    });
  } catch (error) {
    if (attemptId && attemptOrgId) {
      await markCheckoutAttemptFailure({
        organizationId: attemptOrgId,
        attemptId,
        errorMessage: error instanceof Error ? error.message : "Unknown checkout failure",
      }).catch(() => undefined);
    }

    logger.error({ err: error }, "Booking creation error");

    if (error instanceof Error) {
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
