import { pgTable, text, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { guides } from "./guides";
import { bookings } from "./bookings";
import { guideAssignments } from "./guide-operations";

// Schedules - Specific tour instances (org-scoped)
export const schedules = pgTable("schedules", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour this schedule is for
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Assigned guide (optional)
  guideId: text("guide_id").references(() => guides.id, { onDelete: "set null" }),

  // Date and time
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),

  // Capacity (can override tour defaults)
  maxParticipants: integer("max_participants").notNull(),
  bookedCount: integer("booked_count").default(0), // Denormalized for quick availability checks

  // Pricing (can override tour base price)
  price: numeric("price", { precision: 10, scale: 2 }),
  currency: text("currency"),

  // Meeting point override
  meetingPoint: text("meeting_point"),
  meetingPointDetails: text("meeting_point_details"),

  // Status
  status: text("status").$type<ScheduleStatus>().notNull().default("scheduled"),

  // Notes
  internalNotes: text("internal_notes"),
  publicNotes: text("public_notes"), // Shown to customers

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("schedules_org_idx").on(table.organizationId),
  tourIdx: index("schedules_tour_idx").on(table.tourId),
  guideIdx: index("schedules_guide_idx").on(table.guideId),
  startsAtIdx: index("schedules_starts_at_idx").on(table.startsAt),
  statusIdx: index("schedules_status_idx").on(table.status),
  orgStartsAtIdx: index("schedules_org_starts_at_idx").on(table.organizationId, table.startsAt),
}));

// Relations
export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [schedules.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [schedules.tourId],
    references: [tours.id],
  }),
  guide: one(guides, {
    fields: [schedules.guideId],
    references: [guides.id],
  }),
  bookings: many(bookings),
  assignments: many(guideAssignments),
}));

// Types
export type ScheduleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
