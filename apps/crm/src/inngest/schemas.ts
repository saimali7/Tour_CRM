/**
 * Zod schemas for Inngest event data validation
 *
 * These schemas ensure that event data is properly validated before processing,
 * preventing silent failures from malformed event data.
 */

import { z } from "zod";

// Base schemas
const baseEventSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  bookingId: z.string().min(1, "bookingId is required"),
});

const customerInfoSchema = z.object({
  customerId: z.string().min(1),
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().min(1, "customerName is required"),
});

// Booking event schemas
export const bookingCreatedSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  tourTime: z.string().min(1),
  participants: z.number().int().positive(),
  totalAmount: z.string().min(1),
  currency: z.string().default("USD"),
  meetingPoint: z.string().optional(),
  meetingPointDetails: z.string().optional(),
});

export const bookingConfirmedSchema = bookingCreatedSchema;

export const bookingCancelledSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  tourTime: z.string().min(1),
  refundAmount: z.string().optional(),
  currency: z.string().default("USD"),
  cancellationReason: z.string().optional(),
});

export const bookingRescheduledSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  oldTourDate: z.string().min(1),
  oldTourTime: z.string().min(1),
  newTourDate: z.string().min(1),
  newTourTime: z.string().min(1),
  participants: z.number().int().positive(),
  meetingPoint: z.string().optional(),
  meetingPointDetails: z.string().optional(),
});

export const bookingReminderSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  tourTime: z.string().min(1),
  participants: z.number().int().positive(),
  meetingPoint: z.string().optional(),
  meetingPointDetails: z.string().optional(),
  hoursUntilTour: z.number().int(),
});

// Refund event schema
export const refundProcessedSchema = baseEventSchema.merge(customerInfoSchema).extend({
  refundId: z.string().min(1),
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  refundAmount: z.string().min(1),
  currency: z.string().default("USD"),
  reason: z.string().optional(),
});

// Payment event schemas
export const paymentSucceededSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().default("USD"),
  stripeReceiptUrl: z.string().url().optional(),
});

export const paymentFailedSchema = baseEventSchema.extend({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  bookingReference: z.string().min(1),
  errorMessage: z.string().min(1),
});

// Guide notification schemas
export const guideAssignmentSchema = z.object({
  organizationId: z.string().min(1),
  assignmentId: z.string().min(1),
  guideId: z.string().min(1),
  guideEmail: z.string().email(),
  guideName: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  tourTime: z.string().min(1),
  scheduleId: z.string().min(1),
});

// Cart recovery schemas
export const cartAbandonedSchema = z.object({
  organizationId: z.string().min(1),
  cartId: z.string().min(1),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  tourName: z.string().min(1),
  tourDate: z.string().optional(),
  cartValue: z.string().min(1),
  currency: z.string().min(1).default("USD"),
  recoveryUrl: z.string().url().optional(),
});

// Review request schemas
export const reviewRequestSchema = baseEventSchema.merge(customerInfoSchema).extend({
  bookingReference: z.string().min(1),
  tourName: z.string().min(1),
  tourDate: z.string().min(1),
  reviewUrl: z.string().url().optional(),
});

// Type exports for use in functions
export type BookingCreatedData = z.infer<typeof bookingCreatedSchema>;
export type BookingConfirmedData = z.infer<typeof bookingConfirmedSchema>;
export type BookingCancelledData = z.infer<typeof bookingCancelledSchema>;
export type BookingRescheduledData = z.infer<typeof bookingRescheduledSchema>;
export type BookingReminderData = z.infer<typeof bookingReminderSchema>;
export type RefundProcessedData = z.infer<typeof refundProcessedSchema>;
export type PaymentSucceededData = z.infer<typeof paymentSucceededSchema>;
export type PaymentFailedData = z.infer<typeof paymentFailedSchema>;
export type GuideAssignmentData = z.infer<typeof guideAssignmentSchema>;
export type CartAbandonedData = z.infer<typeof cartAbandonedSchema>;
export type ReviewRequestData = z.infer<typeof reviewRequestSchema>;

/**
 * Validate event data and throw with descriptive error if invalid
 */
export function validateEventData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  eventName: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");

    throw new Error(`Invalid ${eventName} event data: ${errors}`);
  }

  return result.data;
}
