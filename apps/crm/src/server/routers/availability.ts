import { z } from "zod";
import { createRouter, protectedProcedure, publicProcedure } from "../trpc";
import { createServices } from "@tour/services";
import {
  checkAvailabilityInputSchema,
  guestBreakdownSchema,
} from "@tour/validators";

// ============================================================
// ROUTER
// ============================================================

export const availabilityRouter = createRouter({
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
