import { z } from "zod";
import { slugSchema } from "./common";

// Service type enum
export const serviceTypeSchema = z.enum([
  "transfer",
  "addon",
  "rental",
  "package",
  "custom",
]);
export type ServiceType = z.infer<typeof serviceTypeSchema>;

// Service pricing model enum
export const servicePricingModelSchema = z.enum([
  "flat",
  "per_person",
  "per_hour",
  "per_day",
  "per_vehicle",
  "custom",
]);
export type ServicePricingModel = z.infer<typeof servicePricingModelSchema>;

// Availability type enum
export const availabilityTypeSchema = z.enum(["always", "scheduled", "on_request"]);
export type AvailabilityType = z.infer<typeof availabilityTypeSchema>;

// Service pricing tier schema
export const servicePricingTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  price: z.number().min(0, "Price must be non-negative"),
});
export type ServicePricingTier = z.infer<typeof servicePricingTierSchema>;

// Transfer config schema
export const transferConfigSchema = z.object({
  pickupRequired: z.boolean(),
  dropoffRequired: z.boolean(),
  locations: z
    .array(
      z.object({
        type: z.enum(["airport", "hotel", "address"]),
        name: z.string().min(1, "Location name is required"),
        address: z.string().optional(),
      })
    )
    .default([]),
});
export type TransferConfig = z.infer<typeof transferConfigSchema>;

// Rental config schema
export const rentalConfigSchema = z.object({
  minDuration: z.number().positive("Minimum duration must be positive"),
  maxDuration: z.number().positive("Maximum duration must be positive"),
  unit: z.enum(["hour", "day"]),
});
export type RentalConfig = z.infer<typeof rentalConfigSchema>;

// Base service schema
const baseServiceSchema = z.object({
  // Product fields
  name: z
    .string()
    .min(1, "Service name is required")
    .max(255, "Service name must be less than 255 characters"),
  slug: slugSchema.optional(),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  shortDescription: z
    .string()
    .max(500, "Short description must be less than 500 characters")
    .optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  featuredImage: z.string().url("Invalid image URL").optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),

  // Service-specific fields
  serviceType: serviceTypeSchema,
  pricingModel: servicePricingModelSchema,
  pricingTiers: z.array(servicePricingTierSchema).optional(),
  availabilityType: availabilityTypeSchema.default("always"),
  isStandalone: z.boolean().default(true),
  isAddon: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  duration: z
    .number()
    .int("Duration must be a whole number")
    .positive("Duration must be positive")
    .optional(),

  // Type-specific configs
  transferConfig: transferConfigSchema.optional(),
  rentalConfig: rentalConfigSchema.optional(),

  // Applicability
  applicableToProducts: z.array(z.string()).default([]),
  applicableToTypes: z.array(z.string()).default([]),

  // Capacity
  maxQuantity: z
    .number()
    .int("Maximum quantity must be a whole number")
    .positive("Maximum quantity must be positive")
    .optional(),
  maxPerBooking: z
    .number()
    .int("Maximum per booking must be a whole number")
    .positive("Maximum per booking must be positive")
    .default(10),
});

// Create service schema with refinement for rental config
export const createServiceSchema = baseServiceSchema.refine(
  (data) => {
    if (data.rentalConfig) {
      return data.rentalConfig.maxDuration >= data.rentalConfig.minDuration;
    }
    return true;
  },
  {
    message: "Maximum duration must be greater than or equal to minimum duration",
    path: ["rentalConfig", "maxDuration"],
  }
);

// Update service schema (partial)
export const updateServiceSchema = baseServiceSchema.partial();

// Type exports
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
