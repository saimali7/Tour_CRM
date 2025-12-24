/**
 * Availability Service
 *
 * THE CORE of the customer-first booking flow.
 * Given a tour, date, and guests → returns all options with calculated prices.
 */

import { eq, and, gte, lt, asc } from "drizzle-orm";
import {
  bookingOptions,
  schedules,
  scheduleOptionAvailability,
  tours,
  type BookingOption,
  type Schedule,
  type PricingModel,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError } from "./types";
import {
  calculatePrice,
  checkCapacityFit,
  getExperienceMode,
  compareToBaseline,
  type GuestBreakdown,
  type CalculatedPrice,
} from "./pricing-calculator-service";

// ============================================================
// TYPES
// ============================================================

export interface CheckAvailabilityInput {
  tourId: string;
  date: string; // ISO date YYYY-MM-DD
  guests: GuestBreakdown;
}

export interface TimeSlot {
  time: string;          // "10:00 AM"
  scheduleId: string;
  available: boolean;
  spotsLeft?: number;
  almostFull: boolean;
}

export type SchedulingInfo =
  | { type: "fixed"; timeSlots: TimeSlot[] }
  | { type: "flexible"; earliestDeparture: string; latestDeparture: string; suggestedTime?: string };

export interface CapacityFitInfo {
  fits: boolean;
  unitsNeeded?: number;
  fitsInOneUnit?: boolean;
  statement?: string;
}

export interface ComparisonInfo {
  vsShared?: {
    difference: { amount: number; currency: string };
    percentMore: number;
    statement: string;
  };
}

export type BadgeType = "BEST_VALUE" | "RECOMMENDED" | "BEST_FOR_FAMILIES" | "LUXURY" | "SAVE_MONEY" | "PERFECT_FIT";

export interface CalculatedOption {
  id: string;
  name: string;
  shortDescription?: string;
  experienceMode: "join" | "book" | "charter";

  // Pre-calculated price for this group
  totalPrice: { amount: number; currency: string };
  priceBreakdown: string;

  // Comparison and recommendations
  comparison?: ComparisonInfo;
  badge?: BadgeType;
  recommendation?: string;

  // Scheduling
  scheduling: SchedulingInfo;

  // Capacity fit
  capacityFit: CapacityFitInfo;

  // Availability
  available: boolean;
  urgency?: string;
}

export interface CheckAvailabilityResponse {
  tour: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  date: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  options: CalculatedOption[];
  soldOut: boolean;
  alternatives?: {
    nearbyDates?: Array<{ date: string; availability: "available" | "limited" }>;
    waitlistAvailable?: boolean;
  };
}

// ============================================================
// AVAILABILITY SERVICE
// ============================================================

export class AvailabilityService extends BaseService {
  /**
   * Main query: Check availability for a tour on a date with specific guests
   */
  async checkAvailability(input: CheckAvailabilityInput): Promise<CheckAvailabilityResponse> {
    const { tourId, date, guests } = input;
    const totalGuests = guests.adults + guests.children + guests.infants;

    // 1. Get the tour
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    // 2. Get schedules for this date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const daySchedules = await this.db.query.schedules.findMany({
      where: and(
        eq(schedules.tourId, tourId),
        eq(schedules.organizationId, this.organizationId),
        gte(schedules.startsAt, startOfDay),
        lt(schedules.startsAt, endOfDay),
        eq(schedules.status, "scheduled")
      ),
      orderBy: [asc(schedules.startsAt)],
    });

    // 3. Get booking options for this tour
    // Note: If booking_options table doesn't exist yet, gracefully return empty
    let options: BookingOption[] = [];
    try {
      options = await this.db.query.bookingOptions.findMany({
        where: and(
          eq(bookingOptions.tourId, tourId),
          eq(bookingOptions.organizationId, this.organizationId),
          eq(bookingOptions.status, "active")
        ),
        orderBy: [asc(bookingOptions.sortOrder)],
      });
    } catch (error) {
      // Table might not exist yet - fall through to legacy handling
      console.warn("[AvailabilityService] booking_options query failed, using legacy fallback:", error);
    }

    // If no options configured, create a default "legacy" option from tour data
    if (options.length === 0) {
      // Check if there are schedules available - if so, create a virtual option
      if (daySchedules.length > 0) {
        const schedule = daySchedules[0];
        const pricePerPerson = tour.basePrice ? parseFloat(tour.basePrice) : 0;
        const totalPrice = pricePerPerson * totalGuests;

        return {
          tour: {
            id: tour.id,
            name: tour.name,
            imageUrl: tour.coverImageUrl ?? undefined,
          },
          date,
          guests: { ...guests, total: totalGuests },
          options: [{
            id: "legacy-default",
            name: "Standard Experience",
            shortDescription: tour.shortDescription ?? undefined,
            experienceMode: "join" as const,
            totalPrice: {
              amount: Math.round(totalPrice * 100),
              currency: "USD",
            },
            priceBreakdown: `${totalGuests} × $${pricePerPerson.toFixed(2)}`,
            scheduling: {
              type: "fixed" as const,
              timeSlots: daySchedules.map(s => ({
                time: this.formatTime(s.startsAt),
                scheduleId: s.id,
                available: (s.maxParticipants ?? 30) - (s.bookedCount ?? 0) >= totalGuests,
                spotsLeft: (s.maxParticipants ?? 30) - (s.bookedCount ?? 0),
                almostFull: ((s.maxParticipants ?? 30) - (s.bookedCount ?? 0)) <= 3,
              })),
            },
            capacityFit: {
              fits: true,
              statement: `${totalGuests} guests`,
            },
            available: daySchedules.some(s =>
              (s.maxParticipants ?? 30) - (s.bookedCount ?? 0) >= totalGuests
            ),
          }],
          soldOut: false,
        };
      }

      return {
        tour: {
          id: tour.id,
          name: tour.name,
          imageUrl: tour.coverImageUrl ?? undefined,
        },
        date,
        guests: { ...guests, total: totalGuests },
        options: [],
        soldOut: true,
      };
    }

    // 4. Calculate prices and availability for each option
    const calculatedOptions: CalculatedOption[] = [];
    let sharedOption: CalculatedOption | null = null;

    for (const option of options) {
      const calculated = await this.calculateOption(
        option,
        guests,
        daySchedules
      );

      if (calculated) {
        calculatedOptions.push(calculated);

        // Track the shared option for comparisons
        if (calculated.experienceMode === "join") {
          sharedOption = calculated;
        }
      }
    }

    // 5. Generate comparisons to shared option
    if (sharedOption) {
      for (const option of calculatedOptions) {
        if (option.id !== sharedOption.id) {
          const comparison = compareToBaseline(
            option.totalPrice,
            sharedOption.totalPrice
          );
          if (comparison) {
            option.comparison = { vsShared: comparison };
          }
        }
      }
    }

    // 6. Generate smart recommendations
    this.generateRecommendations(calculatedOptions, guests, sharedOption);

    // 7. Check if sold out
    const soldOut = calculatedOptions.every((o) => !o.available);

    // 8. If sold out, check for alternatives
    let alternatives: CheckAvailabilityResponse["alternatives"];
    if (soldOut) {
      alternatives = await this.findAlternatives(tourId, date);
    }

    return {
      tour: {
        id: tour.id,
        name: tour.name,
        imageUrl: tour.coverImageUrl ?? undefined,
      },
      date,
      guests: { ...guests, total: totalGuests },
      options: calculatedOptions,
      soldOut,
      alternatives,
    };
  }

  /**
   * Calculate a single option for given guests and schedules
   */
  private async calculateOption(
    option: BookingOption,
    guests: GuestBreakdown,
    daySchedules: Schedule[]
  ): Promise<CalculatedOption | null> {
    const pricingModel = option.pricingModel as PricingModel;

    // 1. Check if group fits this option
    const capacityFit = checkCapacityFit(pricingModel, guests);
    if (!capacityFit.fits) {
      return null; // Filter out options that don't fit
    }

    // 2. Calculate price
    const priceResult = calculatePrice(pricingModel, guests);
    if (!priceResult) {
      return null; // Price couldn't be calculated
    }

    // 3. Determine experience mode
    const experienceMode = getExperienceMode(pricingModel);

    // 4. Calculate scheduling and availability
    const scheduling = await this.calculateScheduling(
      option,
      daySchedules,
      guests,
      capacityFit.unitsNeeded
    );

    // 5. Check overall availability
    const available = this.checkOverallAvailability(scheduling);

    // 6. Generate urgency message
    const urgency = this.generateUrgencyMessage(scheduling);

    return {
      id: option.id,
      name: option.name,
      shortDescription: option.shortDescription ?? undefined,
      experienceMode,
      totalPrice: priceResult.total,
      priceBreakdown: priceResult.breakdown,
      scheduling,
      capacityFit: {
        fits: true,
        unitsNeeded: priceResult.unitsNeeded,
        fitsInOneUnit: priceResult.fitsInOneUnit,
        statement: capacityFit.statement,
      },
      available,
      urgency,
      badge: option.badge as BadgeType | undefined,
    };
  }

  /**
   * Calculate scheduling info for an option
   */
  private async calculateScheduling(
    option: BookingOption,
    daySchedules: Schedule[],
    guests: GuestBreakdown,
    unitsNeeded?: number
  ): Promise<SchedulingInfo> {
    const schedulingType = option.schedulingType ?? "fixed";
    const totalGuests = guests.adults + guests.children + guests.infants;

    if (schedulingType === "fixed") {
      // Fixed schedules: show available time slots
      const timeSlots: TimeSlot[] = [];

      for (const schedule of daySchedules) {
        // Get availability for this option on this schedule
        const availability = await this.getOptionAvailability(
          schedule.id,
          option.id,
          option
        );

        let available = false;
        let spotsLeft: number | undefined;

        if (availability) {
          if (availability.totalSeats !== null) {
            // Shared capacity
            const remaining = availability.totalSeats - availability.bookedSeats;
            available = totalGuests <= remaining;
            spotsLeft = remaining;
          } else if (availability.totalUnits !== null) {
            // Unit capacity
            const remainingUnits = availability.totalUnits - availability.bookedUnits;
            available = (unitsNeeded ?? 1) <= remainingUnits;
            spotsLeft = remainingUnits; // Units left, not people
          }
        }

        timeSlots.push({
          time: this.formatTime(schedule.startsAt),
          scheduleId: schedule.id,
          available,
          spotsLeft,
          almostFull: spotsLeft !== undefined && spotsLeft <= 3,
        });
      }

      return { type: "fixed", timeSlots };
    } else {
      // Flexible schedules: show time range
      if (daySchedules.length === 0) {
        return {
          type: "flexible",
          earliestDeparture: "Any time",
          latestDeparture: "Any time",
        };
      }

      const sortedSchedules = [...daySchedules].sort(
        (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
      );

      const firstSchedule = sortedSchedules[0];
      const lastSchedule = sortedSchedules[sortedSchedules.length - 1];

      return {
        type: "flexible",
        earliestDeparture: firstSchedule ? this.formatTime(firstSchedule.startsAt) : "Any time",
        latestDeparture: lastSchedule ? this.formatTime(lastSchedule.startsAt) : "Any time",
        suggestedTime: firstSchedule ? this.formatTime(firstSchedule.startsAt) : undefined,
      };
    }
  }

  /**
   * Get availability for an option on a schedule
   */
  private async getOptionAvailability(
    scheduleId: string,
    optionId: string,
    option: BookingOption
  ): Promise<{
    totalSeats: number | null;
    bookedSeats: number;
    totalUnits: number | null;
    bookedUnits: number;
  } | null> {
    // Try to get from schedule_option_availability table
    const availability = await this.db.query.scheduleOptionAvailability.findFirst({
      where: and(
        eq(scheduleOptionAvailability.scheduleId, scheduleId),
        eq(scheduleOptionAvailability.bookingOptionId, optionId)
      ),
    });

    if (availability) {
      return {
        totalSeats: availability.totalSeats,
        bookedSeats: availability.bookedSeats ?? 0,
        totalUnits: availability.totalUnits,
        bookedUnits: availability.bookedUnits ?? 0,
      };
    }

    // Fallback: derive from option's capacity model
    const capacity = option.capacityModel;
    if (capacity.type === "shared") {
      return {
        totalSeats: capacity.totalSeats,
        bookedSeats: 0,
        totalUnits: null,
        bookedUnits: 0,
      };
    } else {
      return {
        totalSeats: null,
        bookedSeats: 0,
        totalUnits: capacity.totalUnits,
        bookedUnits: 0,
      };
    }
  }

  /**
   * Check if any time slot is available
   */
  private checkOverallAvailability(scheduling: SchedulingInfo): boolean {
    if (scheduling.type === "fixed") {
      return scheduling.timeSlots.some((slot) => slot.available);
    }
    // Flexible is always "available" (subject to capacity)
    return true;
  }

  /**
   * Generate urgency message based on availability
   */
  private generateUrgencyMessage(scheduling: SchedulingInfo): string | undefined {
    if (scheduling.type !== "fixed") {
      return undefined;
    }

    const availableSlots = scheduling.timeSlots.filter((s) => s.available);
    if (availableSlots.length === 0) {
      return undefined;
    }

    // Check for low capacity across slots
    const lowestSpots = Math.min(
      ...availableSlots
        .filter((s) => s.spotsLeft !== undefined)
        .map((s) => s.spotsLeft!)
    );

    if (lowestSpots <= 2) {
      return `Only ${lowestSpots} spot${lowestSpots === 1 ? "" : "s"} left!`;
    }
    if (lowestSpots <= 5) {
      return "Limited availability";
    }
    if (availableSlots.length === 1) {
      return "Last time slot available";
    }

    return undefined;
  }

  /**
   * Generate smart recommendations for options
   */
  private generateRecommendations(
    options: CalculatedOption[],
    guests: GuestBreakdown,
    sharedOption: CalculatedOption | null
  ): void {
    const totalGuests = guests.adults + guests.children + guests.infants;

    for (const option of options) {
      // Skip if already has a badge or is the shared option
      if (option.badge || option.experienceMode === "join") {
        continue;
      }

      // Rule 1: BEST_VALUE - Private is <25% more than shared
      if (sharedOption && option.comparison?.vsShared) {
        const { percentMore } = option.comparison.vsShared;
        if (percentMore > 0 && percentMore < 25) {
          option.badge = "BEST_VALUE";
          option.recommendation = "Great value for privacy";
          continue;
        }
        // SAVE_MONEY - Private is cheaper than shared
        if (percentMore < 0) {
          option.badge = "SAVE_MONEY";
          option.recommendation = "Cheaper than shared for your group!";
          continue;
        }
      }

      // Rule 2: BEST_FOR_FAMILIES - Has children and fits in one unit
      if (guests.children > 0 && option.capacityFit.fitsInOneUnit) {
        option.badge = "BEST_FOR_FAMILIES";
        option.recommendation = "Private experience for your family";
        continue;
      }

      // Rule 3: PERFECT_FIT - Group fills 75%+ of a single unit
      if (option.capacityFit.fitsInOneUnit && option.experienceMode === "book") {
        // This would require knowing the unit capacity, which we'd need to track
        // For now, just recommend if fits perfectly
        if (totalGuests >= 3) {
          option.badge = "RECOMMENDED";
          option.recommendation = "Great fit for your group size";
        }
      }
    }
  }

  /**
   * Find alternative dates if requested date is sold out
   */
  private async findAlternatives(
    tourId: string,
    date: string
  ): Promise<CheckAvailabilityResponse["alternatives"]> {
    const baseDate = new Date(date);
    const nearbyDates: Array<{ date: string; availability: "available" | "limited" }> = [];

    // Check 3 days before and after
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;

      const checkDate = new Date(baseDate);
      checkDate.setDate(checkDate.getDate() + offset);
      const isoString = checkDate.toISOString();
      const dateStr = isoString.split("T")[0] ?? isoString.slice(0, 10);

      // Quick check if any schedules exist
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59`);

      const daySchedules = await this.db.query.schedules.findMany({
        where: and(
          eq(schedules.tourId, tourId),
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, startOfDay),
          lt(schedules.startsAt, endOfDay),
          eq(schedules.status, "scheduled")
        ),
        limit: 1,
      });

      if (daySchedules.length > 0) {
        // TODO: Check actual availability
        nearbyDates.push({
          date: dateStr,
          availability: "available",
        });
      }
    }

    return {
      nearbyDates: nearbyDates.length > 0 ? nearbyDates : undefined,
      waitlistAvailable: true,
    };
  }

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}
