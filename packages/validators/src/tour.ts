import { z } from "zod";
import { slugSchema } from "./common";

// Tour status enum
export const tourStatusSchema = z.enum(["draft", "active", "paused", "archived"]);
export type TourStatus = z.infer<typeof tourStatusSchema>;

// Base tour schema (without refinements)
const baseTourSchema = z.object({
  name: z
    .string()
    .min(1, "Tour name is required")
    .max(100, "Tour name must be less than 100 characters"),
  slug: slugSchema,
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  shortDescription: z.string().max(500, "Short description must be less than 500 characters").optional(),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number")
    .min(15, "Tour must be at least 15 minutes")
    .max(1440, "Tour cannot be longer than 24 hours"),
  minParticipants: z
    .number()
    .int("Minimum participants must be a whole number")
    .min(1, "Must have at least 1 participant minimum")
    .default(1),
  maxParticipants: z
    .number()
    .int("Maximum participants must be a whole number")
    .min(1, "Must allow at least 1 participant"),
  guestsPerGuide: z
    .number()
    .int("Guests per guide must be a whole number")
    .min(1, "Must have at least 1 guest per guide")
    .default(6),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  currency: z.string().length(3, "Currency must be 3 characters").default("AED"),
  status: tourStatusSchema.default("draft"),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  meetingPoint: z.string().max(200, "Meeting point must be less than 200 characters").optional(),
  meetingPointDetails: z.string().max(500, "Meeting point details must be less than 500 characters").optional(),
  cancellationPolicy: z.string().max(2000, "Cancellation policy must be less than 2000 characters").optional(),
  cancellationHours: z.number().int().min(0).optional(),
  // Booking window settings
  minimumNoticeHours: z.number().int().min(0).max(720).default(2),
  maximumAdvanceDays: z.number().int().min(1).max(365).default(90),
  allowSameDayBooking: z.boolean().default(true),
  sameDayCutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (use HH:MM)").optional(),
});

// Create tour validation with refinement
export const createTourSchema = baseTourSchema.refine(
  (data) => data.maxParticipants >= data.minParticipants,
  {
    message: "Maximum participants must be greater than or equal to minimum participants",
    path: ["maxParticipants"],
  }
);

// Update tour validation (partial, no refinement since fields are optional)
export const updateTourSchema = baseTourSchema.partial();

export type CreateTourInput = z.infer<typeof createTourSchema>;
export type UpdateTourInput = z.infer<typeof updateTourSchema>;
