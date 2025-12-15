import { z } from "zod";
import { emailSchema } from "./common";

// Customer source enum
export const customerSourceSchema = z.enum(["manual", "website", "api", "import", "referral"]);
export type CustomerSource = z.infer<typeof customerSourceSchema>;

// Contact preference enum
export const contactPreferenceSchema = z.enum(["email", "phone", "both"]);
export type ContactPreference = z.infer<typeof contactPreferenceSchema>;

// Base customer schema
const baseCustomerSchema = z.object({
  email: emailSchema.optional(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  phone: z.string().max(20).optional(),
  contactPreference: contactPreferenceSchema.default("email"),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  language: z.string().length(2, "Language code must be 2 characters").optional(),
  currency: z.string().length(3, "Currency code must be 3 characters").optional(),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
  tags: z.array(z.string().max(50)).optional(),
  source: customerSourceSchema.default("manual"),
  sourceDetails: z.string().max(200).optional(),
});

// Create customer validation with email OR phone requirement
export const createCustomerSchema = baseCustomerSchema.refine(
  (data) => data.email || data.phone,
  {
    message: "Customer must have either email or phone number",
    path: ["email"],
  }
);

// Update customer validation (partial with same refinement)
export const updateCustomerSchema = baseCustomerSchema
  .partial()
  .refine((data) => !("email" in data && "phone" in data) || data.email || data.phone, {
    message: "Customer must have either email or phone number",
    path: ["email"],
  });

// Customer search/filter validation
export const customerFilterSchema = z.object({
  search: z.string().optional(),
  source: customerSourceSchema.optional(),
  tags: z.array(z.string()).optional(),
  hasBookings: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerFilter = z.infer<typeof customerFilterSchema>;
