import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const guideFilterSchema = z.object({
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
  isPublic: z.boolean().optional(),
  search: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["lastName", "createdAt"]).default("lastName"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const createGuideSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  bio: z.string().max(5000).optional(),
  shortBio: z.string().max(500).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
  availabilityNotes: z.string().max(1000).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
  isPublic: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
  userId: z.string().max(100).optional(),
});

export const guideRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: guideFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.getById(input.id);
    }),

  getByIdWithStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.getByIdWithStats(input.id);
    }),

  create: adminProcedure
    .input(createGuideSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createGuideSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.guide.delete(input.id);
      return { success: true };
    }),

  getSchedules: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        dateRange: dateRangeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.getSchedules(input.id, input.dateRange);
    }),

  getAvailableForTime: protectedProcedure
    .input(
      z.object({
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        excludeScheduleId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.getAvailableForTime(
        input.startsAt,
        input.endsAt,
        input.excludeScheduleId
      );
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.deactivate(input.id);
    }),

  activate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.activate(input.id);
    }),

  setOnLeave: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guide.setOnLeave(input.id);
    }),

  getAllLanguages: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.guide.getAllLanguages();
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.guide.getStats();
  }),
});
