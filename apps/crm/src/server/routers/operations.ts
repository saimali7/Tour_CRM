import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

/**
 * Operations Router - Tour Command Center API
 *
 * Provides endpoints for daily tour operations management including:
 * - Day overview and tour summaries
 * - Tour assignment management
 * - Auto-assignment algorithms
 * - Manual drag-drop assignment
 * - Tour approval and guide notification
 * - Pickup status tracking
 */
export const operationsRouter = createRouter({
  // ============================================================
  // DAY OVERVIEW
  // ============================================================

  /**
   * Get complete overview for a day
   * Used by the Day Overview page in Tour Command Center
   *
   * Returns: stats, tour summaries grouped by time period
   */
  getDayOverview: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getDayOverview(input.date);
    }),

  /**
   * Get tours grouped by time period (morning/afternoon/evening)
   */
  getToursByPeriod: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getToursByPeriod(input.date);
    }),

  // ============================================================
  // TOUR ASSIGNMENT
  // ============================================================

  /**
   * Get all data needed for Tour Assignment page
   * Includes: schedule, bookings, guides, existing assignments
   */
  getTourAssignment: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getTourAssignmentData(input.scheduleId);
    }),

  /**
   * Get available guides for a schedule
   * Returns guides filtered by: qualification, availability, no conflicts
   */
  getAvailableGuides: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getAvailableGuides(input.scheduleId);
    }),

  /**
   * Get unassigned bookings for a schedule
   */
  getUnassignedBookings: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getUnassignedBookings(input.scheduleId);
    }),

  /**
   * Get assignment status for a schedule
   */
  getAssignmentStatus: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.getScheduleAssignmentStatus(input.scheduleId);
    }),

  // ============================================================
  // AUTO-ASSIGNMENT
  // ============================================================

  /**
   * Auto-assign bookings for a single tour
   *
   * Algorithm:
   * 1. Separate private vs shared bookings
   * 2. Assign private bookings first (exclusive vehicle)
   * 3. Cluster shared bookings by zone
   * 4. Bin-pack into available guide capacity
   * 5. Optimize pickup order per guide
   * 6. Calculate pickup times
   */
  autoAssignTour: adminProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.autoAssignment.autoAssignTour(input.scheduleId);
    }),

  /**
   * Auto-assign all tours for a day
   * Runs auto-assignment for each tour in the day
   */
  autoAssignDay: adminProcedure
    .input(z.object({ date: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.autoAssignment.autoAssignDay(input.date);
    }),

  /**
   * Get assignment suggestions for a booking
   * Returns ranked list of guides with efficiency scores
   */
  getSuggestions: protectedProcedure
    .input(z.object({
      bookingId: z.string(),
      scheduleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.autoAssignment.getSuggestions(input.bookingId, input.scheduleId);
    }),

  // ============================================================
  // MANUAL ASSIGNMENT
  // ============================================================

  /**
   * Assign a booking to a guide
   * Creates a pickup assignment linking booking to guide
   */
  assignBooking: adminProcedure
    .input(z.object({
      scheduleId: z.string(),
      guideAssignmentId: z.string(),
      bookingId: z.string(),
      position: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.assign({
        scheduleId: input.scheduleId,
        guideAssignmentId: input.guideAssignmentId,
        bookingId: input.bookingId,
        position: input.position,
      });
    }),

  /**
   * Unassign a booking from a guide
   * Removes the pickup assignment and reorders remaining assignments
   */
  unassignBooking: adminProcedure
    .input(z.object({ pickupAssignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAssignment.unassign(input.pickupAssignmentId);
      return { success: true };
    }),

  /**
   * Reorder pickups for a guide
   * Updates pickup order based on array of assignment IDs
   */
  reorderPickups: adminProcedure
    .input(z.object({
      guideAssignmentId: z.string(),
      pickupOrder: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAssignment.reorder(input.guideAssignmentId, input.pickupOrder);
      return { success: true };
    }),

  /**
   * Calculate ghost preview for drag-drop
   * Returns preview of what would happen if booking is assigned
   */
  calculateGhostPreview: protectedProcedure
    .input(z.object({
      guideAssignmentId: z.string(),
      bookingId: z.string(),
      position: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.calculateGhostPreview({
        guideAssignmentId: input.guideAssignmentId,
        bookingId: input.bookingId,
        position: input.position,
      });
    }),

  /**
   * Bulk assign multiple bookings
   */
  bulkAssign: adminProcedure
    .input(z.object({
      assignments: z.array(z.object({
        scheduleId: z.string(),
        guideAssignmentId: z.string(),
        bookingId: z.string(),
        position: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.bulkAssign(input.assignments);
    }),

  /**
   * Clear all pickup assignments for a schedule
   * Useful when re-running auto-assignment
   */
  clearAssignments: adminProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAssignment.clearScheduleAssignments(input.scheduleId);
      return { success: true };
    }),

  // ============================================================
  // APPROVAL & NOTIFICATION
  // ============================================================

  /**
   * Approve a tour's assignments
   * Marks assignments as approved and calculates final pickup times
   */
  approveTour: adminProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAssignment.approveTour(input.scheduleId);
      return { success: true };
    }),

  /**
   * Approve all ready tours for a day
   * Only approves tours that have all bookings assigned
   */
  approveAllReady: adminProcedure
    .input(z.object({ date: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.approveAllReady(input.date);
    }),

  /**
   * Notify guides for specific schedules
   * Triggers notification job via Inngest
   */
  notifyGuides: adminProcedure
    .input(z.object({
      scheduleIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement via Inngest event
      // await inngest.send({
      //   name: 'operations/notify-guides',
      //   data: {
      //     organizationId: ctx.orgContext.organizationId,
      //     scheduleIds: input.scheduleIds,
      //   },
      // });
      return { success: true, notified: input.scheduleIds.length };
    }),

  /**
   * Notify all guides for a day
   * Sends notifications to all guides with confirmed assignments
   */
  notifyAllGuides: adminProcedure
    .input(z.object({ date: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.notifyAllGuides(input.date);
    }),

  // ============================================================
  // PICKUP STATUS
  // ============================================================

  /**
   * Mark pickup as completed
   */
  markPickedUp: adminProcedure
    .input(z.object({ pickupAssignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.markPickedUp(input.pickupAssignmentId);
    }),

  /**
   * Mark pickup as no-show
   */
  markNoShow: adminProcedure
    .input(z.object({ pickupAssignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.markNoShow(input.pickupAssignmentId);
    }),

  /**
   * Update actual pickup time
   */
  updatePickupTime: adminProcedure
    .input(z.object({
      pickupAssignmentId: z.string(),
      actualTime: z.coerce.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.updatePickupTime(
        input.pickupAssignmentId,
        input.actualTime
      );
    }),

  // ============================================================
  // ADD GUIDE TO TOUR
  // ============================================================

  /**
   * Add a new guide to a tour
   * Creates a guide assignment for the schedule
   */
  addGuideToTour: adminProcedure
    .input(z.object({
      scheduleId: z.string(),
      guideId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get a booking from this schedule to create the guide assignment
      const scheduleBookings = await services.booking.getForSchedule(input.scheduleId);
      const firstBooking = scheduleBookings[0];
      if (!firstBooking) {
        throw new Error("No bookings found for this schedule");
      }

      return services.guideAssignment.assignGuideToBooking(
        firstBooking.id,
        input.guideId,
        { autoConfirm: false }
      );
    }),

  // ============================================================
  // PICKUP ASSIGNMENTS QUERY
  // ============================================================

  /**
   * Get all pickup assignments for a schedule
   */
  getPickupAssignments: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.getBySchedule(input.scheduleId);
    }),

  /**
   * Get pickup assignments for a specific guide assignment
   */
  getGuidePickups: protectedProcedure
    .input(z.object({ guideAssignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.getByGuideAssignment(input.guideAssignmentId);
    }),

  /**
   * Get pickup assignment for a booking
   */
  getBookingPickup: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAssignment.getByBooking(input.bookingId);
    }),

  /**
   * Check if a day is fully assigned
   */
  isDayFullyAssigned: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.dailyOperations.isDayFullyAssigned(input.date);
    }),
});
