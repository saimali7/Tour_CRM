/**
 * Tour Run Service
 *
 * Manages "tour runs" - the virtual grouping of (tourId, date, time) for operations.
 * A tour run represents a single departure of a tour on a specific date and time.
 * Unlike schedules, tour runs are computed on-demand from bookings, not stored.
 */

import { eq, and, inArray, sql, asc } from "drizzle-orm";
import {
  tours,
  bookings,
  guideAssignments,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import { TourAvailabilityService } from "./tour-availability-service";
import { NotFoundError } from "./types";
import {
  validateBookingWithRelationsArray,
  validateBookingWithDateFieldsArray,
} from "./lib/type-guards";
import { createTourRunKey, formatDateForKey } from "./lib/tour-run-utils";
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  formatDateOnlyKey,
  parseDateOnlyKeyToLocalDate,
} from "./lib/date-time";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Internal type for booking with relations from query
 */
interface BookingWithRelations {
  id: string;
  referenceNumber: string;
  customerId: string;
  status: string;
  totalParticipants: number;
  adultCount: number;
  childCount: number | null;
  infantCount: number | null;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  paymentStatus: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  tour?: Tour | null;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    type: string;
    dietaryRequirements: string | null;
    accessibilityNeeds: string | null;
    checkedIn: string | null;
    checkedInAt: Date | null;
  }>;
}

/**
 * A tour run is a virtual representation of a tour departure
 * Identified by (tourId, date, time)
 */
export interface TourRun {
  // Identification
  tourId: string;
  date: Date;
  time: string; // HH:MM format

  // Tour info
  tourName: string;
  tourSlug: string;
  durationMinutes: number;

  // Computed capacity
  capacity: number;
  bookedCount: number;
  spotsRemaining: number;
  utilizationPercent: number;

  // Bookings on this run
  bookingCount: number;
  bookings: TourRunBooking[];

  // Participants
  totalParticipants: number;
  checkedInCount: number;

  // Guide info
  guidesRequired: number;
  guidesAssigned: number;
  assignedGuides: TourRunGuide[];

  // Status
  status: "upcoming" | "in_progress" | "completed";
}

export interface TourRunBooking {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  participants: number;
  checkedIn: number;
  specialRequests: string | null;
  dietaryRequirements: string | null;
}

export interface TourRunGuide {
  id: string | null; // null for outsourced guides
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isOutsourced: boolean;
  status: string;
}

export interface TourRunManifest {
  tourRun: {
    tourId: string;
    tourName: string;
    date: string;
    time: string;
    durationMinutes: number;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
  };
  summary: {
    totalBookings: number;
    totalParticipants: number;
    checkedInCount: number;
    adults: number;
    children: number;
    infants: number;
  };
  bookings: ManifestBooking[];
  guides: TourRunGuide[];
}

export interface ManifestBooking {
  id: string;
  referenceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  participants: ManifestParticipant[];
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  status: string;
  paymentStatus: string;
}

export interface ManifestParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  type: string;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  checkedIn: string;
  checkedInAt: Date | null;
}

export interface TourRunFilters {
  tourId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minUtilization?: number;
  maxUtilization?: number;
  hasBookings?: boolean;
}

export interface TodayTourRunsResult {
  tourRuns: TourRun[];
  summary: {
    totalRuns: number;
    totalParticipants: number;
    totalCheckedIn: number;
    guidesWorking: number;
  };
}

// =============================================================================
// SERVICE
// =============================================================================

export class TourRunService extends BaseService {
  private tourAvailability: TourAvailabilityService;

  constructor(ctx: { organizationId: string; userId?: string }) {
    super(ctx);
    this.tourAvailability = new TourAvailabilityService(ctx);
  }

  // ===========================================================================
  // GET TOUR RUNS
  // ===========================================================================

  /**
   * Get tour runs for today (operations dashboard)
   */
  async getForToday(): Promise<TodayTourRunsResult> {
    const timezone = await this.getOrganizationTimezone();
    const todayDateKey = formatDateKeyInTimeZone(new Date(), timezone);
    const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);
    return this.getForDateRangeKeys(todayDateKey, tomorrowDateKey);
  }

  /**
   * Get tour runs for a specific date
   */
  async getForDate(date: Date): Promise<TourRun[]> {
    const startDateKey = this.formatDateKey(date);
    const endDateKey = addDaysToDateKey(startDateKey, 1);
    const result = await this.getForDateRangeKeys(startDateKey, endDateKey);
    return result.tourRuns;
  }

  /**
   * Get tour runs for a date range
   */
  async getForDateRange(startDate: Date, endDate: Date): Promise<TodayTourRunsResult> {
    const startDateKey = this.formatDateKey(startDate);
    const endDateKeyExclusive = addDaysToDateKey(this.formatDateKey(endDate), 1);
    return this.getForDateRangeKeys(startDateKey, endDateKeyExclusive);
  }

  private async getForDateRangeKeys(
    startDateKey: string,
    endDateKeyExclusive: string
  ): Promise<TodayTourRunsResult> {
    // 1. Get all bookings in the date range with new booking model
    const dateBookingsRaw = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        sql`${bookings.bookingDate}::text >= ${startDateKey}`,
        sql`${bookings.bookingDate}::text < ${endDateKeyExclusive}`,
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      with: {
        customer: true,
        tour: true,
        participants: true,
      },
    });

    // Validate that relations are loaded, then cast to internal type
    validateBookingWithDateFieldsArray(dateBookingsRaw, "TourRunService.getForDateRange");
    const dateBookings = dateBookingsRaw as unknown as Array<
      BookingWithRelations & { tourId: string | null; bookingDate: Date | null; bookingTime: string | null }
    >;

    // 2. Group bookings by tour + date + time
    const runMap = new Map<string, {
      tourId: string;
      date: Date;
      time: string;
      tour: Tour;
      bookings: BookingWithRelations[];
    }>();

    for (const booking of dateBookings) {
      if (!booking.tourId || !booking.bookingDate || !booking.bookingTime) {
        continue; // Skip bookings that don't have the new fields yet
      }

      const bookingDateKey = this.formatDbDateKey(booking.bookingDate);
      const key = createTourRunKey(booking.tourId, bookingDateKey, booking.bookingTime);

      if (!runMap.has(key)) {
        runMap.set(key, {
          tourId: booking.tourId,
          date: this.parseDateKey(bookingDateKey),
          time: booking.bookingTime,
          tour: booking.tour!,
          bookings: [],
        });
      }

      runMap.get(key)!.bookings.push(booking);
    }

    // 3. Build tour runs
    const tourRuns: TourRun[] = [];
    let totalParticipants = 0;
    let totalCheckedIn = 0;
    const guideIds = new Set<string>();

    for (const [_, runData] of runMap) {
      const tourRun = await this.buildTourRun(runData);
      tourRuns.push(tourRun);

      totalParticipants += tourRun.totalParticipants;
      totalCheckedIn += tourRun.checkedInCount;
      tourRun.assignedGuides.forEach((g) => {
        if (g.id) guideIds.add(g.id);
      });
    }

    // Sort by date and time
    tourRuns.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    return {
      tourRuns,
      summary: {
        totalRuns: tourRuns.length,
        totalParticipants,
        totalCheckedIn,
        guidesWorking: guideIds.size,
      },
    };
  }

  /**
   * Get a specific tour run
   */
  async get(tourId: string, date: Date, time: string): Promise<TourRun> {
    // Get the tour
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    // Get bookings for this tour run
    const dateStr = this.formatDateKey(date);
    const runBookingsRaw = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        eq(bookings.tourId, tourId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        eq(bookings.bookingTime, time),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      with: {
        customer: true,
        participants: true,
      },
    });

    // Validate that relations are loaded, then cast to internal type
    validateBookingWithRelationsArray(runBookingsRaw, "TourRunService.get");
    const runBookings = runBookingsRaw as unknown as BookingWithRelations[];

    return this.buildTourRun({
      tourId,
      date,
      time,
      tour,
      bookings: runBookings,
    });
  }

  // ===========================================================================
  // MANIFEST
  // ===========================================================================

  /**
   * Get manifest for a tour run
   */
  async getManifest(tourId: string, date: Date, time: string): Promise<TourRunManifest> {
    // Get the tour
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    // Get bookings for this tour run with participants
    const dateStr = this.formatDateKey(date);
    const runBookingsRaw = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        eq(bookings.tourId, tourId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        eq(bookings.bookingTime, time),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      with: {
        customer: true,
        participants: true,
      },
      orderBy: [asc(bookings.createdAt)],
    });

    // Validate that relations are loaded, then cast to internal type
    validateBookingWithRelationsArray(runBookingsRaw, "TourRunService.getManifest");
    const runBookings = runBookingsRaw as unknown as BookingWithRelations[];

    // Get guide assignments for bookings in this run
    const bookingIds = runBookings.map((b) => b.id);
    const assignments = bookingIds.length > 0
      ? await this.db.query.guideAssignments.findMany({
          where: and(
            eq(guideAssignments.organizationId, this.organizationId),
            inArray(guideAssignments.bookingId, bookingIds),
            eq(guideAssignments.status, "confirmed")
          ),
          with: {
            guide: true,
          },
        })
      : [];

    // Build unique guides list
    const guidesMap = new Map<string, TourRunGuide>();
    for (const assignment of assignments) {
      if (assignment.guideId && assignment.guide) {
        if (!guidesMap.has(assignment.guideId)) {
          guidesMap.set(assignment.guideId, {
            id: assignment.guide.id,
            firstName: assignment.guide.firstName,
            lastName: assignment.guide.lastName,
            email: assignment.guide.email,
            phone: assignment.guide.phone,
            isOutsourced: false,
            status: assignment.status,
          });
        }
      } else if (assignment.outsourcedGuideName) {
        const key = `outsourced:${assignment.outsourcedGuideName}`;
        if (!guidesMap.has(key)) {
          guidesMap.set(key, {
            id: null,
            firstName: assignment.outsourcedGuideName,
            lastName: null,
            email: assignment.outsourcedGuideContact ?? null,
            phone: null,
            isOutsourced: true,
            status: assignment.status,
          });
        }
      }
    }

    // Calculate summary
    let totalParticipants = 0;
    let checkedInCount = 0;
    let adults = 0;
    let children = 0;
    let infants = 0;

    for (const booking of runBookings) {
      totalParticipants += booking.totalParticipants;
      adults += booking.adultCount;
      children += booking.childCount ?? 0;
      infants += booking.infantCount ?? 0;

      for (const participant of booking.participants) {
        if (participant.checkedIn === "yes") {
          checkedInCount++;
        }
      }
    }

    // Build manifest bookings
    const manifestBookings: ManifestBooking[] = runBookings.map((booking) => ({
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      customer: {
        id: booking.customer?.id ?? "",
        name: `${booking.customer?.firstName ?? ""} ${booking.customer?.lastName ?? ""}`.trim(),
        email: booking.customer?.email ?? null,
        phone: booking.customer?.phone ?? null,
      },
      participants: booking.participants.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        type: p.type,
        dietaryRequirements: p.dietaryRequirements,
        accessibilityNeeds: p.accessibilityNeeds,
        checkedIn: p.checkedIn ?? "no",
        checkedInAt: p.checkedInAt,
      })),
      specialRequests: booking.specialRequests,
      dietaryRequirements: booking.dietaryRequirements,
      accessibilityNeeds: booking.accessibilityNeeds,
      internalNotes: booking.internalNotes,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
    }));

    return {
      tourRun: {
        tourId: tour.id,
        tourName: tour.name,
        date: dateStr,
        time,
        durationMinutes: tour.durationMinutes,
        meetingPoint: tour.meetingPoint,
        meetingPointDetails: tour.meetingPointDetails,
      },
      summary: {
        totalBookings: runBookings.length,
        totalParticipants,
        checkedInCount,
        adults,
        children,
        infants,
      },
      bookings: manifestBookings,
      guides: Array.from(guidesMap.values()),
    };
  }

  // ===========================================================================
  // GUIDE REQUIREMENTS
  // ===========================================================================

  /**
   * Calculate number of guides required for a tour run
   */
  async calculateGuidesRequired(tourId: string, date: Date, time: string): Promise<number> {
    // Get the tour
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      return 0;
    }

    // Get booked count
    const bookedCount = await this.tourAvailability.getBookedCountForSlot(tourId, date, time);

    // Calculate guides needed based on guestsPerGuide
    const guestsPerGuide = tour.guestsPerGuide || 6;
    return Math.ceil(bookedCount / guestsPerGuide);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private formatDateKey(date: Date | string): string {
    return formatDateForKey(date);
  }

  private parseDateKey(dateKey: string): Date {
    const [yearRaw, monthRaw, dayRaw] = dateKey.split("-").map(Number);
    const year = yearRaw || 0;
    const month = monthRaw || 1;
    const day = dayRaw || 1;
    return new Date(year, month - 1, day);
  }

  private formatDbDateKey(date: Date): string {
    return formatDateOnlyKey(date);
  }

  // Type for booking with relations loaded
  private async buildTourRun(data: {
    tourId: string;
    date: Date;
    time: string;
    tour: Tour;
    bookings: BookingWithRelations[];
  }): Promise<TourRun> {
    const { tourId, date, time, tour, bookings: runBookings } = data;

    // Calculate participants and check-ins
    let totalParticipants = 0;
    let checkedInCount = 0;

    for (const booking of runBookings) {
      totalParticipants += booking.totalParticipants;
      for (const participant of booking.participants) {
        if (participant.checkedIn === "yes") {
          checkedInCount++;
        }
      }
    }

    // Get capacity from availability service
    const capacityCheck = await this.tourAvailability.checkSlotAvailability({
      tourId,
      date,
      time,
      requestedSpots: 0,
    });

    const capacity = capacityCheck.maxCapacity;
    const spotsRemaining = capacityCheck.spotsRemaining;
    const utilizationPercent = capacity > 0 ? Math.round((totalParticipants / capacity) * 100) : 0;

    // Calculate guides required and get assignments
    const guestsPerGuide = tour.guestsPerGuide || 6;
    const guidesRequired = Math.ceil(totalParticipants / guestsPerGuide);

    // Get guide assignments for bookings in this run
    const bookingIds = runBookings.map((b) => b.id);
    const assignments = bookingIds.length > 0
      ? await this.db.query.guideAssignments.findMany({
          where: and(
            eq(guideAssignments.organizationId, this.organizationId),
            inArray(guideAssignments.bookingId, bookingIds),
            eq(guideAssignments.status, "confirmed")
          ),
          with: {
            guide: true,
          },
        })
      : [];

    // Build unique guides list
    const guidesMap = new Map<string, TourRunGuide>();
    for (const assignment of assignments) {
      if (assignment.guideId && assignment.guide) {
        if (!guidesMap.has(assignment.guideId)) {
          guidesMap.set(assignment.guideId, {
            id: assignment.guide.id,
            firstName: assignment.guide.firstName,
            lastName: assignment.guide.lastName,
            email: assignment.guide.email,
            phone: assignment.guide.phone,
            isOutsourced: false,
            status: assignment.status,
          });
        }
      } else if (assignment.outsourcedGuideName) {
        const key = `outsourced:${assignment.outsourcedGuideName}`;
        if (!guidesMap.has(key)) {
          guidesMap.set(key, {
            id: null,
            firstName: assignment.outsourcedGuideName,
            lastName: null,
            email: assignment.outsourcedGuideContact ?? null,
            phone: null,
            isOutsourced: true,
            status: assignment.status,
          });
        }
      }
    }

    // Determine status
    const now = new Date();
    const runDateTime = parseDateOnlyKeyToLocalDate(formatDateOnlyKey(date));
    const timeParts = time.split(":");
    const hours = parseInt(timeParts[0] ?? "0", 10);
    const minutes = parseInt(timeParts[1] ?? "0", 10);
    runDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(runDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + tour.durationMinutes);

    let status: TourRun["status"];
    if (now < runDateTime) {
      status = "upcoming";
    } else if (now >= runDateTime && now <= endDateTime) {
      status = "in_progress";
    } else {
      status = "completed";
    }

    // Build bookings list
    const tourRunBookings: TourRunBooking[] = runBookings.map((booking) => {
      const checkedIn = booking.participants.filter((p) => p.checkedIn === "yes").length;
      return {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        customerId: booking.customerId,
        customerName: booking.customer
          ? `${booking.customer.firstName} ${booking.customer.lastName}`
          : "Unknown",
        customerEmail: booking.customer?.email ?? null,
        customerPhone: booking.customer?.phone ?? null,
        status: booking.status,
        participants: booking.totalParticipants,
        checkedIn,
        specialRequests: booking.specialRequests,
        dietaryRequirements: booking.dietaryRequirements,
      };
    });

    return {
      tourId,
      date,
      time,
      tourName: tour.name,
      tourSlug: tour.slug,
      durationMinutes: tour.durationMinutes,
      capacity,
      bookedCount: totalParticipants,
      spotsRemaining,
      utilizationPercent,
      bookingCount: runBookings.length,
      bookings: tourRunBookings,
      totalParticipants,
      checkedInCount,
      guidesRequired,
      guidesAssigned: guidesMap.size,
      assignedGuides: Array.from(guidesMap.values()),
      status,
    };
  }

}
