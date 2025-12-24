import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import {
  pricingModelSchema,
  capacityModelSchema,
  schedulingTypeSchema,
  bookingOptionStatusSchema,
} from "@tour/validators";

// ============================================================
// SCHEMAS
// ============================================================

const createBookingOptionSchema = z.object({
  tourId: z.string(),
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(200).optional(),
  fullDescription: z.string().max(2000).optional(),
  badge: z.string().max(50).optional(),
  highlightText: z.string().max(200).optional(),
  pricingModel: pricingModelSchema,
  capacityModel: capacityModelSchema,
  schedulingType: schedulingTypeSchema.default("fixed"),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  status: bookingOptionStatusSchema.default("active"),
});

const updateBookingOptionSchema = createBookingOptionSchema
  .omit({ tourId: true })
  .partial();

// ============================================================
// ROUTER
// ============================================================

export const bookingOptionsRouter = createRouter({
  /**
   * List all booking options for a tour
   */
  listByTour: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.getByTourId(input.tourId);
    }),

  /**
   * List active booking options for a tour (customer-facing)
   */
  listActiveByTour: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.getActiveByTourId(input.tourId);
    }),

  /**
   * Get a single booking option
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.getById(input.id);
    }),

  /**
   * Get the default option for a tour
   */
  getDefault: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.getDefault(input.tourId);
    }),

  /**
   * Create a new booking option
   */
  create: adminProcedure
    .input(createBookingOptionSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.create(input);
    }),

  /**
   * Update a booking option
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateBookingOptionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.update(input.id, input.data);
    }),

  /**
   * Delete a booking option
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.bookingOption.delete(input.id);
      return { success: true };
    }),

  /**
   * Duplicate a booking option
   */
  duplicate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.duplicate(input.id, input.newName);
    }),

  /**
   * Set the default option for a tour
   */
  setDefault: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        optionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.bookingOption.setDefault(input.tourId, input.optionId);
      return { success: true };
    }),

  /**
   * Reorder booking options for a tour
   */
  reorder: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        orderedIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.bookingOption.reorder(input.tourId, input.orderedIds);
      return { success: true };
    }),

  /**
   * Initialize availability for a schedule
   * Called when creating a schedule
   */
  initializeScheduleAvailability: adminProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.bookingOption.initializeScheduleAvailability(input.scheduleId);
      return { success: true };
    }),
});
