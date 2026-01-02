import { eq, and, desc, asc, sql, gte, lte, or } from "drizzle-orm";
import { groupDiscounts, type GroupDiscount } from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ValidationError,
  ServiceError,
} from "./types";

export interface GroupDiscountFilters {
  tourId?: string;
  isActive?: boolean;
}

export type GroupDiscountSortField = "minParticipants" | "priority" | "createdAt";

export interface CreateGroupDiscountInput {
  name: string;
  description?: string;
  minParticipants: number;
  maxParticipants?: number; // null = no upper limit
  discountType: "percentage" | "fixed";
  discountValue: number;
  appliesTo?: "all" | "specific";
  tourIds?: string[]; // For specific tours
  priority?: number;
  isActive?: boolean;
}

export interface UpdateGroupDiscountInput
  extends Partial<CreateGroupDiscountInput> {}

export interface GroupDiscountResult {
  discountedPrice: number;
  discount: number;
  tierName: string | null;
  appliedDiscount: GroupDiscount | null;
}

export class GroupDiscountService extends BaseService {
  async getAll(
    filters: GroupDiscountFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<GroupDiscountSortField> = {
      field: "minParticipants",
      direction: "asc",
    }
  ): Promise<PaginatedResult<GroupDiscount>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(groupDiscounts.organizationId, this.organizationId)];

    if (filters.tourId !== undefined) {
      if (filters.tourId === null) {
        // Global discounts only (apply to all tours)
        conditions.push(sql`${groupDiscounts.appliesTo} = 'all'`);
      } else {
        // Specific tour - check if tourIds array contains the tourId
        conditions.push(sql`${filters.tourId} = ANY(${groupDiscounts.tourIds})`);
      }
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(groupDiscounts.isActive, filters.isActive));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(groupDiscounts[sort.field])
        : desc(groupDiscounts[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(groupDiscounts)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(groupDiscounts)
        .where(and(...conditions)),
    ]);

    return {
      data,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getActive(
    filters: Omit<GroupDiscountFilters, "isActive"> = {}
  ): Promise<GroupDiscount[]> {
    const conditions = [
      eq(groupDiscounts.organizationId, this.organizationId),
      eq(groupDiscounts.isActive, true),
    ];

    if (filters.tourId !== undefined) {
      if (filters.tourId === null) {
        conditions.push(sql`${groupDiscounts.appliesTo} = 'all'`);
      } else {
        conditions.push(sql`${filters.tourId} = ANY(${groupDiscounts.tourIds})`);
      }
    }

    return this.db
      .select()
      .from(groupDiscounts)
      .where(and(...conditions))
      .orderBy(desc(groupDiscounts.priority), asc(groupDiscounts.minParticipants));
  }

  async getById(id: string): Promise<GroupDiscount> {
    const discount = await this.db.query.groupDiscounts.findFirst({
      where: and(
        eq(groupDiscounts.id, id),
        eq(groupDiscounts.organizationId, this.organizationId)
      ),
    });

    if (!discount) {
      throw new NotFoundError("GroupDiscount", id);
    }

    return discount;
  }

  async create(input: CreateGroupDiscountInput): Promise<GroupDiscount> {
    // Validate participant range
    if (input.minParticipants < 1) {
      throw new ValidationError("Minimum participants must be at least 1");
    }

    if (
      input.maxParticipants &&
      input.maxParticipants < input.minParticipants
    ) {
      throw new ValidationError(
        "Maximum participants must be greater than or equal to minimum participants"
      );
    }

    // Validate discount value
    if (input.discountType === "percentage" && input.discountValue > 100) {
      throw new ValidationError("Percentage discount cannot exceed 100%");
    }

    if (input.discountValue <= 0) {
      throw new ValidationError("Discount value must be greater than 0");
    }

    const [discount] = await this.db
      .insert(groupDiscounts)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        description: input.description,
        minParticipants: input.minParticipants,
        maxParticipants: input.maxParticipants || null,
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        appliesTo: input.appliesTo ?? "all",
        tourIds: input.tourIds ?? null,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!discount) {
      throw new ServiceError("Failed to create group discount", "CREATE_FAILED", 500);
    }

    return discount;
  }

  async update(
    id: string,
    input: UpdateGroupDiscountInput
  ): Promise<GroupDiscount> {
    await this.getById(id);

    // Validate participant range if both are provided
    if (
      input.minParticipants &&
      input.maxParticipants &&
      input.maxParticipants < input.minParticipants
    ) {
      throw new ValidationError(
        "Maximum participants must be greater than or equal to minimum participants"
      );
    }

    // Validate minimum participants
    if (input.minParticipants !== undefined && input.minParticipants < 1) {
      throw new ValidationError("Minimum participants must be at least 1");
    }

    // Validate discount value
    if (
      input.discountType === "percentage" &&
      input.discountValue !== undefined &&
      input.discountValue > 100
    ) {
      throw new ValidationError("Percentage discount cannot exceed 100%");
    }

    if (input.discountValue !== undefined && input.discountValue <= 0) {
      throw new ValidationError("Discount value must be greater than 0");
    }

    // Convert discountValue to string if provided
    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };
    if (input.discountValue !== undefined) {
      updateData.discountValue = input.discountValue.toString();
    }

    const [discount] = await this.db
      .update(groupDiscounts)
      .set(updateData)
      .where(
        and(
          eq(groupDiscounts.id, id),
          eq(groupDiscounts.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!discount) {
      throw new NotFoundError("GroupDiscount", id);
    }

    return discount;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(groupDiscounts)
      .where(
        and(
          eq(groupDiscounts.id, id),
          eq(groupDiscounts.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Calculate group discount for a tour based on participant count
   * Finds the highest priority matching tier and applies the discount
   */
  async calculateDiscount(
    tourId: string,
    participantCount: number,
    basePrice: number
  ): Promise<GroupDiscountResult> {
    // Get applicable discounts: tour-specific and global (appliesTo = 'all')
    const applicableDiscounts = await this.db
      .select()
      .from(groupDiscounts)
      .where(
        and(
          eq(groupDiscounts.organizationId, this.organizationId),
          eq(groupDiscounts.isActive, true),
          or(
            eq(groupDiscounts.appliesTo, "all"),
            sql`${tourId} = ANY(${groupDiscounts.tourIds})`
          ),
          lte(groupDiscounts.minParticipants, participantCount),
          or(
            sql`${groupDiscounts.maxParticipants} IS NULL`, // No upper limit
            gte(groupDiscounts.maxParticipants, participantCount)
          )
        )
      )
      .orderBy(desc(groupDiscounts.priority), desc(groupDiscounts.minParticipants))
      .limit(1);

    const discount = applicableDiscounts[0];

    if (!discount) {
      // No group discount applies
      return {
        discountedPrice: basePrice,
        discount: 0,
        tierName: null,
        appliedDiscount: null,
      };
    }

    let discountAmount = 0;
    let discountedPrice = basePrice;
    const discountValue = parseFloat(discount.discountValue);

    if (discount.discountType === "percentage") {
      // Calculate percentage discount
      discountAmount = (basePrice * discountValue) / 100;
      discountedPrice = basePrice - discountAmount;
    } else {
      // Fixed discount
      discountAmount = discountValue;
      discountedPrice = basePrice - discountAmount;
    }

    // Ensure price doesn't go negative
    if (discountedPrice < 0) {
      discountedPrice = 0;
      discountAmount = basePrice;
    }

    return {
      discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimals
      discount: Math.round(discountAmount * 100) / 100,
      tierName: discount.name,
      appliedDiscount: discount,
    };
  }

  /**
   * Get all applicable tiers for a tour
   * Useful for showing customers potential savings
   */
  async getApplicableTiers(tourId: string): Promise<GroupDiscount[]> {
    return this.db
      .select()
      .from(groupDiscounts)
      .where(
        and(
          eq(groupDiscounts.organizationId, this.organizationId),
          eq(groupDiscounts.isActive, true),
          or(
            eq(groupDiscounts.appliesTo, "all"),
            sql`${tourId} = ANY(${groupDiscounts.tourIds})`
          )
        )
      )
      .orderBy(asc(groupDiscounts.minParticipants));
  }

  /**
   * Get the next discount tier (for upselling)
   */
  async getNextTier(
    tourId: string,
    currentParticipants: number
  ): Promise<GroupDiscount | null> {
    // Find the next tier above current participant count
    const nextTiers = await this.db
      .select()
      .from(groupDiscounts)
      .where(
        and(
          eq(groupDiscounts.organizationId, this.organizationId),
          eq(groupDiscounts.isActive, true),
          or(
            eq(groupDiscounts.appliesTo, "all"),
            sql`${tourId} = ANY(${groupDiscounts.tourIds})`
          ),
          sql`${groupDiscounts.minParticipants} > ${currentParticipants}`
        )
      )
      .orderBy(asc(groupDiscounts.minParticipants))
      .limit(1);

    return nextTiers[0] || null;
  }

  /**
   * Check for overlapping discount tiers
   */
  async findOverlapping(
    tourIds: string[] | null,
    minParticipants: number,
    maxParticipants: number | null,
    excludeId?: string
  ): Promise<GroupDiscount[]> {
    const conditions = [
      eq(groupDiscounts.organizationId, this.organizationId),
    ];

    // Match discounts that apply to same tours
    if (tourIds && tourIds.length > 0) {
      const tourCondition = or(
        eq(groupDiscounts.appliesTo, "all"),
        sql`${groupDiscounts.tourIds} && ${tourIds}` // Array overlap operator
      );
      if (tourCondition) {
        conditions.push(tourCondition);
      }
    } else {
      conditions.push(eq(groupDiscounts.appliesTo, "all"));
    }

    // Check for range overlap
    // Ranges overlap if: (start1 <= end2) AND (end1 >= start2)
    if (maxParticipants) {
      const rangeCondition = and(
        lte(groupDiscounts.minParticipants, maxParticipants),
        or(
          sql`${groupDiscounts.maxParticipants} IS NULL`,
          gte(groupDiscounts.maxParticipants, minParticipants)
        )
      );
      if (rangeCondition) {
        conditions.push(rangeCondition);
      }
    } else {
      // No max, so overlaps if any tier starts at or after our min
      conditions.push(gte(groupDiscounts.minParticipants, minParticipants));
    }

    if (excludeId) {
      conditions.push(sql`${groupDiscounts.id} != ${excludeId}`);
    }

    return this.db
      .select()
      .from(groupDiscounts)
      .where(and(...conditions));
  }

  /**
   * Get group discount stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    globalDiscounts: number;
    tourSpecificDiscounts: number;
  }> {
    const statsResult = await this.db
      .select({
        total: sql<number>`COUNT(*)::int`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${groupDiscounts.isActive} = true)::int`,
        inactive: sql<number>`COUNT(*) FILTER (WHERE ${groupDiscounts.isActive} = false OR ${groupDiscounts.isActive} IS NULL)::int`,
        globalDiscounts: sql<number>`COUNT(*) FILTER (WHERE ${groupDiscounts.appliesTo} = 'all')::int`,
        tourSpecificDiscounts: sql<number>`COUNT(*) FILTER (WHERE ${groupDiscounts.appliesTo} = 'specific')::int`,
      })
      .from(groupDiscounts)
      .where(eq(groupDiscounts.organizationId, this.organizationId));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      active: stats?.active ?? 0,
      inactive: stats?.inactive ?? 0,
      globalDiscounts: stats?.globalDiscounts ?? 0,
      tourSpecificDiscounts: stats?.tourSpecificDiscounts ?? 0,
    };
  }

  /**
   * Activate a discount
   */
  async activate(id: string): Promise<GroupDiscount> {
    return this.update(id, { isActive: true });
  }

  /**
   * Deactivate a discount
   */
  async deactivate(id: string): Promise<GroupDiscount> {
    return this.update(id, { isActive: false });
  }
}
