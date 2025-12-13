import { BaseService } from "./base-service";
import { SeasonalPricingService } from "./seasonal-pricing-service";
import { PromoCodeService } from "./promo-code-service";
import { GroupDiscountService } from "./group-discount-service";
import { ValidationError } from "./types";

/**
 * Applied pricing breakdown - which pricing rules were applied
 */
export interface AppliedPricing {
  seasonName?: string;
  groupTierName?: string;
  promoCode?: string;
}

/**
 * Detailed price calculation breakdown
 */
export interface PriceBreakdown {
  basePrice: number;
  seasonalAdjustment: number;
  groupDiscount: number;
  promoDiscount: number;
  finalPrice: number;
  appliedPricing: AppliedPricing;
}

/**
 * Service that combines all pricing logic (seasonal, group, promo)
 * into a single unified pricing calculation
 *
 * Pricing is applied in this order:
 * 1. Base price (from tour/schedule)
 * 2. Seasonal pricing adjustment (can increase or decrease)
 * 3. Group discount (always decreases)
 * 4. Promo code discount (always decreases)
 */
export class PricingCalculationService extends BaseService {
  private seasonalPricing: SeasonalPricingService;
  private promoCode: PromoCodeService;
  private groupDiscount: GroupDiscountService;

  constructor(ctx: { organizationId: string }) {
    super(ctx);
    this.seasonalPricing = new SeasonalPricingService(ctx);
    this.promoCode = new PromoCodeService(ctx);
    this.groupDiscount = new GroupDiscountService(ctx);
  }

  /**
   * Calculate the total price for a booking with all discounts and adjustments
   *
   * @param tourId - The tour ID
   * @param date - The tour date (for seasonal pricing)
   * @param basePrice - The base price per person
   * @param participantCount - Number of participants (for group discounts)
   * @param customerId - Customer ID (for promo code validation)
   * @param promoCode - Optional promo code to apply
   * @returns Complete price breakdown with all adjustments
   */
  async calculateTotalPrice(
    tourId: string,
    date: Date,
    basePrice: number,
    participantCount: number,
    customerId: string,
    promoCode?: string
  ): Promise<PriceBreakdown> {
    // Validate inputs
    if (basePrice < 0) {
      throw new ValidationError("Base price cannot be negative");
    }

    if (participantCount < 1) {
      throw new ValidationError("Participant count must be at least 1");
    }

    const appliedPricing: AppliedPricing = {};
    let currentPrice = basePrice;
    let seasonalAdjustment = 0;
    let groupDiscount = 0;
    let promoDiscount = 0;

    // Step 1: Apply seasonal pricing adjustment
    const seasonalResult = await this.seasonalPricing.calculateAdjustment(
      tourId,
      date,
      currentPrice
    );

    if (seasonalResult.appliedSeason) {
      seasonalAdjustment = seasonalResult.adjustment;
      currentPrice = seasonalResult.adjustedPrice;
      appliedPricing.seasonName = seasonalResult.seasonName ?? undefined;
    }

    // Step 2: Apply group discount
    // Group discount is calculated on the seasonally-adjusted price
    const groupResult = await this.groupDiscount.calculateDiscount(
      tourId,
      participantCount,
      currentPrice
    );

    if (groupResult.appliedDiscount) {
      groupDiscount = groupResult.discount;
      currentPrice = groupResult.discountedPrice;
      appliedPricing.groupTierName = groupResult.tierName ?? undefined;
    }

    // Step 3: Apply promo code discount (if provided)
    if (promoCode && promoCode.trim().length > 0) {
      // Validate promo code
      const validation = await this.promoCode.validateCode(
        promoCode,
        tourId,
        customerId,
        currentPrice
      );

      if (!validation.valid) {
        throw new ValidationError(
          validation.error || "Invalid promo code"
        );
      }

      if (validation.discount) {
        // Calculate promo discount on the current price (after seasonal + group)
        if (validation.discount.type === "percentage") {
          promoDiscount = (currentPrice * validation.discount.value) / 100;
        } else {
          // Fixed discount
          promoDiscount = validation.discount.value;
        }

        // Apply discount
        currentPrice = currentPrice - promoDiscount;

        // Ensure price doesn't go negative
        if (currentPrice < 0) {
          promoDiscount = currentPrice + promoDiscount; // Adjust discount to only go to 0
          currentPrice = 0;
        }

        appliedPricing.promoCode = promoCode.toUpperCase();
      }
    }

    // Round all values to 2 decimal places
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      seasonalAdjustment: Math.round(seasonalAdjustment * 100) / 100,
      groupDiscount: Math.round(groupDiscount * 100) / 100,
      promoDiscount: Math.round(promoDiscount * 100) / 100,
      finalPrice: Math.round(currentPrice * 100) / 100,
      appliedPricing,
    };
  }

  /**
   * Calculate price for multiple participants (for booking subtotal)
   *
   * @param tourId - The tour ID
   * @param date - The tour date
   * @param basePrice - The base price per person
   * @param adultCount - Number of adults
   * @param childCount - Number of children
   * @param infantCount - Number of infants
   * @param customerId - Customer ID
   * @param promoCode - Optional promo code
   * @param childPricePercentage - Child price as percentage of adult price (default 100%)
   * @param infantPricePercentage - Infant price as percentage of adult price (default 0%)
   * @returns Price breakdown with subtotal for all participants
   */
  async calculateBookingPrice(
    tourId: string,
    date: Date,
    basePrice: number,
    adultCount: number,
    childCount: number,
    infantCount: number,
    customerId: string,
    promoCode?: string,
    childPricePercentage: number = 100,
    infantPricePercentage: number = 0
  ): Promise<
    PriceBreakdown & {
      subtotal: number;
      perPersonPrice: number;
      totalParticipants: number;
    }
  > {
    const totalParticipants = adultCount + childCount + infantCount;

    // Calculate per-person price with all discounts
    const breakdown = await this.calculateTotalPrice(
      tourId,
      date,
      basePrice,
      totalParticipants,
      customerId,
      promoCode
    );

    // Calculate prices for different participant types
    const adultPrice = breakdown.finalPrice;
    const childPrice = (adultPrice * childPricePercentage) / 100;
    const infantPrice = (adultPrice * infantPricePercentage) / 100;

    // Calculate subtotal
    const subtotal =
      adultCount * adultPrice +
      childCount * childPrice +
      infantCount * infantPrice;

    return {
      ...breakdown,
      perPersonPrice: breakdown.finalPrice,
      subtotal: Math.round(subtotal * 100) / 100,
      totalParticipants,
    };
  }

  /**
   * Validate a promo code without calculating full price
   * Useful for showing validation messages in the UI
   *
   * @param code - Promo code to validate
   * @param tourId - Tour ID
   * @param customerId - Customer ID
   * @param bookingAmount - Current booking amount
   * @returns Validation result
   */
  async validatePromoCode(
    code: string,
    tourId: string,
    customerId: string,
    bookingAmount: number
  ) {
    return this.promoCode.validateCode(code, tourId, customerId, bookingAmount);
  }

  /**
   * Get applicable group discount tiers for a tour
   * Useful for showing potential savings in the UI
   *
   * @param tourId - Tour ID
   * @returns List of applicable group discount tiers
   */
  async getApplicableGroupTiers(tourId: string) {
    return this.groupDiscount.getApplicableTiers(tourId);
  }

  /**
   * Get the next group discount tier
   * Useful for upselling ("Add 2 more people and save 10%!")
   *
   * @param tourId - Tour ID
   * @param currentParticipants - Current number of participants
   * @returns Next tier or null if none
   */
  async getNextGroupTier(tourId: string, currentParticipants: number) {
    return this.groupDiscount.getNextTier(tourId, currentParticipants);
  }

  /**
   * Record promo code usage after booking is created
   * Should be called after successful booking creation
   *
   * @param code - Promo code that was used
   * @param bookingId - ID of the created booking
   * @param customerId - Customer ID
   * @param originalAmount - Amount before promo discount
   * @param finalAmount - Amount after promo discount
   * @param discountAmount - Amount saved
   */
  async recordPromoCodeUsage(
    code: string,
    bookingId: string,
    customerId: string,
    originalAmount: number,
    finalAmount: number,
    discountAmount: number
  ) {
    return this.promoCode.applyCode(
      code,
      bookingId,
      customerId,
      originalAmount,
      finalAmount,
      discountAmount
    );
  }
}
