import { pgTable, text, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { guideAssignments } from "./guide-operations";
import { bookings } from "./bookings";
import { pickupAddresses } from "./pickup-addresses";

/**
 * Pickup Assignment Status
 *
 * - pending: Assignment created, pickup not yet started
 * - picked_up: Guest successfully picked up
 * - no_show: Guest did not show up at pickup location
 * - cancelled: Pickup was cancelled (booking cancelled, reassigned, etc.)
 */
export type PickupAssignmentStatus = "pending" | "picked_up" | "no_show" | "cancelled";

/**
 * Pickup Assignments - Booking-to-Guide assignments for pickup routes (org-scoped)
 *
 * This table tracks which bookings are assigned to which guide for pickup,
 * including the pickup order (sequence), estimated times, and actual completion status.
 * It's the core of the Tour Command Center assignment system.
 */
export const pickupAssignments = pgTable("pickup_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Relationships
  /** The schedule (tour instance) this pickup is for - DEPRECATED: Use tourId/bookingDate from booking instead */
  scheduleId: text("schedule_id"),

  /** The guide assignment handling this pickup */
  guideAssignmentId: text("guide_assignment_id")
    .notNull()
    .references(() => guideAssignments.id, { onDelete: "cascade" }),

  /** The booking being picked up */
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  /** The pickup location (optional - booking may have custom pickup) */
  pickupAddressId: text("pickup_address_id")
    .references(() => pickupAddresses.id, { onDelete: "set null" }),

  // Pickup Details
  /** Sequence order in the guide's pickup route (1, 2, 3...) */
  pickupOrder: integer("pickup_order").notNull(),

  /** Calculated pickup time based on route optimization */
  estimatedPickupTime: timestamp("estimated_pickup_time", { withTimezone: true }),

  /** Actual pickup time recorded during day-of operations */
  actualPickupTime: timestamp("actual_pickup_time", { withTimezone: true }),

  /** Cached passenger count from booking for quick capacity queries */
  passengerCount: integer("passenger_count").notNull(),

  // Status
  status: text("status").$type<PickupAssignmentStatus>().notNull().default("pending"),

  // Notes
  /** Operational notes for this specific pickup */
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: one pickup assignment per booking per schedule
  orgScheduleBookingUnique: unique().on(table.organizationId, table.scheduleId, table.bookingId),
  // Index for schedule queries (list all pickups for a tour)
  scheduleIdx: index("pickup_assignments_schedule_idx").on(table.scheduleId),
  // Index for guide assignment queries (list all pickups for a guide)
  guideAssignmentIdx: index("pickup_assignments_guide_assignment_idx").on(table.guideAssignmentId),
  // Index for booking queries (find pickup for a booking)
  bookingIdx: index("pickup_assignments_booking_idx").on(table.bookingId),
  // Index for status queries
  orgStatusIdx: index("pickup_assignments_org_status_idx").on(table.organizationId, table.status),
}));

// Relations - exported separately to avoid circular imports
export const pickupAssignmentsRelations = relations(pickupAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [pickupAssignments.organizationId],
    references: [organizations.id],
  }),
  // schedule relation removed - schedules table deprecated
  guideAssignment: one(guideAssignments, {
    fields: [pickupAssignments.guideAssignmentId],
    references: [guideAssignments.id],
  }),
  booking: one(bookings, {
    fields: [pickupAssignments.bookingId],
    references: [bookings.id],
  }),
  pickupAddress: one(pickupAddresses, {
    fields: [pickupAssignments.pickupAddressId],
    references: [pickupAddresses.id],
  }),
}));

// Types
export type PickupAssignment = typeof pickupAssignments.$inferSelect;
export type NewPickupAssignment = typeof pickupAssignments.$inferInsert;
