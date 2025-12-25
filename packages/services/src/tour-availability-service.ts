/**
 * Tour Availability Service
 *
 * Manages tour availability for the new availability-based booking model.
 * Replaces the need for pre-creating schedules by computing availability
 * dynamically from availability windows, departure times, and bookings.
 */

import { eq, and, gte, lte, or, inArray, sql, count, sum, isNull, lt } from "drizzle-orm";
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
}

export interface SlotAvailabilityResult {
  available: boolean;
  spotsRemaining: number;
  maxCapacity: number;
  bookedCount: number;
  reason?: "blackout" | "not_operating" | "sold_out" | "insufficient_capacity" | "past_date";
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
    const { tourId, date, time, requestedSpots } = input;

    // 1. Get tour for capacity
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    const maxCapacity = tour.maxParticipants;

    // 2. Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return {
        available: false,
        spotsRemaining: 0,
        maxCapacity,
        bookedCount: 0,
        reason: "past_date",
      };
    }

    // 3. Check if tour operates on this date
    const operates = await this.isTourOperatingOnDate(tourId, date);
    if (!operates.operating) {
      return {
        available: false,
        spotsRemaining: 0,
        maxCapacity: operates.maxCapacity ?? maxCapacity,
        bookedCount: 0,
        reason: operates.reason === "blackout" ? "blackout" : "not_operating",
      };
    }

    // 4. Check if this departure time is valid
    const departureTime = await this.db.query.tourDepartureTimes.findFirst({
      where: and(
        eq(tourDepartureTimes.tourId, tourId),
        eq(tourDepartureTimes.organizationId, this.organizationId),
        eq(tourDepartureTimes.time, time),
        eq(tourDepartureTimes.isActive, true)
      ),
    });

    if (!departureTime) {
      return {
        available: false,
        spotsRemaining: 0,
        maxCapacity: operates.maxCapacity ?? maxCapacity,
        bookedCount: 0,
        reason: "not_operating",
      };
    }

    // 5. Get booked count for this slot
    const bookedCount = await this.getBookedCountForSlot(tourId, date, time);
    const effectiveCapacity = operates.maxCapacity ?? maxCapacity;
    const spotsRemaining = effectiveCapacity - bookedCount;

    // 6. Check if enough spots available
    if (spotsRemaining < requestedSpots) {
      return {
        available: false,
        spotsRemaining,
        maxCapacity: effectiveCapacity,
        bookedCount,
        reason: spotsRemaining <= 0 ? "sold_out" : "insufficient_capacity",
      };
    }

    return {
      available: true,
      spotsRemaining,
      maxCapacity: effectiveCapacity,
      bookedCount,
    };
  }

  /**
   * Get the booked count for a specific tour run (slot)
   * Counts from confirmed/pending bookings
   */
  async getBookedCountForSlot(tourId: string, date: Date, time: string): Promise<number> {
    const dateStr = this.formatDateForDb(date);

    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`.as("total"),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      );

    return Number(result[0]?.total ?? 0);
  }

  /**
   * Check if a tour operates on a specific date
   */
  async isTourOperatingOnDate(
    tourId: string,
    date: Date
  ): Promise<{
    operating: boolean;
    reason?: "blackout" | "no_window" | "wrong_day";
    maxCapacity?: number;
    priceOverride?: string;
  }> {
    // 1. Check for blackout date
    const blackout = await this.db.query.tourBlackoutDates.findFirst({
      where: and(
        eq(tourBlackoutDates.tourId, tourId),
        eq(tourBlackoutDates.organizationId, this.organizationId),
        sql`${tourBlackoutDates.date}::text = ${this.formatDateForDb(date)}`
      ),
    });

    if (blackout) {
      return { operating: false, reason: "blackout" };
    }

    // 2. Check for active availability window that covers this date
    const dayOfWeek = date.getDay(); // 0-6
    const dateStr = this.formatDateForDb(date);

    const windows = await this.db.query.tourAvailabilityWindows.findMany({
      where: and(
        eq(tourAvailabilityWindows.tourId, tourId),
        eq(tourAvailabilityWindows.organizationId, this.organizationId),
        eq(tourAvailabilityWindows.isActive, true),
        lte(tourAvailabilityWindows.startDate, date),
        or(
          isNull(tourAvailabilityWindows.endDate),
          gte(tourAvailabilityWindows.endDate, date)
        )
      ),
    });

    // Find a window that includes this day of week
    const matchingWindow = windows.find((w) => {
      const days = w.daysOfWeek as number[];
      return days.includes(dayOfWeek);
    });

    if (!matchingWindow) {
      return { operating: false, reason: windows.length > 0 ? "wrong_day" : "no_window" };
    }

    return {
      operating: true,
      maxCapacity: matchingWindow.maxParticipantsOverride ?? undefined,
      priceOverride: matchingWindow.priceOverride ?? undefined,
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

    // 2. Get all departure times for this tour
    const departureTimes = await this.db.query.tourDepartureTimes.findMany({
      where: and(
        eq(tourDepartureTimes.tourId, tourId),
        eq(tourDepartureTimes.organizationId, this.organizationId),
        eq(tourDepartureTimes.isActive, true)
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.time)],
    });

    // 3. Get all availability windows for this tour
    const windows = await this.db.query.tourAvailabilityWindows.findMany({
      where: and(
        eq(tourAvailabilityWindows.tourId, tourId),
        eq(tourAvailabilityWindows.organizationId, this.organizationId),
        eq(tourAvailabilityWindows.isActive, true)
      ),
    });

    // 4. Get blackout dates for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const blackouts = await this.db.query.tourBlackoutDates.findMany({
      where: and(
        eq(tourBlackoutDates.tourId, tourId),
        eq(tourBlackoutDates.organizationId, this.organizationId),
        gte(tourBlackoutDates.date, startOfMonth),
        lte(tourBlackoutDates.date, endOfMonth)
      ),
    });

    const blackoutMap = new Map(blackouts.map((b) => [this.formatDateForDb(b.date), b.reason]));

    // 5. Get all bookings for this month to calculate booked counts
    const bookingCounts = await this.getBookingCountsForDateRange(
      tourId,
      startOfMonth,
      endOfMonth
    );

    // 6. Build the operating days from windows
    const operatingDays = new Set<number>();
    for (const window of windows) {
      const days = window.daysOfWeek as number[];
      days.forEach((d) => operatingDays.add(d));
    }

    // 7. Generate dates for the month
    const dates: AvailableDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.formatDateForDb(date);
      const dayOfWeek = date.getDay();

      // Skip past dates
      if (date < today) {
        continue;
      }

      // Check blackout
      const isBlackedOut = blackoutMap.has(dateStr);
      if (isBlackedOut) {
        dates.push({
          date: dateStr,
          slots: [],
          isBlackedOut: true,
          blackoutReason: blackoutMap.get(dateStr) ?? undefined,
        });
        continue;
      }

      // Check if tour operates on this day
      const matchingWindow = windows.find((w) => {
        const days = w.daysOfWeek as number[];
        const startDateOk = w.startDate <= date;
        const endDateOk = !w.endDate || w.endDate >= date;
        return days.includes(dayOfWeek) && startDateOk && endDateOk;
      });

      if (!matchingWindow) {
        continue; // Tour doesn't operate this day
      }

      // Build slots for each departure time
      const maxCapacity = matchingWindow.maxParticipantsOverride ?? tour.maxParticipants;
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
          available: spotsRemaining > 0,
          almostFull: spotsRemaining > 0 && spotsRemaining <= 3,
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
      operatingDays: Array.from(operatingDays),
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
    let toursQuery = this.db.query.tours.findMany({
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
          inArray(tours.id, tourIds)
        ),
      });
    } else {
      tourList = await toursQuery;
    }

    if (tourList.length === 0) {
      return [];
    }

    const tourMap = new Map(tourList.map((t) => [t.id, t]));
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

    // 3. Get availability windows for these tours
    const windows = await this.db.query.tourAvailabilityWindows.findMany({
      where: and(
        eq(tourAvailabilityWindows.organizationId, this.organizationId),
        inArray(tourAvailabilityWindows.tourId, tourIdList),
        eq(tourAvailabilityWindows.isActive, true)
      ),
    });

    const windowsByTour = new Map<string, TourAvailabilityWindow[]>();
    for (const w of windows) {
      const existing = windowsByTour.get(w.tourId) ?? [];
      existing.push(w);
      windowsByTour.set(w.tourId, existing);
    }

    // 4. Get all bookings in the date range
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

    // 5. Get blackout dates
    const blackouts = await this.db.query.tourBlackoutDates.findMany({
      where: and(
        eq(tourBlackoutDates.organizationId, this.organizationId),
        inArray(tourBlackoutDates.tourId, tourIdList),
        gte(tourBlackoutDates.date, dateRange.start),
        lte(tourBlackoutDates.date, dateRange.end)
      ),
    });

    const blackoutSet = new Set(
      blackouts.map((b) => `${b.tourId}|${this.formatDateForDb(b.date)}`)
    );

    // 6. Build heatmap entries
    const entries: CapacityHeatmapEntry[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      const dateStr = this.formatDateForDb(current);
      const dayOfWeek = current.getDay();

      for (const tour of tourList) {
        // Check blackout
        if (blackoutSet.has(`${tour.id}|${dateStr}`)) {
          continue;
        }

        // Check if tour operates on this day
        const tourWindows = windowsByTour.get(tour.id) ?? [];
        const matchingWindow = tourWindows.find((w) => {
          const days = w.daysOfWeek as number[];
          const startDateOk = w.startDate <= current;
          const endDateOk = !w.endDate || w.endDate >= current;
          return days.includes(dayOfWeek) && startDateOk && endDateOk;
        });

        if (!matchingWindow) {
          continue;
        }

        const maxCapacity = matchingWindow.maxParticipantsOverride ?? tour.maxParticipants;
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
    return this.db.query.tourDepartureTimes.findMany({
      where: and(
        eq(tourDepartureTimes.tourId, tourId),
        eq(tourDepartureTimes.organizationId, this.organizationId)
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.time)],
    });
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
}
