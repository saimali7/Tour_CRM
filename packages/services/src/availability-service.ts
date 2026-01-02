/**
 * Availability Service
 *
 * THE CORE of the customer-first booking flow.
 * Given a tour, date, and guests → returns all options with calculated prices.
 */

import { eq, and, gte, asc, sql } from "drizzle-orm";
import {
  bookingOptions,
  bookings,
  tourDepartureTimes,
  tourAvailabilityWindows,
  tourBlackoutDates,
  tours,
  type BookingOption,
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
import { createServiceLogger } from "./lib/logger";

const logger = createServiceLogger("availability");

// ============================================================
// TYPES
// ============================================================

export interface CheckAvailabilityInput {
  tourId: string;
  date: string; // ISO date YYYY-MM-DD
  guests: GuestBreakdown;
}

export interface TimeSlot {
  time: string;          // "10:00" (24-hour format)
  timeFormatted: string; // "10:00 AM"
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

    // 2. Check if this date is available (availability windows + blackout dates)
    const dateAvailable = await this.isDateAvailable(tourId, date);
    if (!dateAvailable) {
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
        alternatives: await this.findAlternatives(tourId, date),
      };
    }

    // 3. Get departure times for this tour
    const departureTimes = await this.getDepartureTimes(tourId);

    // 4. Get booking options for this tour
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
      logger.warn({ err: error, tourId }, "booking_options query failed, using legacy fallback");
    }

    // If no options configured, create a default "legacy" option from tour data
    if (options.length === 0) {
      // Check if there are departure times - if so, create a virtual option
      if (departureTimes.length > 0) {
        const pricePerPerson = tour.basePrice ? parseFloat(tour.basePrice) : 0;
        const totalPrice = pricePerPerson * totalGuests;
        const maxParticipants = tour.maxParticipants ?? 30;

        // Get booked counts for all time slots in parallel to avoid N+1 queries
        const bookedCounts = await Promise.all(
          departureTimes.map((dt) => this.getBookedCount(tourId, date, dt.time))
        );

        // Build time slots with booked counts
        const timeSlots = departureTimes.map((dt, index) => {
          const bookedCount = bookedCounts[index] ?? 0;
          const spotsLeft = maxParticipants - bookedCount;
          return {
            time: dt.time,
            timeFormatted: this.formatTimeString(dt.time),
            available: spotsLeft >= totalGuests,
            spotsLeft,
            almostFull: spotsLeft <= 3,
          };
        });

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
            priceBreakdown: `${totalGuests} x $${pricePerPerson.toFixed(2)}`,
            scheduling: {
              type: "fixed" as const,
              timeSlots,
            },
            capacityFit: {
              fits: true,
              statement: `${totalGuests} guests`,
            },
            available: timeSlots.some(s => s.available),
          }],
          soldOut: !timeSlots.some(s => s.available),
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

    // 5. Calculate prices and availability for each option
    const calculatedOptions: CalculatedOption[] = [];
    let sharedOption: CalculatedOption | null = null;

    for (const option of options) {
      const calculated = await this.calculateOption(
        option,
        guests,
        tourId,
        date,
        departureTimes
      );

      if (calculated) {
        calculatedOptions.push(calculated);

        // Track the shared option for comparisons
        if (calculated.experienceMode === "join") {
          sharedOption = calculated;
        }
      }
    }

    // 6. Generate comparisons to shared option
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

    // 7. Generate smart recommendations
    this.generateRecommendations(calculatedOptions, guests, sharedOption);

    // 8. Check if sold out
    const soldOut = calculatedOptions.every((o) => !o.available);

    // 9. If sold out, check for alternatives
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
   * Check if a date is available for a tour (within availability windows and not blacked out)
   */
  private async isDateAvailable(tourId: string, dateStr: string): Promise<boolean> {
    const checkDate = new Date(dateStr);
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Check for blackout date
    const blackout = await this.db.query.tourBlackoutDates.findFirst({
      where: and(
        eq(tourBlackoutDates.tourId, tourId),
        eq(tourBlackoutDates.organizationId, this.organizationId),
        sql`${tourBlackoutDates.date} = ${dateStr}::date`
      ),
    });

    if (blackout) {
      return false;
    }

    // Check availability windows
    const windows = await this.db.query.tourAvailabilityWindows.findMany({
      where: and(
        eq(tourAvailabilityWindows.tourId, tourId),
        eq(tourAvailabilityWindows.organizationId, this.organizationId),
        eq(tourAvailabilityWindows.isActive, true),
        sql`${tourAvailabilityWindows.startDate} <= ${dateStr}::date`,
        sql`(${tourAvailabilityWindows.endDate} IS NULL OR ${tourAvailabilityWindows.endDate} >= ${dateStr}::date)`
      ),
    });

    // If no windows defined, assume always available
    if (windows.length === 0) {
      return true;
    }

    // Check if any window includes this day of week
    return windows.some((window) => {
      const daysOfWeek = window.daysOfWeek as number[];
      return daysOfWeek.includes(dayOfWeek);
    });
  }

  /**
   * Get departure times for a tour
   */
  private async getDepartureTimes(tourId: string): Promise<Array<{ time: string; label?: string }>> {
    const times = await this.db.query.tourDepartureTimes.findMany({
      where: and(
        eq(tourDepartureTimes.tourId, tourId),
        eq(tourDepartureTimes.organizationId, this.organizationId),
        eq(tourDepartureTimes.isActive, true)
      ),
      orderBy: [asc(tourDepartureTimes.sortOrder), asc(tourDepartureTimes.time)],
    });

    return times.map((t) => ({
      time: t.time,
      label: t.label ?? undefined,
    }));
  }

  /**
   * Get the number of guests already booked for a tour on a specific date and time
   */
  private async getBookedCount(tourId: string, dateStr: string, time: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tourId, tourId),
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate} = ${dateStr}::date`,
          eq(bookings.bookingTime, time),
          sql`${bookings.status} NOT IN ('cancelled')`
        )
      );

    return result[0]?.total ?? 0;
  }

  /**
   * Calculate a single option for given guests and departure times
   */
  private async calculateOption(
    option: BookingOption,
    guests: GuestBreakdown,
    tourId: string,
    date: string,
    departureTimes: Array<{ time: string; label?: string }>
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
      tourId,
      date,
      departureTimes,
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
   * Optimized to fetch availability for all time slots in parallel
   */
  private async calculateScheduling(
    option: BookingOption,
    tourId: string,
    date: string,
    departureTimes: Array<{ time: string; label?: string }>,
    guests: GuestBreakdown,
    unitsNeeded?: number
  ): Promise<SchedulingInfo> {
    const schedulingType = option.schedulingType ?? "fixed";
    const totalGuests = guests.adults + guests.children + guests.infants;

    if (schedulingType === "fixed") {
      // Fixed times: show available time slots
      // Fetch availability for all time slots in parallel to avoid N+1 queries
      const availabilities = await Promise.all(
        departureTimes.map((dt) =>
          this.getOptionAvailabilityForTime(tourId, date, dt.time, option)
        )
      );

      const timeSlots: TimeSlot[] = departureTimes.map((dt, index) => {
        const availability = availabilities[index];
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

        return {
          time: dt.time,
          timeFormatted: this.formatTimeString(dt.time),
          available,
          spotsLeft,
          almostFull: spotsLeft !== undefined && spotsLeft <= 3,
        };
      });

      return { type: "fixed", timeSlots };
    } else {
      // Flexible: show time range
      if (departureTimes.length === 0) {
        return {
          type: "flexible",
          earliestDeparture: "Any time",
          latestDeparture: "Any time",
        };
      }

      const sortedTimes = [...departureTimes].sort((a, b) => a.time.localeCompare(b.time));

      const firstTime = sortedTimes[0];
      const lastTime = sortedTimes[sortedTimes.length - 1];

      return {
        type: "flexible",
        earliestDeparture: firstTime ? this.formatTimeString(firstTime.time) : "Any time",
        latestDeparture: lastTime ? this.formatTimeString(lastTime.time) : "Any time",
        suggestedTime: firstTime ? this.formatTimeString(firstTime.time) : undefined,
      };
    }
  }

  /**
   * Get availability for an option on a specific date/time
   */
  private async getOptionAvailabilityForTime(
    tourId: string,
    date: string,
    time: string,
    option: BookingOption
  ): Promise<{
    totalSeats: number | null;
    bookedSeats: number;
    totalUnits: number | null;
    bookedUnits: number;
  } | null> {
    // Get booked count from bookings table
    const bookedCount = await this.getBookedCount(tourId, date, time);

    // Derive capacity from option's capacity model
    const capacity = option.capacityModel;
    if (capacity.type === "shared") {
      return {
        totalSeats: capacity.totalSeats,
        bookedSeats: bookedCount,
        totalUnits: null,
        bookedUnits: 0,
      };
    } else {
      // For unit-based, we need to count units booked
      const unitsBooked = await this.getBookedUnits(tourId, date, time, option.id);
      return {
        totalSeats: null,
        bookedSeats: 0,
        totalUnits: capacity.totalUnits,
        bookedUnits: unitsBooked,
      };
    }
  }

  /**
   * Get the number of units already booked for a specific option on a date/time
   */
  private async getBookedUnits(
    tourId: string,
    dateStr: string,
    time: string,
    optionId: string
  ): Promise<number> {
    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(${bookings.unitsBooked}, 1)), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tourId, tourId),
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate} = ${dateStr}::date`,
          eq(bookings.bookingTime, time),
          eq(bookings.bookingOptionId, optionId),
          sql`${bookings.status} NOT IN ('cancelled')`
        )
      );

    return result[0]?.total ?? 0;
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
   * Optimized to check all nearby dates in parallel
   */
  private async findAlternatives(
    tourId: string,
    date: string
  ): Promise<CheckAvailabilityResponse["alternatives"]> {
    const baseDate = new Date(date);

    // Build list of dates to check (3 days before and after, excluding the requested date)
    const datesToCheck: string[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;

      const checkDate = new Date(baseDate);
      checkDate.setDate(checkDate.getDate() + offset);
      const isoString = checkDate.toISOString();
      const dateStr = isoString.split("T")[0] ?? isoString.slice(0, 10);
      datesToCheck.push(dateStr);
    }

    // Check availability for all dates in parallel to avoid N+1 queries
    const availabilityResults = await Promise.all(
      datesToCheck.map(async (dateStr) => {
        const dateAvailable = await this.isDateAvailable(tourId, dateStr);
        return { dateStr, dateAvailable };
      })
    );

    // Filter to available dates
    const availableDates = availabilityResults.filter((r) => r.dateAvailable);

    // If no available dates, return early
    if (availableDates.length === 0) {
      return {
        nearbyDates: undefined,
        waitlistAvailable: true,
      };
    }

    // Check departure times once (they're the same for all dates)
    const departureTimes = await this.getDepartureTimes(tourId);

    // Build nearby dates list
    const nearbyDates: Array<{ date: string; availability: "available" | "limited" }> = [];

    if (departureTimes.length > 0) {
      for (const { dateStr } of availableDates) {
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
   * Format time string (HH:MM) for display
   */
  private formatTimeString(time: string): string {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours ?? "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
}
