import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const activityLogFilterSchema = z.object({
  entityType: z.enum(["booking", "schedule", "tour", "customer", "guide", "organization", "payment"]).optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorType: z.enum(["user", "system", "customer", "webhook"]).optional(),
  actorId: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const activityLogRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: activityLogFilterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.activityLog.getAll(
        input.filters as Parameters<typeof services.activityLog.getAll>[0],
        input.pagination
      );
    }),

  getForEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.enum(["booking", "schedule", "tour", "customer", "guide", "organization", "payment"]),
        entityId: z.string(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.activityLog.getForEntity(input.entityType, input.entityId, input.pagination);
    }),

  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.activityLog.getRecent(input?.limit);
    }),

  getStats: protectedProcedure
    .input(z.object({ dateRange: dateRangeSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.activityLog.getStats(input?.dateRange);
    }),
});
