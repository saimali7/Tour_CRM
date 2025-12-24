import { pgTable, text, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { bookings } from "./bookings";

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

  // Date and time
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),

  // Capacity (can override tour defaults)
  maxParticipants: integer("max_participants").notNull(),
  bookedCount: integer("booked_count").default(0), // Denormalized for quick availability checks

  // Guide capacity tracking (calculated from bookedCount / tour.guestsPerGuide)
  guidesRequired: integer("guides_required").notNull().default(0), // How many guides needed based on bookings
  guidesAssigned: integer("guides_assigned").notNull().default(0), // Count of unique confirmed guide assignments across bookings

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
  bookings: many(bookings),
  // Note: optionAvailability relation defined in booking-options.ts to avoid circular deps
  // Note: guide assignments are now at booking level, not schedule level
}));

// Types
export type ScheduleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
