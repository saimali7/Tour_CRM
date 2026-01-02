import { eq, and, desc, asc, sql, lte, gte } from "drizzle-orm";
import { seasonalPricing, type SeasonalPricing } from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ValidationError,
  ServiceError,
} from "./types";

export interface SeasonalPricingFilters {
  tourId?: string;
  isActive?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export type SeasonalPricingSortField = "startDate" | "priority" | "createdAt";

export interface CreateSeasonalPricingInput {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  adjustmentType: "percentage" | "fixed";
  adjustmentValue: number;
  appliesTo?: "all" | "specific";
  tourIds?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdateSeasonalPricingInput
  extends Partial<CreateSeasonalPricingInput> {}

export interface PriceAdjustment {
  adjustedPrice: number;
  adjustment: number;
  seasonName: string | null;
  appliedSeason: SeasonalPricing | null;
}

export class SeasonalPricingService extends BaseService {
  async getAll(
    filters: SeasonalPricingFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<SeasonalPricingSortField> = {
      field: "startDate",
      direction: "asc",
    }
  ): Promise<PaginatedResult<SeasonalPricing>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(seasonalPricing.organizationId, this.organizationId)];

    if (filters.tourId) {
      conditions.push(sql`${filters.tourId} = ANY(${seasonalPricing.tourIds})`);
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(seasonalPricing.isActive, filters.isActive));
    }

    if (filters.dateRange?.from) {
      conditions.push(gte(seasonalPricing.endDate, filters.dateRange.from.toISOString().split('T')[0]!));
    }

    if (filters.dateRange?.to) {
      conditions.push(lte(seasonalPricing.startDate, filters.dateRange.to.toISOString().split('T')[0]!));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(seasonalPricing[sort.field])
        : desc(seasonalPricing[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(seasonalPricing)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(seasonalPricing)
        .where(and(...conditions)),
    ]);

    return {
      data,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getActive(
    filters: Omit<SeasonalPricingFilters, "isActive"> = {}
  ): Promise<SeasonalPricing[]> {
    const conditions = [
      eq(seasonalPricing.organizationId, this.organizationId),
      eq(seasonalPricing.isActive, true),
    ];

    if (filters.tourId) {
      conditions.push(sql`${filters.tourId} = ANY(${seasonalPricing.tourIds})`);
    }

    if (filters.dateRange?.from) {
      conditions.push(gte(seasonalPricing.endDate, filters.dateRange.from.toISOString().split('T')[0]!));
    }

    if (filters.dateRange?.to) {
      conditions.push(lte(seasonalPricing.startDate, filters.dateRange.to.toISOString().split('T')[0]!));
    }

    return this.db
      .select()
      .from(seasonalPricing)
      .where(and(...conditions))
      .orderBy(desc(seasonalPricing.priority), asc(seasonalPricing.startDate));
  }

  async getById(id: string): Promise<SeasonalPricing> {
    const pricing = await this.db.query.seasonalPricing.findFirst({
      where: and(
        eq(seasonalPricing.id, id),
        eq(seasonalPricing.organizationId, this.organizationId)
      ),
    });

    if (!pricing) {
      throw new NotFoundError("SeasonalPricing", id);
    }

    return pricing;
  }

  async create(input: CreateSeasonalPricingInput): Promise<SeasonalPricing> {
    // Validate date range
    if (input.endDate < input.startDate) {
      throw new ValidationError("End date must be after start date");
    }

    // Validate adjustment value
    if (input.adjustmentType === "percentage" && input.adjustmentValue < -100) {
      throw new ValidationError(
        "Percentage adjustment cannot be less than -100%"
      );
    }

    const [pricing] = await this.db
      .insert(seasonalPricing)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        description: input.description,
        startDate: input.startDate.toISOString().split('T')[0]!,
        endDate: input.endDate.toISOString().split('T')[0]!,
        adjustmentType: input.adjustmentType,
        adjustmentValue: input.adjustmentValue.toString(),
        appliesTo: input.appliesTo ?? "all",
        tourIds: input.tourIds ?? null,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!pricing) {
      throw new ServiceError("Failed to create seasonal pricing", "CREATE_FAILED", 500);
    }

    return pricing;
  }

  async update(
    id: string,
    input: UpdateSeasonalPricingInput
  ): Promise<SeasonalPricing> {
    await this.getById(id);

    // Validate date range if both dates are provided
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new ValidationError("End date must be after start date");
    }

    // Validate adjustment value
    if (
      input.adjustmentType === "percentage" &&
      input.adjustmentValue !== undefined &&
      input.adjustmentValue < -100
    ) {
      throw new ValidationError(
        "Percentage adjustment cannot be less than -100%"
      );
    }

    // Convert fields to appropriate types
    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };
    if (input.startDate) {
      updateData.startDate = input.startDate.toISOString().split('T')[0];
    }
    if (input.endDate) {
      updateData.endDate = input.endDate.toISOString().split('T')[0];
    }
    if (input.adjustmentValue !== undefined) {
      updateData.adjustmentValue = input.adjustmentValue.toString();
    }

    const [pricing] = await this.db
      .update(seasonalPricing)
      .set(updateData)
      .where(
        and(
          eq(seasonalPricing.id, id),
          eq(seasonalPricing.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!pricing) {
      throw new NotFoundError("SeasonalPricing", id);
    }

    return pricing;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(seasonalPricing)
      .where(
        and(
          eq(seasonalPricing.id, id),
          eq(seasonalPricing.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Calculate price adjustment for a tour on a specific date
   * Finds the highest priority matching season and applies the adjustment
   */
  async calculateAdjustment(
    tourId: string,
    date: Date,
    basePrice: number
  ): Promise<PriceAdjustment> {
    const dateStr = date.toISOString().split('T')[0]!;

    // Get all active seasons that apply to this tour and date
    const applicableSeasons = await this.db
      .select()
      .from(seasonalPricing)
      .where(
        and(
          eq(seasonalPricing.organizationId, this.organizationId),
          eq(seasonalPricing.isActive, true),
          sql`${tourId} = ANY(${seasonalPricing.tourIds}) OR ${seasonalPricing.appliesTo} = 'all'`,
          lte(seasonalPricing.startDate, dateStr),
          gte(seasonalPricing.endDate, dateStr)
        )
      )
      .orderBy(desc(seasonalPricing.priority))
      .limit(1);

    const season = applicableSeasons[0];

    if (!season) {
      // No seasonal pricing applies
      return {
        adjustedPrice: basePrice,
        adjustment: 0,
        seasonName: null,
        appliedSeason: null,
      };
    }

    let adjustment = 0;
    let adjustedPrice = basePrice;
    const adjustmentValue = parseFloat(season.adjustmentValue);

    if (season.adjustmentType === "percentage") {
      // Calculate percentage adjustment
      adjustment = (basePrice * adjustmentValue) / 100;
      adjustedPrice = basePrice + adjustment;
    } else {
      // Fixed adjustment
      adjustment = adjustmentValue;
      adjustedPrice = basePrice + adjustment;
    }

    // Ensure price doesn't go negative
    if (adjustedPrice < 0) {
      adjustedPrice = 0;
    }

    return {
      adjustedPrice: Math.round(adjustedPrice * 100) / 100, // Round to 2 decimals
      adjustment: Math.round(adjustment * 100) / 100,
      seasonName: season.name,
      appliedSeason: season,
    };
  }

  /**
   * Check for overlapping seasons on the same tour
   */
  async findOverlapping(
    tourIds: string[] | null,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<SeasonalPricing[]> {
    const startDateStr = startDate.toISOString().split('T')[0]!;
    const endDateStr = endDate.toISOString().split('T')[0]!;

    const conditions = [
      eq(seasonalPricing.organizationId, this.organizationId),
      sql`(${seasonalPricing.startDate}, ${seasonalPricing.endDate}) OVERLAPS (${startDateStr}, ${endDateStr})`,
    ];

    // Match seasons that apply to same tours
    if (tourIds && tourIds.length > 0) {
      conditions.push(
        sql`${seasonalPricing.tourIds} && ${tourIds} OR ${seasonalPricing.appliesTo} = 'all'`
      );
    } else {
      conditions.push(eq(seasonalPricing.appliesTo, "all"));
    }

    if (excludeId) {
      conditions.push(sql`${seasonalPricing.id} != ${excludeId}`);
    }

    return this.db
      .select()
      .from(seasonalPricing)
      .where(and(...conditions));
  }

  /**
   * Get seasonal pricing stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    upcoming: number;
    current: number;
    past: number;
  }> {
    const now = new Date().toISOString().split('T')[0]!;

    const statsResult = await this.db
      .select({
        total: sql<number>`COUNT(*)::int`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${seasonalPricing.isActive} = true)::int`,
        inactive: sql<number>`COUNT(*) FILTER (WHERE ${seasonalPricing.isActive} = false OR ${seasonalPricing.isActive} IS NULL)::int`,
        upcoming: sql<number>`COUNT(*) FILTER (WHERE ${seasonalPricing.startDate} > ${now})::int`,
        current: sql<number>`COUNT(*) FILTER (WHERE ${seasonalPricing.startDate} <= ${now} AND ${seasonalPricing.endDate} >= ${now})::int`,
        past: sql<number>`COUNT(*) FILTER (WHERE ${seasonalPricing.endDate} < ${now})::int`,
      })
      .from(seasonalPricing)
      .where(eq(seasonalPricing.organizationId, this.organizationId));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      active: stats?.active ?? 0,
      inactive: stats?.inactive ?? 0,
      upcoming: stats?.upcoming ?? 0,
      current: stats?.current ?? 0,
      past: stats?.past ?? 0,
    };
  }
}
