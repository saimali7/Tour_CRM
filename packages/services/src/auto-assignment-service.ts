import { eq, and, ne, asc, sql } from "drizzle-orm";
import {
  schedules,
  bookings,
  guides,
  pickupAssignments,
  pickupAddresses,
  guideAssignments,
  type Booking,
  type Guide,
  type PickupAddress,
  type NewPickupAssignment,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError } from "./types";
import {
  DailyOperationsService,
  type AvailableGuide,
  type UnassignedBooking,
  type TourAssignmentData,
} from "./daily-operations-service";

// ============================================================
// TYPES
// ============================================================

/**
 * Flag type for assignment issues
 */
export type AssignmentFlagType =
  | "no_capacity"
  | "no_qualified_guide"
  | "exceeds_vehicle"
  | "inefficient_route";

/**
 * Flag for assignment issues that need attention
 */
export interface AssignmentFlag {
  bookingId: string;
  type: AssignmentFlagType;
  message: string;
  suggestion?: string;
}

/**
 * Result of auto-assigning a single tour
 */
export interface AutoAssignResult {
  success: boolean;
  scheduleId: string;
  assigned: number;
  unassigned: number;
  flags: AssignmentFlag[];
  stats: {
    totalDriveMinutes: number;
    vehicleUtilization: number;  // 0-1
    guideBalance: number;        // 0-1 (1 = perfectly balanced)
  };
}

/**
 * Result of auto-assigning an entire day
 */
export interface DayAssignResult {
  date: Date;
  totalTours: number;
  fullyAssigned: number;
  needsAttention: number;
  results: AutoAssignResult[];
}

/**
 * Assignment suggestion for a booking
 */
export interface AssignmentSuggestion {
  guideId: string;
  guideName: string;
  score: number;  // 0-100
  reasons: string[];
  addedDriveMinutes: number;
  newCapacity: { current: number; max: number };
}

/**
 * Internal assignment structure
 */
interface InternalAssignment {
  bookingId: string;
  guideId: string;
  guideAssignmentId: string;
  passengerCount: number;
  pickupAddressId: string | null;
  zone: string | null;
  isPrivate: boolean;
}

// ============================================================
// SERVICE
// ============================================================

/**
 * AutoAssignmentService - Intelligent booking-to-guide assignment
 *
 * Implements zone-based clustering, capacity bin-packing, and
 * route optimization to automatically assign bookings to guides.
 *
 * @example
 * ```ts
 * const autoAssign = new AutoAssignmentService(ctx);
 * const result = await autoAssign.autoAssignTour(scheduleId);
 * const dayResult = await autoAssign.autoAssignDay(new Date());
 * ```
 */
export class AutoAssignmentService extends BaseService {
  private dailyOperations: DailyOperationsService;

  constructor(ctx: { organizationId: string; userId?: string }) {
    super(ctx);
    this.dailyOperations = new DailyOperationsService(ctx);
  }

  // ============================================================
  // AUTO-ASSIGNMENT
  // ============================================================

  /**
   * Auto-assign all unassigned bookings for a single tour
   *
   * Algorithm:
   * 1. Get tour assignment data (bookings, guides)
   * 2. Separate private vs shared bookings
   * 3. Assign private bookings first (1:1 to guide)
   * 4. Cluster shared bookings by zone
   * 5. Bin-pack bookings into available capacity
   * 6. Optimize pickup order per guide
   * 7. Calculate pickup times
   * 8. Save assignments
   *
   * @param scheduleId - The schedule to auto-assign
   * @returns Assignment result with stats and flags
   */
  async autoAssignTour(scheduleId: string): Promise<AutoAssignResult> {
    // Get tour assignment data
    const data = await this.dailyOperations.getTourAssignmentData(scheduleId);
    const { schedule, unassignedBookings, availableGuides, guideAssignments: existingAssignments } = data;

    // If no unassigned bookings, return success
    if (unassignedBookings.length === 0) {
      return {
        success: true,
        scheduleId,
        assigned: 0,
        unassigned: 0,
        flags: [],
        stats: {
          totalDriveMinutes: 0,
          vehicleUtilization: this.calculateUtilization(existingAssignments),
          guideBalance: 1,
        },
      };
    }

    // Filter out guides with conflicts
    const eligibleGuides = availableGuides.filter((g) => !g.hasConflict);

    if (eligibleGuides.length === 0) {
      return {
        success: false,
        scheduleId,
        assigned: 0,
        unassigned: unassignedBookings.length,
        flags: unassignedBookings.map((b) => ({
          bookingId: b.id,
          type: "no_qualified_guide" as const,
          message: "No qualified guides available for this tour",
        })),
        stats: {
          totalDriveMinutes: 0,
          vehicleUtilization: 0,
          guideBalance: 0,
        },
      };
    }

    const assignments: InternalAssignment[] = [];
    const flags: AssignmentFlag[] = [];

    // Track guide capacity
    const guideCapacity = new Map<string, number>();
    const guideAssignmentIds = new Map<string, string>();

    for (const guide of eligibleGuides) {
      guideCapacity.set(guide.id, guide.availableCapacity);
    }

    // Separate private vs shared bookings
    const privateBookings = unassignedBookings.filter((b) => b.isPrivate);
    const sharedBookings = unassignedBookings.filter((b) => !b.isPrivate);

    // Step 1: Assign private bookings first (need exclusive vehicle)
    for (const booking of privateBookings) {
      const guide = this.findGuideWithCapacity(
        eligibleGuides,
        guideCapacity,
        booking.passengerCount
      );

      if (guide) {
        // Get or create guide assignment
        let gaId = guideAssignmentIds.get(guide.id);
        if (!gaId) {
          gaId = await this.getOrCreateGuideAssignment(scheduleId, guide.id);
          guideAssignmentIds.set(guide.id, gaId);
        }

        assignments.push({
          bookingId: booking.id,
          guideId: guide.id,
          guideAssignmentId: gaId,
          passengerCount: booking.passengerCount,
          pickupAddressId: null, // Will be populated from booking
          zone: booking.zone,
          isPrivate: true,
        });

        // Private booking takes the whole vehicle
        guideCapacity.set(guide.id, 0);
      } else {
        flags.push({
          bookingId: booking.id,
          type: "no_capacity",
          message: `No guide with capacity for private booking (${booking.passengerCount} passengers)`,
          suggestion: "Consider adding more guides or splitting the group",
        });
      }
    }

    // Step 2: Cluster shared bookings by zone
    const clusters = this.clusterByZone(sharedBookings);

    // Step 3: Assign zone clusters
    for (const [zone, zoneBookings] of clusters) {
      // Sort by passenger count descending (First-Fit Decreasing)
      const sortedBookings = [...zoneBookings].sort(
        (a, b) => b.passengerCount - a.passengerCount
      );

      for (const booking of sortedBookings) {
        const guide = this.findBestGuide(
          eligibleGuides,
          guideCapacity,
          booking.passengerCount,
          zone
        );

        if (guide) {
          // Get or create guide assignment
          let gaId = guideAssignmentIds.get(guide.id);
          if (!gaId) {
            gaId = await this.getOrCreateGuideAssignment(scheduleId, guide.id);
            guideAssignmentIds.set(guide.id, gaId);
          }

          assignments.push({
            bookingId: booking.id,
            guideId: guide.id,
            guideAssignmentId: gaId,
            passengerCount: booking.passengerCount,
            pickupAddressId: null,
            zone: booking.zone,
            isPrivate: false,
          });

          // Update capacity
          const currentCap = guideCapacity.get(guide.id) || 0;
          guideCapacity.set(guide.id, currentCap - booking.passengerCount);
        } else {
          flags.push({
            bookingId: booking.id,
            type: "no_capacity",
            message: `No guide with capacity for ${booking.passengerCount} passengers`,
            suggestion: "Consider adding more guides",
          });
        }
      }
    }

    // Step 4: Save assignments to database
    if (assignments.length > 0) {
      await this.saveAssignments(scheduleId, assignments, unassignedBookings);

      // Step 5: Optimize routes and calculate pickup times for each guide
      const uniqueGuideIds = [...new Set(assignments.map((a) => a.guideId))];
      for (const guideId of uniqueGuideIds) {
        const gaId = guideAssignmentIds.get(guideId);
        if (gaId) {
          await this.optimizeGuideRoute(gaId, schedule.startsAt);
        }
      }
    }

    // Calculate stats
    const totalDriveMinutes = 0; // TODO: Calculate actual drive time
    const vehicleUtilization = this.calculateNewUtilization(
      eligibleGuides,
      guideCapacity
    );
    const guideBalance = this.calculateGuideBalance(assignments, eligibleGuides);

    return {
      success: flags.length === 0,
      scheduleId,
      assigned: assignments.length,
      unassigned: flags.length,
      flags,
      stats: {
        totalDriveMinutes,
        vehicleUtilization,
        guideBalance,
      },
    };
  }

  /**
   * Auto-assign all tours for an entire day
   *
   * @param date - The date to auto-assign
   * @returns Day assignment result with per-tour results
   */
  async autoAssignDay(date: Date): Promise<DayAssignResult> {
    const overview = await this.dailyOperations.getDayOverview(date);
    const results: AutoAssignResult[] = [];

    for (const tour of overview.tours) {
      const result = await this.autoAssignTour(tour.scheduleId);
      results.push(result);
    }

    return {
      date,
      totalTours: overview.stats.totalTours,
      fullyAssigned: results.filter((r) => r.unassigned === 0).length,
      needsAttention: results.filter((r) => r.unassigned > 0).length,
      results,
    };
  }

  // ============================================================
  // ALGORITHM HELPERS
  // ============================================================

  /**
   * Cluster bookings by pickup zone
   *
   * @param bookings - Bookings to cluster
   * @returns Map of zone to bookings
   */
  protected clusterByZone(
    bookings: UnassignedBooking[]
  ): Map<string, UnassignedBooking[]> {
    const clusters = new Map<string, UnassignedBooking[]>();

    for (const booking of bookings) {
      const zone = booking.zone || "unknown";
      if (!clusters.has(zone)) {
        clusters.set(zone, []);
      }
      clusters.get(zone)!.push(booking);
    }

    return clusters;
  }

  /**
   * Bin-pack bookings into guide vehicles using First-Fit Decreasing
   *
   * @param bookings - Bookings to pack
   * @param guides - Available guides
   * @returns Assignments and unassigned bookings
   */
  protected binPackBookings(
    bookings: UnassignedBooking[],
    guides: AvailableGuide[]
  ): { assignments: InternalAssignment[]; unassigned: UnassignedBooking[] } {
    const assignments: InternalAssignment[] = [];
    const unassigned: UnassignedBooking[] = [];

    // Sort bookings by passenger count (largest first)
    const sorted = [...bookings].sort(
      (a, b) => b.passengerCount - a.passengerCount
    );

    // Track remaining capacity per guide
    const remainingCapacity = new Map<string, number>();
    for (const guide of guides) {
      remainingCapacity.set(guide.id, guide.availableCapacity);
    }

    for (const booking of sorted) {
      // Find first guide with enough capacity
      const guide = guides.find(
        (g) => (remainingCapacity.get(g.id) || 0) >= booking.passengerCount
      );

      if (guide) {
        assignments.push({
          bookingId: booking.id,
          guideId: guide.id,
          guideAssignmentId: "", // Will be set later
          passengerCount: booking.passengerCount,
          pickupAddressId: null,
          zone: booking.zone,
          isPrivate: booking.isPrivate,
        });

        const newCap =
          (remainingCapacity.get(guide.id) || 0) - booking.passengerCount;
        remainingCapacity.set(guide.id, newCap);
      } else {
        unassigned.push(booking);
      }
    }

    return { assignments, unassigned };
  }

  /**
   * Find the best guide for a booking based on capacity, zone preference, and workload
   *
   * @param guides - Available guides
   * @param capacityMap - Current capacity per guide
   * @param neededCapacity - Passengers to fit
   * @param priorityZone - Preferred zone (if any)
   * @returns Best matching guide or null
   */
  protected findBestGuide(
    guides: AvailableGuide[],
    capacityMap: Map<string, number>,
    neededCapacity: number,
    priorityZone?: string | null
  ): AvailableGuide | null {
    // Filter to guides with enough capacity
    const eligible = guides.filter(
      (g) => (capacityMap.get(g.id) || 0) >= neededCapacity && !g.hasConflict
    );

    if (eligible.length === 0) return null;

    // Score each guide
    const scored = eligible.map((guide) => {
      let score = 0;

      // Zone preference match: +20 points
      if (
        priorityZone &&
        guide.preferredZones.includes(priorityZone)
      ) {
        score += 20;
      }

      // Available capacity (prefer guides with more room): +10 per available seat
      score += (capacityMap.get(guide.id) || 0) * 10;

      // Workload balance (prefer guides with less current load): +5 per available seat
      score += guide.availableCapacity * 5;

      return { guide, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.guide || null;
  }

  /**
   * Find a guide with sufficient capacity
   */
  protected findGuideWithCapacity(
    guides: AvailableGuide[],
    capacityMap: Map<string, number>,
    neededCapacity: number
  ): AvailableGuide | null {
    return (
      guides.find(
        (g) =>
          (capacityMap.get(g.id) || 0) >= neededCapacity && !g.hasConflict
      ) || null
    );
  }

  // ============================================================
  // SUGGESTIONS
  // ============================================================

  /**
   * Get assignment suggestions for a booking
   * Returns ranked list of guides with efficiency scores
   *
   * @param bookingId - The booking to get suggestions for
   * @param scheduleId - The schedule context
   * @returns Ranked list of guide suggestions
   */
  async getSuggestions(
    bookingId: string,
    scheduleId: string
  ): Promise<AssignmentSuggestion[]> {
    // Get booking details with pickup address
    const bookingResult = await this.db
      .select({
        booking: bookings,
        pickupAddress: {
          id: pickupAddresses.id,
          zone: pickupAddresses.zone,
        },
      })
      .from(bookings)
      .leftJoin(pickupAddresses, eq(bookings.pickupAddressId, pickupAddresses.id))
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (bookingResult.length === 0) {
      throw new NotFoundError("Booking", bookingId);
    }

    const booking = bookingResult[0]!.booking;
    const pickupAddress = bookingResult[0]!.pickupAddress;

    // Get available guides
    const availableGuides = await this.dailyOperations.getAvailableGuides(
      scheduleId
    );

    const suggestions: AssignmentSuggestion[] = [];

    for (const guide of availableGuides) {
      if (guide.hasConflict) continue;
      if (guide.availableCapacity < booking.totalParticipants) continue;

      const reasons: string[] = [];
      let score = 50; // Base score

      // Check zone match
      const bookingZone = pickupAddress?.zone;
      if (bookingZone && guide.preferredZones.includes(bookingZone)) {
        score += 25;
        reasons.push(`Preferred zone: ${bookingZone}`);
      }

      // Check capacity fit
      const utilizationAfter =
        (guide.currentLoad + booking.totalParticipants) /
        guide.vehicleCapacity;
      if (utilizationAfter >= 0.8) {
        score += 15;
        reasons.push("Good vehicle utilization");
      }

      // Check current load (prefer balanced workload)
      if (guide.currentLoad === 0) {
        score += 10;
        reasons.push("Currently available");
      }

      suggestions.push({
        guideId: guide.id,
        guideName: guide.name,
        score: Math.min(100, score),
        reasons,
        addedDriveMinutes: 0, // TODO: Calculate actual drive time
        newCapacity: {
          current: guide.currentLoad + booking.totalParticipants,
          max: guide.vehicleCapacity,
        },
      });
    }

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Get or create a guide assignment for a schedule
   */
  private async getOrCreateGuideAssignment(
    scheduleId: string,
    guideId: string
  ): Promise<string> {
    // First, get all bookings for this schedule to find one to attach to
    const scheduleBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.scheduleId, scheduleId),
        eq(bookings.organizationId, this.organizationId),
        ne(bookings.status, "cancelled")
      ),
      limit: 1,
    });

    if (scheduleBookings.length === 0) {
      throw new ValidationError("No bookings found for this schedule");
    }

    const bookingId = scheduleBookings[0]!.id;

    // Check if assignment already exists
    const existing = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.bookingId, bookingId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      return existing.id;
    }

    // Create new guide assignment
    const [newAssignment] = await this.db
      .insert(guideAssignments)
      .values({
        organizationId: this.organizationId,
        bookingId,
        guideId,
        status: "pending",
        assignedAt: new Date(),
      })
      .returning();

    return newAssignment!.id;
  }

  /**
   * Save pickup assignments to database
   */
  private async saveAssignments(
    scheduleId: string,
    assignments: InternalAssignment[],
    bookingsList: UnassignedBooking[]
  ): Promise<void> {
    // Create a map of booking IDs to their pickup address IDs
    const bookingPickupMap = new Map<string, string | null>();

    // Get full booking data for pickup addresses
    const fullBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.scheduleId, scheduleId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    for (const booking of fullBookings) {
      bookingPickupMap.set(booking.id, booking.pickupAddressId);
    }

    // Prepare pickup assignment records
    const pickupRecords: NewPickupAssignment[] = assignments.map(
      (assignment, index) => ({
        organizationId: this.organizationId,
        scheduleId,
        guideAssignmentId: assignment.guideAssignmentId,
        bookingId: assignment.bookingId,
        pickupAddressId: bookingPickupMap.get(assignment.bookingId) || null,
        pickupOrder: index + 1,
        passengerCount: assignment.passengerCount,
        status: "pending" as const,
      })
    );

    // Insert all pickup assignments
    if (pickupRecords.length > 0) {
      await this.db.insert(pickupAssignments).values(pickupRecords);
    }
  }

  /**
   * Optimize pickup order for a guide and calculate pickup times
   */
  private async optimizeGuideRoute(
    guideAssignmentId: string,
    tourStartTime: Date
  ): Promise<void> {
    // Get all pickup assignments for this guide
    const guidePickups = await this.db.query.pickupAssignments.findMany({
      where: and(
        eq(pickupAssignments.guideAssignmentId, guideAssignmentId),
        eq(pickupAssignments.organizationId, this.organizationId),
        ne(pickupAssignments.status, "cancelled")
      ),
      with: {
        pickupAddress: true,
      },
    });

    if (guidePickups.length <= 1) {
      // Single pickup - just calculate time
      if (guidePickups.length === 1) {
        const pickup = guidePickups[0]!;
        const avgPickupMinutes = pickup.pickupAddress?.averagePickupMinutes || 5;
        const estimatedTime = new Date(
          tourStartTime.getTime() - avgPickupMinutes * 60 * 1000
        );

        await this.db
          .update(pickupAssignments)
          .set({
            pickupOrder: 1,
            estimatedPickupTime: estimatedTime,
            updatedAt: new Date(),
          })
          .where(eq(pickupAssignments.id, pickup.id));
      }
      return;
    }

    // Apply nearest neighbor optimization
    const optimizedOrder = this.nearestNeighborRoute(guidePickups);

    // Calculate pickup times working backwards from tour start
    const BUFFER_MINUTES = 5;
    const times = this.calculatePickupTimes(
      optimizedOrder,
      tourStartTime,
      BUFFER_MINUTES
    );

    // Update pickup assignments with new order and times
    for (let i = 0; i < optimizedOrder.length; i++) {
      const pickup = optimizedOrder[i]!;
      await this.db
        .update(pickupAssignments)
        .set({
          pickupOrder: i + 1,
          estimatedPickupTime: times[i],
          updatedAt: new Date(),
        })
        .where(eq(pickupAssignments.id, pickup.id));
    }
  }

  /**
   * Nearest neighbor route optimization
   */
  private nearestNeighborRoute(
    pickups: Array<{
      id: string;
      pickupAddress: PickupAddress | null;
    }>
  ): typeof pickups {
    if (pickups.length <= 1) return pickups;

    const optimized: typeof pickups = [];
    const remaining = new Set(pickups);

    // Start with first pickup
    let current = pickups[0]!;
    optimized.push(current);
    remaining.delete(current);

    while (remaining.size > 0) {
      let nearest: (typeof pickups)[0] | null = null;
      let nearestDistance = Infinity;

      for (const pickup of remaining) {
        const distance = this.calculateDistance(
          current.pickupAddress,
          pickup.pickupAddress
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = pickup;
        }
      }

      if (nearest) {
        optimized.push(nearest);
        remaining.delete(nearest);
        current = nearest;
      }
    }

    return optimized;
  }

  /**
   * Calculate distance between two pickup addresses using Haversine formula
   */
  private calculateDistance(
    addr1: PickupAddress | null,
    addr2: PickupAddress | null
  ): number {
    if (!addr1 || !addr2) return 0;

    const lat1 = Number(addr1.latitude);
    const lon1 = Number(addr1.longitude);
    const lat2 = Number(addr2.latitude);
    const lon2 = Number(addr2.longitude);

    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371; // Earth's radius in km
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
  }

  /**
   * Calculate drive time in minutes between two addresses
   */
  private calculateDriveMinutes(
    addr1: PickupAddress | null,
    addr2: PickupAddress | null
  ): number {
    const distanceKm = this.calculateDistance(addr1, addr2);
    const averageSpeedKmH = 30; // Conservative city driving
    return Math.ceil((distanceKm / averageSpeedKmH) * 60);
  }

  /**
   * Calculate pickup times working backwards from tour start
   */
  private calculatePickupTimes(
    pickups: Array<{
      id: string;
      pickupAddress: PickupAddress | null;
    }>,
    tourStartTime: Date,
    bufferMinutes: number
  ): Date[] {
    if (pickups.length === 0) return [];

    const times: Date[] = new Array(pickups.length);

    // Start with buffer before tour
    let currentTime = new Date(
      tourStartTime.getTime() - bufferMinutes * 60 * 1000
    );

    // Work backwards from last pickup
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i]!;
      const avgPickupMinutes = pickup.pickupAddress?.averagePickupMinutes || 5;

      times[i] = new Date(currentTime);

      // Subtract drive time to previous pickup (if not first)
      if (i > 0) {
        const prevPickup = pickups[i - 1]!;
        const driveMinutes = this.calculateDriveMinutes(
          prevPickup.pickupAddress,
          pickup.pickupAddress
        );
        currentTime = new Date(
          currentTime.getTime() - (driveMinutes + avgPickupMinutes) * 60 * 1000
        );
      }
    }

    return times;
  }

  /**
   * Calculate current vehicle utilization from existing assignments
   */
  private calculateUtilization(
    assignments: TourAssignmentData["guideAssignments"]
  ): number {
    if (assignments.length === 0) return 0;

    let totalCapacity = 0;
    let totalLoad = 0;

    for (const ga of assignments) {
      if (ga.guide) {
        totalCapacity += ga.guide.vehicleCapacity || 6;
        totalLoad += ga.pickupAssignments.reduce(
          (sum, pa) => sum + pa.passengerCount,
          0
        );
      }
    }

    return totalCapacity > 0 ? totalLoad / totalCapacity : 0;
  }

  /**
   * Calculate new vehicle utilization after assignments
   */
  private calculateNewUtilization(
    guides: AvailableGuide[],
    capacityMap: Map<string, number>
  ): number {
    let totalCapacity = 0;
    let totalUsed = 0;

    for (const guide of guides) {
      const remaining = capacityMap.get(guide.id) || 0;
      const used = guide.vehicleCapacity - remaining;

      if (used > 0) {
        totalCapacity += guide.vehicleCapacity;
        totalUsed += used;
      }
    }

    return totalCapacity > 0 ? totalUsed / totalCapacity : 0;
  }

  /**
   * Calculate guide workload balance (0-1, where 1 is perfectly balanced)
   */
  private calculateGuideBalance(
    assignments: InternalAssignment[],
    guides: AvailableGuide[]
  ): number {
    if (assignments.length === 0 || guides.length === 0) return 1;

    // Count assignments per guide
    const countPerGuide = new Map<string, number>();
    for (const assignment of assignments) {
      const count = countPerGuide.get(assignment.guideId) || 0;
      countPerGuide.set(assignment.guideId, count + 1);
    }

    const counts = Array.from(countPerGuide.values());
    if (counts.length <= 1) return 1;

    // Calculate coefficient of variation (lower = more balanced)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Convert to 0-1 scale (1 = perfectly balanced)
    return Math.max(0, 1 - cv);
  }
}
