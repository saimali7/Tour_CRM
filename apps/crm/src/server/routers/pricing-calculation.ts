import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

/**
 * Pricing calculation router
 * Provides endpoints for calculating booking prices with all discounts
 */
export const pricingCalculationRouter = createRouter({
  /**
   * Calculate price for a booking with all discounts and adjustments
   * Used in booking forms to show live price updates
   */
  calculatePrice: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        basePrice: z.number().positive(),
        participantCount: z.number().int().min(1),
        customerId: z.string(),
        promoCode: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.calculateTotalPrice(
        input.tourId,
        input.date,
        input.basePrice,
        input.participantCount,
        input.customerId,
        input.promoCode
      );
    }),

  /**
   * Calculate booking price with different participant types
   * Handles adult/child/infant pricing
   */
  calculateBookingPrice: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        date: z.coerce.date(),
        basePrice: z.number().positive(),
        adultCount: z.number().int().min(0),
        childCount: z.number().int().min(0),
        infantCount: z.number().int().min(0),
        customerId: z.string(),
        promoCode: z.string().optional(),
        childPricePercentage: z.number().min(0).max(100).default(100),
        infantPricePercentage: z.number().min(0).max(100).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.calculateBookingPrice(
        input.tourId,
        input.date,
        input.basePrice,
        input.adultCount,
        input.childCount,
        input.infantCount,
        input.customerId,
        input.promoCode,
        input.childPricePercentage,
        input.infantPricePercentage
      );
    }),

  /**
   * Validate a promo code without calculating full price
   * Shows immediate feedback when user enters a code
   */
  validatePromoCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        tourId: z.string(),
        customerId: z.string(),
        bookingAmount: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.validatePromoCode(
        input.code,
        input.tourId,
        input.customerId,
        input.bookingAmount
      );
    }),

  /**
   * Get applicable group discount tiers for a tour
   * Shows potential savings to customers
   */
  getApplicableGroupTiers: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.getApplicableGroupTiers(input.tourId);
    }),

  /**
   * Get the next group discount tier
   * For upselling messages like "Add 2 more people and save 10%!"
   */
  getNextGroupTier: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        currentParticipants: z.number().int().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.getNextGroupTier(
        input.tourId,
        input.currentParticipants
      );
    }),

  /**
   * Record promo code usage after booking creation
   * Called after successful booking to track promo usage
   */
  recordPromoCodeUsage: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        bookingId: z.string(),
        customerId: z.string(),
        originalAmount: z.number().positive(),
        finalAmount: z.number().positive(),
        discountAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.pricingCalculation.recordPromoCodeUsage(
        input.code,
        input.bookingId,
        input.customerId,
        input.originalAmount,
        input.finalAmount,
        input.discountAmount
      );
    }),
});
