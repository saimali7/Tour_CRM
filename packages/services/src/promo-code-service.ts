import { eq, and, desc, asc, sql, lte, gte, lt } from "drizzle-orm";
import { promoCodes, promoCodeUsage, type PromoCode, type PromoCodeUsage } from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ValidationError,
  ConflictError,
  ServiceError,
} from "./types";

export interface PromoCodeFilters {
  isActive?: boolean;
  tourId?: string;
  search?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export type PromoCodeSortField = "code" | "createdAt" | "validFrom" | "validUntil";

export interface CreatePromoCodeInput {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  minBookingAmount?: number;
  appliesTo?: "all" | "specific";
  tourIds?: string[];
  isActive?: boolean;
}

export interface UpdatePromoCodeInput
  extends Partial<Omit<CreatePromoCodeInput, "code">> {}

export interface PromoCodeValidation {
  valid: boolean;
  error?: string;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
  };
  promoCode?: PromoCode;
}

export interface PromoCodeUsageStats {
  totalUses: number;
  totalDiscount: number;
  uniqueCustomers: number;
  averageDiscount: number;
  lastUsedAt: Date | null;
}

export class PromoCodeService extends BaseService {
  async getAll(
    filters: PromoCodeFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<PromoCodeSortField> = {
      field: "createdAt",
      direction: "desc",
    }
  ): Promise<PaginatedResult<PromoCode>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(promoCodes.organizationId, this.organizationId)];

    if (filters.isActive !== undefined) {
      conditions.push(eq(promoCodes.isActive, filters.isActive));
    }

    if (filters.search) {
      conditions.push(
        sql`${promoCodes.code} ILIKE ${`%${filters.search}%`}`
      );
    }

    if (filters.dateRange?.from) {
      conditions.push(gte(promoCodes.validUntil, filters.dateRange.from));
    }

    if (filters.dateRange?.to) {
      conditions.push(lte(promoCodes.validFrom, filters.dateRange.to));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(promoCodes[sort.field])
        : desc(promoCodes[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(promoCodes)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(promoCodes)
        .where(and(...conditions)),
    ]);

    return {
      data,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getById(id: string): Promise<PromoCode> {
    const promoCode = await this.db.query.promoCodes.findFirst({
      where: and(
        eq(promoCodes.id, id),
        eq(promoCodes.organizationId, this.organizationId)
      ),
    });

    if (!promoCode) {
      throw new NotFoundError("PromoCode", id);
    }

    return promoCode;
  }

  async getByCode(code: string): Promise<PromoCode | null> {
    const promoCode = await this.db.query.promoCodes.findFirst({
      where: and(
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.organizationId, this.organizationId)
      ),
    });

    return promoCode || null;
  }

  async create(input: CreatePromoCodeInput): Promise<PromoCode> {
    const code = input.code.toUpperCase().trim();

    // Check if code already exists
    const existing = await this.getByCode(code);
    if (existing) {
      throw new ConflictError(`Promo code "${code}" already exists`);
    }

    // Validate date range if both dates provided
    if (input.validFrom && input.validUntil && input.validUntil <= input.validFrom) {
      throw new ValidationError("Valid until date must be after valid from date");
    }

    // Validate discount value
    if (input.discountType === "percentage" && input.discountValue > 100) {
      throw new ValidationError("Percentage discount cannot exceed 100%");
    }

    if (input.discountValue <= 0) {
      throw new ValidationError("Discount value must be greater than 0");
    }

    const [promoCode] = await this.db
      .insert(promoCodes)
      .values({
        organizationId: this.organizationId,
        code,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        maxUses: input.maxUses ?? null,
        maxUsesPerCustomer: input.maxUsesPerCustomer ?? null,
        minBookingAmount: input.minBookingAmount ? input.minBookingAmount.toString() : null,
        appliesTo: input.appliesTo ?? "all",
        tourIds: input.tourIds ?? null,
        currentUses: 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!promoCode) {
      throw new ServiceError("Failed to create promo code", "CREATE_FAILED", 500);
    }

    return promoCode;
  }

  async update(id: string, input: UpdatePromoCodeInput): Promise<PromoCode> {
    await this.getById(id);

    // Validate date range if both dates are provided
    if (
      input.validFrom &&
      input.validUntil &&
      input.validUntil <= input.validFrom
    ) {
      throw new ValidationError("Valid until date must be after valid from date");
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

    // Convert numeric fields to strings
    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };
    if (input.discountValue !== undefined) {
      updateData.discountValue = input.discountValue.toString();
    }
    if (input.minBookingAmount !== undefined) {
      updateData.minBookingAmount = input.minBookingAmount.toString();
    }

    const [promoCode] = await this.db
      .update(promoCodes)
      .set(updateData)
      .where(
        and(
          eq(promoCodes.id, id),
          eq(promoCodes.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!promoCode) {
      throw new NotFoundError("PromoCode", id);
    }

    return promoCode;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    // Check if promo code has been used
    const usageCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(promoCodeUsage)
      .where(
        and(
          eq(promoCodeUsage.promoCodeId, id),
          eq(promoCodeUsage.organizationId, this.organizationId)
        )
      );

    const count = usageCount[0]?.count ?? 0;
    if (count > 0) {
      throw new ValidationError(
        "Cannot delete promo code that has been used. Consider deactivating it instead."
      );
    }

    await this.db
      .delete(promoCodes)
      .where(
        and(
          eq(promoCodes.id, id),
          eq(promoCodes.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Validate if a promo code can be used for a booking
   */
  async validateCode(
    code: string,
    tourId: string,
    customerId: string,
    bookingAmount: number
  ): Promise<PromoCodeValidation> {
    const promoCode = await this.getByCode(code);

    if (!promoCode) {
      return {
        valid: false,
        error: "Invalid promo code",
      };
    }

    // Check if active
    if (!promoCode.isActive) {
      return {
        valid: false,
        error: "This promo code is not active",
      };
    }

    // Check date validity
    const now = new Date();
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return {
        valid: false,
        error: "This promo code is not yet valid",
      };
    }

    if (promoCode.validUntil && now > promoCode.validUntil) {
      return {
        valid: false,
        error: "This promo code has expired",
      };
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.currentUses && promoCode.currentUses >= promoCode.maxUses) {
      return {
        valid: false,
        error: "This promo code has reached its usage limit",
      };
    }

    // Check max uses per customer
    if (promoCode.maxUsesPerCustomer) {
      const customerUsageResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(promoCodeUsage)
        .where(
          and(
            eq(promoCodeUsage.promoCodeId, promoCode.id),
            eq(promoCodeUsage.customerId, customerId)
          )
        );

      const customerUsage = customerUsageResult[0]?.count ?? 0;

      if (customerUsage >= promoCode.maxUsesPerCustomer) {
        return {
          valid: false,
          error: "You have already used this promo code the maximum number of times",
        };
      }
    }

    // Check minimum booking amount
    if (promoCode.minBookingAmount) {
      const minAmount = parseFloat(promoCode.minBookingAmount);
      if (bookingAmount < minAmount) {
        return {
          valid: false,
          error: `Minimum booking amount is $${minAmount.toFixed(2)}`,
        };
      }
    }

    // Check tour applicability
    if (
      promoCode.appliesTo === "specific" &&
      promoCode.tourIds &&
      promoCode.tourIds.length > 0 &&
      !promoCode.tourIds.includes(tourId)
    ) {
      return {
        valid: false,
        error: "This promo code is not valid for this tour",
      };
    }

    // All checks passed
    return {
      valid: true,
      discount: {
        type: promoCode.discountType,
        value: parseFloat(promoCode.discountValue),
      },
      promoCode,
    };
  }

  /**
   * Apply a promo code to a booking and record usage
   */
  async applyCode(
    code: string,
    bookingId: string,
    customerId: string,
    originalAmount: number,
    finalAmount: number,
    discountAmount: number
  ): Promise<PromoCodeUsage> {
    const promoCode = await this.getByCode(code);

    if (!promoCode) {
      throw new NotFoundError("PromoCode", code);
    }

    // Record usage
    const [usage] = await this.db
      .insert(promoCodeUsage)
      .values({
        organizationId: this.organizationId,
        promoCodeId: promoCode.id,
        bookingId,
        customerId,
        discountAmount: discountAmount.toString(),
        originalAmount: originalAmount.toString(),
        finalAmount: finalAmount.toString(),
      })
      .returning();

    if (!usage) {
      throw new ServiceError("Failed to record promo code usage", "CREATE_FAILED", 500);
    }

    // Atomic increment with max uses check to prevent race conditions
    const updateResult = await this.db
      .update(promoCodes)
      .set({
        currentUses: sql`COALESCE(${promoCodes.currentUses}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(promoCodes.id, promoCode.id),
          eq(promoCodes.organizationId, this.organizationId),
          // Only increment if we haven't hit max uses (race condition protection)
          sql`${promoCodes.maxUses} IS NULL OR COALESCE(${promoCodes.currentUses}, 0) < ${promoCodes.maxUses}`
        )
      )
      .returning();

    // If no rows updated, max uses was exceeded (race condition caught)
    if (updateResult.length === 0) {
      // Rollback the usage record
      await this.db.delete(promoCodeUsage).where(eq(promoCodeUsage.id, usage.id));
      throw new ValidationError("Promo code usage limit reached. Please try a different code.");
    }

    return usage;
  }

  /**
   * Get usage statistics for a promo code
   */
  async getUsageStats(promoCodeId: string): Promise<PromoCodeUsageStats> {
    await this.getById(promoCodeId);

    const statsResult = await this.db
      .select({
        totalUses: sql<number>`count(*)::int`,
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${promoCodeUsage.discountAmount} AS NUMERIC)), 0)::numeric`,
        uniqueCustomers: sql<number>`count(DISTINCT ${promoCodeUsage.customerId})::int`,
        lastUsedAt: sql<Date>`MAX(${promoCodeUsage.usedAt})`,
      })
      .from(promoCodeUsage)
      .where(eq(promoCodeUsage.promoCodeId, promoCodeId));

    const stats = statsResult[0];
    const totalDiscount = stats?.totalDiscount ? parseFloat(stats.totalDiscount.toString()) : 0;

    return {
      totalUses: stats?.totalUses ?? 0,
      totalDiscount,
      uniqueCustomers: stats?.uniqueCustomers ?? 0,
      averageDiscount:
        stats?.totalUses && stats.totalUses > 0 ? totalDiscount / stats.totalUses : 0,
      lastUsedAt: stats?.lastUsedAt || null,
    };
  }

  /**
   * Generate a random promo code
   */
  generateCode(length: number = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar chars
    let code = "";

    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Generate a unique promo code (checks for conflicts)
   */
  async generateUniqueCode(length: number = 8): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCode(length);
      const existing = await this.getByCode(code);

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new ServiceError("Failed to generate unique promo code after multiple attempts", "GENERATION_FAILED", 500);
  }

  /**
   * Get promo code stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    totalUses: number;
    totalDiscount: number;
  }> {
    const now = new Date();

    // Get all promo codes for this org and calculate stats in JS
    // This avoids PostgreSQL date serialization issues with raw SQL
    const allCodes = await this.db
      .select({
        isActive: promoCodes.isActive,
        validUntil: promoCodes.validUntil,
        currentUses: promoCodes.currentUses,
      })
      .from(promoCodes)
      .where(eq(promoCodes.organizationId, this.organizationId));

    const stats = {
      total: allCodes.length,
      active: allCodes.filter(c => c.isActive === true).length,
      inactive: allCodes.filter(c => c.isActive === false || c.isActive === null).length,
      expired: allCodes.filter(c => c.validUntil && new Date(c.validUntil) < now).length,
      totalUses: allCodes.reduce((sum, c) => sum + (c.currentUses || 0), 0),
    };

    // Get total discount from usage table
    const discountResult = await this.db
      .select({
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${promoCodeUsage.discountAmount} AS NUMERIC)), 0)::numeric`,
      })
      .from(promoCodeUsage)
      .where(eq(promoCodeUsage.organizationId, this.organizationId));

    const totalDiscount = discountResult[0]?.totalDiscount ? parseFloat(discountResult[0].totalDiscount.toString()) : 0;

    return {
      total: stats.total,
      active: stats.active,
      inactive: stats.inactive,
      expired: stats.expired,
      totalUses: stats.totalUses,
      totalDiscount,
    };
  }

  /**
   * Deactivate a promo code
   */
  async deactivate(id: string): Promise<PromoCode> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate a promo code
   */
  async activate(id: string): Promise<PromoCode> {
    return this.update(id, { isActive: true });
  }

  /**
   * Mark expired promo codes (can be run as a scheduled job)
   */
  async markExpired(): Promise<number> {
    const now = new Date();

    const result = await this.db
      .update(promoCodes)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(promoCodes.organizationId, this.organizationId),
          eq(promoCodes.isActive, true),
          lt(promoCodes.validUntil, now)
        )
      )
      .returning();

    return result.length;
  }
}
