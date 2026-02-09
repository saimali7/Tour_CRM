import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
} from "drizzle-orm";
import {
  notifications,
  type Notification,
  type NotificationCategory,
  type NotificationSeverity,
} from "@tour/database";
import { BaseService } from "./base-service";
import { DashboardService } from "./dashboard-service";
import { type PaginatedResult } from "./types";

const OPERATIONS_SOURCE = "operations-signal";

export interface NotificationInboxOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationInboxResult extends PaginatedResult<Notification> {
  unreadCount: number;
}

export interface CreateNotificationInput {
  userId: string;
  source?: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  dedupeKey: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  expiresAt?: Date;
}

interface OperationalSignalInput {
  dedupeKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
  occurredAt: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export class NotificationService extends BaseService {
  private async buildOperationalSignals(orgSlug: string): Promise<OperationalSignalInput[]> {
    const dashboard = new DashboardService({
      organizationId: this.organizationId,
      userId: this.userId,
    });
    const operations = await dashboard.getOperationsDashboard();
    const now = new Date();
    const actionUrl = `/org/${orgSlug}/calendar`;

    const signals: OperationalSignalInput[] = [];

    for (const schedule of operations.upcomingSchedules) {
      const startsAt = new Date(schedule.startsAt);
      const hoursAway = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysAway = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const utilization = schedule.maxParticipants > 0
        ? (schedule.bookedCount / schedule.maxParticipants) * 100
        : 0;

      if (schedule.needsMoreGuides) {
        const shortBy = schedule.guideDeficit === 1
          ? "1 guide short"
          : `${schedule.guideDeficit} guides short`;
        signals.push({
          dedupeKey: `ops:guides:${schedule.scheduleId}`,
          category: "operations",
          severity: "critical",
          title: "Guide coverage required",
          body: `${schedule.tourName} starts soon (${shortBy}).`,
          actionUrl,
          actionLabel: "Assign guides",
          occurredAt: startsAt,
          expiresAt: new Date(startsAt.getTime() + 6 * 60 * 60 * 1000),
          metadata: {
            scheduleId: schedule.scheduleId,
            tourName: schedule.tourName,
            guidesAssigned: schedule.guidesAssigned,
            guidesRequired: schedule.guidesRequired,
            guideDeficit: schedule.guideDeficit,
          },
        });
        continue;
      }

      if (hoursAway > 0 && hoursAway <= 2 && schedule.bookedCount > 0) {
        signals.push({
          dedupeKey: `ops:starting-soon:${schedule.scheduleId}`,
          category: "operations",
          severity: "info",
          title: "Tour starting soon",
          body: `${schedule.tourName} has ${schedule.bookedCount} guest${schedule.bookedCount === 1 ? "" : "s"}.`,
          actionUrl,
          actionLabel: "Open calendar",
          occurredAt: startsAt,
          expiresAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
          metadata: {
            scheduleId: schedule.scheduleId,
            tourName: schedule.tourName,
            bookedCount: schedule.bookedCount,
          },
        });
      }

      if (utilization < 30 && daysAway > 2) {
        signals.push({
          dedupeKey: `ops:low-bookings:${schedule.scheduleId}`,
          category: "operations",
          severity: "warning",
          title: "Low bookings detected",
          body: `${schedule.tourName} is at ${schedule.bookedCount}/${schedule.maxParticipants} booked.`,
          actionUrl,
          actionLabel: "Review schedule",
          occurredAt: startsAt,
          expiresAt: startsAt,
          metadata: {
            scheduleId: schedule.scheduleId,
            tourName: schedule.tourName,
            bookedCount: schedule.bookedCount,
            maxParticipants: schedule.maxParticipants,
            utilization,
          },
        });
      }
    }

    return signals;
  }

  async getOperationalFallback(
    orgSlug: string,
    options: NotificationInboxOptions = {}
  ): Promise<NotificationInboxResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const now = new Date();
    const signals = await this.buildOperationalSignals(orgSlug);

    const active = signals
      .filter((signal) => !signal.expiresAt || signal.expiresAt >= now)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map((signal) => ({
        id: signal.dedupeKey,
        organizationId: this.organizationId,
        userId: this.userId ?? "fallback-user",
        source: OPERATIONS_SOURCE,
        category: signal.category,
        severity: signal.severity,
        dedupeKey: signal.dedupeKey,
        title: signal.title,
        body: signal.body,
        actionUrl: signal.actionUrl,
        actionLabel: signal.actionLabel,
        metadata: signal.metadata,
        occurredAt: signal.occurredAt,
        readAt: null,
        archivedAt: null,
        expiresAt: signal.expiresAt ?? null,
        createdAt: signal.occurredAt,
        updatedAt: signal.occurredAt,
      }));

    const total = active.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: active.slice(offset, offset + limit) as Notification[],
      total,
      unreadCount: total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Build and persist operational notifications from live dashboard signals.
   * This keeps the notification center useful until domain events fully backfill producers.
   */
  async syncOperationalSignalsForUser(userId: string, orgSlug: string): Promise<void> {
    const signals = await this.buildOperationalSignals(orgSlug);
    const now = new Date();

    for (const signal of signals) {
      await this.db
        .insert(notifications)
        .values({
          organizationId: this.organizationId,
          userId,
          source: OPERATIONS_SOURCE,
          category: signal.category,
          severity: signal.severity,
          dedupeKey: signal.dedupeKey,
          title: signal.title,
          body: signal.body,
          actionUrl: signal.actionUrl,
          actionLabel: signal.actionLabel,
          metadata: signal.metadata,
          occurredAt: signal.occurredAt,
          expiresAt: signal.expiresAt,
        })
        .onConflictDoUpdate({
          target: [
            notifications.organizationId,
            notifications.userId,
            notifications.dedupeKey,
          ],
          set: {
            category: signal.category,
            severity: signal.severity,
            title: signal.title,
            body: signal.body,
            actionUrl: signal.actionUrl,
            actionLabel: signal.actionLabel,
            metadata: signal.metadata,
            occurredAt: signal.occurredAt,
            expiresAt: signal.expiresAt ?? null,
            archivedAt: null,
            updatedAt: new Date(),
          },
        });
    }

    const activeKeys = signals.map((signal) => signal.dedupeKey);
    const baseConditions = [
      eq(notifications.organizationId, this.organizationId),
      eq(notifications.userId, userId),
      eq(notifications.source, OPERATIONS_SOURCE),
      isNull(notifications.archivedAt),
    ];

    if (activeKeys.length === 0) {
      await this.db
        .update(notifications)
        .set({
          archivedAt: now,
          updatedAt: now,
        })
        .where(and(...baseConditions));
      return;
    }

    await this.db
      .update(notifications)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(and(...baseConditions, notInArray(notifications.dedupeKey, activeKeys)));
  }

  async getInbox(
    userId: string,
    options: NotificationInboxOptions = {}
  ): Promise<NotificationInboxResult> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;
    const now = new Date();

    const activeConditions = [
      eq(notifications.organizationId, this.organizationId),
      eq(notifications.userId, userId),
      isNull(notifications.archivedAt),
      or(isNull(notifications.expiresAt), gte(notifications.expiresAt, now)),
    ];

    const listConditions = unreadOnly
      ? [...activeConditions, isNull(notifications.readAt)]
      : activeConditions;

    const [data, countResult, unreadResult] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(and(...listConditions))
        .orderBy(desc(notifications.occurredAt), desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(notifications)
        .where(and(...listConditions)),
      this.db
        .select({ total: count() })
        .from(notifications)
        .where(and(...activeConditions, isNull(notifications.readAt))),
    ]);

    const total = countResult[0]?.total ?? 0;
    const unreadCount = unreadResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      unreadCount,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const now = new Date();
    const [result] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, this.organizationId),
          eq(notifications.userId, userId),
          isNull(notifications.archivedAt),
          isNull(notifications.readAt),
          or(isNull(notifications.expiresAt), gte(notifications.expiresAt, now))
        )
      );

    return result?.total ?? 0;
  }

  async markRead(userId: string, ids: string[]): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };

    const now = new Date();
    const updated = await this.db
      .update(notifications)
      .set({
        readAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(notifications.organizationId, this.organizationId),
          eq(notifications.userId, userId),
          inArray(notifications.id, ids),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });

    return { updated: updated.length };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const now = new Date();
    const updated = await this.db
      .update(notifications)
      .set({
        readAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(notifications.organizationId, this.organizationId),
          eq(notifications.userId, userId),
          isNull(notifications.archivedAt),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });

    return { updated: updated.length };
  }

  async archive(userId: string, ids: string[]): Promise<{ archived: number }> {
    if (ids.length === 0) return { archived: 0 };

    const now = new Date();
    const archived = await this.db
      .update(notifications)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(notifications.organizationId, this.organizationId),
          eq(notifications.userId, userId),
          inArray(notifications.id, ids),
          isNull(notifications.archivedAt)
        )
      )
      .returning({ id: notifications.id });

    return { archived: archived.length };
  }

  async archiveAllRead(userId: string): Promise<{ archived: number }> {
    const now = new Date();
    const archived = await this.db
      .update(notifications)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(notifications.organizationId, this.organizationId),
          eq(notifications.userId, userId),
          isNull(notifications.archivedAt),
          isNotNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });

    return { archived: archived.length };
  }

  async createOrUpdate(input: CreateNotificationInput): Promise<Notification> {
    const now = new Date();
    const inserted = await this.db
      .insert(notifications)
      .values({
        organizationId: this.organizationId,
        userId: input.userId,
        source: input.source ?? "system",
        category: input.category,
        severity: input.severity ?? "info",
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        metadata: input.metadata ?? {},
        occurredAt: input.occurredAt ?? now,
        expiresAt: input.expiresAt,
      })
      .onConflictDoUpdate({
        target: [
          notifications.organizationId,
          notifications.userId,
          notifications.dedupeKey,
        ],
        set: {
          source: input.source ?? "system",
          category: input.category,
          severity: input.severity ?? "info",
          title: input.title,
          body: input.body,
          actionUrl: input.actionUrl,
          actionLabel: input.actionLabel,
          metadata: input.metadata ?? {},
          occurredAt: input.occurredAt ?? now,
          expiresAt: input.expiresAt ?? null,
          archivedAt: null,
          readAt: null,
          updatedAt: now,
        },
      })
      .returning();

    return inserted[0] as Notification;
  }
}
