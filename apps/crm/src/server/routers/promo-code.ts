import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["code", "createdAt", "validFrom", "validUntil"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const discountTypeSchema = z.enum(["percentage", "fixed"]);

const promoCodeFilterSchema = z.object({
  status: z.enum(["active", "inactive", "expired", "all"]).optional(),
  tourId: z.string().optional(),
  search: z.string().optional(),
});

const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().optional(),
  discountType: discountTypeSchema,
  discountValue: z.number().positive(), // percentage (e.g., 15 for 15% off) or fixed amount
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  maxUses: z.number().int().positive().optional(), // null = unlimited
  maxUsesPerCustomer: z.number().int().positive().optional(),
  minBookingAmount: z.number().min(0).optional(),
  appliesTo: z.enum(["all", "specific"]).optional(),
  tourIds: z.array(z.string()).optional(), // null/empty = applies to all tours
  isActive: z.boolean().default(true),
});

export const promoCodeRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: promoCodeFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.getById(input.id);
    }),

  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.getByCode(input.code);
    }),

  create: adminProcedure
    .input(createPromoCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createPromoCodeSchema.partial().omit({ code: true }), // Can't change code after creation
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.promoCode.delete(input.id);
      return { success: true };
    }),

  validateCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        tourId: z.string(),
        customerId: z.string(),
        bookingAmount: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.validateCode(
        input.code,
        input.tourId,
        input.customerId,
        input.bookingAmount
      );
    }),

  applyCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        bookingId: z.string(),
        customerId: z.string(),
        originalAmount: z.number().positive(),
        finalAmount: z.number().positive(),
        discountAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.applyCode(
        input.code,
        input.bookingId,
        input.customerId,
        input.originalAmount,
        input.finalAmount,
        input.discountAmount
      );
    }),

  getUsageStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.getUsageStats(input.id);
    }),

  generateUniqueCode: adminProcedure
    .input(
      z.object({
        length: z.number().int().min(4).max(20).default(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.generateUniqueCode(input.length);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.promoCode.getStats();
  }),

  activate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.activate(input.id);
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.promoCode.deactivate(input.id);
    }),
});
