import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices, logger } from "@tour/services";
import { db, bookings, organizations, type Booking } from "@tour/database";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import {
  validateEventData,
  bookingCreatedSchema,
  bookingConfirmedSchema,
  bookingCancelledSchema,
  bookingRescheduledSchema,
  bookingReminderSchema,
  refundProcessedSchema,
} from "../schemas";

// Type for booking with relations for daily reminder query
interface BookingWithRelations extends Booking {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  tour: {
    id: string;
    name: string;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
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
    // Validate event data
    const data = validateEventData(bookingCreatedSchema, event.data, "booking/created");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing booking/created email");

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
        currency: data.currency ?? "USD",
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
    // Validate event data
    const data = validateEventData(bookingConfirmedSchema, event.data, "booking/confirmed");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing booking/confirmed email");

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
        currency: data.currency ?? "USD",
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
    // Validate event data
    const data = validateEventData(bookingCancelledSchema, event.data, "booking/cancelled");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing booking/cancelled email");

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
        currency: data.currency ?? "USD",
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
    // Validate event data
    const data = validateEventData(bookingRescheduledSchema, event.data, "booking/rescheduled");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing booking/rescheduled email");

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
    // Validate event data
    const data = validateEventData(bookingReminderSchema, event.data, "booking/reminder");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing booking/reminder email");

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
    // Validate event data
    const data = validateEventData(refundProcessedSchema, event.data, "refund/processed");

    logger.info({ eventId: event.id, bookingId: data.bookingId }, "Processing refund/processed email");

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
      // Use booking's bookingDate and bookingTime fields
      const tourDate = booking?.bookingDate
        ? format(new Date(booking.bookingDate), "MMMM d, yyyy")
        : "N/A";
      const tourTime = booking?.bookingTime || "N/A";
      return emailService.sendRefundConfirmation({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingReference: data.bookingReference,
        tourName: data.tourName,
        tourDate,
        tourTime,
        refundAmount: data.refundAmount,
        currency: data.currency ?? "USD",
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
 * Runs every hour to handle different organization timezones
 */
export const dailyBookingReminderCheck = inngest.createFunction(
  {
    id: "daily-booking-reminder-check",
    name: "Daily Booking Reminder Check",
    retries: 2,
  },
  { cron: "0 * * * *" }, // Run every hour to handle different timezones
  async ({ step }) => {
    // Get all organizations with their timezones
    const orgsWithTimezones = await step.run("get-organizations-with-timezones", async () => {
      const orgs = await db
        .select({
          organizationId: organizations.id,
          timezone: organizations.timezone,
        })
        .from(organizations);

      return orgs;
    });

    const results = [];

    // Process each organization using their timezone
    for (const org of orgsWithTimezones) {
      const orgResult = await step.run(
        `process-org-${org.organizationId}`,
        async () => {
          const _services = createServices({ organizationId: org.organizationId });
          const timezone = org.timezone || "UTC";

          // Get current time in org timezone
          const nowUtc = new Date();
          const nowInOrgTz = toZonedTime(nowUtc, timezone);
          const currentHourInOrgTz = nowInOrgTz.getHours();

          // Only send reminders if it's 9 AM in the organization's timezone
          if (currentHourInOrgTz !== 9) {
            return {
              organizationId: org.organizationId,
              skipped: true,
              reason: `Not 9 AM in timezone ${timezone} (current hour: ${currentHourInOrgTz})`,
              bookingsChecked: 0,
              remindersSent: 0,
            };
          }

          // Calculate tomorrow's date range in UTC based on org timezone
          // Get start of tomorrow in org timezone, then convert to UTC for query
          const tomorrowInOrgTz = new Date(nowInOrgTz);
          tomorrowInOrgTz.setDate(tomorrowInOrgTz.getDate() + 1);
          tomorrowInOrgTz.setHours(0, 0, 0, 0);

          const dayAfterInOrgTz = new Date(tomorrowInOrgTz);
          dayAfterInOrgTz.setDate(dayAfterInOrgTz.getDate() + 1);

          // Convert to UTC for database query
          const tomorrowUtc = new Date(tomorrowInOrgTz.getTime() - getTimezoneOffset(timezone, tomorrowInOrgTz));
          const dayAfterUtc = new Date(dayAfterInOrgTz.getTime() - getTimezoneOffset(timezone, dayAfterInOrgTz));

          const tomorrowsBookings = await db.query.bookings.findMany({
            where: and(
              eq(bookings.organizationId, org.organizationId),
              eq(bookings.status, "confirmed")
            ),
            with: {
              customer: true,
              tour: true,
            },
          }) as BookingWithRelations[];

          // Filter bookings where bookingDate is tomorrow in org timezone
          const bookingsToRemind = tomorrowsBookings.filter((booking) => {
            if (!booking.bookingDate) return false;
            const bookingDateObj = new Date(booking.bookingDate);
            return bookingDateObj >= tomorrowUtc && bookingDateObj < dayAfterUtc;
          });

          let remindersSent = 0;

          // Send reminder for each booking (only if customer has email)
          for (const booking of bookingsToRemind) {
            if (!booking.customer?.email || !booking.tour || !booking.bookingDate) {
              continue;
            }

            const bookingDateObj = new Date(booking.bookingDate);
            const hoursUntilTour = Math.round(
              (bookingDateObj.getTime() - nowUtc.getTime()) / (1000 * 60 * 60)
            );

            // Format dates in organization's timezone for customer-facing content
            const tourDateFormatted = formatInTimeZone(bookingDateObj, timezone, "MMMM d, yyyy");
            // Use bookingTime directly as it's already formatted
            const tourTimeFormatted = booking.bookingTime || "N/A";

            // Send reminder event
            await inngest.send({
              name: "booking/reminder",
              data: {
                organizationId: org.organizationId,
                bookingId: booking.id,
                customerId: booking.customerId,
                customerEmail: booking.customer.email,
                customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                bookingReference: booking.referenceNumber,
                tourName: booking.tour.name,
                tourDate: tourDateFormatted,
                tourTime: tourTimeFormatted,
                participants: booking.totalParticipants,
                meetingPoint: booking.tour.meetingPoint || undefined,
                meetingPointDetails: booking.tour.meetingPointDetails || undefined,
                hoursUntilTour,
              },
            });

            remindersSent++;
          }

          return {
            organizationId: org.organizationId,
            skipped: false,
            bookingsChecked: bookingsToRemind.length,
            remindersSent,
          };
        }
      );

      results.push(orgResult);
    }

    const processedResults = results.filter((r) => !r.skipped);
    return {
      processedOrganizations: processedResults.length,
      skippedOrganizations: results.filter((r) => r.skipped).length,
      totalReminders: processedResults.reduce((sum, r) => sum + r.remindersSent, 0),
      results,
    };
  }
);

/**
 * Helper function to get timezone offset in milliseconds
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return tzDate.getTime() - utcDate.getTime();
}
