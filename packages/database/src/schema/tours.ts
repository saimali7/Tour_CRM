import { pgTable, text, timestamp, integer, boolean, jsonb, numeric, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Tours - Tour products (org-scoped)
export const tours = pgTable("tours", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Basic info
  name: text("name").notNull(),
  slug: text("slug").notNull(), // URL-friendly identifier
  description: text("description"),
  shortDescription: text("short_description"),

  // Duration
  durationMinutes: integer("duration_minutes").notNull(),

  // Capacity
  minParticipants: integer("min_participants").default(1),
  maxParticipants: integer("max_participants").notNull(),

  // Pricing (base price, can be overridden per schedule)
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),

  // Location
  meetingPoint: text("meeting_point"),
  meetingPointDetails: text("meeting_point_details"),
  meetingPointLat: numeric("meeting_point_lat", { precision: 10, scale: 7 }),
  meetingPointLng: numeric("meeting_point_lng", { precision: 10, scale: 7 }),

  // Media
  coverImageUrl: text("cover_image_url"),
  images: jsonb("images").$type<string[]>().default([]),

  // Categorization
  category: text("category"),
  tags: jsonb("tags").$type<string[]>().default([]),

  // What's included/excluded
  includes: jsonb("includes").$type<string[]>().default([]),
  excludes: jsonb("excludes").$type<string[]>().default([]),

  // Requirements
  requirements: jsonb("requirements").$type<string[]>().default([]),
  accessibility: text("accessibility"),

  // Cancellation policy
  cancellationPolicy: text("cancellation_policy"),
  cancellationHours: integer("cancellation_hours").default(24),

  // Booking window settings (per-tour override)
  minimumNoticeHours: integer("minimum_notice_hours").default(2),
  maximumAdvanceDays: integer("maximum_advance_days").default(90),
  allowSameDayBooking: boolean("allow_same_day_booking").default(true),
  sameDayCutoffTime: text("same_day_cutoff_time"), // e.g., "12:00" in 24h format

  // Deposit settings
  depositEnabled: boolean("deposit_enabled").default(false),
  depositType: text("deposit_type").$type<"percentage" | "fixed">().default("percentage"),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }), // Percentage (0-100) or fixed amount
  balanceDueDays: integer("balance_due_days").default(0), // Days before tour when balance is due (0 = at booking)

  // Status
  status: text("status").$type<TourStatus>().notNull().default("draft"),
  isPublic: boolean("is_public").default(false), // Visible on booking website

  // SEO (for public booking site)
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => ({
  // Slug is unique per organization
  slugOrgUnique: unique().on(table.organizationId, table.slug),
  orgIdx: index("tours_org_idx").on(table.organizationId),
  statusIdx: index("tours_status_idx").on(table.status),
  publicIdx: index("tours_public_idx").on(table.isPublic),
}));

// Tour Pricing Tiers - Different price categories (Adult, Child, Senior, etc.)
export const tourPricingTiers = pgTable("tour_pricing_tiers", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Tier info
  name: text("name").notNull(), // e.g., "adult", "child", "senior", "infant"
  label: text("label").notNull(), // Display label, e.g., "Adult (13+)", "Child (3-12)"
  description: text("description"),

  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),

  // Age range (optional)
  minAge: integer("min_age"),
  maxAge: integer("max_age"),

  // Configuration
  isDefault: boolean("is_default").default(false), // Show as primary price
  countTowardsCapacity: boolean("counts_towards_capacity").default(true), // e.g., infants might not count
  minQuantity: integer("min_quantity").default(0),
  maxQuantity: integer("max_quantity"), // null = unlimited (up to capacity)

  // Display
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tourIdx: index("pricing_tiers_tour_idx").on(table.tourId),
  orgIdx: index("pricing_tiers_org_idx").on(table.organizationId),
  nameUnique: unique().on(table.tourId, table.name), // Name unique per tour
}));

// Tour Variants - Different versions of a tour (e.g., Morning/Evening, Private/Group, Language)
export const tourVariants = pgTable("tour_variants", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour reference
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Variant info
  name: text("name").notNull(), // e.g., "morning", "evening", "private", "spanish"
  label: text("label").notNull(), // Display label, e.g., "Morning Tour", "Private Experience"
  description: text("description"),

  // Pricing (modifier or absolute)
  priceModifierType: text("price_modifier_type").$type<"absolute" | "percentage" | "fixed_add">().default("absolute"),
  priceModifier: numeric("price_modifier", { precision: 10, scale: 2 }), // The modifier value
  // If absolute: this is the full price
  // If percentage: multiply base price by (100 + modifier)%
  // If fixed_add: add this amount to base price

  // Duration override (optional)
  durationMinutes: integer("duration_minutes"), // null = use tour default

  // Capacity override (optional)
  maxParticipants: integer("max_participants"), // null = use tour default
  minParticipants: integer("min_participants"), // null = use tour default

  // Schedule constraints
  availableDays: jsonb("available_days").$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]), // 0=Sunday, 6=Saturday
  defaultStartTime: text("default_start_time"), // e.g., "09:00" - default start time for this variant

  // Display
  sortOrder: integer("sort_order").default(0),
  isDefault: boolean("is_default").default(false), // Primary variant
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tourIdx: index("variants_tour_idx").on(table.tourId),
  orgIdx: index("variants_org_idx").on(table.organizationId),
  nameUnique: unique().on(table.tourId, table.name), // Name unique per tour
}));

// Relations
export const toursRelations = relations(tours, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tours.organizationId],
    references: [organizations.id],
  }),
  pricingTiers: many(tourPricingTiers),
  variants: many(tourVariants),
}));

export const tourPricingTiersRelations = relations(tourPricingTiers, ({ one }) => ({
  tour: one(tours, {
    fields: [tourPricingTiers.tourId],
    references: [tours.id],
  }),
  organization: one(organizations, {
    fields: [tourPricingTiers.organizationId],
    references: [organizations.id],
  }),
}));

export const tourVariantsRelations = relations(tourVariants, ({ one }) => ({
  tour: one(tours, {
    fields: [tourVariants.tourId],
    references: [tours.id],
  }),
  organization: one(organizations, {
    fields: [tourVariants.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type TourStatus = "draft" | "active" | "paused" | "archived";
export type PriceModifierType = "absolute" | "percentage" | "fixed_add";

export type Tour = typeof tours.$inferSelect;
export type NewTour = typeof tours.$inferInsert;

export type TourPricingTier = typeof tourPricingTiers.$inferSelect;
export type NewTourPricingTier = typeof tourPricingTiers.$inferInsert;

export type TourVariant = typeof tourVariants.$inferSelect;
export type NewTourVariant = typeof tourVariants.$inferInsert;
