import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices } from "@tour/services";
import { db, schedules, bookings, type Booking } from "@tour/database";
import { eq, and, gte, lte } from "drizzle-orm";
import { format } from "date-fns";

// Type for booking with relations for daily reminder query
interface BookingWithRelations extends Booking {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  schedule: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    tour: {
      id: string;
      name: string;
      meetingPoint: string | null;
      meetingPointDetails: string | null;
    } | null;
  } | null;
}

/**
 * Send booking confirmation email when a booking is created
 */
export const sendBookingCreatedEmail = inngest.createFunction(
  {
    id: "send-booking-created-email",
    name: "Send Booking Created Email",
    retries: 3,
  },
  { event: "booking/created" },
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
        description: `Booking confirmation email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: { emailType: "booking_created", messageId: result.messageId },
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
 * Send booking confirmation email when a booking is confirmed by staff
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
 * Send booking reschedule email when a booking date/time is changed
 */
export const sendBookingRescheduleEmail = inngest.createFunction(
  {
    id: "send-booking-reschedule-email",
    name: "Send Booking Reschedule Email",
    retries: 3,
  },
  { event: "booking/rescheduled" },
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
      return emailService.sendBookingReschedule({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        oldTourDate: data.oldTourDate,
        oldTourTime: data.oldTourTime,
        newTourDate: data.newTourDate,
        newTourTime: data.newTourTime,
        participants: data.participants,
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
        description: `Reschedule notification email sent to ${data.customerEmail}`,
        actorType: "system",
        metadata: {
          emailType: "reschedule",
          messageId: result.messageId,
          oldDate: `${data.oldTourDate} ${data.oldTourTime}`,
          newDate: `${data.newTourDate} ${data.newTourTime}`,
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

/**
 * Send refund confirmation email when a refund is processed
 */
export const sendRefundProcessedEmail = inngest.createFunction(
  {
    id: "send-refund-processed-email",
    name: "Send Refund Processed Email",
    retries: 3,
  },
  { event: "refund/processed" },
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

    // Fetch booking to get tour date/time
    const booking = await step.run("get-booking-details", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.booking.getById(data.bookingId);
    });

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      const tourDate = booking?.schedule?.startsAt
        ? format(new Date(booking.schedule.startsAt), "MMMM d, yyyy")
        : "N/A";
      const tourTime = booking?.schedule?.startsAt
        ? format(new Date(booking.schedule.startsAt), "h:mm a")
        : "N/A";
      return emailService.sendRefundConfirmation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate,
        tourTime,
        refundAmount: data.refundAmount,
        currency: data.currency,
        refundReason: data.reason || "Customer request",
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "booking",
        entityId: data.bookingId,
        action: "booking.email_sent",
        description: `Refund confirmation email sent to ${data.customerEmail} for ${data.currency} ${data.refundAmount}`,
        actorType: "system",
        metadata: {
          emailType: "refund_processed",
          messageId: result.messageId,
          refundId: data.refundId,
          refundAmount: data.refundAmount,
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
 * Cron job to check for bookings happening in 24 hours and send reminders
 * Runs daily at 9 AM
 */
export const dailyBookingReminderCheck = inngest.createFunction(
  {
    id: "daily-booking-reminder-check",
    name: "Daily Booking Reminder Check",
    retries: 2,
  },
  { cron: "0 9 * * *" }, // Run at 9 AM every day
  async ({ step }) => {
    // Get all organizations with bookings tomorrow
    const organizations = await step.run("get-organizations-with-bookings", async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const schedulesResult = await db
        .select({ organizationId: schedules.organizationId })
        .from(schedules)
        .where(
          and(
            gte(schedules.startsAt, tomorrow),
            lte(schedules.startsAt, dayAfter),
            eq(schedules.status, "scheduled")
          )
        )
        .groupBy(schedules.organizationId);

      return schedulesResult.map((s: { organizationId: string }) => s.organizationId);
    });

    const results = [];

    // Process each organization
    for (const organizationId of organizations) {
      const orgResult = await step.run(
        `process-org-${organizationId}`,
        async () => {
          const services = createServices({ organizationId });

          // Get tomorrow's bookings
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          const dayAfter = new Date(tomorrow);
          dayAfter.setDate(dayAfter.getDate() + 1);

          const tomorrowsBookings = await db.query.bookings.findMany({
            where: and(
              eq(bookings.organizationId, organizationId),
              eq(bookings.status, "confirmed")
            ),
            with: {
              customer: true,
              schedule: {
                with: {
                  tour: true,
                },
              },
            },
          }) as BookingWithRelations[];

          // Filter bookings where schedule is tomorrow
          const bookingsToRemind = tomorrowsBookings.filter((booking) => {
            if (!booking.schedule) return false;
            const scheduleDate = new Date(booking.schedule.startsAt);
            return scheduleDate >= tomorrow && scheduleDate < dayAfter;
          });

          let remindersSent = 0;

          // Send reminder for each booking (only if customer has email)
          for (const booking of bookingsToRemind) {
            if (!booking.customer?.email || !booking.schedule || !booking.schedule.tour) {
              continue;
            }

            const scheduleDate = new Date(booking.schedule.startsAt);
            const hoursUntilTour = Math.round(
              (scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            );

            // Send reminder event
            await inngest.send({
              name: "booking/reminder",
              data: {
                organizationId,
                bookingId: booking.id,
                customerId: booking.customerId,
                customerEmail: booking.customer.email,
                customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                bookingReference: booking.referenceNumber,
                tourName: booking.schedule.tour.name,
                tourDate: format(scheduleDate, "MMMM d, yyyy"),
                tourTime: format(scheduleDate, "h:mm a"),
                participants: booking.totalParticipants,
                meetingPoint: booking.schedule.tour.meetingPoint || undefined,
                meetingPointDetails: booking.schedule.tour.meetingPointDetails || undefined,
                hoursUntilTour,
              },
            });

            remindersSent++;
          }

          return {
            organizationId,
            bookingsChecked: bookingsToRemind.length,
            remindersSent,
          };
        }
      );

      results.push(orgResult);
    }

    return {
      processedOrganizations: organizations.length,
      totalReminders: results.reduce((sum, r) => sum + r.remindersSent, 0),
      results,
    };
  }
);
