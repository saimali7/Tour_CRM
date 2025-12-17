import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices } from "@tour/services";
import { format } from "date-fns";

/**
 * Send payment succeeded email when a payment is completed
 */
export const sendPaymentSucceededEmail = inngest.createFunction(
  {
    id: "send-payment-succeeded-email",
    name: "Send Payment Succeeded Email",
    retries: 3,
  },
  { event: "payment/succeeded" },
  async ({ event, step }) => {
    const { data } = event;

    // Get organization details for email branding
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.organization.get();
    });

    // Prepare org email config
    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendPaymentConfirmation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate: data.tourDate,
        amount: data.amount,
        currency: data.currency,
        receiptUrl: data.stripeReceiptUrl,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.payment_email_sent",
        description: `Payment confirmation email sent to ${data.customerEmail} for ${data.currency} ${data.amount}`,
        actorType: "system",
        metadata: {
          emailType: "payment_succeeded",
          messageId: result.messageId,
          amount: data.amount,
          currency: data.currency,
        },
      });
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Send payment failed email when a payment fails
 */
export const sendPaymentFailedEmail = inngest.createFunction(
  {
    id: "send-payment-failed-email",
    name: "Send Payment Failed Email",
    retries: 3,
  },
  { event: "payment/failed" },
  async ({ event, step }) => {
    const { data } = event;

    // Get organization details for email branding
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.organization.get();
    });

    // Get booking details for retry payment link
    const booking = await step.run("get-booking-details", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.booking.getById(data.bookingId);
    });

    // Prepare org email config
    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    // Send simple notification email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      // Use booking confirmation template with payment pending status to prompt retry
      return emailService.sendBookingConfirmation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: booking?.tour?.name || "Your Tour",
        tourDate: booking?.schedule?.startsAt
          ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy")
          : "Scheduled Date",
        tourTime: booking?.schedule?.startsAt
          ? format(new Date(booking.schedule.startsAt), "h:mm a")
          : "Scheduled Time",
        participants: booking?.totalParticipants || 1,
        totalAmount: booking?.total || "0.00",
        currency: booking?.currency || "USD",
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.payment_failed_email_sent",
        description: `Payment failed notification email sent to ${data.customerEmail}: ${data.errorMessage}`,
        actorType: "system",
        metadata: {
          emailType: "payment_failed",
          messageId: result.messageId,
          errorMessage: data.errorMessage,
        },
      });
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }
);
