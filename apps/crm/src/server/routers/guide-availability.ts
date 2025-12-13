import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const weeklyAvailabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean(),
});

const availabilityOverrideInputSchema = z.object({
  date: z.coerce.date(),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  reason: z.string().optional(),
});

export const guideAvailabilityRouter = createRouter({
  getWeeklyAvailability: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.getWeeklyAvailability(input.guideId);
    }),

  setWeeklyAvailability: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        slots: z.array(weeklyAvailabilitySlotSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.setWeeklyAvailability(
        input.guideId,
        input.slots
      );
    }),

  addWeeklySlot: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        slot: weeklyAvailabilitySlotSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.addWeeklySlot(input.guideId, input.slot);
    }),

  updateWeeklySlot: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: weeklyAvailabilitySlotSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.updateWeeklySlot(input.id, input.data);
    }),

  deleteWeeklySlot: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.guideAvailability.deleteWeeklySlot(input.id);
      return { success: true };
    }),

  getOverrides: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.getOverrides(input.guideId, {
        from: input.from,
        to: input.to,
      });
    }),

  createOverride: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        override: availabilityOverrideInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.createOverride(
        input.guideId,
        input.override
      );
    }),

  updateOverride: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: availabilityOverrideInputSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.updateOverride(input.id, input.data);
    }),

  deleteOverride: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.guideAvailability.deleteOverride(input.id);
      return { success: true };
    }),

  isAvailableOnDate: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        date: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.isAvailableOnDate(
        input.guideId,
        input.date
      );
    }),

  isAvailableForTimeSlot: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.isAvailableForTimeSlot(
        input.guideId,
        input.startsAt,
        input.endsAt
      );
    }),

  getAvailabilityForDateRange: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAvailability.getAvailabilityForDateRange(
        input.guideId,
        input.from,
        input.to
      );
    }),
});
