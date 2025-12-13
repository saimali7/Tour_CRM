import { pgTable, text, timestamp, boolean, integer, numeric, index, unique, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { bookings } from "./bookings";
import { customers } from "./customers";

// ============================================
// Seasonal Pricing - Date-based price adjustments
// ============================================

export type AdjustmentType = "percentage" | "fixed";
export type AppliesTo = "all" | "specific";

export const seasonalPricing = pgTable("seasonal_pricing", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Season info
  name: text("name").notNull(), // e.g., "Peak Summer", "Holiday Week"
  description: text("description"),

  // Date range
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),

  // Adjustment
  adjustmentType: text("adjustment_type").$type<AdjustmentType>().notNull(),
  adjustmentValue: numeric("adjustment_value", { precision: 10, scale: 2 }).notNull(), // 20.00 for 20% or $20

  // Applicability
  appliesTo: text("applies_to").$type<AppliesTo>().notNull().default("all"),
  tourIds: text("tour_ids").array(), // For specific tours, nullable

  // Priority for overlapping seasons (higher number = higher priority)
  priority: integer("priority").default(0),

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("seasonal_pricing_org_idx").on(table.organizationId),
  dateIdx: index("seasonal_pricing_date_idx").on(table.startDate, table.endDate),
  activeIdx: index("seasonal_pricing_active_idx").on(table.isActive),
}));

// ============================================
// Promo Codes - Discount codes with limits
// ============================================

export type DiscountType = "percentage" | "fixed";

export const promoCodes = pgTable("promo_codes", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Code (unique per org, uppercase)
  code: text("code").notNull(),
  description: text("description"),

  // Discount
  discountType: text("discount_type").$type<DiscountType>().notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(), // 20.00 for 20% or $20

  // Validity period
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),

  // Usage limits
  maxUses: integer("max_uses"), // Total limit (null = unlimited)
  maxUsesPerCustomer: integer("max_uses_per_customer"), // Per customer limit (null = unlimited)
  currentUses: integer("current_uses").default(0), // Track total uses

  // Minimum booking requirement
  minBookingAmount: numeric("min_booking_amount", { precision: 10, scale: 2 }),

  // Applicability
  appliesTo: text("applies_to").$type<AppliesTo>().notNull().default("all"),
  tourIds: text("tour_ids").array(), // For specific tours, nullable

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("promo_codes_org_idx").on(table.organizationId),
  codeIdx: index("promo_codes_code_idx").on(table.code),
  activeIdx: index("promo_codes_active_idx").on(table.isActive),
  validityIdx: index("promo_codes_validity_idx").on(table.validFrom, table.validUntil),
  // Unique code per organization (case-insensitive)
  orgCodeUnique: unique().on(table.organizationId, table.code),
}));

// ============================================
// Promo Code Usage - Tracking
// ============================================

export const promoCodeUsage = pgTable("promo_code_usage", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // References
  promoCodeId: text("promo_code_id")
    .notNull()
    .references(() => promoCodes.id, { onDelete: "cascade" }),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  // Discount applied
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull(),
  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),

  // Timestamp
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("promo_code_usage_org_idx").on(table.organizationId),
  promoCodeIdx: index("promo_code_usage_promo_code_idx").on(table.promoCodeId),
  bookingIdx: index("promo_code_usage_booking_idx").on(table.bookingId),
  customerIdx: index("promo_code_usage_customer_idx").on(table.customerId),
  usedAtIdx: index("promo_code_usage_used_at_idx").on(table.usedAt),
}));

// ============================================
// Group Discounts - Threshold-based discounts
// ============================================

export const groupDiscounts = pgTable("group_discounts", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Discount info
  name: text("name").notNull(), // e.g., "Group of 5+", "Family of 4"
  description: text("description"),

  // Participant thresholds
  minParticipants: integer("min_participants").notNull(), // Threshold to trigger discount
  maxParticipants: integer("max_participants"), // Upper bound (null = no limit)

  // Discount
  discountType: text("discount_type").$type<DiscountType>().notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(), // 10.00 for 10% or $10 per person

  // Applicability
  appliesTo: text("applies_to").$type<AppliesTo>().notNull().default("all"),
  tourIds: text("tour_ids").array(), // For specific tours, nullable

  // Priority for overlapping thresholds (higher number = higher priority)
  priority: integer("priority").default(0),

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("group_discounts_org_idx").on(table.organizationId),
  thresholdIdx: index("group_discounts_threshold_idx").on(table.minParticipants, table.maxParticipants),
  activeIdx: index("group_discounts_active_idx").on(table.isActive),
}));

// ============================================
// Relations
// ============================================

export const seasonalPricingRelations = relations(seasonalPricing, ({ one }) => ({
  organization: one(organizations, {
    fields: [seasonalPricing.organizationId],
    references: [organizations.id],
  }),
}));

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  organization: one(organizations, {
    fields: [promoCodes.organizationId],
    references: [organizations.id],
  }),
}));

export const promoCodeUsageRelations = relations(promoCodeUsage, ({ one }) => ({
  organization: one(organizations, {
    fields: [promoCodeUsage.organizationId],
    references: [organizations.id],
  }),
  promoCode: one(promoCodes, {
    fields: [promoCodeUsage.promoCodeId],
    references: [promoCodes.id],
  }),
  booking: one(bookings, {
    fields: [promoCodeUsage.bookingId],
    references: [bookings.id],
  }),
  customer: one(customers, {
    fields: [promoCodeUsage.customerId],
    references: [customers.id],
  }),
}));

export const groupDiscountsRelations = relations(groupDiscounts, ({ one }) => ({
  organization: one(organizations, {
    fields: [groupDiscounts.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================
// Types
// ============================================

export type SeasonalPricing = typeof seasonalPricing.$inferSelect;
export type NewSeasonalPricing = typeof seasonalPricing.$inferInsert;

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type NewPromoCodeUsage = typeof promoCodeUsage.$inferInsert;

export type GroupDiscount = typeof groupDiscounts.$inferSelect;
export type NewGroupDiscount = typeof groupDiscounts.$inferInsert;
