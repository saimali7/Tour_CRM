import { eq, and, sql, inArray } from "drizzle-orm";
import {
  guideAssignments,
  bookings,
  guides,
  tours,
  type GuideAssignment,
  type GuideAssignmentStatus,
  type Booking,
  type Guide,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type DateRangeFilter,
  NotFoundError,
  ConflictError,
  ValidationError,
  ServiceError,
} from "./types";
import { createServiceLogger } from "./lib/logger";

export interface GuideAssignmentFilters {
  status?: GuideAssignmentStatus;
  dateRange?: DateRangeFilter;
}

export interface GuideAssignmentWithRelations extends GuideAssignment {
  booking?: (Booking & {
    tour?: Tour | null;
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

type ExperienceMode = "join" | "book" | "charter" | null;

function parseExperienceMode(pricingSnapshot: unknown): ExperienceMode {
  if (!pricingSnapshot || typeof pricingSnapshot !== "object") return null;
  const mode = (pricingSnapshot as { experienceMode?: unknown }).experienceMode;
  if (mode === "join" || mode === "book" || mode === "charter") {
    return mode;
  }
  return null;
}

/**
 * Guide Assignment Service
 * Manages the assignment workflow of guides to bookings
 *
 * Model: Guides are assigned to individual bookings based on tour runs
 * (tourId + date + time). A guide can handle multiple bookings on the
 * same tour run (shared guide pool).
 */
export class GuideAssignmentService extends BaseService {
  private logger = createServiceLogger("guide-assignment", this.organizationId);
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
            tour: true,
          },
        },
      },
      orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
    });
  }

  /**
   * Get all assignments for a "tour run"
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
            tour: true,
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
            tour: true,
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    }) as GuideAssignmentWithRelations[];

    // Filter by date range if provided (based on booking date)
    if (filters.dateRange) {
      return assignments.filter((assignment) => {
        const bookingDate = assignment.booking?.bookingDate;
        if (!bookingDate) return false;

        if (filters.dateRange?.from && bookingDate < filters.dateRange.from) {
          return false;
        }

        if (filters.dateRange?.to && bookingDate > filters.dateRange.to) {
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
            tour: true,
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
            tour: true,
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
   * Uses availability-based bookings (tourId + date + time).
   */
  async createAssignment(
    input: CreateGuideAssignmentInput
  ): Promise<GuideAssignment> {
    this.logger.info(
      { bookingId: input.bookingId, guideId: input.guideId },
      "Creating guide assignment"
    );

    // Verify booking exists and belongs to organization
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      this.logger.warn({ bookingId: input.bookingId }, "Guide assignment failed: booking not found");
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Validate booking has required tour run info
    if (!booking.tourId || !booking.bookingDate || !booking.bookingTime) {
      throw new ValidationError(
        "Booking must have tourId, bookingDate, and bookingTime"
      );
    }

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
    const startsAt = new Date(booking.bookingDate);
    startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    const durationMinutes = tour.durationMinutes || 60; // Default 1 hour
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

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

    const guideCapacity = Math.max(guide.vehicleCapacity ?? 6, 1);
    const exceedsRunCapacity = await this.wouldExceedRunCapacity({
      guideId: guide.id,
      vehicleCapacity: guideCapacity,
      tourId: booking.tourId,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      incomingGuestCount: booking.totalParticipants ?? 0,
      excludeBookingId: booking.id,
    });

    if (exceedsRunCapacity) {
      throw new ConflictError(
        `Guide capacity exceeded for this run (${booking.bookingTime}).`
      );
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
    const hasConflict = await this.hasConflictForTourRun(
      input.guideId,
      startsAt,
      endsAt,
      {
        bookingId: booking.id,
        experienceMode: parseExperienceMode(booking.pricingSnapshot),
        tourId: booking.tourId,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
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
      this.logger.error(
        { bookingId: input.bookingId, guideId: input.guideId },
        "Failed to create guide assignment"
      );
      throw new ServiceError("Failed to create guide assignment", "CREATE_FAILED", 500);
    }

    this.logger.info(
      {
        assignmentId: assignment.id,
        bookingId: input.bookingId,
        guideId: input.guideId,
        tourId: booking.tourId,
        bookingDate: booking.bookingDate?.toISOString().split("T")[0],
        bookingTime: booking.bookingTime,
      },
      "Guide assignment created successfully"
    );

    return assignment;
  }

  /**
   * Confirm an assignment (guide accepts)
   * Updates status to 'confirmed'
   */
  async confirmAssignment(id: string): Promise<GuideAssignment> {
    const assignment = await this.getById(id);

    if (assignment.status === "confirmed") {
      throw new ValidationError("Assignment is already confirmed");
    }

    if (assignment.status === "declined") {
      throw new ValidationError("Cannot confirm a declined assignment");
    }

    const booking = assignment.booking;
    if (!booking || !booking.tourId || !booking.bookingDate || !booking.bookingTime) {
      throw new ValidationError("Assignment booking not found or missing tour run info");
    }

    // Check for conflicts only for insourced guides (outsourced guides don't have guideId)
    if (assignment.guideId) {
      const guide = await this.db.query.guides.findFirst({
        where: and(
          eq(guides.id, assignment.guideId),
          eq(guides.organizationId, this.organizationId)
        ),
      });

      if (!guide) {
        throw new ValidationError("Guide not found");
      }

      const guideCapacity = Math.max(guide.vehicleCapacity ?? 6, 1);
      const exceedsRunCapacity = await this.wouldExceedRunCapacity({
        guideId: assignment.guideId,
        vehicleCapacity: guideCapacity,
        tourId: booking.tourId,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        incomingGuestCount: booking.totalParticipants ?? 0,
        excludeBookingId: booking.id,
      });

      if (exceedsRunCapacity) {
        throw new ConflictError(
          `Guide capacity exceeded for this run (${booking.bookingTime}).`
        );
      }

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

      // Calculate time window
      const [hours, minutes] = booking.bookingTime.split(":").map(Number);
      const startsAt = new Date(booking.bookingDate);
      startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const durationMinutes = tour.durationMinutes || 60;
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      const hasConflict = await this.hasConflictForTourRun(
        assignment.guideId,
        startsAt,
        endsAt,
        {
          bookingId: booking.id,
          experienceMode: parseExperienceMode(booking.pricingSnapshot),
          tourId: booking.tourId,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
        }
      );

      if (hasConflict) {
        throw new ConflictError(
          "Guide has a conflicting assignment during this time"
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

    return updated;
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
   * Deletes the assignment
   */
  async cancelAssignment(id: string): Promise<void> {
    // Verify assignment exists
    await this.getById(id);

    // Delete the assignment
    await this.db
      .delete(guideAssignments)
      .where(
        and(
          eq(guideAssignments.id, id),
          eq(guideAssignments.organizationId, this.organizationId)
        )
      );
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
   * Check if a guide has a scheduling conflict for a tour run.
   * A guide can be assigned to multiple bookings on the SAME shared tour run,
   * but charter runs are exclusive and block that timeslot for the guide.
   * Guides cannot be assigned to overlapping DIFFERENT tour runs.
   */
  async hasConflictForTourRun(
    guideId: string,
    startsAt: Date,
    endsAt: Date,
    excludeTourRun: {
      bookingId?: string;
      experienceMode?: ExperienceMode;
      tourId: string;
      bookingDate: Date;
      bookingTime: string;
    }
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
            tour: true,
          },
        },
      },
    }) as GuideAssignmentWithRelations[];

    const excludeTourRunKey = `${excludeTourRun.tourId}|${excludeTourRun.bookingDate.toISOString().split("T")[0]}|${excludeTourRun.bookingTime}`;

    // Check if any confirmed assignment overlaps
    for (const assignment of confirmedAssignments) {
      const booking = assignment.booking;
      if (!booking || !booking.tourId || !booking.bookingDate || !booking.bookingTime) continue;

      // Build tour run key for comparison
      const tourRunKey = `${booking.tourId}|${booking.bookingDate.toISOString().split("T")[0]}|${booking.bookingTime}`;

      // Same run is usually allowed (shared tours), but charter blocks the slot.
      if (tourRunKey === excludeTourRunKey) {
        if (excludeTourRun.bookingId && booking.id === excludeTourRun.bookingId) {
          continue;
        }
        const existingMode = parseExperienceMode(booking.pricingSnapshot);
        const incomingIsCharter = excludeTourRun.experienceMode === "charter";
        const existingIsCharter = existingMode === "charter";
        if (incomingIsCharter || existingIsCharter) {
          return true;
        }
        continue;
      }

      // Get tour for duration
      const tour = booking.tour;
      if (!tour) continue;

      const [hours, minutes] = booking.bookingTime.split(":").map(Number);
      const assignmentStartsAt = new Date(booking.bookingDate);
      assignmentStartsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const durationMinutes = tour.durationMinutes || 60;
      const assignmentEndsAt = new Date(assignmentStartsAt.getTime() + durationMinutes * 60 * 1000);

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

    // Validate booking has required tour run info
    if (!booking.tourId || !booking.bookingDate || !booking.bookingTime) {
      throw new ValidationError(
        "Booking must have tourId, bookingDate, and bookingTime"
      );
    }

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
      throw new ServiceError("Failed to create outsourced guide assignment", "CREATE_FAILED", 500);
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
   * Get all confirmed assignments for upcoming tour runs
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
            tour: true,
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    }) as GuideAssignmentWithRelations[];

    // Filter for upcoming bookings and limit
    return assignments
      .filter((a) => {
        const booking = a.booking;
        if (!booking?.bookingDate || !booking?.bookingTime) return false;

        const [hours, minutes] = booking.bookingTime.split(":").map(Number);
        const startsAt = new Date(booking.bookingDate);
        startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        return startsAt > now;
      })
      .sort((a, b) => {
        const bookingA = a.booking;
        const bookingB = b.booking;
        if (!bookingA?.bookingDate || !bookingA?.bookingTime) return 0;
        if (!bookingB?.bookingDate || !bookingB?.bookingTime) return 0;

        const [hoursA, minutesA] = bookingA.bookingTime.split(":").map(Number);
        const startsAtA = new Date(bookingA.bookingDate);
        startsAtA.setHours(hoursA ?? 0, minutesA ?? 0, 0, 0);

        const [hoursB, minutesB] = bookingB.bookingTime.split(":").map(Number);
        const startsAtB = new Date(bookingB.bookingDate);
        startsAtB.setHours(hoursB ?? 0, minutesB ?? 0, 0, 0);

        return startsAtA.getTime() - startsAtB.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Get unique confirmed guides for a tour run
   */
  async getConfirmedGuidesForTourRun(
    tourId: string,
    date: Date,
    time: string
  ): Promise<Guide[]> {
    const assignments = await this.getAssignmentsForTourRun(tourId, date, time);

    const confirmedGuides = new Map<string, Guide>();
    for (const assignment of assignments) {
      if (assignment.status === "confirmed" && assignment.guide) {
        confirmedGuides.set(assignment.guide.id, assignment.guide);
      }
    }

    return Array.from(confirmedGuides.values());
  }

  private async wouldExceedRunCapacity(input: {
    guideId: string;
    vehicleCapacity: number;
    tourId: string;
    bookingDate: Date;
    bookingTime: string;
    incomingGuestCount: number;
    excludeBookingId?: string;
  }): Promise<boolean> {
    const runBookings = await this.db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.organizationId),
        eq(bookings.tourId, input.tourId),
        eq(bookings.bookingDate, input.bookingDate),
        eq(bookings.bookingTime, input.bookingTime),
        inArray(bookings.status, ["pending", "confirmed"])
      ),
      columns: {
        id: true,
        totalParticipants: true,
      },
    });

    const runBookingIds = runBookings.map((booking) => booking.id);
    if (runBookingIds.length === 0) {
      return input.incomingGuestCount > input.vehicleCapacity;
    }

    const confirmedAssignments = await this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.organizationId, this.organizationId),
        eq(guideAssignments.guideId, input.guideId),
        eq(guideAssignments.status, "confirmed"),
        inArray(guideAssignments.bookingId, runBookingIds)
      ),
      columns: {
        bookingId: true,
      },
    });

    const assignedBookingIds = new Set(
      confirmedAssignments
        .map((assignment) => assignment.bookingId)
        .filter((bookingId) => bookingId !== input.excludeBookingId)
    );

    let assignedGuests = 0;
    for (const booking of runBookings) {
      if (assignedBookingIds.has(booking.id)) {
        assignedGuests += booking.totalParticipants ?? 0;
      }
    }

    return assignedGuests + input.incomingGuestCount > input.vehicleCapacity;
  }
}
