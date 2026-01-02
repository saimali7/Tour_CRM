import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { TRPCError } from "@trpc/server";
import { getGuideContext } from "../../lib/guide-auth";
import { db, eq, and, gte, lte, inArray } from "@tour/database";
import { bookings, guideAssignments } from "@tour/database/schema";

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
   * Returns upcoming tour runs and pending assignments
   */
  getMyDashboard: guideProcedure.query(async ({ ctx }) => {
    const { guideId, organizationId } = ctx.guideContext;

    // Get upcoming tours (next 7 days) where the guide has confirmed assignments
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // First get confirmed assignments for this guide that link to upcoming bookings
    const confirmedAssignments = await db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, organizationId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.status, "confirmed")
      ),
      with: {
        booking: {
          with: {
            tour: true,
          },
        },
      },
    });

    // Filter to upcoming bookings and deduplicate by tour run key (tourId + bookingDate + bookingTime)
    type TourRunInfo = {
      tourId: string;
      tourName: string;
      bookingDate: Date;
      bookingTime: string;
      bookingCount: number;
    };
    type BookingWithTour = typeof confirmedAssignments[number]["booking"] & {
      tour: { id: string; name: string } | null;
    };
    const tourRunMap = new Map<string, TourRunInfo>();
    for (const assignment of confirmedAssignments) {
      const booking = assignment.booking as BookingWithTour;
      if (
        booking &&
        booking.bookingDate &&
        booking.bookingTime &&
        booking.tour &&
        booking.bookingDate >= today &&
        booking.bookingDate <= nextWeek &&
        (booking.status === "pending" || booking.status === "confirmed")
      ) {
        const tourRunKey = `${booking.tourId}|${booking.bookingDate.toISOString().split("T")[0]}|${booking.bookingTime}`;
        if (!tourRunMap.has(tourRunKey)) {
          tourRunMap.set(tourRunKey, {
            tourId: booking.tourId!,
            tourName: booking.tour.name,
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            bookingCount: 1,
          });
        } else {
          const existing = tourRunMap.get(tourRunKey)!;
          existing.bookingCount++;
        }
      }
    }

    const myUpcomingTourRuns = Array.from(tourRunMap.values()).sort(
      (a, b) => a.bookingDate.getTime() - b.bookingDate.getTime()
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
            tour: true,
          },
        },
      },
      orderBy: (guideAssignments, { desc }) => [desc(guideAssignments.createdAt)],
    });

    return {
      upcomingTourRuns: myUpcomingTourRuns,
      pendingAssignments,
      stats: {
        upcomingCount: myUpcomingTourRuns.length,
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
              tour: true,
              customer: true,
            },
          },
        },
        orderBy: (guideAssignments, { desc }) => [desc(guideAssignments.createdAt)],
      });

      // Filter by date range if provided (based on booking's bookingDate)
      let filteredAssignments = assignments;
      if (input.dateRange?.from || input.dateRange?.to) {
        filteredAssignments = assignments.filter((assignment) => {
          const bookingDate = assignment.booking?.bookingDate;
          if (!bookingDate) return false;
          if (input.dateRange?.from && bookingDate < input.dateRange.from) {
            return false;
          }
          if (input.dateRange?.to && bookingDate > input.dateRange.to) {
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
              tour: true,
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
   * Get tour run manifest with participant details
   */
  getTourRunManifest: guideProcedure
    .input(z.object({
      tourId: z.string(),
      date: z.coerce.date(),
      time: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { guideId, organizationId } = ctx.guideContext;

      const dateStr = input.date.toISOString().split("T")[0];
      const tourRunKey = `${input.tourId}|${dateStr}|${input.time}`;

      // Verify the guide is assigned to this tour run (via any booking on this tour run)
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

      const hasTourRunAssignment = allAssignments.some((a) => {
        const booking = a.booking;
        if (!booking || !booking.tourId || !booking.bookingDate || !booking.bookingTime) return false;
        const assignmentTourRunKey = `${booking.tourId}|${booking.bookingDate.toISOString().split("T")[0]}|${booking.bookingTime}`;
        return assignmentTourRunKey === tourRunKey;
      });

      if (!hasTourRunAssignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not assigned to this tour run",
        });
      }

      // Get all confirmed bookings for this tour run
      type BookingWithRelations = Awaited<ReturnType<typeof db.query.bookings.findMany>>[number] & {
        tour: { id: string; name: string; maxParticipants: number } | null;
        customer: { id: string; firstName: string; lastName: string; email: string | null } | null;
      };
      const tourRunBookings = await db.query.bookings.findMany({
        where: and(
          eq(bookings.tourId, input.tourId),
          eq(bookings.organizationId, organizationId),
          eq(bookings.status, "confirmed")
        ),
        with: {
          customer: true,
          tour: true,
        },
        orderBy: (bookings, { asc }) => [asc(bookings.createdAt)],
      }) as BookingWithRelations[];

      // Filter by date and time (date is stored as Date, need to compare)
      const filteredBookings = tourRunBookings.filter((b) => {
        if (!b.bookingDate || !b.bookingTime) return false;
        const bookingDateStr = b.bookingDate.toISOString().split("T")[0];
        return bookingDateStr === dateStr && b.bookingTime === input.time;
      });

      const tour = filteredBookings[0]?.tour;

      if (filteredBookings.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No bookings found for this tour run",
        });
      }

      // Calculate totals
      const totalParticipants = filteredBookings.reduce(
        (sum: number, booking) => sum + (booking.totalParticipants || 0),
        0
      );

      const totalRevenue = filteredBookings.reduce(
        (sum: number, booking) => sum + parseFloat(booking.total || "0"),
        0
      );

      return {
        tourRun: {
          tourId: input.tourId,
          tourName: tour?.name || "Unknown Tour",
          date: input.date,
          time: input.time,
          maxParticipants: tour?.maxParticipants || 0,
        },
        manifest: filteredBookings,
        stats: {
          totalBookings: filteredBookings.length,
          totalParticipants,
          totalRevenue: totalRevenue.toFixed(2),
          spotsRemaining: (tour?.maxParticipants || 0) - totalParticipants,
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
