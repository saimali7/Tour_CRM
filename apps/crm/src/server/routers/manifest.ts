import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

export const manifestRouter = createRouter({
  getForSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.manifest.getManifestForSchedule(input.scheduleId);
    }),

  getForGuide: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        date: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.manifest.getManifestsForGuide(input.guideId, input.date);
    }),

  getForDate: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.manifest.getManifestsForDate(input.date);
    }),

  /**
   * Get manifest for a tour run (availability-based booking model)
   * Uses tourId + date + time instead of scheduleId
   */
  getForTourRun: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.string(), // YYYY-MM-DD format
        time: z.string(), // HH:MM format
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.manifest.getForTourRun(
        input.tourId,
        new Date(input.date),
        input.time
      );
    }),
});
