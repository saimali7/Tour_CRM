import { z } from "zod";

// ============================================================
// Money Schema
// ============================================================

export const moneySchema = z.object({
  amount: z.number().int().min(0), // In minor units (cents)
  currency: z.string().length(3),   // ISO 4217
});

export type Money = z.infer<typeof moneySchema>;

// ============================================================
// Guest Breakdown Schema
// ============================================================

export const guestBreakdownSchema = z.object({
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
});

export type GuestBreakdown = z.infer<typeof guestBreakdownSchema>;

// ============================================================
// Pricing Model Schemas
// ============================================================

export const pricingTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: moneySchema,
  ageMin: z.number().int().optional(),
  ageMax: z.number().int().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const groupTierSchema = z.object({
  minSize: z.number().int().min(1),
  maxSize: z.number().int().min(1),
  price: moneySchema,
});

export const perPersonPricingSchema = z.object({
  type: z.literal("per_person"),
  tiers: z.array(pricingTierSchema).min(1),
});

export const perUnitPricingSchema = z.object({
  type: z.literal("per_unit"),
  unitName: z.string(),
  unitNamePlural: z.string(),
  pricePerUnit: moneySchema,
  maxOccupancy: z.number().int().min(1),
  minOccupancy: z.number().int().min(1).optional(),
  baseOccupancy: z.number().int().min(1).optional(),
  extraPersonFee: moneySchema.optional(),
});

export const flatRatePricingSchema = z.object({
  type: z.literal("flat_rate"),
  price: moneySchema,
  maxParticipants: z.number().int().min(1),
  minParticipants: z.number().int().min(1).optional(),
});

export const tieredGroupPricingSchema = z.object({
  type: z.literal("tiered_group"),
  tiers: z.array(groupTierSchema).min(1),
});

export const basePerPersonPricingSchema = z.object({
  type: z.literal("base_plus_person"),
  basePrice: moneySchema,
  includedParticipants: z.number().int().min(1),
  perPersonPrice: moneySchema,
  maxParticipants: z.number().int().min(1),
});

export const pricingModelSchema = z.discriminatedUnion("type", [
  perPersonPricingSchema,
  perUnitPricingSchema,
  flatRatePricingSchema,
  tieredGroupPricingSchema,
  basePerPersonPricingSchema,
]);

export type PricingModel = z.infer<typeof pricingModelSchema>;

// ============================================================
// Capacity Model Schemas
// ============================================================

export const sharedCapacitySchema = z.object({
  type: z.literal("shared"),
  totalSeats: z.number().int().min(1),
});

export const unitCapacitySchema = z.object({
  type: z.literal("unit"),
  totalUnits: z.number().int().min(1),
  occupancyPerUnit: z.number().int().min(1),
});

export const capacityModelSchema = z.discriminatedUnion("type", [
  sharedCapacitySchema,
  unitCapacitySchema,
]);

export type CapacityModel = z.infer<typeof capacityModelSchema>;

// ============================================================
// Booking Option Schemas
// ============================================================

export const schedulingTypeSchema = z.enum(["fixed", "flexible"]);
export const bookingOptionStatusSchema = z.enum(["active", "inactive"]);
export const experienceModeSchema = z.enum(["join", "book", "charter"]);

export const createBookingOptionSchema = z.object({
  tourId: z.string(),
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(200).optional(),
  fullDescription: z.string().max(2000).optional(),
  badge: z.string().max(50).optional(),
  highlightText: z.string().max(200).optional(),
  pricingModel: pricingModelSchema,
  capacityModel: capacityModelSchema,
  schedulingType: schedulingTypeSchema.default("fixed"),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  status: bookingOptionStatusSchema.default("active"),
});

export type CreateBookingOptionInput = z.infer<typeof createBookingOptionSchema>;

export const updateBookingOptionSchema = createBookingOptionSchema.partial().omit({
  tourId: true,
});

export type UpdateBookingOptionInput = z.infer<typeof updateBookingOptionSchema>;

// ============================================================
// Availability Check Schemas
// ============================================================

export const checkAvailabilityInputSchema = z.object({
  tourId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date YYYY-MM-DD
  guests: guestBreakdownSchema,
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilityInputSchema>;

export const badgeTypeSchema = z.enum([
  "BEST_VALUE",
  "RECOMMENDED",
  "BEST_FOR_FAMILIES",
  "LUXURY",
  "SAVE_MONEY",
  "PERFECT_FIT",
]);

export type BadgeType = z.infer<typeof badgeTypeSchema>;

// ============================================================
// Add-On Pricing Schemas
// ============================================================

export const addOnFixedPricingSchema = z.object({
  type: z.literal("fixed"),
  price: moneySchema,
});

export const addOnPerPersonPricingSchema = z.object({
  type: z.literal("per_person"),
  pricePerPerson: moneySchema,
});

export const addOnPerAdultPricingSchema = z.object({
  type: z.literal("per_adult"),
  pricePerAdult: moneySchema,
});

export const addOnPerParticipantPricingSchema = z.object({
  type: z.literal("per_participant"),
  tiers: z.array(z.object({
    name: z.string(),
    price: moneySchema,
    ageMin: z.number().int().optional(),
    ageMax: z.number().int().optional(),
  })).min(1),
});

export const addOnPerBookingPricingSchema = z.object({
  type: z.literal("per_booking"),
  price: moneySchema,
});

export const addOnPerUnitPricingSchema = z.object({
  type: z.literal("per_unit"),
  pricePerUnit: moneySchema,
});

export const addOnPricingStructureSchema = z.discriminatedUnion("type", [
  addOnFixedPricingSchema,
  addOnPerPersonPricingSchema,
  addOnPerAdultPricingSchema,
  addOnPerParticipantPricingSchema,
  addOnPerBookingPricingSchema,
  addOnPerUnitPricingSchema,
]);

export type AddOnPricingStructure = z.infer<typeof addOnPricingStructureSchema>;

// ============================================================
// Waitlist Schemas
// ============================================================

export const waitlistStatusSchema = z.enum(["waiting", "notified", "converted", "expired"]);

export const joinWaitlistInputSchema = z.object({
  scheduleId: z.string(),
  bookingOptionId: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  guests: guestBreakdownSchema,
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistInputSchema>;

// ============================================================
// Calculated Option Schema (API Response)
// ============================================================

export const timeSlotSchema = z.object({
  time: z.string(), // "10:00 AM"
  scheduleId: z.string(),
  available: z.boolean(),
  spotsLeft: z.number().int().optional(),
  almostFull: z.boolean().default(false),
});

export const fixedSchedulingInfoSchema = z.object({
  type: z.literal("fixed"),
  timeSlots: z.array(timeSlotSchema),
});

export const flexibleSchedulingInfoSchema = z.object({
  type: z.literal("flexible"),
  earliestDeparture: z.string(),
  latestDeparture: z.string(),
  suggestedTime: z.string().optional(),
});

export const schedulingInfoSchema = z.discriminatedUnion("type", [
  fixedSchedulingInfoSchema,
  flexibleSchedulingInfoSchema,
]);

export type SchedulingInfo = z.infer<typeof schedulingInfoSchema>;

export const capacityFitSchema = z.object({
  fits: z.boolean(),
  unitsNeeded: z.number().int().optional(),
  fitsInOneUnit: z.boolean().optional(),
  statement: z.string().optional(),
});

export const comparisonSchema = z.object({
  vsShared: z.object({
    difference: moneySchema,
    percentMore: z.number(),
    statement: z.string(),
  }).optional(),
});

export const calculatedOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortDescription: z.string().optional(),
  experienceMode: experienceModeSchema,

  // Pre-calculated price for this group
  totalPrice: moneySchema,
  priceBreakdown: z.string(),

  // Comparison and recommendations
  comparison: comparisonSchema.optional(),
  badge: badgeTypeSchema.optional(),
  recommendation: z.string().optional(),

  // Scheduling
  scheduling: schedulingInfoSchema,

  // Capacity fit
  capacityFit: capacityFitSchema,

  // Availability
  available: z.boolean(),
  urgency: z.string().optional(),
});

export type CalculatedOption = z.infer<typeof calculatedOptionSchema>;

export const checkAvailabilityResponseSchema = z.object({
  tour: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().optional(),
  }),
  date: z.string(),
  guests: z.object({
    adults: z.number().int(),
    children: z.number().int(),
    infants: z.number().int(),
    total: z.number().int(),
  }),
  options: z.array(calculatedOptionSchema),
  soldOut: z.boolean(),
  alternatives: z.object({
    nearbyDates: z.array(z.object({
      date: z.string(),
      availability: z.enum(["available", "limited"]),
    })).optional(),
    waitlistAvailable: z.boolean().optional(),
  }).optional(),
});

export type CheckAvailabilityResponse = z.infer<typeof checkAvailabilityResponseSchema>;
