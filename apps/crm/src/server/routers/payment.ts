import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure, sensitiveProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { priceStringSchema } from "@tour/validators";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const paymentMethodSchema = z.enum(["cash", "card", "bank_transfer", "check", "other"]);

const paymentFilterSchema = z.object({
  bookingId: z.string().optional(),
  method: paymentMethodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

const sortSchema = z.object({
  field: z.enum(["recordedAt", "amount"]).default("recordedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const createPaymentSchema = z.object({
  bookingId: z.string(),
  amount: priceStringSchema, // Uses shared price validation from @tour/validators
  currency: z.string().optional(),
  method: paymentMethodSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentRouter = createRouter({
  /**
   * List all payments with filters and pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        filters: paymentFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.payment.getAll(input.filters, input.pagination, input.sort);
    }),

  /**
   * Get a single payment by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.payment.getById(input.id);
    }),

  /**
   * List all payments for a booking
   */
  listByBooking: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.payment.listByBooking(input.bookingId);
    }),

  /**
   * Get booking balance (total - payments)
   */
  getBookingBalance: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.payment.getBookingBalance(input.bookingId);
    }),

  /**
   * Get payment statistics
   */
  getStats: protectedProcedure
    .input(z.object({ dateRange: dateRangeSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.payment.getStats(input || {});
    }),

  /**
   * Create a new payment (admin only, rate limited)
   */
  create: sensitiveProcedure
    .input(createPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const userId = ctx.user?.id || "system";
      const userName = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "System";

      // Create payment
      const payment = await services.payment.create({
        ...input,
        recordedBy: userId,
        recordedByName: userName,
      });

      // Get booking for activity log
      const booking = await services.booking.getById(input.bookingId);
      const balanceInfo = await services.payment.getBookingBalance(input.bookingId);

      // Log activity
      await services.activityLog.logBookingAction(
        "booking.payment_recorded",
        input.bookingId,
        booking.referenceNumber,
        `Payment of $${input.amount} recorded via ${input.method.replace("_", " ")}. Remaining balance: $${balanceInfo.balance}`,
        {
          actorType: "user",
          actorId: userId,
          actorName: userName,
          metadata: {
            paymentId: payment.id,
            amount: input.amount,
            method: input.method,
            reference: input.reference,
            remainingBalance: balanceInfo.balance,
          },
        }
      );

      return payment;
    }),

  /**
   * Delete a payment (admin only, rate limited)
   */
  delete: sensitiveProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const userId = ctx.user?.id || "system";
      const userName = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "System";

      // Get payment before deleting
      const payment = await services.payment.getById(input.id);
      const booking = await services.booking.getById(payment.bookingId);

      // Delete payment
      await services.payment.delete(input.id);

      // Get updated balance
      const balanceInfo = await services.payment.getBookingBalance(payment.bookingId);

      // Log activity
      await services.activityLog.logBookingAction(
        "booking.payment_deleted",
        payment.bookingId,
        booking.referenceNumber,
        `Payment of $${payment.amount} deleted. New remaining balance: $${balanceInfo.balance}`,
        {
          actorType: "user",
          actorId: userId,
          actorName: userName,
          metadata: {
            paymentId: payment.id,
            amount: payment.amount,
            method: payment.method,
            newBalance: balanceInfo.balance,
          },
        }
      );

      return { success: true };
    }),
});
