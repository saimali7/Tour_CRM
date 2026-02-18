import type { OrganizationRole } from "@tour/database";

/**
 * Service context - all services require organization scope
 */
export interface ServiceContext {
  organizationId: string;
  userId?: string;
  role?: OrganizationRole;
  timezone?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Sort options
 */
export interface SortOptions<T extends string = string> {
  field: T;
  direction: "asc" | "desc";
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

/**
 * Service error types
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}
