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
   * Format: PREFIX-XXXXXX (6 easy-to-read alphanumeric chars)
   * Avoids confusing characters: 0/O, 1/I/L
   */
  protected generateReferenceNumber(prefix: string): string {
    // Use only easy-to-read characters (no 0, O, 1, I, L to avoid confusion)
    const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
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
