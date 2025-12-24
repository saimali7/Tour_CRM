import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { TRPCError } from "@trpc/server";
import { getGuideContext } from "../../lib/guide-auth";
import { db, eq, and, gte, lte, inArray } from "@tour/database";
import { schedules, bookings, guideAssignments } from "@tour/database/schema";

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

    // Get upcoming tours (next 7 days) where the guide has confirmed assignments
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // First get confirmed assignments for this guide that link to upcoming schedules
    const confirmedAssignments = await db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.status, "confirmed")
      ),
      with: {
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
    });

    // Filter to upcoming schedules and deduplicate by scheduleId
    // Type assertion needed because Drizzle's nested relation types aren't properly inferred
    type ScheduleWithTour = typeof schedules.$inferSelect & { tour?: { id: string; name: string } | null };
    const scheduleMap = new Map<string, ScheduleWithTour & { bookingCount: number }>();
    for (const assignment of confirmedAssignments) {
      // The with clause includes schedule but TypeScript doesn't know about it
      const booking = assignment.booking as unknown as { schedule: ScheduleWithTour | null; scheduleId: string };
      const schedule = booking.schedule;
      if (
        schedule &&
        schedule.startsAt >= today &&
        schedule.startsAt <= nextWeek &&
        schedule.status === "scheduled"
      ) {
        if (!scheduleMap.has(schedule.id)) {
          scheduleMap.set(schedule.id, { ...schedule, bookingCount: 1 });
        } else {
          const existing = scheduleMap.get(schedule.id)!;
          existing.bookingCount++;
        }
      }
    }

    const myUpcomingSchedules = Array.from(scheduleMap.values()).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    );

    // Get pending assignments (via bookings)
    const pendingAssignments = await db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.status, "pending")
      ),
      with: {
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
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

      const whereConditions = [
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
      ];

      if (input.status) {
        whereConditions.push(eq(guideAssignments.status, input.status));
      }

      const assignments = await db.query.guideAssignments.findMany({
        where: and(...whereConditions),
        with: {
          booking: {
            with: {
              schedule: {
                with: {
                  tour: true,
                },
              },
              customer: true,
            },
          },
        },
        orderBy: (guideAssignments, { desc }) => [desc(guideAssignments.createdAt)],
      });

      // Filter by date range if provided (based on booking's schedule)
      // Type assertion needed for nested relations
      type AssignmentWithBooking = typeof assignments[number] & { booking: { schedule: { startsAt: Date } | null } };
      let filteredAssignments = assignments as AssignmentWithBooking[];
      if (input.dateRange?.from || input.dateRange?.to) {
        filteredAssignments = (assignments as AssignmentWithBooking[]).filter((assignment) => {
          const scheduleDate = assignment.booking.schedule?.startsAt;
          if (!scheduleDate) return false;
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
          booking: {
            with: {
              schedule: {
                with: {
                  tour: true,
                },
              },
              customer: true,
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

      // Verify the guide is assigned to this schedule (via any booking on this schedule)
      const assignmentCheck = await db.query.guideAssignments.findFirst({
        where: and(
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.organizationId, organizationId),
          eq(guideAssignments.status, "confirmed")
        ),
        with: {
          booking: true,
        },
      });

      // Check if assignment's booking is for this schedule
      if (!assignmentCheck || assignmentCheck.booking.scheduleId !== input.scheduleId) {
        // Double-check with a more complete query
        const allAssignments = await db.query.guideAssignments.findMany({
          where: and(
            eq(guideAssignments.guideId, guideId),
            eq(guideAssignments.organizationId, organizationId),
            eq(guideAssignments.status, "confirmed")
          ),
          with: {
            booking: true,
          },
        });

        const hasScheduleAssignment = allAssignments.some(
          (a) => a.booking.scheduleId === input.scheduleId
        );

        if (!hasScheduleAssignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not assigned to this schedule",
          });
        }
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
