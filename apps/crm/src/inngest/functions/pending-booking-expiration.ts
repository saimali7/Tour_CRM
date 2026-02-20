import { inngest } from "../client";
import { validateEventData, bookingCreatedSchema } from "../schemas";
import { logger } from "@tour/services";
import {
  and,
  bookings,
  checkoutAttempts,
  db,
  eq,
  lte,
  notInArray,
} from "@tour/database";

const EXPIRATION_REASON = "Booking expired after 30 minutes without payment";

/**
 * Expire website bookings that remain unpaid 30 minutes after creation.
 */
export const expirePendingWebsiteBooking = inngest.createFunction(
  {
    id: "expire-pending-website-booking",
    name: "Expire Pending Website Booking",
    retries: 2,
  },
  { event: "booking/created" },
  async ({ event, step }) => {
    const data = validateEventData(bookingCreatedSchema, event.data, "booking/created");

    await step.sleep("wait-30-minutes", "30m");

    const expirationCutoff = new Date(Date.now() - 30 * 60 * 1000);

    const [expiredBooking] = await step.run("expire-booking-if-still-pending", async () => {
      return db
        .update(bookings)
        .set({
          status: "cancelled",
          paymentStatus: "failed",
          cancelledAt: new Date(),
          cancellationReason: EXPIRATION_REASON,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.id, data.bookingId),
            eq(bookings.organizationId, data.organizationId),
            eq(bookings.source, "website"),
            eq(bookings.paymentStatus, "pending"),
            lte(bookings.createdAt, expirationCutoff),
            notInArray(bookings.status, ["cancelled", "completed", "no_show"])
          )
        )
        .returning({
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
        });
    });

    if (!expiredBooking) {
      return {
        expired: false,
        skipped: true,
        reason: "Booking already paid, already finalized, or not a website booking",
      };
    }

    logger.info(
      {
        bookingId: expiredBooking.id,
        referenceNumber: expiredBooking.referenceNumber,
        organizationId: data.organizationId,
      },
      "Expired pending website booking after payment timeout"
    );

    await step.run("mark-checkout-attempt-expired", async () => {
      await db
        .update(checkoutAttempts)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(checkoutAttempts.organizationId, data.organizationId),
            eq(checkoutAttempts.bookingId, expiredBooking.id)
          )
        );
    });

    return {
      expired: true,
      bookingId: expiredBooking.id,
      referenceNumber: expiredBooking.referenceNumber,
    };
  }
);
