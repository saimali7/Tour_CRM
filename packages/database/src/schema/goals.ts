import { pgTable, uuid, varchar, decimal, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

// Enums
export const goalMetricTypeEnum = pgEnum("goal_metric_type", [
  "revenue",
  "bookings",
  "capacity_utilization",
  "new_customers",
]);

export const goalPeriodTypeEnum = pgEnum("goal_period_type", [
  "monthly",
  "quarterly",
  "yearly",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "missed",
]);

// Goals table
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Goal configuration
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  metricType: goalMetricTypeEnum("metric_type").notNull(),
  targetValue: decimal("target_value", { precision: 12, scale: 2 }).notNull(),
  periodType: goalPeriodTypeEnum("period_type").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

  // Status
  status: goalStatusEnum("status").notNull().default("active"),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }).default("0"),
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),

  // Audit
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const goalsRelations = relations(goals, ({ one }) => ({
  organization: one(organizations, {
    fields: [goals.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalMetricType = (typeof goalMetricTypeEnum.enumValues)[number];
export type GoalPeriodType = (typeof goalPeriodTypeEnum.enumValues)[number];
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];
