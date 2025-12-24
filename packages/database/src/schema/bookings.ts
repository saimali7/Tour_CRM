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

  // Booking Option (nullable for backward compatibility)
  bookingOptionId: text("booking_option_id"),

  // Guest breakdown (new customer-first approach)
  guestAdults: integer("guest_adults"),
  guestChildren: integer("guest_children"),
  guestInfants: integer("guest_infants"),

  // Unit booking tracking (for per_unit pricing)
  unitsBooked: integer("units_booked"),

  // Pricing snapshot (JSONB - preserves exact pricing at time of booking)
  pricingSnapshot: jsonb("pricing_snapshot").$type<{
    optionId?: string;
    optionName?: string;
    pricingModel?: unknown;
    experienceMode?: "join" | "book" | "charter";
    priceBreakdown?: string;
  }>(),

  // Legacy Participants (kept for backward compatibility)
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

  // Deposit tracking
  depositRequired: numeric("deposit_required", { precision: 10, scale: 2 }), // Required deposit amount
  depositPaid: numeric("deposit_paid", { precision: 10, scale: 2 }).default("0"), // Paid deposit
  depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
  balanceDueDate: timestamp("balance_due_date", { withTimezone: true }), // When full payment is due
  balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }), // When balance was paid

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
  optionIdx: index("bookings_option_idx").on(table.bookingOptionId),
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

  // Check-in tracking
  checkedIn: text("checked_in").$type<"yes" | "no" | "no_show">().default("no"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy: text("checked_in_by"), // User ID who checked them in

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("participants_org_idx").on(table.organizationId),
  bookingIdx: index("participants_booking_idx").on(table.bookingId),
  checkedInIdx: index("participants_checked_in_idx").on(table.checkedIn),
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
  // Note: payments relation added in payments.ts to avoid circular dependencies
  // Note: guideAssignments relation needs to be defined elsewhere to avoid circular import
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
export type CheckedInStatus = "yes" | "no" | "no_show";

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingParticipant = typeof bookingParticipants.$inferSelect;
export type NewBookingParticipant = typeof bookingParticipants.$inferInsert;
