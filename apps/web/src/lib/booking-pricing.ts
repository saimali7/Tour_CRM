import {
  and,
  db,
  eq,
  tourPricingTiers,
  tours,
  type Organization,
  type ParticipantType,
} from "@tour/database";

interface ClientPricingPayload {
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
}

interface PricingCalculationInput {
  organization: Pick<Organization, "id" | "currency" | "settings">;
  tourId: string;
  participants: Array<{ type: ParticipantType }>;
  clientPricing?: ClientPricingPayload;
}

export interface VerifiedPricingResult {
  isValid: boolean;
  mismatches: string[];
  pricing: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    currency: string;
  };
  tour: {
    id: string;
    name: string;
  };
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function parseMoneyToCents(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return toCents(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return toCents(parsed);
  }

  return null;
}

function centsToString(value: number): string {
  return (value / 100).toFixed(2);
}

function matchesType(tierName: string, participantType: ParticipantType): boolean {
  const normalized = tierName.trim().toLowerCase();

  if (participantType === "adult") {
    return normalized === "adult" || normalized.includes("adult");
  }

  if (participantType === "child") {
    return (
      normalized === "child" ||
      normalized.includes("child") ||
      normalized.includes("kid")
    );
  }

  return (
    normalized === "infant" ||
    normalized.includes("infant") ||
    normalized.includes("baby")
  );
}

function compareClientAmount(
  field: keyof ClientPricingPayload,
  providedValue: string | number | undefined,
  expectedCents: number,
  mismatches: string[]
): void {
  if (providedValue === undefined || providedValue === null) {
    return;
  }

  const providedCents = parseMoneyToCents(providedValue);
  if (providedCents === null) {
    mismatches.push(`Invalid ${field} format`);
    return;
  }

  if (Math.abs(providedCents - expectedCents) > 1) {
    mismatches.push(
      `${field} mismatch (received ${centsToString(providedCents)}, expected ${centsToString(expectedCents)})`
    );
  }
}

export async function verifyAndCalculateBookingPricing(
  input: PricingCalculationInput
): Promise<VerifiedPricingResult> {
  const tour = await db.query.tours.findFirst({
    where: and(eq(tours.id, input.tourId), eq(tours.organizationId, input.organization.id)),
  });

  if (!tour) {
    throw new Error("Tour not found");
  }

  const pricingTiers = await db.query.tourPricingTiers.findMany({
    where: and(
      eq(tourPricingTiers.organizationId, input.organization.id),
      eq(tourPricingTiers.tourId, input.tourId),
      eq(tourPricingTiers.isActive, true)
    ),
  });

  const baseAdultPriceCents = parseMoneyToCents(tour.basePrice) ?? 0;

  const adultTier = pricingTiers.find((tier) => matchesType(tier.name, "adult"));
  const childTier = pricingTiers.find((tier) => matchesType(tier.name, "child"));
  const infantTier = pricingTiers.find((tier) => matchesType(tier.name, "infant"));

  const adultPriceCents = parseMoneyToCents(adultTier?.price) ?? baseAdultPriceCents;
  const childPriceCents = parseMoneyToCents(childTier?.price) ?? adultPriceCents;
  const infantPriceCents = parseMoneyToCents(infantTier?.price) ?? 0;

  const adultCount = input.participants.filter((p) => p.type === "adult").length;
  const childCount = input.participants.filter((p) => p.type === "child").length;
  const infantCount = input.participants.filter((p) => p.type === "infant").length;

  const subtotalCents =
    adultCount * adultPriceCents +
    childCount * childPriceCents +
    infantCount * infantPriceCents;

  const requestedDiscountCents =
    parseMoneyToCents(input.clientPricing?.discount ?? "0") ?? 0;

  if (requestedDiscountCents < 0) {
    throw new Error("Discount cannot be negative");
  }

  if (requestedDiscountCents > subtotalCents) {
    throw new Error("Discount cannot exceed subtotal");
  }

  const taxableBaseCents = Math.max(0, subtotalCents - requestedDiscountCents);

  const taxSettings = input.organization.settings?.tax;
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

  const mismatches: string[] = [];

  compareClientAmount("subtotal", input.clientPricing?.subtotal, subtotalCents, mismatches);
  compareClientAmount("discount", input.clientPricing?.discount, requestedDiscountCents, mismatches);
  compareClientAmount("tax", input.clientPricing?.tax, taxCents, mismatches);
  compareClientAmount("total", input.clientPricing?.total, totalCents, mismatches);

  const currency =
    tour.currency ||
    input.organization.settings?.defaultCurrency ||
    input.organization.currency ||
    "USD";

  return {
    isValid: mismatches.length === 0,
    mismatches,
    pricing: {
      subtotal: centsToString(subtotalCents),
      discount: centsToString(requestedDiscountCents),
      tax: centsToString(taxCents),
      total: centsToString(totalCents),
      currency,
    },
    tour: {
      id: tour.id,
      name: tour.name,
    },
  };
}
