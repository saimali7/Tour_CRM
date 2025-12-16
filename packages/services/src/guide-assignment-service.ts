import { eq, and, sql } from "drizzle-orm";
import {
  guideAssignments,
  schedules,
  guides,
  type GuideAssignment,
  type GuideAssignmentStatus,
} from "@tour/database";
import type { tours } from "@tour/database";
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
  schedule?: (typeof schedules.$inferSelect & {
    tour?: typeof tours.$inferSelect;
  }) | null;
  guide?: typeof guides.$inferSelect | null;
}

export interface CreateGuideAssignmentInput {
  scheduleId: string;
  guideId: string;
  notes?: string;
}

/**
 * Guide Assignment Service
 * Manages the assignment workflow of guides to schedules
 */
export class GuideAssignmentService extends BaseService {
  /**
   * Get all assignments for a specific schedule
   */
  async getAssignmentsForSchedule(
    scheduleId: string
  ): Promise<GuideAssignmentWithRelations[]> {
    return this.db.query.guideAssignments.findMany({
      where: and(
        eq(guideAssignments.scheduleId, scheduleId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        schedule: {
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

    // For date range filtering, we need to join with schedules
    const assignments = await this.db.query.guideAssignments.findMany({
      where: and(...conditions),
      with: {
        guide: true,
        schedule: {
          with: {
            tour: true,
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    });

    // Filter by date range if provided
    if (filters.dateRange) {
      return assignments.filter((assignment) => {
        if (!assignment.schedule) return false;

        const startsAt = assignment.schedule.startsAt;

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
   * Get a specific assignment by schedule and guide
   */
  async getAssignment(
    scheduleId: string,
    guideId: string
  ): Promise<GuideAssignmentWithRelations> {
    const assignment = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.scheduleId, scheduleId),
        eq(guideAssignments.guideId, guideId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
        schedule: {
          with: {
            tour: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError(
        "Guide assignment",
        `scheduleId=${scheduleId}, guideId=${guideId}`
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
        schedule: {
          with: {
            tour: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError("Guide assignment", id);
    }

    return assignment;
  }

  /**
   * Create a new assignment (status = pending)
   */
  async createAssignment(
    input: CreateGuideAssignmentInput
  ): Promise<GuideAssignment> {
    // Verify schedule exists and belongs to organization
    const schedule = await this.db.query.schedules.findFirst({
      where: and(
        eq(schedules.id, input.scheduleId),
        eq(schedules.organizationId, this.organizationId)
      ),
    });

    if (!schedule) {
      throw new NotFoundError("Schedule", input.scheduleId);
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

    // Check if assignment already exists
    const existing = await this.db.query.guideAssignments.findFirst({
      where: and(
        eq(guideAssignments.scheduleId, input.scheduleId),
        eq(guideAssignments.guideId, input.guideId),
        eq(guideAssignments.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(
        `Guide is already assigned to this schedule with status: ${existing.status}`
      );
    }

    // Check for scheduling conflicts
    const hasConflict = await this.hasConflict(
      input.guideId,
      schedule.startsAt,
      schedule.endsAt,
      input.scheduleId
    );

    if (hasConflict) {
      throw new ConflictError(
        "Guide has a conflicting schedule during this time"
      );
    }

    const [assignment] = await this.db
      .insert(guideAssignments)
      .values({
        organizationId: this.organizationId,
        scheduleId: input.scheduleId,
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
   * Updates status to 'confirmed' and sets schedule.guideId
   */
  async confirmAssignment(id: string): Promise<GuideAssignment> {
    const assignment = await this.getById(id);

    if (assignment.status === "confirmed") {
      throw new ValidationError("Assignment is already confirmed");
    }

    if (assignment.status === "declined") {
      throw new ValidationError("Cannot confirm a declined assignment");
    }

    if (!assignment.schedule) {
      throw new Error("Assignment schedule not found");
    }

    // Check for conflicts again (in case something changed)
    const hasConflict = await this.hasConflict(
      assignment.guideId,
      assignment.schedule.startsAt,
      assignment.schedule.endsAt,
      assignment.scheduleId
    );

    if (hasConflict) {
      throw new ConflictError(
        "Guide has a conflicting schedule during this time"
      );
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

    // Update schedule's guideId
    await this.db
      .update(schedules)
      .set({
        guideId: assignment.guideId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schedules.id, assignment.scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      );

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
   * Deletes the assignment and clears schedule.guideId if it was confirmed
   */
  async cancelAssignment(id: string): Promise<void> {
    const assignment = await this.getById(id);

    // If assignment was confirmed, clear the schedule's guideId
    if (assignment.status === "confirmed") {
      await this.db
        .update(schedules)
        .set({
          guideId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, assignment.scheduleId),
            eq(schedules.organizationId, this.organizationId)
          )
        );
    }

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
   * Check if a guide has a scheduling conflict
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

    const conditions = [
      eq(schedules.organizationId, this.organizationId),
      eq(schedules.guideId, guideId),
      eq(schedules.status, "scheduled"),
      sql`(${schedules.startsAt}, ${schedules.endsAt}) OVERLAPS (${startsAt}, ${endsAt})`,
    ];

    if (excludeScheduleId) {
      conditions.push(sql`${schedules.id} != ${excludeScheduleId}`);
    }

    const conflicting = await this.db
      .select({ id: schedules.id })
      .from(schedules)
      .where(and(...conditions))
      .limit(1);

    return conflicting.length > 0;
  }

  /**
   * Assign a guide to a schedule (full flow)
   * Creates assignment and optionally auto-confirms it
   */
  async assignGuideToSchedule(
    scheduleId: string,
    guideId: string,
    options: { autoConfirm?: boolean; notes?: string } = {}
  ): Promise<GuideAssignment> {
    // Create the assignment
    const assignment = await this.createAssignment({
      scheduleId,
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
   * Reassign a schedule to a new guide
   * Cancels old assignment and creates new one
   */
  async reassignSchedule(
    scheduleId: string,
    newGuideId: string,
    options: { autoConfirm?: boolean; notes?: string } = {}
  ): Promise<GuideAssignment> {
    // Find existing confirmed assignment for this schedule
    const existingAssignments = await this.getAssignmentsForSchedule(
      scheduleId
    );

    const confirmedAssignment = existingAssignments.find(
      (a) => a.status === "confirmed"
    );

    // Cancel existing confirmed assignment if exists
    if (confirmedAssignment) {
      await this.cancelAssignment(confirmedAssignment.id);
    }

    // Create new assignment
    return this.assignGuideToSchedule(scheduleId, newGuideId, options);
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
   * Get all assignments for upcoming schedules
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
        schedule: {
          with: {
            tour: true,
          },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.assignedAt)],
    });

    // Filter for upcoming schedules and limit
    return assignments
      .filter((a) => a.schedule && a.schedule.startsAt > now)
      .sort((a, b) => {
        if (!a.schedule || !b.schedule) return 0;
        return a.schedule.startsAt.getTime() - b.schedule.startsAt.getTime();
      })
      .slice(0, limit);
  }
}
