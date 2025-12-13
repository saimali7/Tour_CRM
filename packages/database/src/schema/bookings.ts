import { pgTable, text, timestamp, integer, numeric, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { schedules } from "./schedules";

// Bookings - Customer reservations (org-scoped)
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Reference number (human-readable)
  referenceNumber: text("reference_number").notNull(),

  // Customer
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),

  // Schedule
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "restrict" }),

  // Participants
  adultCount: integer("adult_count").notNull().default(1),
  childCount: integer("child_count").default(0),
  infantCount: integer("infant_count").default(0),
  totalParticipants: integer("total_participants").notNull(),

  // Pricing
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),

  // Payment
  paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("pending"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default("0"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Status
  status: text("status").$type<BookingStatus>().notNull().default("pending"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),

  // Source
  source: text("source").$type<BookingSource>().notNull().default("manual"),
  sourceDetails: text("source_details"),

  // Special requests
  specialRequests: text("special_requests"),
  dietaryRequirements: text("dietary_requirements"),
  accessibilityNeeds: text("accessibility_needs"),

  // Internal notes
  internalNotes: text("internal_notes"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Reference number unique per organization
  refOrgUnique: unique().on(table.organizationId, table.referenceNumber),
  orgIdx: index("bookings_org_idx").on(table.organizationId),
  customerIdx: index("bookings_customer_idx").on(table.customerId),
  scheduleIdx: index("bookings_schedule_idx").on(table.scheduleId),
  statusIdx: index("bookings_status_idx").on(table.status),
  createdAtIdx: index("bookings_created_at_idx").on(table.createdAt),
  orgStatusCreatedIdx: index("bookings_org_status_created_idx").on(table.organizationId, table.status, table.createdAt),
}));

// Booking participants - Individual people on a booking
export const bookingParticipants = pgTable("booking_participants", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking this participant belongs to
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Participant details
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),

  // Type
  type: text("type").$type<ParticipantType>().notNull().default("adult"),

  // Special requirements
  dietaryRequirements: text("dietary_requirements"),
  accessibilityNeeds: text("accessibility_needs"),
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("participants_org_idx").on(table.organizationId),
  bookingIdx: index("participants_booking_idx").on(table.bookingId),
}));

// Relations
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bookings.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  schedule: one(schedules, {
    fields: [bookings.scheduleId],
    references: [schedules.id],
  }),
  participants: many(bookingParticipants),
}));

export const bookingParticipantsRelations = relations(bookingParticipants, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookingParticipants.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [bookingParticipants.bookingId],
    references: [bookings.id],
  }),
}));

// Types
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed";
export type BookingSource = "manual" | "website" | "api" | "phone" | "walk_in";
export type ParticipantType = "adult" | "child" | "infant";

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingParticipant = typeof bookingParticipants.$inferSelect;
export type NewBookingParticipant = typeof bookingParticipants.$inferInsert;
