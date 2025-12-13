import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Activity log action types
export type ActivityAction =
  // Booking actions
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "booking.confirmed"
  | "booking.completed"
  | "booking.refunded"
  | "booking.rescheduled"
  | "booking.participant_added"
  | "booking.participant_removed"
  | "booking.email_sent"
  // Schedule actions
  | "schedule.created"
  | "schedule.updated"
  | "schedule.cancelled"
  | "schedule.completed"
  | "schedule.guide_assigned"
  | "schedule.guide_removed"
  | "schedule.guide_reminder_sent"
  // Tour actions
  | "tour.created"
  | "tour.updated"
  | "tour.published"
  | "tour.unpublished"
  | "tour.archived"
  // Customer actions
  | "customer.created"
  | "customer.updated"
  | "customer.merged"
  | "customer.deleted"
  // Guide actions
  | "guide.created"
  | "guide.updated"
  | "guide.activated"
  | "guide.deactivated"
  | "guide.daily_manifest_sent"
  // Assignment actions
  | "assignment.email_sent"
  | "assignment.reminder_sent"
  // Organization actions
  | "organization.settings_updated"
  | "organization.stripe_connected"
  | "organization.stripe_disconnected"
  // Payment actions
  | "payment.received"
  | "payment.refunded"
  | "payment.failed";

// Activity log entity types
export type ActivityEntity =
  | "booking"
  | "schedule"
  | "tour"
  | "customer"
  | "guide"
  | "guide_assignment"
  | "organization"
  | "payment";

// Activity Logs - Immutable audit trail (org-scoped)
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Actor - who performed the action
  actorType: text("actor_type").$type<"user" | "system" | "customer" | "webhook">().notNull(),
  actorId: text("actor_id"), // User ID, customer ID, or null for system
  actorName: text("actor_name"), // Display name for easy reading

  // Action details
  action: text("action").$type<ActivityAction>().notNull(),
  entityType: text("entity_type").$type<ActivityEntity>().notNull(),
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name"), // Display name of the entity (e.g., booking reference, tour name)

  // Change details
  description: text("description").notNull(), // Human-readable description
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), // Additional context
  changes: jsonb("changes").$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }>().default({}), // Field-level changes for updates

  // Request context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("activity_logs_org_idx").on(table.organizationId),
  entityIdx: index("activity_logs_entity_idx").on(table.entityType, table.entityId),
  actionIdx: index("activity_logs_action_idx").on(table.action),
  actorIdx: index("activity_logs_actor_idx").on(table.actorType, table.actorId),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

// Relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLogs.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
