import { z } from "zod";
import { slugSchema } from "./common";

// Product type enum
export const productTypeSchema = z.enum(["tour", "service", "good"]);
export type ProductType = z.infer<typeof productTypeSchema>;

// Product status enum
export const productStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

// Product visibility enum
export const productVisibilitySchema = z.enum(["public", "private", "unlisted"]);
export type ProductVisibility = z.infer<typeof productVisibilitySchema>;

// Create product schema
export const createProductSchema = z.object({
  type: productTypeSchema,
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name must be less than 255 characters"),
  slug: slugSchema.optional(),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  shortDescription: z
    .string()
    .max(500, "Short description must be less than 500 characters")
    .optional(),
  status: productStatusSchema.default("draft"),
  visibility: productVisibilitySchema.default("public"),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  pricingDisplay: z
    .string()
    .max(50, "Pricing display must be less than 50 characters")
    .optional(),
  featuredImage: z.string().url("Invalid image URL").optional().or(z.literal("")),
  gallery: z.array(z.string().url("Invalid image URL")).default([]),
  metaTitle: z
    .string()
    .max(255, "Meta title must be less than 255 characters")
    .optional(),
  metaDescription: z
    .string()
    .max(500, "Meta description must be less than 500 characters")
    .optional(),
  tags: z.array(z.string()).default([]),
  sortOrder: z
    .number()
    .int("Sort order must be a whole number")
    .default(0),
});

// Update product schema (partial)
export const updateProductSchema = createProductSchema.partial();

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
