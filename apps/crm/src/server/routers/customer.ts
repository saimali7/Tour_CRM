import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { createCustomerSchema as validatorCreateCustomerSchema, updateCustomerSchema as validatorUpdateCustomerSchema } from "@tour/validators";

const customerFilterSchema = z.object({
  search: z.string().optional(),
  source: z.enum(["manual", "website", "api", "import", "referral"]).optional(),
  tags: z.array(z.string()).optional(),
  country: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["createdAt", "lastName", "email"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const createCustomerSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    contactPreference: z.enum(["email", "phone", "both"]).default("email"),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    source: z.enum(["manual", "website", "api", "import", "referral"]).optional(),
    sourceDetails: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Customer must have either email or phone number",
    path: ["email"],
  });

export const customerRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: customerFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getById(input.id);
    }),

  getByIdWithStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getByIdWithStats(input.id);
    }),

  getByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getByEmail(input.email);
    }),

  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.create(input);
    }),

  getOrCreate: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getOrCreate(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: validatorUpdateCustomerSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.update(input.id, input.data as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.customer.delete(input.id);
      return { success: true };
    }),

  addTags: protectedProcedure
    .input(z.object({ id: z.string(), tags: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.addTags(input.id, input.tags);
    }),

  removeTags: protectedProcedure
    .input(z.object({ id: z.string(), tags: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.removeTags(input.id, input.tags);
    }),

  getBookings: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.getBookings(input.id);
    }),

  getAllTags: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.customer.getAllTags();
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.customer.getStats();
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.search(input.query, input.limit);
    }),

  // GDPR Compliance endpoints
  exportGdprData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customer.exportGdprData(input.id);
    }),

  anonymizeForGdpr: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.customer.anonymizeForGdpr(input.id);
      return { success: true };
    }),
});
