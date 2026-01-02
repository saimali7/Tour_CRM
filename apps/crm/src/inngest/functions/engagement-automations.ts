import { inngest } from "../client";
import { createServices, logger } from "@tour/services";
import { format } from "date-fns";

/**
 * Send review request emails after tour completion
 * Runs on a schedule to find completed tours and send review requests
 */
export const sendReviewRequests = inngest.createFunction(
  {
    id: "send-review-requests",
    name: "Send Review Requests",
    retries: 2,
  },
  { event: "automation/send-review-requests" },
  async ({ event, step }) => {
    const { organizationId } = event.data;
    const services = createServices({ organizationId });

    // Check if automation is enabled
    const automation = await step.run("check-automation", async () => {
      return services.communication.getAutomationByType("review_request");
    });

    if (!automation?.isActive) {
      return { skipped: true, reason: "Automation disabled" };
    }

    // Get template
    const template = await step.run("get-template", async () => {
      return services.communication.getEmailTemplateByType("review_request");
    });

    if (!template) {
      return { skipped: true, reason: "No template configured" };
    }

    // Get completed bookings from the last 24-48 hours that haven't received a review request
    const completedBookings = await step.run("get-completed-bookings", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Get bookings where bookingDate is between 24-48 hours ago (completed tours)
      const { db, bookings: bookingsTable, communicationLogs } = await import("@tour/database");
      const { eq, and, lte, gte, isNull } = await import("drizzle-orm");

      const completedBookingsQuery = await db
        .select({
          id: bookingsTable.id,
          customerId: bookingsTable.customerId,
          tourId: bookingsTable.tourId,
        })
        .from(bookingsTable)
        .leftJoin(
          communicationLogs,
          and(
            eq(communicationLogs.bookingId, bookingsTable.id),
            eq(communicationLogs.templateName, 'review_request')
          )
        )
        .where(
          and(
            eq(bookingsTable.organizationId, organizationId),
            eq(bookingsTable.status, 'completed'),
            lte(bookingsTable.bookingDate, yesterday),
            gte(bookingsTable.bookingDate, twoDaysAgo),
            isNull(communicationLogs.id) // No review request sent yet
          )
        );

      return completedBookingsQuery;
    });

    let emailsSent = 0;
    for (const booking of completedBookings) {
      if (booking.id) {
        await step.run(`send-review-request-${booking.id}`, async () => {
          // This would send the review request email
          // Implementation depends on review platform integration
          emailsSent++;
        });
      }
    }

    return { emailsSent };
  }
);

/**
 * Check and notify customers when spots become available
 */
export const checkAvailabilityAlerts = inngest.createFunction(
  {
    id: "check-availability-alerts",
    name: "Check Availability Alerts",
    retries: 2,
  },
  { event: "automation/check-availability-alerts" },
  async ({ event, step }) => {
    const { organizationId, tourId, availableSpots } = event.data;
    const services = createServices({ organizationId });

    // Check if automation is enabled
    const automation = await step.run("check-automation", async () => {
      return services.communication.getAutomationByType("availability_alert");
    });

    if (!automation?.isActive) {
      return { skipped: true, reason: "Automation disabled" };
    }

    // Get template
    const template = await step.run("get-template", async () => {
      return services.communication.getEmailTemplateByType("availability_alert");
    });

    if (!template) {
      return { skipped: true, reason: "No template configured" };
    }

    // Get alerts for this tour with capacity
    const alerts = await step.run("get-alerts", async () => {
      return services.availabilityAlert.getAlertsForTourWithCapacity(tourId, availableSpots);
    });

    // Filter alerts where requested spots <= available spots
    const eligibleAlerts = alerts.filter(
      (alert) => (alert.requestedSpots || 1) <= availableSpots
    );

    if (eligibleAlerts.length === 0) {
      return { skipped: true, reason: "No eligible alerts" };
    }

    let notificationsSent = 0;
    for (const alert of eligibleAlerts) {
      await step.run(`notify-${alert.id}`, async () => {
        // Get tour details
        const tour = await services.tour.getById(alert.tourId);

        // Get customer details if customerId is available
        let customerName = "Valued Customer";
        let customerFirstName = "there";
        if (alert.customerId) {
          try {
            const customer = await services.customer.getById(alert.customerId);
            customerName = `${customer.firstName} ${customer.lastName || ""}`.trim();
            customerFirstName = customer.firstName;
          } catch (error) {
            // Customer not found, use defaults
            logger.debug({ err: error, customerId: alert.customerId }, "Customer not found for availability alert, using defaults");
          }
        }

        // Note: Tour date/time not available without schedule - use empty strings
        // This data would need to come from tour availability in the new model
        const content = services.communication.substituteVariables(template.contentHtml, {
          customer_name: customerName,
          customer_first_name: customerFirstName,
          tour_name: tour.name,
          tour_date: "",
          tour_time: "",
          available_spots: availableSpots.toString(),
          requested_spots: (alert.requestedSpots || 1).toString(),
        });

        const subject = services.communication.substituteVariables(template.subject, {
          tour_name: tour.name,
        });

        // Log communication
        await services.communication.createLog({
          customerId: alert.customerId || undefined,
          recipientEmail: alert.email,
          recipientName: customerName !== "Valued Customer" ? customerName : undefined,
          tourId: alert.tourId,
          type: "email",
          templateId: template.id,
          templateName: template.name,
          subject,
          content,
          status: "pending",
          metadata: { trigger: "availability_alert", alertId: alert.id },
        });

        // Update alert status
        await services.availabilityAlert.updateStatus(alert.id, "notified");
        notificationsSent++;
      });
    }

    return { notificationsSent };
  }
);

/**
 * Check and notify customers about price drops on wishlisted tours
 */
export const checkPriceDrops = inngest.createFunction(
  {
    id: "check-price-drops",
    name: "Check Price Drops",
    retries: 2,
  },
  { event: "automation/check-price-drops" },
  async ({ event, step }) => {
    const { organizationId, tourId, oldPrice, newPrice } = event.data;
    const services = createServices({ organizationId });

    // Check if automation is enabled
    const automation = await step.run("check-automation", async () => {
      return services.communication.getAutomationByType("price_drop_alert");
    });

    if (!automation?.isActive) {
      return { skipped: true, reason: "Automation disabled" };
    }

    // Get template
    const template = await step.run("get-template", async () => {
      return services.communication.getEmailTemplateByType("price_drop_alert");
    });

    if (!template) {
      return { skipped: true, reason: "No template configured" };
    }

    // Get wishlists for this tour with price drop alerts enabled
    const wishlists = await step.run("get-wishlists", async () => {
      return services.wishlist.getWishlistsForPriceDropAlert(tourId);
    });

    if (wishlists.length === 0) {
      return { skipped: true, reason: "No wishlists with price drop alerts" };
    }

    // Get tour details
    const tour = await step.run("get-tour", async () => {
      return services.tour.getById(tourId);
    });

    const discount = ((parseFloat(oldPrice) - parseFloat(newPrice)) / parseFloat(oldPrice) * 100).toFixed(0);

    let notificationsSent = 0;
    for (const wishlist of wishlists) {
      await step.run(`notify-${wishlist.id}`, async () => {
        // Get customer email - prefer customer record, fall back to wishlist email
        let customerEmail = wishlist.email;
        let customerName = "Valued Customer";
        let customerFirstName = "there";

        if (wishlist.customerId) {
          try {
            const customer = await services.customer.getById(wishlist.customerId);
            customerEmail = customer.email;
            customerName = `${customer.firstName} ${customer.lastName || ""}`.trim();
            customerFirstName = customer.firstName;
          } catch (error) {
            // Customer not found, use wishlist email
            logger.debug({ err: error, customerId: wishlist.customerId }, "Customer not found for price drop notification, using wishlist email");
          }
        }

        if (!customerEmail) return;

        const content = services.communication.substituteVariables(template.contentHtml, {
          customer_name: customerName,
          customer_first_name: customerFirstName,
          tour_name: tour.name,
          old_price: `$${oldPrice}`,
          new_price: `$${newPrice}`,
          discount_percentage: `${discount}%`,
        });

        const subject = services.communication.substituteVariables(template.subject, {
          tour_name: tour.name,
          discount_percentage: `${discount}%`,
        });

        // Log communication
        await services.communication.createLog({
          customerId: wishlist.customerId || undefined,
          recipientEmail: customerEmail,
          recipientName: customerName !== "Valued Customer" ? customerName : undefined,
          tourId,
          type: "email",
          templateId: template.id,
          templateName: template.name,
          subject,
          content,
          status: "pending",
          metadata: {
            trigger: "price_drop_alert",
            wishlistId: wishlist.id,
            oldPrice,
            newPrice,
          },
        });

        // Mark wishlist as notified
        await services.wishlist.markNotified(wishlist.id);
        notificationsSent++;
      });
    }

    return { notificationsSent, discount: `${discount}%` };
  }
);
