import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const periodSchema = z.enum(["day", "week", "month", "year"]);

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const analyticsRouter = createRouter({
  // Revenue Analytics
  getRevenueStats: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getRevenueStats(input.dateRange);
    }),

  getRevenueByPeriod: protectedProcedure
    .input(
      z.object({
        period: periodSchema,
        count: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getRevenueByPeriod(input.period, input.count);
    }),

  getRevenueByTour: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use getRevenueStats which includes revenueByTour
      const stats = await services.analytics.getRevenueStats(input.dateRange);
      return stats.revenueByTour;
    }),

  getRevenueComparison: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use getRevenueStats which includes comparison
      const stats = await services.analytics.getRevenueStats(input.dateRange);
      return stats.comparisonToPreviousPeriod;
    }),

  // Booking Analytics
  getBookingStats: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getBookingStats(input.dateRange);
    }),

  getBookingTrends: protectedProcedure
    .input(
      z.object({
        period: periodSchema,
        count: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getBookingTrends(input.period, input.count);
    }),

  getBookingsBySource: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use getBookingStats which includes bookingsBySource
      const stats = await services.analytics.getBookingStats(input.dateRange);
      return stats.bookingsBySource;
    }),

  // Capacity Analytics
  getCapacityUtilization: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        tourId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getCapacityUtilization(input.dateRange);
    }),

  getUnderperformingSchedules: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        thresholdPercent: z.number().min(0).max(100).default(50),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use getCapacityUtilization which includes underperforming schedules
      const capacityData = await services.analytics.getCapacityUtilization(input.dateRange);
      return capacityData.underperformingSchedules;
    }),

  // Activity Analytics
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getRecentActivity(input.limit);
    }),

  getTodaysOperations: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.analytics.getTodaysOperations();
  }),

  // ===========================================
  // Intelligence Surface - Forecasting & Insights
  // ===========================================

  getRevenueForecasting: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.analytics.getRevenueForecasting();
  }),

  getProactiveInsights: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.analytics.getProactiveInsights();
  }),
});
