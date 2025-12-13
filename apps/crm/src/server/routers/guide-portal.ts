import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { TRPCError } from "@trpc/server";
import { getGuideContext } from "../../lib/guide-auth";
import { db, eq, and, gte, lte } from "@tour/database";
import { schedules, bookings, guideAssignments, tours } from "@tour/database/schema";

/**
 * Guide-authenticated procedure
 * Validates that the request has a valid guide session
 */
const guideProcedure = publicProcedure.use(async ({ next }) => {
  const guideContext = await getGuideContext();

  if (!guideContext) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in as a guide",
    });
  }

  return next({
    ctx: {
      guideContext,
    },
  });
});

export const guidePortalRouter = createRouter({
  /**
   * Get dashboard data for the guide
   * Returns upcoming tours and pending assignments
   */
  getMyDashboard: guideProcedure.query(async ({ ctx }) => {
    const { guideId, organizationId } = ctx.guideContext;

    // Get upcoming tours (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingSchedules = await db.query.schedules.findMany({
      where: and(
        eq(schedules.organizationId, organizationId),
        gte(schedules.startsAt, today),
        lte(schedules.startsAt, nextWeek),
        eq(schedules.status, "scheduled")
      ),
      with: {
        tour: true,
        assignments: {
          where: and(
            eq(guideAssignments.guideId, guideId),
            eq(guideAssignments.status, "confirmed")
          ),
        },
        bookings: {
          where: eq(bookings.status, "confirmed"),
          with: {
            customer: true,
          },
        },
      },
      orderBy: (schedules, { asc }) => [asc(schedules.startsAt)],
    });

    // Filter to only schedules where guide is confirmed
    const myUpcomingSchedules = upcomingSchedules.filter(
      (schedule) => schedule.assignments.length > 0
    );

    // Get pending assignments
    const pendingAssignments = await db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.status, "pending")
      ),
      with: {
        schedule: {
          with: {
            tour: true,
          },
        },
      },
      orderBy: (guideAssignments, { desc }) => [desc(guideAssignments.createdAt)],
    });

    return {
      upcomingSchedules: myUpcomingSchedules,
      pendingAssignments,
      stats: {
        upcomingCount: myUpcomingSchedules.length,
        pendingCount: pendingAssignments.length,
      },
    };
  }),

  /**
   * Get all assignments for the guide
   */
  getMyAssignments: guideProcedure
    .input(
      z.object({
        status: z.enum(["pending", "confirmed", "declined"]).optional(),
        dateRange: z
          .object({
            from: z.coerce.date().optional(),
            to: z.coerce.date().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      let whereConditions = [
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
      ];

      if (input.status) {
        whereConditions.push(eq(guideAssignments.status, input.status));
      }

      const assignments = await db.query.guideAssignments.findMany({
        where: and(...whereConditions),
        with: {
          schedule: {
            with: {
              tour: true,
              bookings: {
                where: eq(bookings.status, "confirmed"),
                with: {
                  customer: true,
                },
              },
            },
          },
        },
        orderBy: (guideAssignments, { desc }) => [desc(guideAssignments.createdAt)],
      });

      // Filter by date range if provided
      let filteredAssignments = assignments;
      if (input.dateRange?.from || input.dateRange?.to) {
        filteredAssignments = assignments.filter((assignment) => {
          const scheduleDate = assignment.schedule.startsAt;
          if (input.dateRange?.from && scheduleDate < input.dateRange.from) {
            return false;
          }
          if (input.dateRange?.to && scheduleDate > input.dateRange.to) {
            return false;
          }
          return true;
        });
      }

      return filteredAssignments;
    }),

  /**
   * Get a specific assignment
   */
  getAssignment: guideProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      const assignment = await db.query.guideAssignments.findFirst({
        where: and(
          eq(guideAssignments.id, input.id),
          eq(guideAssignments.organizationId, organizationId),
          eq(guideAssignments.guideId, guideId)
        ),
        with: {
          schedule: {
            with: {
              tour: true,
              bookings: {
                where: eq(bookings.status, "confirmed"),
                with: {
                  customer: true,
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      return assignment;
    }),

  /**
   * Confirm an assignment
   */
  confirmAssignment: guideProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      // Verify this assignment belongs to the guide
      const assignment = await db.query.guideAssignments.findFirst({
        where: and(
          eq(guideAssignments.id, input.id),
          eq(guideAssignments.organizationId, organizationId),
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.status, "pending")
        ),
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or already processed",
        });
      }

      // Use the service to confirm
      const services = createServices({ organizationId });
      return services.guideAssignment.confirmAssignment(input.id);
    }),

  /**
   * Decline an assignment
   */
  declineAssignment: guideProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      // Verify this assignment belongs to the guide
      const assignment = await db.query.guideAssignments.findFirst({
        where: and(
          eq(guideAssignments.id, input.id),
          eq(guideAssignments.organizationId, organizationId),
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.status, "pending")
        ),
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or already processed",
        });
      }

      // Use the service to decline
      const services = createServices({ organizationId });
      return services.guideAssignment.declineAssignment(input.id, input.reason);
    }),

  /**
   * Get schedule manifest with participant details
   */
  getScheduleManifest: guideProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      // Verify the guide is assigned to this schedule
      const assignment = await db.query.guideAssignments.findFirst({
        where: and(
          eq(guideAssignments.scheduleId, input.scheduleId),
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.organizationId, organizationId),
          eq(guideAssignments.status, "confirmed")
        ),
      });

      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not assigned to this schedule",
        });
      }

      // Get the schedule with all details
      const schedule = await db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, input.scheduleId),
          eq(schedules.organizationId, organizationId)
        ),
        with: {
          tour: true,
          bookings: {
            where: eq(bookings.status, "confirmed"),
            with: {
              customer: true,
            },
            orderBy: (bookings, { asc }) => [asc(bookings.createdAt)],
          },
        },
      });

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      // Calculate totals
      const totalParticipants = schedule.bookings.reduce(
        (sum: number, booking) => sum + (booking.totalParticipants || 0),
        0
      );

      const totalRevenue = schedule.bookings.reduce(
        (sum: number, booking) => sum + parseFloat(booking.total || "0"),
        0
      );

      return {
        schedule,
        manifest: schedule.bookings,
        stats: {
          totalBookings: schedule.bookings.length,
          totalParticipants,
          totalRevenue: totalRevenue.toFixed(2),
          spotsRemaining: (schedule.maxParticipants ?? 0) - totalParticipants,
        },
      };
    }),

  /**
   * Get guide's own profile
   */
  getMyProfile: guideProcedure.query(async ({ ctx }) => {
    return ctx.guideContext.guide;
  }),
});
