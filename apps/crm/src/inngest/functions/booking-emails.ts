import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices } from "@tour/services";

/**
 * Send booking confirmation email when a booking is confirmed
 */
export const sendBookingConfirmationEmail = inngest.createFunction(
  {
    id: "send-booking-confirmation-email",
    name: "Send Booking Confirmation Email",
    retries: 3,
  },
  { event: "booking/confirmed" },
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
      return emailService.sendBookingConfirmation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate: data.tourDate,
        tourTime: data.tourTime,
        participants: data.participants,
        totalAmount: data.totalAmount,
        currency: data.currency,
        meetingPoint: data.meetingPoint,
        meetingPointDetails: data.meetingPointDetails,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.email_sent",
        description: `Confirmation email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: { emailType: "confirmation", messageId: result.messageId },
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
 * Send booking cancellation email when a booking is cancelled
 */
export const sendBookingCancellationEmail = inngest.createFunction(
  {
    id: "send-booking-cancellation-email",
    name: "Send Booking Cancellation Email",
    retries: 3,
  },
  { event: "booking/cancelled" },
  async ({ event, step }) => {
    const { data } = event;

    // Get organization details
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.organization.get();
    });

    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendBookingCancellation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate: data.tourDate,
        tourTime: data.tourTime,
        refundAmount: data.refundAmount,
        currency: data.currency,
        cancellationReason: data.cancellationReason,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.email_sent",
        description: `Cancellation email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: { emailType: "cancellation", messageId: result.messageId },
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
 * Send booking reminder email
 */
export const sendBookingReminderEmail = inngest.createFunction(
  {
    id: "send-booking-reminder-email",
    name: "Send Booking Reminder Email",
    retries: 3,
  },
  { event: "booking/reminder" },
  async ({ event, step }) => {
    const { data } = event;

    // Get organization details
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.organization.get();
    });

    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendBookingReminder({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate: data.tourDate,
        tourTime: data.tourTime,
        participants: data.participants,
        meetingPoint: data.meetingPoint,
        meetingPointDetails: data.meetingPointDetails,
        hoursUntilTour: data.hoursUntilTour,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.email_sent",
        description: `Reminder email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: {
          emailType: "reminder",
          messageId: result.messageId,
          hoursUntilTour: data.hoursUntilTour,
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
