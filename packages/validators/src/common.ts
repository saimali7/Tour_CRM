import { z } from "zod";

// Common validation schemas used across the application

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number (use E.164 format)");

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens");

export const urlSchema = z.string().url("Invalid URL");

// Note: For currency validation, use currencyCodeSchema from ./currency which validates against actual supported currencies

export const timezoneSchema = z.string().min(1, "Timezone is required");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idSchema = z.string().min(1, "ID is required");

/**
 * Price string validation schema.
 *
 * Validates a string representing a decimal price with up to 2 decimal places.
 * Examples: "99", "99.9", "99.99", "0.50", "1234.56"
 *
 * @example
 * ```typescript
 * import { priceStringSchema } from "@tour/validators";
 *
 * const schema = z.object({
 *   total: priceStringSchema,
 *   discount: priceStringSchema.optional(),
 * });
 * ```
 */
export const priceStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal (e.g., 99.99)");

/**
 * Price regex pattern for use in custom schemas.
 * Matches: "99", "99.9", "99.99", "0.50", "1234.56"
 */
export const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

export const dateRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
}).refine(
  (data) => data.end >= data.start,
  { message: "End date must be after start date" }
);

// Type exports
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
