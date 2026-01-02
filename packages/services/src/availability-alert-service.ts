import { eq, and, desc, count, sql, lt } from "drizzle-orm";
import {
  availabilityAlerts,
  tours,
  type AvailabilityAlert,
  type Tour,
  type AvailabilityAlertStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  NotFoundError,
  ServiceError,
} from "./types";

export interface AvailabilityAlertWithRelations extends AvailabilityAlert {
  tour: Tour;
}

export interface AvailabilityAlertFilters {
  tourId?: string;
  status?: AvailabilityAlertStatus;
  email?: string;
}

export interface CreateAvailabilityAlertInput {
  customerId?: string;
  email: string;
  phone?: string;
  tourId: string;
  requestedSpots?: number;
}

export class AvailabilityAlertService extends BaseService {
  async getAll(
    filters: AvailabilityAlertFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<AvailabilityAlertWithRelations>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(availabilityAlerts.organizationId, this.organizationId)];

    if (filters.tourId) {
      conditions.push(eq(availabilityAlerts.tourId, filters.tourId));
    }
    if (filters.status) {
      conditions.push(eq(availabilityAlerts.status, filters.status));
    }
    if (filters.email) {
      conditions.push(eq(availabilityAlerts.email, filters.email));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          alert: availabilityAlerts,
          tour: tours,
        })
        .from(availabilityAlerts)
        .innerJoin(tours, eq(availabilityAlerts.tourId, tours.id))
        .where(and(...conditions))
        .orderBy(desc(availabilityAlerts.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(availabilityAlerts)
        .where(and(...conditions)),
    ]);

    const formattedData: AvailabilityAlertWithRelations[] = data.map((row) => ({
      ...row.alert,
      tour: row.tour,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getById(id: string): Promise<AvailabilityAlert> {
    const alert = await this.db.query.availabilityAlerts.findFirst({
      where: and(
        eq(availabilityAlerts.id, id),
        eq(availabilityAlerts.organizationId, this.organizationId)
      ),
    });

    if (!alert) {
      throw new NotFoundError("AvailabilityAlert", id);
    }

    return alert;
  }

  async getExistingAlert(
    email: string,
    tourId: string
  ): Promise<AvailabilityAlert | null> {
    const conditions = [
      eq(availabilityAlerts.organizationId, this.organizationId),
      eq(availabilityAlerts.email, email.toLowerCase()),
      eq(availabilityAlerts.tourId, tourId),
      eq(availabilityAlerts.status, "active"),
    ];

    const alert = await this.db.query.availabilityAlerts.findFirst({
      where: and(...conditions),
    });

    return alert || null;
  }

  async create(input: CreateAvailabilityAlertInput): Promise<AvailabilityAlert> {
    // Check for existing active alert
    const existing = await this.getExistingAlert(
      input.email,
      input.tourId
    );

    if (existing) {
      // Update spots if different
      if (input.requestedSpots && input.requestedSpots !== existing.requestedSpots) {
        return this.updateRequestedSpots(existing.id, input.requestedSpots);
      }
      return existing;
    }

    // Set default expiration (30 days from now for tour-wide alerts)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [alert] = await this.db
      .insert(availabilityAlerts)
      .values({
        organizationId: this.organizationId,
        email: input.email.toLowerCase(),
        phone: input.phone,
        customerId: input.customerId,
        tourId: input.tourId,
        requestedSpots: input.requestedSpots ?? 1,
        expiresAt,
      })
      .returning();

    if (!alert) {
      throw new ServiceError("Failed to create availability alert", "CREATE_FAILED", 500);
    }

    return alert;
  }

  async updateRequestedSpots(id: string, spots: number): Promise<AvailabilityAlert> {
    const [alert] = await this.db
      .update(availabilityAlerts)
      .set({
        requestedSpots: spots,
      })
      .where(
        and(
          eq(availabilityAlerts.id, id),
          eq(availabilityAlerts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!alert) {
      throw new NotFoundError("AvailabilityAlert", id);
    }

    return alert;
  }

  async updateStatus(id: string, status: AvailabilityAlertStatus): Promise<AvailabilityAlert> {
    const updates: Partial<AvailabilityAlert> = { status };

    if (status === "notified") {
      updates.notifiedAt = new Date();
    } else if (status === "booked") {
      updates.bookedAt = new Date();
    }

    const [alert] = await this.db
      .update(availabilityAlerts)
      .set({
        ...updates,
        notificationCount: status === "notified"
          ? sql`${availabilityAlerts.notificationCount} + 1`
          : availabilityAlerts.notificationCount,
      })
      .where(
        and(
          eq(availabilityAlerts.id, id),
          eq(availabilityAlerts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!alert) {
      throw new NotFoundError("AvailabilityAlert", id);
    }

    return alert;
  }

  async markBooked(id: string, bookingId: string): Promise<AvailabilityAlert> {
    const [alert] = await this.db
      .update(availabilityAlerts)
      .set({
        status: "booked",
        bookedAt: new Date(),
        bookingId,
      })
      .where(
        and(
          eq(availabilityAlerts.id, id),
          eq(availabilityAlerts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!alert) {
      throw new NotFoundError("AvailabilityAlert", id);
    }

    return alert;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(availabilityAlerts)
      .where(
        and(
          eq(availabilityAlerts.id, id),
          eq(availabilityAlerts.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Get active alerts for a tour that should be notified
   * when spots become available
   */
  async getAlertsForTourWithCapacity(
    tourId: string,
    availableSpots: number
  ): Promise<AvailabilityAlert[]> {
    return this.db
      .select()
      .from(availabilityAlerts)
      .where(
        and(
          eq(availabilityAlerts.organizationId, this.organizationId),
          eq(availabilityAlerts.tourId, tourId),
          eq(availabilityAlerts.status, "active"),
          sql`${availabilityAlerts.requestedSpots} <= ${availableSpots}`
        )
      )
      .orderBy(availabilityAlerts.createdAt); // First come, first served
  }

  /**
   * Get active alerts for a tour that should be notified
   */
  async getAlertsForTour(tourId: string): Promise<AvailabilityAlert[]> {
    return this.db
      .select()
      .from(availabilityAlerts)
      .where(
        and(
          eq(availabilityAlerts.organizationId, this.organizationId),
          eq(availabilityAlerts.tourId, tourId),
          eq(availabilityAlerts.status, "active")
        )
      )
      .orderBy(availabilityAlerts.createdAt);
  }

  /**
   * Expire alerts for past schedules
   */
  async expireOldAlerts(): Promise<number> {
    const now = new Date();

    const result = await this.db
      .update(availabilityAlerts)
      .set({ status: "expired" })
      .where(
        and(
          eq(availabilityAlerts.organizationId, this.organizationId),
          eq(availabilityAlerts.status, "active"),
          lt(availabilityAlerts.expiresAt, now)
        )
      )
      .returning({ id: availabilityAlerts.id });

    return result.length;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    notified: number;
    booked: number;
    expired: number;
    conversionRate: number;
  }> {
    const result = await this.db
      .select({
        status: availabilityAlerts.status,
        count: count(),
      })
      .from(availabilityAlerts)
      .where(eq(availabilityAlerts.organizationId, this.organizationId))
      .groupBy(availabilityAlerts.status);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.status] = row.count;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const notified = counts.notified ?? 0;
    const booked = counts.booked ?? 0;
    const conversionRate = notified > 0 ? (booked / notified) * 100 : 0;

    return {
      total,
      active: counts.active ?? 0,
      notified,
      booked,
      expired: counts.expired ?? 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}
