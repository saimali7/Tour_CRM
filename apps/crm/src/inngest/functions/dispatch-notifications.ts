import { inngest } from "../client";
import * as Sentry from "@sentry/nextjs";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices, createServiceLogger } from "@tour/services";
import { formatInTimeZone } from "date-fns-tz";

const log = createServiceLogger("dispatch");

/**
 * Dispatch Notifications
 *
 * Sends manifest emails to all guides when an operator dispatches for a day.
 * This is triggered from the Command Center when the user clicks "Dispatch".
 */

/**
 * Send dispatch notifications to all assigned guides for a date
 */
export const sendDispatchNotifications = inngest.createFunction(
  {
    id: "send-dispatch-notifications",
    name: "Send Dispatch Notifications",
    retries: 3,
  },
  { event: "dispatch.completed" },
  async ({ event, step }) => {
    const { organizationId, dispatchDate, dispatchedBy } = event.data;

    // Step 1: Get organization details
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId });
      return services.organization.get();
    });

    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    const timezone = org.timezone || "UTC";

    // Step 2: Get the dispatch data with guide timelines
    const dispatchData = await step.run("get-dispatch-data", async () => {
      const services = createServices({ organizationId });
      const timelines = await services.commandCenter.getGuideTimelines(
        new Date(dispatchDate)
      );
      return timelines;
    });

    if (!dispatchData || dispatchData.length === 0) {
      return { sent: 0, message: "No guides to notify" };
    }

    // Step 3: Send notification to each guide with assignments
    const results = await Promise.all(
      dispatchData.map(async (guideTimeline) => {
        return step.run(`notify-guide-${guideTimeline.guide.id}`, async () => {
          // Get tour segments (skip idle segments)
          const tourSegments = guideTimeline.segments.filter(
            (s) => s.type === "tour"
          );

          // Skip guides with no tour assignments
          if (tourSegments.length === 0) {
            return {
              guideId: guideTimeline.guide.id,
              guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
              status: "skipped" as const,
              reason: "no_assignments",
            };
          }

          const guideEmail = guideTimeline.guide.email;

          // Skip if guide has no email
          if (!guideEmail) {
            return {
              guideId: guideTimeline.guide.id,
              guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
              status: "skipped" as const,
              reason: "no_email",
            };
          }

          // Build tours array for the manifest email
          const tours = tourSegments.map((segment) => {
            const tourTime = `${segment.startTime} - ${segment.endTime}`;
            return {
              tourName: segment.tour?.name || "Unknown Tour",
              time: tourTime,
              participantCount: segment.guestCount || 0,
              meetingPoint: undefined, // TODO: Add meeting point from tour data
              manifestUrl: segment.tourRunKey
                ? `${process.env.NEXT_PUBLIC_APP_URL}/org/${org.slug}/command-center?date=${dispatchDate}`
                : undefined,
            };
          });

          // Format the date for display
          const dateString = formatInTimeZone(
            new Date(dispatchDate),
            timezone,
            "EEEE, MMMM d, yyyy"
          );

          try {
            // Send the manifest email
            const emailService = createEmailService(orgConfig);
            const result = await emailService.sendGuideDailyManifest({
              guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
              guideEmail,
              date: dateString,
              tours,
            });

            if (result.success) {
              // Log the activity
              const services = createServices({ organizationId });
              await services.activityLog.log({
                entityType: "guide",
                entityId: guideTimeline.guide.id,
                action: "dispatch.manifest_sent",
                description: `Dispatch manifest sent to ${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName} for ${dateString} (${tourSegments.length} tours)`,
                actorType: "system",
                metadata: {
                  emailType: "dispatch_manifest",
                  messageId: result.messageId,
                  tourCount: tourSegments.length,
                  totalGuests: guideTimeline.totalGuests,
                  dispatchedBy,
                  dispatchDate,
                },
              });

              return {
                guideId: guideTimeline.guide.id,
                guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
                status: "sent" as const,
                channel: "email",
                messageId: result.messageId,
              };
            } else {
              return {
                guideId: guideTimeline.guide.id,
                guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
                status: "failed" as const,
                error: result.error || "Unknown error",
              };
            }
          } catch (error) {
            log.error(
              { err: error, guideId: guideTimeline.guide.id },
              "Failed to send dispatch notification to guide"
            );

            // Capture dispatch notification failures in Sentry
            Sentry.captureException(error, {
              tags: {
                service: "inngest",
                operation: "dispatch-notification",
                function: "send-dispatch-notifications",
              },
              extra: {
                organizationId,
                dispatchDate,
                guideId: guideTimeline.guide.id,
                guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
                guideEmail: guideTimeline.guide.email,
                tourCount: tourSegments.length,
              },
            });

            return {
              guideId: guideTimeline.guide.id,
              guideName: `${guideTimeline.guide.firstName} ${guideTimeline.guide.lastName}`,
              status: "failed" as const,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        });
      })
    );

    // Aggregate results
    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    // Log summary activity
    await step.run("log-dispatch-summary", async () => {
      const services = createServices({ organizationId });
      await services.activityLog.log({
        entityType: "organization",
        entityId: organizationId,
        action: "dispatch.notifications_completed",
        description: `Dispatch notifications completed for ${dispatchDate}: ${sent} sent, ${failed} failed, ${skipped} skipped`,
        actorType: "system",
        actorId: dispatchedBy,
        metadata: {
          dispatchDate,
          dispatchedBy,
          sent,
          failed,
          skipped,
          total: dispatchData.length,
        },
      });
    });

    return {
      sent,
      failed,
      skipped,
      total: dispatchData.length,
      results,
    };
  }
);
