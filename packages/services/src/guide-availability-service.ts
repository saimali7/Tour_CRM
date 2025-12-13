import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import {
  guideAvailability,
  guideAvailabilityOverrides,
  guides,
  type GuideAvailability,
  type GuideAvailabilityOverride,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError } from "./types";

/**
 * Weekly availability slot input
 */
export interface WeeklyAvailabilitySlot {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:MM format (e.g., "09:00")
  endTime: string; // HH:MM format (e.g., "17:00")
  isAvailable: boolean;
}

/**
 * Availability override input
 */
export interface AvailabilityOverrideInput {
  date: Date;
  isAvailable: boolean;
  startTime?: string; // Optional: custom hours for that day
  endTime?: string; // Optional: custom hours for that day
  reason?: string; // e.g., "Vacation", "Sick day", "Special event"
}

/**
 * Availability check result for a date
 */
export interface DateAvailability {
  date: Date;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  source: "override" | "weekly" | "unavailable";
  reason?: string; // Only for overrides
}

/**
 * Guide Availability Service
 * Manages weekly availability patterns and date-specific overrides for guides
 */
export class GuideAvailabilityService extends BaseService {
  /**
   * Verify guide belongs to the organization
   */
  private async verifyGuideOwnership(guideId: string): Promise<void> {
    const guide = await this.db.query.guides.findFirst({
      where: and(eq(guides.id, guideId), eq(guides.organizationId, this.organizationId)),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private validateTimeFormat(time: string): void {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new ValidationError(`Invalid time format: "${time}". Expected HH:MM format.`);
    }
  }

  /**
   * Validate day of week (0-6)
   */
  private validateDayOfWeek(dayOfWeek: number): void {
    if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek)) {
      throw new ValidationError(`Invalid day of week: ${dayOfWeek}. Must be 0-6 (0=Sunday, 6=Saturday).`);
    }
  }

  /**
   * Validate time range
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    this.validateTimeFormat(startTime);
    this.validateTimeFormat(endTime);

    if (startTime >= endTime) {
      throw new ValidationError(`Start time (${startTime}) must be before end time (${endTime}).`);
    }
  }

  // =============================================================================
  // WEEKLY AVAILABILITY CRUD
  // =============================================================================

  /**
   * Get all weekly availability slots for a guide
   */
  async getWeeklyAvailability(guideId: string): Promise<GuideAvailability[]> {
    await this.verifyGuideOwnership(guideId);

    return this.db
      .select()
      .from(guideAvailability)
      .where(
        and(
          eq(guideAvailability.organizationId, this.organizationId),
          eq(guideAvailability.guideId, guideId)
        )
      )
      .orderBy(asc(guideAvailability.dayOfWeek), asc(guideAvailability.startTime));
  }

  /**
   * Replace all weekly availability slots for a guide
   * Deletes existing slots and creates new ones
   */
  async setWeeklyAvailability(
    guideId: string,
    slots: WeeklyAvailabilitySlot[]
  ): Promise<GuideAvailability[]> {
    await this.verifyGuideOwnership(guideId);

    // Validate all slots
    for (const slot of slots) {
      this.validateDayOfWeek(slot.dayOfWeek);
      this.validateTimeRange(slot.startTime, slot.endTime);
    }

    // Delete all existing weekly availability for this guide
    await this.db
      .delete(guideAvailability)
      .where(
        and(
          eq(guideAvailability.organizationId, this.organizationId),
          eq(guideAvailability.guideId, guideId)
        )
      );

    // Insert new slots
    if (slots.length === 0) {
      return [];
    }

    const newSlots = await this.db
      .insert(guideAvailability)
      .values(
        slots.map((slot) => ({
          organizationId: this.organizationId,
          guideId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
        }))
      )
      .returning();

    return newSlots;
  }

  /**
   * Add a single weekly availability slot
   */
  async addWeeklySlot(
    guideId: string,
    slot: WeeklyAvailabilitySlot
  ): Promise<GuideAvailability> {
    await this.verifyGuideOwnership(guideId);

    this.validateDayOfWeek(slot.dayOfWeek);
    this.validateTimeRange(slot.startTime, slot.endTime);

    const [newSlot] = await this.db
      .insert(guideAvailability)
      .values({
        organizationId: this.organizationId,
        guideId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      })
      .returning();

    if (!newSlot) {
      throw new Error("Failed to create weekly availability slot");
    }

    return newSlot;
  }

  /**
   * Update a weekly availability slot
   */
  async updateWeeklySlot(
    id: string,
    data: Partial<WeeklyAvailabilitySlot>
  ): Promise<GuideAvailability> {
    // Verify slot exists and belongs to organization
    const slot = await this.db.query.guideAvailability.findFirst({
      where: and(
        eq(guideAvailability.id, id),
        eq(guideAvailability.organizationId, this.organizationId)
      ),
    });

    if (!slot) {
      throw new NotFoundError("Weekly availability slot", id);
    }

    // Validate updates
    if (data.dayOfWeek !== undefined) {
      this.validateDayOfWeek(data.dayOfWeek);
    }

    if (data.startTime || data.endTime) {
      const startTime = data.startTime || slot.startTime;
      const endTime = data.endTime || slot.endTime;
      this.validateTimeRange(startTime, endTime);
    }

    const [updated] = await this.db
      .update(guideAvailability)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guideAvailability.id, id),
          eq(guideAvailability.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Weekly availability slot", id);
    }

    return updated;
  }

  /**
   * Delete a weekly availability slot
   */
  async deleteWeeklySlot(id: string): Promise<void> {
    // Verify slot exists
    const slot = await this.db.query.guideAvailability.findFirst({
      where: and(
        eq(guideAvailability.id, id),
        eq(guideAvailability.organizationId, this.organizationId)
      ),
    });

    if (!slot) {
      throw new NotFoundError("Weekly availability slot", id);
    }

    await this.db
      .delete(guideAvailability)
      .where(
        and(
          eq(guideAvailability.id, id),
          eq(guideAvailability.organizationId, this.organizationId)
        )
      );
  }

  // =============================================================================
  // AVAILABILITY OVERRIDES CRUD
  // =============================================================================

  /**
   * Get availability overrides for a guide within a date range
   */
  async getOverrides(
    guideId: string,
    options: { from?: Date; to?: Date } = {}
  ): Promise<GuideAvailabilityOverride[]> {
    await this.verifyGuideOwnership(guideId);

    const conditions = [
      eq(guideAvailabilityOverrides.organizationId, this.organizationId),
      eq(guideAvailabilityOverrides.guideId, guideId),
    ];

    if (options.from) {
      conditions.push(gte(guideAvailabilityOverrides.date, options.from));
    }

    if (options.to) {
      conditions.push(lte(guideAvailabilityOverrides.date, options.to));
    }

    return this.db
      .select()
      .from(guideAvailabilityOverrides)
      .where(and(...conditions))
      .orderBy(asc(guideAvailabilityOverrides.date));
  }

  /**
   * Get override for a specific date
   */
  async getOverrideForDate(guideId: string, date: Date): Promise<GuideAvailabilityOverride | null> {
    await this.verifyGuideOwnership(guideId);

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const override = await this.db.query.guideAvailabilityOverrides.findFirst({
      where: and(
        eq(guideAvailabilityOverrides.organizationId, this.organizationId),
        eq(guideAvailabilityOverrides.guideId, guideId),
        sql`DATE(${guideAvailabilityOverrides.date}) = DATE(${normalizedDate})`
      ),
    });

    return override || null;
  }

  /**
   * Create an availability override
   */
  async createOverride(
    guideId: string,
    input: AvailabilityOverrideInput
  ): Promise<GuideAvailabilityOverride> {
    await this.verifyGuideOwnership(guideId);

    // Validate time formats if provided
    if (input.startTime && input.endTime) {
      this.validateTimeRange(input.startTime, input.endTime);
    } else if (input.startTime || input.endTime) {
      throw new ValidationError("Both startTime and endTime must be provided together, or neither.");
    }

    // Check if override already exists for this date
    const existing = await this.getOverrideForDate(guideId, input.date);
    if (existing) {
      throw new ValidationError(
        `Override already exists for guide on ${input.date.toISOString().split("T")[0]}`
      );
    }

    const [override] = await this.db
      .insert(guideAvailabilityOverrides)
      .values({
        organizationId: this.organizationId,
        guideId,
        date: input.date,
        isAvailable: input.isAvailable,
        startTime: input.startTime,
        endTime: input.endTime,
        reason: input.reason,
      })
      .returning();

    if (!override) {
      throw new Error("Failed to create availability override");
    }

    return override;
  }

  /**
   * Update an availability override
   */
  async updateOverride(
    id: string,
    data: Partial<AvailabilityOverrideInput>
  ): Promise<GuideAvailabilityOverride> {
    // Verify override exists and belongs to organization
    const override = await this.db.query.guideAvailabilityOverrides.findFirst({
      where: and(
        eq(guideAvailabilityOverrides.id, id),
        eq(guideAvailabilityOverrides.organizationId, this.organizationId)
      ),
    });

    if (!override) {
      throw new NotFoundError("Availability override", id);
    }

    // Validate time range if provided
    if (data.startTime || data.endTime) {
      const startTime = data.startTime || override.startTime;
      const endTime = data.endTime || override.endTime;

      if (startTime && endTime) {
        this.validateTimeRange(startTime, endTime);
      } else if (startTime || endTime) {
        throw new ValidationError("Both startTime and endTime must be provided together, or neither.");
      }
    }

    const [updated] = await this.db
      .update(guideAvailabilityOverrides)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guideAvailabilityOverrides.id, id),
          eq(guideAvailabilityOverrides.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Availability override", id);
    }

    return updated;
  }

  /**
   * Delete an availability override
   */
  async deleteOverride(id: string): Promise<void> {
    // Verify override exists
    const override = await this.db.query.guideAvailabilityOverrides.findFirst({
      where: and(
        eq(guideAvailabilityOverrides.id, id),
        eq(guideAvailabilityOverrides.organizationId, this.organizationId)
      ),
    });

    if (!override) {
      throw new NotFoundError("Availability override", id);
    }

    await this.db
      .delete(guideAvailabilityOverrides)
      .where(
        and(
          eq(guideAvailabilityOverrides.id, id),
          eq(guideAvailabilityOverrides.organizationId, this.organizationId)
        )
      );
  }

  // =============================================================================
  // AVAILABILITY CHECKING
  // =============================================================================

  /**
   * Check if a guide is available on a specific date
   * Overrides take precedence over weekly patterns
   */
  async isAvailableOnDate(guideId: string, date: Date): Promise<boolean> {
    await this.verifyGuideOwnership(guideId);

    // Check for override first
    const override = await this.getOverrideForDate(guideId, date);
    if (override) {
      return override.isAvailable;
    }

    // Check weekly pattern
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
      );

    return weeklySlots.length > 0;
  }

  /**
   * Check if a guide is available for a specific time slot
   * Checks both date availability and time range
   */
  async isAvailableForTimeSlot(
    guideId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<boolean> {
    await this.verifyGuideOwnership(guideId);

    if (startsAt >= endsAt) {
      throw new ValidationError("Start time must be before end time");
    }

    const requestedStartTime = this.formatTime(startsAt);
    const requestedEndTime = this.formatTime(endsAt);

    // Check for override first
    const override = await this.getOverrideForDate(guideId, startsAt);
    if (override) {
      if (!override.isAvailable) {
        return false;
      }

      // If override has custom hours, check against those
      if (override.startTime && override.endTime) {
        return (
          requestedStartTime >= override.startTime &&
          requestedEndTime <= override.endTime
        );
      }

      // Otherwise, fall through to check weekly pattern for time
    }

    // Check weekly pattern
    const dayOfWeek = startsAt.getDay();
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
      );

    // Check if requested time falls within any available slot
    return weeklySlots.some(
      (slot) =>
        requestedStartTime >= slot.startTime && requestedEndTime <= slot.endTime
    );
  }

  /**
   * Get full availability information for a date range
   */
  async getAvailabilityForDateRange(
    guideId: string,
    from: Date,
    to: Date
  ): Promise<DateAvailability[]> {
    await this.verifyGuideOwnership(guideId);

    if (from >= to) {
      throw new ValidationError("From date must be before to date");
    }

    // Get all overrides in range
    const overrides = await this.getOverrides(guideId, { from, to });
    const overrideMap = new Map<string, GuideAvailabilityOverride>();
    overrides.forEach((override) => {
      const dateKey = override.date.toISOString().split("T")[0] ?? "";
      if (dateKey) {
        overrideMap.set(dateKey, override);
      }
    });

    // Get weekly patterns
    const weeklySlots = await this.getWeeklyAvailability(guideId);
    const weeklyMap = new Map<number, GuideAvailability[]>();
    weeklySlots.forEach((slot) => {
      if (!weeklyMap.has(slot.dayOfWeek)) {
        weeklyMap.set(slot.dayOfWeek, []);
      }
      weeklyMap.get(slot.dayOfWeek)!.push(slot);
    });

    // Generate availability for each date
    const result: DateAvailability[] = [];
    const currentDate = new Date(from);

    while (currentDate <= to) {
      const dateKey = currentDate.toISOString().split("T")[0] ?? "";
      const override = dateKey ? overrideMap.get(dateKey) : undefined;

      if (override) {
        // Override takes precedence
        result.push({
          date: new Date(currentDate),
          isAvailable: override.isAvailable,
          startTime: override.startTime || undefined,
          endTime: override.endTime || undefined,
          source: "override",
          reason: override.reason || undefined,
        });
      } else {
        // Check weekly pattern
        const dayOfWeek = currentDate.getDay();
        const slots = weeklyMap.get(dayOfWeek) || [];
        const availableSlots = slots.filter((s) => s.isAvailable);

        if (availableSlots.length > 0) {
          // Take the first available slot (or merge if needed)
          const slot = availableSlots[0];
          if (slot) {
            result.push({
              date: new Date(currentDate),
              isAvailable: true,
              startTime: slot.startTime,
              endTime: slot.endTime,
              source: "weekly",
            });
          }
        } else {
          result.push({
            date: new Date(currentDate),
            isAvailable: false,
            source: "unavailable",
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Format Date to HH:MM string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}
