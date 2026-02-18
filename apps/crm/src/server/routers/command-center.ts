import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import { inngest } from "@/inngest";
import { coerceDateInputToDateKey } from "@/lib/date-time";

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

const getServices = (ctx: { orgContext: { organizationId: string }; user?: { id?: string } | null }) =>
  createServices({ organizationId: ctx.orgContext.organizationId, userId: ctx.user?.id });

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Date input schema that accepts either:
 * - ISO date string (YYYY-MM-DD) - preferred for consistency
 * - Full ISO datetime string (2026-01-03T00:00:00.000Z) - will extract date part
 *
 * The date is stored as a string internally to avoid timezone issues.
 */
const dateInputValueSchema = z.string().min(1, "Date is required");

const dateInputSchema = z.object({
  date: dateInputValueSchema,
});

const warningResolutionSchema = z.object({
  id: z.string(),
  type: z.enum(["assign_guide", "add_external", "skip", "cancel"]),
  guideId: z.string().optional(),
  externalGuideName: z.string().optional(),
  externalGuideContact: z.string().optional(),
  bookingId: z.string().optional(),
  tourRunKey: z.string().optional(),
});

const resolveWarningInputSchema = z.object({
  date: dateInputValueSchema,
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

const addOutsourcedGuideToRunInputSchema = z.object({
  date: dateInputValueSchema,
  tourRunKey: z.string().min(1),
  externalGuideName: z.string().min(1),
  externalGuideContact: z.string().optional(),
});

const createTempGuideInputSchema = z.object({
  date: dateInputValueSchema,
  name: z.string().min(1),
  phone: z.string().min(1),
  vehicleCapacity: z.number().int().min(1).max(99),
});

const commandCenterDateSchema = dateInputValueSchema;

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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        const [status, tourRuns, timelines] = await Promise.all([
          services.commandCenter.getDispatchStatus(dateKey),
          services.commandCenter.getTourRuns(dateKey),
          services.commandCenter.getGuideTimelines(dateKey),
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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.getTourRuns(dateKey);
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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.getAvailableGuides(dateKey);
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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.getGuideTimelines(dateKey);
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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.optimize(dateKey);
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
      const services = getServices(ctx);

      try {
        // Map the input resolution to the service's expected format
        const serviceResolution = {
          id: input.resolution.id,
          label: "", // Not used by the service
          action: mapResolutionType(input.resolution.type),
          guideId: input.resolution.guideId,
          externalGuideName: input.resolution.externalGuideName,
          externalGuideContact: input.resolution.externalGuideContact,
          bookingId: input.resolution.bookingId,
          tourRunKey: input.resolution.tourRunKey,
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
      const services = getServices(ctx);

      try {
        await services.commandCenter.manualAssign(input.bookingId, input.guideId);
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
      const services = getServices(ctx);

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
   * Time-shift a booking's pickup time
   * Updates the calculated pickup time for a booking's guide assignment
   */
  timeShift: adminProcedure
    .input(z.object({
      bookingId: z.string(),
      guideId: z.string(),
      newStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = getServices(ctx);

      try {
        await services.commandCenter.updatePickupTime(
          input.bookingId,
          input.guideId,
          input.newStartTime
        );
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update pickup time",
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
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        const result = await services.commandCenter.dispatch(dateKey);

        // Emit dispatch.completed event to trigger guide notifications
        await inngest.send({
          name: "dispatch.completed",
          data: {
            organizationId: ctx.orgContext.organizationId,
            dispatchDate: dateKey,
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
      const services = getServices(ctx);

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
   * Moves bookings from one guide to another.
   *
   * This now delegates to `batchApplyChanges` so all capacity,
   * overlap, availability, and charter-exclusivity validation runs
   * through a single canonical dispatch engine.
   */
  applyReassignments: adminProcedure
    .input(z.object({
      date: commandCenterDateSchema,
      changes: z.array(z.object({
        bookingId: z.string(),
        fromGuideId: z.string().nullable(),
        toGuideId: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);
      try {
        // Delegate to the same batch engine used by adjust-mode apply.
        const batchChanges = input.changes.map((change) =>
          change.fromGuideId
            ? {
                type: "reassign" as const,
                bookingIds: [change.bookingId],
                fromGuideId: change.fromGuideId,
                toGuideId: change.toGuideId,
              }
            : {
                type: "assign" as const,
                bookingId: change.bookingId,
                toGuideId: change.toGuideId,
              }
        );
        const result = await services.commandCenter.batchApplyChanges(dateKey, batchChanges);

        return {
          success: result.success,
          applied: result.applied,
          failed: 0,
          results: input.changes.map((change) => ({
            bookingId: change.bookingId,
            success: true,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error
            ? `Assignment failed: ${error.message}`
            : "Assignment failed.",
          cause: error,
        });
      }
    }),
  /**
   * Batch apply all pending changes from adjust mode
   * Handles: assign, unassign, reassign, and time-shift changes
   *
   * Changes are applied atomically with rollback on failure.
   */
  batchApplyChanges: adminProcedure
    .input(z.object({
      date: commandCenterDateSchema,
      changes: z.array(z.discriminatedUnion("type", [
        // Assign: from hopper to guide
        z.object({
          type: z.literal("assign"),
          bookingId: z.string(),
          toGuideId: z.string(),
        }),
        // Unassign: remove from guide (back to hopper)
        z.object({
          type: z.literal("unassign"),
          bookingIds: z.array(z.string()),
          fromGuideId: z.string(),
        }),
        // Reassign: move from one guide to another
        z.object({
          type: z.literal("reassign"),
          bookingIds: z.array(z.string()),
          fromGuideId: z.string(),
          toGuideId: z.string(),
        }),
        // Time shift: change pickup time
        z.object({
          type: z.literal("time-shift"),
          bookingIds: z.array(z.string()),
          guideId: z.string(),
          newStartTime: z.string(), // HH:MM format
        }),
      ])),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.batchApplyChanges(dateKey, input.changes);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error
            ? `Batch apply failed: ${error.message}`
            : "Batch apply failed.",
          cause: error,
        });
      }
    }),

  addOutsourcedGuideToRun: adminProcedure
    .input(addOutsourcedGuideToRunInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.addOutsourcedGuideToRun({
          date: dateKey,
          tourRunKey: input.tourRunKey,
          externalGuideName: input.externalGuideName,
          externalGuideContact: input.externalGuideContact,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to add outsourced guide to run",
          cause: error,
        });
      }
    }),

  createTempGuide: adminProcedure
    .input(createTempGuideInputSchema)
    .mutation(async ({ ctx, input }) => {
      const services = getServices(ctx);
      const dateKey = normalizeCommandCenterDate(input.date, ctx.orgContext.organization.timezone);

      try {
        return await services.commandCenter.createTempGuideForDate({
          date: dateKey,
          name: input.name,
          phone: input.phone,
          vehicleCapacity: input.vehicleCapacity,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create temporary guide",
          cause: error,
        });
      }
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
): "assign_guide" | "add_external" | "cancel_tour" | "split_booking" | "acknowledge" {
  switch (type) {
    case "assign_guide":
      return "assign_guide";
    case "add_external":
      return "add_external";
    case "cancel":
      return "cancel_tour";
    case "skip":
      // Skip is handled as an acknowledgement on the service side
      return "acknowledge";
    default:
      return "assign_guide";
  }
}

function normalizeCommandCenterDate(
  value: string,
  organizationTimeZone: string | null | undefined
): string {
  try {
    return coerceDateInputToDateKey(value, organizationTimeZone);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Date must be in YYYY-MM-DD format or a valid datetime",
    });
  }
}
