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
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  durationMinutes: z.number().min(1),
  minParticipants: z.number().min(1).optional(),
  maxParticipants: z.number().min(1),
  basePrice: z.string(),
  currency: z.string().optional(),
  meetingPoint: z.string().optional(),
  meetingPointDetails: z.string().optional(),
  meetingPointLat: z.string().optional(),
  meetingPointLng: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  accessibility: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  cancellationHours: z.number().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  isPublic: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
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
