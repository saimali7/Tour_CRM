import { pgTable, text, timestamp, integer, numeric, jsonb, index, unique, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { users } from "./users";

// Dispatch Status - Daily dispatch status tracking (org-scoped)
export const dispatchStatus = pgTable("dispatch_status", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Date for this dispatch
  dispatchDate: date("dispatch_date", { mode: "date" }).notNull(),

  // Dispatch workflow status
  status: text("status").$type<DispatchStatusType>().notNull().default("pending"),

  // Timestamps for status transitions
  optimizedAt: timestamp("optimized_at", { withTimezone: true }),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  dispatchedBy: text("dispatched_by").references(() => users.id, { onDelete: "set null" }),

  // Optimization results / summary metrics
  totalGuests: integer("total_guests"),
  totalGuides: integer("total_guides"),
  totalDriveMinutes: integer("total_drive_minutes"),
  efficiencyScore: numeric("efficiency_score", { precision: 5, scale: 2 }), // 0-100%

  // Warning tracking
  unresolvedWarnings: integer("unresolved_warnings").notNull().default(0),
  warnings: jsonb("warnings").$type<DispatchWarning[]>().default([]),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("dispatch_status_org_idx").on(table.organizationId),
  dateIdx: index("dispatch_status_date_idx").on(table.dispatchDate),
  statusIdx: index("dispatch_status_status_idx").on(table.status),
  orgDateUnique: unique("dispatch_status_org_date_unique").on(table.organizationId, table.dispatchDate),
}));

// Relations
export const dispatchStatusRelations = relations(dispatchStatus, ({ one }) => ({
  organization: one(organizations, {
    fields: [dispatchStatus.organizationId],
    references: [organizations.id],
  }),
  dispatchedByUser: one(users, {
    fields: [dispatchStatus.dispatchedBy],
    references: [users.id],
  }),
}));

// Types
export type DispatchStatusType = "pending" | "optimized" | "needs_review" | "ready" | "dispatched";

export interface DispatchWarning {
  id: string;
  type: "insufficient_guides" | "capacity_exceeded" | "no_qualified_guide" | "schedule_conflict" | "other";
  message: string;
  bookingId?: string;
  tourRunId?: string;
  guideId?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export type DispatchStatus = typeof dispatchStatus.$inferSelect;
export type NewDispatchStatus = typeof dispatchStatus.$inferInsert;
