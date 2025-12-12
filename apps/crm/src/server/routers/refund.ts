import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { stripe, getConnectAccount } from "@/lib/stripe";

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const refundFilterSchema = z.object({
  bookingId: z.string().optional(),
  status: z.enum(["pending", "processing", "succeeded", "failed", "cancelled"]).optional(),
  dateRange: dateRangeSchema.optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

const createRefundSchema = z.object({
  bookingId: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.enum(["customer_request", "booking_cancelled", "schedule_cancelled", "duplicate", "fraudulent", "other"]),
  reasonDetails: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const refundRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        filters: refundFilterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.refund.getAll(input.filters, input.pagination);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.refund.getById(input.id);
    }),

  getForBooking: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.refund.getForBooking(input.bookingId);
    }),

  getStats: protectedProcedure
    .input(z.object({ dateRange: dateRangeSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.refund.getStats(input?.dateRange);
    }),

  create: protectedProcedure
    .input(createRefundSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const userId = ctx.user?.id || "system";
      const userName = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "System";

      // Create refund record
      const refund = await services.refund.create({
        ...input,
        processedBy: userId,
        processedByName: userName,
      });

      // Get booking reference for activity log
      const booking = await services.booking.getById(input.bookingId);

      // Log activity
      await services.activityLog.logBookingAction(
        "booking.refunded",
        input.bookingId,
        booking.referenceNumber,
        `Refund of $${input.amount} initiated (${input.reason.replace("_", " ")})`,
        {
          actorType: "user",
          actorId: userId,
          actorName: userName,
          metadata: {
            refundId: refund.id,
            amount: input.amount,
            reason: input.reason,
          },
        }
      );

      return refund;
    }),

  process: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get the refund
      const refund = await services.refund.getById(input.id);

      if (refund.status !== "pending") {
        throw new Error(`Cannot process refund in '${refund.status}' status`);
      }

      // Get organization for Stripe Connect account
      const org = await services.organization.get();

      if (!refund.stripePaymentIntentId) {
        throw new Error("No Stripe payment intent associated with this refund");
      }

      // Mark as processing
      await services.refund.markProcessing(input.id);

      try {
        // Process refund via Stripe
        const amountInCents = Math.round(parseFloat(refund.amount) * 100);

        // If org has Stripe Connect, process as connected account refund
        if (org.stripeConnectAccountId) {
          const stripeRefund = await stripe.refunds.create(
            {
              payment_intent: refund.stripePaymentIntentId,
              amount: amountInCents,
              reason: mapReasonToStripe(refund.reason),
            },
            {
              stripeAccount: org.stripeConnectAccountId,
            }
          );

          // Mark as succeeded
          const updatedRefund = await services.refund.markSucceeded(input.id, stripeRefund.id);

          // Log success
          await services.activityLog.logBookingAction(
            "booking.refunded",
            refund.bookingId,
            refund.booking?.referenceNumber || refund.bookingId,
            `Refund of $${refund.amount} processed successfully`,
            {
              actorType: "system",
              metadata: {
                refundId: refund.id,
                stripeRefundId: stripeRefund.id,
              },
            }
          );

          return { success: true, refund: updatedRefund };
        } else {
          // Direct refund (no Connect account)
          const stripeRefund = await stripe.refunds.create({
            payment_intent: refund.stripePaymentIntentId,
            amount: amountInCents,
            reason: mapReasonToStripe(refund.reason),
          });

          const updatedRefund = await services.refund.markSucceeded(input.id, stripeRefund.id);

          await services.activityLog.logBookingAction(
            "booking.refunded",
            refund.bookingId,
            refund.booking?.referenceNumber || refund.bookingId,
            `Refund of $${refund.amount} processed successfully`,
            {
              actorType: "system",
              metadata: {
                refundId: refund.id,
                stripeRefundId: stripeRefund.id,
              },
            }
          );

          return { success: true, refund: updatedRefund };
        }
      } catch (error) {
        // Mark as failed
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const updatedRefund = await services.refund.markFailed(input.id, errorMessage);

        // Log failure
        await services.activityLog.logBookingAction(
          "booking.refunded",
          refund.bookingId,
          refund.booking?.referenceNumber || refund.bookingId,
          `Refund of $${refund.amount} failed: ${errorMessage}`,
          {
            actorType: "system",
            metadata: {
              refundId: refund.id,
              error: errorMessage,
            },
          }
        );

        return { success: false, refund: updatedRefund, error: errorMessage };
      }
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.refund.cancel(input.id);
    }),
});

// Map our reason types to Stripe's reason types
function mapReasonToStripe(reason: string): "duplicate" | "fraudulent" | "requested_by_customer" | undefined {
  switch (reason) {
    case "duplicate":
      return "duplicate";
    case "fraudulent":
      return "fraudulent";
    case "customer_request":
      return "requested_by_customer";
    default:
      return "requested_by_customer";
  }
}
