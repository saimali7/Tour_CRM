import { z } from "zod";
import { format } from "date-fns";
import { createRouter, protectedProcedure, adminProcedure, bulkProcedure } from "../trpc";
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
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  type: z.enum(["adult", "child", "infant"]),
  dietaryRequirements: z.string().max(500).optional(),
  accessibilityNeeds: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

const priceStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal (e.g., 99.99)");

const pricingSnapshotSchema = z.object({
  optionId: z.string().optional(),
  optionName: z.string().optional(),
  pricingModel: z.any().optional(),
  experienceMode: z.enum(["join", "book", "charter"]).optional(),
  priceBreakdown: z.string().optional(),
}).optional();

const createBookingSchema = z.object({
  customerId: z.string().max(100),
  scheduleId: z.string().max(100),
  bookingOptionId: z.string().optional(),
  guestAdults: z.number().min(0).max(100).optional(),
  guestChildren: z.number().min(0).max(100).optional(),
  guestInfants: z.number().min(0).max(100).optional(),
  pricingSnapshot: pricingSnapshotSchema,
  adultCount: z.number().min(1).max(100),
  childCount: z.number().min(0).max(100).optional(),
  infantCount: z.number().min(0).max(100).optional(),
  specialRequests: z.string().max(2000).optional(),
  dietaryRequirements: z.string().max(500).optional(),
  accessibilityNeeds: z.string().max(500).optional(),
  internalNotes: z.string().max(5000).optional(),
  source: z.enum(["manual", "website", "api", "phone", "walk_in"]).optional(),
  sourceDetails: z.string().max(500).optional(),
  participants: z.array(participantSchema).max(100).optional(),
  subtotal: priceStringSchema.optional(),
  discount: priceStringSchema.optional(),
  tax: priceStringSchema.optional(),
  total: priceStringSchema.optional(),
});

const updateBookingSchema = z.object({
  adultCount: z.number().min(1).max(100).optional(),
  childCount: z.number().min(0).max(100).optional(),
  infantCount: z.number().min(0).max(100).optional(),
  specialRequests: z.string().max(2000).optional(),
  dietaryRequirements: z.string().max(500).optional(),
  accessibilityNeeds: z.string().max(500).optional(),
  internalNotes: z.string().max(5000).optional(),
  discount: priceStringSchema.optional(),
  tax: priceStringSchema.optional(),
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
      const booking = await services.booking.create(input);

      // Send booking created email via Inngest (only if customer has email)
      // Wrapped in try-catch so Inngest failures don't break booking creation
      if (booking.customer?.email && booking.schedule && booking.tour) {
        try {
          await inngest.send({
            name: "booking/created",
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
              meetingPoint: booking.tour.meetingPoint || undefined,
              meetingPointDetails: booking.tour.meetingPointDetails || undefined,
            },
          });
        } catch (inngestError) {
          console.error("Failed to send booking created event to Inngest:", inngestError);
        }
      }

      return booking;
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

      // Send confirmation email via Inngest if enabled (only if customer has email)
      if (input.sendConfirmationEmail && booking.customer?.email && booking.schedule && booking.tour) {
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
      id: z.string().max(100),
      reason: z.string().max(1000).optional(),
      sendCancellationEmail: z.boolean().default(true),
      refundAmount: priceStringSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const booking = await services.booking.cancel(input.id, input.reason);

      // Send cancellation email via Inngest if enabled (only if customer has email)
      if (input.sendCancellationEmail && booking.customer?.email && booking.schedule && booking.tour) {
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
      sendRescheduleEmail: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get old booking details for activity log
      const oldBooking = await services.booking.getById(input.id);
      const oldScheduleDate = oldBooking.schedule
        ? format(new Date(oldBooking.schedule.startsAt), "MMMM d, yyyy 'at' h:mm a")
        : "unknown";
      const oldTourDate = oldBooking.schedule
        ? format(new Date(oldBooking.schedule.startsAt), "MMMM d, yyyy")
        : "unknown";
      const oldTourTime = oldBooking.schedule
        ? format(new Date(oldBooking.schedule.startsAt), "h:mm a")
        : "unknown";

      // Reschedule the booking
      const booking = await services.booking.reschedule(input.id, input.newScheduleId);

      const newScheduleDate = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy 'at' h:mm a")
        : "unknown";
      const newTourDate = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy")
        : "unknown";
      const newTourTime = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "h:mm a")
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

      // Send reschedule email via Inngest if enabled (only if customer has email)
      if (input.sendRescheduleEmail && booking.customer?.email && booking.schedule && booking.tour) {
        await inngest.send({
          name: "booking/rescheduled",
          data: {
            organizationId: ctx.orgContext.organizationId,
            bookingId: booking.id,
            customerId: booking.customerId,
            customerEmail: booking.customer.email,
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            bookingReference: booking.referenceNumber,
            tourName: booking.tour.name,
            oldTourDate,
            oldTourTime,
            newTourDate,
            newTourTime,
            participants: booking.totalParticipants,
            meetingPoint: booking.tour.meetingPoint || undefined,
            meetingPointDetails: booking.tour.meetingPointDetails || undefined,
          },
        });
      }

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

  // Payment operations
  createPaymentLink: adminProcedure
    .input(
      z.object({
        bookingId: z.string(),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get booking with all details
      const booking = await services.booking.getById(input.bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Get organization for URLs
      const organization = await services.organization.get();
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Check if Stripe is configured
      const { isStripeConfigured } = await import("@/lib/stripe");
      if (!isStripeConfigured()) {
        throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.");
      }

      // Check if already paid
      if (booking.paymentStatus === "paid") {
        throw new Error("This booking has already been paid");
      }

      // Import stripe functions dynamically to avoid circular dependencies
      const { createCheckoutSession } = await import("@/lib/stripe");

      // Calculate amount to charge (total - already paid)
      const totalAmount = parseFloat(booking.total);
      const paidAmount = parseFloat(booking.paidAmount || "0");
      const amountDue = totalAmount - paidAmount;

      if (amountDue <= 0) {
        throw new Error("No payment due for this booking");
      }

      // Convert to cents
      const amountInCents = Math.round(amountDue * 100);

      // Create Stripe Checkout session
      const session = await createCheckoutSession({
        amount: amountInCents,
        currency: booking.currency,
        metadata: {
          organizationId: ctx.orgContext.organizationId,
          bookingId: booking.id,
          customerId: booking.customerId,
          bookingReference: booking.referenceNumber,
        },
        successUrl:
          input.successUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/org/${organization.slug}/bookings/${booking.id}?payment=success`,
        cancelUrl:
          input.cancelUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/org/${organization.slug}/bookings/${booking.id}?payment=cancelled`,
        customerEmail: booking.customer?.email || undefined,
      });

      return {
        url: session.url,
        sessionId: session.id,
        amountDue: amountDue.toFixed(2),
        currency: booking.currency,
      };
    }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const booking = await services.booking.getById(input.bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Get all manual payments
      const payments = await services.payment.listByBooking(input.bookingId);

      // Calculate totals
      const totalAmount = parseFloat(booking.total);
      const paidAmount = parseFloat(booking.paidAmount || "0");
      const balance = totalAmount - paidAmount;

      return {
        bookingId: booking.id,
        referenceNumber: booking.referenceNumber,
        total: booking.total,
        paidAmount: booking.paidAmount || "0",
        balance: balance.toFixed(2),
        currency: booking.currency,
        paymentStatus: booking.paymentStatus,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        payments: payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          recordedAt: p.recordedAt,
          recordedByName: p.recordedByName,
        })),
      };
    }),

  // Send payment link via email
  sendPaymentLinkEmail: adminProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get booking with all details
      const booking = await services.booking.getById(input.bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Check if customer has email
      if (!booking.customer?.email) {
        throw new Error("Customer does not have an email address");
      }

      // Get organization and settings
      const organization = await services.organization.get();
      if (!organization) {
        throw new Error("Organization not found");
      }

      const orgSettings = await services.organization.getSettings();

      // Check if Stripe is configured
      const { isStripeConfigured, createCheckoutSession } = await import("@/lib/stripe");
      if (!isStripeConfigured()) {
        throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.");
      }

      // Get payment settings with defaults
      const paymentLinkExpirationHours = orgSettings?.payment?.paymentLinkExpirationHours ?? 24;

      // Check if already paid
      if (booking.paymentStatus === "paid") {
        throw new Error("This booking has already been paid");
      }

      // Calculate amount due
      const totalAmount = parseFloat(booking.total);
      const paidAmount = parseFloat(booking.paidAmount || "0");
      const amountDue = totalAmount - paidAmount;

      if (amountDue <= 0) {
        throw new Error("No payment due for this booking");
      }

      // Create Stripe Checkout session
      const session = await createCheckoutSession({
        amount: Math.round(amountDue * 100),
        currency: booking.currency,
        metadata: {
          organizationId: ctx.orgContext.organizationId,
          bookingId: booking.id,
          customerId: booking.customerId,
          bookingReference: booking.referenceNumber,
        },
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/org/${organization.slug}/bookings/${booking.id}?payment=success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/org/${organization.slug}/bookings/${booking.id}?payment=cancelled`,
        customerEmail: booking.customer.email,
        expiresInHours: paymentLinkExpirationHours,
      });

      if (!session.url) {
        throw new Error("Failed to create payment link");
      }

      // Send email with payment link
      const { createEmailService } = await import("@tour/emails");
      const emailService = createEmailService({
        name: organization.name,
        email: organization.email,
        phone: organization.phone ?? undefined,
        logoUrl: organization.logoUrl ?? undefined,
      });

      const tourDate = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy")
        : "Scheduled Date";
      const tourTime = booking.schedule
        ? format(new Date(booking.schedule.startsAt), "h:mm a")
        : "Scheduled Time";

      const emailResult = await emailService.sendPaymentLinkEmail({
        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
        customerEmail: booking.customer.email,
        bookingReference: booking.referenceNumber,
        tourName: booking.tour?.name || "Tour",
        tourDate,
        tourTime,
        participants: booking.totalParticipants,
        amount: amountDue.toFixed(2),
        currency: booking.currency,
        paymentUrl: session.url,
        expiresAt: new Date(Date.now() + paymentLinkExpirationHours * 60 * 60 * 1000).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      });

      // Log activity
      const userName = ctx.user
        ? [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email
        : "Unknown User";
      await services.activityLog.log({
        entityType: "booking",
        entityId: booking.id,
        action: "booking.payment_link_sent",
        description: `Payment link sent to ${booking.customer.email} for ${booking.currency} ${amountDue.toFixed(2)}`,
        actorType: "user",
        actorId: ctx.user?.id,
        actorName: userName,
        metadata: {
          emailSent: emailResult.success,
          amount: amountDue.toFixed(2),
          currency: booking.currency,
        },
      });

      return {
        success: true,
        url: session.url,
        emailSent: emailResult.success,
        amount: amountDue.toFixed(2),
        currency: booking.currency,
      };
    }),

  // ============================================
  // Bulk Operations
  // ============================================

  bulkConfirm: bulkProcedure
    .input(z.object({
      ids: z.array(z.string()).min(1).max(100),
      sendConfirmationEmails: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const result = await services.booking.bulkConfirm(input.ids);

      // Send confirmation emails via Inngest for successful confirmations
      if (input.sendConfirmationEmails && result.confirmed.length > 0) {
        // Get booking details for emails
        for (const id of result.confirmed) {
          const booking = await services.booking.getById(id);
          if (booking.customer?.email && booking.schedule && booking.tour) {
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
                tourDate: format(booking.schedule.startsAt, "EEEE, MMMM d, yyyy"),
                tourTime: format(booking.schedule.startsAt, "h:mm a"),
                participants: booking.totalParticipants,
                totalAmount: booking.total,
                currency: booking.currency,
                meetingPoint: booking.tour.meetingPoint ?? undefined,
                meetingPointDetails: booking.tour.meetingPointDetails ?? undefined,
              },
            });
          }
        }
      }

      return result;
    }),

  bulkCancel: bulkProcedure
    .input(z.object({
      ids: z.array(z.string().max(100)).min(1).max(100),
      reason: z.string().max(1000).optional(),
      sendCancellationEmails: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const result = await services.booking.bulkCancel(input.ids, input.reason);

      // Send cancellation emails via Inngest for successful cancellations
      if (input.sendCancellationEmails && result.cancelled.length > 0) {
        for (const id of result.cancelled) {
          const booking = await services.booking.getById(id);
          if (booking.customer?.email && booking.schedule && booking.tour) {
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
                tourDate: format(booking.schedule.startsAt, "EEEE, MMMM d, yyyy"),
                tourTime: format(booking.schedule.startsAt, "h:mm a"),
                cancellationReason: input.reason,
                currency: booking.currency,
              },
            });
          }
        }
      }

      return result;
    }),

  bulkUpdatePaymentStatus: bulkProcedure
    .input(z.object({
      ids: z.array(z.string()).min(1).max(100),
      paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "failed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.bulkUpdatePaymentStatus(input.ids, input.paymentStatus);
    }),

  bulkReschedule: bulkProcedure
    .input(z.object({
      ids: z.array(z.string()).min(1).max(100),
      newScheduleId: z.string(),
      sendRescheduleEmails: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const result = await services.booking.bulkReschedule(input.ids, input.newScheduleId);

      // Get new schedule info for emails
      const newSchedule = await services.schedule.getById(input.newScheduleId);
      const newTourDate = newSchedule ? format(new Date(newSchedule.startsAt), "MMMM d, yyyy") : "unknown";
      const newTourTime = newSchedule ? format(new Date(newSchedule.startsAt), "h:mm a") : "unknown";

      // Send reschedule emails via Inngest for successful reschedules
      if (input.sendRescheduleEmails && result.rescheduled.length > 0) {
        for (const id of result.rescheduled) {
          const booking = await services.booking.getById(id);
          if (booking.customer?.email && booking.tour) {
            await inngest.send({
              name: "booking/rescheduled",
              data: {
                organizationId: ctx.orgContext.organizationId,
                bookingId: booking.id,
                customerId: booking.customerId,
                customerEmail: booking.customer.email,
                customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                bookingReference: booking.referenceNumber,
                tourName: booking.tour.name,
                oldTourDate: "Previous date",
                oldTourTime: "Previous time",
                newTourDate,
                newTourTime,
                participants: booking.totalParticipants,
                meetingPoint: booking.tour.meetingPoint || undefined,
                meetingPointDetails: booking.tour.meetingPointDetails || undefined,
              },
            });
          }
        }
      }

      return result;
    }),
});
