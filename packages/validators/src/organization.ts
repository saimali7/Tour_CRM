import { z } from "zod";
import { emailSchema, phoneSchema, slugSchema, urlSchema, timezoneSchema } from "./common";

export const organizationStatusSchema = z.enum(["active", "suspended", "deleted"]);
export const organizationPlanSchema = z.enum(["free", "starter", "pro", "enterprise"]);

export const organizationSettingsSchema = z.object({
  defaultCurrency: z.string().optional(),
  defaultLanguage: z.string().optional(),
  requirePhoneNumber: z.boolean().optional(),
  requireAddress: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
}).optional();

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: slugSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  website: urlSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  timezone: timezoneSchema.default("UTC"),
  logoUrl: urlSchema.optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
  settings: organizationSettingsSchema,
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// Type exports
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export type OrganizationPlan = z.infer<typeof organizationPlanSchema>;
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
