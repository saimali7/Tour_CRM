import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const reportTypeSchema = z.enum([
  "revenue",
  "booking",
  "capacity",
  "customer",
  "guide",
]);

const reportFormatSchema = z.enum(["json", "csv"]);

const reportDimensionsSchema = z.array(
  z.enum([
    "tour",
    "source",
    "date",
    "guide",
    "status",
    "paymentStatus",
    "customerSegment",
  ])
);

export const reportsRouter = createRouter({
  // Revenue Report
  getRevenueReport: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        dimensions: reportDimensionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getRevenueStats(input.dateRange);
    }),

  // Booking Report
  getBookingReport: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        dimensions: reportDimensionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getBookingStats(input.dateRange);
    }),

  // Capacity Report
  getCapacityReport: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        dimensions: reportDimensionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.analytics.getCapacityUtilization(input.dateRange);
    }),

  // Customer Report
  getCustomerReport: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema.optional(),
        dimensions: reportDimensionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      // Use default date range if not provided (last 30 days)
      const dateRange = input.dateRange || {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      };
      return services.customerIntelligence.getCustomerStats(dateRange);
    }),

  // Guide Report
  getGuideReport: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        dimensions: reportDimensionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement proper guide report with guide performance metrics
      // For now, return empty array to match expected type
      return [];
    }),

  // Export Report
  exportReport: protectedProcedure
    .input(
      z.object({
        reportType: reportTypeSchema,
        dateRange: dateRangeSchema,
        dimensions: reportDimensionsSchema.optional(),
        format: reportFormatSchema.default("csv"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get the report data based on type
      let reportData;
      switch (input.reportType) {
        case "revenue":
          reportData = await services.analytics.getRevenueStats(input.dateRange);
          break;
        case "booking":
          reportData = await services.analytics.getBookingStats(input.dateRange);
          break;
        case "capacity":
          reportData = await services.analytics.getCapacityUtilization(input.dateRange);
          break;
        case "customer":
          reportData = await services.customerIntelligence.getCustomerStats(input.dateRange);
          break;
        case "guide":
          // TODO: Implement proper guide report
          reportData = [];
          break;
      }

      // Format based on requested format
      if (input.format === "csv") {
        // Simple CSV conversion for JSON data
        const csv = convertToCSV(reportData);
        return {
          format: "csv" as const,
          data: csv,
          filename: `${input.reportType}-report-${new Date().toISOString().split("T")[0]}.csv`,
        };
      }

      return {
        format: "json" as const,
        data: reportData,
        filename: `${input.reportType}-report-${new Date().toISOString().split("T")[0]}.json`,
      };
    }),
});

// Helper function to convert JSON to CSV
function convertToCSV(data: any): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  // If it's an array, convert each object
  if (Array.isArray(data)) {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(header => {
        const value = item[header];
        // Escape values that contain commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  // If it's an object, flatten it
  const headers = Object.keys(data);
  const values = headers.map(header => {
    const value = data[header];
    if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value ?? "";
  });

  return [headers.join(","), values.join(",")].join("\n");
}
