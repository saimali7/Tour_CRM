import { z } from "zod";

// Booking status enums
export const bookingStatusSchema = z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]);
export const paymentStatusSchema = z.enum(["pending", "partial", "paid", "refunded", "failed"]);
export const bookingSourceSchema = z.enum(["manual", "website", "api", "phone", "walk_in"]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type BookingSource = z.infer<typeof bookingSourceSchema>;

// Participant validation
export const participantSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  type: z.enum(["adult", "child", "infant"]),
  dietaryRequirements: z.string().max(500).optional(),
  accessibilityNeeds: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

// Create booking validation
export const createBookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  scheduleId: z.string().min(1, "Schedule is required"),
  adultCount: z
    .number()
    .int("Adult count must be a whole number")
    .min(1, "At least 1 adult is required"),
  childCount: z.number().int().min(0).default(0),
  infantCount: z.number().int().min(0).default(0),
  specialRequests: z.string().max(1000).optional(),
  dietaryRequirements: z.string().max(1000).optional(),
  accessibilityNeeds: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  source: bookingSourceSchema.default("manual"),
  sourceDetails: z.string().max(200).optional(),
  participants: z.array(participantSchema).optional(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
});

// Update booking validation
export const updateBookingSchema = z.object({
  adultCount: z.number().int().min(1).optional(),
  childCount: z.number().int().min(0).optional(),
  infantCount: z.number().int().min(0).optional(),
  specialRequests: z.string().max(1000).optional(),
  dietaryRequirements: z.string().max(1000).optional(),
  accessibilityNeeds: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
});

// Payment status update validation
export const updatePaymentStatusSchema = z.object({
  paymentStatus: paymentStatusSchema,
  paidAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  stripePaymentIntentId: z.string().optional(),
});

export type Participant = z.infer<typeof participantSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
