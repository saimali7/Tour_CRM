import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import {
  checkAvailabilityInputSchema,
  guestBreakdownSchema,
} from "@tour/validators";

// =============================================================================
// INPUT SCHEMAS for Tour Availability Management
// =============================================================================

const createAvailabilityWindowSchema = z.object({
  tourId: z.string(),
  name: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  maxParticipantsOverride: z.number().positive().optional(),
  priceOverride: z.string().optional(),
  meetingPointOverride: z.string().optional(),
  meetingPointDetailsOverride: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateAvailabilityWindowSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullish(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  maxParticipantsOverride: z.number().positive().nullish(),
  priceOverride: z.string().nullish(),
  meetingPointOverride: z.string().nullish(),
  meetingPointDetailsOverride: z.string().nullish(),
  isActive: z.boolean().optional(),
  notes: z.string().nullish(),
});

const createDepartureTimeSchema = z.object({
  tourId: z.string(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  label: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const updateDepartureTimeSchema = z.object({
  id: z.string(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format").optional(),
  label: z.string().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const createBlackoutDateSchema = z.object({
  tourId: z.string(),
  date: z.coerce.date(),
  reason: z.string().optional(),
});

// ============================================================
// ROUTER
// ============================================================

export const availabilityRouter = createRouter({
  // ===========================================================================
  // TOUR AVAILABILITY CONFIG (Full CRUD for windows, times, blackouts)
  // ===========================================================================

  /**
   * Get complete availability configuration for a tour
   */
  getTourAvailability: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.getTourAvailabilityConfig(input.tourId);
    }),

  // ---------------------------------------------------------------------------
  // AVAILABILITY WINDOWS
  // ---------------------------------------------------------------------------

  createAvailabilityWindow: adminProcedure
    .input(createAvailabilityWindowSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.createAvailabilityWindow(input);
    }),

  updateAvailabilityWindow: adminProcedure
    .input(updateAvailabilityWindowSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const { id, ...updateData } = input;
      return services.tourAvailability.updateAvailabilityWindow(id, updateData);
    }),

  deleteAvailabilityWindow: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.tourAvailability.deleteAvailabilityWindow(input.id);
      return { success: true };
    }),

  getAvailabilityWindows: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.getAvailabilityWindowsForTour(input.tourId);
    }),

  // ---------------------------------------------------------------------------
  // DEPARTURE TIMES
  // ---------------------------------------------------------------------------

  createDepartureTime: adminProcedure
    .input(createDepartureTimeSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.createDepartureTime(input);
    }),

  updateDepartureTime: adminProcedure
    .input(updateDepartureTimeSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const { id, ...updateData } = input;
      return services.tourAvailability.updateDepartureTime(id, updateData);
    }),

  deleteDepartureTime: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.tourAvailability.deleteDepartureTime(input.id);
      return { success: true };
    }),

  getDepartureTimes: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.getDepartureTimesForTour(input.tourId);
    }),

  // ---------------------------------------------------------------------------
  // BLACKOUT DATES
  // ---------------------------------------------------------------------------

  createBlackoutDate: adminProcedure
    .input(createBlackoutDateSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.createBlackoutDate(input);
    }),

  deleteBlackoutDate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      await services.tourAvailability.deleteBlackoutDate(input.id);
      return { success: true };
    }),

  getBlackoutDates: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      const dateRange =
        input.startDate && input.endDate
          ? { start: input.startDate, end: input.endDate }
          : undefined;
      return services.tourAvailability.getBlackoutDatesForTour(
        input.tourId,
        dateRange
      );
    }),

  // ===========================================================================
  // SLOT AVAILABILITY CHECKING
  // ===========================================================================

  /**
   * Check if a specific slot is bookable (for real-time availability)
   */
  checkSlotAvailability: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
        requestedSpots: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.checkSlotAvailability(input);
    }),

  /**
   * Get available dates for a month (calendar view)
   */
  getAvailableDatesForMonth: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        year: z.number().min(2020).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.getAvailableDatesForMonth(
        input.tourId,
        input.year,
        input.month
      );
    }),

  /**
   * Get capacity heatmap for operations planning
   */
  getCapacityHeatmap: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        tourIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.tourAvailability.getCapacityHeatmap(
        { start: input.startDate, end: input.endDate },
        input.tourIds
      );
    }),

  // ===========================================================================
  // LEGACY BOOKING OPTIONS / SCHEDULE-BASED METHODS
  // ===========================================================================

  /**
   * THE CORE QUERY: Check availability for a tour on a date with guests
   *
   * Returns all booking options with calculated prices for the specific group.
   * This is the heart of the customer-first booking flow.
   */
  checkAvailability: protectedProcedure
    .input(checkAvailabilityInputSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.availability.checkAvailability(input);
    }),

  /**
   * Get schedule availability for a specific option
   * Useful for checking real-time capacity
   */
  getScheduleOptionAvailability: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        optionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });
      return services.bookingOption.getScheduleOptionAvailability(
        input.scheduleId,
        input.optionId
      );
    }),

  /**
   * Get add-ons for a selected booking option
   * Called after customer selects an option
   */
  getAddOns: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        optionId: z.string(),
        scheduleId: z.string().optional(),
        guests: guestBreakdownSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      // Get tour add-ons
      const addOns = await services.addOn.getTourAddOns(input.tourId);

      // Calculate prices for each add-on based on guests
      const { calculateAddOnPrice, formatAddOnPriceBreakdown } = await import(
        "@tour/services"
      );

      const calculatedAddOns = addOns
        .filter((addOn) => {
          // Check if add-on applies to this option
          const tourAddOn = addOn.tourAddOn;
          const applicableOptions = tourAddOn.applicableOptions;

          if (!applicableOptions || applicableOptions.length === 0) {
            return true; // Applies to all options
          }

          return (applicableOptions as string[]).includes(input.optionId);
        })
        .map((addOn) => {
          const pricing = addOn.tourAddOn.pricingStructure;

          // If no custom pricing structure, use simple price
          if (!pricing) {
            const price = addOn.product.price
              ? parseFloat(addOn.product.price)
              : 0;
            return {
              id: addOn.product.id,
              tourAddOnId: addOn.tourAddOn.id,
              name: addOn.product.name,
              description: addOn.product.description,
              imageUrl: addOn.product.imageUrl,
              totalPrice: {
                amount: Math.round(price * 100),
                currency: addOn.product.currency || "USD",
              },
              priceExplanation: `$${price.toFixed(2)}`,
              isRequired: addOn.tourAddOn.isRequired ?? false,
              isRecommended: addOn.tourAddOn.isRecommended ?? false,
              isIncluded: false,
              available: true,
            };
          }

          // Calculate using pricing structure
          const calculatedPrice = calculateAddOnPrice(
            pricing,
            input.guests,
            1, // unitsBooked
            1 // quantity
          );

          const priceBreakdown = formatAddOnPriceBreakdown(
            pricing,
            input.guests,
            1,
            1
          );

          // Check if included in this option
          const includedIn = addOn.tourAddOn.includedIn as string[] | null;
          const isIncluded = includedIn?.includes(input.optionId) ?? false;

          return {
            id: addOn.product.id,
            tourAddOnId: addOn.tourAddOn.id,
            name: addOn.product.name,
            description: addOn.product.description,
            imageUrl: addOn.product.imageUrl,
            totalPrice: calculatedPrice,
            priceExplanation: priceBreakdown,
            isRequired: addOn.tourAddOn.isRequired ?? false,
            isRecommended: addOn.tourAddOn.isRecommended ?? false,
            isIncluded,
            available: true, // TODO: Check inventory
          };
        });

      return calculatedAddOns;
    }),

  /**
   * Join waitlist for a sold-out schedule
   */
  joinWaitlist: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        optionId: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        guests: guestBreakdownSchema,
        customerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
      });

      // Import the waitlist table for direct insert
      const { db } = await import("@tour/database");
      const { waitlistEntries } = await import("@tour/database");

      const [entry] = await db
        .insert(waitlistEntries)
        .values({
          organizationId: ctx.orgContext.organizationId,
          scheduleId: input.scheduleId,
          bookingOptionId: input.optionId,
          customerId: input.customerId,
          email: input.email,
          phone: input.phone,
          adults: input.guests.adults,
          children: input.guests.children,
          infants: input.guests.infants,
          status: "waiting",
        })
        .returning();

      return entry;
    }),

  /**
   * Get waitlist for a schedule (admin)
   */
  getWaitlist: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, waitlistEntries, customers } = await import("@tour/database");
      const { eq, and, asc } = await import("drizzle-orm");

      return db.query.waitlistEntries.findMany({
        where: and(
          eq(waitlistEntries.scheduleId, input.scheduleId),
          eq(waitlistEntries.organizationId, ctx.orgContext.organizationId)
        ),
        orderBy: [asc(waitlistEntries.createdAt)],
        with: {
          customer: true,
          bookingOption: true,
        },
      });
    }),
});
