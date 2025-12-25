import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

// ============================================
// Schema Definitions
// ============================================

const serviceTypeSchema = z.enum(["transfer", "addon", "rental", "package", "custom"]);
const pricingModelSchema = z.enum(["flat", "per_person", "per_hour", "per_day", "per_vehicle", "custom"]);
const availabilityTypeSchema = z.enum(["always", "scheduled", "on_request"]);
const productStatusSchema = z.enum(["draft", "active", "archived"]);

const serviceFilterSchema = z.object({
  serviceType: serviceTypeSchema.optional(),
  pricingModel: pricingModelSchema.optional(),
  availabilityType: availabilityTypeSchema.optional(),
  isStandalone: z.boolean().optional(),
  isAddon: z.boolean().optional(),
  status: productStatusSchema.optional(),
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

// Pricing tier schema
const pricingTierSchema = z.object({
  name: z.string().min(1).max(50),
  price: z.number().min(0),
});

// Transfer config schema
const transferConfigSchema = z.object({
  pickupRequired: z.boolean(),
  dropoffRequired: z.boolean(),
  locations: z.array(
    z.object({
      type: z.enum(["airport", "hotel", "address"]),
      name: z.string().min(1).max(200),
      address: z.string().max(500).optional(),
    })
  ).max(50),
});

// Rental config schema
const rentalConfigSchema = z.object({
  minDuration: z.number().min(1),
  maxDuration: z.number().min(1),
  unit: z.enum(["hour", "day"]),
});

// Create service schema
const createServiceSchema = z.object({
  // Product fields
  name: z.string().min(1).max(255),
  slug: z.string().max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal"),
  currency: z.string().length(3).default("USD"),
  pricingDisplay: z.string().max(100).optional(),
  featuredImage: z.string().url().max(2048).optional(),
  gallery: z.array(z.string().url().max(2048)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: productStatusSchema.default("draft"),

  // Service-specific fields
  serviceType: serviceTypeSchema,
  pricingModel: pricingModelSchema,
  pricingTiers: z.array(pricingTierSchema).max(20).optional(),
  availabilityType: availabilityTypeSchema.default("always"),
  isStandalone: z.boolean().default(true),
  isAddon: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  duration: z.number().min(1).max(10080).optional(), // Max 1 week in minutes
  transferConfig: transferConfigSchema.optional(),
  rentalConfig: rentalConfigSchema.optional(),
  applicableToProducts: z.array(z.string()).max(100).optional(),
  applicableToTypes: z.array(z.string()).max(10).optional(),
  maxQuantity: z.number().min(1).optional(),
  maxPerBooking: z.number().min(1).max(100).default(10),
});

// Update service schema (all fields optional)
const updateServiceSchema = createServiceSchema.partial();

export const catalogServiceRouter = createRouter({
  // ============================================
  // Query Operations
  // ============================================

  list: protectedProcedure
    .input(
      z.object({
        filters: serviceFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.getById(input.id);
    }),

  getByProductId: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.getByProductId(input.productId);
    }),

  // Get services that can be added as add-ons
  getAvailableAddons: protectedProcedure
    .input(z.object({ forProductId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.getAvailableAddons(input.forProductId);
    }),

  // Get services that can be booked standalone
  getStandaloneServices: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.catalogService.getStandaloneServices();
  }),

  // ============================================
  // Mutation Operations
  // ============================================

  create: adminProcedure
    .input(createServiceSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateServiceSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.update(input.id, input.data);
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.catalogService.archive(input.id);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.catalogService.delete(input.id);
      return { success: true };
    }),
});
