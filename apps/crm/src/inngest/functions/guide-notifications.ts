import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices, logger } from "@tour/services";
import { eq, and, gte, lte, db, schedules, bookings, organizations, guideAssignments } from "@tour/database";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Send assignment notification when a guide is assigned to a schedule
 */
export const sendGuideAssignmentEmail = inngest.createFunction(
  {
    id: "send-guide-assignment-email",
    name: "Send Guide Assignment Email",
    retries: 3,
  },
  { event: "guide/assignment.created" },
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

    // Use organization timezone for date/time formatting
    const timezone = org.timezone || "UTC";

    // Format dates for display in org timezone
    const tourDate = formatInTimeZone(new Date(data.startsAt), timezone, "EEEE, MMMM d, yyyy");
    const startTime = formatInTimeZone(new Date(data.startsAt), timezone, "h:mm a");
    const endTime = formatInTimeZone(new Date(data.endsAt), timezone, "h:mm a");
    const tourTime = `${startTime} - ${endTime}`;

    // Guide portal URLs - guides access via magic link authentication
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/assignments/${data.assignmentId}/confirm`;
    const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/assignments/${data.assignmentId}/decline`;
    const manifestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/schedules/${data.scheduleId}/manifest`;

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendGuideAssignment({
        guideName: data.guideName,
        guideEmail: data.guideEmail,
        tourName: data.tourName,
        tourDate,
        tourTime,
        meetingPoint: data.meetingPoint,
        meetingPointDetails: data.meetingPointDetails,
        confirmUrl,
        declineUrl,
        manifestUrl,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "guide_assignment",
        entityId: data.assignmentId,
        action: "assignment.email_sent",
        description: `Assignment notification sent to ${data.guideName} (${data.guideEmail})`,
        actorType: "system",
        metadata: { emailType: "assignment", messageId: result.messageId },
      });
    });

    // Schedule a reminder for 24 hours if still pending
    await step.run("schedule-reminder", async () => {
      return inngest.send({
        name: "guide/assignment.pending-reminder",
        data,
        ts: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
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
 * Send reminder for pending assignments after 24 hours
 */
export const sendPendingAssignmentReminder = inngest.createFunction(
  {
    id: "send-pending-assignment-reminder",
    name: "Send Pending Assignment Reminder",
    retries: 3,
  },
  { event: "guide/assignment.pending-reminder" },
  async ({ event, step }) => {
    const { data } = event;

    // Check if assignment is still pending
    const assignment = await step.run("check-assignment-status", async () => {
      const services = createServices({ organizationId: data.organizationId });
      try {
        return await services.guideAssignment.getById(data.assignmentId);
      } catch (error) {
        // Assignment might have been deleted
        logger.debug({ err: error, assignmentId: data.assignmentId }, "Assignment not found, may have been deleted");
        return null;
      }
    });

    // Only send reminder if still pending
    if (!assignment || assignment.status !== "pending") {
      return {
        success: false,
        reason: "Assignment is no longer pending",
        status: assignment?.status,
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

    // Use organization timezone for date/time formatting
    const timezone = org.timezone || "UTC";

    // Format dates for display in org timezone
    const tourDate = formatInTimeZone(new Date(data.startsAt), timezone, "EEEE, MMMM d, yyyy");
    const startTime = formatInTimeZone(new Date(data.startsAt), timezone, "h:mm a");
    const endTime = formatInTimeZone(new Date(data.endsAt), timezone, "h:mm a");
    const tourTime = `${startTime} - ${endTime}`;

    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/assignments/${data.assignmentId}/confirm`;
    const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/assignments/${data.assignmentId}/decline`;
    const manifestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/schedules/${data.scheduleId}/manifest`;

    // Send reminder email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendGuideAssignment({
        guideName: data.guideName,
        guideEmail: data.guideEmail,
        tourName: data.tourName,
        tourDate,
        tourTime,
        meetingPoint: data.meetingPoint,
        meetingPointDetails: data.meetingPointDetails,
        confirmUrl,
        declineUrl,
        manifestUrl,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "guide_assignment",
        entityId: data.assignmentId,
        action: "assignment.reminder_sent",
        description: `Reminder sent to ${data.guideName} for pending assignment`,
        actorType: "system",
        metadata: { emailType: "assignment_reminder", messageId: result.messageId },
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
 * Send tour reminder to guides 24 hours before their scheduled tour
 */
export const sendGuideScheduleReminder = inngest.createFunction(
  {
    id: "send-guide-schedule-reminder",
    name: "Send Guide Schedule Reminder",
    retries: 3,
  },
  { event: "guide/schedule.reminder" },
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

    // Use organization timezone for date/time formatting
    const timezone = org.timezone || "UTC";

    // Format dates for display in org timezone
    const tourDate = formatInTimeZone(new Date(data.startsAt), timezone, "EEEE, MMMM d, yyyy");
    const startTime = formatInTimeZone(new Date(data.startsAt), timezone, "h:mm a");
    const endTime = formatInTimeZone(new Date(data.endsAt), timezone, "h:mm a");
    const tourTime = `${startTime} - ${endTime}`;

    const manifestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guide/schedules/${data.scheduleId}/manifest`;

    // Send reminder email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendGuideReminder({
        guideName: data.guideName,
        guideEmail: data.guideEmail,
        tourName: data.tourName,
        tourDate,
        tourTime,
        participantCount: data.participantCount,
        meetingPoint: data.meetingPoint,
        meetingPointDetails: data.meetingPointDetails,
        manifestUrl,
      });
    });

    // Log activity
    await step.run("log-activity", async () => {
      const services = createServices({ organizationId: data.organizationId });
      await services.activityLog.log({
        entityType: "schedule",
        entityId: data.scheduleId,
        action: "schedule.guide_reminder_sent",
        description: `Tour reminder sent to ${data.guideName}`,
        actorType: "system",
        metadata: {
          emailType: "guide_reminder",
          messageId: result.messageId,
          guideId: data.guideId,
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
 * Send daily manifest to all guides with tours today
 * Runs every hour to handle different organization timezones
 */
export const sendGuideDailyManifest = inngest.createFunction(
  {
    id: "send-guide-daily-manifest",
    name: "Send Guide Daily Manifest",
    retries: 2,
  },
  { cron: "0 * * * *" }, // Run every hour to handle different timezones
  async ({ step }) => {
    // Get all organizations with their timezones
    const orgsWithTimezones = await step.run("get-all-organizations", async () => {
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
    for (const orgData of orgsWithTimezones) {
      const orgResult = await step.run(
        `process-org-${orgData.organizationId}`,
        async () => {
          const services = createServices({ organizationId: orgData.organizationId });
          const timezone = orgData.timezone || "UTC";

          // Get current time in org timezone
          const nowUtc = new Date();
          const nowInOrgTz = toZonedTime(nowUtc, timezone);
          const currentHourInOrgTz = nowInOrgTz.getHours();

          // Only send manifests if it's 6 AM in the organization's timezone
          if (currentHourInOrgTz !== 6) {
            return {
              organizationId: orgData.organizationId,
              skipped: true,
              reason: `Not 6 AM in timezone ${timezone} (current hour: ${currentHourInOrgTz})`,
              guidesNotified: 0,
            };
          }

          // Calculate today's date range in UTC based on org timezone
          const todayInOrgTz = new Date(nowInOrgTz);
          todayInOrgTz.setHours(0, 0, 0, 0);

          const tomorrowInOrgTz = new Date(todayInOrgTz);
          tomorrowInOrgTz.setDate(tomorrowInOrgTz.getDate() + 1);

          // Convert to UTC for database query
          const todayUtc = new Date(todayInOrgTz.getTime() - getTimezoneOffset(timezone, todayInOrgTz));
          const tomorrowUtc = new Date(tomorrowInOrgTz.getTime() - getTimezoneOffset(timezone, tomorrowInOrgTz));

          const todaysSchedules = await db.query.schedules.findMany({
            where: and(
              eq(schedules.organizationId, orgData.organizationId),
              gte(schedules.startsAt, todayUtc),
              lte(schedules.startsAt, tomorrowUtc),
              eq(schedules.status, "scheduled")
            ),
            with: {
              tour: true,
              bookings: {
                with: {
                  guideAssignments: {
                    where: eq(guideAssignments.status, "confirmed"),
                    with: {
                      guide: true,
                    },
                  },
                },
              },
            },
          });

          // Group schedules by guide (via booking assignments)
          const schedulesByGuide = new Map<
            string,
            Array<typeof todaysSchedules[number]>
          >();

          for (const schedule of todaysSchedules) {
            // Get all unique guides assigned to bookings in this schedule
            const guideIds = new Set<string>();
            for (const booking of schedule.bookings) {
              // Use type assertion since the relation is defined dynamically
              const bookingWithAssignments = booking as typeof booking & {
                guideAssignments: Array<{ guideId: string; guide: { id: string; firstName: string; lastName: string; email: string } }>;
              };
              for (const assignment of bookingWithAssignments.guideAssignments) {
                guideIds.add(assignment.guideId);
              }
            }

            // Add this schedule to each assigned guide's list
            for (const guideId of guideIds) {
              if (!schedulesByGuide.has(guideId)) {
                schedulesByGuide.set(guideId, []);
              }
              schedulesByGuide.get(guideId)!.push(schedule);
            }
          }

          // Send manifest email to each guide
          const emailResults = [];

          for (const [guideId, guideSchedules] of schedulesByGuide) {
            // Get guide info from first assignment we find
            let guide = null;
            for (const gs of guideSchedules) {
              for (const booking of gs.bookings) {
                // Use type assertion since the relation is defined dynamically
                const bookingWithAssignments = booking as typeof booking & {
                  guideAssignments: Array<{ guideId: string; guide: { id: string; firstName: string; lastName: string; email: string } }>;
                };
                const assignment = bookingWithAssignments.guideAssignments.find((a) => a.guideId === guideId);
                if (assignment?.guide) {
                  guide = assignment.guide;
                  break;
                }
              }
              if (guide) break;
            }

            if (!guide) continue;

            // Get participant counts for each schedule
            const toursWithCounts = await Promise.all(
              guideSchedules.map(async (gs) => {
                const bookingCount = await db
                  .select()
                  .from(bookings)
                  .where(
                    and(
                      eq(bookings.scheduleId, gs.id),
                      eq(bookings.organizationId, orgData.organizationId)
                    )
                  );

                const participantCount = bookingCount.reduce(
                  (sum: number, booking) => sum + (booking.totalParticipants || 0),
                  0
                );

                // Format time in org timezone
                const startTime = formatInTimeZone(new Date(gs.startsAt), timezone, "h:mm a");
                const endTime = formatInTimeZone(new Date(gs.endsAt), timezone, "h:mm a");
                const tourTime = `${startTime} - ${endTime}`;

                return {
                  tourName: gs.tour?.name || "Unknown Tour",
                  time: tourTime,
                  participantCount,
                  meetingPoint: gs.meetingPoint || undefined,
                  manifestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/guide/schedules/${gs.id}/manifest`,
                };
              })
            );

            // Get organization details
            const org = await services.organization.get();

            const orgConfig: OrganizationEmailConfig = {
              name: org.name,
              email: org.email,
              phone: org.phone ?? undefined,
              logoUrl: org.logoUrl ?? undefined,
            };

            // Format date in org timezone
            const dateString = formatInTimeZone(todayInOrgTz, timezone, "EEEE, MMMM d, yyyy");

            // Send email
            const emailService = createEmailService(orgConfig);
            const emailResult = await emailService.sendGuideDailyManifest({
              guideName: `${guide.firstName} ${guide.lastName}`,
              guideEmail: guide.email,
              date: dateString,
              tours: toursWithCounts,
            });

            // Log activity
            if (emailResult.success) {
              await services.activityLog.log({
                entityType: "guide",
                entityId: guideId,
                action: "guide.daily_manifest_sent",
                description: `Daily manifest sent to ${guide.firstName} ${guide.lastName} (${toursWithCounts.length} tours)`,
                actorType: "system",
                metadata: {
                  emailType: "daily_manifest",
                  messageId: emailResult.messageId,
                  tourCount: toursWithCounts.length,
                  date: dateString,
                },
              });
            }

            emailResults.push({
              guideId,
              guideName: `${guide.firstName} ${guide.lastName}`,
              tourCount: toursWithCounts.length,
              success: emailResult.success,
              error: emailResult.error,
            });
          }

          return {
            organizationId: orgData.organizationId,
            skipped: false,
            guidesNotified: emailResults.length,
            results: emailResults,
          };
        }
      );

      results.push(orgResult);
    }

    const processedResults = results.filter((r) => !r.skipped);
    return {
      processedOrganizations: processedResults.length,
      skippedOrganizations: results.filter((r) => r.skipped).length,
      totalGuidesNotified: processedResults.reduce((sum, r) => sum + r.guidesNotified, 0),
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
