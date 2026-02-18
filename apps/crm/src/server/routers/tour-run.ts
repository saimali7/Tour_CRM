import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { coerceDateInputToDateKey, parseDateKeyToDbDate } from "@/lib/date-time";

const parseDateKey = (dateKey: string): Date => parseDateKeyToDbDate(dateKey);

const tourRunDateSchema = z.string().min(1, "Date is required");

/**
 * Tour Run Router
 *
 * Provides endpoints for accessing "tour runs" - the virtual grouping of
 * (tourId, date, time) for operations. Unlike schedules, tour runs are
 * computed on-demand from availability-based bookings.
 */
export const tourRunRouter = createRouter({
  /**
   * Get today's tour runs with summary
   * Used for the operations dashboard
   */
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({
      organizationId: ctx.orgContext.organizationId,
    });
    return services.tourRun.getForToday();
  }),

  /**
   * Get tour runs for a specific date
   */
  getForDate: protectedProcedure
    .input(z.object({ date: tourRunDateSchema }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateKey = normalizeTourRunDate(input.date, ctx.orgContext.organization.timezone);
      return services.tourRun.getForDate(parseDateKey(dateKey));
    }),

  /**
   * Get tour runs for a date range
   * Returns tour runs with summary statistics
   */
  list: protectedProcedure
    .input(
      z.object({
        dateFrom: tourRunDateSchema,
        dateTo: tourRunDateSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateFromKey = normalizeTourRunDate(input.dateFrom, ctx.orgContext.organization.timezone);
      const dateToKey = normalizeTourRunDate(input.dateTo, ctx.orgContext.organization.timezone);
      return services.tourRun.getForDateRange(
        parseDateKey(dateFromKey),
        parseDateKey(dateToKey)
      );
    }),

  /**
   * Get a specific tour run by tourId, date, and time
   */
  get: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: tourRunDateSchema,
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateKey = normalizeTourRunDate(input.date, ctx.orgContext.organization.timezone);
      return services.tourRun.get(input.tourId, parseDateKey(dateKey), input.time);
    }),

  /**
   * Get manifest for a specific tour run
   * Includes all bookings, participants, and assigned guides
   */
  getManifest: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: tourRunDateSchema,
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateKey = normalizeTourRunDate(input.date, ctx.orgContext.organization.timezone);
      return services.tourRun.getManifest(
        input.tourId,
        parseDateKey(dateKey),
        input.time
      );
    }),

  /**
   * Calculate guides required for a tour run
   */
  calculateGuidesRequired: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: tourRunDateSchema,
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateKey = normalizeTourRunDate(input.date, ctx.orgContext.organization.timezone);
      return services.tourRun.calculateGuidesRequired(
        input.tourId,
        parseDateKey(dateKey),
        input.time
      );
    }),

  /**
   * Get all guide assignments for a tour run
   */
  getAssignments: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: tourRunDateSchema,
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateKey = normalizeTourRunDate(input.date, ctx.orgContext.organization.timezone);
      return services.guideAssignment.getAssignmentsForTourRun(
        input.tourId,
        parseDateKey(dateKey),
        input.time
      );
    }),
});

function normalizeTourRunDate(
  value: string,
  organizationTimeZone: string | null | undefined
): string {
  try {
    return coerceDateInputToDateKey(value, organizationTimeZone);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Date must be in YYYY-MM-DD format or a valid datetime",
    });
  }
}
