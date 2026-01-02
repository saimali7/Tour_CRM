import { eq, and, desc, count, sql } from "drizzle-orm";
import {
  wishlists,
  tours,
  type Wishlist,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  NotFoundError,
  ValidationError,
  ServiceError,
} from "./types";

export interface WishlistWithTour extends Wishlist {
  tour: Tour;
}

export interface CreateWishlistInput {
  customerId?: string;
  email?: string;
  sessionId?: string;
  tourId: string;
  priceDropAlert?: boolean;
  availabilityAlert?: boolean;
  originalPrice?: string;
}

export interface UpdateWishlistInput {
  priceDropAlert?: boolean;
  availabilityAlert?: boolean;
}

export class WishlistService extends BaseService {
  async getAll(
    filters: { customerId?: string; email?: string; sessionId?: string } = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<WishlistWithTour>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(wishlists.organizationId, this.organizationId)];

    if (filters.customerId) {
      conditions.push(eq(wishlists.customerId, filters.customerId));
    } else if (filters.email) {
      conditions.push(eq(wishlists.email, filters.email));
    } else if (filters.sessionId) {
      conditions.push(eq(wishlists.sessionId, filters.sessionId));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          wishlist: wishlists,
          tour: tours,
        })
        .from(wishlists)
        .innerJoin(tours, eq(wishlists.tourId, tours.id))
        .where(and(...conditions))
        .orderBy(desc(wishlists.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(wishlists)
        .where(and(...conditions)),
    ]);

    const formattedData: WishlistWithTour[] = data.map((row) => ({
      ...row.wishlist,
      tour: row.tour,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getById(id: string): Promise<Wishlist> {
    const wishlist = await this.db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.id, id),
        eq(wishlists.organizationId, this.organizationId)
      ),
    });

    if (!wishlist) {
      throw new NotFoundError("Wishlist", id);
    }

    return wishlist;
  }

  async getByCustomerAndTour(customerId: string, tourId: string): Promise<Wishlist | null> {
    const wishlist = await this.db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.organizationId, this.organizationId),
        eq(wishlists.customerId, customerId),
        eq(wishlists.tourId, tourId)
      ),
    });

    return wishlist || null;
  }

  async isWishlisted(
    tourId: string,
    identifier: { customerId?: string; sessionId?: string }
  ): Promise<boolean> {
    const conditions = [
      eq(wishlists.organizationId, this.organizationId),
      eq(wishlists.tourId, tourId),
    ];

    if (identifier.customerId) {
      conditions.push(eq(wishlists.customerId, identifier.customerId));
    } else if (identifier.sessionId) {
      conditions.push(eq(wishlists.sessionId, identifier.sessionId));
    } else {
      return false;
    }

    const wishlist = await this.db.query.wishlists.findFirst({
      where: and(...conditions),
    });

    return !!wishlist;
  }

  async add(input: CreateWishlistInput): Promise<Wishlist> {
    // Check if already wishlisted
    if (input.customerId) {
      const existing = await this.getByCustomerAndTour(input.customerId, input.tourId);
      if (existing) {
        return existing;
      }
    }

    const [wishlist] = await this.db
      .insert(wishlists)
      .values({
        organizationId: this.organizationId,
        customerId: input.customerId,
        email: input.email,
        sessionId: input.sessionId,
        tourId: input.tourId,
        priceDropAlert: input.priceDropAlert ?? true,
        availabilityAlert: input.availabilityAlert ?? true,
        originalPrice: input.originalPrice,
      })
      .returning();

    if (!wishlist) {
      throw new ServiceError("Failed to add to wishlist", "CREATE_FAILED", 500);
    }

    return wishlist;
  }

  async remove(tourId: string, identifier: { customerId?: string; sessionId?: string }): Promise<void> {
    const conditions = [
      eq(wishlists.organizationId, this.organizationId),
      eq(wishlists.tourId, tourId),
    ];

    if (identifier.customerId) {
      conditions.push(eq(wishlists.customerId, identifier.customerId));
    } else if (identifier.sessionId) {
      conditions.push(eq(wishlists.sessionId, identifier.sessionId));
    } else {
      throw new ValidationError("Must provide customerId or sessionId", { identifier: ["Either customerId or sessionId is required"] });
    }

    await this.db.delete(wishlists).where(and(...conditions));
  }

  async toggle(
    tourId: string,
    identifier: { customerId?: string; sessionId?: string; email?: string },
    originalPrice?: string
  ): Promise<{ added: boolean; wishlist?: Wishlist }> {
    const isCurrentlyWishlisted = await this.isWishlisted(tourId, identifier);

    if (isCurrentlyWishlisted) {
      await this.remove(tourId, identifier);
      return { added: false };
    }

    const wishlist = await this.add({
      customerId: identifier.customerId,
      sessionId: identifier.sessionId,
      email: identifier.email,
      tourId,
      originalPrice,
    });

    return { added: true, wishlist };
  }

  async updateAlertPreferences(id: string, input: UpdateWishlistInput): Promise<Wishlist> {
    const [wishlist] = await this.db
      .update(wishlists)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wishlists.id, id),
          eq(wishlists.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!wishlist) {
      throw new NotFoundError("Wishlist", id);
    }

    return wishlist;
  }

  async markNotified(id: string): Promise<Wishlist> {
    const [wishlist] = await this.db
      .update(wishlists)
      .set({
        lastNotifiedAt: new Date(),
        notificationCount: sql`${wishlists.notificationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wishlists.id, id),
          eq(wishlists.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!wishlist) {
      throw new NotFoundError("Wishlist", id);
    }

    return wishlist;
  }

  /**
   * Merge session wishlists to a customer account
   * Optimized to check existing wishlists and process updates in parallel
   */
  async mergeSessionToCustomer(sessionId: string, customerId: string, email: string): Promise<void> {
    // Get all session wishlists
    const sessionWishlists = await this.db
      .select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.organizationId, this.organizationId),
          eq(wishlists.sessionId, sessionId)
        )
      );

    if (sessionWishlists.length === 0) {
      return;
    }

    // Get all existing customer wishlists for these tours in parallel
    const tourIds = sessionWishlists.map((w) => w.tourId);
    const existingChecks = await Promise.all(
      tourIds.map((tourId) => this.getByCustomerAndTour(customerId, tourId))
    );

    // Build a set of existing tour IDs
    const existingTourIds = new Set(
      existingChecks.filter((w) => w !== null).map((w) => w!.tourId)
    );

    // Separate items to transfer vs delete
    const toTransfer = sessionWishlists.filter((item) => !existingTourIds.has(item.tourId));
    const toDelete = sessionWishlists.filter((item) => existingTourIds.has(item.tourId));

    // Process transfers and deletes in parallel using Promise.allSettled
    // to ensure all operations complete even if some fail
    await Promise.allSettled([
      // Transfer non-duplicate wishlists to customer
      ...toTransfer.map((item) =>
        this.db
          .update(wishlists)
          .set({
            customerId,
            email,
            sessionId: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(wishlists.id, item.id),
              eq(wishlists.organizationId, this.organizationId)
            )
          )
      ),
      // Delete duplicate wishlists
      ...toDelete.map((item) =>
        this.db
          .delete(wishlists)
          .where(
            and(
              eq(wishlists.id, item.id),
              eq(wishlists.organizationId, this.organizationId)
            )
          )
      ),
    ]);
  }

  async getWishlistsForPriceDropAlert(tourId: string): Promise<Wishlist[]> {
    return this.db
      .select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.organizationId, this.organizationId),
          eq(wishlists.tourId, tourId),
          eq(wishlists.priceDropAlert, true)
        )
      );
  }

  async getStats(): Promise<{
    total: number;
    withPriceAlerts: number;
    withAvailabilityAlerts: number;
    topWishlistedTours: Array<{ tourId: string; count: number }>;
  }> {
    const [totalResult, priceAlertResult, availabilityAlertResult, topToursResult] =
      await Promise.all([
        this.db
          .select({ count: count() })
          .from(wishlists)
          .where(eq(wishlists.organizationId, this.organizationId)),
        this.db
          .select({ count: count() })
          .from(wishlists)
          .where(
            and(
              eq(wishlists.organizationId, this.organizationId),
              eq(wishlists.priceDropAlert, true)
            )
          ),
        this.db
          .select({ count: count() })
          .from(wishlists)
          .where(
            and(
              eq(wishlists.organizationId, this.organizationId),
              eq(wishlists.availabilityAlert, true)
            )
          ),
        this.db
          .select({
            tourId: wishlists.tourId,
            count: count(),
          })
          .from(wishlists)
          .where(eq(wishlists.organizationId, this.organizationId))
          .groupBy(wishlists.tourId)
          .orderBy(desc(count()))
          .limit(10),
      ]);

    return {
      total: totalResult[0]?.count ?? 0,
      withPriceAlerts: priceAlertResult[0]?.count ?? 0,
      withAvailabilityAlerts: availabilityAlertResult[0]?.count ?? 0,
      topWishlistedTours: topToursResult.map((r) => ({
        tourId: r.tourId,
        count: r.count,
      })),
    };
  }
}
