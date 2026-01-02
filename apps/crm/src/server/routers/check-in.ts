import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices, UnauthorizedError } from "@tour/services";

const checkedInStatusSchema = z.enum(["yes", "no", "no_show"]);

export const checkInRouter = createRouter({
  // ==========================================
  // Individual Check-In
  // ==========================================

  checkInParticipant: protectedProcedure
    .input(
      z.object({
        participantId: z.string(),
        status: checkedInStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new UnauthorizedError("User not authenticated");
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.checkInParticipant(
        input.participantId,
        ctx.user.id,
        input.status
      );
    }),

  markNoShow: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new UnauthorizedError("User not authenticated");
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.markNoShow(input.participantId, ctx.user.id);
    }),

  undoCheckIn: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.undoCheckIn(input.participantId);
    }),

  // ==========================================
  // Booking-Level Check-In
  // ==========================================

  checkInAllForBooking: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        status: checkedInStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new UnauthorizedError("User not authenticated");
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.checkInAllForBooking(
        input.bookingId,
        ctx.user.id,
        input.status
      );
    }),

  getBookingCheckInStatus: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.getBookingCheckInStatus(input.bookingId);
    }),

  // ==========================================
  // Bulk Operations
  // ==========================================

  bulkCheckIn: protectedProcedure
    .input(
      z.object({
        participantIds: z.array(z.string()),
        status: checkedInStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new UnauthorizedError("User not authenticated");
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.bulkCheckIn(
        input.participantIds,
        ctx.user.id,
        input.status
      );
    }),

  // ==========================================
  // Schedule Check-In Status
  // ==========================================

  getScheduleCheckInStatus: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.getScheduleCheckInStatus(input.scheduleId);
    }),

  // ==========================================
  // Today's Summary
  // ==========================================

  getTodaysSummary: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.checkIn.getTodaysCheckInSummary();
  }),

  // ==========================================
  // Complete Bookings
  // ==========================================

  completeBookingsForSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.checkIn.completeBookingsForSchedule(input.scheduleId);
    }),
});
