/**
 * Pricing Calculator Service
 *
 * Pure calculation service for booking option pricing.
 * Handles all 5 pricing models and returns calculated prices.
 *
 * All amounts are in minor units (cents) for precision.
 */

import { ServiceError } from "./types";
import type {
  PricingModel,
  PerPersonPricing,
  PerUnitPricing,
  FlatRatePricing,
  TieredGroupPricing,
  BasePerPersonPricing,
  Money,
} from "@tour/database";
import type { AddOnPricingStructure } from "@tour/database";

export interface GuestBreakdown {
  adults: number;
  children: number;
  infants: number;
}

export interface CalculatedPrice {
  total: Money;
  breakdown: string;
  unitsNeeded?: number;
  fitsInOneUnit?: boolean;
}

export interface CapacityFit {
  fits: boolean;
  unitsNeeded?: number;
  fitsInOneUnit?: boolean;
  statement?: string;
}

/**
 * Calculate total guests (excluding infants for most calculations)
 */
function getTotalGuests(guests: GuestBreakdown, includeInfants = false): number {
  return guests.adults + guests.children + (includeInfants ? guests.infants : 0);
}

/**
 * Calculate total occupants (for vehicle capacity, includes infants)
 */
function getTotalOccupants(guests: GuestBreakdown): number {
  return guests.adults + guests.children + guests.infants;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

// ============================================================
// PER PERSON PRICING
// ============================================================

export function calculatePerPerson(
  pricing: PerPersonPricing,
  guests: GuestBreakdown
): CalculatedPrice {
  const currency = pricing.tiers[0]?.price.currency || "USD";
  let total = 0;
  const parts: string[] = [];

  // Find adult tier
  const adultTier = pricing.tiers.find(
    (t) => t.id === "adult" || t.name.toLowerCase().includes("adult")
  );
  if (adultTier && guests.adults > 0) {
    const adultTotal = adultTier.price.amount * guests.adults;
    total += adultTotal;
    parts.push(`${guests.adults} × ${formatCurrency(adultTier.price.amount, currency)}`);
  }

  // Find child tier
  const childTier = pricing.tiers.find(
    (t) => t.id === "child" || t.name.toLowerCase().includes("child")
  );
  if (childTier && guests.children > 0) {
    const childTotal = childTier.price.amount * guests.children;
    total += childTotal;
    parts.push(`${guests.children} × ${formatCurrency(childTier.price.amount, currency)}`);
  }

  // Find infant tier (may be free)
  const infantTier = pricing.tiers.find(
    (t) => t.id === "infant" || t.name.toLowerCase().includes("infant")
  );
  if (infantTier && guests.infants > 0 && infantTier.price.amount > 0) {
    const infantTotal = infantTier.price.amount * guests.infants;
    total += infantTotal;
    parts.push(`${guests.infants} × ${formatCurrency(infantTier.price.amount, currency)}`);
  }

  return {
    total: { amount: total, currency },
    breakdown: parts.join(" + "),
  };
}

// ============================================================
// PER UNIT PRICING
// ============================================================

export function calculatePerUnit(
  pricing: PerUnitPricing,
  guests: GuestBreakdown
): CalculatedPrice {
  const currency = pricing.pricePerUnit.currency;
  const totalOccupants = getTotalOccupants(guests);
  const unitsNeeded = Math.ceil(totalOccupants / pricing.maxOccupancy);
  const fitsInOneUnit = totalOccupants <= pricing.maxOccupancy;

  let total = pricing.pricePerUnit.amount * unitsNeeded;
  const parts: string[] = [];

  if (unitsNeeded === 1) {
    parts.push(`1 ${pricing.unitName}`);
  } else {
    parts.push(`${unitsNeeded} ${pricing.unitNamePlural}`);
  }

  // Handle extra person fees if applicable
  if (pricing.baseOccupancy && pricing.extraPersonFee) {
    const includedOccupants = pricing.baseOccupancy * unitsNeeded;
    const extraOccupants = Math.max(0, totalOccupants - includedOccupants);

    if (extraOccupants > 0) {
      const extraFee = pricing.extraPersonFee.amount * extraOccupants;
      total += extraFee;
      parts.push(`+ ${extraOccupants} extra @ ${formatCurrency(pricing.extraPersonFee.amount, currency)}`);
    }
  }

  return {
    total: { amount: total, currency },
    breakdown: parts.join(" "),
    unitsNeeded,
    fitsInOneUnit,
  };
}

// ============================================================
// FLAT RATE PRICING
// ============================================================

export function calculateFlatRate(
  pricing: FlatRatePricing,
  guests: GuestBreakdown
): CalculatedPrice | null {
  const totalGuests = getTotalGuests(guests);

  // Check if group fits
  if (totalGuests > pricing.maxParticipants) {
    return null; // Option not available
  }

  if (pricing.minParticipants && totalGuests < pricing.minParticipants) {
    return null; // Below minimum
  }

  return {
    total: pricing.price,
    breakdown: `Flat rate for up to ${pricing.maxParticipants} people`,
  };
}

// ============================================================
// TIERED GROUP PRICING
// ============================================================

export function calculateTieredGroup(
  pricing: TieredGroupPricing,
  guests: GuestBreakdown
): CalculatedPrice | null {
  const totalGuests = getTotalGuests(guests);
  const currency = pricing.tiers[0]?.price.currency || "USD";

  // Find matching tier
  const tier = pricing.tiers.find(
    (t) => totalGuests >= t.minSize && totalGuests <= t.maxSize
  );

  if (!tier) {
    return null; // No tier fits this group
  }

  // Tier price is per person - multiply by total guests
  const total = tier.price.amount * totalGuests;

  return {
    total: { amount: total, currency },
    breakdown: `${totalGuests} × ${formatCurrency(tier.price.amount, currency)} (${tier.minSize}-${tier.maxSize} group rate)`,
  };
}

// ============================================================
// BASE PLUS PERSON PRICING
// ============================================================

export function calculateBasePlusPerson(
  pricing: BasePerPersonPricing,
  guests: GuestBreakdown
): CalculatedPrice | null {
  const totalGuests = getTotalGuests(guests);
  const currency = pricing.basePrice.currency;

  // Check if group fits
  if (totalGuests > pricing.maxParticipants) {
    return null;
  }

  let total = pricing.basePrice.amount;
  const extraGuests = Math.max(0, totalGuests - pricing.includedParticipants);

  if (extraGuests > 0) {
    total += pricing.perPersonPrice.amount * extraGuests;
    return {
      total: { amount: total, currency },
      breakdown: `Base (${pricing.includedParticipants} included) + ${extraGuests} × ${formatCurrency(pricing.perPersonPrice.amount, currency)}`,
    };
  }

  return {
    total: { amount: total, currency },
    breakdown: `Base price (includes up to ${pricing.includedParticipants} people)`,
  };
}

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

export function calculatePrice(
  pricingModel: PricingModel,
  guests: GuestBreakdown
): CalculatedPrice | null {
  switch (pricingModel.type) {
    case "per_person":
      return calculatePerPerson(pricingModel, guests);

    case "per_unit":
      return calculatePerUnit(pricingModel, guests);

    case "flat_rate":
      return calculateFlatRate(pricingModel, guests);

    case "tiered_group":
      return calculateTieredGroup(pricingModel, guests);

    case "base_plus_person":
      return calculateBasePlusPerson(pricingModel, guests);

    default:
      // Exhaustive check
      const _exhaustive: never = pricingModel;
      throw new ServiceError(`Unknown pricing model type: ${(_exhaustive as PricingModel).type}`, "UNKNOWN_PRICING_MODEL", 500);
  }
}

// ============================================================
// CAPACITY CHECKING
// ============================================================

export function checkCapacityFit(
  pricingModel: PricingModel,
  guests: GuestBreakdown
): CapacityFit {
  const totalGuests = getTotalGuests(guests);
  const totalOccupants = getTotalOccupants(guests);

  switch (pricingModel.type) {
    case "per_person":
      // Per person always fits (capacity managed at schedule level)
      return { fits: true };

    case "per_unit": {
      const unitsNeeded = Math.ceil(totalOccupants / pricingModel.maxOccupancy);
      const fitsInOneUnit = totalOccupants <= pricingModel.maxOccupancy;

      // Check min occupancy if set
      if (pricingModel.minOccupancy && totalOccupants < pricingModel.minOccupancy) {
        return {
          fits: false,
          statement: `Minimum ${pricingModel.minOccupancy} people required`,
        };
      }

      return {
        fits: true,
        unitsNeeded,
        fitsInOneUnit,
        statement: unitsNeeded > 1
          ? `Requires ${unitsNeeded} ${pricingModel.unitNamePlural}`
          : undefined,
      };
    }

    case "flat_rate":
      if (totalGuests > pricingModel.maxParticipants) {
        return {
          fits: false,
          statement: `Maximum ${pricingModel.maxParticipants} people`,
        };
      }
      if (pricingModel.minParticipants && totalGuests < pricingModel.minParticipants) {
        return {
          fits: false,
          statement: `Minimum ${pricingModel.minParticipants} people required`,
        };
      }
      return { fits: true };

    case "tiered_group": {
      const tier = pricingModel.tiers.find(
        (t) => totalGuests >= t.minSize && totalGuests <= t.maxSize
      );
      if (!tier) {
        const firstTier = pricingModel.tiers[0];
        if (!firstTier) {
          return { fits: false, statement: "No pricing tiers configured" };
        }
        const maxTier = pricingModel.tiers.reduce(
          (max, t) => (t.maxSize > max.maxSize ? t : max),
          firstTier
        );
        return {
          fits: false,
          statement: totalGuests > maxTier.maxSize
            ? `Maximum ${maxTier.maxSize} people`
            : `No pricing tier for ${totalGuests} people`,
        };
      }
      return { fits: true };
    }

    case "base_plus_person":
      if (totalGuests > pricingModel.maxParticipants) {
        return {
          fits: false,
          statement: `Maximum ${pricingModel.maxParticipants} people`,
        };
      }
      return { fits: true };

    default:
      return { fits: true };
  }
}

// ============================================================
// ADD-ON PRICING
// ============================================================

export function calculateAddOnPrice(
  pricing: AddOnPricingStructure,
  guests: GuestBreakdown,
  unitsBooked: number = 1,
  quantity: number = 1
): Money {
  switch (pricing.type) {
    case "fixed":
    case "per_booking":
      return {
        amount: pricing.price.amount * quantity,
        currency: pricing.price.currency,
      };

    case "per_person": {
      const totalGuests = getTotalGuests(guests);
      return {
        amount: pricing.pricePerPerson.amount * totalGuests * quantity,
        currency: pricing.pricePerPerson.currency,
      };
    }

    case "per_adult":
      return {
        amount: pricing.pricePerAdult.amount * guests.adults * quantity,
        currency: pricing.pricePerAdult.currency,
      };

    case "per_participant": {
      let total = 0;
      const currency = pricing.tiers[0]?.price.currency || "USD";

      for (const tier of pricing.tiers) {
        const name = tier.name.toLowerCase();
        if (name.includes("adult")) {
          total += tier.price.amount * guests.adults;
        } else if (name.includes("child")) {
          total += tier.price.amount * guests.children;
        } else if (name.includes("infant")) {
          total += tier.price.amount * guests.infants;
        }
      }

      return {
        amount: total * quantity,
        currency,
      };
    }

    case "per_unit":
      return {
        amount: pricing.pricePerUnit.amount * unitsBooked * quantity,
        currency: pricing.pricePerUnit.currency,
      };

    default:
      // Exhaustive check
      const _exhaustive: never = pricing;
      throw new ServiceError(`Unknown add-on pricing type: ${(_exhaustive as AddOnPricingStructure).type}`, "UNKNOWN_ADDON_PRICING", 500);
  }
}

export function formatAddOnPriceBreakdown(
  pricing: AddOnPricingStructure,
  guests: GuestBreakdown,
  unitsBooked: number = 1,
  quantity: number = 1
): string {
  const currency = "USD"; // Default, should come from pricing

  switch (pricing.type) {
    case "fixed":
    case "per_booking":
      return quantity > 1
        ? `${quantity} × ${formatCurrency(pricing.price.amount, currency)}`
        : "Per booking";

    case "per_person": {
      const totalGuests = getTotalGuests(guests);
      return `${totalGuests} × ${formatCurrency(pricing.pricePerPerson.amount, currency)}`;
    }

    case "per_adult":
      return `${guests.adults} × ${formatCurrency(pricing.pricePerAdult.amount, currency)}`;

    case "per_participant": {
      const parts: string[] = [];
      for (const tier of pricing.tiers) {
        const name = tier.name.toLowerCase();
        if (name.includes("adult") && guests.adults > 0) {
          parts.push(`${guests.adults} adult × ${formatCurrency(tier.price.amount, currency)}`);
        } else if (name.includes("child") && guests.children > 0) {
          parts.push(`${guests.children} child × ${formatCurrency(tier.price.amount, currency)}`);
        }
      }
      return parts.join(" + ");
    }

    case "per_unit":
      return `${unitsBooked} unit × ${formatCurrency(pricing.pricePerUnit.amount, currency)}`;

    default:
      return "Calculated";
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Derive experience mode from pricing model
 */
export function getExperienceMode(
  pricingModel: PricingModel
): "join" | "book" | "charter" {
  switch (pricingModel.type) {
    case "per_person":
      return "join"; // Shared experience

    case "per_unit":
    case "base_plus_person":
      return "book"; // Private booking

    case "flat_rate":
    case "tiered_group":
      return "charter"; // Exclusive/charter

    default:
      return "book";
  }
}

/**
 * Compare two prices and generate comparison statement
 */
export function compareToBaseline(
  optionPrice: Money,
  baselinePrice: Money
): {
  difference: Money;
  percentMore: number;
  statement: string;
} | null {
  if (optionPrice.currency !== baselinePrice.currency) {
    return null;
  }

  const diff = optionPrice.amount - baselinePrice.amount;
  const percentMore = (diff / baselinePrice.amount) * 100;

  if (diff === 0) {
    return null;
  }

  const currency = optionPrice.currency;
  let statement: string;

  if (diff > 0) {
    if (percentMore < 25) {
      statement = `Only ${formatCurrency(diff, currency)} more for privacy`;
    } else {
      statement = `${formatCurrency(diff, currency)} more than shared`;
    }
  } else {
    statement = `Save ${formatCurrency(Math.abs(diff), currency)} vs shared!`;
  }

  return {
    difference: { amount: diff, currency },
    percentMore,
    statement,
  };
}
