import { eq, and, asc, inArray, sql, desc } from "drizzle-orm";
import {
  pickupAssignments,
  pickupAddresses,
  bookings,
  guideAssignments,
  schedules,
  guides,
  type PickupAssignment,
  type PickupAssignmentStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ConflictError, ValidationError } from "./types";

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for assigning a booking to a guide for pickup
 */
export interface AssignBookingInput {
  /** The schedule (tour instance) this pickup is for */
  scheduleId: string;
  /** The guide assignment handling this pickup */
  guideAssignmentId: string;
  /** The booking being picked up */
  bookingId: string;
  /** Optional pickup address ID (falls back to booking's pickup address) */
  pickupAddressId?: string;
  /** Insert at this position in the pickup order (appends if not specified) */
  position?: number;
  /** Optional notes for this pickup */
  notes?: string;
}

/**
 * Input for ghost preview calculation
 */
export interface GhostPreviewInput {
  /** The guide assignment to preview adding the booking to */
  guideAssignmentId: string;
  /** The booking to preview adding */
  bookingId: string;
  /** Optional position to insert at */
  position?: number;
}

/**
 * Result of ghost preview calculation
 */
export interface GhostPreview {
  /** Whether the assignment is valid (capacity, conflicts, etc.) */
  valid: boolean;
  /** If invalid, the reason why */
  reason?: string;
  /** Estimated additional drive time in minutes */
  addedDriveMinutes: number;
  /** New capacity after assignment */
  newCapacity: { current: number; max: number };
  /** Whether this assignment is efficient (drive time within threshold) */
  isEfficient: boolean;
  /** Suggested alternative or optimization */
  recommendation?: string;
}

/**
 * Pickup assignment with related data
 */
export interface PickupAssignmentWithRelations extends PickupAssignment {
  booking?: typeof bookings.$inferSelect | null;
  pickupAddress?: typeof pickupAddresses.$inferSelect | null;
  guideAssignment?: typeof guideAssignments.$inferSelect | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Threshold in minutes for considering an assignment "efficient" */
const EFFICIENCY_THRESHOLD_MINUTES = 15;

/** Default average driving speed in km/h for city driving */
const AVERAGE_SPEED_KMH = 30;

// ============================================================================
// Service
// ============================================================================

/**
 * Pickup Assignment Service
 *
 * Manages the assignment of bookings to guides for pickup in the Tour Command Center.
 * Handles the core workflow of assigning, reordering, and tracking pickup status
 * for day-of operations.
 */
export class PickupAssignmentService extends BaseService {
  // ==========================================================================
  // Core Operations
  // ==========================================================================

  /**
   * Assign a booking to a guide for pickup
   *
   * Creates a new pickup assignment linking a booking to a guide assignment.
   * Validates capacity constraints and prevents duplicate assignments.
   *
   * @param input - Assignment details
   * @returns The created pickup assignment
   * @throws ConflictError if booking is already assigned for this schedule
   * @throws ValidationError if assignment would exceed vehicle capacity
   *
   * @example
   * ```ts
   * const assignment = await pickupAssignmentService.assign({
   *   scheduleId: "sch_123",
   *   guideAssignmentId: "ga_456",
   *   bookingId: "bkg_789",
   *   position: 2 // Insert as second pickup
   * });
   * ```
   */
  async assign(input: AssignBookingInput): Promise<PickupAssignment> {
    // Verify the booking exists and get passenger count
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Verify the guide assignment exists
    const guideAssignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.id, input.guideAssignmentId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
      },
    });

    if (!guideAssignment) {
      throw new NotFoundError("Guide assignment", input.guideAssignmentId);
    }

    // Check if booking is already assigned for this schedule
    const existing = await this.db.query.pickupAssignments.findFirst({
      where: and(
        eq(pickupAssignments.scheduleId, input.scheduleId),
        eq(pickupAssignments.bookingId, input.bookingId),
        eq(pickupAssignments.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(
        `Booking is already assigned to a guide for this schedule`
      );
    }

    // Get current assignments for this guide to check capacity and determine order
    const currentAssignments = await this.getByGuideAssignment(input.guideAssignmentId);
    const currentPassengers = currentAssignments.reduce(
      (sum, a) => sum + a.passengerCount,
      0
    );
    const passengerCount = (booking.adultCount || 0) + (booking.childCount || 0) + (booking.infantCount || 0);

    // Check vehicle capacity if guide has one set
    const guide = guideAssignment.guide;
    if (guide?.vehicleCapacity) {
      const newTotal = currentPassengers + passengerCount;
      if (newTotal > guide.vehicleCapacity) {
        throw new ValidationError(
          `Assignment would exceed vehicle capacity (${newTotal}/${guide.vehicleCapacity})`
        );
      }
    }

    // Determine pickup order
    let pickupOrder: number;
    if (input.position !== undefined && input.position >= 1) {
      pickupOrder = input.position;
      // Shift existing assignments at or after this position
      await this.shiftPickupOrders(input.guideAssignmentId, input.position, 1);
    } else {
      // Append at end
      pickupOrder = currentAssignments.length + 1;
    }

    // Determine pickup address (from input or from booking)
    const pickupAddressId = input.pickupAddressId || booking.pickupAddressId;

    // Create the assignment
    const [assignment] = await this.db
      .insert(pickupAssignments)
      .values({
        organizationId: this.organizationId,
        scheduleId: input.scheduleId,
        guideAssignmentId: input.guideAssignmentId,
        bookingId: input.bookingId,
        pickupAddressId,
        pickupOrder,
        passengerCount,
        status: "pending",
        notes: input.notes,
      })
      .returning();

    if (!assignment) {
      throw new Error("Failed to create pickup assignment");
    }

    return assignment;
  }

  /**
   * Remove a booking from pickup assignments (unassign)
   *
   * Deletes the pickup assignment and reorders remaining assignments
   * to maintain sequential pickup order.
   *
   * @param pickupAssignmentId - The pickup assignment ID to remove
   * @throws NotFoundError if assignment doesn't exist
   *
   * @example
   * ```ts
   * await pickupAssignmentService.unassign("pa_123");
   * ```
   */
  async unassign(pickupAssignmentId: string): Promise<void> {
    // Get the assignment to find its position and guide
    const assignment = await this.db.query.pickupAssignments.findFirst({
      where: and(
        eq(pickupAssignments.id, pickupAssignmentId),
        eq(pickupAssignments.organizationId, this.organizationId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError("Pickup assignment", pickupAssignmentId);
    }

    // Delete the assignment
    await this.db
      .delete(pickupAssignments)
      .where(
        and(
          eq(pickupAssignments.id, pickupAssignmentId),
          eq(pickupAssignments.organizationId, this.organizationId)
        )
      );

    // Reorder remaining assignments to fill the gap
    await this.shiftPickupOrders(
      assignment.guideAssignmentId,
      assignment.pickupOrder + 1,
      -1
    );
  }

  /**
   * Reorder pickups for a guide assignment
   *
   * Updates pickup order based on provided array of pickup assignment IDs.
   *
   * @param guideAssignmentId - The guide assignment to reorder
   * @param pickupOrder - Array of pickup assignment IDs in desired order
   *
   * @example
   * ```ts
   * await pickupAssignmentService.reorder("ga_123", [
   *   "pa_third",  // Now first
   *   "pa_first",  // Now second
   *   "pa_second"  // Now third
   * ]);
   * ```
   */
  async reorder(guideAssignmentId: string, pickupOrder: string[]): Promise<void> {
    // Verify guide assignment exists
    const guideAssignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.id, guideAssignmentId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    if (!guideAssignment) {
      throw new NotFoundError("Guide assignment", guideAssignmentId);
    }

    // Update pickup order for each assignment
    await Promise.all(
      pickupOrder.map((assignmentId, index) =>
        this.db
          .update(pickupAssignments)
          .set({
            pickupOrder: index + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(pickupAssignments.id, assignmentId),
              eq(pickupAssignments.guideAssignmentId, guideAssignmentId),
              eq(pickupAssignments.organizationId, this.organizationId)
            )
          )
      )
    );
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all pickup assignments for a schedule
   *
   * @param scheduleId - The schedule ID
   * @returns Array of pickup assignments with relations
   *
   * @example
   * ```ts
   * const assignments = await pickupAssignmentService.getBySchedule("sch_123");
   * ```
   */
  async getBySchedule(scheduleId: string): Promise<PickupAssignmentWithRelations[]> {
    return this.db.query.pickupAssignments.findMany({
      where: and(
        eq(pickupAssignments.scheduleId, scheduleId),
        eq(pickupAssignments.organizationId, this.organizationId)
      ),
      with: {
        booking: true,
        pickupAddress: true,
        guideAssignment: true,
      },
      orderBy: [asc(pickupAssignments.pickupOrder)],
    }) as Promise<PickupAssignmentWithRelations[]>;
  }

  /**
   * Get all pickup assignments for a guide assignment
   *
   * @param guideAssignmentId - The guide assignment ID
   * @returns Array of pickup assignments sorted by pickup order
   *
   * @example
   * ```ts
   * const pickups = await pickupAssignmentService.getByGuideAssignment("ga_123");
   * for (const pickup of pickups) {
   *   console.log(`${pickup.pickupOrder}: ${pickup.booking?.referenceNumber}`);
   * }
   * ```
   */
  async getByGuideAssignment(guideAssignmentId: string): Promise<PickupAssignmentWithRelations[]> {
    return this.db.query.pickupAssignments.findMany({
      where: and(
        eq(pickupAssignments.guideAssignmentId, guideAssignmentId),
        eq(pickupAssignments.organizationId, this.organizationId)
      ),
      with: {
        booking: true,
        pickupAddress: true,
        guideAssignment: true,
      },
      orderBy: [asc(pickupAssignments.pickupOrder)],
    }) as Promise<PickupAssignmentWithRelations[]>;
  }

  /**
   * Get the pickup assignment for a specific booking
   *
   * @param bookingId - The booking ID
   * @returns The pickup assignment or undefined if booking is not assigned
   *
   * @example
   * ```ts
   * const assignment = await pickupAssignmentService.getByBooking("bkg_123");
   * if (assignment) {
   *   console.log(`Booking assigned to guide assignment: ${assignment.guideAssignmentId}`);
   * }
   * ```
   */
  async getByBooking(bookingId: string): Promise<PickupAssignmentWithRelations | undefined> {
    return this.db.query.pickupAssignments.findFirst({
      where: and(
        eq(pickupAssignments.bookingId, bookingId),
        eq(pickupAssignments.organizationId, this.organizationId)
      ),
      with: {
        booking: true,
        pickupAddress: true,
        guideAssignment: true,
      },
    }) as Promise<PickupAssignmentWithRelations | undefined>;
  }

  // ==========================================================================
  // Status Updates
  // ==========================================================================

  /**
   * Mark a pickup as completed (picked up)
   *
   * @param id - The pickup assignment ID
   * @returns The updated pickup assignment
   *
   * @example
   * ```ts
   * const pickup = await pickupAssignmentService.markPickedUp("pa_123");
   * console.log(pickup.status); // "picked_up"
   * ```
   */
  async markPickedUp(id: string): Promise<PickupAssignment> {
    return this.updateStatus(id, "picked_up", { actualPickupTime: new Date() });
  }

  /**
   * Mark a pickup as no-show
   *
   * @param id - The pickup assignment ID
   * @returns The updated pickup assignment
   *
   * @example
   * ```ts
   * const pickup = await pickupAssignmentService.markNoShow("pa_123");
   * console.log(pickup.status); // "no_show"
   * ```
   */
  async markNoShow(id: string): Promise<PickupAssignment> {
    return this.updateStatus(id, "no_show");
  }

  /**
   * Update the actual pickup time
   *
   * @param id - The pickup assignment ID
   * @param actualTime - The actual pickup time
   * @returns The updated pickup assignment
   *
   * @example
   * ```ts
   * const pickup = await pickupAssignmentService.updatePickupTime(
   *   "pa_123",
   *   new Date("2026-01-15T08:30:00Z")
   * );
   * ```
   */
  async updatePickupTime(id: string, actualTime: Date): Promise<PickupAssignment> {
    const [assignment] = await this.db
      .update(pickupAssignments)
      .set({
        actualPickupTime: actualTime,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pickupAssignments.id, id),
          eq(pickupAssignments.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!assignment) {
      throw new NotFoundError("Pickup assignment", id);
    }

    return assignment;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Bulk assign multiple bookings
   *
   * @param assignments - Array of assignment inputs
   * @returns Array of created pickup assignments
   *
   * @example
   * ```ts
   * const results = await pickupAssignmentService.bulkAssign([
   *   { scheduleId: "sch_1", guideAssignmentId: "ga_1", bookingId: "bkg_1" },
   *   { scheduleId: "sch_1", guideAssignmentId: "ga_1", bookingId: "bkg_2" },
   *   { scheduleId: "sch_1", guideAssignmentId: "ga_2", bookingId: "bkg_3" },
   * ]);
   * ```
   */
  async bulkAssign(assignments: AssignBookingInput[]): Promise<PickupAssignment[]> {
    const results: PickupAssignment[] = [];

    // Process assignments sequentially to handle ordering correctly
    for (const input of assignments) {
      try {
        const assignment = await this.assign(input);
        results.push(assignment);
      } catch (error) {
        // Log error but continue with other assignments
        console.error(`Failed to assign booking ${input.bookingId}:`, error);
      }
    }

    return results;
  }

  /**
   * Clear all pickup assignments for a schedule
   *
   * Removes all pickup assignments for a given schedule. Useful when
   * re-running auto-assignment or resetting assignments.
   *
   * @param scheduleId - The schedule ID
   *
   * @example
   * ```ts
   * await pickupAssignmentService.clearScheduleAssignments("sch_123");
   * ```
   */
  async clearScheduleAssignments(scheduleId: string): Promise<void> {
    await this.db
      .delete(pickupAssignments)
      .where(
        and(
          eq(pickupAssignments.scheduleId, scheduleId),
          eq(pickupAssignments.organizationId, this.organizationId)
        )
      );
  }

  // ==========================================================================
  // Ghost Preview (Drag-Drop UI)
  // ==========================================================================

  /**
   * Calculate ghost preview for drag-drop assignment
   *
   * Calculates what would happen if a booking is assigned to a guide
   * without actually making the assignment. Used for UI feedback during
   * drag-drop operations.
   *
   * @param input - Preview input
   * @returns Preview result with validity, capacity, and efficiency info
   *
   * @example
   * ```ts
   * const preview = await pickupAssignmentService.calculateGhostPreview({
   *   guideAssignmentId: "ga_123",
   *   bookingId: "bkg_456",
   *   position: 2
   * });
   *
   * if (!preview.valid) {
   *   showError(preview.reason);
   * } else if (!preview.isEfficient) {
   *   showWarning(preview.recommendation);
   * }
   * ```
   */
  async calculateGhostPreview(input: GhostPreviewInput): Promise<GhostPreview> {
    // Get booking details
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
      with: {
        pickupAddress: true,
      },
    });

    if (!booking) {
      return {
        valid: false,
        reason: "Booking not found",
        addedDriveMinutes: 0,
        newCapacity: { current: 0, max: 0 },
        isEfficient: false,
      };
    }

    // Get guide assignment with guide details
    const guideAssignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.id, input.guideAssignmentId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
      },
    });

    if (!guideAssignment) {
      return {
        valid: false,
        reason: "Guide assignment not found",
        addedDriveMinutes: 0,
        newCapacity: { current: 0, max: 0 },
        isEfficient: false,
      };
    }

    // Get current assignments for capacity check
    const currentAssignments = await this.getByGuideAssignment(input.guideAssignmentId);
    const currentPassengers = currentAssignments.reduce(
      (sum, a) => sum + a.passengerCount,
      0
    );
    const bookingPassengers = (booking.adultCount || 0) + (booking.childCount || 0) + (booking.infantCount || 0);
    const newPassengerCount = currentPassengers + bookingPassengers;

    // Check vehicle capacity
    const guide = guideAssignment.guide;
    const maxCapacity = guide?.vehicleCapacity || 999; // Default to no limit if not set

    if (newPassengerCount > maxCapacity) {
      return {
        valid: false,
        reason: `Exceeds capacity (${newPassengerCount}/${maxCapacity})`,
        addedDriveMinutes: 0,
        newCapacity: { current: newPassengerCount, max: maxCapacity },
        isEfficient: false,
      };
    }

    // Calculate added drive time
    const addedDriveMinutes = await this.calculateAddedDriveTime(
      currentAssignments,
      booking,
      input.position
    );

    // Determine efficiency
    const isEfficient = addedDriveMinutes <= EFFICIENCY_THRESHOLD_MINUTES;

    // Generate recommendation if inefficient
    let recommendation: string | undefined;
    if (!isEfficient) {
      recommendation = `This pickup adds ${addedDriveMinutes} minutes of drive time. Consider grouping by zone.`;
    }

    return {
      valid: true,
      addedDriveMinutes,
      newCapacity: { current: newPassengerCount, max: maxCapacity },
      isEfficient,
      recommendation,
    };
  }

  // ==========================================================================
  // Approval
  // ==========================================================================

  /**
   * Approve all assignments for a tour schedule
   *
   * Marks the schedule's assignments as approved/locked. This is typically
   * done after reviewing auto-assignments and before notifying guides.
   *
   * @param scheduleId - The schedule ID to approve
   *
   * @example
   * ```ts
   * await pickupAssignmentService.approveTour("sch_123");
   * // Now ready to notify guides
   * ```
   */
  async approveTour(scheduleId: string): Promise<void> {
    // Verify schedule exists
    const schedule = await this.db.query.schedules.findFirst({
      where: and(
        eq(schedules.id, scheduleId),
        eq(schedules.organizationId, this.organizationId)
      ),
    });

    if (!schedule) {
      throw new NotFoundError("Schedule", scheduleId);
    }

    // Update schedule status to indicate approved
    // This uses the existing schedule status field or a new approved flag
    await this.db
      .update(schedules)
      .set({
        // Assuming there's a field to track approval status
        // If not, this could be a separate pickup_approval table or schedule metadata
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schedules.id, scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      );

    // Calculate and set estimated pickup times for all assignments
    await this.calculateEstimatedPickupTimes(scheduleId);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Update assignment status
   */
  private async updateStatus(
    id: string,
    status: PickupAssignmentStatus,
    additionalFields?: Partial<PickupAssignment>
  ): Promise<PickupAssignment> {
    const [assignment] = await this.db
      .update(pickupAssignments)
      .set({
        status,
        ...additionalFields,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pickupAssignments.id, id),
          eq(pickupAssignments.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!assignment) {
      throw new NotFoundError("Pickup assignment", id);
    }

    return assignment;
  }

  /**
   * Shift pickup orders when inserting/removing assignments
   */
  private async shiftPickupOrders(
    guideAssignmentId: string,
    fromPosition: number,
    delta: number
  ): Promise<void> {
    // Get assignments at or after the position
    const assignments = await this.db.query.pickupAssignments.findMany({
      where: and(
        eq(pickupAssignments.guideAssignmentId, guideAssignmentId),
        eq(pickupAssignments.organizationId, this.organizationId),
        sql`${pickupAssignments.pickupOrder} >= ${fromPosition}`
      ),
    });

    // Update each assignment's order
    await Promise.all(
      assignments.map((assignment) =>
        this.db
          .update(pickupAssignments)
          .set({
            pickupOrder: assignment.pickupOrder + delta,
            updatedAt: new Date(),
          })
          .where(eq(pickupAssignments.id, assignment.id))
      )
    );
  }

  /**
   * Calculate added drive time for a new assignment
   */
  private async calculateAddedDriveTime(
    currentAssignments: PickupAssignmentWithRelations[],
    booking: typeof bookings.$inferSelect & { pickupAddress?: typeof pickupAddresses.$inferSelect | null },
    position?: number
  ): Promise<number> {
    // If no current assignments, return 0 (first pickup has no "added" time)
    if (currentAssignments.length === 0) {
      return 0;
    }

    const bookingAddress = booking.pickupAddress;
    if (!bookingAddress?.latitude || !bookingAddress?.longitude) {
      // Can't calculate without coordinates, return default estimate
      return 10;
    }

    // Get the pickup address for the position before and after
    const insertPosition = position ?? currentAssignments.length + 1;
    const beforeAssignment = currentAssignments.find(
      (a) => a.pickupOrder === insertPosition - 1
    );
    const afterAssignment = currentAssignments.find(
      (a) => a.pickupOrder === insertPosition
    );

    let addedMinutes = 0;

    // Calculate distance to previous pickup
    if (beforeAssignment?.pickupAddress?.latitude && beforeAssignment?.pickupAddress?.longitude) {
      const distanceKm = this.calculateHaversineDistance(
        parseFloat(beforeAssignment.pickupAddress.latitude),
        parseFloat(beforeAssignment.pickupAddress.longitude),
        parseFloat(bookingAddress.latitude),
        parseFloat(bookingAddress.longitude)
      );
      addedMinutes += Math.ceil((distanceKm / AVERAGE_SPEED_KMH) * 60);
    }

    // Calculate distance to next pickup
    if (afterAssignment?.pickupAddress?.latitude && afterAssignment?.pickupAddress?.longitude) {
      const distanceKm = this.calculateHaversineDistance(
        parseFloat(bookingAddress.latitude),
        parseFloat(bookingAddress.longitude),
        parseFloat(afterAssignment.pickupAddress.latitude),
        parseFloat(afterAssignment.pickupAddress.longitude)
      );
      addedMinutes += Math.ceil((distanceKm / AVERAGE_SPEED_KMH) * 60);

      // Subtract the direct distance that was previously traveled
      if (beforeAssignment?.pickupAddress?.latitude && beforeAssignment?.pickupAddress?.longitude) {
        const directDistanceKm = this.calculateHaversineDistance(
          parseFloat(beforeAssignment.pickupAddress.latitude),
          parseFloat(beforeAssignment.pickupAddress.longitude),
          parseFloat(afterAssignment.pickupAddress.latitude),
          parseFloat(afterAssignment.pickupAddress.longitude)
        );
        addedMinutes -= Math.ceil((directDistanceKm / AVERAGE_SPEED_KMH) * 60);
      }
    }

    return Math.max(0, addedMinutes);
  }

  /**
   * Calculate Haversine distance between two coordinates
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate estimated pickup times for all assignments in a schedule
   * Works backwards from the tour start time
   */
  private async calculateEstimatedPickupTimes(scheduleId: string): Promise<void> {
    // Get schedule with start time
    const schedule = await this.db.query.schedules.findFirst({
      where: and(
        eq(schedules.id, scheduleId),
        eq(schedules.organizationId, this.organizationId)
      ),
    });

    if (!schedule) return;

    // Get all guide assignments for this schedule
    const guideAssignmentsList = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.bookingId, scheduleId), // Note: This might need adjustment based on schema
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    // For each guide assignment, calculate pickup times
    for (const ga of guideAssignmentsList) {
      const assignments = await this.getByGuideAssignment(ga.id);
      if (assignments.length === 0) continue;

      // Sort by pickup order (should already be sorted)
      const sortedAssignments = [...assignments].sort(
        (a, b) => a.pickupOrder - b.pickupOrder
      );

      // Work backwards from tour start time
      const BUFFER_MINUTES = 5;
      let currentTime = new Date(schedule.startsAt.getTime() - BUFFER_MINUTES * 60 * 1000);

      // Calculate from last pickup backwards
      for (let i = sortedAssignments.length - 1; i >= 0; i--) {
        const assignment = sortedAssignments[i];
        if (!assignment) continue;

        // Set estimated time
        await this.db
          .update(pickupAssignments)
          .set({
            estimatedPickupTime: currentTime,
            updatedAt: new Date(),
          })
          .where(eq(pickupAssignments.id, assignment.id));

        // Calculate time to previous pickup
        if (i > 0) {
          const prevAssignment = sortedAssignments[i - 1];
          const pickupDuration = assignment.pickupAddress?.averagePickupMinutes || 5;
          let driveMinutes = 10; // Default

          // Calculate drive time if coordinates available
          if (
            assignment.pickupAddress?.latitude &&
            assignment.pickupAddress?.longitude &&
            prevAssignment?.pickupAddress?.latitude &&
            prevAssignment?.pickupAddress?.longitude
          ) {
            const distanceKm = this.calculateHaversineDistance(
              parseFloat(prevAssignment.pickupAddress.latitude),
              parseFloat(prevAssignment.pickupAddress.longitude),
              parseFloat(assignment.pickupAddress.latitude),
              parseFloat(assignment.pickupAddress.longitude)
            );
            driveMinutes = Math.ceil((distanceKm / AVERAGE_SPEED_KMH) * 60);
          }

          currentTime = new Date(
            currentTime.getTime() - (pickupDuration + driveMinutes) * 60 * 1000
          );
        }
      }
    }
  }
}
