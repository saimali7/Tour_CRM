import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

export const depositRouter = createRouter({
  // ==========================================
  // Deposit Calculations
  // ==========================================

  calculateDeposit: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        bookingTotal: z.number(),
        scheduleDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.calculateDeposit(
        input.tourId,
        input.bookingTotal,
        input.scheduleDate
      );
    }),

  // ==========================================
  // Payment Recording
  // ==========================================

  recordDepositPayment: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        amount: z.number(),
        stripePaymentIntentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.recordDepositPayment(
        input.bookingId,
        input.amount,
        input.stripePaymentIntentId
      );
    }),

  recordBalancePayment: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        amount: z.number(),
        stripePaymentIntentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.recordBalancePayment(
        input.bookingId,
        input.amount,
        input.stripePaymentIntentId
      );
    }),

  // ==========================================
  // Balance Due Tracking
  // ==========================================

  getBookingsWithBalanceDue: protectedProcedure
    .input(
      z.object({
        dueBefore: z.date().optional(),
        dueAfter: z.date().optional(),
        includeOverdue: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.getBookingsWithBalanceDue(input);
    }),

  getOverdueBalances: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.deposit.getOverdueBalances();
  }),

  getBalancesDueSoon: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.getBalancesDueSoon(input?.days);
    }),

  // ==========================================
  // Statistics
  // ==========================================

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.deposit.getDepositStats();
  }),

  // ==========================================
  // Payment Breakdown
  // ==========================================

  getPaymentBreakdown: protectedProcedure
    .input(
      z.object({
        total: z.string(),
        depositRequired: z.string().nullable(),
        depositPaid: z.string().nullable(),
        paidAmount: z.string().nullable(),
        balanceDueDate: z.date().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.deposit.getPaymentBreakdown(input);
    }),
});
