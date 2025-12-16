import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const voucherTypeSchema = z.enum(["monetary", "tour", "percentage"]);
const voucherStatusSchema = z.enum(["active", "redeemed", "expired", "cancelled", "partially_redeemed"]);
const deliveryMethodSchema = z.enum(["email", "print", "sms"]);

export const voucherRouter = createRouter({
  // ==========================================
  // Voucher CRUD
  // ==========================================

  list: protectedProcedure
    .input(
      z.object({
        filters: z.object({
          status: voucherStatusSchema.optional(),
          type: voucherTypeSchema.optional(),
          search: z.string().optional(),
          recipientEmail: z.string().optional(),
          purchaserEmail: z.string().optional(),
          expiringWithinDays: z.number().optional(),
        }).optional(),
        sortField: z.enum(["createdAt", "expiresAt", "monetaryValue"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.getVouchers(
        input?.filters,
        input?.sortField,
        input?.sortDirection,
        input?.limit,
        input?.offset
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.getVoucherById(input.id);
    }),

  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.getVoucherByCode(input.code);
    }),

  create: adminProcedure
    .input(
      z.object({
        code: z.string().optional(),
        type: voucherTypeSchema,
        monetaryValue: z.string().optional(),
        percentageValue: z.number().optional(),
        tourId: z.string().optional(),
        purchaserName: z.string().optional(),
        purchaserEmail: z.string().email().optional(),
        purchaserPhone: z.string().optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        personalMessage: z.string().optional(),
        deliveryMethod: deliveryMethodSchema.optional(),
        purchaseAmount: z.string().optional(),
        stripePaymentIntentId: z.string().optional(),
        validFrom: z.date().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.createVoucher(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          recipientName: z.string().optional(),
          recipientEmail: z.string().email().optional(),
          personalMessage: z.string().optional(),
          deliveryMethod: deliveryMethodSchema.optional(),
          expiresAt: z.date().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.updateVoucher(input.id, input.data);
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.cancelVoucher(input.id);
    }),

  // ==========================================
  // Validation & Redemption
  // ==========================================

  validate: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.validateVoucher(input.code);
    }),

  redeem: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        bookingId: z.string(),
        amountToRedeem: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.redeemVoucher(
        input.code,
        input.bookingId,
        input.amountToRedeem
      );
    }),

  // ==========================================
  // Redemption History
  // ==========================================

  getRedemptionHistory: protectedProcedure
    .input(z.object({ voucherId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.getRedemptionHistory(input.voucherId);
    }),

  getBookingVouchers: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.getBookingVouchers(input.bookingId);
    }),

  // ==========================================
  // Delivery
  // ==========================================

  markDelivered: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.voucher.markDelivered(input.id);
    }),

  getUndelivered: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.voucher.getUndeliveredVouchers();
  }),

  // ==========================================
  // Analytics
  // ==========================================

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.voucher.getVoucherStats();
  }),

  // ==========================================
  // Code Generation
  // ==========================================

  generateCode: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.voucher.generateUniqueCode();
  }),
});
