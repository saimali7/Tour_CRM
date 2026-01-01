import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

/**
 * Pickup Address Router - Manage predefined pickup locations
 *
 * Pickup addresses are used in the Tour Command Center for:
 * - Route optimization and drive time calculation
 * - Zone-based clustering for auto-assignment
 * - Consistent pickup instructions for guides
 */

const createPickupAddressSchema = z.object({
  /** Display name for the pickup location (e.g., "Marriott Marina") */
  name: z.string().min(1, "Name is required").max(255),
  /** Full street address */
  address: z.string().min(1, "Address is required"),
  /** Geographic zone for clustering (e.g., "Marina", "Downtown", "Palm") */
  zone: z.string().max(100).optional(),
  /** Short display name for compact UI */
  shortName: z.string().max(50).optional(),
  /** GPS latitude coordinate */
  latitude: z.number().min(-90).max(90).optional(),
  /** GPS longitude coordinate */
  longitude: z.number().min(-180).max(180).optional(),
  /** Instructions for drivers/guides on how to complete pickup */
  pickupInstructions: z.string().optional(),
  /** Average time in minutes to complete a pickup at this location */
  averagePickupMinutes: z.number().min(1).max(60).optional(),
  /** Sort order for display in lists */
  sortOrder: z.number().int().optional(),
});

const updatePickupAddressSchema = createPickupAddressSchema.partial().extend({
  /** Whether this pickup address is active */
  isActive: z.boolean().optional(),
});

export const pickupAddressRouter = createRouter({
  // ============================================================
  // QUERY OPERATIONS
  // ============================================================

  /**
   * Get all pickup addresses for the organization
   *
   * @example
   * // Get all active addresses
   * trpc.pickupAddress.getAll.useQuery()
   *
   * // Get addresses in Marina zone
   * trpc.pickupAddress.getAll.useQuery({ zone: "Marina" })
   *
   * // Include inactive addresses
   * trpc.pickupAddress.getAll.useQuery({ activeOnly: false })
   */
  getAll: protectedProcedure
    .input(z.object({
      zone: z.string().optional(),
      activeOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.getAll(input);
    }),

  /**
   * Get a single pickup address by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.getById(input.id);
    }),

  /**
   * Get all distinct zones for the organization
   * Returns unique zone names that have at least one active pickup address
   *
   * @example
   * const zones = trpc.pickupAddress.getZones.useQuery()
   * // ["Downtown", "Marina", "Palm"]
   */
  getZones: protectedProcedure
    .query(async ({ ctx }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.getZones();
    }),

  /**
   * Get all active pickup addresses in a specific zone
   */
  getByZone: protectedProcedure
    .input(z.object({ zone: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.getByZone(input.zone);
    }),

  /**
   * Search pickup addresses by name or address
   * Performs case-insensitive partial matching
   */
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.search(input.query);
    }),

  /**
   * Check if a pickup address exists and is active
   */
  isActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.isActive(input.id);
    }),

  // ============================================================
  // MUTATION OPERATIONS
  // ============================================================

  /**
   * Create a new pickup address
   *
   * @example
   * trpc.pickupAddress.create.useMutation().mutate({
   *   name: "Marriott Marina",
   *   address: "123 Marina Walk, Dubai Marina",
   *   zone: "Marina",
   *   latitude: 25.0768,
   *   longitude: 55.1340,
   *   pickupInstructions: "Meet at main lobby entrance",
   *   averagePickupMinutes: 5
   * })
   */
  create: adminProcedure
    .input(createPickupAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.create(input);
    }),

  /**
   * Update an existing pickup address
   */
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      data: updatePickupAddressSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.update(input.id, input.data);
    }),

  /**
   * Soft delete (deactivate) a pickup address
   * Sets isActive to false to preserve historical data
   */
  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.update(input.id, { isActive: false });
    }),

  /**
   * Reactivate a pickup address
   */
  reactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pickupAddress.update(input.id, { isActive: true });
    }),

  /**
   * Hard delete a pickup address
   * Use with caution - prefer deactivate for data preservation
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAddress.delete(input.id);
      return { success: true };
    }),

  /**
   * Reorder pickup addresses
   * Updates sort order based on array of IDs in desired order
   */
  reorder: adminProcedure
    .input(z.object({
      orderedIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.pickupAddress.reorderAddresses(input.orderedIds);
      return { success: true };
    }),

  /**
   * Bulk create pickup addresses
   */
  bulkCreate: adminProcedure
    .input(z.object({
      addresses: z.array(createPickupAddressSchema).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const results = [];
      const errors = [];

      for (const addressInput of input.addresses) {
        try {
          const address = await services.pickupAddress.create(addressInput);
          results.push(address);
        } catch (error) {
          errors.push({
            name: addressInput.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        created: results.length,
        failed: errors.length,
        results,
        errors,
      };
    }),

  /**
   * Update zone for multiple addresses
   */
  bulkUpdateZone: adminProcedure
    .input(z.object({
      ids: z.array(z.string()),
      zone: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      let updated = 0;
      for (const id of input.ids) {
        try {
          await services.pickupAddress.update(id, { zone: input.zone });
          updated++;
        } catch {
          // Continue with other addresses
        }
      }

      return { updated, total: input.ids.length };
    }),
});
