import { inngest } from "../client";
import { createServices, createServiceLogger } from "@tour/services";
import { db, organizations } from "@tour/database";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import * as Sentry from "@sentry/nextjs";
import { addDays } from "date-fns";

const log = createServiceLogger("daily-optimization");

/**
 * Daily Optimization Cron Job
 *
 * Runs every hour and optimizes guide assignments at 4 AM in each organization's timezone.
 * This gives operators time to review and adjust before the day begins.
 *
 * Optimizes for TOMORROW (the next day) so operators have all day to review.
 *
 * Flow:
 * 1. At 4 AM org timezone: Run optimization for tomorrow
 * 2. Operators wake up, open Command Center, see "Optimized" status
 * 3. Resolve any warnings, adjust if needed
 * 4. Dispatch to guides
 */
export const dailyDispatchOptimization = inngest.createFunction(
  {
    id: "daily-dispatch-optimization",
    name: "Daily Dispatch Optimization",
    retries: 2,
    // Limit concurrency to avoid overwhelming the database
    concurrency: {
      limit: 5,
    },
  },
  { cron: "0 * * * *" }, // Run every hour to handle different timezones
  async ({ step }) => {
    // Step 1: Get all organizations with their timezones
    const orgsWithTimezones = await step.run("get-all-organizations", async () => {
      const orgs = await db
        .select({
          organizationId: organizations.id,
          name: organizations.name,
          timezone: organizations.timezone,
        })
        .from(organizations);

      return orgs;
    });

    const results: Array<{
      organizationId: string;
      name: string;
      skipped: boolean;
      reason?: string;
      optimizedDate?: string;
      assignments?: number;
      efficiency?: number;
      warnings?: number;
      error?: string;
    }> = [];

    // Step 2: Process each organization based on their timezone
    for (const orgData of orgsWithTimezones) {
      const orgResult = await step.run(
        `optimize-org-${orgData.organizationId}`,
        async () => {
          const timezone = orgData.timezone || "UTC";

          // Get current time in org timezone
          const nowUtc = new Date();
          const nowInOrgTz = toZonedTime(nowUtc, timezone);
          const currentHourInOrgTz = nowInOrgTz.getHours();

          // Only run optimization at 4 AM in the organization's timezone
          if (currentHourInOrgTz !== 4) {
            return {
              organizationId: orgData.organizationId,
              name: orgData.name,
              skipped: true,
              reason: `Not 4 AM in timezone ${timezone} (current hour: ${currentHourInOrgTz})`,
            };
          }

          log.info(
            { organizationId: orgData.organizationId, timezone },
            "Running daily optimization for organization"
          );

          try {
            // Calculate tomorrow's date in the org's timezone
            const tomorrowInOrgTz = addDays(nowInOrgTz, 1);
            tomorrowInOrgTz.setHours(0, 0, 0, 0);

            // Create services with org context
            const services = createServices({ organizationId: orgData.organizationId });

            // Run optimization for tomorrow
            const result = await services.commandCenter.optimize(tomorrowInOrgTz);

            // Log the activity
            await services.activityLog.log({
              entityType: "organization",
              entityId: orgData.organizationId,
              action: "dispatch.auto_optimized",
              description: `Daily auto-optimization completed for ${formatInTimeZone(tomorrowInOrgTz, timezone, "MMMM d, yyyy")}: ${result.assignments.length} assignments, ${result.efficiency}% efficiency, ${result.warnings.length} warnings`,
              actorType: "system",
              metadata: {
                optimizedDate: tomorrowInOrgTz.toISOString().split("T")[0],
                assignments: result.assignments.length,
                efficiency: result.efficiency,
                warnings: result.warnings.length,
                triggeredBy: "cron",
              },
            });

            log.info(
              {
                organizationId: orgData.organizationId,
                date: tomorrowInOrgTz.toISOString().split("T")[0],
                assignments: result.assignments.length,
                efficiency: result.efficiency,
                warnings: result.warnings.length,
              },
              "Daily optimization completed successfully"
            );

            return {
              organizationId: orgData.organizationId,
              name: orgData.name,
              skipped: false,
              optimizedDate: tomorrowInOrgTz.toISOString().split("T")[0],
              assignments: result.assignments.length,
              efficiency: result.efficiency,
              warnings: result.warnings.length,
            };
          } catch (error) {
            log.error(
              { err: error, organizationId: orgData.organizationId },
              "Daily optimization failed for organization"
            );

            // Report to Sentry
            Sentry.captureException(error, {
              tags: {
                service: "inngest",
                operation: "daily-optimization",
                function: "daily-dispatch-optimization",
              },
              extra: {
                organizationId: orgData.organizationId,
                organizationName: orgData.name,
                timezone,
              },
            });

            return {
              organizationId: orgData.organizationId,
              name: orgData.name,
              skipped: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }
      );

      results.push(orgResult);
    }

    // Aggregate stats
    const processed = results.filter((r) => !r.skipped && !r.error);
    const skipped = results.filter((r) => r.skipped);
    const failed = results.filter((r) => !r.skipped && r.error);

    log.info(
      {
        processedCount: processed.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        totalOrgs: orgsWithTimezones.length,
      },
      "Daily optimization cron completed"
    );

    return {
      summary: {
        processedOrganizations: processed.length,
        skippedOrganizations: skipped.length,
        failedOrganizations: failed.length,
        totalOrganizations: orgsWithTimezones.length,
      },
      processed: processed.map((r) => ({
        organizationId: r.organizationId,
        name: r.name,
        optimizedDate: r.optimizedDate,
        assignments: r.assignments,
        efficiency: r.efficiency,
        warnings: r.warnings,
      })),
      failed: failed.map((r) => ({
        organizationId: r.organizationId,
        name: r.name,
        error: r.error,
      })),
    };
  }
);
