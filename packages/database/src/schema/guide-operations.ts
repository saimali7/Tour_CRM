import { pgTable, text, timestamp, integer, boolean, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { guides } from "./guides";
import { tours } from "./tours";
import { bookings } from "./bookings";

// Guide Availability - Weekly recurring availability pattern (org-scoped)
export const guideAvailability = pgTable("guide_availability", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Guide reference
  guideId: text("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),

  // Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  dayOfWeek: integer("day_of_week").notNull(),

  // Time range (HH:MM format, e.g., "09:00", "17:30")
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),

  // Availability flag
  isAvailable: boolean("is_available").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("guide_availability_org_idx").on(table.organizationId),
  guideIdx: index("guide_availability_guide_idx").on(table.guideId),
  dayIdx: index("guide_availability_day_idx").on(table.dayOfWeek),
}));

// Guide Availability Overrides - Specific date overrides for vacations, sick days, etc. (org-scoped)
export const guideAvailabilityOverrides = pgTable("guide_availability_overrides", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Guide reference
  guideId: text("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),

  // Specific date for the override
  date: timestamp("date", { withTimezone: true }).notNull(),

  // Availability for this date (true=working, false=off/unavailable)
  isAvailable: boolean("is_available").notNull(),

  // Optional time overrides (if working but different hours)
  startTime: text("start_time"), // HH:MM format, null = use regular schedule
  endTime: text("end_time"),     // HH:MM format, null = use regular schedule

  // Reason for override (e.g., "Vacation", "Sick day", "Special event")
  reason: text("reason"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("guide_availability_overrides_org_idx").on(table.organizationId),
  guideIdx: index("guide_availability_overrides_guide_idx").on(table.guideId),
  dateIdx: index("guide_availability_overrides_date_idx").on(table.date),
  guideDateUnique: unique().on(table.guideId, table.date), // One override per guide per date
}));

// Tour Guide Qualifications - Which guides are qualified for which tours (org-scoped)
export const tourGuideQualifications = pgTable("tour_guide_qualifications", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Guide reference
  guideId: text("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),

  // Is this guide the primary/preferred guide for this tour?
  isPrimary: boolean("is_primary").notNull().default(false),

  // Notes about this qualification
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("tour_guide_qualifications_org_idx").on(table.organizationId),
  tourIdx: index("tour_guide_qualifications_tour_idx").on(table.tourId),
  guideIdx: index("tour_guide_qualifications_guide_idx").on(table.guideId),
  tourGuideUnique: unique().on(table.tourId, table.guideId), // One qualification per tour-guide pair
}));

// Guide Assignments - Assignment of guides to specific bookings with confirmation status (org-scoped)
// Supports both insourced (system guides) and outsourced (external guides tracked by name only)
export const guideAssignments = pgTable("guide_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking reference (guide is assigned to a booking)
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Guide reference (nullable - for insourced/system guides only)
  // When guideId is set, this is an insourced guide assignment
  guideId: text("guide_id")
    .references(() => guides.id, { onDelete: "cascade" }),

  // Outsourced guide fields (for external/freelance guides not in the system)
  // When outsourcedGuideName is set, this is an outsourced guide assignment
  outsourcedGuideName: text("outsourced_guide_name"),
  outsourcedGuideContact: text("outsourced_guide_contact"), // Phone or email

  // Assignment status
  status: text("status").$type<GuideAssignmentStatus>().notNull().default("pending"),

  // Status timestamps
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),

  // Decline reason (if applicable)
  declineReason: text("decline_reason"),

  // Assignment notes
  notes: text("notes"),

  // =========================================================================
  // DISPATCH FIELDS (Tour Command Center)
  // =========================================================================
  isLeadGuide: boolean("is_lead_guide").notNull().default(false),
  pickupOrder: integer("pickup_order"), // 1, 2, 3... sequence for this guide's pickups
  calculatedPickupTime: text("calculated_pickup_time"), // Calculated time, e.g., "08:15"
  driveTimeMinutes: integer("drive_time_minutes"), // Minutes to reach this pickup from previous location

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("guide_assignments_org_idx").on(table.organizationId),
  bookingIdx: index("guide_assignments_booking_idx").on(table.bookingId),
  guideIdx: index("guide_assignments_guide_idx").on(table.guideId),
  statusIdx: index("guide_assignments_status_idx").on(table.status),
  // Note: unique constraint removed since we now support outsourced guides without guideId
}));

// Relations
export const guideAvailabilityRelations = relations(guideAvailability, ({ one }) => ({
  organization: one(organizations, {
    fields: [guideAvailability.organizationId],
    references: [organizations.id],
  }),
  guide: one(guides, {
    fields: [guideAvailability.guideId],
    references: [guides.id],
  }),
}));

export const guideAvailabilityOverridesRelations = relations(guideAvailabilityOverrides, ({ one }) => ({
  organization: one(organizations, {
    fields: [guideAvailabilityOverrides.organizationId],
    references: [organizations.id],
  }),
  guide: one(guides, {
    fields: [guideAvailabilityOverrides.guideId],
    references: [guides.id],
  }),
}));

export const tourGuideQualificationsRelations = relations(tourGuideQualifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourGuideQualifications.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourGuideQualifications.tourId],
    references: [tours.id],
  }),
  guide: one(guides, {
    fields: [tourGuideQualifications.guideId],
    references: [guides.id],
  }),
}));

export const guideAssignmentsRelations = relations(guideAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [guideAssignments.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [guideAssignments.bookingId],
    references: [bookings.id],
  }),
  guide: one(guides, {
    fields: [guideAssignments.guideId],
    references: [guides.id],
  }),
}));

// Add the many relation to bookings (avoids circular dependency if defined here)
export const bookingsGuideAssignmentsRelations = relations(bookings, ({ many }) => ({
  guideAssignments: many(guideAssignments),
}));

// Types
export type GuideAssignmentStatus = "pending" | "confirmed" | "declined";

export type GuideAvailability = typeof guideAvailability.$inferSelect;
export type NewGuideAvailability = typeof guideAvailability.$inferInsert;

export type GuideAvailabilityOverride = typeof guideAvailabilityOverrides.$inferSelect;
export type NewGuideAvailabilityOverride = typeof guideAvailabilityOverrides.$inferInsert;

export type TourGuideQualification = typeof tourGuideQualifications.$inferSelect;
export type NewTourGuideQualification = typeof tourGuideQualifications.$inferInsert;

export type GuideAssignment = typeof guideAssignments.$inferSelect;
export type NewGuideAssignment = typeof guideAssignments.$inferInsert;
