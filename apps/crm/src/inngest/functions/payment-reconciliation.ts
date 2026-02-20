import {
  and,
  bookings,
  checkoutAttempts,
  db,
  eq,
  isNotNull,
  lte,
  notInArray,
  organizations,
  or,
} from "@tour/database";
import { webhookLogger } from "@tour/services";
import { inngest } from "../client";
import { retrievePaymentIntent } from "@/lib/stripe";

const AUTO_EXPIRED_REASON = "Booking expired after 30 minutes without payment";

export const reconcilePendingWebsitePayments = inngest.createFunction(
  {
    id: "reconcile-pending-website-payments",
    name: "Reconcile Pending Website Payments",
    retries: 1,
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { skipped: true, reason: "Stripe not configured" };
    }

    const activeOrganizations = await step.run("load-active-organizations", async () =>
      db
        .select({ id: organizations.id, slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.status, "active"))
    );

    let inspected = 0;
    let healed = 0;
    let failures = 0;

    for (const org of activeOrganizations) {
      const candidates = await step.run(`load-candidates-${org.id}`, async () => {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000);
        return db
          .select({
            id: bookings.id,
            organizationId: bookings.organizationId,
            status: bookings.status,
            cancellationReason: bookings.cancellationReason,
            paymentStatus: bookings.paymentStatus,
            paidAmount: bookings.paidAmount,
            total: bookings.total,
            depositRequired: bookings.depositRequired,
            depositPaid: bookings.depositPaid,
            stripePaymentIntentId: bookings.stripePaymentIntentId,
          })
          .from(bookings)
          .where(
            and(
              eq(bookings.organizationId, org.id),
              eq(bookings.source, "website"),
              or(eq(bookings.paymentStatus, "pending"), eq(bookings.paymentStatus, "partial")),
              isNotNull(bookings.stripePaymentIntentId),
              lte(bookings.createdAt, cutoff),
              notInArray(bookings.status, ["completed", "no_show"])
            )
          )
          .limit(200);
      });

      for (const booking of candidates) {
        if (!booking.stripePaymentIntentId) continue;
        inspected += 1;

        try {
          const paymentIntent = await retrievePaymentIntent(booking.stripePaymentIntentId);
          if (paymentIntent.status !== "succeeded") {
            continue;
          }

          const received = (paymentIntent.amount_received || paymentIntent.amount) / 100;
          if (!Number.isFinite(received) || received <= 0) {
            continue;
          }

          const currentPaidAmount = parseFloat(booking.paidAmount || "0");
          const totalAmount = parseFloat(booking.total || "0");
          const nextPaidAmount = Math.min(totalAmount, Math.max(currentPaidAmount, received));
          const nextPaymentStatus =
            nextPaidAmount >= totalAmount ? "paid" : nextPaidAmount > 0 ? "partial" : "pending";
          const nextStatus =
            booking.status === "cancelled" &&
            booking.cancellationReason === AUTO_EXPIRED_REASON
              ? "confirmed"
              : booking.status === "pending"
                ? "confirmed"
                : booking.status;
          const depositRequired = parseFloat(booking.depositRequired || "0");
          const currentDepositPaid = parseFloat(booking.depositPaid || "0");
          const nextDepositPaid =
            depositRequired > 0
              ? Math.min(depositRequired, Math.max(currentDepositPaid, received))
              : currentDepositPaid;

          const shouldUpdate =
            booking.paymentStatus !== nextPaymentStatus ||
            booking.status !== nextStatus ||
            currentPaidAmount !== nextPaidAmount;

          if (!shouldUpdate) {
            continue;
          }

          const bookingUpdatePayload: {
            paymentStatus: "pending" | "partial" | "paid";
            paidAmount: string;
            status: typeof booking.status;
            confirmedAt: Date | null;
            cancelledAt?: Date | null;
            cancellationReason?: string | null;
            depositPaid: string | null;
            depositPaidAt?: Date | null;
            balancePaidAt?: Date | null;
            updatedAt: Date;
          } = {
            paymentStatus: nextPaymentStatus,
            paidAmount: nextPaidAmount.toFixed(2),
            status: nextStatus,
            confirmedAt: nextStatus === "confirmed" ? new Date() : null,
            depositPaid: depositRequired > 0 ? nextDepositPaid.toFixed(2) : booking.depositPaid,
            updatedAt: new Date(),
          };

          if (nextStatus === "confirmed") {
            bookingUpdatePayload.cancelledAt = null;
            bookingUpdatePayload.cancellationReason = null;
          }
          if (depositRequired > 0 && nextDepositPaid > 0) {
            bookingUpdatePayload.depositPaidAt = new Date();
          }
          if (nextPaymentStatus === "paid") {
            bookingUpdatePayload.balancePaidAt = new Date();
          }

          await db
            .update(bookings)
            .set(bookingUpdatePayload)
            .where(
              and(
                eq(bookings.id, booking.id),
                eq(bookings.organizationId, booking.organizationId)
              )
            );

          await db
            .update(checkoutAttempts)
            .set({
              status: "paid",
              stripePaymentIntentId: paymentIntent.id,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(checkoutAttempts.organizationId, booking.organizationId),
                eq(checkoutAttempts.bookingId, booking.id)
              )
            );

          healed += 1;
        } catch (error) {
          failures += 1;
          webhookLogger.warn(
            {
              err: error,
              organizationId: org.id,
              bookingId: booking.id,
              stripePaymentIntentId: booking.stripePaymentIntentId,
            },
            "Payment reconciliation failed for booking"
          );
        }
      }
    }

    if (failures > 5 || healed > 0) {
      webhookLogger.warn(
        {
          inspected,
          healed,
          failures,
        },
        "Payment reconciliation summary"
      );
    }

    return {
      inspected,
      healed,
      failures,
    };
  }
);
