import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const dashboardRouter = createRouter({
  // Operations Dashboard - Today's tours and immediate operational data
  getOperationsDashboard: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.dashboard.getOperationsDashboard();
  }),

  // Business Dashboard - Revenue, bookings, trends with optional date range
  getBusinessDashboard: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dashboard.getBusinessDashboard(input.dateRange);
    }),
});
