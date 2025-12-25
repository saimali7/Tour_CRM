import { eq, and, desc, asc, sql, count, ilike, or } from "drizzle-orm";
import {
  products,
  services,
  type Product,
  type Service,
  type ProductStatus,
  type ServiceType,
  type ServicePricingModel,
  type ServiceAvailabilityType,
  type ServicePricingTier,
  type ServiceTransferConfig,
  type ServiceRentalConfig,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ConflictError,
} from "./types";

// ==========================================
// Filters & Sort
// ==========================================

export interface ServiceFilters {
  serviceType?: ServiceType;
  pricingModel?: ServicePricingModel;
  availabilityType?: ServiceAvailabilityType;
  isStandalone?: boolean;
  isAddon?: boolean;
  status?: ProductStatus;
  search?: string;
}

export type ServiceSortField = "name" | "createdAt" | "updatedAt" | "basePrice";

// ==========================================
// Combined Service + Product type
// ==========================================

export interface CatalogServiceWithProduct extends Service {
  product: Product;
}

// ==========================================
// Input Types
// ==========================================

export interface CreateCatalogServiceInput {
  // Product fields
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  basePrice: string;
  currency?: string;
  pricingDisplay?: string;
  featuredImage?: string;
  gallery?: string[];
  tags?: string[];
  status?: ProductStatus;

  // Service-specific fields
  serviceType: ServiceType;
  pricingModel: ServicePricingModel;
  pricingTiers?: ServicePricingTier[];
  availabilityType?: ServiceAvailabilityType;
  isStandalone?: boolean;
  isAddon?: boolean;
  requiresApproval?: boolean;
  duration?: number;
  transferConfig?: ServiceTransferConfig;
  rentalConfig?: ServiceRentalConfig;
  applicableToProducts?: string[];
  applicableToTypes?: string[];
  maxQuantity?: number;
  maxPerBooking?: number;
}

export interface UpdateCatalogServiceInput {
  // Product fields
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  basePrice?: string;
  currency?: string;
  pricingDisplay?: string;
  featuredImage?: string;
  gallery?: string[];
  tags?: string[];
  status?: ProductStatus;

  // Service-specific fields
  serviceType?: ServiceType;
  pricingModel?: ServicePricingModel;
  pricingTiers?: ServicePricingTier[];
  availabilityType?: ServiceAvailabilityType;
  isStandalone?: boolean;
  isAddon?: boolean;
  requiresApproval?: boolean;
  duration?: number;
  transferConfig?: ServiceTransferConfig;
  rentalConfig?: ServiceRentalConfig;
  applicableToProducts?: string[];
  applicableToTypes?: string[];
  maxQuantity?: number;
  maxPerBooking?: number;
}

// ==========================================
// CatalogService
// ==========================================

export class CatalogService extends BaseService {
  /**
   * Get all services with their product data
   */
  async getAll(
    filters: ServiceFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<ServiceSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<CatalogServiceWithProduct>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(services.organizationId, this.organizationId)];

    if (filters.serviceType) {
      conditions.push(eq(services.serviceType, filters.serviceType));
    }
    if (filters.pricingModel) {
      conditions.push(eq(services.pricingModel, filters.pricingModel));
    }
    if (filters.availabilityType) {
      conditions.push(eq(services.availabilityType, filters.availabilityType));
    }
    if (filters.isStandalone !== undefined) {
      conditions.push(eq(services.isStandalone, filters.isStandalone));
    }
    if (filters.isAddon !== undefined) {
      conditions.push(eq(services.isAddon, filters.isAddon));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }

    // Apply search filter if provided
    if (filters.search) {
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`)
        )!
      );
    }

    // Determine sort field - map service sort to product field if needed
    const sortField = sort.field === "name" || sort.field === "basePrice"
      ? products[sort.field]
      : services[sort.field];
    const orderBy = sort.direction === "asc" ? asc(sortField) : desc(sortField);

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(services)
        .innerJoin(products, eq(services.productId, products.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(services)
        .innerJoin(products, eq(services.productId, products.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    // Transform joined results to expected format
    const data: CatalogServiceWithProduct[] = dataResult.map((row) => ({
      ...row.services,
      product: row.products,
    }));

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single service by ID with product data
   */
  async getById(id: string): Promise<CatalogServiceWithProduct> {
    const result = await this.db
      .select()
      .from(services)
      .innerJoin(products, eq(services.productId, products.id))
      .where(
        and(
          eq(services.id, id),
          eq(services.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (!result.length || !result[0]) {
      throw new NotFoundError("Service", id);
    }

    const row = result[0];
    return {
      ...row.services,
      product: row.products,
    };
  }

  /**
   * Get service by product ID
   */
  async getByProductId(productId: string): Promise<CatalogServiceWithProduct> {
    const result = await this.db
      .select()
      .from(services)
      .innerJoin(products, eq(services.productId, products.id))
      .where(
        and(
          eq(services.productId, productId),
          eq(services.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (!result.length || !result[0]) {
      throw new NotFoundError("Service for product", productId);
    }

    const row = result[0];
    return {
      ...row.services,
      product: row.products,
    };
  }

  /**
   * Create a new service (creates both product and service records in transaction)
   */
  async create(input: CreateCatalogServiceInput): Promise<CatalogServiceWithProduct> {
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

    // Auto-generate pricingDisplay if not provided
    const pricingDisplay = input.pricingDisplay || this.generatePricingDisplay(
      input.pricingModel,
      input.basePrice,
      input.currency || "USD"
    );

    // Create product and service in transaction
    return await this.db.transaction(async (tx) => {
      // Create product
      const [product] = await tx
        .insert(products)
        .values({
          organizationId: this.organizationId,
          type: "service",
          name: input.name,
          slug,
          description: input.description,
          shortDescription: input.shortDescription,
          basePrice: input.basePrice,
          currency: input.currency || "USD",
          pricingDisplay,
          featuredImage: input.featuredImage,
          gallery: input.gallery || [],
          tags: input.tags || [],
          status: input.status || "draft",
        })
        .returning();

      if (!product) {
        throw new Error("Failed to create product");
      }

      // Create service
      const [service] = await tx
        .insert(services)
        .values({
          organizationId: this.organizationId,
          productId: product.id,
          serviceType: input.serviceType,
          pricingModel: input.pricingModel,
          pricingTiers: input.pricingTiers,
          availabilityType: input.availabilityType || "always",
          isStandalone: input.isStandalone ?? true,
          isAddon: input.isAddon ?? true,
          requiresApproval: input.requiresApproval ?? false,
          duration: input.duration,
          transferConfig: input.transferConfig,
          rentalConfig: input.rentalConfig,
          applicableToProducts: input.applicableToProducts || [],
          applicableToTypes: input.applicableToTypes || [],
          maxQuantity: input.maxQuantity,
          maxPerBooking: input.maxPerBooking ?? 10,
        })
        .returning();

      if (!service) {
        throw new Error("Failed to create service");
      }

      return {
        ...service,
        product,
      };
    });
  }

  /**
   * Update a service (updates both product and service records in transaction)
   */
  async update(id: string, input: UpdateCatalogServiceInput): Promise<CatalogServiceWithProduct> {
    // Ensure service exists and belongs to org
    const existing = await this.getById(id);

    // If updating slug, check for conflicts
    if (input.slug) {
      const conflict = await this.db.query.products.findFirst({
        where: and(
          eq(products.slug, input.slug),
          eq(products.organizationId, this.organizationId),
          sql`${products.id} != ${existing.product.id}`
        ),
      });

      if (conflict) {
        throw new ConflictError(`Product with slug "${input.slug}" already exists`);
      }
    }

    // Auto-generate pricingDisplay if pricing changed but display not provided
    let pricingDisplay = input.pricingDisplay;
    if (!pricingDisplay && (input.pricingModel || input.basePrice)) {
      const pricingModel = input.pricingModel || existing.pricingModel;
      const basePrice = input.basePrice || existing.product.basePrice;
      const currency = input.currency || existing.product.currency || "USD";
      pricingDisplay = this.generatePricingDisplay(pricingModel, basePrice, currency);
    }

    // Update both product and service in transaction
    return await this.db.transaction(async (tx) => {
      // Update product if any product fields provided
      const productUpdates = {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.shortDescription !== undefined && { shortDescription: input.shortDescription }),
        ...(input.basePrice && { basePrice: input.basePrice }),
        ...(input.currency && { currency: input.currency }),
        ...(pricingDisplay && { pricingDisplay }),
        ...(input.featuredImage !== undefined && { featuredImage: input.featuredImage }),
        ...(input.gallery !== undefined && { gallery: input.gallery }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.status && { status: input.status }),
      };

      let product = existing.product;
      if (Object.keys(productUpdates).length > 0) {
        const [updatedProduct] = await tx
          .update(products)
          .set({
            ...productUpdates,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, existing.product.id),
              eq(products.organizationId, this.organizationId)
            )
          )
          .returning();

        if (!updatedProduct) {
          throw new NotFoundError("Product", existing.product.id);
        }
        product = updatedProduct;
      }

      // Update service if any service fields provided
      const serviceUpdates = {
        ...(input.serviceType && { serviceType: input.serviceType }),
        ...(input.pricingModel && { pricingModel: input.pricingModel }),
        ...(input.pricingTiers !== undefined && { pricingTiers: input.pricingTiers }),
        ...(input.availabilityType && { availabilityType: input.availabilityType }),
        ...(input.isStandalone !== undefined && { isStandalone: input.isStandalone }),
        ...(input.isAddon !== undefined && { isAddon: input.isAddon }),
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.transferConfig !== undefined && { transferConfig: input.transferConfig }),
        ...(input.rentalConfig !== undefined && { rentalConfig: input.rentalConfig }),
        ...(input.applicableToProducts !== undefined && { applicableToProducts: input.applicableToProducts }),
        ...(input.applicableToTypes !== undefined && { applicableToTypes: input.applicableToTypes }),
        ...(input.maxQuantity !== undefined && { maxQuantity: input.maxQuantity }),
        ...(input.maxPerBooking !== undefined && { maxPerBooking: input.maxPerBooking }),
      };

      let service = existing;
      if (Object.keys(serviceUpdates).length > 0) {
        const [updatedService] = await tx
          .update(services)
          .set({
            ...serviceUpdates,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(services.id, id),
              eq(services.organizationId, this.organizationId)
            )
          )
          .returning();

        if (!updatedService) {
          throw new NotFoundError("Service", id);
        }
        service = { ...updatedService, product };
      }

      return service;
    });
  }

  /**
   * Archive a service (archives the product, which cascades)
   */
  async archive(id: string): Promise<CatalogServiceWithProduct> {
    const existing = await this.getById(id);

    const [product] = await this.db
      .update(products)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, existing.product.id),
          eq(products.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!product) {
      throw new NotFoundError("Product", existing.product.id);
    }

    return {
      ...existing,
      product,
    };
  }

  /**
   * Delete a service (deletes the product, which cascades to service)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);

    await this.db
      .delete(products)
      .where(
        and(
          eq(products.id, existing.product.id),
          eq(products.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Get services that can be added as add-ons
   * Optionally filtered by product compatibility
   */
  async getAvailableAddons(forProductId?: string): Promise<CatalogServiceWithProduct[]> {
    const conditions = [
      eq(services.organizationId, this.organizationId),
      eq(services.isAddon, true),
      eq(products.status, "active"),
    ];

    // If forProductId provided, filter by applicability
    if (forProductId) {
      // Get the product to check its type
      const targetProduct = await this.db.query.products.findFirst({
        where: and(
          eq(products.id, forProductId),
          eq(products.organizationId, this.organizationId)
        ),
      });

      if (!targetProduct) {
        throw new NotFoundError("Product", forProductId);
      }

      // Add filter for applicable products or types
      conditions.push(
        or(
          // Empty applicableToProducts means applies to all
          sql`jsonb_array_length(${services.applicableToProducts}) = 0`,
          // Or specifically includes this product
          sql`${services.applicableToProducts} @> ${JSON.stringify([forProductId])}::jsonb`,
          // Or applies to this product type
          sql`${services.applicableToTypes} @> ${JSON.stringify([targetProduct.type])}::jsonb`
        )!
      );
    }

    const result = await this.db
      .select()
      .from(services)
      .innerJoin(products, eq(services.productId, products.id))
      .where(and(...conditions))
      .orderBy(asc(products.name));

    return result.map((row) => ({
      ...row.services,
      product: row.products,
    }));
  }

  /**
   * Get services that can be booked standalone
   */
  async getStandaloneServices(): Promise<CatalogServiceWithProduct[]> {
    const result = await this.db
      .select()
      .from(services)
      .innerJoin(products, eq(services.productId, products.id))
      .where(
        and(
          eq(services.organizationId, this.organizationId),
          eq(services.isStandalone, true),
          eq(products.status, "active")
        )
      )
      .orderBy(asc(products.name));

    return result.map((row) => ({
      ...row.services,
      product: row.products,
    }));
  }

  /**
   * Helper: Generate pricing display based on pricing model
   */
  private generatePricingDisplay(
    pricingModel: ServicePricingModel,
    basePrice: string,
    currency: string
  ): string {
    const symbol = currency === "USD" ? "$" : currency;
    const price = parseFloat(basePrice);

    switch (pricingModel) {
      case "flat":
        return `${symbol}${price.toFixed(2)} flat`;
      case "per_person":
        return `${symbol}${price.toFixed(2)}/person`;
      case "per_hour":
        return `${symbol}${price.toFixed(2)}/hour`;
      case "per_day":
        return `${symbol}${price.toFixed(2)}/day`;
      case "per_vehicle":
        return `${symbol}${price.toFixed(2)}/vehicle`;
      case "custom":
        return `From ${symbol}${price.toFixed(2)}`;
      default:
        return `${symbol}${price.toFixed(2)}`;
    }
  }
}
