import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["startDate", "priority", "createdAt"]).default("startDate"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const adjustmentTypeSchema = z.enum(["percentage", "fixed"]);

const seasonalPricingFilterSchema = z.object({
  tourId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const createSeasonalPricingSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  adjustmentType: adjustmentTypeSchema,
  adjustmentValue: z.number(), // percentage (e.g., 20 for 20% increase) or fixed amount
  appliesTo: z.enum(["all", "specific"]).optional(),
  tourIds: z.array(z.string()).optional(),
  priority: z.number().min(0).default(0), // Higher priority rules override lower ones
  isActive: z.boolean().default(true),
});

export const seasonalPricingRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: seasonalPricingFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.getById(input.id);
    }),

  create: adminProcedure
    .input(createSeasonalPricingSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createSeasonalPricingSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.seasonalPricing.delete(input.id);
      return { success: true };
    }),

  calculateAdjustment: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        basePrice: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.calculateAdjustment(
        input.tourId,
        input.date,
        input.basePrice
      );
    }),

  getActive: protectedProcedure
    .input(
      z.object({
        tourId: z.string().optional(),
        dateRange: z.object({
          from: z.coerce.date(),
          to: z.coerce.date(),
        }).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.seasonalPricing.getActive({
        tourId: input.tourId,
        dateRange: input.dateRange,
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.seasonalPricing.getStats();
  }),
});
