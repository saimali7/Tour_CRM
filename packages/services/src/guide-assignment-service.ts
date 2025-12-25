import { eq, and, lt, gt, ne, sql, inArray, isNotNull } from "drizzle-orm";
import {
  guideAssignments,
  schedules,
  bookings,
  guides,
  tours,
  type GuideAssignment,
  type GuideAssignmentStatus,
  type Booking,
  type Schedule,
  type Guide,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type DateRangeFilter,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "./types";

export interface GuideAssignmentFilters {
  status?: GuideAssignmentStatus;
  dateRange?: DateRangeFilter;
}

export interface GuideAssignmentWithRelations extends GuideAssignment {
  booking?: (Booking & {
    schedule?: (Schedule & {
      tour?: typeof tours.$inferSelect;
    }) | null;
  }) | null;
  guide?: Guide | null;
}

export interface CreateGuideAssignmentInput {
  bookingId: string;
  guideId: string;
  notes?: string;
}

export interface CreateOutsourcedGuideAssignmentInput {
  bookingId: string;
  outsourcedGuideName: string;
  outsourcedGuideContact?: string;
  notes?: string;
}

/**
 * Guide Assignment Service
 * Manages the assignment workflow of guides to bookings
 *
 * Model: Guides are assigned to individual bookings, but can handle
 * multiple bookings on the same schedule (shared guide pool).
 * The schedule's guidesAssigned count tracks unique confirmed guides
 * across all its bookings.
 */
export class GuideAssignmentService extends BaseService {
  /**
   * Get all assignments for a specific booking
   */
  async getAssignmentsForBooking(
    bookingId: string
  ): Promise<GuideAssignmentWithRelations[]> {
    return this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.bookingId, bookingId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
      orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
    });
  }

  /**
   * Get all assignments for a specific schedule (across all its bookings)
   */
  async getAssignmentsForSchedule(
    scheduleId: string
  ): Promise<GuideAssignmentWithRelations[]> {
    // First get all booking IDs for this schedule
    const scheduleBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.scheduleId, scheduleId),
        eq(bookings.organizationId, this.organizationId)
      ),
      columns: { id: true },
    });

    if (scheduleBookings.length === 0) {
      return [];
    }

    const bookingIds = scheduleBookings.map((b) => b.id);

    return this.db.query.guideAssignments.findMany({
      where: and(
        inArray(guideAssignments.bookingId, bookingIds),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
      orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
    });
  }

  /**
   * Get all assignments for a "tour run" (availability-based bookings)
   * A tour run is a virtual grouping of tourId + date + time
   */
  async getAssignmentsForTourRun(
    tourId: string,
    date: Date,
    time: string
  ): Promise<GuideAssignmentWithRelations[]> {
    const dateStr = date.toISOString().split("T")[0];

    // First get all booking IDs for this tour run
    const tourRunBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.tourId, tourId),
        sql`${bookings.bookingDate}::text = ${dateStr}`,
        eq(bookings.bookingTime, time),
        eq(bookings.organizationId, this.organizationId),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      columns: { id: true },
    });

    if (tourRunBookings.length === 0) {
      return [];
    }

    const bookingIds = tourRunBookings.map((b) => b.id);

    return this.db.query.guideAssignments.findMany({
      where: and(
        inArray(guideAssignments.bookingId, bookingIds),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
      orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
    });
  }

  /**
   * Get all assignments for a specific guide
   */
  async getAssignmentsForGuide(
    guideId: string,
    filters: GuideAssignmentFilters = {}
  ): Promise<GuideAssignmentWithRelations[]> {
    const conditions = [
      eq(guideAssignments.guideId, guideId),
      eq(guideAssignments.organizationId, this.organizationId),
    ];

    if (filters.status) {
      conditions.push(eq(guideAssignments.status, filters.status));
    }

    const assignments = await this.db.query.guideAssignments.findMany({
      where: and(...conditions),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    }) as GuideAssignmentWithRelations[];

    // Filter by date range if provided (based on schedule start time)
    if (filters.dateRange) {
      return assignments.filter((assignment) => {
        const schedule = assignment.booking?.schedule;
        if (!schedule) return false;

        const startsAt = schedule.startsAt;

        if (filters.dateRange?.from && startsAt < filters.dateRange.from) {
          return false;
        }

        if (filters.dateRange?.to && startsAt > filters.dateRange.to) {
          return false;
        }

        return true;
      });
    }

    return assignments;
  }

  /**
   * Get a specific assignment by booking and guide
   */
  async getAssignment(
    bookingId: string,
    guideId: string
  ): Promise<GuideAssignmentWithRelations> {
    const assignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.bookingId, bookingId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError(
        "Guide assignment",
        `bookingId=${bookingId}, guideId=${guideId}`
      );
    }

    return assignment;
  }

  /**
   * Get an assignment by its ID
   */
  async getById(id: string): Promise<GuideAssignmentWithRelations> {
    const assignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.id, id),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
    }) as GuideAssignmentWithRelations | undefined;

    if (!assignment) {
      throw new NotFoundError("Guide assignment", id);
    }

    return assignment;
  }

  /**
   * Create a new assignment (status = pending)
   * Supports both schedule-based and availability-based bookings.
   */
  async createAssignment(
    input: CreateGuideAssignmentInput
  ): Promise<GuideAssignment> {
    // Verify booking exists and belongs to organization
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Determine booking model and get time window for conflict detection
    let startsAt: Date;
    let endsAt: Date;
    let excludeScheduleId: string | undefined;

    if (booking.scheduleId) {
      // ========== SCHEDULE-BASED BOOKING ==========
      const schedule = await this.db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, booking.scheduleId),
          eq(schedules.organizationId, this.organizationId)
        ),
      });

      if (!schedule) {
        throw new ValidationError("Booking has no associated schedule");
      }

      startsAt = schedule.startsAt;
      endsAt = schedule.endsAt;
      excludeScheduleId = booking.scheduleId;

    } else if (booking.tourId && booking.bookingDate && booking.bookingTime) {
      // ========== AVAILABILITY-BASED BOOKING ==========
      // Get tour for duration
      const tour = await this.db.query.tours.findFirst({
        where: and(
          eq(tours.id, booking.tourId),
          eq(tours.organizationId, this.organizationId)
        ),
      });

      if (!tour) {
        throw new ValidationError("Booking tour not found");
      }

      // Calculate time window from booking date + time + tour duration
      const [hours, minutes] = booking.bookingTime.split(":").map(Number);
      startsAt = new Date(booking.bookingDate);
      startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const durationMinutes = tour.durationMinutes || 60; // Default 1 hour
      endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      // No scheduleId to exclude for tour run conflict detection
      excludeScheduleId = undefined;

    } else {
      throw new ValidationError(
        "Booking must have either scheduleId (schedule-based) or tourId+bookingDate+bookingTime (availability-based)"
      );
    }

    // Verify guide exists and belongs to organization
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, input.guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", input.guideId);
    }

    // Check if assignment already exists for this booking-guide pair
    const existing = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.bookingId, input.bookingId),
        eq(guideAssignments.guideId, input.guideId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(
        `Guide is already assigned to this booking with status: ${existing.status}`
      );
    }

    // Check for scheduling conflicts
    // For availability-based, also pass tour run info to exclude same tour run from conflict
    const hasConflict = await this.hasConflictAdvanced(
      input.guideId,
      startsAt,
      endsAt,
      excludeScheduleId,
      booking.scheduleId ? undefined : {
        tourId: booking.tourId!,
        bookingDate: booking.bookingDate!,
        bookingTime: booking.bookingTime!,
      }
    );

    if (hasConflict) {
      throw new ConflictError(
        "Guide has a conflicting assignment during this time"
      );
    }

    const [assignment] = await this.db
      .insert(guideAssignments)
      .values({
        organizationId: this.organizationId,
        bookingId: input.bookingId,
        guideId: input.guideId,
        status: "pending",
        notes: input.notes,
        assignedAt: new Date(),
      })
      .returning();

    if (!assignment) {
      throw new Error("Failed to create guide assignment");
    }

    return assignment;
  }

  /**
   * Confirm an assignment (guide accepts)
   * Updates status to 'confirmed' and syncs schedule's guidesAssigned count
   */
  async confirmAssignment(id: string): Promise<GuideAssignment> {
    const assignment = await this.getById(id);

    if (assignment.status === "confirmed") {
      throw new ValidationError("Assignment is already confirmed");
    }

    if (assignment.status === "declined") {
      throw new ValidationError("Cannot confirm a declined assignment");
    }

    const schedule = assignment.booking?.schedule;
    if (!schedule) {
      throw new Error("Assignment booking/schedule not found");
    }

    // Check for conflicts only for insourced guides (outsourced guides don't have guideId)
    if (assignment.guideId) {
      const hasConflict = await this.hasConflict(
        assignment.guideId,
        schedule.startsAt,
        schedule.endsAt,
        schedule.id
      );

      if (hasConflict) {
        throw new ConflictError(
          "Guide has a conflicting schedule during this time"
        );
      }
    }

    // Update assignment status
    const [updated] = await this.db
      .update(guideAssignments)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guideAssignments.id, id),
          eq(guideAssignments.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Guide assignment", id);
    }

    // Sync the guidesAssigned count for the schedule
    await this.syncGuidesAssignedCount(schedule.id);

    return updated;
  }

  /**
   * Sync guidesAssigned count on schedule from confirmed assignments
   * Counts UNIQUE guides with confirmed assignments across all bookings for this schedule
   * Includes both insourced guides (by guideId) and outsourced guides (by name)
   */
  private async syncGuidesAssignedCount(scheduleId: string): Promise<void> {
    // Get all bookings for this schedule
    const scheduleBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.scheduleId, scheduleId),
        eq(bookings.organizationId, this.organizationId)
      ),
      columns: { id: true },
    });

    if (scheduleBookings.length === 0) {
      // No bookings, set guidesAssigned to 0
      await this.db
        .update(schedules)
        .set({
          guidesAssigned: 0,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, this.organizationId)
          )
        );
      return;
    }

    const bookingIds = scheduleBookings.map((b) => b.id);

    // Count unique confirmed insourced guides (by guideId)
    const insourcedResult = await this.db
      .select({ count: sql<number>`count(distinct ${guideAssignments.guideId})::int` })
      .from(guideAssignments)
      .where(
        and(
          inArray(guideAssignments.bookingId, bookingIds),
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          sql`${guideAssignments.guideId} is not null`
        )
      );

    // Count unique confirmed outsourced guides (by name)
    const outsourcedResult = await this.db
      .select({ count: sql<number>`count(distinct ${guideAssignments.outsourcedGuideName})::int` })
      .from(guideAssignments)
      .where(
        and(
          inArray(guideAssignments.bookingId, bookingIds),
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          sql`${guideAssignments.outsourcedGuideName} is not null`
        )
      );

    const insourcedCount = insourcedResult[0]?.count ?? 0;
    const outsourcedCount = outsourcedResult[0]?.count ?? 0;
    const guidesAssigned = insourcedCount + outsourcedCount;

    await this.db
      .update(schedules)
      .set({
        guidesAssigned,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schedules.id, scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Decline an assignment (guide rejects)
   * Updates status to 'declined'
   */
  async declineAssignment(
    id: string,
    reason?: string
  ): Promise<GuideAssignment> {
    const assignment = await this.getById(id);

    if (assignment.status === "declined") {
      throw new ValidationError("Assignment is already declined");
    }

    if (assignment.status === "confirmed") {
      throw new ValidationError(
        "Cannot decline a confirmed assignment. Cancel it instead."
      );
    }

    const [updated] = await this.db
      .update(guideAssignments)
      .set({
        status: "declined",
        declinedAt: new Date(),
        declineReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guideAssignments.id, id),
          eq(guideAssignments.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Guide assignment", id);
    }

    return updated;
  }

  /**
   * Cancel an assignment (admin cancels)
   * Deletes the assignment and syncs guidesAssigned if it was confirmed
   */
  async cancelAssignment(id: string): Promise<void> {
    const assignment = await this.getById(id);
    const wasConfirmed = assignment.status === "confirmed";
    const scheduleId = assignment.booking?.scheduleId;

    // Delete the assignment
    await this.db
      .delete(guideAssignments)
      .where(
        and(
          eq(guideAssignments.id, id),
          eq(guideAssignments.organizationId, this.organizationId)
        )
      );

    // Sync the guidesAssigned count if was confirmed
    if (wasConfirmed && scheduleId) {
      await this.syncGuidesAssignedCount(scheduleId);
    }
  }

  /**
   * Get all pending assignments for a guide
   */
  async getPendingAssignmentsForGuide(
    guideId: string
  ): Promise<GuideAssignmentWithRelations[]> {
    return this.getAssignmentsForGuide(guideId, { status: "pending" });
  }

  /**
   * Get all confirmed assignments for a guide
   */
  async getConfirmedAssignmentsForGuide(
    guideId: string,
    dateRange?: DateRangeFilter
  ): Promise<GuideAssignmentWithRelations[]> {
    return this.getAssignmentsForGuide(guideId, {
      status: "confirmed",
      dateRange,
    });
  }

  /**
   * Check if a guide has a scheduling conflict
   * A guide can be assigned to multiple bookings on the SAME schedule (no conflict),
   * but cannot be assigned to overlapping DIFFERENT schedules.
   */
  async hasConflict(
    guideId: string,
    startsAt: Date,
    endsAt: Date,
    excludeScheduleId?: string
  ): Promise<boolean> {
    // Verify guide belongs to this organization
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }

    // Find all confirmed assignments for this guide
    const confirmedAssignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed")
      ),
      with: {
        booking: {
          with: {
            schedule: true,
          },
        },
      },
    }) as GuideAssignmentWithRelations[];

    // Check if any confirmed assignment is for an overlapping schedule
    for (const assignment of confirmedAssignments) {
      const schedule = assignment.booking?.schedule;
      if (!schedule) continue;

      // Skip if same schedule (guide can handle multiple bookings on same schedule)
      if (excludeScheduleId && schedule.id === excludeScheduleId) continue;

      // Check for time overlap: startA < endB AND endA > startB
      if (schedule.startsAt < endsAt && schedule.endsAt > startsAt) {
        return true;
      }
    }

    return false;
  }

  /**
   * Advanced conflict detection that handles both schedule-based and tour run-based bookings.
   * A guide can be assigned to multiple bookings on the SAME schedule or SAME tour run (no conflict),
   * but cannot be assigned to overlapping DIFFERENT schedules/tour runs.
   */
  async hasConflictAdvanced(
    guideId: string,
    startsAt: Date,
    endsAt: Date,
    excludeScheduleId?: string,
    excludeTourRun?: { tourId: string; bookingDate: Date; bookingTime: string }
  ): Promise<boolean> {
    // Verify guide belongs to this organization
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }

    // Find all confirmed assignments for this guide with booking details
    const confirmedAssignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed")
      ),
      with: {
        booking: {
          with: {
            schedule: true,
          },
        },
      },
    }) as GuideAssignmentWithRelations[];

    const excludeTourRunKey = excludeTourRun
      ? `${excludeTourRun.tourId}|${excludeTourRun.bookingDate.toISOString().split("T")[0]}|${excludeTourRun.bookingTime}`
      : null;

    // Check if any confirmed assignment overlaps
    for (const assignment of confirmedAssignments) {
      const booking = assignment.booking;
      if (!booking) continue;

      let assignmentStartsAt: Date;
      let assignmentEndsAt: Date;

      if (booking.schedule) {
        // Schedule-based assignment
        const schedule = booking.schedule;

        // Skip if same schedule (guide can handle multiple bookings on same schedule)
        if (excludeScheduleId && schedule.id === excludeScheduleId) continue;

        assignmentStartsAt = schedule.startsAt;
        assignmentEndsAt = schedule.endsAt;
      } else if (booking.tourId && booking.bookingDate && booking.bookingTime) {
        // Tour run-based assignment
        const tourRunKey = `${booking.tourId}|${booking.bookingDate.toISOString().split("T")[0]}|${booking.bookingTime}`;

        // Skip if same tour run (guide can handle multiple bookings on same tour run)
        if (excludeTourRunKey && tourRunKey === excludeTourRunKey) continue;

        // Get tour for duration (fetch once per unique tour)
        const tour = await this.db.query.tours.findFirst({
          where: and(
            eq(tours.id, booking.tourId),
            eq(tours.organizationId, this.organizationId)
          ),
        });

        if (!tour) continue;

        const [hours, minutes] = booking.bookingTime.split(":").map(Number);
        assignmentStartsAt = new Date(booking.bookingDate);
        assignmentStartsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        const durationMinutes = tour.durationMinutes || 60;
        assignmentEndsAt = new Date(assignmentStartsAt.getTime() + durationMinutes * 60 * 1000);
      } else {
        // Unknown booking model, skip
        continue;
      }

      // Check for time overlap: startA < endB AND endA > startB
      if (assignmentStartsAt < endsAt && assignmentEndsAt > startsAt) {
        return true;
      }
    }

    return false;
  }

  /**
   * Assign a guide to a booking (full flow)
   * Creates assignment and optionally auto-confirms it
   */
  async assignGuideToBooking(
    bookingId: string,
    guideId: string,
    options: { autoConfirm?: boolean; notes?: string } = {}
  ): Promise<GuideAssignment> {
    // Create the assignment
    const assignment = await this.createAssignment({
      bookingId,
      guideId,
      notes: options.notes,
    });

    // Auto-confirm if requested
    if (options.autoConfirm) {
      return this.confirmAssignment(assignment.id);
    }

    return assignment;
  }

  /**
   * Assign an outsourced guide to a booking
   * Creates assignment with outsourced guide info instead of guideId
   * Outsourced guides are external/freelance guides not in the system
   * Supports both schedule-based and availability-based bookings.
   */
  async assignOutsourcedGuideToBooking(
    input: CreateOutsourcedGuideAssignmentInput,
    options: { autoConfirm?: boolean } = {}
  ): Promise<GuideAssignment> {
    // Verify booking exists and belongs to organization
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Determine booking model
    let scheduleId: string | null = null;

    if (booking.scheduleId) {
      // Schedule-based booking
      const schedule = await this.db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, booking.scheduleId),
          eq(schedules.organizationId, this.organizationId)
        ),
      });

      if (!schedule) {
        throw new ValidationError("Booking has no associated schedule");
      }

      scheduleId = schedule.id;
    } else if (!booking.tourId || !booking.bookingDate || !booking.bookingTime) {
      // Neither schedule-based nor availability-based
      throw new ValidationError(
        "Booking must have either scheduleId (schedule-based) or tourId+bookingDate+bookingTime (availability-based)"
      );
    }
    // For availability-based bookings, scheduleId remains null

    // Check if outsourced guide with same name already assigned to this booking
    const existing = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.bookingId, input.bookingId),
        eq(guideAssignments.outsourcedGuideName, input.outsourcedGuideName),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(
        `Outsourced guide "${input.outsourcedGuideName}" is already assigned to this booking`
      );
    }

    // Create the assignment for outsourced guide (no guideId)
    const [assignment] = await this.db
      .insert(guideAssignments)
      .values({
        organizationId: this.organizationId,
        bookingId: input.bookingId,
        guideId: null, // Outsourced guides don't have a system guideId
        outsourcedGuideName: input.outsourcedGuideName,
        outsourcedGuideContact: input.outsourcedGuideContact,
        status: options.autoConfirm ? "confirmed" : "pending",
        notes: input.notes,
        assignedAt: new Date(),
        confirmedAt: options.autoConfirm ? new Date() : null,
      })
      .returning();

    if (!assignment) {
      throw new Error("Failed to create outsourced guide assignment");
    }

    // Sync the guidesAssigned count for schedule-based bookings if auto-confirmed
    // (Availability-based bookings don't have a schedule to sync)
    if (options.autoConfirm && scheduleId) {
      await this.syncGuidesAssignedCount(scheduleId);
    }

    return assignment;
  }

  /**
   * Reassign a booking to a new guide
   * Cancels old assignment and creates new one
   */
  async reassignBooking(
    bookingId: string,
    newGuideId: string,
    options: { autoConfirm?: boolean; notes?: string } = {}
  ): Promise<GuideAssignment> {
    // Find existing confirmed assignment for this booking
    const existingAssignments = await this.getAssignmentsForBooking(bookingId);

    const confirmedAssignment = existingAssignments.find(
      (a) => a.status === "confirmed"
    );

    // Cancel existing confirmed assignment if exists
    if (confirmedAssignment) {
      await this.cancelAssignment(confirmedAssignment.id);
    }

    // Create new assignment
    return this.assignGuideToBooking(bookingId, newGuideId, options);
  }

  /**
   * Get assignment statistics for a guide
   */
  async getGuideAssignmentStats(guideId: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    declined: number;
  }> {
    const assignments = await this.getAssignmentsForGuide(guideId);

    return {
      total: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      confirmed: assignments.filter((a) => a.status === "confirmed").length,
      declined: assignments.filter((a) => a.status === "declined").length,
    };
  }

  /**
   * Get all confirmed assignments for upcoming schedules
   */
  async getUpcomingAssignments(
    guideId: string,
    limit = 10
  ): Promise<GuideAssignmentWithRelations[]> {
    const now = new Date();

    const assignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.status, "confirmed")
      ),
      with: {
        guide: true,
        booking: {
          with: {
            schedule: {
              with: {
                tour: true,
              },
            },
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    }) as GuideAssignmentWithRelations[];

    // Filter for upcoming schedules and limit
    return assignments
      .filter((a) => {
        const schedule = a.booking?.schedule;
        return schedule && schedule.startsAt > now;
      })
      .sort((a, b) => {
        const scheduleA = a.booking?.schedule;
        const scheduleB = b.booking?.schedule;
        if (!scheduleA || !scheduleB) return 0;
        return scheduleA.startsAt.getTime() - scheduleB.startsAt.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Get unique confirmed guides for a schedule
   */
  async getConfirmedGuidesForSchedule(scheduleId: string): Promise<Guide[]> {
    const assignments = await this.getAssignmentsForSchedule(scheduleId);

    const confirmedGuides = new Map<string, Guide>();
    for (const assignment of assignments) {
      if (assignment.status === "confirmed" && assignment.guide) {
        confirmedGuides.set(assignment.guide.id, assignment.guide);
      }
    }

    return Array.from(confirmedGuides.values());
  }
}
