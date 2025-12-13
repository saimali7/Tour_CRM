import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const guideAssignmentStatusSchema = z.enum(["pending", "confirmed", "declined"]);

const createGuideAssignmentInputSchema = z.object({
  scheduleId: z.string(),
  guideId: z.string(),
  notes: z.string().optional(),
});

const guideAssignmentFiltersSchema = z.object({
  status: guideAssignmentStatusSchema.optional(),
  dateRange: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .optional(),
});

export const guideAssignmentRouter = createRouter({
  getAssignmentsForSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignmentsForSchedule(
        input.scheduleId
      );
    }),

  getAssignmentsForGuide: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        filters: guideAssignmentFiltersSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignmentsForGuide(
        input.guideId,
        input.filters
      );
    }),

  getAssignment: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        guideId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignment(
        input.scheduleId,
        input.guideId
      );
    }),

  createAssignment: adminProcedure
    .input(createGuideAssignmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.createAssignment(input);
    }),

  confirmAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.confirmAssignment(input.id);
    }),

  declineAssignment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.declineAssignment(input.id, input.reason);
    }),

  cancelAssignment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.guideAssignment.cancelAssignment(input.id);
      return { success: true };
    }),

  getPendingAssignmentsForGuide: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getPendingAssignmentsForGuide(
        input.guideId
      );
    }),

  assignGuideToSchedule: adminProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        guideId: z.string(),
        options: z
          .object({
            autoConfirm: z.boolean().optional(),
            notes: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.assignGuideToSchedule(
        input.scheduleId,
        input.guideId,
        input.options
      );
    }),

  reassignSchedule: adminProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        newGuideId: z.string(),
        options: z
          .object({
            autoConfirm: z.boolean().optional(),
            notes: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.reassignSchedule(
        input.scheduleId,
        input.newGuideId,
        input.options
      );
    }),

  hasConflict: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        excludeScheduleId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.hasConflict(
        input.guideId,
        input.startsAt,
        input.endsAt,
        input.excludeScheduleId
      );
    }),
});
