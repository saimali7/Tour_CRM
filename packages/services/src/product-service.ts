import { eq, and, desc, asc, sql, count, ilike, or, inArray } from "drizzle-orm";
import {
  products,
  tours,
  bookings,
  type Product,
  type ProductType,
  type ProductStatus,
  type ProductVisibility,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ConflictError,
} from "./types";

export interface ProductFilters {
  type?: ProductType;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  search?: string;
  tags?: string[];
}

export type ProductSortField = "name" | "createdAt" | "updatedAt" | "basePrice" | "sortOrder";

export interface CreateProductInput {
  type: ProductType;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  basePrice: string;
  currency?: string;
  pricingDisplay?: string;
  featuredImage?: string;
  gallery?: string[];
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  sortOrder?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

// Unified product with type-specific extensions
export interface TourScheduleStats {
  upcomingCount: number;
  totalCapacity: number;
  totalBooked: number;
  utilizationPercent: number;
  nextScheduleDate: Date | null;
}

export interface UnifiedProduct extends Product {
  // Tour-specific data (when type === "tour")
  tour?: {
    id: string;
    durationMinutes: number;
    maxParticipants: number;
    scheduleStats: TourScheduleStats;
  } | null;
}

export class ProductService extends BaseService {
  /**
   * Get all products with filtering, pagination, and sorting
   */
  async getAll(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<ProductSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.organizationId, this.organizationId)];

    if (filters.type) {
      conditions.push(eq(products.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.visibility) {
      conditions.push(eq(products.visibility, filters.visibility));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`)
        )!
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      // Check if any of the filter tags are in the product tags array
      conditions.push(
        sql`${products.tags} && ${filters.tags}`
      );
    }

    const orderBy =
      sort.direction === "asc" ? asc(products[sort.field]) : desc(products[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(products)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get all products with their type-specific extensions (tours with schedule stats, services with config)
   * This is the main query for the unified Products page
   */
  async getAllWithExtensions(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<ProductSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<UnifiedProduct>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.organizationId, this.organizationId)];

    if (filters.type) {
      conditions.push(eq(products.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.visibility) {
      conditions.push(eq(products.visibility, filters.visibility));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`)
        )!
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(sql`${products.tags} && ${filters.tags}`);
    }

    const orderBy =
      sort.direction === "asc" ? asc(products[sort.field]) : desc(products[sort.field]);

    // Get paginated products
    const [productsResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(products)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    if (productsResult.length === 0) {
      return {
        data: [],
        ...this.paginationMeta(total, page, limit),
      };
    }

    const productIds = productsResult.map(p => p.id);

    // Fetch tours for tour-type products
    const tourProducts = productsResult.filter(p => p.type === "tour");
    let toursMap = new Map<string, Tour>();
    let scheduleStatsMap = new Map<string, TourScheduleStats>();

    if (tourProducts.length > 0) {
      // Get tours by productId
      const toursResult = await this.db
        .select()
        .from(tours)
        .where(
          and(
            inArray(tours.productId, tourProducts.map(p => p.id)),
            eq(tours.organizationId, this.organizationId)
          )
        );

      toursMap = new Map(toursResult.map(t => [t.productId, t]));

      // Get booking stats for tours (availability-based model)
      if (toursResult.length > 0) {
        const tourIds = toursResult.map(t => t.id);
        const nowDate = new Date().toISOString().split("T")[0]!;

        const bookingStats = await this.db
          .select({
            tourId: bookings.tourId,
            upcomingCount: sql<number>`COUNT(DISTINCT ${bookings.bookingDate})::int`,
            totalBooked: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)::int`,
            nextBookingDate: sql<Date | null>`MIN(${bookings.bookingDate})`,
          })
          .from(bookings)
          .where(
            and(
              inArray(bookings.tourId, tourIds),
              eq(bookings.organizationId, this.organizationId),
              sql`${bookings.bookingDate}::text >= ${nowDate}`,
              sql`${bookings.status} != 'cancelled'`
            )
          )
          .groupBy(bookings.tourId);

        // Get tour max participants for capacity calculation
        const tourMaxMap = new Map(toursResult.map(t => [t.id, t.maxParticipants || 1]));

        scheduleStatsMap = new Map(
          bookingStats.filter(s => s.tourId !== null).map(s => {
            const tourId = s.tourId!;
            const upcomingCount = Number(s.upcomingCount) || 0;
            const totalBooked = Number(s.totalBooked) || 0;
            const tourMax = tourMaxMap.get(tourId) || 1;
            const estimatedCapacity = upcomingCount * tourMax;
            const utilizationPercent = estimatedCapacity > 0
              ? Math.round((totalBooked / estimatedCapacity) * 100)
              : 0;

            return [tourId, {
              upcomingCount,
              totalCapacity: estimatedCapacity,
              totalBooked,
              utilizationPercent,
              nextScheduleDate: s.nextBookingDate,
            }];
          })
        );
      }
    }

    // Transform to unified products
    const unifiedProducts: UnifiedProduct[] = productsResult.map(product => {
      const unified: UnifiedProduct = { ...product };

      if (product.type === "tour") {
        const tour = toursMap.get(product.id);
        if (tour) {
          const stats = scheduleStatsMap.get(tour.id) || {
            upcomingCount: 0,
            totalCapacity: 0,
            totalBooked: 0,
            utilizationPercent: 0,
            nextScheduleDate: null,
          };

          unified.tour = {
            id: tour.id,
            durationMinutes: tour.durationMinutes,
            maxParticipants: tour.maxParticipants,
            scheduleStats: stats,
          };
        }
      }

      return unified;
    });

    return {
      data: unifiedProducts,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single product by ID
   */
  async getById(id: string): Promise<Product> {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.organizationId, this.organizationId)),
    });

    if (!product) {
      throw new NotFoundError("Product", id);
    }

    return product;
  }

  /**
   * Get a product by slug
   */
  async getBySlug(slug: string): Promise<Product> {
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.slug, slug),
        eq(products.organizationId, this.organizationId)
      ),
    });

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }

  /**
   * Create a new product
   */
  async create(input: CreateProductInput): Promise<Product> {
    const slug = input.slug || this.slugify(input.name);

    // Check if slug already exists
    const existing = await this.db.query.products.findFirst({
      where: and(
        eq(products.slug, slug),
        eq(products.organizationId, this.organizationId)
      ),
    });

    if (existing) {
      throw new ConflictError(`Product with slug "${slug}" already exists`);
    }

    const [product] = await this.db
      .insert(products)
      .values({
        organizationId: this.organizationId,
        type: input.type,
        name: input.name,
        slug,
        description: input.description,
        shortDescription: input.shortDescription,
        status: input.status || "draft",
        visibility: input.visibility || "public",
        basePrice: input.basePrice,
        currency: input.currency || "AED",
        pricingDisplay: input.pricingDisplay,
        featuredImage: input.featuredImage,
        gallery: input.gallery || [],
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        tags: input.tags || [],
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    if (!product) {
      throw new Error("Failed to create product");
    }

    return product;
  }

  /**
   * Update a product
   */
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    // Ensure product exists and belongs to org
    await this.getById(id);

    // If updating slug, check for conflicts
    if (input.slug) {
      const existing = await this.db.query.products.findFirst({
        where: and(
          eq(products.slug, input.slug),
          eq(products.organizationId, this.organizationId),
          sql`${products.id} != ${id}`
        ),
      });

      if (existing) {
        throw new ConflictError(`Product with slug "${input.slug}" already exists`);
      }
    }

    const [product] = await this.db
      .update(products)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.organizationId, this.organizationId)))
      .returning();

    if (!product) {
      throw new NotFoundError("Product", id);
    }

    return product;
  }

  /**
   * Archive a product
   */
  async archive(id: string): Promise<Product> {
    const [product] = await this.db
      .update(products)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.organizationId, this.organizationId)))
      .returning();

    if (!product) {
      throw new NotFoundError("Product", id);
    }

    return product;
  }

  /**
   * Restore an archived product
   */
  async restore(id: string): Promise<Product> {
    const [product] = await this.db
      .update(products)
      .set({
        status: "draft",
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.organizationId, this.organizationId)))
      .returning();

    if (!product) {
      throw new NotFoundError("Product", id);
    }

    return product;
  }

  /**
   * Delete a product (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.organizationId, this.organizationId)));
  }

  /**
   * Get product stats (counts by type and status)
   */
  async getStats(): Promise<{
    total: number;
    byType: { tour: number };
    byStatus: { draft: number; active: number; archived: number };
  }> {
    const statsResult = await this.db
      .select({
        total: count(),
        tourCount: sql<number>`COUNT(*) FILTER (WHERE ${products.type} = 'tour')`,
        draftCount: sql<number>`COUNT(*) FILTER (WHERE ${products.status} = 'draft')`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${products.status} = 'active')`,
        archivedCount: sql<number>`COUNT(*) FILTER (WHERE ${products.status} = 'archived')`,
      })
      .from(products)
      .where(eq(products.organizationId, this.organizationId));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      byType: {
        tour: Number(stats?.tourCount ?? 0),
      },
      byStatus: {
        draft: Number(stats?.draftCount ?? 0),
        active: Number(stats?.activeCount ?? 0),
        archived: Number(stats?.archivedCount ?? 0),
      },
    };
  }
}
