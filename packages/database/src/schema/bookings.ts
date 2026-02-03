import { pgTable, text, timestamp, integer, numeric, jsonb, index, unique, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { tours } from "./tours";
import { guides } from "./guides";
import { pickupZones } from "./pickup-zones";
import type { PricingModel, ExperienceMode } from "./booking-options";

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

  // Schedule reference (DEPRECATED - kept for migration, no FK constraint)
  // Legacy field - system now uses availability-based booking (tourId + bookingDate + bookingTime)
  scheduleId: text("schedule_id"),

  // =========================================================================
  // NEW AVAILABILITY-BASED BOOKING FIELDS
  // =========================================================================
  // Direct tour reference (replaces going through schedule)
  tourId: text("tour_id")
    .references(() => tours.id, { onDelete: "restrict" }),

  // Booking date and time (replaces schedule.startsAt)
  bookingDate: date("booking_date", { mode: "date" }),
  bookingTime: text("booking_time"), // HH:MM format, e.g., "09:00"

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
    pricingModel?: PricingModel;
    experienceMode?: ExperienceMode;
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

  // =========================================================================
  // PICKUP / DISPATCH FIELDS (Tour Command Center)
  // =========================================================================
  pickupZoneId: text("pickup_zone_id").references(() => pickupZones.id, { onDelete: "set null" }),
  pickupLocation: text("pickup_location"), // Specific venue name, e.g., "Hilton Dubai Marina"
  pickupAddress: text("pickup_address"), // Full address
  pickupLat: numeric("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: numeric("pickup_lng", { precision: 10, scale: 7 }),
  pickupTime: text("pickup_time"), // Calculated pickup time, e.g., "08:15"
  pickupNotes: text("pickup_notes"), // Additional notes, e.g., "Tower 2 lobby"
  specialOccasion: text("special_occasion"), // "Birthday", "Anniversary", etc.

  // =========================================================================
  // GUIDE ASSIGNMENT (Direct booking → guide relationship)
  // =========================================================================
  // Legacy direct guide assignment (deprecated for Command Center dispatch).
  // Use guide_assignments + pickup_assignments as the canonical dispatch source of truth.
  assignedGuideId: text("assigned_guide_id").references(() => guides.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }), // When the legacy guide assignment was set
  isFirstTime: boolean("is_first_time").default(false), // First time customer with this org

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
  // NEW: Indexes for availability-based booking model
  tourIdx: index("bookings_tour_idx").on(table.tourId),
  bookingDateIdx: index("bookings_booking_date_idx").on(table.bookingDate),
  // Composite index for capacity computation (tour run lookups)
  tourDateTimeIdx: index("bookings_tour_date_time_idx").on(table.organizationId, table.tourId, table.bookingDate, table.bookingTime),
  // Pickup zone index for dispatch/command center queries
  pickupZoneIdx: index("bookings_pickup_zone_idx").on(table.pickupZoneId),
  // Guide assignment index for dispatch queries
  assignedGuideIdx: index("bookings_assigned_guide_idx").on(table.assignedGuideId),
  // Composite index for guide schedule lookups (all bookings for a guide on a date)
  guideBookingDateIdx: index("bookings_guide_date_idx").on(table.assignedGuideId, table.bookingDate),
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
  // Direct tour relation for availability-based model
  tour: one(tours, {
    fields: [bookings.tourId],
    references: [tours.id],
  }),
  // Pickup zone for dispatch/command center
  pickupZone: one(pickupZones, {
    fields: [bookings.pickupZoneId],
    references: [pickupZones.id],
  }),
  // Direct guide assignment for dispatch
  assignedGuide: one(guides, {
    fields: [bookings.assignedGuideId],
    references: [guides.id],
  }),
  participants: many(bookingParticipants),
  // Note: payments relation added in payments.ts to avoid circular dependencies
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
