import { eq, and, sql, inArray } from "drizzle-orm";
import {
  tourGuideQualifications,
  tours,
  guides,
  bookings,
  guideAssignments,
  type TourGuideQualification,
  type Guide,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ConflictError, ValidationError } from "./types";

export interface QualificationWithGuide extends TourGuideQualification {
  guide: Guide;
}

export interface QualificationWithTour extends TourGuideQualification {
  tour: Tour;
}

export interface CreateQualificationInput {
  tourId: string;
  guideId: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateQualificationInput {
  isPrimary?: boolean;
  notes?: string;
}

export interface QualifiedGuideWithAvailability extends Guide {
  qualificationId: string;
  isPrimary: boolean;
  qualificationNotes?: string | null;
  isAvailable: boolean;
}

export class TourGuideQualificationService extends BaseService {
  /**
   * Get all guides qualified for a specific tour (with guide details)
   */
  async getQualificationsForTour(tourId: string): Promise<QualificationWithGuide[]> {
    // Verify tour exists and belongs to org
    await this.verifyTourOwnership(tourId);

    const qualifications = await this.db.query.tourGuideQualifications.findMany({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
      },
    });

    return qualifications;
  }

  /**
   * Get all tours a guide is qualified to lead (with tour details)
   */
  async getQualificationsForGuide(guideId: string): Promise<QualificationWithTour[]> {
    // Verify guide exists and belongs to org
    await this.verifyGuideOwnership(guideId);

    const qualifications = await this.db.query.tourGuideQualifications.findMany({
      where: and(
        eq(tourGuideQualifications.guideId, guideId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
      with: {
        tour: true,
      },
    });

    return qualifications;
  }

  /**
   * Add a qualification (guide can lead a tour)
   */
  async addQualification(input: CreateQualificationInput): Promise<TourGuideQualification> {
    const { tourId, guideId, isPrimary = false, notes } = input;

    // Verify both tour and guide exist and belong to org
    await Promise.all([
      this.verifyTourOwnership(tourId),
      this.verifyGuideOwnership(guideId),
    ]);

    // Check if qualification already exists
    const existing = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.guideId, guideId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(
        `Guide is already qualified for this tour (qualification ID: ${existing.id})`
      );
    }

    // If setting as primary, unset other primaries for this tour
    if (isPrimary) {
      await this.unsetOtherPrimaries(tourId);
    }

    const [qualification] = await this.db
      .insert(tourGuideQualifications)
      .values({
        organizationId: this.organizationId,
        tourId,
        guideId,
        isPrimary,
        notes,
      })
      .returning();

    if (!qualification) {
      throw new Error("Failed to create tour-guide qualification");
    }

    return qualification;
  }

  /**
   * Update a qualification
   */
  async updateQualification(
    id: string,
    input: UpdateQualificationInput
  ): Promise<TourGuideQualification> {
    // Get existing qualification
    const existing = await this.getById(id);

    // If setting as primary, unset other primaries for this tour
    if (input.isPrimary === true && !existing.isPrimary) {
      await this.unsetOtherPrimaries(existing.tourId, id);
    }

    const [qualification] = await this.db
      .update(tourGuideQualifications)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourGuideQualifications.id, id),
          eq(tourGuideQualifications.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!qualification) {
      throw new NotFoundError("Tour-Guide Qualification", id);
    }

    return qualification;
  }

  /**
   * Remove a qualification by ID
   */
  async removeQualification(id: string): Promise<void> {
    // Verify it exists and belongs to org
    await this.getById(id);

    await this.db
      .delete(tourGuideQualifications)
      .where(
        and(
          eq(tourGuideQualifications.id, id),
          eq(tourGuideQualifications.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Remove a qualification by tour and guide
   */
  async removeQualificationByTourAndGuide(tourId: string, guideId: string): Promise<void> {
    // Verify both tour and guide belong to org
    await Promise.all([
      this.verifyTourOwnership(tourId),
      this.verifyGuideOwnership(guideId),
    ]);

    const existing = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.guideId, guideId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
    });

    if (!existing) {
      throw new NotFoundError(
        "Tour-Guide Qualification",
        `tourId: ${tourId}, guideId: ${guideId}`
      );
    }

    await this.db
      .delete(tourGuideQualifications)
      .where(
        and(
          eq(tourGuideQualifications.tourId, tourId),
          eq(tourGuideQualifications.guideId, guideId),
          eq(tourGuideQualifications.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Set a guide as the primary guide for a tour (unsets other primaries)
   */
  async setPrimaryGuide(tourId: string, guideId: string): Promise<TourGuideQualification> {
    // Verify both tour and guide belong to org
    await Promise.all([
      this.verifyTourOwnership(tourId),
      this.verifyGuideOwnership(guideId),
    ]);

    // Check if qualification exists
    const existing = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.guideId, guideId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
    });

    if (!existing) {
      throw new NotFoundError(
        "Tour-Guide Qualification",
        `Guide ${guideId} is not qualified for tour ${tourId}. Add qualification first.`
      );
    }

    // Unset other primaries for this tour
    await this.unsetOtherPrimaries(tourId, existing.id);

    // Set this one as primary
    const [qualification] = await this.db
      .update(tourGuideQualifications)
      .set({
        isPrimary: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourGuideQualifications.id, existing.id),
          eq(tourGuideQualifications.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!qualification) {
      throw new Error("Failed to set primary guide");
    }

    return qualification;
  }

  /**
   * Get the primary guide for a tour
   */
  async getPrimaryGuideForTour(tourId: string): Promise<QualificationWithGuide | null> {
    // Verify tour exists and belongs to org
    await this.verifyTourOwnership(tourId);

    const qualification = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.isPrimary, true),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
      with: {
        guide: true,
      },
    });

    return qualification || null;
  }

  /**
   * Check if a guide is qualified to lead a tour
   */
  async isGuideQualifiedForTour(guideId: string, tourId: string): Promise<boolean> {
    // Verify both tour and guide belong to org
    await Promise.all([
      this.verifyTourOwnership(tourId),
      this.verifyGuideOwnership(guideId),
    ]);

    const qualification = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.tourId, tourId),
        eq(tourGuideQualifications.guideId, guideId),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
    });

    return !!qualification;
  }

  /**
   * Get qualified guides for scheduling - includes availability check
   * Returns guides who are:
   * 1. Qualified for the tour
   * 2. Active status
   * 3. Available at the specified time (not assigned to another tour run)
   */
  async getQualifiedGuidesForScheduling(
    tourId: string,
    startsAt: Date,
    endsAt: Date,
    excludeTourRun?: { tourId: string; date: Date; time: string }
  ): Promise<QualifiedGuideWithAvailability[]> {
    // Verify tour exists and belongs to org
    await this.verifyTourOwnership(tourId);

    // Get all qualified guides for this tour
    const qualifications = await this.getQualificationsForTour(tourId);

    // Filter for active guides only
    const activeQualifiedGuides = qualifications.filter(
      (q) => q.guide.status === "active"
    );

    if (activeQualifiedGuides.length === 0) {
      return [];
    }

    // Check availability for each guide via confirmed assignments
    const guideIds = activeQualifiedGuides.map((q) => q.guideId);

    // Get all confirmed assignments for these guides with booking info
    const confirmedAssignments = await this.db
      .select({
        guideId: guideAssignments.guideId,
        tourId: bookings.tourId,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        tourDurationMinutes: tours.durationMinutes,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          inArray(guideAssignments.guideId, guideIds),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      );

    // Build exclude key for tour run
    const excludeKey = excludeTourRun
      ? `${excludeTourRun.tourId}|${excludeTourRun.date.toISOString().split("T")[0]}|${excludeTourRun.time}`
      : null;

    // Find busy guides by checking for time overlaps
    const busyGuideIds = new Set<string>();

    for (const assignment of confirmedAssignments) {
      if (!assignment.guideId || !assignment.bookingDate || !assignment.bookingTime) continue;

      // Skip if this is the same tour run we're checking for
      const tourRunKey = `${assignment.tourId}|${assignment.bookingDate.toISOString().split("T")[0]}|${assignment.bookingTime}`;
      if (excludeKey && tourRunKey === excludeKey) continue;

      // Calculate assignment time window
      const [hours, minutes] = assignment.bookingTime.split(":").map(Number);
      const assignmentStart = new Date(assignment.bookingDate);
      assignmentStart.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const durationMinutes = assignment.tourDurationMinutes || 60;
      const assignmentEnd = new Date(assignmentStart.getTime() + durationMinutes * 60 * 1000);

      // Check for time overlap: startA < endB AND endA > startB
      if (assignmentStart < endsAt && assignmentEnd > startsAt) {
        busyGuideIds.add(assignment.guideId);
      }
    }

    // Map to response with availability flag
    return activeQualifiedGuides.map((q) => ({
      ...q.guide,
      qualificationId: q.id,
      isPrimary: q.isPrimary,
      qualificationNotes: q.notes,
      isAvailable: !busyGuideIds.has(q.guideId),
    }));
  }

  /**
   * Replace all qualifications for a tour
   * Removes guides not in the list, adds new ones, keeps existing ones
   */
  async setQualificationsForTour(
    tourId: string,
    guideIds: string[],
    primaryGuideId?: string
  ): Promise<QualificationWithGuide[]> {
    // Verify tour exists and belongs to org
    await this.verifyTourOwnership(tourId);

    // Verify all guides exist and belong to org
    if (guideIds.length > 0) {
      await Promise.all(guideIds.map((id) => this.verifyGuideOwnership(id)));
    }

    // Validate primaryGuideId is in the list
    if (primaryGuideId && !guideIds.includes(primaryGuideId)) {
      throw new ValidationError(
        "Primary guide must be in the list of qualified guides"
      );
    }

    // Get existing qualifications
    const existing = await this.getQualificationsForTour(tourId);
    const existingGuideIds = new Set(existing.map((q) => q.guideId));

    // Determine which to add and which to remove
    const toAdd = guideIds.filter((id) => !existingGuideIds.has(id));
    const toRemove = existing.filter((q) => !guideIds.includes(q.guideId));

    // Remove qualifications for guides not in the list
    if (toRemove.length > 0) {
      await Promise.all(
        toRemove.map((q) => this.removeQualification(q.id))
      );
    }

    // Add new qualifications
    if (toAdd.length > 0) {
      await Promise.all(
        toAdd.map((guideId) =>
          this.addQualification({
            tourId,
            guideId,
            isPrimary: guideId === primaryGuideId,
          })
        )
      );
    }

    // Update primary if specified and guide already existed
    if (primaryGuideId && existingGuideIds.has(primaryGuideId)) {
      await this.setPrimaryGuide(tourId, primaryGuideId);
    }

    // Return updated list
    return this.getQualificationsForTour(tourId);
  }

  /**
   * Replace all qualifications for a guide
   * Removes tours not in the list, adds new ones, keeps existing ones
   */
  async setQualificationsForGuide(guideId: string, tourIds: string[]): Promise<QualificationWithTour[]> {
    // Verify guide exists and belongs to org
    await this.verifyGuideOwnership(guideId);

    // Verify all tours exist and belong to org
    if (tourIds.length > 0) {
      await Promise.all(tourIds.map((id) => this.verifyTourOwnership(id)));
    }

    // Get existing qualifications
    const existing = await this.getQualificationsForGuide(guideId);
    const existingTourIds = new Set(existing.map((q) => q.tourId));

    // Determine which to add and which to remove
    const toAdd = tourIds.filter((id) => !existingTourIds.has(id));
    const toRemove = existing.filter((q) => !tourIds.includes(q.tourId));

    // Remove qualifications for tours not in the list
    if (toRemove.length > 0) {
      await Promise.all(
        toRemove.map((q) => this.removeQualification(q.id))
      );
    }

    // Add new qualifications
    if (toAdd.length > 0) {
      await Promise.all(
        toAdd.map((tourId) =>
          this.addQualification({
            tourId,
            guideId,
            isPrimary: false, // Don't set as primary in bulk operations
          })
        )
      );
    }

    // Return updated list
    return this.getQualificationsForGuide(guideId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get qualification by ID with org verification
   */
  private async getById(id: string): Promise<TourGuideQualification> {
    const qualification = await this.db.query.tourGuideQualifications.findFirst({
      where: and(
        eq(tourGuideQualifications.id, id),
        eq(tourGuideQualifications.organizationId, this.organizationId)
      ),
    });

    if (!qualification) {
      throw new NotFoundError("Tour-Guide Qualification", id);
    }

    return qualification;
  }

  /**
   * Verify tour exists and belongs to organization
   */
  private async verifyTourOwnership(tourId: string): Promise<void> {
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }
  }

  /**
   * Verify guide exists and belongs to organization
   */
  private async verifyGuideOwnership(guideId: string): Promise<void> {
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }
  }

  /**
   * Unset all other primary guides for a tour (except the one being set)
   */
  private async unsetOtherPrimaries(tourId: string, exceptId?: string): Promise<void> {
    const conditions = [
      eq(tourGuideQualifications.tourId, tourId),
      eq(tourGuideQualifications.isPrimary, true),
      eq(tourGuideQualifications.organizationId, this.organizationId),
    ];

    if (exceptId) {
      conditions.push(sql`${tourGuideQualifications.id} != ${exceptId}`);
    }

    await this.db
      .update(tourGuideQualifications)
      .set({
        isPrimary: false,
        updatedAt: new Date(),
      })
      .where(and(...conditions));
  }
}
