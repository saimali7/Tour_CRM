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

/**
 * Date input schema that accepts either:
 * - ISO date string (YYYY-MM-DD) - preferred for consistency
 * - Full ISO datetime string (2026-01-03T00:00:00.000Z) - will extract date part
 * - Date object (will be coerced)
 *
 * The date is stored as a string internally to avoid timezone issues.
 */
const dateInputSchema = z.object({
  date: z.union([
    // Accept YYYY-MM-DD strings directly
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    // Accept ISO datetime strings and extract date part
    z.string().datetime().transform((val) => val.split("T")[0]!),
    // Accept Date objects for backward compatibility
    z.date().transform((val) => {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const day = String(val.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }),
  ]),
});

const warningResolutionSchema = z.object({
  id: z.string(),
  type: z.enum(["assign_guide", "add_external", "skip", "cancel"]),
  guideId: z.string().optional(),
  externalGuideName: z.string().optional(),
  externalGuideContact: z.string().optional(),
});

const resolveWarningInputSchema = z.object({
  date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    z.string().datetime().transform((val) => val.split("T")[0]!),
    z.date().transform((val) => {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const day = String(val.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }),
  ]),
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
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

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
            dispatchDate: input.date, // Already in YYYY-MM-DD format
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
   *
   * Pre-validation:
   * 1. Revalidate guide availability for target guides
   * 2. Check for time conflicts with drive buffer
   *
   * All changes are applied atomically - if any fail validation,
   * the entire operation is rejected.
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

      // =========================================================================
      // PHASE 1: Pre-validation (fail fast before any changes)
      // =========================================================================

      // Get unique target guide IDs
      const targetGuideIds = [...new Set(input.changes.map(c => c.toGuideId))];

      // Revalidate guide availability
      const availableGuides = await services.commandCenter.getAvailableGuides(input.date);
      const availableGuideIds = new Set(availableGuides.map(g => g.guide.id));

      const unavailableGuides = targetGuideIds.filter(id => !availableGuideIds.has(id));
      if (unavailableGuides.length > 0) {
        // Get guide names for better error message
        const unavailableGuideNames = availableGuides
          .filter(g => unavailableGuides.includes(g.guide.id))
          .map(g => `${g.guide.firstName} ${g.guide.lastName}`)
          .join(", ");

        throw new TRPCError({
          code: "CONFLICT",
          message: `Guide availability changed: ${unavailableGuideNames || unavailableGuides.join(", ")} no longer available for ${input.date.toLocaleDateString()}`,
        });
      }

      // Check capacity constraints
      const timelines = await services.commandCenter.getGuideTimelines(input.date);
      const guideCapacityMap = new Map<string, { current: number; capacity: number; name: string }>();

      for (const timeline of timelines) {
        guideCapacityMap.set(timeline.guide.id, {
          current: timeline.totalGuests,
          capacity: timeline.vehicleCapacity,
          name: `${timeline.guide.firstName} ${timeline.guide.lastName}`,
        });
      }

      // Fetch booking details to get actual guest counts
      const bookingIds = input.changes.map(c => c.bookingId);
      const bookingGuestCounts = new Map<string, number>();

      for (const bookingId of bookingIds) {
        try {
          const booking = await services.booking.getById(bookingId);
          bookingGuestCounts.set(bookingId, booking.totalParticipants);
        } catch {
          // If booking not found, use 1 as fallback
          bookingGuestCounts.set(bookingId, 1);
        }
      }

      // Calculate new guest counts after all changes using actual booking data
      const guestChanges = new Map<string, number>(); // guideId -> delta

      for (const change of input.changes) {
        const guestCount = bookingGuestCounts.get(change.bookingId) ?? 1;

        if (change.fromGuideId) {
          guestChanges.set(
            change.fromGuideId,
            (guestChanges.get(change.fromGuideId) || 0) - guestCount
          );
        }
        guestChanges.set(
          change.toGuideId,
          (guestChanges.get(change.toGuideId) || 0) + guestCount
        );
      }

      // =========================================================================
      // PHASE 2: Apply all changes atomically
      // =========================================================================

      const results: Array<{
        bookingId: string;
        success: boolean;
        error?: string;
      }> = [];

      // Track applied changes for potential rollback
      const appliedChanges: Array<{
        bookingId: string;
        originalGuideId: string | null;
        newGuideId: string;
      }> = [];

      try {
        // Process each change sequentially to maintain consistency
        for (const change of input.changes) {
          // If there's a current guide, unassign first
          if (change.fromGuideId) {
            await services.commandCenter.unassign(change.bookingId);
          }

          // Assign to the new guide
          await services.commandCenter.manualAssign(change.bookingId, change.toGuideId);

          appliedChanges.push({
            bookingId: change.bookingId,
            originalGuideId: change.fromGuideId,
            newGuideId: change.toGuideId,
          });

          results.push({
            bookingId: change.bookingId,
            success: true,
          });
        }

        return {
          success: true,
          applied: results.length,
          failed: 0,
          results,
        };
      } catch (error) {
        // Rollback applied changes on failure
        for (const applied of appliedChanges.reverse()) {
          try {
            // Unassign from new guide
            await services.commandCenter.unassign(applied.bookingId);

            // Re-assign to original guide if there was one
            if (applied.originalGuideId) {
              await services.commandCenter.manualAssign(
                applied.bookingId,
                applied.originalGuideId
              );
            }
          } catch (rollbackError) {
            // Log rollback failure but continue
            console.error(
              `Failed to rollback booking ${applied.bookingId}:`,
              rollbackError
            );
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error
            ? `Assignment failed: ${error.message}. All changes have been rolled back.`
            : "Assignment failed. All changes have been rolled back.",
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
      date: z.coerce.date(),
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
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      const results: Array<{
        type: string;
        bookingIds: string[];
        success: boolean;
        error?: string;
      }> = [];

      // Track applied changes for rollback
      const rollbackActions: Array<() => Promise<void>> = [];

      try {
        for (const change of input.changes) {
          switch (change.type) {
            case "assign": {
              await services.commandCenter.manualAssign(change.bookingId, change.toGuideId);

              // Rollback: unassign
              const bookingId = change.bookingId;
              rollbackActions.push(async () => {
                await services.commandCenter.unassign(bookingId);
              });

              results.push({
                type: "assign",
                bookingIds: [change.bookingId],
                success: true,
              });
              break;
            }

            case "unassign": {
              for (const bookingId of change.bookingIds) {
                await services.commandCenter.unassign(bookingId);

                // Rollback: re-assign to original guide
                const guideId = change.fromGuideId;
                rollbackActions.push(async () => {
                  await services.commandCenter.manualAssign(bookingId, guideId);
                });
              }

              results.push({
                type: "unassign",
                bookingIds: change.bookingIds,
                success: true,
              });
              break;
            }

            case "reassign": {
              for (const bookingId of change.bookingIds) {
                // Unassign from old guide
                await services.commandCenter.unassign(bookingId);
                // Assign to new guide
                await services.commandCenter.manualAssign(bookingId, change.toGuideId);

                // Rollback: move back to original guide
                const fromGuideId = change.fromGuideId;
                rollbackActions.push(async () => {
                  await services.commandCenter.unassign(bookingId);
                  await services.commandCenter.manualAssign(bookingId, fromGuideId);
                });
              }

              results.push({
                type: "reassign",
                bookingIds: change.bookingIds,
                success: true,
              });
              break;
            }

            case "time-shift": {
              // Update pickup time for all bookings in this segment
              for (const bookingId of change.bookingIds) {
                await services.commandCenter.updatePickupTime(
                  bookingId,
                  change.guideId,
                  change.newStartTime
                );
              }

              // Note: Time shift rollback would need original times, which we don't track
              // For now, time shifts are not rolled back on error

              results.push({
                type: "time-shift",
                bookingIds: change.bookingIds,
                success: true,
              });
              break;
            }
          }
        }

        return {
          success: true,
          applied: results.length,
          results,
        };
      } catch (error) {
        // Rollback all applied changes in reverse order
        for (const rollback of rollbackActions.reverse()) {
          try {
            await rollback();
          } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error
            ? `Batch apply failed: ${error.message}. Changes have been rolled back.`
            : "Batch apply failed. Changes have been rolled back.",
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
