import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices } from "@tour/services";

/**
 * Send review request email 24 hours after tour completion
 */
export const sendReviewRequestEmail = inngest.createFunction(
  {
    id: "send-review-request-email",
    name: "Send Review Request Email",
    retries: 3,
  },
  { event: "booking/completed" },
  async ({ event, step }) => {
    const { data } = event;

    // Wait 24 hours before sending review request
    await step.sleep("wait-24-hours", "24h");

    // Check if review already exists (customer might have submitted one)
    const existingReview = await step.run("check-existing-review", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.review.getByBookingId(data.bookingId);
    });

    if (existingReview) {
      return {
        skipped: true,
        reason: "Review already exists for this booking",
      };
    }

    // Get organization details for email branding
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

    // Generate review link (this will be used when customer portal is implemented)
    const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/review/${data.bookingId}`;

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendReviewRequest({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        tourName: data.tourName,
        tourDate: data.tourDate,
        reviewUrl: reviewLink,
        isReminder: false,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "review.request_sent",
        description: `Review request email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: { emailType: "review_request", messageId: result.messageId },
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
 * Send review reminder if no review after 72 hours
 */
export const sendReviewReminderEmail = inngest.createFunction(
  {
    id: "send-review-reminder-email",
    name: "Send Review Reminder Email",
    retries: 3,
  },
  { event: "booking/completed" },
  async ({ event, step }) => {
    const { data } = event;

    // Wait 72 hours (3 days) before sending reminder
    await step.sleep("wait-72-hours", "72h");

    // Check if review already exists
    const existingReview = await step.run("check-existing-review", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.review.getByBookingId(data.bookingId);
    });

    if (existingReview) {
      return {
        skipped: true,
        reason: "Review already exists for this booking",
      };
    }

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

    const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/review/${data.bookingId}`;

    // Send reminder email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendReviewRequest({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        tourName: data.tourName,
        tourDate: data.tourDate,
        reviewUrl: reviewLink,
        isReminder: true,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "review.reminder_sent",
        description: `Review reminder email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: { emailType: "review_reminder", messageId: result.messageId },
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
 * Cron job to find completed bookings without reviews and trigger review requests
 * Runs daily at 10 AM
 */
export const dailyReviewRequestCheck = inngest.createFunction(
  {
    id: "daily-review-request-check",
    name: "Daily Review Request Check",
  },
  { cron: "0 10 * * *" }, // Every day at 10 AM
  async ({ step }) => {
    // This would need to be modified to work across organizations
    // For now, we'll rely on the booking/completed event approach

    return {
      message: "Review request check completed. Using event-driven approach for review requests.",
    };
  }
);
