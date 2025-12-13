import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["minParticipants", "priority", "createdAt"]).default("minParticipants"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const discountTypeSchema = z.enum(["percentage", "fixed"]);

const groupDiscountFilterSchema = z.object({
  tourId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

const createGroupDiscountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  minParticipants: z.number().int().positive(),
  maxParticipants: z.number().int().positive().optional(),
  discountType: discountTypeSchema,
  discountValue: z.number().positive(),
  appliesTo: z.enum(["all", "specific"]).optional(),
  tourIds: z.array(z.string()).optional(),
  priority: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const groupDiscountRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: groupDiscountFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.getById(input.id);
    }),

  create: adminProcedure
    .input(createGroupDiscountSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createGroupDiscountSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.groupDiscount.delete(input.id);
      return { success: true };
    }),

  calculateDiscount: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        participantCount: z.number().int().positive(),
        basePrice: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.calculateDiscount(
        input.tourId,
        input.participantCount,
        input.basePrice
      );
    }),

  getApplicableTiers: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.getApplicableTiers(input.tourId);
    }),

  getNextTier: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        currentParticipants: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.getNextTier(input.tourId, input.currentParticipants);
    }),

  getActive: protectedProcedure
    .input(
      z.object({
        tourId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.getActive({
        tourId: input.tourId,
      });
    }),

  activate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.activate(input.id);
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.groupDiscount.deactivate(input.id);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.groupDiscount.getStats();
  }),
});
