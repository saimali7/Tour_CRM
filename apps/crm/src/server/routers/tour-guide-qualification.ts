import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const createQualificationInputSchema = z.object({
  tourId: z.string(),
  guideId: z.string(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateQualificationInputSchema = z.object({
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export const tourGuideQualificationRouter = createRouter({
  getQualificationsForTour: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.getQualificationsForTour(
        input.tourId
      );
    }),

  getQualificationsForGuide: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.getQualificationsForGuide(
        input.guideId
      );
    }),

  addQualification: adminProcedure
    .input(createQualificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.addQualification(input);
    }),

  updateQualification: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateQualificationInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.updateQualification(
        input.id,
        input.data
      );
    }),

  removeQualification: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.tourGuideQualification.removeQualification(input.id);
      return { success: true };
    }),

  setPrimaryGuide: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        guideId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.setPrimaryGuide(
        input.tourId,
        input.guideId
      );
    }),

  getPrimaryGuideForTour: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.getPrimaryGuideForTour(
        input.tourId
      );
    }),

  isGuideQualifiedForTour: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        tourId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.isGuideQualifiedForTour(
        input.guideId,
        input.tourId
      );
    }),

  getQualifiedGuidesForScheduling: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        excludeScheduleId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.getQualifiedGuidesForScheduling(
        input.tourId,
        input.startsAt,
        input.endsAt,
        input.excludeScheduleId
      );
    }),

  setQualificationsForTour: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        guideIds: z.array(z.string()),
        primaryGuideId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.tourGuideQualification.setQualificationsForTour(
        input.tourId,
        input.guideIds,
        input.primaryGuideId
      );
    }),
});
