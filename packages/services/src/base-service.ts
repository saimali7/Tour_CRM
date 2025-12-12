import { db as database } from "@tour/database";
import type { ServiceContext } from "./types";

/**
 * Base service class that all services extend
 * Provides organization-scoped database access
 */
export abstract class BaseService {
  protected readonly ctx: ServiceContext;
  protected readonly db = database;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  /**
   * Get the organization ID from context
   */
  protected get organizationId(): string {
    return this.ctx.organizationId;
  }

  /**
   * Get the user ID from context (if available)
   */
  protected get userId(): string | undefined {
    return this.ctx.userId;
  }

  /**
   * Generate a unique reference number
   */
  protected generateReferenceNumber(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  /**
   * Create a URL-friendly slug from a string
   */
  protected slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Calculate pagination metadata
   */
  protected paginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }
}
