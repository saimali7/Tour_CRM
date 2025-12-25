import { pgTable, text, timestamp, integer, boolean, jsonb, numeric, index, unique, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";

// =============================================================================
// TOUR AVAILABILITY WINDOWS
// =============================================================================
// Define when a tour operates (date ranges + days of week)
// Replaces the concept of pre-creating individual schedules

export const tourAvailabilityWindows = pgTable("tour_availability_windows", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Window info
  name: text("name"), // e.g., "Summer Season", "Winter Hours"

  // Date range (inclusive)
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }), // null = indefinite

  // Days of week this window applies (0=Sunday, 6=Saturday)
  daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),

  // Overrides (optional - if null, uses tour defaults)
  maxParticipantsOverride: integer("max_participants_override"),
  priceOverride: numeric("price_override", { precision: 10, scale: 2 }),
  meetingPointOverride: text("meeting_point_override"),
  meetingPointDetailsOverride: text("meeting_point_details_override"),

  // Status
  isActive: boolean("is_active").notNull().default(true),

  // Notes
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("tour_availability_windows_org_idx").on(table.organizationId),
  tourIdx: index("tour_availability_windows_tour_idx").on(table.tourId),
  dateRangeIdx: index("tour_availability_windows_date_range_idx").on(table.startDate, table.endDate),
  activeIdx: index("tour_availability_windows_active_idx").on(table.isActive),
  tourActiveIdx: index("tour_availability_windows_tour_active_idx").on(table.tourId, table.isActive),
}));

// =============================================================================
// TOUR DEPARTURE TIMES
// =============================================================================
// Fixed times when a tour departs (e.g., "09:00", "14:00")

export const tourDepartureTimes = pgTable("tour_departure_times", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Time in HH:MM 24-hour format (e.g., "09:00", "14:30")
  time: text("time").notNull(),

  // Optional label (e.g., "Morning Tour", "Sunset Tour")
  label: text("label"),

  // Status
  isActive: boolean("is_active").notNull().default(true),

  // Display order
  sortOrder: integer("sort_order").notNull().default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("tour_departure_times_org_idx").on(table.organizationId),
  tourIdx: index("tour_departure_times_tour_idx").on(table.tourId),
  tourTimeUnique: unique("tour_departure_times_tour_time_unique").on(table.tourId, table.time),
  tourActiveIdx: index("tour_departure_times_tour_active_idx").on(table.tourId, table.isActive),
}));

// =============================================================================
// TOUR BLACKOUT DATES
// =============================================================================
// Specific dates when a tour is closed (holidays, closures, etc.)

export const tourBlackoutDates = pgTable("tour_blackout_dates", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Blackout date
  date: date("date", { mode: "date" }).notNull(),

  // Reason for closure
  reason: text("reason"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("tour_blackout_dates_org_idx").on(table.organizationId),
  tourIdx: index("tour_blackout_dates_tour_idx").on(table.tourId),
  tourDateUnique: unique("tour_blackout_dates_tour_date_unique").on(table.tourId, table.date),
  dateIdx: index("tour_blackout_dates_date_idx").on(table.date),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const tourAvailabilityWindowsRelations = relations(tourAvailabilityWindows, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourAvailabilityWindows.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourAvailabilityWindows.tourId],
    references: [tours.id],
  }),
}));

export const tourDepartureTimesRelations = relations(tourDepartureTimes, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourDepartureTimes.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourDepartureTimes.tourId],
    references: [tours.id],
  }),
}));

export const tourBlackoutDatesRelations = relations(tourBlackoutDates, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourBlackoutDates.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourBlackoutDates.tourId],
    references: [tours.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type TourAvailabilityWindow = typeof tourAvailabilityWindows.$inferSelect;
export type NewTourAvailabilityWindow = typeof tourAvailabilityWindows.$inferInsert;

export type TourDepartureTime = typeof tourDepartureTimes.$inferSelect;
export type NewTourDepartureTime = typeof tourDepartureTimes.$inferInsert;

export type TourBlackoutDate = typeof tourBlackoutDates.$inferSelect;
export type NewTourBlackoutDate = typeof tourBlackoutDates.$inferInsert;
