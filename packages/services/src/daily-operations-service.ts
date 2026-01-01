import { eq, and, gte, lte, ne, asc, sql, inArray, isNotNull } from "drizzle-orm";
import {
  schedules,
  tours,
  bookings,
  customers,
  guides,
  pickupAssignments,
  pickupAddresses,
  guideAssignments,
  tourGuideQualifications,
  guideAvailability,
  guideAvailabilityOverrides,
  type Schedule,
  type Tour,
  type Guide,
  type Booking,
  type PickupAssignment,
  type PickupAddress,
  type GuideAssignment,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError } from "./types";

// ============================================================
// TYPES
// ============================================================

/**
 * Tour assignment status for the Command Center
 * - needs_attention: Has unassigned bookings
 * - ready: All bookings assigned, pending approval
 * - approved: Assignments locked, ready for notification
 * - notified: Guides have been notified
 */
export type TourAssignmentStatus = "needs_attention" | "ready" | "approved" | "notified";

/**
 * Summary of a single tour for the Day Overview
 */
export interface TourSummary {
  scheduleId: string;
  tourId: string;
  tourName: string;
  startsAt: Date;
  endsAt: Date;
  guestCount: number;
  bookingCount: number;
  guidesAssigned: number;
  guidesNeeded: number;
  unassignedBookings: number;
  status: TourAssignmentStatus;
}

/**
 * Day overview statistics
 */
export interface DayStats {
  totalTours: number;
  totalGuests: number;
  totalGuides: number;
  needsAttention: number;
  fullyAssigned: number;
  approved: number;
}

/**
 * Complete day overview for the Tour Command Center
 */
export interface DayOverview {
  date: Date;
  stats: DayStats;
  tours: TourSummary[];
}

/**
 * Tours grouped by time period (morning/afternoon/evening)
 */
export interface GroupedTours {
  morning: TourSummary[];    // Before 12:00
  afternoon: TourSummary[];  // 12:00 - 17:00
  evening: TourSummary[];    // After 17:00
}

/**
 * Booking with customer details for the hopper
 */
export interface BookingWithCustomer extends Booking {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  pickupAddress: PickupAddress | null;
}

/**
 * Guide assignment with pickup details
 */
export interface GuideAssignmentWithPickups {
  id: string;
  guideId: string | null;
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    vehicleCapacity: number | null;
    vehicleType: string | null;
    preferredZones: string[] | null;
  } | null;
  status: string;
  pickupAssignments: Array<{
    id: string;
    bookingId: string;
    pickupOrder: number;
    passengerCount: number;
    estimatedPickupTime: Date | null;
    status: string;
    booking: Booking;
    pickupAddress: PickupAddress | null;
  }>;
}

/**
 * Available guide for assignment
 */
export interface AvailableGuide {
  id: string;
  name: string;
  vehicleCapacity: number;
  vehicleType: string | null;
  preferredZones: string[];
  currentLoad: number;
  availableCapacity: number;
  hasConflict: boolean;
  conflictReason?: string;
}

/**
 * Unassigned booking for the hopper
 */
export interface UnassignedBooking {
  id: string;
  referenceNumber: string;
  customerName: string;
  passengerCount: number;
  isPrivate: boolean;
  zone: string | null;
  pickupAddressName: string | null;
  pickupNotes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}

/**
 * Complete data for the Tour Assignment page
 */
export interface TourAssignmentData {
  schedule: Schedule & { tour: Tour };
  unassignedBookings: UnassignedBooking[];
  guideAssignments: GuideAssignmentWithPickups[];
  availableGuides: AvailableGuide[];
}

/**
 * Assignment status for a schedule
 */
export interface AssignmentStatus {
  scheduleId: string;
  totalBookings: number;
  assignedBookings: number;
  unassignedBookings: number;
  totalGuests: number;
  assignedGuests: number;
  guidesAssigned: number;
  guidesNeeded: number;
  isFullyAssigned: boolean;
  status: TourAssignmentStatus;
}

// ============================================================
// SERVICE
// ============================================================

/**
 * DailyOperationsService - Command center for daily tour operations
 *
 * Provides overview of all tours for a day, manages assignment status,
 * and coordinates bulk operations.
 *
 * @example
 * ```ts
 * const operations = new DailyOperationsService(ctx);
 * const overview = await operations.getDayOverview(new Date());
 * const tourData = await operations.getTourAssignmentData(scheduleId);
 * ```
 */
export class DailyOperationsService extends BaseService {
  // ============================================================
  // DAY OVERVIEW
  // ============================================================

  /**
   * Get complete overview for a day
   * Used by the Day Overview page in Tour Command Center
   *
   * @param date - The date to get overview for
   * @returns Complete day overview with stats and tour summaries
   */
  async getDayOverview(date: Date): Promise<DayOverview> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all schedules for the day (exclude cancelled)
    const daySchedules = await this.db.query.schedules.findMany({
      where: and(
        eq(schedules.organizationId, this.organizationId),
        gte(schedules.startsAt, startOfDay),
        lte(schedules.startsAt, endOfDay),
        ne(schedules.status, "cancelled")
      ),
      with: {
        tour: true,
        bookings: {
          where: ne(bookings.status, "cancelled"),
        },
      },
      orderBy: asc(schedules.startsAt),
    });

    // Get all pickup assignments for these schedules
    const scheduleIds = daySchedules.map((s) => s.id);
    let pickupAssignmentsBySchedule: Map<string, { bookingId: string }[]> = new Map();

    if (scheduleIds.length > 0) {
      const allPickupAssignments = await this.db
        .select({
          scheduleId: pickupAssignments.scheduleId,
          bookingId: pickupAssignments.bookingId,
        })
        .from(pickupAssignments)
        .where(
          and(
            eq(pickupAssignments.organizationId, this.organizationId),
            inArray(pickupAssignments.scheduleId, scheduleIds),
            ne(pickupAssignments.status, "cancelled")
          )
        );

      for (const pa of allPickupAssignments) {
        if (!pickupAssignmentsBySchedule.has(pa.scheduleId)) {
          pickupAssignmentsBySchedule.set(pa.scheduleId, []);
        }
        pickupAssignmentsBySchedule.get(pa.scheduleId)!.push({ bookingId: pa.bookingId });
      }
    }

    // Build tour summaries
    const tourSummaries: TourSummary[] = [];
    const uniqueGuideIds = new Set<string>();

    for (const schedule of daySchedules) {
      const scheduleBookings = schedule.bookings || [];
      const assignedBookingIds = new Set(
        (pickupAssignmentsBySchedule.get(schedule.id) || []).map((pa) => pa.bookingId)
      );

      const guestCount = scheduleBookings.reduce(
        (sum, b) => sum + (b.totalParticipants || 0),
        0
      );
      const unassignedCount = scheduleBookings.filter(
        (b) => !assignedBookingIds.has(b.id)
      ).length;

      // Determine status
      let status: TourAssignmentStatus = "needs_attention";
      if (unassignedCount === 0 && scheduleBookings.length > 0) {
        status = "ready";
      }
      // TODO: Check for approved/notified status once we add those fields

      tourSummaries.push({
        scheduleId: schedule.id,
        tourId: schedule.tourId,
        tourName: schedule.tour?.name || "Unknown Tour",
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        guestCount,
        bookingCount: scheduleBookings.length,
        guidesAssigned: schedule.guidesAssigned || 0,
        guidesNeeded: schedule.guidesRequired || 0,
        unassignedBookings: unassignedCount,
        status,
      });
    }

    // Calculate stats
    const stats: DayStats = {
      totalTours: tourSummaries.length,
      totalGuests: tourSummaries.reduce((sum, t) => sum + t.guestCount, 0),
      totalGuides: uniqueGuideIds.size,
      needsAttention: tourSummaries.filter((t) => t.status === "needs_attention").length,
      fullyAssigned: tourSummaries.filter((t) => t.unassignedBookings === 0).length,
      approved: tourSummaries.filter((t) => t.status === "approved").length,
    };

    return {
      date,
      stats,
      tours: tourSummaries,
    };
  }

  /**
   * Get tours grouped by time period (morning/afternoon/evening)
   *
   * @param date - The date to get tours for
   * @returns Tours grouped by time period
   */
  async getToursByPeriod(date: Date): Promise<GroupedTours> {
    const overview = await this.getDayOverview(date);

    const grouped: GroupedTours = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    for (const tour of overview.tours) {
      const hour = tour.startsAt.getHours();
      if (hour < 12) {
        grouped.morning.push(tour);
      } else if (hour < 17) {
        grouped.afternoon.push(tour);
      } else {
        grouped.evening.push(tour);
      }
    }

    return grouped;
  }

  // ============================================================
  // TOUR ASSIGNMENT DATA
  // ============================================================

  /**
   * Get all data needed for the Tour Assignment page
   * Includes: schedule, bookings, guides, existing assignments
   *
   * @param scheduleId - The schedule to get assignment data for
   * @returns Complete tour assignment data
   */
  async getTourAssignmentData(scheduleId: string): Promise<TourAssignmentData> {
    // Get schedule with tour
    const scheduleResult = await this.db
      .select({
        schedule: schedules,
        tour: tours,
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.id, scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (scheduleResult.length === 0 || !scheduleResult[0]?.tour) {
      throw new NotFoundError("Schedule", scheduleId);
    }

    const schedule = scheduleResult[0].schedule;
    const tour = scheduleResult[0].tour;

    // Get all bookings for this schedule with customer and pickup address
    const bookingsData = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
        },
        pickupAddress: {
          id: pickupAddresses.id,
          name: pickupAddresses.name,
          zone: pickupAddresses.zone,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(pickupAddresses, eq(bookings.pickupAddressId, pickupAddresses.id))
      .where(
        and(
          eq(bookings.scheduleId, scheduleId),
          eq(bookings.organizationId, this.organizationId),
          ne(bookings.status, "cancelled")
        )
      );

    // Get all pickup assignments for this schedule
    const pickupAssignmentsData = await this.db
      .select({
        pickupAssignment: pickupAssignments,
        booking: bookings,
        pickupAddress: pickupAddresses,
        guideAssignment: guideAssignments,
        guide: guides,
      })
      .from(pickupAssignments)
      .leftJoin(bookings, eq(pickupAssignments.bookingId, bookings.id))
      .leftJoin(pickupAddresses, eq(pickupAssignments.pickupAddressId, pickupAddresses.id))
      .leftJoin(guideAssignments, eq(pickupAssignments.guideAssignmentId, guideAssignments.id))
      .leftJoin(guides, eq(guideAssignments.guideId, guides.id))
      .where(
        and(
          eq(pickupAssignments.scheduleId, scheduleId),
          eq(pickupAssignments.organizationId, this.organizationId),
          ne(pickupAssignments.status, "cancelled")
        )
      )
      .orderBy(asc(pickupAssignments.pickupOrder));

    // Get assigned booking IDs
    const assignedBookingIds = new Set(pickupAssignmentsData.map((a) => a.pickupAssignment.bookingId));

    // Build unassigned bookings list
    const unassignedBookings: UnassignedBooking[] = bookingsData
      .filter((b) => !assignedBookingIds.has(b.booking.id))
      .map((b) => ({
        id: b.booking.id,
        referenceNumber: b.booking.referenceNumber,
        customerName: `${b.customer?.firstName || ""} ${b.customer?.lastName || ""}`.trim(),
        passengerCount: b.booking.totalParticipants,
        isPrivate: Boolean(b.booking.isPrivate),
        zone: b.pickupAddress?.zone || null,
        pickupAddressName: b.pickupAddress?.name || null,
        pickupNotes: b.booking.pickupNotes || null,
        customer: {
          id: b.customer?.id || "",
          firstName: b.customer?.firstName || "",
          lastName: b.customer?.lastName || "",
          email: b.customer?.email || "",
          phone: b.customer?.phone || null,
        },
      }));

    // Group pickup assignments by guide assignment
    const guideAssignmentMap = new Map<string, GuideAssignmentWithPickups>();

    for (const pa of pickupAssignmentsData) {
      const gaId = pa.pickupAssignment.guideAssignmentId;
      if (!guideAssignmentMap.has(gaId)) {
        const ga = pa.guideAssignment;
        guideAssignmentMap.set(gaId, {
          id: gaId,
          guideId: ga?.guideId || null,
          guide: pa.guide
            ? {
                id: pa.guide.id,
                firstName: pa.guide.firstName,
                lastName: pa.guide.lastName,
                vehicleCapacity: pa.guide.vehicleCapacity,
                vehicleType: pa.guide.vehicleType,
                preferredZones: pa.guide.preferredZones as string[] | null,
              }
            : null,
          status: ga?.status || "pending",
          pickupAssignments: [],
        });
      }

      guideAssignmentMap.get(gaId)!.pickupAssignments.push({
        id: pa.pickupAssignment.id,
        bookingId: pa.pickupAssignment.bookingId,
        pickupOrder: pa.pickupAssignment.pickupOrder,
        passengerCount: pa.pickupAssignment.passengerCount,
        estimatedPickupTime: pa.pickupAssignment.estimatedPickupTime,
        status: pa.pickupAssignment.status,
        booking: pa.booking!,
        pickupAddress: pa.pickupAddress,
      });
    }

    // Get available guides
    const availableGuides = await this.getAvailableGuides(scheduleId);

    return {
      schedule: { ...schedule, tour },
      unassignedBookings,
      guideAssignments: Array.from(guideAssignmentMap.values()),
      availableGuides,
    };
  }

  /**
   * Get available guides for a specific schedule
   * Filters by: qualification, availability, no conflicts
   *
   * @param scheduleId - The schedule to find available guides for
   * @returns List of available guides with capacity info
   */
  async getAvailableGuides(scheduleId: string): Promise<AvailableGuide[]> {
    // Get the schedule
    const schedule = await this.db.query.schedules.findFirst({
      where: and(
        eq(schedules.id, scheduleId),
        eq(schedules.organizationId, this.organizationId)
      ),
    });

    if (!schedule) {
      throw new NotFoundError("Schedule", scheduleId);
    }

    // Get qualified guides for this tour
    const qualifications = await this.db.query.tourGuideQualifications.findMany({
      where: and(
        eq(tourGuideQualifications.tourId, schedule.tourId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
      },
    });

    const qualifiedGuides = qualifications
      .filter((q) => q.guide?.status === "active")
      .map((q) => q.guide!);

    // Get existing pickup assignments for this schedule to calculate current load
    const existingAssignments = await this.db.query.pickupAssignments.findMany({
      where: and(
        eq(pickupAssignments.scheduleId, scheduleId),
        eq(pickupAssignments.organizationId, this.organizationId),
        ne(pickupAssignments.status, "cancelled")
      ),
      with: {
        guideAssignment: true,
      },
    });

    // Calculate current load per guide
    const guideLoadMap = new Map<string, number>();
    for (const pa of existingAssignments) {
      const guideId = pa.guideAssignment?.guideId;
      if (guideId) {
        const currentLoad = guideLoadMap.get(guideId) || 0;
        guideLoadMap.set(guideId, currentLoad + pa.passengerCount);
      }
    }

    // Build available guides list
    const availableGuides: AvailableGuide[] = [];

    for (const guide of qualifiedGuides) {
      const currentLoad = guideLoadMap.get(guide.id) || 0;
      const vehicleCapacity = guide.vehicleCapacity || 6;
      const availableCapacity = vehicleCapacity - currentLoad;

      // Check for conflicts (other schedules at the same time)
      const hasConflict = await this.checkGuideConflict(
        guide.id,
        schedule.startsAt,
        schedule.endsAt,
        scheduleId
      );

      availableGuides.push({
        id: guide.id,
        name: `${guide.firstName} ${guide.lastName}`.trim(),
        vehicleCapacity,
        vehicleType: guide.vehicleType,
        preferredZones: (guide.preferredZones as string[]) || [],
        currentLoad,
        availableCapacity,
        hasConflict: hasConflict.hasConflict,
        conflictReason: hasConflict.reason,
      });
    }

    // Sort by available capacity (descending), then by conflict status
    return availableGuides.sort((a, b) => {
      if (a.hasConflict !== b.hasConflict) {
        return a.hasConflict ? 1 : -1;
      }
      return b.availableCapacity - a.availableCapacity;
    });
  }

  /**
   * Get unassigned bookings for a schedule
   *
   * @param scheduleId - The schedule to get unassigned bookings for
   * @returns List of unassigned bookings
   */
  async getUnassignedBookings(scheduleId: string): Promise<UnassignedBooking[]> {
    const data = await this.getTourAssignmentData(scheduleId);
    return data.unassignedBookings;
  }

  // ============================================================
  // ASSIGNMENT STATUS
  // ============================================================

  /**
   * Get assignment status for a schedule
   *
   * @param scheduleId - The schedule to check status for
   * @returns Assignment status details
   */
  async getScheduleAssignmentStatus(scheduleId: string): Promise<AssignmentStatus> {
    const data = await this.getTourAssignmentData(scheduleId);

    const totalBookings = data.unassignedBookings.length +
      data.guideAssignments.reduce((sum, ga) => sum + ga.pickupAssignments.length, 0);

    const assignedBookings = data.guideAssignments.reduce(
      (sum, ga) => sum + ga.pickupAssignments.length,
      0
    );

    const totalGuests = data.unassignedBookings.reduce(
      (sum, b) => sum + b.passengerCount,
      0
    ) +
      data.guideAssignments.reduce(
        (sum, ga) =>
          sum + ga.pickupAssignments.reduce((s, pa) => s + pa.passengerCount, 0),
        0
      );

    const assignedGuests = data.guideAssignments.reduce(
      (sum, ga) =>
        sum + ga.pickupAssignments.reduce((s, pa) => s + pa.passengerCount, 0),
      0
    );

    const isFullyAssigned = data.unassignedBookings.length === 0;

    let status: TourAssignmentStatus = "needs_attention";
    if (isFullyAssigned && totalBookings > 0) {
      status = "ready";
    }

    return {
      scheduleId,
      totalBookings,
      assignedBookings,
      unassignedBookings: data.unassignedBookings.length,
      totalGuests,
      assignedGuests,
      guidesAssigned: data.schedule.guidesAssigned || 0,
      guidesNeeded: data.schedule.guidesRequired || 0,
      isFullyAssigned,
      status,
    };
  }

  /**
   * Check if a day is fully assigned
   *
   * @param date - The date to check
   * @returns True if all tours for the day are fully assigned
   */
  async isDayFullyAssigned(date: Date): Promise<boolean> {
    const overview = await this.getDayOverview(date);
    return overview.tours.every((t) => t.unassignedBookings === 0);
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /**
   * Approve all ready tours for a day
   * Only approves tours that have all bookings assigned
   *
   * @param date - The date to approve tours for
   * @returns Count of approved and skipped tours
   */
  async approveAllReady(date: Date): Promise<{ approved: number; skipped: number }> {
    const overview = await this.getDayOverview(date);

    let approved = 0;
    let skipped = 0;

    for (const tour of overview.tours) {
      if (tour.status === "ready") {
        // TODO: Implement approval logic (update schedule or create approval record)
        // For now, we just count
        approved++;
      } else {
        skipped++;
      }
    }

    return { approved, skipped };
  }

  /**
   * Notify all guides for approved tours
   * Sends notifications to all guides with confirmed assignments
   *
   * @param date - The date to notify guides for
   * @returns Count of notified guides
   */
  async notifyAllGuides(date: Date): Promise<{ notified: number }> {
    const overview = await this.getDayOverview(date);

    // Get approved tours
    const approvedTours = overview.tours.filter((t) => t.status === "approved");

    // TODO: Implement notification logic via Inngest
    // For now, just return a count
    const notified = approvedTours.reduce((sum, t) => sum + t.guidesAssigned, 0);

    return { notified };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Check if a guide has a scheduling conflict
   *
   * @param guideId - The guide to check
   * @param startsAt - Schedule start time
   * @param endsAt - Schedule end time
   * @param excludeScheduleId - Schedule to exclude from conflict check
   * @returns Whether there's a conflict and the reason
   */
  private async checkGuideConflict(
    guideId: string,
    startsAt: Date,
    endsAt: Date,
    excludeScheduleId?: string
  ): Promise<{ hasConflict: boolean; reason?: string }> {
    // First check if guide is available on this day
    const dayOfWeek = startsAt.getDay();
    const timeStr = `${String(startsAt.getHours()).padStart(2, "0")}:${String(
      startsAt.getMinutes()
    ).padStart(2, "0")}`;

    // Check for availability override on this specific date
    const startOfDay = new Date(startsAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startsAt);
    endOfDay.setHours(23, 59, 59, 999);

    const override = await this.db.query.guideAvailabilityOverrides.findFirst({
      where: and(
        eq(guideAvailabilityOverrides.guideId, guideId),
        eq(guideAvailabilityOverrides.organizationId, this.organizationId),
        gte(guideAvailabilityOverrides.date, startOfDay),
        lte(guideAvailabilityOverrides.date, endOfDay)
      ),
    });

    if (override && !override.isAvailable) {
      return {
        hasConflict: true,
        reason: override.reason || "Guide unavailable on this date",
      };
    }

    // Check weekly availability pattern
    const weeklyAvailability = await this.db.query.guideAvailability.findFirst({
      where: and(
        eq(guideAvailability.guideId, guideId),
        eq(guideAvailability.organizationId, this.organizationId),
        eq(guideAvailability.dayOfWeek, dayOfWeek),
        eq(guideAvailability.isAvailable, true)
      ),
    });

    if (!weeklyAvailability) {
      return {
        hasConflict: true,
        reason: "Guide not available on this day of week",
      };
    }

    // Check for other schedule conflicts via pickup assignments
    const conflictingAssignments = await this.db
      .select({
        scheduleId: pickupAssignments.scheduleId,
        startsAt: schedules.startsAt,
        endsAt: schedules.endsAt,
        tourName: tours.name,
      })
      .from(pickupAssignments)
      .innerJoin(
        guideAssignments,
        eq(pickupAssignments.guideAssignmentId, guideAssignments.id)
      )
      .innerJoin(schedules, eq(pickupAssignments.scheduleId, schedules.id))
      .innerJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(guideAssignments.guideId, guideId),
          eq(pickupAssignments.organizationId, this.organizationId),
          ne(pickupAssignments.status, "cancelled"),
          // Check for time overlap
          sql`${schedules.startsAt} < ${endsAt}`,
          sql`${schedules.endsAt} > ${startsAt}`,
          excludeScheduleId
            ? ne(pickupAssignments.scheduleId, excludeScheduleId)
            : sql`true`
        )
      )
      .limit(1);

    if (conflictingAssignments.length > 0) {
      const conflict = conflictingAssignments[0]!;
      return {
        hasConflict: true,
        reason: `Already assigned to ${conflict.tourName}`,
      };
    }

    return { hasConflict: false };
  }
}
