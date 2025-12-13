import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const scheduleFilterSchema = z.object({
  tourId: z.string().optional(),
  guideId: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  dateRange: dateRangeSchema.optional(),
  hasAvailability: z.boolean().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(500).default(50), // Higher max for calendar views
});

const sortSchema = z.object({
  field: z.enum(["startsAt", "createdAt"]).default("startsAt"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const createScheduleSchema = z.object({
  tourId: z.string(),
  guideId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  maxParticipants: z.number().min(1).optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  meetingPoint: z.string().optional(),
  meetingPointDetails: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  internalNotes: z.string().optional(),
  publicNotes: z.string().optional(),
});

const bulkCreateSchema = z.object({
  tourId: z.string(),
  guideId: z.string().optional(),
  dates: z.array(z.coerce.date()),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxParticipants: z.number().min(1).optional(),
  price: z.string().optional(),
});

const autoGenerateSchema = z.object({
  tourId: z.string(),
  guideId: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  maxParticipants: z.number().min(1).optional(),
  price: z.string().optional(),
  skipExisting: z.boolean().optional().default(true),
});

export const scheduleRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: scheduleFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.getById(input.id);
    }),

  create: adminProcedure
    .input(createScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.create(input);
    }),

  bulkCreate: adminProcedure
    .input(bulkCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.bulkCreate(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: createScheduleSchema.partial().omit({ tourId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.schedule.delete(input.id);
      return { success: true };
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.cancel(input.id);
    }),

  getAvailableForTour: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        dateRange: dateRangeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.getAvailableForTour(input.tourId, input.dateRange);
    }),

  getForGuide: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        dateRange: dateRangeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.getForGuide(input.guideId, input.dateRange);
    }),

  checkAvailability: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        participants: z.number().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.checkAvailability(input.id, input.participants);
    }),

  getStats: protectedProcedure
    .input(z.object({ dateRange: dateRangeSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.getStats(input.dateRange);
    }),

  autoGenerate: adminProcedure
    .input(autoGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.autoGenerate(input);
    }),

  previewAutoGenerate: protectedProcedure
    .input(autoGenerateSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.schedule.previewAutoGenerate(input);
    }),
});
