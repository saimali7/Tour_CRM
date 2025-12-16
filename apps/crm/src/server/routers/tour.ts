import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const tourFilterSchema = z.object({
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  isPublic: z.boolean().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["name", "createdAt", "updatedAt", "basePrice"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const createTourSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  durationMinutes: z.number().min(1).max(2880), // Max 48 hours
  minParticipants: z.number().min(0).max(1000).optional(),
  maxParticipants: z.number().min(1).max(1000),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal"),
  currency: z.string().length(3).optional(),
  meetingPoint: z.string().max(500).optional(),
  meetingPointDetails: z.string().max(1000).optional(),
  meetingPointLat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  meetingPointLng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  coverImageUrl: z.string().url().max(2048).optional(),
  images: z.array(z.string().url().max(2048)).max(20).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  includes: z.array(z.string().max(200)).max(30).optional(),
  excludes: z.array(z.string().max(200)).max(30).optional(),
  requirements: z.array(z.string().max(200)).max(20).optional(),
  accessibility: z.string().max(2000).optional(),
  cancellationPolicy: z.string().max(5000).optional(),
  cancellationHours: z.number().min(0).max(720).optional(), // Max 30 days
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  isPublic: z.boolean().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const tourRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: tourFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  listWithScheduleStats: protectedProcedure
    .input(
      z.object({
        filters: tourFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getAllWithScheduleStats(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getById(input.id);
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getBySlug(input.slug);
    }),

  create: adminProcedure
    .input(createTourSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createTourSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.tour.delete(input.id);
      return { success: true };
    }),

  publish: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.publish(input.id);
    }),

  unpublish: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.unpublish(input.id);
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.archive(input.id);
    }),

  duplicate: adminProcedure
    .input(z.object({ id: z.string(), newName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.duplicate(input.id, input.newName);
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.tour.getCategories();
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.tour.getStats();
  }),

  // ============================================
  // Pricing Tiers
  // ============================================

  listPricingTiers: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getPricingTiers(input.tourId);
    }),

  getPricingTier: protectedProcedure
    .input(z.object({ tierId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getPricingTierById(input.tierId);
    }),

  createPricingTier: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        description: z.string().optional(),
        price: z.string(),
        minAge: z.number().min(0).optional(),
        maxAge: z.number().min(0).optional(),
        isDefault: z.boolean().optional(),
        countTowardsCapacity: z.boolean().optional(),
        minQuantity: z.number().min(0).optional(),
        maxQuantity: z.number().min(1).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.createPricingTier(input);
    }),

  updatePricingTier: adminProcedure
    .input(
      z.object({
        tierId: z.string(),
        data: z.object({
          name: z.string().min(1).max(50).optional(),
          label: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          price: z.string().optional(),
          minAge: z.number().min(0).nullable().optional(),
          maxAge: z.number().min(0).nullable().optional(),
          isDefault: z.boolean().optional(),
          countTowardsCapacity: z.boolean().optional(),
          minQuantity: z.number().min(0).optional(),
          maxQuantity: z.number().min(1).nullable().optional(),
          sortOrder: z.number().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.updatePricingTier(input.tierId, input.data);
    }),

  deletePricingTier: adminProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.tour.deletePricingTier(input.tierId);
      return { success: true };
    }),

  reorderPricingTiers: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        tierIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.reorderPricingTiers(input.tourId, input.tierIds);
    }),

  createDefaultPricingTiers: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        basePrice: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.createDefaultPricingTiers(input.tourId, input.basePrice);
    }),

  // ============================================
  // Tour Variants
  // ============================================

  listVariants: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getVariants(input.tourId);
    }),

  getVariant: protectedProcedure
    .input(z.object({ variantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.getVariantById(input.variantId);
    }),

  createVariant: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        description: z.string().optional(),
        priceModifierType: z.enum(["absolute", "percentage", "fixed_add"]).optional(),
        priceModifier: z.string().optional(),
        durationMinutes: z.number().min(1).optional(),
        maxParticipants: z.number().min(1).optional(),
        minParticipants: z.number().min(1).optional(),
        availableDays: z.array(z.number().min(0).max(6)).optional(),
        defaultStartTime: z.string().optional(),
        sortOrder: z.number().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.createVariant(input);
    }),

  updateVariant: adminProcedure
    .input(
      z.object({
        variantId: z.string(),
        data: z.object({
          name: z.string().min(1).max(50).optional(),
          label: z.string().min(1).max(100).optional(),
          description: z.string().nullable().optional(),
          priceModifierType: z.enum(["absolute", "percentage", "fixed_add"]).optional(),
          priceModifier: z.string().nullable().optional(),
          durationMinutes: z.number().min(1).nullable().optional(),
          maxParticipants: z.number().min(1).nullable().optional(),
          minParticipants: z.number().min(1).nullable().optional(),
          availableDays: z.array(z.number().min(0).max(6)).optional(),
          defaultStartTime: z.string().nullable().optional(),
          sortOrder: z.number().optional(),
          isDefault: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.updateVariant(input.variantId, input.data);
    }),

  deleteVariant: adminProcedure
    .input(z.object({ variantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.tour.deleteVariant(input.variantId);
      return { success: true };
    }),

  reorderVariants: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        variantIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tour.reorderVariants(input.tourId, input.variantIds);
    }),
});
