import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const goalMetricTypeSchema = z.enum([
  "revenue",
  "bookings",
  "capacity_utilization",
  "new_customers",
]);

const goalPeriodTypeSchema = z.enum(["monthly", "quarterly", "yearly"]);

const goalStatusSchema = z.enum(["active", "completed", "missed"]);

const goalFilterSchema = z.object({
  status: goalStatusSchema.optional(),
  metricType: goalMetricTypeSchema.optional(),
  periodType: goalPeriodTypeSchema.optional(),
});

export const goalRouter = createRouter({
  list: protectedProcedure
    .input(z.object({ filters: goalFilterSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.goal.list(input?.filters);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.goal.getById(input.id);
    }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.goal.getActiveGoals();
  }),

  getProgress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.goal.getProgress(input.id);
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.goal.getSummary();
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        metricType: goalMetricTypeSchema,
        targetValue: z.string(),
        periodType: goalPeriodTypeSchema,
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const createdBy = ctx.user?.id || "unknown";
      return services.goal.create(input, createdBy);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          targetValue: z.string().optional(),
          status: goalStatusSchema.optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.goal.update(input.id, input.data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.goal.delete(input.id);
      return { success: true };
    }),

  updateStatuses: adminProcedure.mutation(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    await services.goal.updateGoalStatuses();
    return { success: true };
  }),
});
