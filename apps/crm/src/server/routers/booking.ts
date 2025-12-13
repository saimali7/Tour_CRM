import { z } from "zod";
import { format } from "date-fns";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { inngest } from "@/inngest";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const bookingFilterSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
  paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "failed"]).optional(),
  source: z.enum(["manual", "website", "api", "phone", "walk_in"]).optional(),
  customerId: z.string().optional(),
  scheduleId: z.string().optional(),
  tourId: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  search: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["createdAt", "total", "referenceNumber"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const participantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(["adult", "child", "infant"]),
  dietaryRequirements: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  notes: z.string().optional(),
});

const createBookingSchema = z.object({
  customerId: z.string(),
  scheduleId: z.string(),
  adultCount: z.number().min(1),
  childCount: z.number().min(0).optional(),
  infantCount: z.number().min(0).optional(),
  specialRequests: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  internalNotes: z.string().optional(),
  source: z.enum(["manual", "website", "api", "phone", "walk_in"]).optional(),
  sourceDetails: z.string().optional(),
  participants: z.array(participantSchema).optional(),
  subtotal: z.string().optional(),
  discount: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
});

const updateBookingSchema = z.object({
  adultCount: z.number().min(1).optional(),
  childCount: z.number().min(0).optional(),
  infantCount: z.number().min(0).optional(),
  specialRequests: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  internalNotes: z.string().optional(),
  discount: z.string().optional(),
  tax: z.string().optional(),
});

export const bookingRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: bookingFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getById(input.id);
    }),

  getByReference: protectedProcedure
    .input(z.object({ referenceNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getByReference(input.referenceNumber);
    }),

  create: adminProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.create(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateBookingSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.update(input.id, input.data);
    }),

  confirm: protectedProcedure
    .input(z.object({ id: z.string(), sendConfirmationEmail: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const booking = await services.booking.confirm(input.id);

      // Send confirmation email via Inngest if enabled
      if (input.sendConfirmationEmail && booking.customer && booking.schedule && booking.tour) {
        await inngest.send({
          name: "booking/confirmed",
          data: {
            organizationId: ctx.orgContext.organizationId,
            bookingId: booking.id,
            customerId: booking.customerId,
            customerEmail: booking.customer.email,
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            bookingReference: booking.referenceNumber,
            tourName: booking.tour.name,
            tourDate: format(new Date(booking.schedule.startsAt), "MMMM d, yyyy"),
            tourTime: format(new Date(booking.schedule.startsAt), "h:mm a"),
            participants: booking.totalParticipants,
            totalAmount: booking.total,
            currency: booking.currency,
          },
        });
      }

      return booking;
    }),

  cancel: adminProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
      sendCancellationEmail: z.boolean().default(true),
      refundAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const booking = await services.booking.cancel(input.id, input.reason);

      // Send cancellation email via Inngest if enabled
      if (input.sendCancellationEmail && booking.customer && booking.schedule && booking.tour) {
        await inngest.send({
          name: "booking/cancelled",
          data: {
            organizationId: ctx.orgContext.organizationId,
            bookingId: booking.id,
            customerId: booking.customerId,
            customerEmail: booking.customer.email,
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            bookingReference: booking.referenceNumber,
            tourName: booking.tour.name,
            tourDate: format(new Date(booking.schedule.startsAt), "MMMM d, yyyy"),
            tourTime: format(new Date(booking.schedule.startsAt), "h:mm a"),
            cancellationReason: input.reason,
            refundAmount: input.refundAmount,
            currency: booking.currency,
          },
        });
      }

      return booking;
    }),

  markNoShow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.markNoShow(input.id);
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.complete(input.id);
    }),

  reschedule: adminProcedure
    .input(z.object({
      id: z.string(),
      newScheduleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get old booking details for activity log
      const oldBooking = await services.booking.getById(input.id);
      const oldScheduleDate = oldBooking.schedule
        ? format(new Date(oldBooking.schedule.startsAt), "MMMM d, yyyy 'at' h:mm a")
        : "unknown";

      // Reschedule the booking
      const booking = await services.booking.reschedule(input.id, input.newScheduleId);

      const newScheduleDate = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy 'at' h:mm a")
        : "unknown";

      // Log the activity
      const userId = ctx.user?.id || "system";
      const userName = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "System";

      await services.activityLog.logBookingAction(
        "booking.rescheduled",
        booking.id,
        booking.referenceNumber,
        `Booking rescheduled from ${oldScheduleDate} to ${newScheduleDate}`,
        {
          actorType: "user",
          actorId: userId,
          actorName: userName,
          metadata: {
            oldScheduleId: oldBooking.scheduleId,
            newScheduleId: input.newScheduleId,
            oldDate: oldScheduleDate,
            newDate: newScheduleDate,
          },
        }
      );

      return booking;
    }),

  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "failed"]),
        paidAmount: z.string().optional(),
        stripePaymentIntentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.updatePaymentStatus(
        input.id,
        input.paymentStatus,
        input.paidAmount,
        input.stripePaymentIntentId
      );
    }),

  addParticipant: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        participant: participantSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.addParticipant(input.bookingId, input.participant);
    }),

  removeParticipant: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        participantId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.booking.removeParticipant(input.bookingId, input.participantId);
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ dateRange: dateRangeSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getStats(input.dateRange);
    }),

  getForSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getForSchedule(input.scheduleId);
    }),

  getTodaysBookings: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.booking.getTodaysBookings();
  }),
});
