import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const productTypeSchema = z.enum(["tour", "service", "good"]);
const productStatusSchema = z.enum(["draft", "active", "archived"]);
const productVisibilitySchema = z.enum(["public", "private", "unlisted"]);

const productFilterSchema = z.object({
  type: productTypeSchema.optional(),
  status: productStatusSchema.optional(),
  visibility: productVisibilitySchema.optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["name", "createdAt", "updatedAt", "basePrice", "sortOrder"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const createProductSchema = z.object({
  type: productTypeSchema,
  name: z.string().min(1).max(255),
  slug: z.string().max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  status: productStatusSchema.default("draft"),
  visibility: productVisibilitySchema.default("public"),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal"),
  currency: z.string().length(3).default("USD"),
  pricingDisplay: z.string().max(100).optional(),
  featuredImage: z.string().url().max(2048).optional(),
  gallery: z.array(z.string().url().max(2048)).max(20).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().min(0).optional(),
});

export const productRouter = createRouter({
  // ============================================
  // Query Operations
  // ============================================

  list: protectedProcedure
    .input(
      z.object({
        filters: productFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  // Unified products with type-specific extensions (tours with schedule stats, services with config)
  listWithExtensions: protectedProcedure
    .input(
      z.object({
        filters: productFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.getAllWithExtensions(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.getById(input.id);
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.getBySlug(input.slug);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.product.getStats();
  }),

  // ============================================
  // Mutation Operations
  // ============================================

  create: adminProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createProductSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.update(input.id, input.data);
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.archive(input.id);
    }),

  restore: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.product.restore(input.id);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.product.delete(input.id);
      return { success: true };
    }),
});
