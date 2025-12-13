import { eq, and, desc, gte, lte, inArray, count } from "drizzle-orm";
import {
  activityLogs,
  type ActivityLog,
  type ActivityAction,
  type ActivityEntity,
} from "@tour/database";
import { BaseService } from "./base-service";
import { type PaginationOptions, type PaginatedResult, type DateRangeFilter } from "./types";

export interface ActivityLogFilters {
  entityType?: ActivityEntity;
  entityId?: string;
  action?: ActivityAction;
  actions?: ActivityAction[];
  actorType?: "user" | "system" | "customer" | "webhook";
  actorId?: string;
  dateRange?: DateRangeFilter;
}

export interface CreateActivityLogInput {
  actorType: "user" | "system" | "customer" | "webhook";
  actorId?: string;
  actorName?: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService extends BaseService {
  /**
   * Get paginated activity logs with filters
   */
  async getAll(
    filters: ActivityLogFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(activityLogs.organizationId, this.organizationId)];

    if (filters.entityType) {
      conditions.push(eq(activityLogs.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(activityLogs.entityId, filters.entityId));
    }
    if (filters.action) {
      conditions.push(eq(activityLogs.action, filters.action));
    }
    if (filters.actions && filters.actions.length > 0) {
      conditions.push(inArray(activityLogs.action, filters.actions));
    }
    if (filters.actorType) {
      conditions.push(eq(activityLogs.actorType, filters.actorType));
    }
    if (filters.actorId) {
      conditions.push(eq(activityLogs.actorId, filters.actorId));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(activityLogs.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(activityLogs.createdAt, filters.dateRange.to));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(activityLogs)
        .where(and(...conditions))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(activityLogs)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get activity logs for a specific entity
   */
  async getForEntity(
    entityType: ActivityEntity,
    entityId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.getAll({ entityType, entityId }, pagination);
  }

  /**
   * Get recent activity logs
   */
  async getRecent(limit: number = 20): Promise<ActivityLog[]> {
    return this.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.organizationId, this.organizationId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  /**
   * Create a new activity log entry
   */
  async log(input: CreateActivityLogInput): Promise<ActivityLog> {
    const [log] = await this.db
      .insert(activityLogs)
      .values({
        organizationId: this.organizationId,
        actorType: input.actorType,
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        description: input.description,
        metadata: input.metadata || {},
        changes: input.changes || {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create activity log");
    }

    return log;
  }

  /**
   * Convenience method for logging booking actions
   */
  async logBookingAction(
    action: Extract<ActivityAction, `booking.${string}`>,
    bookingId: string,
    bookingRef: string,
    description: string,
    options: {
      actorType?: "user" | "system" | "customer" | "webhook";
      actorId?: string;
      actorName?: string;
      metadata?: Record<string, unknown>;
      changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
    } = {}
  ): Promise<ActivityLog> {
    return this.log({
      action,
      entityType: "booking",
      entityId: bookingId,
      entityName: bookingRef,
      description,
      actorType: options.actorType || "system",
      actorId: options.actorId,
      actorName: options.actorName,
      metadata: options.metadata,
      changes: options.changes,
    });
  }

  /**
   * Convenience method for logging schedule actions
   */
  async logScheduleAction(
    action: Extract<ActivityAction, `schedule.${string}`>,
    scheduleId: string,
    description: string,
    options: {
      actorType?: "user" | "system" | "customer" | "webhook";
      actorId?: string;
      actorName?: string;
      entityName?: string;
      metadata?: Record<string, unknown>;
      changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
    } = {}
  ): Promise<ActivityLog> {
    return this.log({
      action,
      entityType: "schedule",
      entityId: scheduleId,
      entityName: options.entityName,
      description,
      actorType: options.actorType || "system",
      actorId: options.actorId,
      actorName: options.actorName,
      metadata: options.metadata,
      changes: options.changes,
    });
  }

  /**
   * Convenience method for logging tour actions
   */
  async logTourAction(
    action: Extract<ActivityAction, `tour.${string}`>,
    tourId: string,
    tourName: string,
    description: string,
    options: {
      actorType?: "user" | "system" | "customer" | "webhook";
      actorId?: string;
      actorName?: string;
      metadata?: Record<string, unknown>;
      changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
    } = {}
  ): Promise<ActivityLog> {
    return this.log({
      action,
      entityType: "tour",
      entityId: tourId,
      entityName: tourName,
      description,
      actorType: options.actorType || "system",
      actorId: options.actorId,
      actorName: options.actorName,
      metadata: options.metadata,
      changes: options.changes,
    });
  }

  /**
   * Convenience method for logging customer actions
   */
  async logCustomerAction(
    action: Extract<ActivityAction, `customer.${string}`>,
    customerId: string,
    customerName: string,
    description: string,
    options: {
      actorType?: "user" | "system" | "customer" | "webhook";
      actorId?: string;
      actorName?: string;
      metadata?: Record<string, unknown>;
      changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
    } = {}
  ): Promise<ActivityLog> {
    return this.log({
      action,
      entityType: "customer",
      entityId: customerId,
      entityName: customerName,
      description,
      actorType: options.actorType || "system",
      actorId: options.actorId,
      actorName: options.actorName,
      metadata: options.metadata,
      changes: options.changes,
    });
  }

  /**
   * Get activity stats for dashboard
   */
  async getStats(dateRange?: DateRangeFilter): Promise<{
    total: number;
    byAction: Record<string, number>;
    byEntityType: Record<string, number>;
  }> {
    const conditions = [eq(activityLogs.organizationId, this.organizationId)];

    if (dateRange?.from) {
      conditions.push(gte(activityLogs.createdAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(activityLogs.createdAt, dateRange.to));
    }

    const logs = await this.db
      .select({
        action: activityLogs.action,
        entityType: activityLogs.entityType,
      })
      .from(activityLogs)
      .where(and(...conditions));

    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
    }

    return {
      total: logs.length,
      byAction,
      byEntityType,
    };
  }
}
