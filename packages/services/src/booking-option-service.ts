/**
 * Booking Option Service
 *
 * CRUD operations for booking options.
 * Manages how tours can be booked (shared, private, VIP, etc.)
 */

import { eq, and, asc, desc } from "drizzle-orm";
import {
  bookingOptions,
  type BookingOption,
  type PricingModel,
  type CapacityModel,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ValidationError, ServiceError } from "./types";

export interface CreateBookingOptionInput {
  tourId: string;
  name: string;
  shortDescription?: string;
  fullDescription?: string;
  badge?: string;
  highlightText?: string;
  pricingModel: PricingModel;
  capacityModel: CapacityModel;
  schedulingType?: "fixed" | "flexible";
  isDefault?: boolean;
  sortOrder?: number;
  status?: "active" | "inactive";
}

export interface UpdateBookingOptionInput {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  badge?: string;
  highlightText?: string;
  pricingModel?: PricingModel;
  capacityModel?: CapacityModel;
  schedulingType?: "fixed" | "flexible";
  isDefault?: boolean;
  sortOrder?: number;
  status?: "active" | "inactive";
}

export interface BookingOptionWithStats extends BookingOption {
  totalBookings?: number;
  activeSchedules?: number;
}

export class BookingOptionService extends BaseService {
  /**
   * Get all booking options for a tour
   */
  async getByTourId(tourId: string): Promise<BookingOption[]> {
    return this.db.query.bookingOptions.findMany({
      where: and(
        eq(bookingOptions.tourId, tourId),
        eq(bookingOptions.organizationId, this.organizationId)
      ),
      orderBy: [asc(bookingOptions.sortOrder), asc(bookingOptions.createdAt)],
    });
  }

  /**
   * Get active booking options for a tour (for customer-facing)
   */
  async getActiveByTourId(tourId: string): Promise<BookingOption[]> {
    return this.db.query.bookingOptions.findMany({
      where: and(
        eq(bookingOptions.tourId, tourId),
        eq(bookingOptions.organizationId, this.organizationId),
        eq(bookingOptions.status, "active")
      ),
      orderBy: [asc(bookingOptions.sortOrder), asc(bookingOptions.createdAt)],
    });
  }

  /**
   * Get a single booking option by ID
   */
  async getById(id: string): Promise<BookingOption> {
    const option = await this.db.query.bookingOptions.findFirst({
      where: and(
        eq(bookingOptions.id, id),
        eq(bookingOptions.organizationId, this.organizationId)
      ),
    });

    if (!option) {
      throw new NotFoundError("BookingOption", id);
    }

    return option;
  }

  /**
   * Get the default booking option for a tour
   */
  async getDefault(tourId: string): Promise<BookingOption | null> {
    const result = await this.db.query.bookingOptions.findFirst({
      where: and(
        eq(bookingOptions.tourId, tourId),
        eq(bookingOptions.organizationId, this.organizationId),
        eq(bookingOptions.isDefault, true),
        eq(bookingOptions.status, "active")
      ),
    });
    return result ?? null;
  }

  /**
   * Create a new booking option
   */
  async create(input: CreateBookingOptionInput): Promise<BookingOption> {
    // Validate pricing model
    this.validatePricingModel(input.pricingModel);
    this.validateCapacityModel(input.capacityModel);

    // If this is set as default, unset other defaults first
    if (input.isDefault) {
      await this.db
        .update(bookingOptions)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(bookingOptions.tourId, input.tourId),
            eq(bookingOptions.organizationId, this.organizationId)
          )
        );
    }

    // Get next sort order if not provided
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const existing = await this.db.query.bookingOptions.findMany({
        where: and(
          eq(bookingOptions.tourId, input.tourId),
          eq(bookingOptions.organizationId, this.organizationId)
        ),
        orderBy: [desc(bookingOptions.sortOrder)],
        limit: 1,
      });
      sortOrder = (existing[0]?.sortOrder ?? -1) + 1;
    }

    const [created] = await this.db
      .insert(bookingOptions)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        name: input.name,
        shortDescription: input.shortDescription,
        fullDescription: input.fullDescription,
        badge: input.badge,
        highlightText: input.highlightText,
        pricingModel: input.pricingModel,
        capacityModel: input.capacityModel,
        schedulingType: input.schedulingType ?? "fixed",
        isDefault: input.isDefault ?? false,
        sortOrder,
        status: input.status ?? "active",
      })
      .returning();

    if (!created) {
      throw new ServiceError("Failed to create booking option", "CREATE_FAILED", 500);
    }

    return created;
  }

  /**
   * Update a booking option
   */
  async update(id: string, input: UpdateBookingOptionInput): Promise<BookingOption> {
    const existing = await this.getById(id);

    // Validate models if provided
    if (input.pricingModel) {
      this.validatePricingModel(input.pricingModel);
    }
    if (input.capacityModel) {
      this.validateCapacityModel(input.capacityModel);
    }

    // If setting as default, unset other defaults first
    if (input.isDefault && !existing.isDefault) {
      await this.db
        .update(bookingOptions)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(bookingOptions.tourId, existing.tourId),
            eq(bookingOptions.organizationId, this.organizationId)
          )
        );
    }

    const [updated] = await this.db
      .update(bookingOptions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingOptions.id, id),
          eq(bookingOptions.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("BookingOption", id);
    }

    return updated;
  }

  /**
   * Delete a booking option
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);

    // Check if there are any bookings using this option
    // TODO: Add check once booking.bookingOptionId is populated

    await this.db
      .delete(bookingOptions)
      .where(
        and(
          eq(bookingOptions.id, id),
          eq(bookingOptions.organizationId, this.organizationId)
        )
      );

    // If this was the default, set another as default
    if (existing.isDefault) {
      const [first] = await this.db.query.bookingOptions.findMany({
        where: and(
          eq(bookingOptions.tourId, existing.tourId),
          eq(bookingOptions.organizationId, this.organizationId),
          eq(bookingOptions.status, "active")
        ),
        orderBy: [asc(bookingOptions.sortOrder)],
        limit: 1,
      });

      if (first) {
        await this.db
          .update(bookingOptions)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(bookingOptions.id, first.id));
      }
    }
  }

  /**
   * Duplicate a booking option
   */
  async duplicate(id: string, newName: string): Promise<BookingOption> {
    const existing = await this.getById(id);

    return this.create({
      tourId: existing.tourId,
      name: newName,
      shortDescription: existing.shortDescription ?? undefined,
      fullDescription: existing.fullDescription ?? undefined,
      badge: existing.badge ?? undefined,
      highlightText: existing.highlightText ?? undefined,
      pricingModel: existing.pricingModel,
      capacityModel: existing.capacityModel,
      schedulingType: existing.schedulingType ?? "fixed",
      isDefault: false, // Never duplicate as default
      status: "inactive", // Start as inactive
    });
  }

  /**
   * Set the default option for a tour
   */
  async setDefault(tourId: string, optionId: string): Promise<void> {
    // Verify the option exists and belongs to the tour
    const option = await this.getById(optionId);
    if (option.tourId !== tourId) {
      throw new ValidationError("Option does not belong to this tour");
    }

    // Unset all defaults for this tour
    await this.db
      .update(bookingOptions)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(bookingOptions.tourId, tourId),
          eq(bookingOptions.organizationId, this.organizationId)
        )
      );

    // Set the new default
    await this.db
      .update(bookingOptions)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(bookingOptions.id, optionId),
          eq(bookingOptions.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Reorder booking options for a tour
   */
  async reorder(tourId: string, orderedIds: string[]): Promise<void> {
    // Verify all IDs belong to this tour
    const existing = await this.getByTourId(tourId);
    const existingIds = new Set(existing.map((o) => o.id));

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`Option ${id} does not belong to this tour`);
      }
    }

    // Update sort orders
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id) {
        await this.db
          .update(bookingOptions)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(
            and(
              eq(bookingOptions.id, id),
              eq(bookingOptions.organizationId, this.organizationId)
            )
          );
      }
    }
  }

  /**
   * @deprecated Schedules table has been removed. Use tour availability instead.
   * This method is kept for backwards compatibility but no longer functions.
   */
  async initializeScheduleAvailability(_scheduleId: string): Promise<void> {
    // Schedules table removed - availability is now managed via tour availability
    return;
  }

  /**
   * @deprecated Schedules table has been removed. Use tour availability instead.
   * Returns null - availability is now managed via tour availability model.
   */
  async getScheduleOptionAvailability(
    _scheduleId: string,
    _optionId: string
  ): Promise<{
    totalSeats: number | null;
    bookedSeats: number;
    totalUnits: number | null;
    bookedUnits: number;
    available: number;
  } | null> {
    // Schedules table removed - return null
    return null;
  }

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  private validatePricingModel(model: PricingModel): void {
    switch (model.type) {
      case "per_person":
        if (!model.tiers || model.tiers.length === 0) {
          throw new ValidationError("Per-person pricing requires at least one tier");
        }
        break;

      case "per_unit":
        if (model.maxOccupancy < 1) {
          throw new ValidationError("Max occupancy must be at least 1");
        }
        if (model.pricePerUnit.amount < 0) {
          throw new ValidationError("Price cannot be negative");
        }
        break;

      case "flat_rate":
        if (model.maxParticipants < 1) {
          throw new ValidationError("Max participants must be at least 1");
        }
        if (model.price.amount < 0) {
          throw new ValidationError("Price cannot be negative");
        }
        break;

      case "tiered_group":
        if (!model.tiers || model.tiers.length === 0) {
          throw new ValidationError("Tiered group pricing requires at least one tier");
        }
        break;

      case "base_plus_person":
        if (model.includedParticipants < 1) {
          throw new ValidationError("Included participants must be at least 1");
        }
        if (model.maxParticipants < model.includedParticipants) {
          throw new ValidationError("Max participants must be >= included participants");
        }
        break;
    }
  }

  private validateCapacityModel(model: CapacityModel): void {
    switch (model.type) {
      case "shared":
        if (model.totalSeats < 1) {
          throw new ValidationError("Total seats must be at least 1");
        }
        break;

      case "unit":
        if (model.totalUnits < 1) {
          throw new ValidationError("Total units must be at least 1");
        }
        if (model.occupancyPerUnit < 1) {
          throw new ValidationError("Occupancy per unit must be at least 1");
        }
        break;
    }
  }
}
