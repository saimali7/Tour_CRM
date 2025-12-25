import { eq, and, desc, asc, sql, count, ilike, or, inArray } from "drizzle-orm";
import {
  products,
  type Product,
  type ProductType,
  type ProductStatus,
  type ProductVisibility
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
        currency: input.currency || "USD",
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
    byType: { tour: number; service: number; good: number };
    byStatus: { draft: number; active: number; archived: number };
  }> {
    const statsResult = await this.db
      .select({
        total: count(),
        tourCount: sql<number>`COUNT(*) FILTER (WHERE ${products.type} = 'tour')`,
        serviceCount: sql<number>`COUNT(*) FILTER (WHERE ${products.type} = 'service')`,
        goodCount: sql<number>`COUNT(*) FILTER (WHERE ${products.type} = 'good')`,
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
        service: Number(stats?.serviceCount ?? 0),
        good: Number(stats?.goodCount ?? 0),
      },
      byStatus: {
        draft: Number(stats?.draftCount ?? 0),
        active: Number(stats?.activeCount ?? 0),
        archived: Number(stats?.archivedCount ?? 0),
      },
    };
  }
}
