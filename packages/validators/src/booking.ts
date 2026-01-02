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

// Pricing snapshot for booking (preserves pricing at time of booking)
export const pricingSnapshotSchema = z.object({
  optionId: z.string().optional(),
  optionName: z.string().optional(),
  pricingModel: z.any().optional(),
  experienceMode: z.enum(["join", "book", "charter"]).optional(),
  priceBreakdown: z.string().optional(),
}).optional();

// Create booking validation
export const createBookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),

  // Legacy scheduleId - fully optional, no validation
  scheduleId: z.string().optional(),

  // Availability-based booking (tourId + bookingDate + bookingTime)
  tourId: z.string().min(1, "Tour is required"),
  bookingDate: z.string().min(1, "Booking date is required"), // ISO date string YYYY-MM-DD
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),

  bookingOptionId: z.string().optional(), // Link to booking option

  // Primary guest counts
  guestAdults: z.number().int().min(1).max(100).default(1),
  guestChildren: z.number().int().min(0).max(100).default(0),
  guestInfants: z.number().int().min(0).max(100).default(0),

  pricingSnapshot: pricingSnapshotSchema, // Preserve pricing at booking time

  // Legacy guest counts (backward compat)
  adultCount: z.number().int().min(1).max(100).optional(),
  childCount: z.number().int().min(0).max(100).optional(),
  infantCount: z.number().int().min(0).max(100).optional(),

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
