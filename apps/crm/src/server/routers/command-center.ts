import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { inngest } from "@/inngest";

/**
 * Command Center Router
 *
 * The "Tour Command Center" - provides tRPC endpoints for daily dispatch operations.
 * Handles guide assignments, optimization, and dispatch for tour runs.
 *
 * Key capabilities:
 * - Get dispatch status and tour runs for a date
 * - Get available guides for a date
 * - Generate guide timelines for visualization
 * - Run optimization algorithm for guide assignments
 * - Handle manual assignments and warning resolutions
 * - Dispatch notifications to guides
 */

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const dateInputSchema = z.object({
  date: z.coerce.date(),
});

const warningResolutionSchema = z.object({
  id: z.string(),
  type: z.enum(["assign_guide", "add_external", "skip", "cancel"]),
  guideId: z.string().optional(),
  externalGuideName: z.string().optional(),
  externalGuideContact: z.string().optional(),
});

const resolveWarningInputSchema = z.object({
  date: z.coerce.date(),
  warningId: z.string(),
  resolution: warningResolutionSchema,
});

const manualAssignInputSchema = z.object({
  bookingId: z.string(),
  guideId: z.string(),
});

const unassignInputSchema = z.object({
  bookingId: z.string(),
});

const guestDetailsInputSchema = z.object({
  bookingId: z.string(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const commandCenterRouter = createRouter({
  /**
   * Get full dispatch data for a date
   * Returns status, tour runs, and guide timelines
   */
  getDispatch: adminProcedure
    .input(dateInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        const [status, tourRuns, timelines] = await Promise.all([
          services.commandCenter.getDispatchStatus(input.date),
          services.commandCenter.getTourRuns(input.date),
          services.commandCenter.getGuideTimelines(input.date),
        ]);

        return {
          status,
          tourRuns,
          timelines,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get dispatch data",
          cause: error,
        });
      }
    }),

  /**
   * Get tour runs for a date
   * A "tour run" = tourId + date + time grouping
   */
  getTourRuns: adminProcedure
    .input(dateInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        return await services.commandCenter.getTourRuns(input.date);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get tour runs",
          cause: error,
        });
      }
    }),

  /**
   * Get available guides for a date
   * Checks availability patterns and overrides
   */
  getAvailableGuides: adminProcedure
    .input(dateInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        return await services.commandCenter.getAvailableGuides(input.date);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get available guides",
          cause: error,
        });
      }
    }),

  /**
   * Get guide timelines for visualization
   * Returns guide rows with their segments (drive, pickup, tour)
   */
  getGuideTimelines: adminProcedure
    .input(dateInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        return await services.commandCenter.getGuideTimelines(input.date);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get guide timelines",
          cause: error,
        });
      }
    }),

  /**
   * Run optimization for a date
   * Assigns guides to tour runs optimally
   */
  optimize: adminProcedure
    .input(dateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        return await services.commandCenter.optimize(input.date);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to run optimization",
          cause: error,
        });
      }
    }),

  /**
   * Resolve a warning
   * Applies the selected resolution to address the warning
   */
  resolveWarning: adminProcedure
    .input(resolveWarningInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        // Map the input resolution to the service's expected format
        const serviceResolution = {
          id: input.resolution.id,
          label: "", // Not used by the service
          action: mapResolutionType(input.resolution.type),
          guideId: input.resolution.guideId,
        };

        await services.commandCenter.resolveWarning(
          input.warningId,
          serviceResolution
        );

        return { success: true };
      } catch (error) {
        // Handle ValidationError specifically
        if (error instanceof Error && error.name === "ValidationError") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to resolve warning",
          cause: error,
        });
      }
    }),

  /**
   * Manual assignment
   * Assigns a specific guide to a booking
   */
  manualAssign: adminProcedure
    .input(manualAssignInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        await services.commandCenter.manualAssign(input.bookingId, input.guideId);
        return { success: true };
      } catch (error) {
        // Handle NotFoundError specifically
        if (error instanceof Error && error.name === "NotFoundError") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to assign guide",
          cause: error,
        });
      }
    }),

  /**
   * Unassign a booking
   * Removes the current guide assignment from a booking
   */
  unassign: adminProcedure
    .input(unassignInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        await services.commandCenter.unassign(input.bookingId);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to unassign booking",
          cause: error,
        });
      }
    }),

  /**
   * Dispatch (finalize and notify)
   * Sends notifications to all assigned guides for the date
   */
  dispatch: adminProcedure
    .input(dateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        const result = await services.commandCenter.dispatch(input.date);

        // Emit dispatch.completed event to trigger guide notifications
        await inngest.send({
          name: "dispatch.completed",
          data: {
            organizationId: ctx.orgContext.organizationId,
            dispatchDate: input.date.toISOString().split("T")[0] || "",
            dispatchedBy: ctx.user?.id || "system",
          },
        });

        return result;
      } catch (error) {
        // Handle ValidationError specifically
        if (error instanceof Error && error.name === "ValidationError") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to dispatch",
          cause: error,
        });
      }
    }),

  /**
   * Get guest details for a booking
   * Returns detailed information about guests and their assignment
   */
  getGuestDetails: protectedProcedure
    .input(guestDetailsInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      try {
        return await services.commandCenter.getGuestDetails(input.bookingId);
      } catch (error) {
        // Handle NotFoundError specifically
        if (error instanceof Error && error.name === "NotFoundError") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get guest details",
          cause: error,
        });
      }
    }),

  /**
   * Apply guide reassignments (bulk update from adjust mode)
   * Moves bookings from one guide to another
   */
  applyReassignments: adminProcedure
    .input(z.object({
      date: z.coerce.date(),
      changes: z.array(z.object({
        bookingId: z.string(),
        fromGuideId: z.string().nullable(),
        toGuideId: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      const results: Array<{
        bookingId: string;
        success: boolean;
        error?: string;
      }> = [];

      // Process each change sequentially to maintain consistency
      for (const change of input.changes) {
        try {
          // If there's a current guide, unassign first
          if (change.fromGuideId) {
            await services.commandCenter.unassign(change.bookingId);
          }

          // Assign to the new guide
          await services.commandCenter.manualAssign(change.bookingId, change.toGuideId);

          results.push({
            bookingId: change.bookingId,
            success: true,
          });
        } catch (error) {
          results.push({
            bookingId: change.bookingId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount > 0 && successCount === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `All ${failedCount} reassignments failed`,
        });
      }

      return {
        success: failedCount === 0,
        applied: successCount,
        failed: failedCount,
        results,
      };
    }),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map frontend resolution type to service action type
 */
function mapResolutionType(
  type: "assign_guide" | "add_external" | "skip" | "cancel"
): "assign_guide" | "add_external" | "cancel_tour" | "split_booking" {
  switch (type) {
    case "assign_guide":
      return "assign_guide";
    case "add_external":
      return "add_external";
    case "cancel":
      return "cancel_tour";
    case "skip":
      // Skip is handled as a no-op on the service side
      // For now, we map it to cancel_tour as a fallback
      return "cancel_tour";
    default:
      return "assign_guide";
  }
}
