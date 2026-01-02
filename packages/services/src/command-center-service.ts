/**
 * Command Center Service
 *
 * The "Tour Command Center" - orchestrates daily dispatch operations.
 * Manages guide assignments, optimization, and dispatch for tour runs.
 *
 * Key responsibilities:
 * - Get/create dispatch status for a date
 * - Get tour runs with their bookings and assignments
 * - Get available guides for a date
 * - Generate guide timelines for visualization
 * - Run optimization algorithm for guide assignments
 * - Handle manual assignments and warning resolutions
 * - Dispatch notifications to guides
 */

import { eq, and, gte, lte, inArray, sql, asc, desc } from "drizzle-orm";
import {
  tours,
  bookings,
  customers,
  bookingParticipants,
  guideAssignments,
  guides,
  guideAvailability,
  guideAvailabilityOverrides,
  tourGuideQualifications,
  type Tour,
  type Booking,
  type Guide,
  type GuideAssignment,
  type Customer,
  type BookingParticipant,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError, ConflictError } from "./types";
import { GuideAssignmentService } from "./guide-assignment-service";
import { GuideAvailabilityService } from "./guide-availability-service";
import { TourGuideQualificationService } from "./tour-guide-qualification-service";
import { TourRunService, type TourRun as BaseTourRun } from "./tour-run-service";
import { createServiceLogger } from "./lib/logger";

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Booking with relations from Drizzle query
 */
interface BookingWithRelations extends Booking {
  customer: Customer | null;
  tour: Tour | null;
  participants: BookingParticipant[];
}

/**
 * Guide assignment with relations from Drizzle query
 */
interface GuideAssignmentWithRelations extends GuideAssignment {
  guide: Guide | null;
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dispatch status for a date
 */
export type DispatchStatusType = "pending" | "optimized" | "ready" | "dispatched";

export interface DispatchStatus {
  date: Date;
  status: DispatchStatusType;
  optimizedAt: Date | null;
  dispatchedAt: Date | null;
  totalGuests: number;
  totalGuides: number;
  totalDriveMinutes: number;
  efficiencyScore: number;
  unresolvedWarnings: number;
}

/**
 * Enhanced tour run with additional command center fields
 */
export interface TourRun {
  key: string; // "tourId|2026-01-02|09:00"
  tourId: string;
  tour: Pick<Tour, "id" | "name" | "slug" | "durationMinutes" | "meetingPoint" | "meetingPointDetails" | "guestsPerGuide">;
  date: Date;
  time: string;
  bookings: BookingWithCustomer[];
  totalGuests: number;
  guidesNeeded: number;
  guidesAssigned: number;
  assignedGuides: GuideAssignmentInfo[];
  status: "unassigned" | "partial" | "assigned" | "overstaffed";
}

export interface BookingWithCustomer {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalParticipants: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  status: string;
  paymentStatus: string;
  // Pickup info (if available)
  pickupZoneId: string | null;
  pickupLocation: string | null;
  pickupTime: string | null;
  specialOccasion: string | null;
  isFirstTime: boolean;
}

export interface GuideAssignmentInfo {
  assignmentId: string;
  guideId: string | null;
  guideName: string;
  guideEmail: string | null;
  guidePhone: string | null;
  isOutsourced: boolean;
  isLeadGuide: boolean;
  pickupOrder: number | null;
  calculatedPickupTime: string | null;
  driveTimeMinutes: number | null;
  status: string;
}

/**
 * Available guide for a date
 */
export interface AvailableGuide {
  guide: Pick<Guide, "id" | "firstName" | "lastName" | "email" | "phone" | "avatarUrl" | "languages">;
  vehicleCapacity: number;
  baseZone: string | null;
  qualifiedTours: string[];
  availableFrom: string;
  availableTo: string;
  currentAssignments: CurrentAssignment[];
}

export interface CurrentAssignment {
  tourRunKey: string;
  tourName: string;
  time: string;
  guestCount: number;
}

/**
 * Guide timeline for visualization
 */
export interface GuideTimeline {
  guide: Pick<Guide, "id" | "firstName" | "lastName" | "email" | "phone" | "avatarUrl">;
  vehicleCapacity: number;
  segments: TimelineSegment[];
  totalDriveMinutes: number;
  totalGuests: number;
  utilization: number; // 0-100%
}

export interface TimelineSegment {
  type: "idle" | "drive" | "pickup" | "tour";
  startTime: string; // "07:45"
  endTime: string; // "08:15"
  durationMinutes: number;
  // For pickup segments
  booking?: BookingWithCustomer;
  pickupLocation?: string;
  guestCount?: number;
  // For tour segments
  tour?: Pick<Tour, "id" | "name" | "slug">;
  tourRunKey?: string;
  // Confidence indicator
  confidence: "optimal" | "good" | "review" | "problem";
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  assignments: OptimizedAssignment[];
  warnings: Warning[];
  efficiency: number;
  totalDriveMinutes: number;
}

export interface OptimizedAssignment {
  bookingId: string;
  guideId: string;
  pickupOrder: number;
  calculatedPickupTime: string;
  driveTimeMinutes: number;
}

/**
 * Warning types and resolution
 */
export type WarningType = "insufficient_guides" | "capacity_exceeded" | "no_qualified_guide" | "conflict" | "no_available_guide";

export interface Warning {
  id: string;
  type: WarningType;
  tourRunKey?: string;
  bookingId?: string;
  message: string;
  resolutions: WarningResolution[];
}

export interface WarningResolution {
  id: string;
  label: string; // "Assign to Ahmed (+18m)"
  action: "assign_guide" | "add_external" | "cancel_tour" | "split_booking";
  guideId?: string;
  impactMinutes?: number;
  // Additional context for resolution execution
  tourRunKey?: string; // For tour-level actions (cancel_tour, add_external)
  bookingId?: string; // For booking-level actions (assign_guide, split_booking)
  // For add_external
  externalGuideName?: string;
  externalGuideContact?: string;
  // For split_booking
  splitConfig?: {
    bookingId: string;
    splits: Array<{
      guideId: string;
      guestCount: number;
    }>;
  };
}

/**
 * Dispatch result
 */
export interface DispatchResult {
  success: boolean;
  dispatchedAt: Date;
  guidesNotified: string[];
  errors: Array<{ guideId: string; error: string }>;
}

/**
 * Guest details for booking
 */
export interface GuestDetails {
  booking: BookingWithCustomer;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    type: string;
    dietaryRequirements: string | null;
    accessibilityNeeds: string | null;
    checkedIn: string;
  }>;
  assignedGuide: GuideAssignmentInfo | null;
  tourInfo: Pick<Tour, "id" | "name" | "slug" | "meetingPoint" | "meetingPointDetails"> | null;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Command Center Service
 *
 * Orchestrates daily dispatch operations for tour guides.
 */
export class CommandCenterService extends BaseService {
  // In-memory dispatch status cache (keyed by date string YYYY-MM-DD)
  private static dispatchStatusCache = new Map<string, Map<string, DispatchStatus>>();

  private guideAssignmentService: GuideAssignmentService;
  private guideAvailabilityService: GuideAvailabilityService;
  private tourGuideQualificationService: TourGuideQualificationService;
  private tourRunService: TourRunService;
  private logger: ReturnType<typeof createServiceLogger>;

  constructor(ctx: { organizationId: string; userId?: string }) {
    super(ctx);
    this.guideAssignmentService = new GuideAssignmentService(ctx);
    this.guideAvailabilityService = new GuideAvailabilityService(ctx);
    this.tourGuideQualificationService = new TourGuideQualificationService(ctx);
    this.tourRunService = new TourRunService(ctx);
    this.logger = createServiceLogger("command-center", ctx.organizationId);
  }

  // ===========================================================================
  // DISPATCH STATUS
  // ===========================================================================

  /**
   * Get or create dispatch status for a date
   */
  async getDispatchStatus(date: Date): Promise<DispatchStatus> {
    const dateKey = this.formatDateKey(date);
    const orgCache = CommandCenterService.dispatchStatusCache.get(this.organizationId) || new Map();

    // Check cache first
    const cached = orgCache.get(dateKey);
    if (cached) {
      return cached;
    }

    // Build fresh status from current data
    const tourRuns = await this.getTourRuns(date);
    const availableGuides = await this.getAvailableGuides(date);

    let totalGuests = 0;
    let totalGuidesNeeded = 0;
    let totalGuidesAssigned = 0;
    let unresolvedWarnings = 0;

    for (const run of tourRuns) {
      totalGuests += run.totalGuests;
      totalGuidesNeeded += run.guidesNeeded;
      totalGuidesAssigned += run.guidesAssigned;

      if (run.status === "unassigned" || run.status === "partial") {
        unresolvedWarnings++;
      }
    }

    // Determine status
    let status: DispatchStatusType = "pending";
    if (tourRuns.length === 0) {
      status = "pending";
    } else if (unresolvedWarnings > 0) {
      status = "optimized"; // Has data but needs review
    } else if (totalGuidesAssigned >= totalGuidesNeeded) {
      status = "ready";
    }

    const dispatchStatus: DispatchStatus = {
      date,
      status,
      optimizedAt: status !== "pending" ? new Date() : null,
      dispatchedAt: null,
      totalGuests,
      totalGuides: totalGuidesAssigned,
      totalDriveMinutes: 0, // TODO [Phase 7.3]: Calculate from actual route data
      efficiencyScore: totalGuidesNeeded > 0 ? Math.round((totalGuidesAssigned / totalGuidesNeeded) * 100) : 100,
      unresolvedWarnings,
    };

    // Cache it
    orgCache.set(dateKey, dispatchStatus);
    CommandCenterService.dispatchStatusCache.set(this.organizationId, orgCache);

    return dispatchStatus;
  }

  /**
   * Update dispatch status (internal helper)
   */
  private updateDispatchStatus(date: Date, updates: Partial<DispatchStatus>): void {
    const dateKey = this.formatDateKey(date);
    const orgCache = CommandCenterService.dispatchStatusCache.get(this.organizationId) || new Map();
    const existing = orgCache.get(dateKey);

    if (existing) {
      orgCache.set(dateKey, { ...existing, ...updates });
    }
    CommandCenterService.dispatchStatusCache.set(this.organizationId, orgCache);
  }

  // ===========================================================================
  // TOUR RUNS
  // ===========================================================================

  /**
   * Get all tour runs for a date with their bookings and assignments
   * A "tour run" = tourId + date + time grouping
   */
  async getTourRuns(date: Date): Promise<TourRun[]> {
    const dateStr = this.formatDateKey(date);

    // Get all bookings for this date with the new booking model
    const dateBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      with: {
        customer: true,
        tour: true,
        participants: true,
      },
    });

    // Cast to proper type with relations
    const typedBookings = dateBookings as unknown as BookingWithRelations[];

    // Group bookings by tour + time
    const runMap = new Map<string, {
      tourId: string;
      tour: Tour;
      bookings: BookingWithRelations[];
    }>();

    for (const booking of typedBookings) {
      if (!booking.tourId || !booking.bookingTime) {
        continue;
      }

      const key = `${booking.tourId}|${dateStr}|${booking.bookingTime}`;

      if (!runMap.has(key)) {
        runMap.set(key, {
          tourId: booking.tourId,
          tour: booking.tour!,
          bookings: [],
        });
      }

      runMap.get(key)!.bookings.push(booking);
    }

    // Batch fetch first-time customer status for ALL bookings upfront (fixes N+1)
    const allCustomerIds = typedBookings.map((b) => b.customerId);
    const firstTimeMap = await this.batchCheckFirstTimeCustomers(allCustomerIds);

    // Build tour runs with assignment info
    const tourRuns: TourRun[] = [];

    for (const [key, data] of runMap) {
      const [tourId, , time] = key.split("|");
      const { tour, bookings: runBookings } = data;

      // Calculate totals
      let totalGuests = 0;
      const bookingsWithCustomer: BookingWithCustomer[] = [];

      for (const booking of runBookings) {
        totalGuests += booking.totalParticipants;

        // Use batched lookup instead of individual query (fixes N+1)
        const isFirstTime = firstTimeMap.get(booking.customerId) ?? true;

        bookingsWithCustomer.push({
          id: booking.id,
          referenceNumber: booking.referenceNumber,
          customerId: booking.customerId,
          customerName: booking.customer
            ? `${booking.customer.firstName} ${booking.customer.lastName}`
            : "Unknown",
          customerEmail: booking.customer?.email ?? null,
          customerPhone: booking.customer?.phone ?? null,
          totalParticipants: booking.totalParticipants,
          adultCount: booking.adultCount,
          childCount: booking.childCount ?? 0,
          infantCount: booking.infantCount ?? 0,
          specialRequests: booking.specialRequests,
          dietaryRequirements: booking.dietaryRequirements,
          accessibilityNeeds: booking.accessibilityNeeds,
          internalNotes: booking.internalNotes,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          pickupZoneId: null, // TODO [Phase 7.2]: Add when pickup zones are implemented
          pickupLocation: null,
          pickupTime: null,
          specialOccasion: null, // TODO [Phase 7.2]: Add when special occasions field is added
          isFirstTime,
        });
      }

      // Calculate guides needed
      const guestsPerGuide = tour.guestsPerGuide || 6;
      const guidesNeeded = Math.ceil(totalGuests / guestsPerGuide);

      // Get assignments for this tour run
      const bookingIds = runBookings.map((b) => b.id);
      const assignmentsRaw = bookingIds.length > 0
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

      const assignments = assignmentsRaw as unknown as GuideAssignmentWithRelations[];

      // Build unique guides list
      const guidesMap = new Map<string, GuideAssignmentInfo>();
      for (const assignment of assignments) {
        const guideKey = assignment.guideId || `outsourced:${assignment.outsourcedGuideName}`;
        if (!guidesMap.has(guideKey)) {
          guidesMap.set(guideKey, {
            assignmentId: assignment.id,
            guideId: assignment.guideId,
            guideName: assignment.guide
              ? `${assignment.guide.firstName} ${assignment.guide.lastName}`
              : assignment.outsourcedGuideName || "Unknown",
            guideEmail: assignment.guide?.email ?? assignment.outsourcedGuideContact ?? null,
            guidePhone: assignment.guide?.phone ?? null,
            isOutsourced: !assignment.guideId,
            isLeadGuide: false, // TODO [Phase 7.2]: Add when isLeadGuide field is implemented
            pickupOrder: null, // TODO [Phase 7.3]: Add when pickup order routing is implemented
            calculatedPickupTime: null,
            driveTimeMinutes: null,
            status: assignment.status,
          });
        }
      }

      const guidesAssigned = guidesMap.size;

      // Determine status
      let status: TourRun["status"] = "unassigned";
      if (guidesAssigned === 0) {
        status = "unassigned";
      } else if (guidesAssigned < guidesNeeded) {
        status = "partial";
      } else if (guidesAssigned === guidesNeeded) {
        status = "assigned";
      } else {
        status = "overstaffed";
      }

      tourRuns.push({
        key,
        tourId: tourId!,
        tour: {
          id: tour.id,
          name: tour.name,
          slug: tour.slug,
          durationMinutes: tour.durationMinutes,
          meetingPoint: tour.meetingPoint,
          meetingPointDetails: tour.meetingPointDetails,
          guestsPerGuide: tour.guestsPerGuide,
        },
        date,
        time: time!,
        bookings: bookingsWithCustomer,
        totalGuests,
        guidesNeeded,
        guidesAssigned,
        assignedGuides: Array.from(guidesMap.values()),
        status,
      });
    }

    // Sort by time
    tourRuns.sort((a, b) => a.time.localeCompare(b.time));

    return tourRuns;
  }

  // ===========================================================================
  // AVAILABLE GUIDES
  // ===========================================================================

  /**
   * Get available guides for a date (checking availability patterns + overrides)
   * Optimized to parallelize per-guide queries and batch where possible
   */
  async getAvailableGuides(date: Date): Promise<AvailableGuide[]> {
    // Get all active guides
    const allGuides = await this.db.query.guides.findMany({
      where: and(
        eq(guides.organizationId, this.organizationId),
        eq(guides.status, "active")
      ),
    });

    if (allGuides.length === 0) {
      return [];
    }

    const guideIds = allGuides.map((g) => g.id);

    // Batch fetch all data in parallel (fixes N+1)
    const [
      availabilityResults,
      allQualifications,
      allAssignments,
    ] = await Promise.all([
      // Check availability for all guides in parallel
      this.batchCheckGuideAvailability(guideIds, date),
      // Get qualifications for all guides at once
      this.batchGetGuideQualifications(guideIds),
      // Get assignments for all guides at once
      this.batchGetGuideAssignmentsForDate(guideIds, date),
    ]);

    const availableGuides: AvailableGuide[] = [];

    for (const guide of allGuides) {
      // Check if guide is available on this date
      const availabilityData = availabilityResults.get(guide.id);
      if (!availabilityData?.isAvailable) {
        continue;
      }

      // Get qualified tours from batch result
      const qualifiedTours = allQualifications.get(guide.id) ?? [];

      // Get current assignments from batch result
      const currentAssignments = allAssignments.get(guide.id) ?? [];

      availableGuides.push({
        guide: {
          id: guide.id,
          firstName: guide.firstName,
          lastName: guide.lastName,
          email: guide.email,
          phone: guide.phone,
          avatarUrl: guide.avatarUrl,
          languages: guide.languages as string[],
        },
        vehicleCapacity: guide.vehicleCapacity ?? 6, // Use guide's actual capacity
        baseZone: null, // TODO [Phase 7.3]: Map baseZoneId to zone name
        qualifiedTours,
        availableFrom: availabilityData.startTime || "07:00",
        availableTo: availabilityData.endTime || "22:00",
        currentAssignments,
      });
    }

    return availableGuides;
  }

  /**
   * Batch check availability for multiple guides on a date
   * Returns Map of guideId -> { isAvailable, startTime, endTime }
   */
  private async batchCheckGuideAvailability(
    guideIds: string[],
    date: Date
  ): Promise<Map<string, { isAvailable: boolean; startTime: string | null; endTime: string | null }>> {
    const result = new Map<string, { isAvailable: boolean; startTime: string | null; endTime: string | null }>();
    const dateStr = this.formatDateKey(date);
    const dayOfWeek = date.getDay();

    try {
      // Fetch overrides and weekly availability in parallel
      const [overridesResult, weeklyResult] = await Promise.all([
        // Get all overrides for this date and these guides
        this.db
          .select()
          .from(guideAvailabilityOverrides)
          .where(
            and(
              eq(guideAvailabilityOverrides.organizationId, this.organizationId),
              inArray(guideAvailabilityOverrides.guideId, guideIds),
              sql`${guideAvailabilityOverrides.date}::text = ${dateStr}`
            )
          ),
        // Get weekly availability for this day for all guides
        this.db
          .select()
          .from(guideAvailability)
          .where(
            and(
              eq(guideAvailability.organizationId, this.organizationId),
              inArray(guideAvailability.guideId, guideIds),
              eq(guideAvailability.dayOfWeek, dayOfWeek)
            )
          )
          .orderBy(asc(guideAvailability.startTime)),
      ]);

      // Build override lookup
      const overrideMap = new Map<string, typeof overridesResult[0]>();
      for (const override of overridesResult) {
        overrideMap.set(override.guideId, override);
      }

      // Build weekly availability lookup (first slot per guide)
      const weeklyMap = new Map<string, typeof weeklyResult[0]>();
      for (const slot of weeklyResult) {
        // Only keep first slot per guide (earliest time)
        if (!weeklyMap.has(slot.guideId)) {
          weeklyMap.set(slot.guideId, slot);
        }
      }

      // Process each guide
      for (const guideId of guideIds) {
        const override = overrideMap.get(guideId);
        const weekly = weeklyMap.get(guideId);

        if (override) {
          // Override takes precedence
          result.set(guideId, {
            isAvailable: override.isAvailable,
            startTime: override.startTime,
            endTime: override.endTime,
          });
        } else if (weekly) {
          // Use weekly pattern
          result.set(guideId, {
            isAvailable: weekly.isAvailable,
            startTime: weekly.startTime,
            endTime: weekly.endTime,
          });
        } else {
          // No availability data - default to unavailable
          result.set(guideId, {
            isAvailable: false,
            startTime: null,
            endTime: null,
          });
        }
      }
    } catch (error) {
      this.logger.error({ err: error, guideIds }, "Failed to batch check guide availability");
      // Fallback: mark all as unavailable
      for (const guideId of guideIds) {
        result.set(guideId, { isAvailable: false, startTime: null, endTime: null });
      }
    }

    return result;
  }

  /**
   * Batch get qualifications for multiple guides
   * Returns Map of guideId -> tourId[]
   */
  private async batchGetGuideQualifications(guideIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    if (guideIds.length === 0) {
      return result;
    }

    try {
      const qualifications = await this.db
        .select({
          guideId: tourGuideQualifications.guideId,
          tourId: tourGuideQualifications.tourId,
        })
        .from(tourGuideQualifications)
        .where(
          and(
            eq(tourGuideQualifications.organizationId, this.organizationId),
            inArray(tourGuideQualifications.guideId, guideIds)
          )
        );

      // Group by guideId
      for (const q of qualifications) {
        const existing = result.get(q.guideId) ?? [];
        existing.push(q.tourId);
        result.set(q.guideId, existing);
      }

      // Ensure all guides have an entry (even if empty)
      for (const guideId of guideIds) {
        if (!result.has(guideId)) {
          result.set(guideId, []);
        }
      }
    } catch (error) {
      this.logger.error({ err: error, guideIds }, "Failed to batch get guide qualifications");
      // Fallback: empty arrays
      for (const guideId of guideIds) {
        result.set(guideId, []);
      }
    }

    return result;
  }

  /**
   * Batch get assignments for multiple guides on a date
   * Returns Map of guideId -> CurrentAssignment[]
   */
  private async batchGetGuideAssignmentsForDate(
    guideIds: string[],
    date: Date
  ): Promise<Map<string, CurrentAssignment[]>> {
    const result = new Map<string, CurrentAssignment[]>();
    const dateStr = this.formatDateKey(date);

    if (guideIds.length === 0) {
      return result;
    }

    try {
      const assignmentsResult = await this.db
        .select({
          guideId: guideAssignments.guideId,
          bookingId: guideAssignments.bookingId,
          tourId: bookings.tourId,
          tourName: tours.name,
          bookingTime: bookings.bookingTime,
          totalParticipants: bookings.totalParticipants,
        })
        .from(guideAssignments)
        .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
        .innerJoin(tours, eq(bookings.tourId, tours.id))
        .where(
          and(
            eq(guideAssignments.organizationId, this.organizationId),
            inArray(guideAssignments.guideId, guideIds),
            eq(guideAssignments.status, "confirmed"),
            sql`${bookings.bookingDate}::text = ${dateStr}`
          )
        );

      // Group by guide, then by tour run
      const guideRunMaps = new Map<string, Map<string, CurrentAssignment>>();

      for (const row of assignmentsResult) {
        if (!row.guideId || !row.tourId || !row.bookingTime) continue;

        if (!guideRunMaps.has(row.guideId)) {
          guideRunMaps.set(row.guideId, new Map());
        }

        const runMap = guideRunMaps.get(row.guideId)!;
        const key = `${row.tourId}|${dateStr}|${row.bookingTime}`;

        const existing = runMap.get(key);
        if (existing) {
          existing.guestCount += row.totalParticipants;
        } else {
          runMap.set(key, {
            tourRunKey: key,
            tourName: row.tourName,
            time: row.bookingTime,
            guestCount: row.totalParticipants,
          });
        }
      }

      // Convert to final format
      for (const guideId of guideIds) {
        const runMap = guideRunMaps.get(guideId);
        if (runMap) {
          result.set(guideId, Array.from(runMap.values()));
        } else {
          result.set(guideId, []);
        }
      }
    } catch (error) {
      this.logger.error({ err: error, guideIds, date: dateStr }, "Failed to batch get guide assignments");
      // Fallback: empty arrays
      for (const guideId of guideIds) {
        result.set(guideId, []);
      }
    }

    return result;
  }

  // ===========================================================================
  // GUIDE TIMELINES
  // ===========================================================================

  /**
   * Get guide timelines for visualization
   * Returns guide rows with their segments (drive, pickup, tour)
   */
  async getGuideTimelines(date: Date): Promise<GuideTimeline[]> {
    const availableGuides = await this.getAvailableGuides(date);
    const tourRuns = await this.getTourRuns(date);

    const timelines: GuideTimeline[] = [];

    for (const availableGuide of availableGuides) {
      const segments: TimelineSegment[] = [];
      let totalDriveMinutes = 0;
      let totalGuests = 0;

      // Get all tour runs this guide is assigned to
      const assignedRuns = tourRuns.filter((run) =>
        run.assignedGuides.some((g) => g.guideId === availableGuide.guide.id)
      );

      // Sort by time
      assignedRuns.sort((a, b) => a.time.localeCompare(b.time));

      // Build timeline segments
      let lastEndTime = availableGuide.availableFrom;

      for (const run of assignedRuns) {
        const guideAssignment = run.assignedGuides.find((g) => g.guideId === availableGuide.guide.id);
        if (!guideAssignment) continue;

        // Calculate tour start time
        const tourStartTime = run.time;
        const tourDuration = run.tour.durationMinutes;
        const tourEndTime = this.addMinutesToTime(tourStartTime, tourDuration);

        // Get bookings assigned to this guide in this run
        const guideBookings = run.bookings.filter((b) => {
          // For now, assume all bookings in the run are handled by all assigned guides
          // TODO [Phase 7.3]: Implement per-booking guide assignment tracking
          return true;
        });

        const guestsForGuide = Math.ceil(run.totalGuests / run.guidesAssigned);
        totalGuests += guestsForGuide;

        // Add idle segment if there's a gap
        if (lastEndTime < tourStartTime) {
          const idleDuration = this.timeDifferenceMinutes(lastEndTime, tourStartTime);
          if (idleDuration > 0) {
            segments.push({
              type: "idle",
              startTime: lastEndTime,
              endTime: tourStartTime,
              durationMinutes: idleDuration,
              confidence: "optimal",
            });
          }
        }

        // Add tour segment
        segments.push({
          type: "tour",
          startTime: tourStartTime,
          endTime: tourEndTime,
          durationMinutes: tourDuration,
          tour: {
            id: run.tour.id,
            name: run.tour.name,
            slug: run.tour.slug,
          },
          tourRunKey: run.key,
          guestCount: guestsForGuide,
          confidence: this.calculateConfidence(run, guideAssignment),
        });

        lastEndTime = tourEndTime;
      }

      // Add final idle segment if needed
      if (lastEndTime < availableGuide.availableTo) {
        const idleDuration = this.timeDifferenceMinutes(lastEndTime, availableGuide.availableTo);
        if (idleDuration > 0) {
          segments.push({
            type: "idle",
            startTime: lastEndTime,
            endTime: availableGuide.availableTo,
            durationMinutes: idleDuration,
            confidence: "optimal",
          });
        }
      }

      // Calculate utilization
      const totalWorkMinutes = segments
        .filter((s) => s.type === "tour" || s.type === "pickup" || s.type === "drive")
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const totalAvailableMinutes = this.timeDifferenceMinutes(
        availableGuide.availableFrom,
        availableGuide.availableTo
      );

      const utilization = totalAvailableMinutes > 0
        ? Math.round((totalWorkMinutes / totalAvailableMinutes) * 100)
        : 0;

      timelines.push({
        guide: availableGuide.guide,
        vehicleCapacity: availableGuide.vehicleCapacity,
        segments,
        totalDriveMinutes,
        totalGuests,
        utilization,
      });
    }

    return timelines;
  }

  // ===========================================================================
  // OPTIMIZATION
  // ===========================================================================

  /**
   * Run optimization algorithm for a date
   * Assigns guides to tour runs optimally
   */
  async optimize(date: Date): Promise<OptimizationResult> {
    const tourRuns = await this.getTourRuns(date);
    const availableGuides = await this.getAvailableGuides(date);

    const assignments: OptimizedAssignment[] = [];
    const warnings: Warning[] = [];
    let totalDriveMinutes = 0;

    // Sort tour runs by time (earlier first) and then by guest count (larger harder to staff)
    const sortedRuns = [...tourRuns].sort((a, b) => {
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return b.totalGuests - a.totalGuests;
    });

    // Track guide assignments during optimization
    const guideSchedules = new Map<string, {
      assignedRuns: string[];
      currentLocation: string | null;
    }>();

    for (const guide of availableGuides) {
      guideSchedules.set(guide.guide.id, {
        assignedRuns: [],
        currentLocation: guide.baseZone,
      });
    }

    // Process each tour run
    for (const run of sortedRuns) {
      // Skip if already fully assigned
      if (run.status === "assigned" || run.status === "overstaffed") {
        continue;
      }

      const guidesStillNeeded = run.guidesNeeded - run.guidesAssigned;

      if (guidesStillNeeded <= 0) {
        continue;
      }

      // Find qualified, available guides for this run
      const candidates = availableGuides.filter((g) => {
        // Must be qualified for this tour
        if (!g.qualifiedTours.includes(run.tourId)) {
          return false;
        }

        // Must be available during the tour
        const tourStartTime = run.time;
        const tourEndTime = this.addMinutesToTime(tourStartTime, run.tour.durationMinutes);

        if (tourStartTime < g.availableFrom || tourEndTime > g.availableTo) {
          return false;
        }

        // Check for time conflicts with already assigned runs
        const schedule = guideSchedules.get(g.guide.id);
        if (!schedule) return true;

        for (const assignedRunKey of schedule.assignedRuns) {
          const assignedRun = sortedRuns.find((r) => r.key === assignedRunKey);
          if (!assignedRun) continue;

          const assignedStart = assignedRun.time;
          const assignedEnd = this.addMinutesToTime(assignedStart, assignedRun.tour.durationMinutes);

          // Check for overlap
          if (!(tourEndTime <= assignedStart || tourStartTime >= assignedEnd)) {
            return false;
          }
        }

        return true;
      });

      if (candidates.length === 0) {
        // No qualified guides available
        warnings.push({
          id: this.generateWarningId(),
          type: candidates.length === 0 && availableGuides.some((g) => g.qualifiedTours.includes(run.tourId))
            ? "no_available_guide"
            : "no_qualified_guide",
          tourRunKey: run.key,
          message: `No ${candidates.length === 0 ? "available" : "qualified"} guide for ${run.tour.name} at ${run.time}`,
          resolutions: this.generateResolutions(run, availableGuides),
        });
        continue;
      }

      // Score and rank candidates
      const scoredCandidates = candidates.map((candidate) => ({
        guide: candidate,
        score: this.scoreGuideForRun(candidate, run, guideSchedules),
      })).sort((a, b) => b.score - a.score);

      // Assign top candidates
      const toAssign = scoredCandidates.slice(0, guidesStillNeeded);

      for (let i = 0; i < toAssign.length; i++) {
        const { guide } = toAssign[i]!;

        // Assign guide to all bookings in this run
        for (const booking of run.bookings) {
          // Check if already assigned
          const existingAssignment = run.assignedGuides.find(
            (a) => a.guideId === guide.guide.id
          );

          if (!existingAssignment) {
            // Create assignment
            try {
              await this.guideAssignmentService.assignGuideToBooking(
                booking.id,
                guide.guide.id,
                { autoConfirm: true }
              );

              assignments.push({
                bookingId: booking.id,
                guideId: guide.guide.id,
                pickupOrder: i + 1,
                calculatedPickupTime: run.time, // Simplified - no pickup time calculation yet
                driveTimeMinutes: 0,
              });
            } catch (error) {
              // Assignment might already exist, skip
            }
          }
        }

        // Update guide schedule
        const schedule = guideSchedules.get(guide.guide.id);
        if (schedule) {
          schedule.assignedRuns.push(run.key);
        }
      }

      // Check if we still need more guides
      if (toAssign.length < guidesStillNeeded) {
        warnings.push({
          id: this.generateWarningId(),
          type: "insufficient_guides",
          tourRunKey: run.key,
          message: `Need ${guidesStillNeeded} guides for ${run.tour.name} at ${run.time}, only ${toAssign.length} available`,
          resolutions: this.generateResolutions(run, availableGuides),
        });
      }
    }

    // Calculate efficiency
    const totalGuestsNeeded = tourRuns.reduce((sum, r) => sum + r.totalGuests, 0);
    const totalGuidesNeeded = tourRuns.reduce((sum, r) => sum + r.guidesNeeded, 0);
    const totalGuidesAssigned = assignments.length > 0
      ? new Set(assignments.map((a) => a.guideId)).size
      : 0;

    const efficiency = totalGuidesNeeded > 0
      ? Math.round((totalGuidesAssigned / totalGuidesNeeded) * 100)
      : 100;

    // Update dispatch status
    this.updateDispatchStatus(date, {
      status: warnings.length > 0 ? "optimized" : "ready",
      optimizedAt: new Date(),
      efficiencyScore: efficiency,
      unresolvedWarnings: warnings.length,
    });

    return {
      assignments,
      warnings,
      efficiency,
      totalDriveMinutes,
    };
  }

  // ===========================================================================
  // WARNING RESOLUTION
  // ===========================================================================

  /**
   * Resolve a warning by applying a resolution
   *
   * @param warningId - The ID of the warning being resolved (for logging/tracking)
   * @param resolution - The resolution to apply, must include necessary context (bookingId, tourRunKey, etc.)
   */
  async resolveWarning(warningId: string, resolution: WarningResolution): Promise<void> {
    this.logger.info(`Resolving warning ${warningId} with action: ${resolution.action}`);

    switch (resolution.action) {
      case "assign_guide":
        await this.resolveAssignGuide(warningId, resolution);
        break;

      case "add_external":
        await this.resolveAddExternal(warningId, resolution);
        break;

      case "cancel_tour":
        await this.resolveCancelTour(warningId, resolution);
        break;

      case "split_booking":
        await this.resolveSplitBooking(warningId, resolution);
        break;

      default:
        throw new ValidationError(`Unknown resolution action: ${resolution.action}`);
    }
  }

  /**
   * Resolve warning by assigning a guide
   * Assigns the specified guide to either:
   * - A specific booking (if bookingId provided)
   * - All bookings in a tour run (if tourRunKey provided)
   */
  private async resolveAssignGuide(warningId: string, resolution: WarningResolution): Promise<void> {
    if (!resolution.guideId) {
      throw new ValidationError("Guide ID required for assign_guide action");
    }

    // If bookingId is provided, assign to that specific booking
    if (resolution.bookingId) {
      await this.guideAssignmentService.assignGuideToBooking(
        resolution.bookingId,
        resolution.guideId,
        { autoConfirm: true }
      );

      // Get the booking to invalidate cache
      const booking = await this.db.query.bookings.findFirst({
        where: and(
          eq(bookings.id, resolution.bookingId),
          eq(bookings.organizationId, this.organizationId)
        ),
      });

      if (booking?.bookingDate) {
        this.invalidateDispatchCache(booking.bookingDate);
      }

      this.logger.info(`Resolved warning ${warningId}: assigned guide ${resolution.guideId} to booking ${resolution.bookingId}`);
      return;
    }

    // If tourRunKey is provided, assign to all bookings in that tour run
    if (resolution.tourRunKey) {
      const [tourId, dateStr, time] = resolution.tourRunKey.split("|");

      if (!tourId || !dateStr || !time) {
        throw new ValidationError(`Invalid tourRunKey format: ${resolution.tourRunKey}. Expected: tourId|YYYY-MM-DD|HH:MM`);
      }

      // Find all bookings for this tour run
      const tourRunBookings = await this.db.query.bookings.findMany({
        where: and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          inArray(bookings.status, ["pending", "confirmed"])
        ),
      });

      if (tourRunBookings.length === 0) {
        throw new ValidationError(`No bookings found for tour run: ${resolution.tourRunKey}`);
      }

      // Assign guide to each booking (skip if already assigned)
      let assignedCount = 0;
      for (const booking of tourRunBookings) {
        try {
          await this.guideAssignmentService.assignGuideToBooking(
            booking.id,
            resolution.guideId,
            { autoConfirm: true }
          );
          assignedCount++;
        } catch (error) {
          // Skip if already assigned (ConflictError)
          if (error instanceof ConflictError) {
            this.logger.debug(`Guide already assigned to booking ${booking.id}, skipping`);
            continue;
          }
          throw error;
        }
      }

      // Invalidate cache for the date
      const date = new Date(dateStr);
      this.invalidateDispatchCache(date);

      this.logger.info(`Resolved warning ${warningId}: assigned guide ${resolution.guideId} to ${assignedCount} bookings in tour run ${resolution.tourRunKey}`);
      return;
    }

    throw new ValidationError("Either bookingId or tourRunKey required for assign_guide action");
  }

  /**
   * Resolve warning by adding an external/outsourced guide
   * For now, this creates an outsourced guide assignment if name is provided,
   * otherwise marks the resolution as needing external guide arrangement.
   */
  private async resolveAddExternal(warningId: string, resolution: WarningResolution): Promise<void> {
    // If external guide details are provided, create the outsourced assignment
    if (resolution.externalGuideName && resolution.tourRunKey) {
      const [tourId, dateStr, time] = resolution.tourRunKey.split("|");

      if (!tourId || !dateStr || !time) {
        throw new ValidationError(`Invalid tourRunKey format: ${resolution.tourRunKey}`);
      }

      // Find bookings for this tour run
      const tourRunBookings = await this.db.query.bookings.findMany({
        where: and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          inArray(bookings.status, ["pending", "confirmed"])
        ),
      });

      if (tourRunBookings.length === 0) {
        throw new ValidationError(`No bookings found for tour run: ${resolution.tourRunKey}`);
      }

      // Assign outsourced guide to each booking
      let assignedCount = 0;
      for (const booking of tourRunBookings) {
        try {
          await this.guideAssignmentService.assignOutsourcedGuideToBooking(
            {
              bookingId: booking.id,
              outsourcedGuideName: resolution.externalGuideName,
              outsourcedGuideContact: resolution.externalGuideContact,
              notes: `Added via warning resolution ${warningId}`,
            },
            { autoConfirm: true }
          );
          assignedCount++;
        } catch (error) {
          // Skip if already assigned
          if (error instanceof ConflictError) {
            this.logger.debug(`Outsourced guide already assigned to booking ${booking.id}, skipping`);
            continue;
          }
          throw error;
        }
      }

      // Invalidate cache
      const date = new Date(dateStr);
      this.invalidateDispatchCache(date);

      this.logger.info(`Resolved warning ${warningId}: added external guide "${resolution.externalGuideName}" to ${assignedCount} bookings`);
      return;
    }

    // If no external guide details provided, log the intent
    // This is a placeholder for future external guide booking flow
    this.logger.info(`Warning ${warningId}: External guide needed for tour run ${resolution.tourRunKey || "unknown"}. Manual arrangement required.`);

    // For now, we don't throw - this allows the UI to mark the warning as "acknowledged"
    // In a future phase, this could trigger an Inngest event to notify operations team
  }

  /**
   * Resolve warning by cancelling a tour run
   * This is a significant action - cancels all bookings for a tour run.
   * For safety, this implementation requires explicit tourRunKey and logs the action.
   */
  private async resolveCancelTour(warningId: string, resolution: WarningResolution): Promise<void> {
    if (!resolution.tourRunKey) {
      throw new ValidationError(
        "tourRunKey is required for cancel_tour action. " +
        "Format: tourId|YYYY-MM-DD|HH:MM"
      );
    }

    const [tourId, dateStr, time] = resolution.tourRunKey.split("|");

    if (!tourId || !dateStr || !time) {
      throw new ValidationError(`Invalid tourRunKey format: ${resolution.tourRunKey}. Expected: tourId|YYYY-MM-DD|HH:MM`);
    }

    // Find all bookings for this tour run
    const tourRunBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        eq(bookings.tourId, tourId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        eq(bookings.bookingTime, time),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
    });

    if (tourRunBookings.length === 0) {
      this.logger.warn(`No active bookings found for tour run: ${resolution.tourRunKey}`);
      return;
    }

    // Mark all bookings as cancelled
    // Note: In a full implementation, this should:
    // 1. Trigger refund processing
    // 2. Send cancellation emails to customers
    // 3. Notify assigned guides
    // For now, we update the status and log
    const bookingIds = tourRunBookings.map((b) => b.id);

    await this.db
      .update(bookings)
      .set({
        status: "cancelled",
        internalNotes: sql`COALESCE(${bookings.internalNotes}, '') || E'\n[' || NOW() || '] Cancelled via warning resolution: ${warningId}'`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          inArray(bookings.id, bookingIds)
        )
      );

    // Cancel any guide assignments
    for (const booking of tourRunBookings) {
      try {
        const assignments = await this.guideAssignmentService.getAssignmentsForBooking(booking.id);
        for (const assignment of assignments) {
          if (assignment.status === "confirmed" || assignment.status === "pending") {
            await this.guideAssignmentService.cancelAssignment(assignment.id);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to cancel assignments for booking ${booking.id}: ${error}`);
      }
    }

    // Invalidate cache
    const date = new Date(dateStr);
    this.invalidateDispatchCache(date);

    this.logger.warn(
      `Resolved warning ${warningId}: CANCELLED tour run ${resolution.tourRunKey} ` +
      `affecting ${tourRunBookings.length} bookings. IDs: ${bookingIds.join(", ")}`
    );

    // TODO [Phase 7.4]: Emit 'tour_run.cancelled' Inngest event for:
    // - Customer notification emails
    // - Refund processing
    // - Guide notification
  }

  /**
   * Resolve warning by splitting a booking across multiple guides
   * This is a complex operation that would split guests from one booking
   * into separate bookings, each assigned to different guides.
   *
   * For now, this logs the intended split and provides guidance on what data is needed.
   * Full implementation requires:
   * - Creating new bookings with subset of participants
   * - Updating original booking participant count
   * - Assigning different guides to each split
   */
  private async resolveSplitBooking(warningId: string, resolution: WarningResolution): Promise<void> {
    if (!resolution.splitConfig) {
      throw new ValidationError(
        "splitConfig is required for split_booking action. " +
        "Expected format: { bookingId: string, splits: [{ guideId: string, guestCount: number }] }"
      );
    }

    const { bookingId, splits } = resolution.splitConfig;

    if (!bookingId) {
      throw new ValidationError("splitConfig.bookingId is required");
    }

    if (!splits || splits.length === 0) {
      throw new ValidationError("splitConfig.splits must contain at least one split configuration");
    }

    // Verify the booking exists
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Validate total guest count matches
    const totalSplitGuests = splits.reduce((sum, s) => sum + s.guestCount, 0);
    if (totalSplitGuests !== booking.totalParticipants) {
      throw new ValidationError(
        `Split guest count (${totalSplitGuests}) does not match booking total (${booking.totalParticipants})`
      );
    }

    // Log the intended split for now
    // Full implementation would create new bookings and assign guides
    this.logger.info(
      `Warning ${warningId}: Split booking requested for booking ${bookingId}. ` +
      `Total guests: ${booking.totalParticipants}. ` +
      `Splits: ${splits.map((s) => `${s.guestCount} guests -> guide ${s.guideId}`).join(", ")}`
    );

    // For now, we can at least assign the first guide to the original booking
    // This partially resolves the warning
    if (splits.length > 0 && splits[0]?.guideId) {
      try {
        await this.guideAssignmentService.assignGuideToBooking(
          bookingId,
          splits[0].guideId,
          { autoConfirm: true }
        );
        this.logger.info(`Assigned primary guide ${splits[0].guideId} to booking ${bookingId}`);
      } catch (error) {
        if (!(error instanceof ConflictError)) {
          throw error;
        }
        // Guide already assigned, that's fine
      }
    }

    // Invalidate cache
    if (booking.bookingDate) {
      this.invalidateDispatchCache(booking.bookingDate);
    }

    // TODO [Phase 7.3]: Implement full split functionality:
    // 1. Create new bookings for each split (except first)
    // 2. Move participants to new bookings
    // 3. Update original booking participant count
    // 4. Assign guides to each split booking
    this.logger.warn(
      `Split booking for ${bookingId} partially implemented. ` +
      `Full split functionality pending Phase 7.3.`
    );
  }

  /**
   * Invalidate the dispatch status cache for a specific date
   */
  private invalidateDispatchCache(date: Date): void {
    const dateKey = this.formatDateKey(date);
    const orgCache = CommandCenterService.dispatchStatusCache.get(this.organizationId);
    if (orgCache) {
      orgCache.delete(dateKey);
    }
  }

  // ===========================================================================
  // MANUAL ASSIGNMENT
  // ===========================================================================

  /**
   * Manually assign a booking to a guide
   */
  async manualAssign(bookingId: string, guideId: string): Promise<void> {
    // Verify booking exists and belongs to org
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Verify guide exists and belongs to org
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }

    // Create assignment (auto-confirm for manual assignments)
    await this.guideAssignmentService.assignGuideToBooking(bookingId, guideId, {
      autoConfirm: true,
    });

    // Invalidate dispatch status cache for the booking date
    if (booking.bookingDate) {
      const dateKey = this.formatDateKey(booking.bookingDate);
      const orgCache = CommandCenterService.dispatchStatusCache.get(this.organizationId);
      if (orgCache) {
        orgCache.delete(dateKey);
      }
    }
  }

  /**
   * Unassign a booking from its current guide
   */
  async unassign(bookingId: string): Promise<void> {
    // Get current assignments for this booking
    const assignments = await this.guideAssignmentService.getAssignmentsForBooking(bookingId);

    // Get the booking to invalidate cache
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    // Cancel all confirmed assignments
    for (const assignment of assignments) {
      if (assignment.status === "confirmed") {
        await this.guideAssignmentService.cancelAssignment(assignment.id);
      }
    }

    // Invalidate dispatch status cache
    if (booking?.bookingDate) {
      const dateKey = this.formatDateKey(booking.bookingDate);
      const orgCache = CommandCenterService.dispatchStatusCache.get(this.organizationId);
      if (orgCache) {
        orgCache.delete(dateKey);
      }
    }
  }

  // ===========================================================================
  // DISPATCH
  // ===========================================================================

  /**
   * Dispatch: finalize and send notifications to all guides
   */
  async dispatch(date: Date): Promise<DispatchResult> {
    const status = await this.getDispatchStatus(date);

    // Check if ready to dispatch
    if (status.unresolvedWarnings > 0) {
      throw new ValidationError(
        `Cannot dispatch: ${status.unresolvedWarnings} unresolved warnings`
      );
    }

    const tourRuns = await this.getTourRuns(date);
    const guidesNotified: string[] = [];
    const errors: Array<{ guideId: string; error: string }> = [];

    // Collect all unique guides
    const guideIds = new Set<string>();
    for (const run of tourRuns) {
      for (const assignment of run.assignedGuides) {
        if (assignment.guideId) {
          guideIds.add(assignment.guideId);
        }
      }
    }

    // For now, just mark as dispatched - actual notification would be via Inngest event
    // TODO [Phase 7.2]: Emit 'dispatch.sent' event to Inngest for notification handling

    const dispatchedAt = new Date();

    // Update dispatch status
    this.updateDispatchStatus(date, {
      status: "dispatched",
      dispatchedAt,
    });

    return {
      success: true,
      dispatchedAt,
      guidesNotified: Array.from(guideIds),
      errors,
    };
  }

  // ===========================================================================
  // GUEST DETAILS
  // ===========================================================================

  /**
   * Get detailed guest information for a booking
   */
  async getGuestDetails(bookingId: string): Promise<GuestDetails> {
    // Get booking with all related data
    const bookingRaw = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
      with: {
        customer: true,
        tour: true,
        participants: true,
      },
    });

    if (!bookingRaw) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Cast to proper type with relations
    const booking = bookingRaw as unknown as BookingWithRelations;

    // Check if first-time customer
    const isFirstTime = await this.checkIfFirstTimeCustomer(booking.customerId);

    // Get guide assignment
    const assignments = await this.guideAssignmentService.getAssignmentsForBooking(bookingId);
    const confirmedAssignment = assignments.find((a) => a.status === "confirmed");

    let assignedGuide: GuideAssignmentInfo | null = null;
    if (confirmedAssignment) {
      assignedGuide = {
        assignmentId: confirmedAssignment.id,
        guideId: confirmedAssignment.guideId,
        guideName: confirmedAssignment.guide
          ? `${confirmedAssignment.guide.firstName} ${confirmedAssignment.guide.lastName}`
          : confirmedAssignment.outsourcedGuideName || "Unknown",
        guideEmail: confirmedAssignment.guide?.email ?? confirmedAssignment.outsourcedGuideContact ?? null,
        guidePhone: confirmedAssignment.guide?.phone ?? null,
        isOutsourced: !confirmedAssignment.guideId,
        isLeadGuide: false,
        pickupOrder: null,
        calculatedPickupTime: null,
        driveTimeMinutes: null,
        status: confirmedAssignment.status,
      };
    }

    return {
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        customerId: booking.customerId,
        customerName: booking.customer
          ? `${booking.customer.firstName} ${booking.customer.lastName}`
          : "Unknown",
        customerEmail: booking.customer?.email ?? null,
        customerPhone: booking.customer?.phone ?? null,
        totalParticipants: booking.totalParticipants,
        adultCount: booking.adultCount,
        childCount: booking.childCount ?? 0,
        infantCount: booking.infantCount ?? 0,
        specialRequests: booking.specialRequests,
        dietaryRequirements: booking.dietaryRequirements,
        accessibilityNeeds: booking.accessibilityNeeds,
        internalNotes: booking.internalNotes,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        pickupZoneId: null,
        pickupLocation: null,
        pickupTime: null,
        specialOccasion: null,
        isFirstTime,
      },
      participants: booking.participants.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        type: p.type,
        dietaryRequirements: p.dietaryRequirements,
        accessibilityNeeds: p.accessibilityNeeds,
        checkedIn: p.checkedIn || "no",
      })),
      assignedGuide,
      tourInfo: booking.tour
        ? {
            id: booking.tour.id,
            name: booking.tour.name,
            slug: booking.tour.slug,
            meetingPoint: booking.tour.meetingPoint,
            meetingPointDetails: booking.tour.meetingPointDetails,
          }
        : null,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDateKey(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }

  /**
   * Check if a customer is booking for the first time
   */
  private async checkIfFirstTimeCustomer(customerId: string): Promise<boolean> {
    const bookingCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.customerId, customerId),
          eq(bookings.status, "completed")
        )
      );

    return (bookingCount[0]?.count ?? 0) === 0;
  }

  /**
   * Batch check if multiple customers are first-time bookers
   * Returns a Map of customerId -> isFirstTime
   */
  private async batchCheckFirstTimeCustomers(customerIds: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    if (customerIds.length === 0) {
      return result;
    }

    // Deduplicate customer IDs
    const uniqueCustomerIds = [...new Set(customerIds)];

    try {
      // Single query to count completed bookings per customer
      const completedCounts = await this.db
        .select({
          customerId: bookings.customerId,
          count: sql<number>`count(*)::int`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.organizationId, this.organizationId),
            inArray(bookings.customerId, uniqueCustomerIds),
            eq(bookings.status, "completed")
          )
        )
        .groupBy(bookings.customerId);

      // Build lookup map
      const countMap = new Map<string, number>();
      for (const row of completedCounts) {
        countMap.set(row.customerId, row.count);
      }

      // Set results: isFirstTime = true if count is 0 or not found
      for (const customerId of uniqueCustomerIds) {
        const count = countMap.get(customerId) ?? 0;
        result.set(customerId, count === 0);
      }
    } catch (error) {
      this.logger.error({ err: error, customerIds: uniqueCustomerIds }, "Failed to batch check first-time customers");
      // Fallback: assume all are first-time to avoid blocking
      for (const customerId of uniqueCustomerIds) {
        result.set(customerId, true);
      }
    }

    return result;
  }

  /**
   * Get guide availability details for a specific date
   */
  private async getGuideAvailabilityForDate(guideId: string, date: Date): Promise<{
    startTime: string | null;
    endTime: string | null;
  }> {
    // Check for override first
    const override = await this.guideAvailabilityService.getOverrideForDate(guideId, date);
    if (override) {
      return {
        startTime: override.startTime,
        endTime: override.endTime,
      };
    }

    // Fall back to weekly pattern
    const dayOfWeek = date.getDay();
    const weeklySlots = await this.db
      .select()
      .from(guideAvailability)
      .where(
        and(
          eq(guideAvailability.organizationId, this.organizationId),
          eq(guideAvailability.guideId, guideId),
          eq(guideAvailability.dayOfWeek, dayOfWeek),
          eq(guideAvailability.isAvailable, true)
        )
      )
      .orderBy(asc(guideAvailability.startTime))
      .limit(1);

    const slot = weeklySlots[0];
    return {
      startTime: slot?.startTime ?? null,
      endTime: slot?.endTime ?? null,
    };
  }

  /**
   * Get guide assignments for a specific date
   */
  private async getGuideAssignmentsForDate(guideId: string, date: Date): Promise<CurrentAssignment[]> {
    const dateStr = this.formatDateKey(date);

    const assignmentsResult = await this.db
      .select({
        bookingId: guideAssignments.bookingId,
        tourId: bookings.tourId,
        tourName: tours.name,
        bookingTime: bookings.bookingTime,
        totalParticipants: bookings.totalParticipants,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.status, "confirmed"),
          sql`${bookings.bookingDate}::text = ${dateStr}`
        )
      );

    // Group by tour run
    const runMap = new Map<string, CurrentAssignment>();
    for (const row of assignmentsResult) {
      if (!row.tourId || !row.bookingTime) continue;

      const key = `${row.tourId}|${dateStr}|${row.bookingTime}`;
      const existing = runMap.get(key);

      if (existing) {
        existing.guestCount += row.totalParticipants;
      } else {
        runMap.set(key, {
          tourRunKey: key,
          tourName: row.tourName,
          time: row.bookingTime,
          guestCount: row.totalParticipants,
        });
      }
    }

    return Array.from(runMap.values());
  }

  /**
   * Score a guide for a tour run
   */
  private scoreGuideForRun(
    guide: AvailableGuide,
    run: TourRun,
    schedules: Map<string, { assignedRuns: string[]; currentLocation: string | null }>
  ): number {
    let score = 0;

    // Base score for being qualified
    score += 50;

    // Workload balancing - prefer guides with fewer assignments
    const schedule = schedules.get(guide.guide.id);
    if (schedule) {
      score -= schedule.assignedRuns.length * 10;
    }

    // Prefer guides with matching languages (if booking has language preference)
    // TODO [Phase 7.3]: Add language matching when booking language preference is available

    // Capacity fit - prefer guides whose capacity matches the load
    const guestsToAssign = Math.ceil(run.totalGuests / run.guidesNeeded);
    const capacityDiff = guide.vehicleCapacity - guestsToAssign;
    if (capacityDiff >= 0 && capacityDiff <= 2) {
      score += 20; // Good fit
    } else if (capacityDiff < 0) {
      score -= 30; // Over capacity
    }

    return score;
  }

  /**
   * Calculate confidence level for a segment
   */
  private calculateConfidence(
    run: TourRun,
    assignment: GuideAssignmentInfo
  ): TimelineSegment["confidence"] {
    // Check staffing level
    if (run.status === "unassigned") return "problem";
    if (run.status === "partial") return "review";
    if (run.status === "overstaffed") return "review";

    // Check capacity
    const guestsPerGuide = run.totalGuests / run.guidesAssigned;
    if (guestsPerGuide > 8) return "review"; // Over typical capacity

    return "optimal";
  }

  /**
   * Generate warning ID
   */
  private generateWarningId(): string {
    return `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate resolutions for a warning
   */
  private generateResolutions(
    run: TourRun,
    availableGuides: AvailableGuide[]
  ): WarningResolution[] {
    const resolutions: WarningResolution[] = [];

    // Find alternative guides (not qualified but available)
    const alternativeGuides = availableGuides.filter((g) => {
      // Must not already be assigned to this run
      if (run.assignedGuides.some((a) => a.guideId === g.guide.id)) {
        return false;
      }
      // Must be available during the tour time
      const tourStartTime = run.time;
      const tourEndTime = this.addMinutesToTime(tourStartTime, run.tour.durationMinutes);
      return tourStartTime >= g.availableFrom && tourEndTime <= g.availableTo;
    });

    for (const guide of alternativeGuides.slice(0, 3)) {
      resolutions.push({
        id: `res_assign_${guide.guide.id}`,
        label: `Assign to ${guide.guide.firstName} ${guide.guide.lastName}`,
        action: "assign_guide",
        guideId: guide.guide.id,
        tourRunKey: run.key, // Include tour run key for resolution
        impactMinutes: 0, // TODO [Phase 7.3]: Calculate actual impact
      });
    }

    // Add external guide option
    resolutions.push({
      id: "res_add_external",
      label: "Add External Guide",
      action: "add_external",
      tourRunKey: run.key, // Include tour run key for resolution
    });

    // Add cancel tour option for severe staffing issues
    resolutions.push({
      id: "res_cancel_tour",
      label: "Cancel Tour Run",
      action: "cancel_tour",
      tourRunKey: run.key,
    });

    return resolutions;
  }

  /**
   * Add minutes to a time string (HH:MM)
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(":").map(Number);
    const totalMinutes = (hours || 0) * 60 + (mins || 0) + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
  }

  /**
   * Calculate difference in minutes between two time strings (HH:MM)
   */
  private timeDifferenceMinutes(startTime: string, endTime: string): number {
    const [startHours, startMins] = startTime.split(":").map(Number);
    const [endHours, endMins] = endTime.split(":").map(Number);

    const startTotal = (startHours || 0) * 60 + (startMins || 0);
    const endTotal = (endHours || 0) * 60 + (endMins || 0);

    return endTotal - startTotal;
  }
}
