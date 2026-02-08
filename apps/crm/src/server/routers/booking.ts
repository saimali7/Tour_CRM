import { z } from "zod";
import { format } from "date-fns";
import { createRouter, protectedProcedure, adminProcedure, bulkProcedure } from "../trpc";
import { createServices, bookingLogger, NotFoundError, ValidationError, ServiceError } from "@tour/services";
import { sendEvent } from "@/inngest/helpers";
import { priceStringSchema } from "@tour/validators";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const bookingFilterSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
  paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "failed"]).optional(),
  source: z.enum(["manual", "website", "api", "phone", "walk_in"]).optional(),
  customerId: z.string().optional(),
  tourId: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  bookingDateRange: dateRangeSchema.optional(), // Filter by booking date (tour date)
  search: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["createdAt", "total", "referenceNumber", "bookingDate"]).default("createdAt"),
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

// priceStringSchema is imported from @tour/validators

const pricingSnapshotSchema = z.object({
  optionId: z.string().optional(),
  optionName: z.string().optional(),
  pricingModel: z.any().optional(),
  experienceMode: z.enum(["join", "book", "charter"]).optional(),
  priceBreakdown: z.string().optional(),
}).optional();

const createBookingSchema = z.object({
  customerId: z.string().max(100),

  // Availability-based booking (required)
  tourId: z.string().max(100),
  bookingDate: z.string(), // ISO date string YYYY-MM-DD
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),

  bookingOptionId: z.string().optional(),

  // Primary guest counts
  guestAdults: z.number().int().min(1).max(100).default(1),
  guestChildren: z.number().int().min(0).max(100).default(0),
  guestInfants: z.number().int().min(0).max(100).default(0),

  pricingSnapshot: pricingSnapshotSchema,

  // Legacy guest counts (backward compat)
  adultCount: z.number().int().min(1).max(100).optional(),
  childCount: z.number().int().min(0).max(100).optional(),
  infantCount: z.number().int().min(0).max(100).optional(),

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

      // Convert bookingDate string to Date and ensure adultCount is set for the service layer
      const serviceInput = {
        customerId: input.customerId,
        tourId: input.tourId,
        bookingDate: new Date(input.bookingDate),
        bookingTime: input.bookingTime,
        bookingOptionId: input.bookingOptionId,
        guestAdults: input.guestAdults,
        guestChildren: input.guestChildren,
        guestInfants: input.guestInfants,
        pricingSnapshot: input.pricingSnapshot,
        // Ensure adultCount is always set - use legacy field if provided, otherwise use guestAdults
        adultCount: input.adultCount ?? input.guestAdults,
        childCount: input.childCount ?? input.guestChildren ?? 0,
        infantCount: input.infantCount ?? input.guestInfants ?? 0,
        specialRequests: input.specialRequests,
        dietaryRequirements: input.dietaryRequirements,
        accessibilityNeeds: input.accessibilityNeeds,
        internalNotes: input.internalNotes,
        source: input.source,
        sourceDetails: input.sourceDetails,
        participants: input.participants,
        subtotal: input.subtotal,
        discount: input.discount,
        tax: input.tax,
        total: input.total,
      };

      const booking = await services.booking.create(serviceInput);

      // Send booking created email via Inngest (only if customer has email)
      // Uses fire-and-forget helper - failures are logged but don't block booking creation
      if (booking.customer?.email && booking.bookingDate && booking.tour) {
        await sendEvent(
          {
            name: "booking/created",
            data: {
              organizationId: ctx.orgContext.organizationId,
              bookingId: booking.id,
              customerId: booking.customerId,
              customerEmail: booking.customer.email,
              customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
              bookingReference: booking.referenceNumber,
              tourName: booking.tour.name,
              tourDate: format(new Date(booking.bookingDate), "MMMM d, yyyy"),
              tourTime: booking.bookingTime || "N/A",
              participants: booking.totalParticipants,
              totalAmount: booking.total,
              currency: booking.currency,
              meetingPoint: booking.tour.meetingPoint || undefined,
              meetingPointDetails: booking.tour.meetingPointDetails || undefined,
            },
          },
          { operation: "createBooking", id: booking.id }
        );
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

  confirm: adminProcedure
    .input(z.object({ id: z.string(), sendConfirmationEmail: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const booking = await services.booking.confirm(input.id);

      // Send confirmation email via Inngest if enabled (only if customer has email)
      if (input.sendConfirmationEmail && booking.customer?.email && booking.bookingDate && booking.tour) {
        await sendEvent(
          {
            name: "booking/confirmed",
            data: {
              organizationId: ctx.orgContext.organizationId,
              bookingId: booking.id,
              customerId: booking.customerId,
              customerEmail: booking.customer.email,
              customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
              bookingReference: booking.referenceNumber,
              tourName: booking.tour.name,
              tourDate: format(new Date(booking.bookingDate), "MMMM d, yyyy"),
              tourTime: booking.bookingTime || "N/A",
              participants: booking.totalParticipants,
              totalAmount: booking.total,
              currency: booking.currency,
            },
          },
          { operation: "confirmBooking", id: booking.id }
        );
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
      if (input.sendCancellationEmail && booking.customer?.email && booking.bookingDate && booking.tour) {
        await sendEvent(
          {
            name: "booking/cancelled",
            data: {
              organizationId: ctx.orgContext.organizationId,
              bookingId: booking.id,
              customerId: booking.customerId,
              customerEmail: booking.customer.email,
              customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
              bookingReference: booking.referenceNumber,
              tourName: booking.tour.name,
              tourDate: format(new Date(booking.bookingDate), "MMMM d, yyyy"),
              tourTime: booking.bookingTime || "N/A",
              cancellationReason: input.reason,
              refundAmount: input.refundAmount,
              currency: booking.currency,
            },
          },
          { operation: "cancelBooking", id: booking.id }
        );
      }

      return booking;
    }),

  markNoShow: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.markNoShow(input.id);
    }),

  complete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.complete(input.id);
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

  getTodaysBookings: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.booking.getTodaysBookings();
  }),

  // Urgency-based views for "Needs Action" UI
  getGroupedByUrgency: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.booking.getGroupedByUrgency();
  }),

  getNeedsAction: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.booking.getNeedsAction();
  }),

  getUpcoming: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getUpcoming(input.days);
    }),

  getTodayWithUrgency: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.booking.getTodayWithUrgency();
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
        throw new NotFoundError("Booking", input.bookingId);
      }

      // Get organization for URLs
      const organization = await services.organization.get();
      if (!organization) {
        throw new NotFoundError("Organization");
      }

      // Check if Stripe is configured
      const { isStripeConfigured } = await import("@/lib/stripe");
      if (!isStripeConfigured()) {
        throw new ServiceError("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.", "STRIPE_NOT_CONFIGURED", 503);
      }

      // Check if already paid
      if (booking.paymentStatus === "paid") {
        throw new ValidationError("This booking has already been paid");
      }

      // Import stripe functions dynamically to avoid circular dependencies
      const { createCheckoutSession } = await import("@/lib/stripe");

      // Calculate amount to charge (total - already paid)
      const totalAmount = parseFloat(booking.total);
      const paidAmount = parseFloat(booking.paidAmount || "0");
      const amountDue = totalAmount - paidAmount;

      if (amountDue <= 0) {
        throw new ValidationError("No payment due for this booking");
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
        throw new NotFoundError("Booking", input.bookingId);
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
        throw new NotFoundError("Booking", input.bookingId);
      }

      // Check if customer has email
      if (!booking.customer?.email) {
        throw new ValidationError("Customer does not have an email address");
      }

      // Get organization and settings
      const organization = await services.organization.get();
      if (!organization) {
        throw new NotFoundError("Organization");
      }

      const orgSettings = await services.organization.getSettings();

      // Check if Stripe is configured
      const { isStripeConfigured, createCheckoutSession } = await import("@/lib/stripe");
      if (!isStripeConfigured()) {
        throw new ServiceError("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.", "STRIPE_NOT_CONFIGURED", 503);
      }

      // Get payment settings with defaults
      const paymentLinkExpirationHours = orgSettings?.payment?.paymentLinkExpirationHours ?? 24;

      // Check if already paid
      if (booking.paymentStatus === "paid") {
        throw new ValidationError("This booking has already been paid");
      }

      // Calculate amount due
      const totalAmount = parseFloat(booking.total);
      const paidAmount = parseFloat(booking.paidAmount || "0");
      const amountDue = totalAmount - paidAmount;

      if (amountDue <= 0) {
        throw new ValidationError("No payment due for this booking");
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
        throw new ServiceError("Failed to create payment link", "PAYMENT_LINK_FAILED", 500);
      }

      // Send email with payment link
      const { createEmailService } = await import("@tour/emails");
      const emailService = createEmailService({
        name: organization.name,
        email: organization.email,
        phone: organization.phone ?? undefined,
        logoUrl: organization.logoUrl ?? undefined,
      });

      const tourDate = booking.bookingDate
        ? format(new Date(booking.bookingDate), "MMMM d, yyyy")
        : "Scheduled Date";
      const tourTime = booking.bookingTime || "Scheduled Time";

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
          if (booking.customer?.email && booking.bookingDate && booking.tour) {
            await sendEvent(
              {
                name: "booking/confirmed",
                data: {
                  organizationId: ctx.orgContext.organizationId,
                  bookingId: booking.id,
                  customerId: booking.customerId,
                  customerEmail: booking.customer.email,
                  customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                  bookingReference: booking.referenceNumber,
                  tourName: booking.tour.name,
                  tourDate: format(new Date(booking.bookingDate), "EEEE, MMMM d, yyyy"),
                  tourTime: booking.bookingTime || "N/A",
                  participants: booking.totalParticipants,
                  totalAmount: booking.total,
                  currency: booking.currency,
                  meetingPoint: booking.tour.meetingPoint ?? undefined,
                  meetingPointDetails: booking.tour.meetingPointDetails ?? undefined,
                },
              },
              { operation: "bulkConfirm", id }
            );
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
          if (booking.customer?.email && booking.bookingDate && booking.tour) {
            await sendEvent(
              {
                name: "booking/cancelled",
                data: {
                  organizationId: ctx.orgContext.organizationId,
                  bookingId: booking.id,
                  customerId: booking.customerId,
                  customerEmail: booking.customer.email,
                  customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                  bookingReference: booking.referenceNumber,
                  tourName: booking.tour.name,
                  tourDate: format(new Date(booking.bookingDate), "EEEE, MMMM d, yyyy"),
                  tourTime: booking.bookingTime || "N/A",
                  cancellationReason: input.reason,
                  currency: booking.currency,
                },
              },
              { operation: "bulkCancel", id }
            );
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
});
