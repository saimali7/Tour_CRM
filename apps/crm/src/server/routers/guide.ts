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
  search: z.string().optional(),
  language: z.string().optional(),
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
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  shortBio: z.string().optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  availabilityNotes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
  isPublic: z.boolean().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
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
