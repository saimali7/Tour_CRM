/**
 * Type Guards for Pricing Model JSONB Data
 *
 * These guards validate pricing model data loaded from JSONB columns.
 * Use them to ensure runtime safety when working with pricing data.
 *
 * Usage:
 * ```typescript
 * import { isPricingModel, assertPricingModel } from "./pricing-type-guards";
 *
 * // In service code
 * const pricingModel = booking.pricingSnapshot?.pricingModel;
 * if (isPricingModel(pricingModel)) {
 *   // pricingModel is now typed correctly
 * }
 *
 * // Or with assertion
 * assertPricingModel(pricingModel, 'calculatePrice');
 * ```
 */

import type {
  PricingModel,
  PerPersonPricing,
  PerUnitPricing,
  FlatRatePricing,
  TieredGroupPricing,
  BasePerPersonPricing,
  Money,
  PricingTier,
  GroupTier,
  CapacityModel,
  SharedCapacity,
  UnitCapacity,
  BookingOptionSnapshot,
} from "@tour/database";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

// =============================================================================
// MONEY TYPE GUARDS
// =============================================================================

/**
 * Validate a Money object
 */
export function isMoney(value: unknown): value is Money {
  if (!isObject(value)) return false;
  if (!isNumber(value.amount)) return false;
  if (!isString(value.currency)) return false;
  return true;
}

/**
 * Assert a value is a valid Money object
 */
export function assertMoney(value: unknown, context?: string): asserts value is Money {
  if (!isMoney(value)) {
    throw new TypeError(
      `Invalid Money object${context ? ` in ${context}` : ""}: expected { amount: number, currency: string }`
    );
  }
}

// =============================================================================
// PRICING TIER TYPE GUARDS
// =============================================================================

/**
 * Validate a PricingTier object
 */
export function isPricingTier(value: unknown): value is PricingTier {
  if (!isObject(value)) return false;
  if (!isString(value.id)) return false;
  if (!isString(value.name)) return false;
  if (!isMoney(value.price)) return false;
  if (!isBoolean(value.isDefault)) return false;
  if (!isNumber(value.sortOrder)) return false;
  // Optional fields
  if (value.ageMin !== undefined && !isNumber(value.ageMin)) return false;
  if (value.ageMax !== undefined && !isNumber(value.ageMax)) return false;
  return true;
}

/**
 * Validate a GroupTier object
 */
export function isGroupTier(value: unknown): value is GroupTier {
  if (!isObject(value)) return false;
  if (!isNumber(value.minSize)) return false;
  if (!isNumber(value.maxSize)) return false;
  if (!isMoney(value.price)) return false;
  return true;
}

// =============================================================================
// PRICING MODEL TYPE GUARDS
// =============================================================================

/**
 * Validate PerPersonPricing model
 */
export function isPerPersonPricing(value: unknown): value is PerPersonPricing {
  if (!isObject(value)) return false;
  if (value.type !== "per_person") return false;
  if (!Array.isArray(value.tiers)) return false;
  // Validate at least the first tier if present
  if (value.tiers.length > 0 && !isPricingTier(value.tiers[0])) return false;
  return true;
}

/**
 * Validate PerUnitPricing model
 */
export function isPerUnitPricing(value: unknown): value is PerUnitPricing {
  if (!isObject(value)) return false;
  if (value.type !== "per_unit") return false;
  if (!isString(value.unitName)) return false;
  if (!isString(value.unitNamePlural)) return false;
  if (!isMoney(value.pricePerUnit)) return false;
  if (!isNumber(value.maxOccupancy)) return false;
  // Optional fields
  if (value.minOccupancy !== undefined && !isNumber(value.minOccupancy)) return false;
  if (value.baseOccupancy !== undefined && !isNumber(value.baseOccupancy)) return false;
  if (value.extraPersonFee !== undefined && !isMoney(value.extraPersonFee)) return false;
  return true;
}

/**
 * Validate FlatRatePricing model
 */
export function isFlatRatePricing(value: unknown): value is FlatRatePricing {
  if (!isObject(value)) return false;
  if (value.type !== "flat_rate") return false;
  if (!isMoney(value.price)) return false;
  if (!isNumber(value.maxParticipants)) return false;
  // Optional fields
  if (value.minParticipants !== undefined && !isNumber(value.minParticipants)) return false;
  return true;
}

/**
 * Validate TieredGroupPricing model
 */
export function isTieredGroupPricing(value: unknown): value is TieredGroupPricing {
  if (!isObject(value)) return false;
  if (value.type !== "tiered_group") return false;
  if (!Array.isArray(value.tiers)) return false;
  // Validate at least the first tier if present
  if (value.tiers.length > 0 && !isGroupTier(value.tiers[0])) return false;
  return true;
}

/**
 * Validate BasePerPersonPricing model
 */
export function isBasePerPersonPricing(value: unknown): value is BasePerPersonPricing {
  if (!isObject(value)) return false;
  if (value.type !== "base_plus_person") return false;
  if (!isMoney(value.basePrice)) return false;
  if (!isNumber(value.includedParticipants)) return false;
  if (!isMoney(value.perPersonPrice)) return false;
  if (!isNumber(value.maxParticipants)) return false;
  return true;
}

/**
 * Validate any PricingModel (discriminated union)
 */
export function isPricingModel(value: unknown): value is PricingModel {
  if (!isObject(value)) return false;

  switch (value.type) {
    case "per_person":
      return isPerPersonPricing(value);
    case "per_unit":
      return isPerUnitPricing(value);
    case "flat_rate":
      return isFlatRatePricing(value);
    case "tiered_group":
      return isTieredGroupPricing(value);
    case "base_plus_person":
      return isBasePerPersonPricing(value);
    default:
      return false;
  }
}

/**
 * Assert a value is a valid PricingModel
 */
export function assertPricingModel(
  value: unknown,
  context?: string
): asserts value is PricingModel {
  if (!isObject(value)) {
    throw new TypeError(
      `Invalid pricing model${context ? ` in ${context}` : ""}: expected object, got ${typeof value}`
    );
  }

  const type = (value as Record<string, unknown>).type;
  if (!isString(type)) {
    throw new TypeError(
      `Invalid pricing model${context ? ` in ${context}` : ""}: missing or invalid 'type' field`
    );
  }

  const validTypes = ["per_person", "per_unit", "flat_rate", "tiered_group", "base_plus_person"];
  if (!validTypes.includes(type)) {
    throw new TypeError(
      `Invalid pricing model type${context ? ` in ${context}` : ""}: got "${type}", expected one of ${validTypes.join(", ")}`
    );
  }

  if (!isPricingModel(value)) {
    throw new TypeError(
      `Invalid pricing model structure${context ? ` in ${context}` : ""} for type "${type}". Check all required fields.`
    );
  }
}

// =============================================================================
// CAPACITY MODEL TYPE GUARDS
// =============================================================================

/**
 * Validate SharedCapacity model
 */
export function isSharedCapacity(value: unknown): value is SharedCapacity {
  if (!isObject(value)) return false;
  if (value.type !== "shared") return false;
  if (!isNumber(value.totalSeats)) return false;
  return true;
}

/**
 * Validate UnitCapacity model
 */
export function isUnitCapacity(value: unknown): value is UnitCapacity {
  if (!isObject(value)) return false;
  if (value.type !== "unit") return false;
  if (!isNumber(value.totalUnits)) return false;
  if (!isNumber(value.occupancyPerUnit)) return false;
  return true;
}

/**
 * Validate any CapacityModel (discriminated union)
 */
export function isCapacityModel(value: unknown): value is CapacityModel {
  if (!isObject(value)) return false;

  switch ((value as Record<string, unknown>).type) {
    case "shared":
      return isSharedCapacity(value);
    case "unit":
      return isUnitCapacity(value);
    default:
      return false;
  }
}

/**
 * Assert a value is a valid CapacityModel
 */
export function assertCapacityModel(
  value: unknown,
  context?: string
): asserts value is CapacityModel {
  if (!isCapacityModel(value)) {
    throw new TypeError(
      `Invalid capacity model${context ? ` in ${context}` : ""}: expected { type: "shared" | "unit", ... }`
    );
  }
}

// =============================================================================
// BOOKING OPTION SNAPSHOT TYPE GUARDS
// =============================================================================

/**
 * Validate BookingOptionSnapshot (stored on bookings)
 */
export function isBookingOptionSnapshot(value: unknown): value is BookingOptionSnapshot {
  if (!isObject(value)) return false;
  if (!isString(value.optionId)) return false;
  if (!isString(value.optionName)) return false;
  if (!isPricingModel(value.pricingModel)) return false;
  if (!isString(value.experienceMode)) return false;
  if (!isString(value.priceBreakdown)) return false;
  return true;
}

/**
 * Assert a value is a valid BookingOptionSnapshot
 */
export function assertBookingOptionSnapshot(
  value: unknown,
  context?: string
): asserts value is BookingOptionSnapshot {
  if (!isObject(value)) {
    throw new TypeError(
      `Invalid booking option snapshot${context ? ` in ${context}` : ""}: expected object`
    );
  }

  if (!isString((value as Record<string, unknown>).optionId)) {
    throw new TypeError(
      `Invalid booking option snapshot${context ? ` in ${context}` : ""}: missing optionId`
    );
  }

  if (!isBookingOptionSnapshot(value)) {
    throw new TypeError(
      `Invalid booking option snapshot structure${context ? ` in ${context}` : ""}. ` +
        "Expected { optionId, optionName, pricingModel, experienceMode, priceBreakdown }"
    );
  }
}

// =============================================================================
// PRICING SNAPSHOT TYPE GUARDS (for booking.pricingSnapshot)
// =============================================================================

/**
 * Shape of the pricingSnapshot field on bookings
 */
export interface PricingSnapshotShape {
  optionId?: string;
  optionName?: string;
  pricingModel?: PricingModel;
  experienceMode?: string;
  priceBreakdown?: string;
}

/**
 * Validate pricingSnapshot field from booking
 */
export function isPricingSnapshot(value: unknown): value is PricingSnapshotShape {
  if (!isObject(value)) return false;

  // All fields are optional
  if (value.optionId !== undefined && !isString(value.optionId)) return false;
  if (value.optionName !== undefined && !isString(value.optionName)) return false;
  if (value.pricingModel !== undefined && !isPricingModel(value.pricingModel)) return false;
  if (value.experienceMode !== undefined && !isString(value.experienceMode)) return false;
  if (value.priceBreakdown !== undefined && !isString(value.priceBreakdown)) return false;

  return true;
}

/**
 * Safely extract pricing model from a booking's pricingSnapshot
 * Returns undefined if not valid, or the validated model
 */
export function extractPricingModel(
  pricingSnapshot: unknown
): PricingModel | undefined {
  if (!isObject(pricingSnapshot)) return undefined;
  const model = (pricingSnapshot as Record<string, unknown>).pricingModel;
  return isPricingModel(model) ? model : undefined;
}

/**
 * Get pricing type from pricing model (safe accessor)
 */
export function getPricingType(
  pricingModel: unknown
): "per_person" | "per_unit" | "flat_rate" | "tiered_group" | "base_plus_person" | undefined {
  if (!isPricingModel(pricingModel)) return undefined;
  return pricingModel.type;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate base price from any pricing model
 * Returns price in minor units (cents)
 */
export function getBasePriceFromModel(model: PricingModel): number {
  switch (model.type) {
    case "per_person": {
      const defaultTier = model.tiers.find((t) => t.isDefault) ?? model.tiers[0];
      return defaultTier?.price.amount ?? 0;
    }
    case "per_unit":
      return model.pricePerUnit.amount;
    case "flat_rate":
      return model.price.amount;
    case "tiered_group": {
      const firstTier = model.tiers[0];
      return firstTier?.price.amount ?? 0;
    }
    case "base_plus_person":
      return model.basePrice.amount;
  }
}

/**
 * Get currency from any pricing model
 */
export function getCurrencyFromModel(model: PricingModel): string {
  switch (model.type) {
    case "per_person": {
      const defaultTier = model.tiers.find((t) => t.isDefault) ?? model.tiers[0];
      return defaultTier?.price.currency ?? "USD";
    }
    case "per_unit":
      return model.pricePerUnit.currency;
    case "flat_rate":
      return model.price.currency;
    case "tiered_group": {
      const firstTier = model.tiers[0];
      return firstTier?.price.currency ?? "USD";
    }
    case "base_plus_person":
      return model.basePrice.currency;
  }
}
