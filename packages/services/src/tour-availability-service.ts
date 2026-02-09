/**
 * Tour Availability Service
 *
 * Manages tour availability for the new availability-based booking model.
 * Replaces the need for pre-creating schedules by computing availability
 * dynamically from availability windows, departure times, and bookings.
 */

import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import {
  tours,
  tourAvailabilityWindows,
  tourDepartureTimes,
  tourBlackoutDates,
  bookings,
  type Tour,
  type TourAvailabilityWindow,
  type TourDepartureTime,
  type TourBlackoutDate,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface SlotAvailabilityCheck {
  tourId: string;
  date: Date;
  time: string;
  requestedSpots: number;
  /**
   * Optional booking ID to exclude from capacity calculation.
   * Used when rescheduling a booking to a new slot - the booking
   * being moved should not count against the new slot's capacity.
   */
  excludeBookingId?: string;
}

export interface SlotAvailabilityResult {
  available: boolean;
  spotsRemaining: number;
  maxCapacity: number;
  bookedCount: number;
  reason?:
    | "not_operating"
    | "sold_out"
    | "insufficient_capacity"
    | "past_date"
    | "tour_inactive"
    | "same_day_booking_disabled"
    | "same_day_cutoff_passed";
}

export interface DateSlot {
  time: string;
  label?: string;
  spotsRemaining: number;
  maxCapacity: number;
  bookedCount: number;
  available: boolean;
  almostFull: boolean; // <=3 spots
}

export interface AvailableDate {
  date: string; // ISO date YYYY-MM-DD
  slots: DateSlot[];
  isBlackedOut: boolean;
  blackoutReason?: string;
}

export interface MonthAvailability {
  tourId: string;
  tourName: string;
  year: number;
  month: number; // 1-12
  dates: AvailableDate[];
  operatingDays: number[];
}

export interface CapacityHeatmapEntry {
  date: string;
  time: string;
  tourId: string;
  tourName: string;
  maxCapacity: number;
  bookedCount: number;
  utilizationPercent: number;
  status: "empty" | "low" | "moderate" | "high" | "full";
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TourAvailabilityConfig {
  tourId: string;
  windows: TourAvailabilityWindow[];
  departureTimes: TourDepartureTime[];
  blackoutDates: TourBlackoutDate[];
}

// CRUD Input types
export interface CreateAvailabilityWindowInput {
  tourId: string;
  name?: string;
  startDate: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  maxParticipantsOverride?: number;
  priceOverride?: string;
  meetingPointOverride?: string;
  meetingPointDetailsOverride?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateAvailabilityWindowInput {
  name?: string;
  startDate?: Date;
  endDate?: Date | null;
  daysOfWeek?: number[];
  maxParticipantsOverride?: number | null;
  priceOverride?: string | null;
  meetingPointOverride?: string | null;
  meetingPointDetailsOverride?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateDepartureTimeInput {
  tourId: string;
  time: string;
  label?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateDepartureTimeInput {
  time?: string;
  label?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateBlackoutDateInput {
  tourId: string;
  date: Date;
  reason?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

export class TourAvailabilityService extends BaseService {
  // ===========================================================================
  // CORE AVAILABILITY CHECKS
  // ===========================================================================

  /**
   * Check if a specific slot is bookable
   */
  async checkSlotAvailability(input: SlotAvailabilityCheck): Promise<SlotAvailabilityResult> {
    const { tourId, date, time, requestedSpots, excludeBookingId } = input;

    // 1. Get tour for capacity
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    const maxCapacity = tour.maxParticipants;

    // 2. Active tours are the source-of-truth for bookability.
    if (tour.status !== "active") {
      return {
        available: false,
        spotsRemaining: 0,
        maxCapacity,
        bookedCount: 0,
        reason: "tour_inactive",
      };
    }

    // 3. Enforce date-level booking rules for real bookings.
    // Capacity-only checks pass requestedSpots=0 and should not be blocked.
    const bookingRestrictionReason =
      requestedSpots > 0 ? this.getDayBookingRestrictionReason(tour, date) : null;
    if (bookingRestrictionReason) {
      return {
        available: false,
        spotsRemaining: 0,
        maxCapacity,
        bookedCount: 0,
        reason: bookingRestrictionReason,
      };
    }

    // 4. Get booked count for this slot (optionally excluding a booking being rescheduled)
    const bookedCount = await this.getBookedCountForSlot(tourId, date, time, excludeBookingId);
    const spotsRemaining = maxCapacity - bookedCount;

    // 5. Check if enough spots available
    if (spotsRemaining < requestedSpots) {
      return {
        available: false,
        spotsRemaining,
        maxCapacity,
        bookedCount,
        reason: spotsRemaining <= 0 ? "sold_out" : "insufficient_capacity",
      };
    }

    return {
      available: true,
      spotsRemaining,
      maxCapacity,
      bookedCount,
    };
  }

  /**
   * Get the booked count for a specific tour run (slot)
   * Counts from confirmed/pending bookings
   *
   * @param excludeBookingId - Optional booking ID to exclude from the count
   *                           (used when rescheduling a booking to a new slot)
   */
  async getBookedCountForSlot(
    tourId: string,
    date: Date,
    time: string,
    excludeBookingId?: string
  ): Promise<number> {
    const dateStr = this.formatDateForDb(date);

    const conditions = [
      eq(bookings.organizationId, this.organizationId),
      eq(bookings.tourId, tourId),
      sql`${bookings.bookingDate}::text = ${dateStr}`,
      eq(bookings.bookingTime, time),
      inArray(bookings.status, ["pending", "confirmed"]),
    ];

    // Exclude specified booking from capacity count (for rescheduling)
    if (excludeBookingId) {
      conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
    }

    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`.as("total"),
      })
      .from(bookings)
      .where(and(...conditions));

    return Number(result[0]?.total ?? 0);
  }

  /**
   * Check if a tour operates on a specific date
   */
  async isTourOperatingOnDate(
    tourId: string,
    _date: Date
  ): Promise<{
    operating: boolean;
    reason?: "not_active";
    maxCapacity?: number;
    priceOverride?: string;
  }> {
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour || tour.status !== "active") {
      return { operating: false, reason: "not_active" };
    }

    return {
      operating: true,
      maxCapacity: tour.maxParticipants,
    };
  }

  // ===========================================================================
  // CALENDAR AVAILABILITY
  // ===========================================================================

  /**
   * Get available dates for a month (for calendar display)
   */
  async getAvailableDatesForMonth(
    tourId: string,
    year: number,
    month: number
  ): Promise<MonthAvailability> {
    // 1. Get tour
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    if (tour.status !== "active") {
      return {
        tourId,
        tourName: tour.name,
        year,
        month,
        dates: [],
        operatingDays: [],
      };
    }

    // 2. Get departure times (with fallback defaults)
    const departureTimes = await this.getDepartureTimesForTour(tourId);

    // 3. Date range for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // 4. Get all bookings for this month to calculate booked counts
    const bookingCounts = await this.getBookingCountsForDateRange(
      tourId,
      startOfMonth,
      endOfMonth
    );

    // 5. Active tours are bookable any day.
    const operatingDays = [0, 1, 2, 3, 4, 5, 6];

    // 6. Generate dates for the month
    const dates: AvailableDate[] = [];

    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.formatDateForDb(date);

      // Skip past dates
      const dayRestrictionReason = this.getDayBookingRestrictionReason(tour, date);
      if (dayRestrictionReason === "past_date") {
        continue;
      }

      const sameDayBlocked =
        dayRestrictionReason === "same_day_booking_disabled" ||
        dayRestrictionReason === "same_day_cutoff_passed";

      // Build slots for each departure time
      const maxCapacity = tour.maxParticipants;
      const slots: DateSlot[] = [];

      for (const dt of departureTimes) {
        const key = `${dateStr}|${dt.time}`;
        const bookedCount = bookingCounts.get(key) ?? 0;
        const spotsRemaining = maxCapacity - bookedCount;

        slots.push({
          time: dt.time,
          label: dt.label ?? undefined,
          spotsRemaining,
          maxCapacity,
          bookedCount,
          available: !sameDayBlocked && spotsRemaining > 0,
          almostFull: !sameDayBlocked && spotsRemaining > 0 && spotsRemaining <= 3,
        });
      }

      dates.push({
        date: dateStr,
        slots,
        isBlackedOut: false,
      });
    }

    return {
      tourId,
      tourName: tour.name,
      year,
      month,
      dates,
      operatingDays,
    };
  }

  /**
   * Get booking counts for a date range (optimized batch query)
   */
  private async getBookingCountsForDateRange(
    tourId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, number>> {
    const results = await this.db
      .select({
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        total: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`.as("total"),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          gte(bookings.bookingDate, startDate),
          lte(bookings.bookingDate, endDate),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      )
      .groupBy(bookings.bookingDate, bookings.bookingTime);

    const map = new Map<string, number>();
    for (const row of results) {
      if (row.bookingDate && row.bookingTime) {
        const key = `${this.formatDateForDb(row.bookingDate)}|${row.bookingTime}`;
        map.set(key, Number(row.total));
      }
    }
    return map;
  }

  // ===========================================================================
  // CAPACITY HEATMAP
  // ===========================================================================

  /**
   * Get capacity heatmap for operations planning
   */
  async getCapacityHeatmap(
    dateRange: DateRange,
    tourIds?: string[]
  ): Promise<CapacityHeatmapEntry[]> {
    // 1. Get tours
    const toursQuery = this.db.query.tours.findMany({
      where: and(
        eq(tours.organizationId, this.organizationId),
        eq(tours.status, "active")
      ),
    });

    let tourList: Tour[];
    if (tourIds && tourIds.length > 0) {
      tourList = await this.db.query.tours.findMany({
        where: and(
          eq(tours.organizationId, this.organizationId),
          inArray(tours.id, tourIds),
          eq(tours.status, "active")
        ),
      });
    } else {
      tourList = await toursQuery;
    }

    if (tourList.length === 0) {
      return [];
    }

    const tourIdList = tourList.map((t) => t.id);

    // 2. Get all departure times for these tours
    const departureTimes = await this.db.query.tourDepartureTimes.findMany({
      where: and(
        eq(tourDepartureTimes.organizationId, this.organizationId),
        inArray(tourDepartureTimes.tourId, tourIdList),
        eq(tourDepartureTimes.isActive, true)
      ),
    });

    const departureTimesByTour = new Map<string, TourDepartureTime[]>();
    for (const dt of departureTimes) {
      const existing = departureTimesByTour.get(dt.tourId) ?? [];
      existing.push(dt);
      departureTimesByTour.set(dt.tourId, existing);
    }

    // Add fallback times for tours with no configured departures.
    for (const tour of tourList) {
      if (!departureTimesByTour.has(tour.id)) {
        departureTimesByTour.set(tour.id, this.getDefaultDepartureTimes(tour.id));
      }
    }

    // 3. Get all bookings in the date range
    const bookingCounts = await this.db
      .select({
        tourId: bookings.tourId,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        total: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`.as("total"),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          inArray(bookings.tourId, tourIdList),
          gte(bookings.bookingDate, dateRange.start),
          lte(bookings.bookingDate, dateRange.end),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      )
      .groupBy(bookings.tourId, bookings.bookingDate, bookings.bookingTime);

    const bookingMap = new Map<string, number>();
    for (const row of bookingCounts) {
      if (row.tourId && row.bookingDate && row.bookingTime) {
        const key = `${row.tourId}|${this.formatDateForDb(row.bookingDate)}|${row.bookingTime}`;
        bookingMap.set(key, Number(row.total));
      }
    }

    // 4. Build heatmap entries
    const entries: CapacityHeatmapEntry[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      const dateStr = this.formatDateForDb(current);

      for (const tour of tourList) {
        const maxCapacity = tour.maxParticipants;
        const tourDepartures = departureTimesByTour.get(tour.id) ?? [];

        for (const dt of tourDepartures) {
          const key = `${tour.id}|${dateStr}|${dt.time}`;
          const bookedCount = bookingMap.get(key) ?? 0;
          const utilization = maxCapacity > 0 ? (bookedCount / maxCapacity) * 100 : 0;

          entries.push({
            date: dateStr,
            time: dt.time,
            tourId: tour.id,
            tourName: tour.name,
            maxCapacity,
            bookedCount,
            utilizationPercent: Math.round(utilization),
            status: this.getUtilizationStatus(utilization),
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return entries;
  }

  private getUtilizationStatus(percent: number): CapacityHeatmapEntry["status"] {
    if (percent >= 100) return "full";
    if (percent >= 75) return "high";
    if (percent >= 40) return "moderate";
    if (percent > 0) return "low";
    return "empty";
  }

  // ===========================================================================
  // AVAILABILITY WINDOW CRUD
  // ===========================================================================

  async createAvailabilityWindow(
    input: CreateAvailabilityWindowInput
  ): Promise<TourAvailabilityWindow> {
    const [window] = await this.db
      .insert(tourAvailabilityWindows)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        daysOfWeek: input.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
        maxParticipantsOverride: input.maxParticipantsOverride,
        priceOverride: input.priceOverride,
        meetingPointOverride: input.meetingPointOverride,
        meetingPointDetailsOverride: input.meetingPointDetailsOverride,
        isActive: input.isActive ?? true,
        notes: input.notes,
      })
      .returning();

    return window!;
  }

  async updateAvailabilityWindow(
    id: string,
    input: UpdateAvailabilityWindowInput
  ): Promise<TourAvailabilityWindow> {
    const [updated] = await this.db
      .update(tourAvailabilityWindows)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourAvailabilityWindows.id, id),
          eq(tourAvailabilityWindows.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("AvailabilityWindow", id);
    }

    return updated;
  }

  async deleteAvailabilityWindow(id: string): Promise<void> {
    const deleted = await this.db
      .delete(tourAvailabilityWindows)
      .where(
        and(
          eq(tourAvailabilityWindows.id, id),
          eq(tourAvailabilityWindows.organizationId, this.organizationId)
        )
      )
      .returning({ id: tourAvailabilityWindows.id });

    if (deleted.length === 0) {
      throw new NotFoundError("AvailabilityWindow", id);
    }
  }

  async getAvailabilityWindowsForTour(tourId: string): Promise<TourAvailabilityWindow[]> {
    return this.db.query.tourAvailabilityWindows.findMany({
      where: and(
        eq(tourAvailabilityWindows.tourId, tourId),
        eq(tourAvailabilityWindows.organizationId, this.organizationId)
      ),
      orderBy: (t, { asc }) => [asc(t.startDate)],
    });
  }

  // ===========================================================================
  // DEPARTURE TIME CRUD
  // ===========================================================================

  async createDepartureTime(input: CreateDepartureTimeInput): Promise<TourDepartureTime> {
    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(input.time)) {
      throw new ValidationError("Time must be in HH:MM format (e.g., '09:00')");
    }

    const [dt] = await this.db
      .insert(tourDepartureTimes)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        time: input.time,
        label: input.label,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return dt!;
  }

  async updateDepartureTime(id: string, input: UpdateDepartureTimeInput): Promise<TourDepartureTime> {
    if (input.time && !/^\d{2}:\d{2}$/.test(input.time)) {
      throw new ValidationError("Time must be in HH:MM format (e.g., '09:00')");
    }

    const [updated] = await this.db
      .update(tourDepartureTimes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourDepartureTimes.id, id),
          eq(tourDepartureTimes.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("DepartureTime", id);
    }

    return updated;
  }

  async deleteDepartureTime(id: string): Promise<void> {
    const deleted = await this.db
      .delete(tourDepartureTimes)
      .where(
        and(
          eq(tourDepartureTimes.id, id),
          eq(tourDepartureTimes.organizationId, this.organizationId)
        )
      )
      .returning({ id: tourDepartureTimes.id });

    if (deleted.length === 0) {
      throw new NotFoundError("DepartureTime", id);
    }
  }

  async getDepartureTimesForTour(tourId: string): Promise<TourDepartureTime[]> {
    const configured = await this.db.query.tourDepartureTimes.findMany({
      where: and(
        eq(tourDepartureTimes.tourId, tourId),
        eq(tourDepartureTimes.organizationId, this.organizationId)
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.time)],
    });

    if (configured.length > 0) {
      return configured;
    }

    return this.getDefaultDepartureTimes(tourId);
  }

  // ===========================================================================
  // BLACKOUT DATE CRUD
  // ===========================================================================

  async createBlackoutDate(input: CreateBlackoutDateInput): Promise<TourBlackoutDate> {
    const [blackout] = await this.db
      .insert(tourBlackoutDates)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        date: input.date,
        reason: input.reason,
      })
      .returning();

    return blackout!;
  }

  async deleteBlackoutDate(id: string): Promise<void> {
    const deleted = await this.db
      .delete(tourBlackoutDates)
      .where(
        and(
          eq(tourBlackoutDates.id, id),
          eq(tourBlackoutDates.organizationId, this.organizationId)
        )
      )
      .returning({ id: tourBlackoutDates.id });

    if (deleted.length === 0) {
      throw new NotFoundError("BlackoutDate", id);
    }
  }

  async getBlackoutDatesForTour(
    tourId: string,
    dateRange?: DateRange
  ): Promise<TourBlackoutDate[]> {
    const conditions = [
      eq(tourBlackoutDates.tourId, tourId),
      eq(tourBlackoutDates.organizationId, this.organizationId),
    ];

    if (dateRange) {
      conditions.push(
        gte(tourBlackoutDates.date, dateRange.start),
        lte(tourBlackoutDates.date, dateRange.end)
      );
    }

    return this.db.query.tourBlackoutDates.findMany({
      where: and(...conditions),
      orderBy: (t, { asc }) => [asc(t.date)],
    });
  }

  // ===========================================================================
  // FULL TOUR AVAILABILITY CONFIG
  // ===========================================================================

  /**
   * Get complete availability configuration for a tour
   */
  async getTourAvailabilityConfig(tourId: string): Promise<TourAvailabilityConfig> {
    const [windows, departureTimes, blackoutDates] = await Promise.all([
      this.getAvailabilityWindowsForTour(tourId),
      this.getDepartureTimesForTour(tourId),
      this.getBlackoutDatesForTour(tourId),
    ]);

    return {
      tourId,
      windows,
      departureTimes,
      blackoutDates,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private formatDateForDb(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }

  private getDayBookingRestrictionReason(
    tour: Pick<Tour, "allowSameDayBooking" | "sameDayCutoffTime">,
    date: Date
  ): SlotAvailabilityResult["reason"] | null {
    const today = this.formatDateForDb(new Date());
    const requestedDate = this.formatDateForDb(date);

    if (requestedDate < today) {
      return "past_date";
    }

    if (requestedDate !== today) {
      return null;
    }

    if (tour.allowSameDayBooking === false) {
      return "same_day_booking_disabled";
    }

    if (
      tour.sameDayCutoffTime &&
      this.hasTimeReachedOrPassed(tour.sameDayCutoffTime)
    ) {
      return "same_day_cutoff_passed";
    }

    return null;
  }

  private hasTimeReachedOrPassed(time: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return false;
    }

    const [hoursPart, minutesPart] = time.split(":");
    const cutoffHours = Number(hoursPart);
    const cutoffMinutes = Number(minutesPart);
    if (
      !Number.isInteger(cutoffHours) ||
      !Number.isInteger(cutoffMinutes) ||
      cutoffHours < 0 ||
      cutoffHours > 23 ||
      cutoffMinutes < 0 ||
      cutoffMinutes > 59
    ) {
      return false;
    }

    const now = new Date();
    const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoffTotalMinutes = cutoffHours * 60 + cutoffMinutes;
    return nowTotalMinutes >= cutoffTotalMinutes;
  }

  private getDefaultDepartureTimes(tourId: string): TourDepartureTime[] {
    const now = new Date();
    return [
      {
        id: `default-${tourId}-0900`,
        organizationId: this.organizationId,
        tourId,
        time: "09:00",
        label: "Morning",
        isActive: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `default-${tourId}-1300`,
        organizationId: this.organizationId,
        tourId,
        time: "13:00",
        label: "Afternoon",
        isActive: true,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `default-${tourId}-1700`,
        organizationId: this.organizationId,
        tourId,
        time: "17:00",
        label: "Evening",
        isActive: true,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
