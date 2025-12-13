import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["score", "clv", "lastBookingDate", "createdAt"]).default("score"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const customerSegmentSchema = z.enum([
  "vip",
  "loyal",
  "promising",
  "at_risk",
  "dormant",
]);

export const customerIntelligenceRouter = createRouter({
  // Customer Scoring
  getCustomerScore: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerIntelligence.getCustomerWithScore(input.customerId);
    }),

  calculateScore: adminProcedure
    .input(
      z.object({
        customerId: z.string().optional(), // If not provided, recalculate all
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      if (input.customerId) {
        return services.customerIntelligence.calculateCustomerScore(input.customerId);
      } else {
        return services.customerIntelligence.calculateAllScores();
      }
    }),

  // Segmentation
  getSegmentDistribution: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.customerIntelligence.getSegmentDistribution();
  }),

  getCustomersBySegment: protectedProcedure
    .input(
      z.object({
        segment: customerSegmentSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerIntelligence.getCustomersBySegment(input.segment);
    }),

  // Customer Lifetime Value (CLV)
  getCustomerCLV: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerIntelligence.calculateCLV(input.customerId);
    }),

  getTopCustomers: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerIntelligence.getTopCustomersByCLV(input.limit);
    }),

  getCLVBySource: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.customerIntelligence.getCLVBySource();
  }),

  // Re-engagement
  getReengagementCandidates: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.customerIntelligence.getReengagementCandidates();
  }),

  // Overall Customer Stats
  getCustomerStats: protectedProcedure
    .input(
      z.object({
        dateRange: z
          .object({
            from: z.coerce.date(),
            to: z.coerce.date(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use default date range if not provided
      const dateRange = input.dateRange || {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      };
      return services.customerIntelligence.getCustomerStats(dateRange);
    }),
});
