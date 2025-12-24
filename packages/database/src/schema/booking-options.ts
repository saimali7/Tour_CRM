import { pgTable, text, timestamp, integer, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { schedules } from "./schedules";
import { bookings } from "./bookings";
import { customers } from "./customers";

// ============================================================
// PRICING MODEL TYPES
// ============================================================

export interface Money {
  amount: number;        // In minor units (cents)
  currency: string;      // ISO 4217 (e.g., "USD")
}

export interface PricingTier {
  id: string;
  name: string;          // "Adult", "Child", "Senior"
  price: Money;
  ageMin?: number;
  ageMax?: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface GroupTier {
  minSize: number;
  maxSize: number;
  price: Money;
}

export interface PerPersonPricing {
  type: "per_person";
  tiers: PricingTier[];
}

export interface PerUnitPricing {
  type: "per_unit";
  unitName: string;           // "Vehicle", "Boat"
  unitNamePlural: string;
  pricePerUnit: Money;
  maxOccupancy: number;
  minOccupancy?: number;
  baseOccupancy?: number;     // Included in base price
  extraPersonFee?: Money;     // Per extra person beyond base
}

export interface FlatRatePricing {
  type: "flat_rate";
  price: Money;
  maxParticipants: number;
  minParticipants?: number;
}

export interface TieredGroupPricing {
  type: "tiered_group";
  tiers: GroupTier[];
}

export interface BasePerPersonPricing {
  type: "base_plus_person";
  basePrice: Money;
  includedParticipants: number;
  perPersonPrice: Money;
  maxParticipants: number;
}

export type PricingModel =
  | PerPersonPricing
  | PerUnitPricing
  | FlatRatePricing
  | TieredGroupPricing
  | BasePerPersonPricing;

// ============================================================
// CAPACITY MODEL TYPES
// ============================================================

export interface SharedCapacity {
  type: "shared";
  totalSeats: number;
}

export interface UnitCapacity {
  type: "unit";
  totalUnits: number;
  occupancyPerUnit: number;
}

export type CapacityModel = SharedCapacity | UnitCapacity;

export type SchedulingType = "fixed" | "flexible";
export type BookingOptionStatus = "active" | "inactive";
export type ExperienceMode = "join" | "book" | "charter";

// ============================================================
// BOOKING OPTIONS TABLE
// ============================================================

export const bookingOptions = pgTable("booking_options", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour this option belongs to
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),

  // Badges & Marketing
  badge: text("badge"),                    // "LUXURY", "MOST POPULAR"
  highlightText: text("highlight_text"),   // "Recommended for families"

  // Core Configuration (JSONB for flexibility)
  pricingModel: jsonb("pricing_model").$type<PricingModel>().notNull(),
  capacityModel: jsonb("capacity_model").$type<CapacityModel>().notNull(),

  // Scheduling
  schedulingType: text("scheduling_type").$type<SchedulingType>().default("fixed"),
  // fixed: Customer picks from available time slots
  // flexible: Customer can depart within a time range

  // Display
  isDefault: boolean("is_default").default(false),
  sortOrder: integer("sort_order").default(0),
  status: text("status").$type<BookingOptionStatus>().default("active"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Name unique per tour
  tourNameUnique: unique().on(table.tourId, table.name),
  // Indexes
  orgIdx: index("booking_options_org_idx").on(table.organizationId),
  tourIdx: index("booking_options_tour_idx").on(table.tourId),
  statusIdx: index("booking_options_status_idx").on(table.status),
  tourStatusIdx: index("booking_options_tour_status_idx").on(table.tourId, table.status),
}));

// ============================================================
// SCHEDULE OPTION AVAILABILITY
// Tracks per-option availability for each schedule
// ============================================================

export const scheduleOptionAvailability = pgTable("schedule_option_availability", {
  id: text("id").primaryKey().$defaultFn(createId),

  // References
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  bookingOptionId: text("booking_option_id")
    .notNull()
    .references(() => bookingOptions.id, { onDelete: "cascade" }),

  // Shared capacity tracking
  totalSeats: integer("total_seats"),
  bookedSeats: integer("booked_seats").default(0),

  // Unit capacity tracking
  totalUnits: integer("total_units"),
  bookedUnits: integer("booked_units").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Each option can only appear once per schedule
  scheduleOptionUnique: unique().on(table.scheduleId, table.bookingOptionId),
  // Indexes
  scheduleIdx: index("schedule_option_avail_schedule_idx").on(table.scheduleId),
  optionIdx: index("schedule_option_avail_option_idx").on(table.bookingOptionId),
}));

// ============================================================
// WAITLIST ENTRIES
// Customers waiting for availability
// ============================================================

export type WaitlistStatus = "waiting" | "notified" | "converted" | "expired";

export const waitlistEntries = pgTable("waitlist_entries", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // What they're waiting for
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  bookingOptionId: text("booking_option_id")
    .references(() => bookingOptions.id, { onDelete: "set null" }),

  // Contact info
  customerId: text("customer_id")
    .references(() => customers.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  phone: text("phone"),

  // Guest request
  adults: integer("adults").notNull(),
  children: integer("children").default(0),
  infants: integer("infants").default(0),

  // Status
  status: text("status").$type<WaitlistStatus>().default("waiting"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  convertedBookingId: text("converted_booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("waitlist_org_idx").on(table.organizationId),
  scheduleIdx: index("waitlist_schedule_idx").on(table.scheduleId),
  statusIdx: index("waitlist_status_idx").on(table.status),
  scheduleStatusIdx: index("waitlist_schedule_status_idx").on(table.scheduleId, table.status),
  emailIdx: index("waitlist_email_idx").on(table.email),
}));

// ============================================================
// BOOKING OPTION SNAPSHOT (for bookings)
// Stored on the booking to preserve historical data
// ============================================================

export interface BookingOptionSnapshot {
  optionId: string;
  optionName: string;
  pricingModel: PricingModel;
  experienceMode: ExperienceMode;
  priceBreakdown: string;          // Human-readable: "2 × $89 + 1 × $45"
}

// ============================================================
// RELATIONS
// ============================================================

export const bookingOptionsRelations = relations(bookingOptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bookingOptions.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [bookingOptions.tourId],
    references: [tours.id],
  }),
  scheduleAvailability: many(scheduleOptionAvailability),
  waitlistEntries: many(waitlistEntries),
}));

export const scheduleOptionAvailabilityRelations = relations(scheduleOptionAvailability, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleOptionAvailability.scheduleId],
    references: [schedules.id],
  }),
  bookingOption: one(bookingOptions, {
    fields: [scheduleOptionAvailability.bookingOptionId],
    references: [bookingOptions.id],
  }),
}));

export const waitlistEntriesRelations = relations(waitlistEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [waitlistEntries.organizationId],
    references: [organizations.id],
  }),
  schedule: one(schedules, {
    fields: [waitlistEntries.scheduleId],
    references: [schedules.id],
  }),
  bookingOption: one(bookingOptions, {
    fields: [waitlistEntries.bookingOptionId],
    references: [bookingOptions.id],
  }),
  customer: one(customers, {
    fields: [waitlistEntries.customerId],
    references: [customers.id],
  }),
  convertedBooking: one(bookings, {
    fields: [waitlistEntries.convertedBookingId],
    references: [bookings.id],
  }),
}));

// ============================================================
// EXPORTED TYPES
// ============================================================

export type BookingOption = typeof bookingOptions.$inferSelect;
export type NewBookingOption = typeof bookingOptions.$inferInsert;

export type ScheduleOptionAvailability = typeof scheduleOptionAvailability.$inferSelect;
export type NewScheduleOptionAvailability = typeof scheduleOptionAvailability.$inferInsert;

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type NewWaitlistEntry = typeof waitlistEntries.$inferInsert;
