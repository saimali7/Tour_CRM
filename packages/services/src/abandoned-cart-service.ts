import { eq, and, desc, asc, count, sql, lt, or, ilike } from "drizzle-orm";
import {
  abandonedCarts,
  tours,
  schedules,
  type AbandonedCart,
  type Tour,
  type Schedule,
  type AbandonedCartStatus,
  type AbandonedCartStep,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
} from "./types";

export interface AbandonedCartFilters {
  status?: AbandonedCartStatus;
  tourId?: string;
  email?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type AbandonedCartSortField = "createdAt" | "total" | "lastActivityAt";

export interface AbandonedCartWithRelations extends AbandonedCart {
  tour: Tour;
  schedule: Schedule | null;
}

export interface CreateAbandonedCartInput {
  customerId?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tourId: string;
  scheduleId?: string;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  subtotal?: string;
  total?: string;
  currency?: string;
  lastStep: AbandonedCartStep;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAbandonedCartInput {
  scheduleId?: string;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  subtotal?: string;
  total?: string;
  lastStep?: AbandonedCartStep;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export class AbandonedCartService extends BaseService {
  async getAll(
    filters: AbandonedCartFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<AbandonedCartSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<AbandonedCartWithRelations>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(abandonedCarts.organizationId, this.organizationId)];

    if (filters.status) {
      conditions.push(eq(abandonedCarts.status, filters.status));
    }
    if (filters.tourId) {
      conditions.push(eq(abandonedCarts.tourId, filters.tourId));
    }
    if (filters.email) {
      conditions.push(eq(abandonedCarts.email, filters.email));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(abandonedCarts.email, `%${filters.search}%`),
          ilike(abandonedCarts.firstName, `%${filters.search}%`),
          ilike(abandonedCarts.lastName, `%${filters.search}%`)
        )!
      );
    }
    if (filters.dateFrom) {
      conditions.push(sql`${abandonedCarts.createdAt} >= ${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      conditions.push(sql`${abandonedCarts.createdAt} <= ${filters.dateTo}`);
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(abandonedCarts[sort.field])
        : desc(abandonedCarts[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          cart: abandonedCarts,
          tour: tours,
          schedule: schedules,
        })
        .from(abandonedCarts)
        .innerJoin(tours, eq(abandonedCarts.tourId, tours.id))
        .leftJoin(schedules, eq(abandonedCarts.scheduleId, schedules.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(abandonedCarts)
        .where(and(...conditions)),
    ]);

    const formattedData: AbandonedCartWithRelations[] = data.map((row) => ({
      ...row.cart,
      tour: row.tour,
      schedule: row.schedule,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getById(id: string): Promise<AbandonedCart> {
    const cart = await this.db.query.abandonedCarts.findFirst({
      where: and(
        eq(abandonedCarts.id, id),
        eq(abandonedCarts.organizationId, this.organizationId)
      ),
    });

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  async getByRecoveryToken(token: string): Promise<AbandonedCartWithRelations | null> {
    const result = await this.db
      .select({
        cart: abandonedCarts,
        tour: tours,
        schedule: schedules,
      })
      .from(abandonedCarts)
      .innerJoin(tours, eq(abandonedCarts.tourId, tours.id))
      .leftJoin(schedules, eq(abandonedCarts.scheduleId, schedules.id))
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.recoveryToken, token)
        )
      )
      .limit(1);

    const row = result[0];
    if (!row) {
      return null;
    }

    return {
      ...row.cart,
      tour: row.tour,
      schedule: row.schedule,
    };
  }

  async getActiveCartByEmail(email: string): Promise<AbandonedCart | null> {
    const cart = await this.db.query.abandonedCarts.findFirst({
      where: and(
        eq(abandonedCarts.organizationId, this.organizationId),
        eq(abandonedCarts.email, email.toLowerCase()),
        eq(abandonedCarts.status, "active")
      ),
      orderBy: [desc(abandonedCarts.lastActivityAt)],
    });

    return cart || null;
  }

  async create(input: CreateAbandonedCartInput): Promise<AbandonedCart> {
    // Set expiration (7 days from now by default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { email, ...restInput } = input;

    const [cart] = await this.db
      .insert(abandonedCarts)
      .values({
        organizationId: this.organizationId,
        ...restInput,
        email: email.toLowerCase(),
        expiresAt,
      })
      .returning();

    if (!cart) {
      throw new Error("Failed to create abandoned cart");
    }

    return cart;
  }

  async update(id: string, input: UpdateAbandonedCartInput): Promise<AbandonedCart> {
    const [cart] = await this.db
      .update(abandonedCarts)
      .set({
        ...input,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.id, id),
          eq(abandonedCarts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  async createOrUpdate(input: CreateAbandonedCartInput): Promise<AbandonedCart> {
    const existing = await this.getActiveCartByEmail(input.email);

    if (existing) {
      // Update existing cart if it's for the same tour
      if (existing.tourId === input.tourId) {
        return this.update(existing.id, {
          scheduleId: input.scheduleId,
          adultCount: input.adultCount,
          childCount: input.childCount,
          infantCount: input.infantCount,
          subtotal: input.subtotal,
          total: input.total,
          lastStep: input.lastStep,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          metadata: input.metadata,
        });
      }
      // Different tour - expire old cart and create new one
      await this.updateStatus(existing.id, "expired");
    }

    return this.create(input);
  }

  async updateStatus(id: string, status: AbandonedCartStatus): Promise<AbandonedCart> {
    const [cart] = await this.db
      .update(abandonedCarts)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.id, id),
          eq(abandonedCarts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  async markRecovered(id: string, bookingId: string, discountApplied?: string): Promise<AbandonedCart> {
    const [cart] = await this.db
      .update(abandonedCarts)
      .set({
        status: "recovered",
        recoveredAt: new Date(),
        recoveredBookingId: bookingId,
        discountApplied,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.id, id),
          eq(abandonedCarts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  async incrementEmailsSent(id: string): Promise<AbandonedCart> {
    const [cart] = await this.db
      .update(abandonedCarts)
      .set({
        emailsSent: sql`${abandonedCarts.emailsSent} + 1`,
        lastEmailSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.id, id),
          eq(abandonedCarts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  async markSmsSent(id: string): Promise<AbandonedCart> {
    const [cart] = await this.db
      .update(abandonedCarts)
      .set({
        smsSent: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.id, id),
          eq(abandonedCarts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!cart) {
      throw new NotFoundError("AbandonedCart", id);
    }

    return cart;
  }

  /**
   * Get carts ready for recovery email #1 (15 minutes abandoned)
   */
  async getCartsForEmail1(): Promise<AbandonedCart[]> {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    return this.db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.status, "active"),
          eq(abandonedCarts.emailsSent, 0),
          lt(abandonedCarts.lastActivityAt, fifteenMinutesAgo)
        )
      );
  }

  /**
   * Get carts ready for recovery email #2 (24 hours abandoned)
   */
  async getCartsForEmail2(): Promise<AbandonedCart[]> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return this.db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.status, "active"),
          eq(abandonedCarts.emailsSent, 1),
          lt(abandonedCarts.lastEmailSentAt, twentyFourHoursAgo)
        )
      );
  }

  /**
   * Get carts ready for recovery email #3 (72 hours abandoned)
   */
  async getCartsForEmail3(): Promise<AbandonedCart[]> {
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    return this.db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.status, "active"),
          eq(abandonedCarts.emailsSent, 2),
          lt(abandonedCarts.lastEmailSentAt, seventyTwoHoursAgo)
        )
      );
  }

  /**
   * Get carts ready for SMS reminder (15 minutes, phone provided, not sent)
   */
  async getCartsForSms(): Promise<AbandonedCart[]> {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    return this.db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.status, "active"),
          eq(abandonedCarts.smsSent, false),
          sql`${abandonedCarts.phone} IS NOT NULL`,
          lt(abandonedCarts.lastActivityAt, fifteenMinutesAgo)
        )
      );
  }

  /**
   * Expire old carts that are past their expiration date
   */
  async expireOldCarts(): Promise<number> {
    const now = new Date();

    const result = await this.db
      .update(abandonedCarts)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abandonedCarts.organizationId, this.organizationId),
          eq(abandonedCarts.status, "active"),
          lt(abandonedCarts.expiresAt, now)
        )
      )
      .returning({ id: abandonedCarts.id });

    return result.length;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    recovered: number;
    expired: number;
    recoveryRate: number;
    totalValue: string;
    recoveredValue: string;
    averageCartValue: string;
  }> {
    const [statusCounts, valueStats] = await Promise.all([
      this.db
        .select({
          status: abandonedCarts.status,
          count: count(),
        })
        .from(abandonedCarts)
        .where(eq(abandonedCarts.organizationId, this.organizationId))
        .groupBy(abandonedCarts.status),
      this.db
        .select({
          totalValue: sql<string>`COALESCE(SUM(CAST(${abandonedCarts.total} AS DECIMAL)), 0)::TEXT`,
          recoveredValue: sql<string>`COALESCE(SUM(CASE WHEN ${abandonedCarts.status} = 'recovered' THEN CAST(${abandonedCarts.total} AS DECIMAL) ELSE 0 END), 0)::TEXT`,
          avgValue: sql<string>`COALESCE(AVG(CAST(${abandonedCarts.total} AS DECIMAL)), 0)::TEXT`,
        })
        .from(abandonedCarts)
        .where(eq(abandonedCarts.organizationId, this.organizationId)),
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = row.count;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const recovered = counts.recovered ?? 0;
    const completedOrRecovered = total - (counts.active ?? 0);
    const recoveryRate = completedOrRecovered > 0 ? (recovered / completedOrRecovered) * 100 : 0;

    return {
      total,
      active: counts.active ?? 0,
      recovered,
      expired: counts.expired ?? 0,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      totalValue: valueStats[0]?.totalValue ?? "0",
      recoveredValue: valueStats[0]?.recoveredValue ?? "0",
      averageCartValue: valueStats[0]?.avgValue ?? "0",
    };
  }
}
