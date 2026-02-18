import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { coerceDateInputToDateKey, parseDateKeyToDbDate } from "@/lib/date-time";

const dateKeySchema = z.string().min(1, "Date is required");

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
        date: dateKeySchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const dateKey = normalizeManifestDate(input.date, ctx.orgContext.organization.timezone);
      return services.manifest.getManifestsForGuide(input.guideId, parseDateKeyToDbDate(dateKey));
    }),

  getForDate: protectedProcedure
    .input(z.object({ date: dateKeySchema }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const dateKey = normalizeManifestDate(input.date, ctx.orgContext.organization.timezone);
      return services.manifest.getManifestsForDate(parseDateKeyToDbDate(dateKey));
    }),

  /**
   * Get manifest for a tour run (availability-based booking model)
   * Uses tourId + date + time instead of scheduleId
   */
  getForTourRun: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: dateKeySchema,
        time: z.string(), // HH:MM format
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const dateKey = normalizeManifestDate(input.date, ctx.orgContext.organization.timezone);
      return services.manifest.getForTourRun(
        input.tourId,
        parseDateKeyToDbDate(dateKey),
        input.time
      );
    }),
});

function normalizeManifestDate(
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
