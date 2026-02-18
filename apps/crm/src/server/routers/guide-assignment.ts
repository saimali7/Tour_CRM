import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const guideAssignmentStatusSchema = z.enum(["pending", "confirmed", "declined"]);

const createGuideAssignmentInputSchema = z.object({
  bookingId: z.string(),
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
  // Get all guide assignments for a tour run (tourId + date + time)
  getAssignmentsForTourRun: protectedProcedure
    .input(z.object({
      tourId: z.string(),
      date: z.coerce.date(),
      time: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignmentsForTourRun(
        input.tourId,
        input.date,
        input.time
      );
    }),

  // Get all guide assignments for a booking
  getAssignmentsForBooking: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignmentsForBooking(
        input.bookingId
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

  // Get assignment by booking and guide
  getAssignment: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        guideId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getAssignment(
        input.bookingId,
        input.guideId
      );
    }),

  // Get assignment by ID
  getAssignmentById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getById(input.id);
    }),

  createAssignment: adminProcedure
    .input(createGuideAssignmentInputSchema)
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  confirmAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  declineAssignment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  cancelAssignment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  getPendingAssignmentsForGuide: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.getPendingAssignmentsForGuide(
        input.guideId
      );
    }),

  // Assign guide to a booking
  assignGuideToBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        guideId: z.string(),
        options: z
          .object({
            autoConfirm: z.boolean().optional(),
            notes: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  // Assign outsourced (external) guide to a booking
  assignOutsourcedGuideToBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        outsourcedGuideName: z.string().min(1, "Guide name is required"),
        outsourcedGuideContact: z.string().optional(),
        notes: z.string().optional(),
        options: z
          .object({
            autoConfirm: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  // Reassign guide on a booking (cancel old, create new)
  reassignBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        newGuideId: z.string(),
        oldGuideId: z.string().optional(),
        options: z
          .object({
            autoConfirm: z.boolean().optional(),
            notes: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async () => {
      throwLegacyWriteBlocked();
    }),

  hasConflictForTourRun: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        excludeTourRun: z.object({
          tourId: z.string(),
          bookingDate: z.coerce.date(),
          bookingTime: z.string(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.guideAssignment.hasConflictForTourRun(
        input.guideId,
        input.startsAt,
        input.endsAt,
        input.excludeTourRun
      );
    }),
});

function throwLegacyWriteBlocked(): never {
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Guide assignment writes moved to Tour Command Center. Open Command Center to assign or manage guides.",
  });
}
