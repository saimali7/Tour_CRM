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
  dispatchStatus,
  guides,
  guideAvailability,
  guideAvailabilityOverrides,
  tourGuideQualifications,
  type Tour,
  type Booking,
  type Guide,
  type GuideAssignment,
  type DispatchStatus as DispatchStatusRow,
  type Customer,
  type BookingParticipant,
  type PickupZone,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError, ConflictError } from "./types";
import { GuideAssignmentService } from "./guide-assignment-service";
import { GuideAvailabilityService } from "./guide-availability-service";
import { TourGuideQualificationService } from "./tour-guide-qualification-service";
import { PickupAssignmentService } from "./pickup-assignment-service";
import { createServiceLogger } from "./lib/logger";
import { createTourRunKey, parseTourRunKey, formatDateForKey, getDayOfWeek } from "./lib/tour-run-utils";
import { requireEntity } from "./lib/validation-helpers";
import {
  optimizeDispatch,
  buildTravelMatrix,
  type OptimizationWarning,
} from "./optimization";
import {
  validateBookingWithRelationsArray,
  validateGuideAssignmentWithRelationsArray,
  validateBookingWithRelations,
} from "./lib/type-guards";

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
  pickupZone: PickupZone | null;
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
  /** Date in YYYY-MM-DD format */
  date: string;
  status: DispatchStatusType;
  optimizedAt: Date | null;
  dispatchedAt: Date | null;
  totalGuests: number;
  totalGuides: number;
  totalDriveMinutes: number;
  efficiencyScore: number;
  unresolvedWarnings: number;
  warnings: Warning[];
}

/**
 * Enhanced tour run with additional command center fields
 */
export interface TourRun {
  key: string; // "tourId|2026-01-02|09:00"
  tourId: string;
  tour: Pick<Tour, "id" | "name" | "slug" | "durationMinutes" | "meetingPoint" | "meetingPointDetails" | "guestsPerGuide">;
  /** Date in YYYY-MM-DD format */
  date: string;
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
  total: string | null;
  currency: string | null;
  // Pickup info (if available)
  pickupZoneId: string | null;
  pickupZone: {
    id: string;
    name: string;
    color: string;
  } | null;
  pickupLocation: string | null;
  pickupTime: string | null;
  specialOccasion: string | null;
  isFirstTime: boolean;
  // Experience mode for shared vs private bookings
  experienceMode: "join" | "book" | "charter" | null;
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
  pickupZoneName?: string;
  pickupZoneColor?: string;
  guestCount?: number;
  // For tour segments
  tour?: Pick<Tour, "id" | "name" | "slug">;
  tourRunKey?: string;
  bookingIds?: string[]; // All booking IDs in this tour run (for drag-to-unassign)
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
export type WarningType =
  | "insufficient_guides"
  | "capacity_exceeded"
  | "no_qualified_guide"
  | "no_available_guide"
  | "conflict"
  | "schedule_conflict"
  | "other";

export interface Warning {
  id: string;
  type: WarningType;
  tourRunKey?: string;
  bookingId?: string;
  message: string;
  resolutions?: WarningResolution[];
  resolved?: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export interface WarningResolution {
  id: string;
  label: string; // "Assign to Ahmed (+18m)"
  action: "assign_guide" | "add_external" | "cancel_tour" | "split_booking" | "acknowledge";
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

export type DispatchBatchChange =
  | {
      type: "assign";
      bookingId: string;
      toGuideId: string;
    }
  | {
      type: "unassign";
      bookingIds: string[];
      fromGuideId: string;
    }
  | {
      type: "reassign";
      bookingIds: string[];
      fromGuideId: string;
      toGuideId: string;
    }
  | {
      type: "time-shift";
      bookingIds: string[];
      guideId: string;
      newStartTime: string;
    };

export interface DispatchBatchApplyResult {
  success: boolean;
  applied: number;
  results: Array<{
    type: DispatchBatchChange["type"];
    bookingIds: string[];
    success: boolean;
  }>;
}

export interface AddOutsourcedGuideToRunResult {
  success: boolean;
  noop: boolean;
  assignedCount: number;
  message: string;
}

export interface CreateTempGuideForDateResult {
  success: boolean;
  guideId: string;
  guideName: string;
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
  private guideAssignmentService: GuideAssignmentService;
  private guideAvailabilityService: GuideAvailabilityService;
  private tourGuideQualificationService: TourGuideQualificationService;
  private pickupAssignmentService: PickupAssignmentService;
  private logger: ReturnType<typeof createServiceLogger>;

  constructor(ctx: { organizationId: string; userId?: string }) {
    super(ctx);
    this.guideAssignmentService = new GuideAssignmentService(ctx);
    this.guideAvailabilityService = new GuideAvailabilityService(ctx);
    this.tourGuideQualificationService = new TourGuideQualificationService(ctx);
    this.pickupAssignmentService = new PickupAssignmentService(ctx);
    this.logger = createServiceLogger("command-center", ctx.organizationId);
  }

  // ===========================================================================
  // DISPATCH STATUS
  // ===========================================================================

  /**
   * Get or create dispatch status for a date
   */
  async getDispatchStatus(date: Date | string): Promise<DispatchStatus> {
    return this.refreshDispatchStatus(date);
  }

  /**
   * Refresh and persist dispatch status from current data
   */
  private async refreshDispatchStatus(date: Date | string): Promise<DispatchStatus> {
    const tourRuns = await this.getTourRuns(date);
    const summary = this.computeDispatchSummaryFromRuns(tourRuns);
    const existing = await this.getDispatchStatusRecord(date);
    const warningState = await this.reconcileWarnings(existing?.warnings ?? [], tourRuns);
    const unresolvedWarnings = Math.max(summary.unresolvedWarnings, warningState.unresolvedCount);

    // Preserve dispatched status once set
    const status: DispatchStatusType = existing?.status === "dispatched"
      ? "dispatched"
      : tourRuns.length === 0
        ? "pending"
        : unresolvedWarnings > 0
          ? "optimized"
          : "ready";

    const merged = {
      totalGuests: summary.totalGuests,
      totalGuides: summary.totalGuides,
      totalDriveMinutes: summary.totalDriveMinutes,
      efficiencyScore: this.normalizeEfficiencyScore(summary.efficiencyScore),
      unresolvedWarnings,
      status,
      optimizedAt: existing?.optimizedAt ?? (status !== "pending" ? new Date() : null),
      dispatchedAt: existing?.dispatchedAt ?? null,
      dispatchedBy: existing?.dispatchedBy ?? null,
      warnings: warningState.warnings,
    } satisfies Partial<DispatchStatusRow>;

    const row = await this.upsertDispatchStatus(date, merged, existing);
    return this.mapDispatchStatusRow(row);
  }

  /**
   * Apply explicit dispatch status updates (optimize/dispatch)
   */
  private async applyDispatchStatusUpdate(
    date: Date | string,
    updates: Partial<DispatchStatusRow>
  ): Promise<DispatchStatus> {
    const tourRuns = await this.getTourRuns(date);
    const summary = this.computeDispatchSummaryFromRuns(tourRuns);
    const existing = await this.getDispatchStatusRecord(date);
    const incomingWarnings = (updates.warnings ?? existing?.warnings ?? []) as Warning[];
    const warningState = updates.warnings
      ? { warnings: incomingWarnings, unresolvedCount: this.countUnresolvedWarnings(incomingWarnings) }
      : await this.reconcileWarnings(incomingWarnings, tourRuns);
    const computedUnresolved = Math.max(summary.unresolvedWarnings, warningState.unresolvedCount);

    const baseStatus: DispatchStatusType = existing?.status === "dispatched"
      ? "dispatched"
      : tourRuns.length === 0
        ? "pending"
        : computedUnresolved > 0
          ? "optimized"
          : "ready";

    let status = (updates.status as DispatchStatusType | undefined) ?? baseStatus;
    if (status !== "dispatched" && computedUnresolved > 0) {
      status = "optimized";
    }

    const merged = {
      totalGuests: updates.totalGuests ?? summary.totalGuests,
      totalGuides: updates.totalGuides ?? summary.totalGuides,
      totalDriveMinutes: updates.totalDriveMinutes ?? summary.totalDriveMinutes,
      efficiencyScore: this.normalizeEfficiencyScore(
        updates.efficiencyScore ?? summary.efficiencyScore
      ),
      unresolvedWarnings: Math.max(updates.unresolvedWarnings ?? 0, computedUnresolved),
      warnings: warningState.warnings,
      status,
      optimizedAt: updates.optimizedAt ?? existing?.optimizedAt ?? (status !== "pending" ? new Date() : null),
      dispatchedAt: updates.dispatchedAt ?? existing?.dispatchedAt ?? null,
      dispatchedBy: updates.dispatchedBy ?? existing?.dispatchedBy ?? null,
    } satisfies Partial<DispatchStatusRow>;

    const row = await this.upsertDispatchStatus(date, merged, existing);
    return this.mapDispatchStatusRow(row);
  }

  /**
   * Compute dispatch summary from current tour runs
   */
  private computeDispatchSummaryFromRuns(tourRuns: TourRun[]): {
    status: DispatchStatusType;
    totalGuests: number;
    totalGuides: number;
    totalDriveMinutes: number;
    efficiencyScore: number;
    unresolvedWarnings: number;
  } {
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

    let status: DispatchStatusType = "pending";
    if (tourRuns.length === 0) {
      status = "pending";
    } else if (unresolvedWarnings > 0) {
      status = "optimized";
    } else {
      status = "ready";
    }

    const efficiencyScore = totalGuidesNeeded > 0
      ? Math.round((totalGuidesAssigned / totalGuidesNeeded) * 100)
      : 100;

    return {
      status,
      totalGuests,
      totalGuides: totalGuidesAssigned,
      totalDriveMinutes: 0,
      efficiencyScore,
      unresolvedWarnings,
    };
  }

  /**
   * Compute dispatch summary from current tour runs (loads runs)
   */
  private async computeDispatchSummary(date: Date | string): Promise<{
    status: DispatchStatusType;
    totalGuests: number;
    totalGuides: number;
    totalDriveMinutes: number;
    efficiencyScore: number;
    unresolvedWarnings: number;
  }> {
    const tourRuns = await this.getTourRuns(date);
    return this.computeDispatchSummaryFromRuns(tourRuns);
  }

  private normalizeEfficiencyScore(
    value: number | string | null | undefined
  ): string | null {
    if (value === null || value === undefined) return null;
    return typeof value === "number" ? value.toString() : value;
  }

  private countUnresolvedWarnings(warnings: Warning[]): number {
    return warnings.filter((warning) => !warning.resolved).length;
  }

  private async reconcileWarnings(
    warnings: Warning[],
    tourRuns: TourRun[]
  ): Promise<{ warnings: Warning[]; unresolvedCount: number }> {
    if (warnings.length === 0) {
      return { warnings, unresolvedCount: 0 };
    }

    const bookingIds = warnings
      .map((warning) => warning.bookingId)
      .filter((id): id is string => Boolean(id));

    const assignedBookingIds = new Set<string>();

    if (bookingIds.length > 0) {
      const assignments = await this.db.query.guideAssignments.findMany({
        columns: {
          bookingId: true,
        },
        where: and(
          eq(guideAssignments.organizationId, this.organizationId),
          inArray(guideAssignments.bookingId, bookingIds),
          eq(guideAssignments.status, "confirmed")
        ),
      });

      for (const assignment of assignments) {
        assignedBookingIds.add(assignment.bookingId);
      }
    }

    const tourRunStatus = new Map(tourRuns.map((run) => [run.key, run.status]));
    const nowIso = new Date().toISOString();
    const autoResolveTypes = new Set<WarningType>([
      "insufficient_guides",
      "no_available_guide",
      "no_qualified_guide",
    ]);

    const updatedWarnings = warnings.map((warning) => {
      if (warning.resolved) return warning;

      let shouldResolve = false;

      if (warning.bookingId && assignedBookingIds.has(warning.bookingId)) {
        if (autoResolveTypes.has(warning.type)) {
          shouldResolve = true;
        }
      } else if (warning.tourRunKey) {
        const status = tourRunStatus.get(warning.tourRunKey);
        if (status === "assigned" && autoResolveTypes.has(warning.type)) {
          shouldResolve = true;
        }
      }

      if (!shouldResolve) {
        return warning;
      }

      return {
        ...warning,
        resolved: true,
        resolvedAt: warning.resolvedAt ?? nowIso,
        resolution: warning.resolution ?? "auto",
      };
    });

    return {
      warnings: updatedWarnings,
      unresolvedCount: this.countUnresolvedWarnings(updatedWarnings),
    };
  }

  /**
   * Get dispatch status record for date (DB)
   */
  private async getDispatchStatusRecord(date: Date | string): Promise<DispatchStatusRow | null> {
    const dateKey = this.formatDateKey(date);
    const record = await this.db.query.dispatchStatus.findFirst({
      where: and(
        eq(dispatchStatus.organizationId, this.organizationId),
        sql`${dispatchStatus.dispatchDate}::text = ${dateKey}`
      ),
    });
    return record ?? null;
  }

  /**
   * Insert or update dispatch status row
   */
  private async upsertDispatchStatus(
    date: Date | string,
    updates: Partial<DispatchStatusRow>,
    existing?: DispatchStatusRow | null
  ): Promise<DispatchStatusRow> {
    const dateKey = this.formatDateKey(date);
    const dispatchDate = new Date(dateKey);

    if (existing) {
      const [updated] = await this.db
        .update(dispatchStatus)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dispatchStatus.organizationId, this.organizationId),
            sql`${dispatchStatus.dispatchDate}::text = ${dateKey}`
          )
        )
        .returning();

      return updated ?? existing;
    }

    const [created] = await this.db
      .insert(dispatchStatus)
      .values({
        organizationId: this.organizationId,
        dispatchDate,
        status: "pending",
        ...updates,
      })
      .returning();

    if (!created) {
      throw new ValidationError("Failed to create dispatch status");
    }

    return created;
  }

  /**
   * Map DB row to API shape
   */
  private mapDispatchStatusRow(row: DispatchStatusRow): DispatchStatus {
    return {
      date: this.formatDateKey(row.dispatchDate),
      status: row.status as DispatchStatusType,
      optimizedAt: row.optimizedAt ?? null,
      dispatchedAt: row.dispatchedAt ?? null,
      totalGuests: row.totalGuests ?? 0,
      totalGuides: row.totalGuides ?? 0,
      totalDriveMinutes: row.totalDriveMinutes ?? 0,
      efficiencyScore: row.efficiencyScore ? Number(row.efficiencyScore) : 0,
      unresolvedWarnings: row.unresolvedWarnings ?? 0,
      warnings: (row.warnings ?? []) as Warning[],
    };
  }

  private async assertNotDispatched(
    date: Date | string,
    actionLabel: string
  ): Promise<void> {
    const existing = await this.getDispatchStatusRecord(date);
    if (existing?.status === "dispatched") {
      const dateKey = this.formatDateKey(date);
      throw new ValidationError(`${actionLabel} blocked: ${dateKey} is already dispatched.`);
    }
  }

  // ===========================================================================
  // TOUR RUNS
  // ===========================================================================

  /**
   * Get all tour runs for a date with their bookings and assignments
   * A "tour run" = tourId + date + time grouping
   */
  async getTourRuns(date: Date | string): Promise<TourRun[]> {
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
        pickupZone: true,
      },
    });

    // Validate that relations are loaded, then cast to internal type
    validateBookingWithRelationsArray(dateBookings, "CommandCenterService.getTourRuns");
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

      const key = createTourRunKey(booking.tourId, dateStr, booking.bookingTime);

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
          total: booking.total ? String(booking.total) : null,
          currency: booking.currency ?? null,
          pickupZoneId: booking.pickupZoneId ?? null,
          pickupZone: booking.pickupZone
            ? {
                id: booking.pickupZone.id,
                name: booking.pickupZone.name,
                color: booking.pickupZone.color || "#6B7280",
              }
            : null,
          pickupLocation: booking.pickupLocation ?? null,
          pickupTime: booking.pickupTime ?? null,
          specialOccasion: booking.specialOccasion ?? null,
          isFirstTime,
          experienceMode: (booking.pricingSnapshot as { experienceMode?: "join" | "book" | "charter" } | null)?.experienceMode ?? null,
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

      validateGuideAssignmentWithRelationsArray(assignmentsRaw, "CommandCenterService.getTourRuns.assignments");
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
            isLeadGuide: false,
            pickupOrder: null,
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
        date: dateStr,
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
  async getAvailableGuides(date: Date | string): Promise<AvailableGuide[]> {
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
        vehicleCapacity: Math.max(guide.vehicleCapacity ?? 6, 1),
        baseZone: null,
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
    date: Date | string
  ): Promise<Map<string, { isAvailable: boolean; startTime: string | null; endTime: string | null }>> {
    const result = new Map<string, { isAvailable: boolean; startTime: string | null; endTime: string | null }>();
    const dateStr = this.formatDateKey(date);
    const dayOfWeek = getDayOfWeek(date);

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
              sql`DATE(${guideAvailabilityOverrides.date}) = ${dateStr}::DATE`
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
    date: Date | string
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
        const key = createTourRunKey(row.tourId, dateStr, row.bookingTime);

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
  async getGuideTimelines(date: Date | string): Promise<GuideTimeline[]> {
    // Ensure pickup assignments exist for the date
    await this.pickupAssignmentService.syncForDate(date);
    const dateKey = this.formatDateKey(date);

    const [availableGuides, tourRuns, pickupAssignments] = await Promise.all([
      this.getAvailableGuides(date),
      this.getTourRuns(date),
      this.pickupAssignmentService.getForDate(date),
    ]);

    const pickupsByGuide = new Map<string, typeof pickupAssignments>();
    for (const pickup of pickupAssignments) {
      if (!pickup.guideId) continue;
      if (!pickupsByGuide.has(pickup.guideId)) {
        pickupsByGuide.set(pickup.guideId, []);
      }
      pickupsByGuide.get(pickup.guideId)!.push(pickup);
    }

    // Fast lookup for bookings by ID
    const bookingById = new Map<
      string,
      {
        booking: BookingWithCustomer;
        runKey: string;
        startTime: string;
      }
    >();
    for (const run of tourRuns) {
      for (const booking of run.bookings) {
        bookingById.set(booking.id, {
          booking,
          runKey: run.key,
          startTime: run.time,
        });
      }
    }

    const timelines: GuideTimeline[] = [];
    const pickupDurationMinutes = 5;

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
      let lastSegmentWasWork = false;
      const guidePickups = pickupsByGuide.get(availableGuide.guide.id) ?? [];

      const pickupsByRun = new Map<string, typeof guidePickups>();
      for (const pickup of guidePickups) {
        if (!pickupsByRun.has(pickup.tourRunKey)) {
          pickupsByRun.set(pickup.tourRunKey, []);
        }
        pickupsByRun.get(pickup.tourRunKey)!.push(pickup);
      }

      for (const run of assignedRuns) {
        const guideAssignment = run.assignedGuides.find((g) => g.guideId === availableGuide.guide.id);
        if (!guideAssignment) continue;

        // Calculate tour start time
        const tourStartTime = run.time;
        const tourDuration = run.tour.durationMinutes;
        const tourEndTime = this.addMinutesToTime(tourStartTime, tourDuration);

        const runPickups = (pickupsByRun.get(run.key) ?? [])
          .filter((pickup) => pickup.pickupTime)
          .sort((a, b) => {
            if (a.pickupOrder !== b.pickupOrder) {
              return a.pickupOrder - b.pickupOrder;
            }
            return (a.pickupTime ?? "").localeCompare(b.pickupTime ?? "");
          });

        if (runPickups.length === 0) {
          const guestsForGuide = Math.ceil(run.totalGuests / Math.max(run.guidesAssigned, 1));
          totalGuests += guestsForGuide;

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
              lastSegmentWasWork = false;
            }
          }

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
            bookingIds: run.bookings.map((b) => b.id),
            guestCount: guestsForGuide,
            confidence: this.calculateConfidence(run, guideAssignment),
          });

          lastSegmentWasWork = true;
          lastEndTime = tourEndTime;
          continue;
        }

        const firstSegmentStart = runPickups[0]!.pickupTime!;

        // Add idle before first segment
        if (lastEndTime < firstSegmentStart) {
          const idleDuration = this.timeDifferenceMinutes(lastEndTime, firstSegmentStart);
          if (idleDuration > 0) {
            segments.push({
              type: "idle",
              startTime: lastEndTime,
              endTime: firstSegmentStart,
              durationMinutes: idleDuration,
              confidence: "optimal",
            });
            lastSegmentWasWork = false;
            lastEndTime = firstSegmentStart;
          }
        }

        // Add pickup segments (and drive gaps between them)
        for (const pickup of runPickups) {
          const pickupTime = pickup.pickupTime!;
          if (lastEndTime < pickupTime) {
            const gap = this.timeDifferenceMinutes(lastEndTime, pickupTime);
            if (gap > 0) {
              segments.push({
                type: lastSegmentWasWork ? "drive" : "idle",
                startTime: lastEndTime,
                endTime: pickupTime,
                durationMinutes: gap,
                confidence: "optimal",
              });
              if (lastSegmentWasWork) {
                totalDriveMinutes += gap;
              }
            }
          }

          const pickupEnd = this.addMinutesToTime(pickupTime, pickupDurationMinutes);
          const bookingRef = bookingById.get(pickup.bookingId);
          const booking = bookingRef?.booking;
          const guestCount = booking?.totalParticipants ?? pickup.passengerCount;

          segments.push({
            type: "pickup",
            startTime: pickupTime,
            endTime: pickupEnd,
            durationMinutes: pickupDurationMinutes,
            booking: booking ?? undefined,
            pickupLocation: booking?.pickupLocation ?? "Pickup",
            pickupZoneName: booking?.pickupZone?.name,
            pickupZoneColor: booking?.pickupZone?.color,
            guestCount,
            confidence: this.calculateConfidence(run, guideAssignment),
          });

          totalGuests += guestCount;
          lastSegmentWasWork = true;
          lastEndTime = pickupEnd;
        }

        // Drive segment from last pickup to tour start (if needed)
        if (lastEndTime < tourStartTime) {
          const gap = this.timeDifferenceMinutes(lastEndTime, tourStartTime);
          if (gap > 0) {
            segments.push({
              type: "drive",
              startTime: lastEndTime,
              endTime: tourStartTime,
              durationMinutes: gap,
              confidence: "optimal",
            });
            totalDriveMinutes += gap;
            lastEndTime = tourStartTime;
          }
        }

        // Add tour segment
        const guideBookings = runPickups
          .map((pickup) => pickup.bookingId)
          .map((id) => bookingById.get(id)?.booking)
          .filter(Boolean) as BookingWithCustomer[];

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
          bookingIds: guideBookings.map((b) => b.id),
          guestCount: guideBookings.reduce((sum, b) => sum + (b.totalParticipants ?? 0), 0),
          confidence: this.calculateConfidence(run, guideAssignment),
        });

        lastSegmentWasWork = true;
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

    const outsourcedTimelines = await this.buildOutsourcedTimelinesForDate(dateKey, tourRuns, bookingById);
    timelines.push(...outsourcedTimelines);

    return timelines;
  }

  // ===========================================================================
  // OPTIMIZATION
  // ===========================================================================

  /**
   * Run optimization algorithm for a date
   * Assigns guides to tour runs optimally
   */
  async optimize(date: Date | string): Promise<OptimizationResult> {
    await this.assertNotDispatched(date, "Optimization");
    const dateKey = this.formatDateKey(date);
    const baseDate = this.parseDateKey(dateKey);

    const [tourRuns, availableGuides, travelMatrix] = await Promise.all([
      this.getTourRuns(date),
      this.getAvailableGuides(date),
      buildTravelMatrix(this.organizationId),
    ]);

    const bookingIds = tourRuns.flatMap((run) => run.bookings.map((booking) => booking.id));
    const existingAssignments = bookingIds.length > 0
      ? await this.db.query.guideAssignments.findMany({
          columns: {
            bookingId: true,
          },
          where: and(
            eq(guideAssignments.organizationId, this.organizationId),
            inArray(guideAssignments.bookingId, bookingIds),
            eq(guideAssignments.status, "confirmed")
          ),
        })
      : [];

    const assignedBookingIds = new Set(existingAssignments.map((assignment) => assignment.bookingId));

    const tourRunInputs = tourRuns
      .map((run) => {
        const unassignedBookings = run.bookings.filter((booking) => !assignedBookingIds.has(booking.id));
        if (unassignedBookings.length === 0) {
          return null;
        }

        const totalGuests = unassignedBookings.reduce((sum, booking) => sum + booking.totalParticipants, 0);
        const guestsPerGuide = run.tour.guestsPerGuide ?? 6;
        const guidesNeeded = totalGuests > 0 ? Math.ceil(totalGuests / guestsPerGuide) : 0;

        if (guidesNeeded === 0) {
          return null;
        }

        const pickupZoneCounts = new Map<string, number>();
        for (const booking of unassignedBookings) {
          if (!booking.pickupZoneId) continue;
          pickupZoneCounts.set(
            booking.pickupZoneId,
            (pickupZoneCounts.get(booking.pickupZoneId) ?? 0) + 1
          );
        }

        let primaryPickupZone: string | undefined;
        let maxCount = 0;
        for (const [zoneId, count] of pickupZoneCounts) {
          if (count > maxCount) {
            maxCount = count;
            primaryPickupZone = zoneId;
          }
        }

        return {
          tourId: run.tourId,
          tourName: run.tour.name,
          date: baseDate,
          time: run.time,
          durationMinutes: run.tour.durationMinutes,
          guestsPerGuide,
          totalGuests,
          guidesNeeded,
          primaryPickupZone,
          bookings: unassignedBookings.map((booking) => ({
            id: booking.id,
            referenceNumber: booking.referenceNumber,
            participantCount: booking.totalParticipants,
            pickupZoneId: booking.pickupZoneId ?? undefined,
            pickupLocation: booking.pickupLocation ?? undefined,
            customerName: booking.customerName,
            specialRequests: booking.specialRequests ?? undefined,
            isPrivate: booking.experienceMode ? booking.experienceMode !== "join" : undefined,
          })),
        };
      })
      .filter((run): run is NonNullable<typeof run> => run !== null);

    if (tourRunInputs.length === 0) {
      await this.applyDispatchStatusUpdate(date, {
        status: "ready",
        optimizedAt: new Date(),
        efficiencyScore: "100",
        totalDriveMinutes: 0,
        warnings: [],
        unresolvedWarnings: 0,
      });

      return {
        assignments: [],
        warnings: [],
        efficiency: 100,
        totalDriveMinutes: 0,
      };
    }

    const guideScheduleEntries = new Map<string, Array<{
      id: string;
      startsAt: Date;
      endsAt: Date;
      endZoneId?: string;
    }>>();

    const buildDateTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      const result = new Date(baseDate);
      result.setHours(hours || 0, minutes || 0, 0, 0);
      return result;
    };

    for (const run of tourRuns) {
      const runStart = buildDateTime(run.time);
      const runEnd = new Date(runStart.getTime() + (run.tour.durationMinutes || 60) * 60 * 1000);

      for (const guide of run.assignedGuides) {
        if (!guide.guideId) continue;
        if (!guideScheduleEntries.has(guide.guideId)) {
          guideScheduleEntries.set(guide.guideId, []);
        }
        guideScheduleEntries.get(guide.guideId)!.push({
          id: run.key,
          startsAt: runStart,
          endsAt: runEnd,
        });
      }
    }

    const availableGuideInputs = availableGuides.map((guide) => ({
      id: guide.guide.id,
      name: `${guide.guide.firstName} ${guide.guide.lastName}`.trim(),
      vehicleCapacity: guide.vehicleCapacity,
      baseZoneId: guide.baseZone ?? undefined,
      languages: guide.guide.languages ?? [],
      qualifiedTourIds: guide.qualifiedTours,
      primaryTourIds: [],
      availableFrom: buildDateTime(guide.availableFrom),
      availableTo: buildDateTime(guide.availableTo),
      currentAssignments: guideScheduleEntries.get(guide.guide.id) ?? [],
    }));

    const optimizationResult = await optimizeDispatch({
      date: baseDate,
      tourRuns: tourRunInputs,
      availableGuides: availableGuideInputs,
      travelMatrix,
      organizationId: this.organizationId,
    });

    const warnings = this.mapOptimizationWarnings(optimizationResult.warnings);
    const assignments: OptimizedAssignment[] = [];

    for (const proposed of optimizationResult.assignments) {
      if (assignedBookingIds.has(proposed.bookingId)) {
        continue;
      }

      try {
        const assignment = await this.guideAssignmentService.assignGuideToBooking(
          proposed.bookingId,
          proposed.guideId,
          { autoConfirm: true }
        );

        await this.db
          .update(guideAssignments)
          .set({
            pickupOrder: proposed.pickupOrder,
            calculatedPickupTime: proposed.calculatedPickupTime,
            driveTimeMinutes: proposed.driveTimeMinutes,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(guideAssignments.id, assignment.id),
              eq(guideAssignments.organizationId, this.organizationId)
            )
          );

        assignments.push({
          bookingId: proposed.bookingId,
          guideId: proposed.guideId,
          pickupOrder: proposed.pickupOrder,
          calculatedPickupTime: proposed.calculatedPickupTime,
          driveTimeMinutes: proposed.driveTimeMinutes,
        });
      } catch {
        // Assignment might already exist, skip
      }
    }

    // Ensure pickup assignments (and guide assignment pickup fields) are synced
    await this.pickupAssignmentService.syncForDate(date);

    if (assignments.length > 0) {
      const pickupSummaries = await this.pickupAssignmentService.getForDate(date);
      const pickupByBooking = new Map(pickupSummaries.map((pickup) => [pickup.bookingId, pickup]));

      for (const assignment of assignments) {
        const pickup = pickupByBooking.get(assignment.bookingId);
        if (!pickup) continue;

        assignment.pickupOrder = pickup.pickupOrder;
        if (pickup.pickupTime) {
          assignment.calculatedPickupTime = pickup.pickupTime;
        }
        if (pickup.driveTimeMinutes !== null) {
          assignment.driveTimeMinutes = pickup.driveTimeMinutes;
        }
      }
    }

    const efficiency = optimizationResult.efficiency;
    const totalDriveMinutes = optimizationResult.totalDriveMinutes;

    // Update dispatch status
    await this.applyDispatchStatusUpdate(date, {
      status: warnings.length > 0 ? "optimized" : "ready",
      optimizedAt: new Date(),
      efficiencyScore: efficiency.toString(),
      totalDriveMinutes,
      warnings,
      unresolvedWarnings: warnings.length,
    });

    return {
      assignments,
      warnings,
      efficiency,
      totalDriveMinutes,
    };
  }

  private mapOptimizationWarnings(warnings: OptimizationWarning[]): Warning[] {
    return warnings.map((warning) => ({
      id: warning.id,
      type: this.mapOptimizationWarningType(warning.type),
      tourRunKey: warning.tourRunId,
      bookingId: warning.bookingId,
      message: warning.message,
      resolutions: this.mapOptimizationResolutions(warning),
      resolved: false,
    }));
  }

  private mapOptimizationWarningType(type: OptimizationWarning["type"]): WarningType {
    switch (type) {
      case "insufficient_guides":
        return "insufficient_guides";
      case "no_qualified_guide":
        return "no_qualified_guide";
      case "vehicle_capacity_exceeded":
        return "capacity_exceeded";
      case "time_conflict":
        return "conflict";
      case "unassigned_booking":
        return "no_available_guide";
      case "long_drive_time":
      case "suboptimal_assignment":
      default:
        return "conflict";
    }
  }

  private mapOptimizationResolutions(warning: OptimizationWarning): WarningResolution[] {
    if (!warning.suggestedResolutions || warning.suggestedResolutions.length === 0) {
      return [];
    }

    const resolutions: WarningResolution[] = [];

    for (const suggestion of warning.suggestedResolutions) {
      if (suggestion.type === "assign_to_guide" && suggestion.guideId) {
        resolutions.push({
          id: suggestion.id,
          label: suggestion.label,
          action: "assign_guide",
          guideId: suggestion.guideId,
          impactMinutes: suggestion.additionalDriveMinutes,
          tourRunKey: warning.tourRunId,
          bookingId: warning.bookingId,
        });
        continue;
      }

      if (suggestion.type === "add_external_guide") {
        resolutions.push({
          id: suggestion.id,
          label: suggestion.label,
          action: "add_external",
          tourRunKey: warning.tourRunId,
          bookingId: warning.bookingId,
        });
      }
    }

    return resolutions;
  }

  // ===========================================================================
  // WARNING RESOLUTION
  // ===========================================================================

  private async resolveWarningDate(resolution: WarningResolution): Promise<string | null> {
    if (resolution.bookingId) {
      const booking = await this.db.query.bookings.findFirst({
        columns: {
          bookingDate: true,
        },
        where: and(
          eq(bookings.id, resolution.bookingId),
          eq(bookings.organizationId, this.organizationId)
        ),
      });

      if (booking?.bookingDate) {
        return this.formatDateKey(booking.bookingDate);
      }
    }

    if (resolution.tourRunKey) {
      const parsed = parseTourRunKey(resolution.tourRunKey);
      if (parsed?.date) {
        return parsed.date;
      }
    }

    return null;
  }

  private async assertNotDispatchedForResolution(
    resolution: WarningResolution
  ): Promise<string | null> {
    const dateKey = await this.resolveWarningDate(resolution);
    if (dateKey) {
      await this.assertNotDispatched(dateKey, "Warning resolution");
    }
    return dateKey;
  }

  private async markWarningResolved(
    date: Date | string,
    warningId: string,
    resolution: WarningResolution
  ): Promise<void> {
    const existing = await this.getDispatchStatusRecord(date);
    if (!existing?.warnings || existing.warnings.length === 0) {
      return;
    }

    const nowIso = new Date().toISOString();
    const warnings = (existing.warnings as Warning[]).map((warning) => {
      if (warning.id !== warningId) return warning;
      if (warning.resolved) return warning;

      return {
        ...warning,
        resolved: true,
        resolvedAt: warning.resolvedAt ?? nowIso,
        resolution: warning.resolution ?? resolution.action,
      };
    });

    await this.applyDispatchStatusUpdate(date, {
      warnings,
      unresolvedWarnings: this.countUnresolvedWarnings(warnings),
    });
  }

  /**
   * Resolve a warning by applying a resolution
   *
   * @param warningId - The ID of the warning being resolved (for logging/tracking)
   * @param resolution - The resolution to apply, must include necessary context (bookingId, tourRunKey, etc.)
   */
  async resolveWarning(warningId: string, resolution: WarningResolution): Promise<void> {
    const warningDate = await this.assertNotDispatchedForResolution(resolution);
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

      case "acknowledge":
        this.logger.info(`Warning ${warningId} acknowledged without automated action.`);
        break;

      default:
        throw new ValidationError(`Unknown resolution action: ${resolution.action}`);
    }

    if (warningDate) {
      await this.markWarningResolved(warningDate, warningId, resolution);
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
        await this.refreshDispatchStatus(booking.bookingDate);
      }

      this.logger.info(`Resolved warning ${warningId}: assigned guide ${resolution.guideId} to booking ${resolution.bookingId}`);
      return;
    }

    // If tourRunKey is provided, assign to all bookings in that tour run
    if (resolution.tourRunKey) {
      const { tourId, date: dateStr, time } = parseTourRunKey(resolution.tourRunKey);

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

      // Refresh dispatch status for the date
      const date = new Date(dateStr);
      await this.refreshDispatchStatus(date);

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
      const result = await this.addOutsourcedGuideToRun({
        date: this.parseDateKey(parseTourRunKey(resolution.tourRunKey).date),
        tourRunKey: resolution.tourRunKey,
        externalGuideName: resolution.externalGuideName,
        externalGuideContact: resolution.externalGuideContact,
      });

      this.logger.info(
        `Resolved warning ${warningId}: added external guide "${resolution.externalGuideName}" to ${result.assignedCount} bookings`
      );
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

    // Refresh dispatch status
    const date = new Date(dateStr);
    await this.refreshDispatchStatus(date);

    this.logger.warn(
      `Resolved warning ${warningId}: CANCELLED tour run ${resolution.tourRunKey} ` +
      `affecting ${tourRunBookings.length} bookings. IDs: ${bookingIds.join(", ")}`
    );

    // Note: Router should emit 'tour_run.cancelled' event for notifications/refunds
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

    // Refresh dispatch status
    if (booking.bookingDate) {
      await this.refreshDispatchStatus(booking.bookingDate);
    }

    // Note: Full split functionality (creating separate bookings) not yet implemented
    this.logger.warn(`Split booking for ${bookingId}: guide assignments updated, full split not implemented`);
  }

  // ===========================================================================
  // DISPATCH CHANGES
  // ===========================================================================

  async addOutsourcedGuideToRun(input: {
    date: Date | string;
    tourRunKey: string;
    externalGuideName: string;
    externalGuideContact?: string;
  }): Promise<AddOutsourcedGuideToRunResult> {
    await this.assertNotDispatched(input.date, "Add outsourced guide");

    const trimmedName = input.externalGuideName.trim();
    if (!trimmedName) {
      throw new ValidationError("External guide name is required");
    }

    const { tourId, date: dateStr, time } = parseTourRunKey(input.tourRunKey);
    const effectiveDate = this.parseDateKey(dateStr);

    const tourRunBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        eq(bookings.tourId, tourId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        eq(bookings.bookingTime, time),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      columns: {
        id: true,
      },
    });

    if (tourRunBookings.length === 0) {
      throw new ValidationError(`No bookings found for tour run: ${input.tourRunKey}`);
    }

    const bookingIds = tourRunBookings.map((booking) => booking.id);
    const confirmedAssignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed"),
        inArray(guideAssignments.bookingId, bookingIds)
      ),
      columns: {
        bookingId: true,
      },
    });

    const assignedBookingIds = new Set(confirmedAssignments.map((assignment) => assignment.bookingId));
    const unassignedBookingIds = bookingIds.filter((bookingId) => !assignedBookingIds.has(bookingId));

    if (unassignedBookingIds.length === 0) {
      return {
        success: true,
        noop: true,
        assignedCount: 0,
        message: "No unassigned bookings in this run. Outsourced guide was not added.",
      };
    }

    let assignedCount = 0;
    for (const bookingId of unassignedBookingIds) {
      try {
        await this.guideAssignmentService.assignOutsourcedGuideToBooking(
          {
            bookingId,
            outsourcedGuideName: trimmedName,
            outsourcedGuideContact: input.externalGuideContact,
            notes: `Added from timeline for ${input.tourRunKey}`,
          },
          { autoConfirm: true }
        );
        assignedCount++;
      } catch (error) {
        if (error instanceof ConflictError) {
          this.logger.debug({ bookingId, tourRunKey: input.tourRunKey }, "Outsourced guide assignment skipped due to conflict");
          continue;
        }
        throw error;
      }
    }

    await this.refreshDispatchStatus(effectiveDate);

    return {
      success: true,
      noop: assignedCount === 0,
      assignedCount,
      message:
        assignedCount === 0
          ? "No bookings were assigned. They may have been assigned concurrently."
          : `Added outsourced guide to ${assignedCount} booking${assignedCount === 1 ? "" : "s"}.`,
    };
  }

  async createTempGuideForDate(input: {
    date: Date | string;
    name: string;
    phone: string;
    vehicleCapacity: number;
  }): Promise<CreateTempGuideForDateResult> {
    await this.assertNotDispatched(input.date, "Create temporary guide");

    const trimmedName = input.name.trim();
    const trimmedPhone = input.phone.trim();
    if (!trimmedName) {
      throw new ValidationError("Guide name is required");
    }
    if (!trimmedPhone) {
      throw new ValidationError("Guide phone is required");
    }
    if (!Number.isInteger(input.vehicleCapacity) || input.vehicleCapacity < 1 || input.vehicleCapacity > 99) {
      throw new ValidationError("Vehicle capacity must be between 1 and 99");
    }

    const [firstNameRaw = "", ...lastNameParts] = trimmedName.split(/\s+/);
    const firstName = firstNameRaw.trim() || "Temp";
    const lastName = lastNameParts.join(" ").trim() || "Guide";

    const dateKey = this.formatDateKey(input.date);
    const overrideDateUtc = new Date(`${dateKey}T12:00:00.000Z`);
    const dateSuffix = dateKey.replace(/-/g, "");
    const slug = this.slugify(trimmedName) || "temp-guide";
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const email = `${slug}.${dateSuffix}.${uniqueSuffix}@temp-outsourced.local`;

    const guide = await this.db.transaction(async (tx) => {
      const [createdGuide] = await tx
        .insert(guides)
        .values({
          organizationId: this.organizationId,
          firstName,
          lastName,
          email,
          phone: trimmedPhone,
          status: "active",
          isPublic: false,
          notes: `Temporary outsourced guide for ${dateKey}`,
          vehicleCapacity: input.vehicleCapacity,
        })
        .returning({
          id: guides.id,
          firstName: guides.firstName,
          lastName: guides.lastName,
        });

      if (!createdGuide) {
        throw new ValidationError("Failed to create temporary guide");
      }

      await tx.insert(guideAvailabilityOverrides).values({
        organizationId: this.organizationId,
        guideId: createdGuide.id,
        date: overrideDateUtc,
        isAvailable: true,
        startTime: "06:00",
        endTime: "24:00",
        reason: `Temporary outsourced guide for ${dateKey}`,
      });

      return createdGuide;
    });

    return {
      success: true,
      guideId: guide.id,
      guideName: `${guide.firstName} ${guide.lastName}`.trim(),
    };
  }

  async batchApplyChanges(date: Date | string, changes: DispatchBatchChange[]): Promise<DispatchBatchApplyResult> {
    await this.assertNotDispatched(date, "Batch apply changes");

    if (changes.length === 0) {
      return {
        success: true,
        applied: 0,
        results: [],
      };
    }

    const dateKey = this.formatDateKey(date);
    const changedBookingIds = new Set<string>();
    const involvedGuideIds = new Set<string>();

    for (const change of changes) {
      if (change.type === "assign") {
        changedBookingIds.add(change.bookingId);
        involvedGuideIds.add(change.toGuideId);
        continue;
      }
      for (const bookingId of change.bookingIds) {
        changedBookingIds.add(bookingId);
      }
      if (change.type === "unassign") {
      } else if (change.type === "reassign") {
        involvedGuideIds.add(change.toGuideId);
      } else if (change.type === "time-shift") {
        involvedGuideIds.add(change.guideId);
      }
    }

    const bookingIdList = [...changedBookingIds];
    const bookingRows = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        inArray(bookings.id, bookingIdList)
      ),
    });

    if (bookingRows.length !== bookingIdList.length) {
      const foundIds = new Set(bookingRows.map((booking) => booking.id));
      const missingIds = bookingIdList.filter((bookingId) => !foundIds.has(bookingId));
      const sampleMissing = missingIds.slice(0, 5).join(", ");
      const suffix = missingIds.length > 5 ? " ..." : "";
      throw new ValidationError(`Some bookings were not found for batch apply: ${sampleMissing}${suffix}`);
    }

    const tourDurationById = new Map<string, number>();
    const loadTourDurations = async (tourIds: string[]) => {
      const uniqueMissing = [...new Set(tourIds.filter((tourId) => Boolean(tourId) && !tourDurationById.has(tourId)))];
      if (uniqueMissing.length === 0) return;
      const tourRows = await this.db.query.tours.findMany({
        where: and(
          eq(tours.organizationId, this.organizationId),
          inArray(tours.id, uniqueMissing)
        ),
        columns: {
          id: true,
          durationMinutes: true,
        },
      });
      for (const tour of tourRows) {
        tourDurationById.set(tour.id, tour.durationMinutes ?? 60);
      }
    };

    await loadTourDurations(bookingRows.map((booking) => booking.tourId).filter((tourId): tourId is string => Boolean(tourId)));

    const working = new Map<
      string,
      {
        bookingId: string;
        tourId: string;
        bookingDate: Date;
        bookingDateKey: string;
        bookingTime: string;
        durationMinutes: number;
        guestCount: number;
        experienceMode: BookingWithCustomer["experienceMode"];
        assignedGuideId: string | null;
      }
    >();

    for (const booking of bookingRows) {
      if (!booking.tourId || !booking.bookingDate || !booking.bookingTime) {
        throw new ValidationError(`Booking ${booking.id} is missing tour/date/time`);
      }
      const bookingDateKey = this.formatDateKey(booking.bookingDate);
      if (bookingDateKey !== dateKey) {
        throw new ValidationError(`Booking ${booking.id} does not belong to ${dateKey}`);
      }

      working.set(booking.id, {
        bookingId: booking.id,
        tourId: booking.tourId,
        bookingDate: booking.bookingDate,
        bookingDateKey,
        bookingTime: booking.bookingTime,
        durationMinutes: tourDurationById.get(booking.tourId) ?? 60,
        guestCount: booking.totalParticipants ?? 0,
        experienceMode: this.extractExperienceMode(booking.pricingSnapshot),
        assignedGuideId: null,
      });
    }

    const confirmedChangedAssignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed"),
        inArray(guideAssignments.bookingId, bookingIdList)
      ),
      columns: {
        bookingId: true,
        guideId: true,
        assignedAt: true,
      },
      orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
    });

    const assignedGuideByBooking = new Map<string, string>();
    for (const assignment of confirmedChangedAssignments) {
      if (!assignment.guideId) continue;
      if (assignedGuideByBooking.has(assignment.bookingId)) continue;
      assignedGuideByBooking.set(assignment.bookingId, assignment.guideId);
    }

    for (const [bookingId, guideId] of assignedGuideByBooking.entries()) {
      const target = working.get(bookingId);
      if (!target) continue;
      target.assignedGuideId = guideId;
      involvedGuideIds.add(guideId);
    }

    for (const change of changes) {
      if (change.type === "assign") {
        const state = working.get(change.bookingId);
        if (!state) throw new ValidationError(`Booking ${change.bookingId} not found in working set`);
        state.assignedGuideId = change.toGuideId;
        continue;
      }

      if (change.type === "unassign") {
        for (const bookingId of change.bookingIds) {
          const state = working.get(bookingId);
          if (!state) throw new ValidationError(`Booking ${bookingId} not found in working set`);
          state.assignedGuideId = null;
        }
        continue;
      }

      if (change.type === "reassign") {
        for (const bookingId of change.bookingIds) {
          const state = working.get(bookingId);
          if (!state) throw new ValidationError(`Booking ${bookingId} not found in working set`);
          state.assignedGuideId = change.toGuideId;
        }
        continue;
      }

      if (!this.isValidCommandCenterTime(change.newStartTime)) {
        throw new ValidationError(`Invalid time-shift value: ${change.newStartTime}`);
      }

      for (const bookingId of change.bookingIds) {
        const state = working.get(bookingId);
        if (!state) throw new ValidationError(`Booking ${bookingId} not found in working set`);
        state.bookingTime = change.newStartTime;
      }
    }

    const guideIdList = [...involvedGuideIds];
    const guideRows = guideIdList.length > 0
      ? await this.db.query.guides.findMany({
          where: and(
            eq(guides.organizationId, this.organizationId),
            inArray(guides.id, guideIdList)
          ),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            vehicleCapacity: true,
          },
        })
      : [];

    const guideById = new Map(guideRows.map((guide) => [guide.id, guide]));
    const missingGuides = guideIdList.filter((guideId) => !guideById.has(guideId));
    if (missingGuides.length > 0) {
      throw new ValidationError(`Guide not found: ${missingGuides.join(", ")}`);
    }

    const existingGuideAssignments = guideIdList.length > 0
      ? await this.db.query.guideAssignments.findMany({
          where: and(
            eq(guideAssignments.organizationId, this.organizationId),
            eq(guideAssignments.status, "confirmed"),
            inArray(guideAssignments.guideId, guideIdList)
          ),
          with: {
            booking: true,
          },
        })
      : [];

    await loadTourDurations(
      existingGuideAssignments
        .map((assignment) => assignment.booking?.tourId)
        .filter((tourId): tourId is string => Boolean(tourId))
    );

    type ValidationEntry = {
      bookingId: string;
      runKey: string;
      slotKey: string;
      startMinutes: number;
      endMinutes: number;
      guestCount: number;
      isCharter: boolean;
    };

    const entriesByGuide = new Map<string, ValidationEntry[]>();
    const pushEntry = (guideId: string, entry: ValidationEntry) => {
      if (!entriesByGuide.has(guideId)) {
        entriesByGuide.set(guideId, []);
      }
      entriesByGuide.get(guideId)!.push(entry);
    };

    for (const assignment of existingGuideAssignments) {
      const guideId = assignment.guideId;
      const booking = assignment.booking;
      if (!guideId || !booking || !booking.tourId || !booking.bookingDate || !booking.bookingTime) continue;
      if (changedBookingIds.has(booking.id)) continue;
      if (this.formatDateKey(booking.bookingDate) !== dateKey) continue;

      const durationMinutes = tourDurationById.get(booking.tourId) ?? 60;
      const startMinutes = this.parseTimeToMinutes(booking.bookingTime);
      const endMinutes = startMinutes + durationMinutes;
      pushEntry(guideId, {
        bookingId: booking.id,
        runKey: createTourRunKey(booking.tourId, dateKey, booking.bookingTime),
        slotKey: `${dateKey}|${booking.bookingTime}`,
        startMinutes,
        endMinutes,
        guestCount: booking.totalParticipants ?? 0,
        isCharter: this.extractExperienceMode(booking.pricingSnapshot) === "charter",
      });
    }

    for (const state of working.values()) {
      if (!state.assignedGuideId) continue;
      const startMinutes = this.parseTimeToMinutes(state.bookingTime);
      const endMinutes = startMinutes + state.durationMinutes;
      if (endMinutes > 24 * 60) {
        throw new ValidationError(`time_conflict: ${state.bookingId} exceeds end-of-day bounds`);
      }

      pushEntry(state.assignedGuideId, {
        bookingId: state.bookingId,
        runKey: createTourRunKey(state.tourId, state.bookingDateKey, state.bookingTime),
        slotKey: `${state.bookingDateKey}|${state.bookingTime}`,
        startMinutes,
        endMinutes,
        guestCount: state.guestCount,
        isCharter: state.experienceMode === "charter",
      });
    }

    for (const [guideId, entries] of entriesByGuide.entries()) {
      const guide = guideById.get(guideId);
      if (!guide) continue;
      const guideCapacity = Math.max(guide.vehicleCapacity ?? 6, 1);

      const runs = new Map<string, ValidationEntry[]>();
      for (const entry of entries) {
        if (!runs.has(entry.runKey)) runs.set(entry.runKey, []);
        runs.get(entry.runKey)!.push(entry);
      }

      for (const [runKey, runEntries] of runs.entries()) {
        const runGuests = runEntries.reduce((sum, entry) => sum + entry.guestCount, 0);
        if (runGuests > guideCapacity) {
          this.logger.warn(
            { reason: "capacity_exceeded", guideId, runKey, runGuests, vehicleCapacity: guideCapacity },
            "Dispatch change rejected"
          );
          throw new ValidationError(
            `capacity_exceeded: ${guide.firstName} ${guide.lastName} would exceed capacity (${runGuests}/${guideCapacity})`
          );
        }

        if (runEntries.some((entry) => entry.isCharter) && runEntries.length > 1) {
          this.logger.warn(
            { reason: "charter_exclusive", guideId, runKey },
            "Dispatch change rejected"
          );
          throw new ValidationError(
            `charter_exclusive: ${guide.firstName} ${guide.lastName} cannot stack charter bookings in the same slot`
          );
        }
      }

      const slots = new Map<string, ValidationEntry[]>();
      for (const entry of entries) {
        if (!slots.has(entry.slotKey)) slots.set(entry.slotKey, []);
        slots.get(entry.slotKey)!.push(entry);
      }

      for (const [slotKey, slotEntries] of slots.entries()) {
        if (slotEntries.some((entry) => entry.isCharter) && slotEntries.length > 1) {
          this.logger.warn(
            { reason: "charter_exclusive", guideId, slotKey },
            "Dispatch change rejected"
          );
          throw new ValidationError(
            `charter_exclusive: ${guide.firstName} ${guide.lastName} cannot share slot ${slotKey.split("|")[1]} with a charter booking`
          );
        }
      }

      const sorted = [...entries].sort((a, b) => a.startMinutes - b.startMinutes);
      for (let i = 0; i < sorted.length; i += 1) {
        const current = sorted[i];
        if (!current) continue;
        for (let j = i + 1; j < sorted.length; j += 1) {
          const next = sorted[j];
          if (!next) continue;
          if (current.runKey === next.runKey) continue;
          if (current.startMinutes < next.endMinutes && current.endMinutes > next.startMinutes) {
            this.logger.warn(
              { reason: "time_conflict", guideId, bookingId: current.bookingId, conflictingBookingId: next.bookingId },
              "Dispatch change rejected"
            );
            throw new ValidationError(
              `time_conflict: ${guide.firstName} ${guide.lastName} has overlapping runs`
            );
          }
        }
      }
    }

    const now = new Date();
    const results: DispatchBatchApplyResult["results"] = [];

    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        if (change.type === "assign") {
          await tx
            .delete(guideAssignments)
            .where(
              and(
                eq(guideAssignments.organizationId, this.organizationId),
                eq(guideAssignments.bookingId, change.bookingId),
                eq(guideAssignments.status, "confirmed")
              )
            );

          await tx.insert(guideAssignments).values({
            organizationId: this.organizationId,
            bookingId: change.bookingId,
            guideId: change.toGuideId,
            outsourcedGuideName: null,
            outsourcedGuideContact: null,
            status: "confirmed",
            assignedAt: now,
            confirmedAt: now,
            updatedAt: now,
          });

          results.push({
            type: "assign",
            bookingIds: [change.bookingId],
            success: true,
          });
          continue;
        }

        if (change.type === "unassign") {
          if (change.bookingIds.length > 0) {
            await tx
              .delete(guideAssignments)
              .where(
                and(
                  eq(guideAssignments.organizationId, this.organizationId),
                  eq(guideAssignments.status, "confirmed"),
                  inArray(guideAssignments.bookingId, change.bookingIds)
                )
              );
          }

          results.push({
            type: "unassign",
            bookingIds: change.bookingIds,
            success: true,
          });
          continue;
        }

        if (change.type === "reassign") {
          for (const bookingId of change.bookingIds) {
            await tx
              .delete(guideAssignments)
              .where(
                and(
                  eq(guideAssignments.organizationId, this.organizationId),
                  eq(guideAssignments.bookingId, bookingId),
                  eq(guideAssignments.status, "confirmed")
                )
              );

            await tx.insert(guideAssignments).values({
              organizationId: this.organizationId,
              bookingId,
              guideId: change.toGuideId,
              outsourcedGuideName: null,
              outsourcedGuideContact: null,
              status: "confirmed",
              assignedAt: now,
              confirmedAt: now,
              updatedAt: now,
            });
          }

          results.push({
            type: "reassign",
            bookingIds: change.bookingIds,
            success: true,
          });
          continue;
        }

        await tx
          .update(bookings)
          .set({
            bookingTime: change.newStartTime,
            pickupTime: change.newStartTime,
            updatedAt: now,
          })
          .where(
            and(
              eq(bookings.organizationId, this.organizationId),
              inArray(bookings.id, change.bookingIds)
            )
          );

        await tx
          .update(guideAssignments)
          .set({
            calculatedPickupTime: change.newStartTime,
            updatedAt: now,
          })
          .where(
            and(
              eq(guideAssignments.organizationId, this.organizationId),
              eq(guideAssignments.status, "confirmed"),
              eq(guideAssignments.guideId, change.guideId),
              inArray(guideAssignments.bookingId, change.bookingIds)
            )
          );

        results.push({
          type: "time-shift",
          bookingIds: change.bookingIds,
          success: true,
        });
      }
    });

    await this.refreshDispatchStatus(date);

    return {
      success: true,
      applied: results.length,
      results,
    };
  }

  // ===========================================================================
  // MANUAL ASSIGNMENT
  // ===========================================================================

  /**
   * Manually assign a booking to a guide
   */
  async manualAssign(bookingId: string, guideId: string): Promise<void> {
    // Verify booking exists and belongs to org (using shared validation helper)
    const booking = await requireEntity(
      () =>
        this.db.query.bookings.findFirst({
          where: and(
            eq(bookings.id, bookingId),
            eq(bookings.organizationId, this.organizationId)
          ),
        }),
      "Booking",
      bookingId
    );

    if (booking.bookingDate) {
      await this.assertNotDispatched(booking.bookingDate, "Manual assignment");
    }

    // Verify guide exists and belongs to org (using shared validation helper)
    await requireEntity(
      () =>
        this.db.query.guides.findFirst({
          where: and(
            eq(guides.id, guideId),
            eq(guides.organizationId, this.organizationId)
          ),
        }),
      "Guide",
      guideId
    );

    // Create assignment (auto-confirm for manual assignments)
    await this.guideAssignmentService.assignGuideToBooking(bookingId, guideId, {
      autoConfirm: true,
    });

    // Refresh dispatch status for the booking date
    if (booking.bookingDate) {
      await this.refreshDispatchStatus(booking.bookingDate);
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

    if (booking?.bookingDate) {
      await this.assertNotDispatched(booking.bookingDate, "Unassign");
    }

    // Cancel all confirmed assignments
    for (const assignment of assignments) {
      if (assignment.status === "confirmed") {
        await this.guideAssignmentService.cancelAssignment(assignment.id);
      }
    }

    // Refresh dispatch status
    if (booking?.bookingDate) {
      await this.refreshDispatchStatus(booking.bookingDate);
    }
  }

  /**
   * Update the calculated pickup time for a booking's guide assignment
   * Used for time-shift operations in adjust mode
   *
   * NOTE: This method is resilient - it will update the booking's pickup time
   * even if no guide assignment exists. The assignment update is optional.
   */
  async updatePickupTime(
    bookingId: string,
    guideId: string,
    newPickupTime: string
  ): Promise<void> {
    const booking = await this.db.query.bookings.findFirst({
      columns: {
        bookingDate: true,
      },
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    if (booking.bookingDate) {
      await this.assertNotDispatched(booking.bookingDate, "Time shift");
    }

    // Update both pickupTime and bookingTime on the booking
    // bookingTime determines the tour slot/visual position on timeline
    // pickupTime is the calculated time the guide picks up the guest
    const [updatedBooking] = await this.db
      .update(bookings)
      .set({
        bookingTime: newPickupTime, // Update tour slot time (visual position)
        pickupTime: newPickupTime,  // Update pickup time
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updatedBooking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Try to update the guide assignment if one exists
    const assignments = await this.guideAssignmentService.getAssignmentsForBooking(bookingId);
    const assignment = assignments.find(
      (a) => a.guideId === guideId && a.status === "confirmed"
    );

    if (assignment) {
      // Update the calculated pickup time on the assignment
      await this.db
        .update(guideAssignments)
        .set({
          calculatedPickupTime: newPickupTime,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(guideAssignments.id, assignment.id),
            eq(guideAssignments.organizationId, this.organizationId)
          )
        );
    } else {
      // Log but don't throw - booking was updated successfully
      this.logger.warn(
        { bookingId, guideId },
        "No confirmed guide assignment found for time-shift, booking updated anyway"
      );
    }

    // Refresh dispatch status
    if (updatedBooking.bookingDate) {
      await this.refreshDispatchStatus(updatedBooking.bookingDate);
    }
  }

  // ===========================================================================
  // DISPATCH
  // ===========================================================================

  /**
   * Dispatch: finalize and send notifications to all guides
   */
  async dispatch(date: Date | string): Promise<DispatchResult> {
    const dateStr = this.formatDateKey(date);
    this.logger.info({ date: dateStr }, "Starting dispatch process");

    const status = await this.getDispatchStatus(date);

    // Check if ready to dispatch
    if (status.unresolvedWarnings > 0) {
      this.logger.warn(
        { date: dateStr, unresolvedWarnings: status.unresolvedWarnings },
        "Dispatch failed: unresolved warnings"
      );
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

    // Mark as dispatched - router emits 'dispatch.completed' event for notifications

    const dispatchedAt = new Date();

    // Update dispatch status
    await this.applyDispatchStatusUpdate(date, {
      status: "dispatched",
      dispatchedAt,
      dispatchedBy: this.userId ?? null,
    });

    this.logger.info(
      {
        date: dateStr,
        tourRunCount: tourRuns.length,
        guideCount: guideIds.size,
        totalGuests: status.totalGuests,
        dispatchedAt: dispatchedAt.toISOString(),
      },
      "Dispatch completed successfully"
    );

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
        pickupZone: true,
      },
    });

    if (!bookingRaw) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Validate that relations are loaded, then cast to internal type
    validateBookingWithRelations(bookingRaw, "CommandCenterService.getGuestDetails");
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
        total: booking.total ? String(booking.total) : null,
        currency: booking.currency ?? null,
        pickupZoneId: booking.pickupZoneId ?? null,
        pickupZone: booking.pickupZone
          ? {
              id: booking.pickupZone.id,
              name: booking.pickupZone.name,
              color: booking.pickupZone.color || "#6B7280",
            }
          : null,
        pickupLocation: booking.pickupLocation ?? null,
        pickupTime: booking.pickupTime ?? null,
        specialOccasion: null,
        isFirstTime,
        experienceMode: (booking.pricingSnapshot as { experienceMode?: "join" | "book" | "charter" } | null)?.experienceMode ?? null,
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
   * Uses shared formatDateForKey from tour-run-utils.ts
   */
  private formatDateKey(date: Date | string): string {
    return formatDateForKey(date);
  }

  /**
   * Parse YYYY-MM-DD into a local Date (midnight).
   */
  private parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year || 0, (month || 1) - 1, day || 1);
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

  private parseTimeToMinutes(time: string): number {
    const [hourRaw, minuteRaw] = time.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new ValidationError(`Invalid time format: ${time}`);
    }
    return hour * 60 + minute;
  }

  private isValidCommandCenterTime(time: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(time)) return false;
    const [hourRaw, minuteRaw] = time.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
    if (hour < 0 || hour > 24) return false;
    if (minute < 0 || minute > 59) return false;
    if (hour === 24 && minute !== 0) return false;
    return true;
  }

  private extractExperienceMode(
    pricingSnapshot: unknown
  ): BookingWithCustomer["experienceMode"] {
    const mode = (pricingSnapshot as { experienceMode?: unknown } | null)?.experienceMode;
    if (mode === "join" || mode === "book" || mode === "charter") {
      return mode;
    }
    return null;
  }

  private async buildOutsourcedTimelinesForDate(
    dateKey: string,
    tourRuns: TourRun[],
    bookingById: Map<
      string,
      {
        booking: BookingWithCustomer;
        runKey: string;
        startTime: string;
      }
    >
  ): Promise<GuideTimeline[]> {
    const assignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed"),
        sql`${guideAssignments.outsourcedGuideName} IS NOT NULL`
      ),
      with: {
        booking: {
          with: {
            tour: true,
          },
        },
      },
    });

    const runByKey = new Map(tourRuns.map((run) => [run.key, run]));
    const grouped = new Map<
      string,
      {
        name: string;
        contact: string | null;
        bookingIds: Set<string>;
      }
    >();

    for (const assignment of assignments) {
      const booking = assignment.booking;
      const name = assignment.outsourcedGuideName?.trim();
      if (!name || !booking || !booking.tourId || !booking.bookingDate || !booking.bookingTime) continue;
      if (this.formatDateKey(booking.bookingDate) !== dateKey) continue;

      const key = `${name}::${assignment.outsourcedGuideContact ?? ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          name,
          contact: assignment.outsourcedGuideContact ?? null,
          bookingIds: new Set<string>(),
        });
      }
      grouped.get(key)!.bookingIds.add(booking.id);
    }

    const timelines: GuideTimeline[] = [];
    for (const [groupKey, group] of grouped.entries()) {
      const bookingRefs = [...group.bookingIds]
        .map((bookingId) => bookingById.get(bookingId))
        .filter(
          (
            booking
          ): booking is {
            booking: BookingWithCustomer;
            runKey: string;
            startTime: string;
          } => Boolean(booking)
        );

      if (bookingRefs.length === 0) continue;

      const bookingsByRun = new Map<string, { startTime: string; bookings: BookingWithCustomer[] }>();
      for (const ref of bookingRefs) {
        if (!bookingsByRun.has(ref.runKey)) {
          bookingsByRun.set(ref.runKey, {
            startTime: ref.startTime,
            bookings: [],
          });
        }
        bookingsByRun.get(ref.runKey)!.bookings.push(ref.booking);
      }

      const segments: TimelineSegment[] = [];
      let totalGuests = 0;
      for (const [runKey, runGroup] of bookingsByRun.entries()) {
        const run = runByKey.get(runKey);
        const runBookings = runGroup.bookings;
        const firstBooking = runBookings[0];
        if (!firstBooking) continue;

        const startTime = runGroup.startTime;
        const durationMinutes = run?.tour.durationMinutes ?? 60;
        const guestCount = runBookings.reduce((sum, booking) => sum + (booking.totalParticipants ?? 0), 0);
        totalGuests += guestCount;

        segments.push({
          type: "tour",
          startTime,
          endTime: this.addMinutesToTime(startTime, durationMinutes),
          durationMinutes,
          tour: run?.tour
            ? {
                id: run.tour.id,
                name: run.tour.name,
                slug: run.tour.slug,
              }
            : undefined,
          tourRunKey: runKey,
          bookingIds: runBookings.map((booking) => booking.id),
          guestCount,
          confidence: "good",
        });
      }

      segments.sort((a, b) => a.startTime.localeCompare(b.startTime));

      const [firstName, ...lastNameParts] = group.name.split(/\s+/);
      const contact = group.contact ?? "";
      const isEmail = contact.includes("@");
      const normalized = this.slugify(group.name) || "outsourced";

      timelines.push({
        guide: {
          id: `outsourced:${normalized}:${this.slugify(groupKey).slice(0, 8)}`,
          firstName: firstName || "Outsourced",
          lastName: lastNameParts.join(" ") || "Guide",
          email: isEmail ? contact : `${normalized}@outsourced.local`,
          phone: isEmail ? null : contact || null,
          avatarUrl: null,
        },
        vehicleCapacity: Math.max(totalGuests, 1),
        segments,
        totalDriveMinutes: 0,
        totalGuests,
        utilization: totalGuests > 0 ? 100 : 0,
      });
    }

    return timelines;
  }
}
