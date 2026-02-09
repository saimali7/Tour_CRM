import { pgTable, text, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { users } from "./users";

export type NotificationSeverity = "critical" | "warning" | "info" | "success";
export type NotificationCategory =
  | "operations"
  | "booking"
  | "customer"
  | "guide"
  | "billing"
  | "system";

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Tenant and recipient scope
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Source and categorization
  source: text("source").notNull().default("system"),
  category: text("category").$type<NotificationCategory>().notNull().default("system"),
  severity: text("severity").$type<NotificationSeverity>().notNull().default("info"),
  dedupeKey: text("dedupe_key").notNull(),

  // Content
  title: text("title").notNull(),
  body: text("body").notNull(),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  // Lifecycle
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("notifications_org_idx").on(table.organizationId),
  userIdx: index("notifications_user_idx").on(table.userId),
  severityIdx: index("notifications_severity_idx").on(table.severity),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  orgUserCreatedIdx: index("notifications_org_user_created_idx").on(
    table.organizationId,
    table.userId,
    table.createdAt
  ),
  unreadIdx: index("notifications_unread_idx").on(
    table.organizationId,
    table.userId,
    table.readAt
  ),
  dedupeUnique: unique("notifications_org_user_dedupe_unique").on(
    table.organizationId,
    table.userId,
    table.dedupeKey
  ),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
