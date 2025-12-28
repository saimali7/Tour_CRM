import { eq, and, desc, asc, sql, count, ilike, or, inArray } from "drizzle-orm";
import {
  tours,
  tourPricingTiers,
  tourVariants,
  schedules,
  products,
  type Tour,
  type TourStatus,
  type TourPricingTier,
  type TourVariant,
  type PriceModifierType,
  type Product,
  type TourWithProduct,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ConflictError,
} from "./types";

export interface TourFilters {
  status?: TourStatus;
  isPublic?: boolean;
  category?: string;
  search?: string;
}

export type TourSortField = "name" | "createdAt" | "updatedAt" | "basePrice";

export interface TourScheduleStats {
  upcomingCount: number;
  totalCapacity: number;
  totalBooked: number;
  utilizationPercent: number;
  nextScheduleDate: Date | null;
}

export interface TourWithScheduleStats extends Tour {
  scheduleStats: TourScheduleStats;
}

export interface CreateTourInput {
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  durationMinutes: number;
  minParticipants?: number;
  maxParticipants: number;
  guestsPerGuide?: number;
  basePrice: string;
  currency?: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  meetingPointLat?: string;
  meetingPointLng?: string;
  coverImageUrl?: string;
  images?: string[];
  category?: string;
  tags?: string[];
  includes?: string[];
  excludes?: string[];
  requirements?: string[];
  accessibility?: string;
  cancellationPolicy?: string;
  cancellationHours?: number;
  // Booking window settings
  minimumNoticeHours?: number;
  maximumAdvanceDays?: number;
  allowSameDayBooking?: boolean;
  sameDayCutoffTime?: string;
  status?: TourStatus;
  isPublic?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateTourInput extends Partial<CreateTourInput> {}

export class TourService extends BaseService {
  /**
   * Get all tours with filtering, pagination, and sorting
   */
  async getAll(
    filters: TourFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<TourSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<Tour>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(tours.organizationId, this.organizationId)];

    if (filters.status) {
      conditions.push(eq(tours.status, filters.status));
    }
    if (filters.isPublic !== undefined) {
      conditions.push(eq(tours.isPublic, filters.isPublic));
    }
    if (filters.category) {
      conditions.push(eq(tours.category, filters.category));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(tours.name, `%${filters.search}%`),
          ilike(tours.description, `%${filters.search}%`)
        )!
      );
    }

    const orderBy =
      sort.direction === "asc" ? asc(tours[sort.field]) : desc(tours[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(tours)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(tours)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get all tours with schedule stats (upcoming count, capacity, utilization)
   * Uses LEFT JOIN with aggregation for efficiency
   */
  async getAllWithScheduleStats(
    filters: TourFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<TourSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<TourWithScheduleStats>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(tours.organizationId, this.organizationId)];

    if (filters.status) {
      conditions.push(eq(tours.status, filters.status));
    }
    if (filters.isPublic !== undefined) {
      conditions.push(eq(tours.isPublic, filters.isPublic));
    }
    if (filters.category) {
      conditions.push(eq(tours.category, filters.category));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(tours.name, `%${filters.search}%`),
          ilike(tours.description, `%${filters.search}%`)
        )!
      );
    }

    const orderBy =
      sort.direction === "asc" ? asc(tours[sort.field]) : desc(tours[sort.field]);

    // First, get filtered/sorted tours
    const [toursResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(tours)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(tours)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    // If no tours, return early
    if (toursResult.length === 0) {
      return {
        data: [],
        ...this.paginationMeta(total, page, limit),
      };
    }

    // Get schedule stats for these tours in a separate query
    const tourIds = toursResult.map(t => t.id);
    const now = new Date().toISOString();

    const scheduleStats = await this.db
      .select({
        tourId: schedules.tourId,
        upcomingCount: sql<number>`COUNT(*)::int`,
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)::int`,
        totalBooked: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)::int`,
        nextScheduleDate: sql<Date | null>`MIN(${schedules.startsAt})`,
      })
      .from(schedules)
      .where(
        and(
          inArray(schedules.tourId, tourIds),
          eq(schedules.organizationId, this.organizationId),
          sql`${schedules.startsAt} > ${now}`,
          sql`${schedules.status} != 'cancelled'`
        )
      )
      .groupBy(schedules.tourId);

    // Create a map for quick lookup
    const statsMap = new Map(scheduleStats.map(s => [s.tourId, s]));

    // Transform data to include scheduleStats
    const toursWithStats: TourWithScheduleStats[] = toursResult.map((tour) => {
      const stats = statsMap.get(tour.id);
      const upcomingCount = Number(stats?.upcomingCount) || 0;
      const totalCapacity = Number(stats?.totalCapacity) || 0;
      const totalBooked = Number(stats?.totalBooked) || 0;
      const utilizationPercent = totalCapacity > 0
        ? Math.round((totalBooked / totalCapacity) * 100)
        : 0;

      return {
        ...tour,
        scheduleStats: {
          upcomingCount,
          totalCapacity,
          totalBooked,
          utilizationPercent,
          nextScheduleDate: stats?.nextScheduleDate ?? null,
        },
      };
    });

    return {
      data: toursWithStats,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single tour by ID
   */
  async getById(id: string): Promise<Tour> {
    const tour = await this.db.query.tours.findFirst({
      where: and(eq(tours.id, id), eq(tours.organizationId, this.organizationId)),
    });

    if (!tour) {
      throw new NotFoundError("Tour", id);
    }

    return tour;
  }

  /**
   * Get a tour by slug
   */
  async getBySlug(slug: string): Promise<Tour> {
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.slug, slug),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour");
    }

    return tour;
  }

  /**
   * Create a new tour (with product in transaction)
   */
  async create(input: CreateTourInput): Promise<TourWithProduct> {
    const slug = input.slug || this.slugify(input.name);

    // Check if slug already exists in products (unified catalog)
    const existingProduct = await this.db.query.products.findFirst({
      where: and(
        eq(products.slug, slug),
        eq(products.organizationId, this.organizationId)
      ),
    });

    if (existingProduct) {
      throw new ConflictError(`Product with slug "${slug}" already exists`);
    }

    // Also check tours for backward compat
    const existingTour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.slug, slug),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (existingTour) {
      throw new ConflictError(`Tour with slug "${slug}" already exists`);
    }

    // Map tour status to product status
    const productStatus = this.mapTourStatusToProductStatus(input.status || "draft");

    // Create product and tour in a transaction
    return await this.db.transaction(async (tx) => {
      // 1. Create product first (master catalog)
      const [product] = await tx
        .insert(products)
        .values({
          organizationId: this.organizationId,
          type: "tour",
          name: input.name,
          slug,
          description: input.description,
          shortDescription: input.shortDescription,
          status: productStatus,
          visibility: input.isPublic ? "public" : "private",
          basePrice: input.basePrice,
          currency: input.currency || "USD",
          featuredImage: input.coverImageUrl,
          gallery: input.images || [],
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          tags: input.tags || [],
        })
        .returning();

      if (!product) {
        throw new Error("Failed to create product");
      }

      // 2. Create tour with productId (extension table)
      const [tour] = await tx
        .insert(tours)
        .values({
          organizationId: this.organizationId,
          productId: product.id, // Link to product
          // Keep duplicate fields for backward compatibility
          name: input.name,
          slug,
          description: input.description,
          shortDescription: input.shortDescription,
          durationMinutes: input.durationMinutes,
          minParticipants: input.minParticipants,
          maxParticipants: input.maxParticipants,
          guestsPerGuide: input.guestsPerGuide,
          basePrice: input.basePrice,
          currency: input.currency,
          meetingPoint: input.meetingPoint,
          meetingPointDetails: input.meetingPointDetails,
          meetingPointLat: input.meetingPointLat,
          meetingPointLng: input.meetingPointLng,
          coverImageUrl: input.coverImageUrl,
          images: input.images,
          category: input.category,
          tags: input.tags,
          includes: input.includes,
          excludes: input.excludes,
          requirements: input.requirements,
          accessibility: input.accessibility,
          cancellationPolicy: input.cancellationPolicy,
          cancellationHours: input.cancellationHours,
          minimumNoticeHours: input.minimumNoticeHours,
          maximumAdvanceDays: input.maximumAdvanceDays,
          allowSameDayBooking: input.allowSameDayBooking,
          sameDayCutoffTime: input.sameDayCutoffTime,
          status: input.status || "draft",
          isPublic: input.isPublic,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        })
        .returning();

      if (!tour) {
        throw new Error("Failed to create tour");
      }

      return { ...tour, product };
    });
  }

  /**
   * Map tour status to product status
   */
  private mapTourStatusToProductStatus(tourStatus: TourStatus): "draft" | "active" | "archived" {
    switch (tourStatus) {
      case "active":
        return "active";
      case "archived":
        return "archived";
      case "draft":
      case "paused":
      default:
        return "draft";
    }
  }

  /**
   * Update a tour (syncs product fields too)
   */
  async update(id: string, input: UpdateTourInput): Promise<Tour> {
    // Ensure tour exists and belongs to org
    const existingTour = await this.getById(id);

    // If updating slug, check for conflicts in both products and tours
    if (input.slug) {
      const existingProduct = await this.db.query.products.findFirst({
        where: and(
          eq(products.slug, input.slug),
          eq(products.organizationId, this.organizationId),
          existingTour.productId ? sql`${products.id} != ${existingTour.productId}` : sql`1=1`
        ),
      });

      if (existingProduct) {
        throw new ConflictError(`Product with slug "${input.slug}" already exists`);
      }

      const existingTourSlug = await this.db.query.tours.findFirst({
        where: and(
          eq(tours.slug, input.slug),
          eq(tours.organizationId, this.organizationId),
          sql`${tours.id} != ${id}`
        ),
      });

      if (existingTourSlug) {
        throw new ConflictError(`Tour with slug "${input.slug}" already exists`);
      }
    }

    // Update product if tour has one (sync common fields)
    if (existingTour.productId) {
      const productUpdates: Partial<Product> = {};

      if (input.name !== undefined) productUpdates.name = input.name;
      if (input.slug !== undefined) productUpdates.slug = input.slug;
      if (input.description !== undefined) productUpdates.description = input.description;
      if (input.shortDescription !== undefined) productUpdates.shortDescription = input.shortDescription;
      if (input.basePrice !== undefined) productUpdates.basePrice = input.basePrice;
      if (input.currency !== undefined) productUpdates.currency = input.currency;
      if (input.coverImageUrl !== undefined) productUpdates.featuredImage = input.coverImageUrl;
      if (input.images !== undefined) productUpdates.gallery = input.images;
      if (input.metaTitle !== undefined) productUpdates.metaTitle = input.metaTitle;
      if (input.metaDescription !== undefined) productUpdates.metaDescription = input.metaDescription;
      if (input.tags !== undefined) productUpdates.tags = input.tags;
      if (input.status !== undefined) {
        productUpdates.status = this.mapTourStatusToProductStatus(input.status);
      }
      if (input.isPublic !== undefined) {
        productUpdates.visibility = input.isPublic ? "public" : "private";
      }

      if (Object.keys(productUpdates).length > 0) {
        await this.db
          .update(products)
          .set({
            ...productUpdates,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existingTour.productId));
      }
    }

    // Update tour (including duplicate fields for backward compat)
    const [tour] = await this.db
      .update(tours)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tours.id, id), eq(tours.organizationId, this.organizationId)))
      .returning();

    if (!tour) {
      throw new NotFoundError("Tour", id);
    }

    return tour;
  }

  /**
   * Delete a tour (and its product via cascade or explicit delete)
   */
  async delete(id: string): Promise<void> {
    const tour = await this.getById(id);

    // If tour has a product, delete the product (tour cascades via FK)
    // Otherwise, delete the tour directly (legacy case)
    if (tour.productId) {
      await this.db
        .delete(products)
        .where(
          and(
            eq(products.id, tour.productId),
            eq(products.organizationId, this.organizationId)
          )
        );
    } else {
      await this.db
        .delete(tours)
        .where(and(eq(tours.id, id), eq(tours.organizationId, this.organizationId)));
    }
  }

  /**
   * Publish a tour (make active and public)
   */
  async publish(id: string): Promise<Tour> {
    return this.update(id, {
      status: "active",
      isPublic: true,
    });
  }

  /**
   * Unpublish a tour (make not public)
   */
  async unpublish(id: string): Promise<Tour> {
    return this.update(id, {
      isPublic: false,
    });
  }

  /**
   * Archive a tour
   */
  async archive(id: string): Promise<Tour> {
    return this.update(id, {
      status: "archived",
      isPublic: false,
    });
  }

  /**
   * Duplicate a tour (creates new product + tour)
   */
  async duplicate(id: string, newName?: string): Promise<TourWithProduct> {
    const original = await this.getById(id);

    const name = newName || `${original.name} (Copy)`;
    const slug = this.slugify(name);

    return this.create({
      name,
      slug,
      description: original.description || undefined,
      shortDescription: original.shortDescription || undefined,
      durationMinutes: original.durationMinutes,
      minParticipants: original.minParticipants || undefined,
      maxParticipants: original.maxParticipants,
      basePrice: original.basePrice,
      currency: original.currency || undefined,
      meetingPoint: original.meetingPoint || undefined,
      meetingPointDetails: original.meetingPointDetails || undefined,
      meetingPointLat: original.meetingPointLat || undefined,
      meetingPointLng: original.meetingPointLng || undefined,
      coverImageUrl: original.coverImageUrl || undefined,
      images: original.images || undefined,
      category: original.category || undefined,
      tags: original.tags || undefined,
      includes: original.includes || undefined,
      excludes: original.excludes || undefined,
      requirements: original.requirements || undefined,
      accessibility: original.accessibility || undefined,
      cancellationPolicy: original.cancellationPolicy || undefined,
      cancellationHours: original.cancellationHours || undefined,
      minimumNoticeHours: original.minimumNoticeHours || undefined,
      maximumAdvanceDays: original.maximumAdvanceDays || undefined,
      allowSameDayBooking: original.allowSameDayBooking ?? undefined,
      sameDayCutoffTime: original.sameDayCutoffTime || undefined,
      status: "draft",
      isPublic: false,
      metaTitle: original.metaTitle || undefined,
      metaDescription: original.metaDescription || undefined,
    });
  }

  /**
   * Get unique categories
   */
  async getCategories(): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ category: tours.category })
      .from(tours)
      .where(
        and(
          eq(tours.organizationId, this.organizationId),
          sql`${tours.category} IS NOT NULL`
        )
      );

    return result.map((r) => r.category!).filter(Boolean);
  }

  /**
   * Get tour stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    draft: number;
    archived: number;
    public: number;
  }> {
    const statsResult = await this.db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${tours.status} = 'active')`,
        draft: sql<number>`COUNT(*) FILTER (WHERE ${tours.status} = 'draft')`,
        archived: sql<number>`COUNT(*) FILTER (WHERE ${tours.status} = 'archived')`,
        public: sql<number>`COUNT(*) FILTER (WHERE ${tours.isPublic} = true)`,
      })
      .from(tours)
      .where(eq(tours.organizationId, this.organizationId));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      active: Number(stats?.active ?? 0),
      draft: Number(stats?.draft ?? 0),
      archived: Number(stats?.archived ?? 0),
      public: Number(stats?.public ?? 0),
    };
  }

  // ============================================
  // Pricing Tiers Management
  // ============================================

  /**
   * Get all pricing tiers for a tour
   */
  async getPricingTiers(tourId: string): Promise<TourPricingTier[]> {
    // Verify tour exists and belongs to org
    await this.getById(tourId);

    return this.db.query.tourPricingTiers.findMany({
      where: and(
        eq(tourPricingTiers.tourId, tourId),
        eq(tourPricingTiers.organizationId, this.organizationId)
      ),
      orderBy: [asc(tourPricingTiers.sortOrder), asc(tourPricingTiers.createdAt)],
    });
  }

  /**
   * Get a single pricing tier by ID
   */
  async getPricingTierById(tierId: string): Promise<TourPricingTier> {
    const tier = await this.db.query.tourPricingTiers.findFirst({
      where: and(
        eq(tourPricingTiers.id, tierId),
        eq(tourPricingTiers.organizationId, this.organizationId)
      ),
    });

    if (!tier) {
      throw new NotFoundError("Pricing tier", tierId);
    }

    return tier;
  }

  /**
   * Create a new pricing tier
   */
  async createPricingTier(input: CreatePricingTierInput): Promise<TourPricingTier> {
    // Verify tour exists and belongs to org
    await this.getById(input.tourId);

    // Check if name already exists for this tour
    const existing = await this.db.query.tourPricingTiers.findFirst({
      where: and(
        eq(tourPricingTiers.tourId, input.tourId),
        eq(tourPricingTiers.name, input.name.toLowerCase())
      ),
    });

    if (existing) {
      throw new ConflictError(`Pricing tier "${input.name}" already exists for this tour`);
    }

    // If this is the default tier, unset other defaults
    if (input.isDefault) {
      await this.db
        .update(tourPricingTiers)
        .set({ isDefault: false })
        .where(
          and(
            eq(tourPricingTiers.tourId, input.tourId),
            eq(tourPricingTiers.organizationId, this.organizationId)
          )
        );
    }

    const [tier] = await this.db
      .insert(tourPricingTiers)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        name: input.name.toLowerCase(),
        label: input.label,
        description: input.description,
        price: input.price,
        minAge: input.minAge,
        maxAge: input.maxAge,
        isDefault: input.isDefault ?? false,
        countTowardsCapacity: input.countTowardsCapacity ?? true,
        minQuantity: input.minQuantity ?? 0,
        maxQuantity: input.maxQuantity,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!tier) {
      throw new Error("Failed to create pricing tier");
    }

    return tier;
  }

  /**
   * Update a pricing tier
   */
  async updatePricingTier(tierId: string, input: UpdatePricingTierInput): Promise<TourPricingTier> {
    const existing = await this.getPricingTierById(tierId);

    // If updating name, check for conflicts
    if (input.name && input.name.toLowerCase() !== existing.name) {
      const conflict = await this.db.query.tourPricingTiers.findFirst({
        where: and(
          eq(tourPricingTiers.tourId, existing.tourId),
          eq(tourPricingTiers.name, input.name.toLowerCase()),
          sql`${tourPricingTiers.id} != ${tierId}`
        ),
      });

      if (conflict) {
        throw new ConflictError(`Pricing tier "${input.name}" already exists for this tour`);
      }
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.db
        .update(tourPricingTiers)
        .set({ isDefault: false })
        .where(
          and(
            eq(tourPricingTiers.tourId, existing.tourId),
            eq(tourPricingTiers.organizationId, this.organizationId),
            sql`${tourPricingTiers.id} != ${tierId}`
          )
        );
    }

    const [tier] = await this.db
      .update(tourPricingTiers)
      .set({
        ...(input.name && { name: input.name.toLowerCase() }),
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourPricingTiers.id, tierId),
          eq(tourPricingTiers.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!tier) {
      throw new NotFoundError("Pricing tier", tierId);
    }

    return tier;
  }

  /**
   * Delete a pricing tier
   */
  async deletePricingTier(tierId: string): Promise<void> {
    await this.getPricingTierById(tierId);

    await this.db
      .delete(tourPricingTiers)
      .where(
        and(
          eq(tourPricingTiers.id, tierId),
          eq(tourPricingTiers.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Reorder pricing tiers
   */
  async reorderPricingTiers(tourId: string, tierIds: string[]): Promise<TourPricingTier[]> {
    // Verify tour exists and belongs to org
    await this.getById(tourId);

    // Update sort order for each tier
    await Promise.all(
      tierIds.map((tierId, index) =>
        this.db
          .update(tourPricingTiers)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(tourPricingTiers.id, tierId),
              eq(tourPricingTiers.tourId, tourId),
              eq(tourPricingTiers.organizationId, this.organizationId)
            )
          )
      )
    );

    return this.getPricingTiers(tourId);
  }

  /**
   * Create default pricing tiers for a tour (Adult only)
   */
  async createDefaultPricingTiers(tourId: string, basePrice: string): Promise<TourPricingTier[]> {
    const tier = await this.createPricingTier({
      tourId,
      name: "adult",
      label: "Adult",
      price: basePrice,
      isDefault: true,
      sortOrder: 0,
    });

    return [tier];
  }

  // ============================================
  // Tour Variants Management
  // ============================================

  /**
   * Get all variants for a tour
   */
  async getVariants(tourId: string): Promise<TourVariant[]> {
    // Verify tour exists and belongs to org
    await this.getById(tourId);

    return this.db.query.tourVariants.findMany({
      where: and(
        eq(tourVariants.tourId, tourId),
        eq(tourVariants.organizationId, this.organizationId)
      ),
      orderBy: [asc(tourVariants.sortOrder), asc(tourVariants.createdAt)],
    });
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(variantId: string): Promise<TourVariant> {
    const variant = await this.db.query.tourVariants.findFirst({
      where: and(
        eq(tourVariants.id, variantId),
        eq(tourVariants.organizationId, this.organizationId)
      ),
    });

    if (!variant) {
      throw new NotFoundError("Tour variant", variantId);
    }

    return variant;
  }

  /**
   * Create a new variant
   */
  async createVariant(input: CreateVariantInput): Promise<TourVariant> {
    // Verify tour exists and belongs to org
    await this.getById(input.tourId);

    // Check if name already exists for this tour
    const existing = await this.db.query.tourVariants.findFirst({
      where: and(
        eq(tourVariants.tourId, input.tourId),
        eq(tourVariants.name, input.name.toLowerCase())
      ),
    });

    if (existing) {
      throw new ConflictError(`Variant "${input.name}" already exists for this tour`);
    }

    // If this is the default variant, unset other defaults
    if (input.isDefault) {
      await this.db
        .update(tourVariants)
        .set({ isDefault: false })
        .where(
          and(
            eq(tourVariants.tourId, input.tourId),
            eq(tourVariants.organizationId, this.organizationId)
          )
        );
    }

    const [variant] = await this.db
      .insert(tourVariants)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        name: input.name.toLowerCase(),
        label: input.label,
        description: input.description,
        priceModifierType: input.priceModifierType ?? "absolute",
        priceModifier: input.priceModifier,
        durationMinutes: input.durationMinutes,
        maxParticipants: input.maxParticipants,
        minParticipants: input.minParticipants,
        availableDays: input.availableDays ?? [0, 1, 2, 3, 4, 5, 6],
        defaultStartTime: input.defaultStartTime,
        sortOrder: input.sortOrder ?? 0,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!variant) {
      throw new Error("Failed to create variant");
    }

    return variant;
  }

  /**
   * Update a variant
   */
  async updateVariant(variantId: string, input: UpdateVariantInput): Promise<TourVariant> {
    const existing = await this.getVariantById(variantId);

    // If updating name, check for conflicts
    if (input.name && input.name.toLowerCase() !== existing.name) {
      const conflict = await this.db.query.tourVariants.findFirst({
        where: and(
          eq(tourVariants.tourId, existing.tourId),
          eq(tourVariants.name, input.name.toLowerCase()),
          sql`${tourVariants.id} != ${variantId}`
        ),
      });

      if (conflict) {
        throw new ConflictError(`Variant "${input.name}" already exists for this tour`);
      }
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.db
        .update(tourVariants)
        .set({ isDefault: false })
        .where(
          and(
            eq(tourVariants.tourId, existing.tourId),
            eq(tourVariants.organizationId, this.organizationId),
            sql`${tourVariants.id} != ${variantId}`
          )
        );
    }

    const [variant] = await this.db
      .update(tourVariants)
      .set({
        ...(input.name && { name: input.name.toLowerCase() }),
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tourVariants.id, variantId),
          eq(tourVariants.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!variant) {
      throw new NotFoundError("Tour variant", variantId);
    }

    return variant;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(variantId: string): Promise<void> {
    await this.getVariantById(variantId);

    await this.db
      .delete(tourVariants)
      .where(
        and(
          eq(tourVariants.id, variantId),
          eq(tourVariants.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Reorder variants
   */
  async reorderVariants(tourId: string, variantIds: string[]): Promise<TourVariant[]> {
    // Verify tour exists and belongs to org
    await this.getById(tourId);

    // Update sort order for each variant
    await Promise.all(
      variantIds.map((variantId, index) =>
        this.db
          .update(tourVariants)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(tourVariants.id, variantId),
              eq(tourVariants.tourId, tourId),
              eq(tourVariants.organizationId, this.organizationId)
            )
          )
      )
    );

    return this.getVariants(tourId);
  }
}

// Input types for pricing tiers
export interface CreatePricingTierInput {
  tourId: string;
  name: string;
  label: string;
  description?: string;
  price: string;
  minAge?: number;
  maxAge?: number;
  isDefault?: boolean;
  countTowardsCapacity?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePricingTierInput {
  name?: string;
  label?: string;
  description?: string | null;
  price?: string;
  minAge?: number | null;
  maxAge?: number | null;
  isDefault?: boolean;
  countTowardsCapacity?: boolean;
  minQuantity?: number;
  maxQuantity?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

// Input types for tour variants
export interface CreateVariantInput {
  tourId: string;
  name: string;
  label: string;
  description?: string;
  priceModifierType?: PriceModifierType;
  priceModifier?: string;
  durationMinutes?: number;
  maxParticipants?: number;
  minParticipants?: number;
  availableDays?: number[];
  defaultStartTime?: string;
  sortOrder?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  label?: string;
  description?: string | null;
  priceModifierType?: PriceModifierType;
  priceModifier?: string | null;
  durationMinutes?: number | null;
  maxParticipants?: number | null;
  minParticipants?: number | null;
  availableDays?: number[];
  defaultStartTime?: string | null;
  sortOrder?: number;
  isDefault?: boolean;
  isActive?: boolean;
}
