import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

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
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourRun.getForDate(input.date);
    }),

  /**
   * Get tour runs for a date range
   * Returns tour runs with summary statistics
   */
  list: protectedProcedure
    .input(
      z.object({
        dateFrom: z.coerce.date(),
        dateTo: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourRun.getForDateRange(input.dateFrom, input.dateTo);
    }),

  /**
   * Get a specific tour run by tourId, date, and time
   */
  get: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourRun.get(input.tourId, input.date, input.time);
    }),

  /**
   * Get manifest for a specific tour run
   * Includes all bookings, participants, and assigned guides
   */
  getManifest: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourRun.getManifest(input.tourId, input.date, input.time);
    }),

  /**
   * Calculate guides required for a tour run
   */
  calculateGuidesRequired: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourRun.calculateGuidesRequired(
        input.tourId,
        input.date,
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
        date: z.coerce.date(),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.guideAssignment.getAssignmentsForTourRun(
        input.tourId,
        input.date,
        input.time
      );
    }),
});
