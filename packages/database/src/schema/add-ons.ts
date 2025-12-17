import { pgTable, text, timestamp, integer, numeric, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { bookings } from "./bookings";

// ==========================================
// Add-On Products
// ==========================================

// Add-on products - Extra items that can be purchased with bookings
export const addOnProducts = pgTable("add_on_products", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),

  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),

  // Type
  type: text("type").$type<AddOnType>().notNull().default("per_booking"),
  // per_booking = one per booking (e.g., hotel pickup)
  // per_person = charged per participant (e.g., lunch upgrade)
  // quantity = any quantity (e.g., photos, merchandise)

  // Quantity limits (for type = "quantity")
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity"), // null = unlimited

  // Inventory tracking (optional)
  trackInventory: boolean("track_inventory").default(false),
  inventoryCount: integer("inventory_count"),

  // Media
  imageUrl: text("image_url"),

  // Categorization
  category: text("category"), // e.g., "Transport", "Food", "Photos", "Equipment"

  // Configuration
  requiresInfo: boolean("requires_info").default(false), // Needs additional info from customer
  infoPrompt: text("info_prompt"), // What info to collect (e.g., "Hotel name and room number")

  // Status
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("add_on_products_org_idx").on(table.organizationId),
  activeIdx: index("add_on_products_active_idx").on(table.isActive),
  categoryIdx: index("add_on_products_category_idx").on(table.category),
}));

// Tour add-ons - Which add-ons are available for which tours
export const tourAddOns = pgTable("tour_add_ons", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Tour
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Add-on product
  addOnProductId: text("add_on_product_id")
    .notNull()
    .references(() => addOnProducts.id, { onDelete: "cascade" }),

  // Tour-specific pricing (optional override)
  priceOverride: numeric("price_override", { precision: 10, scale: 2 }),

  // Configuration
  isRequired: boolean("is_required").default(false), // Must be purchased
  isRecommended: boolean("is_recommended").default(false), // Highlighted in UI
  sortOrder: integer("sort_order").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tourIdx: index("tour_add_ons_tour_idx").on(table.tourId),
  addOnIdx: index("tour_add_ons_add_on_idx").on(table.addOnProductId),
  tourAddOnUnique: unique().on(table.tourId, table.addOnProductId),
}));

// Booking add-ons - Purchased add-ons for a specific booking
export const bookingAddOns = pgTable("booking_add_ons", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Add-on product
  addOnProductId: text("add_on_product_id")
    .notNull()
    .references(() => addOnProducts.id, { onDelete: "restrict" }),

  // Quantity and pricing
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(), // Price at time of purchase
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),

  // Additional info (if requiresInfo)
  additionalInfo: text("additional_info"),

  // Status
  status: text("status").$type<BookingAddOnStatus>().notNull().default("confirmed"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bookingIdx: index("booking_add_ons_booking_idx").on(table.bookingId),
  addOnIdx: index("booking_add_ons_add_on_idx").on(table.addOnProductId),
}));

// ==========================================
// Gift Vouchers
// ==========================================

// Gift vouchers - Purchasable vouchers that can be redeemed
export const giftVouchers = pgTable("gift_vouchers", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Voucher code
  code: text("code").notNull(), // Unique per org

  // Value
  type: text("type").$type<VoucherType>().notNull().default("monetary"),
  // monetary = fixed dollar value
  // tour = specific tour
  // percentage = percentage discount

  monetaryValue: numeric("monetary_value", { precision: 10, scale: 2 }), // For monetary type
  percentageValue: integer("percentage_value"), // For percentage type (0-100)
  tourId: text("tour_id").references(() => tours.id, { onDelete: "set null" }), // For tour type

  // Remaining balance (for partial redemptions on monetary type)
  remainingValue: numeric("remaining_value", { precision: 10, scale: 2 }),

  // Purchaser info
  purchaserName: text("purchaser_name"),
  purchaserEmail: text("purchaser_email"),
  purchaserPhone: text("purchaser_phone"),

  // Recipient info
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  personalMessage: text("personal_message"),

  // Delivery
  deliveryMethod: text("delivery_method").$type<VoucherDeliveryMethod>().notNull().default("email"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),

  // Purchase info
  purchaseAmount: numeric("purchase_amount", { precision: 10, scale: 2 }), // What was paid
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Validity
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = never expires

  // Redemption
  status: text("status").$type<VoucherStatus>().notNull().default("active"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedBookingId: text("redeemed_booking_id").references(() => bookings.id, { onDelete: "set null" }),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  codeOrgUnique: unique().on(table.organizationId, table.code),
  orgIdx: index("gift_vouchers_org_idx").on(table.organizationId),
  codeIdx: index("gift_vouchers_code_idx").on(table.code),
  statusIdx: index("gift_vouchers_status_idx").on(table.status),
  expiresIdx: index("gift_vouchers_expires_idx").on(table.expiresAt),
  recipientEmailIdx: index("gift_vouchers_recipient_email_idx").on(table.recipientEmail),
}));

// Voucher redemption history - Track partial redemptions
export const voucherRedemptions = pgTable("voucher_redemptions", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Voucher
  voucherId: text("voucher_id")
    .notNull()
    .references(() => giftVouchers.id, { onDelete: "cascade" }),

  // Booking
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Redemption amount
  amountRedeemed: numeric("amount_redeemed", { precision: 10, scale: 2 }).notNull(),
  remainingAfter: numeric("remaining_after", { precision: 10, scale: 2 }).notNull(),

  // Timestamps
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  voucherIdx: index("voucher_redemptions_voucher_idx").on(table.voucherId),
  bookingIdx: index("voucher_redemptions_booking_idx").on(table.bookingId),
}));

// ==========================================
// Relations
// ==========================================

export const addOnProductsRelations = relations(addOnProducts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [addOnProducts.organizationId],
    references: [organizations.id],
  }),
  tourAddOns: many(tourAddOns),
  bookingAddOns: many(bookingAddOns),
}));

export const tourAddOnsRelations = relations(tourAddOns, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourAddOns.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourAddOns.tourId],
    references: [tours.id],
  }),
  addOnProduct: one(addOnProducts, {
    fields: [tourAddOns.addOnProductId],
    references: [addOnProducts.id],
  }),
}));

export const bookingAddOnsRelations = relations(bookingAddOns, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookingAddOns.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [bookingAddOns.bookingId],
    references: [bookings.id],
  }),
  addOnProduct: one(addOnProducts, {
    fields: [bookingAddOns.addOnProductId],
    references: [addOnProducts.id],
  }),
}));

export const giftVouchersRelations = relations(giftVouchers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [giftVouchers.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [giftVouchers.tourId],
    references: [tours.id],
  }),
  redeemedBooking: one(bookings, {
    fields: [giftVouchers.redeemedBookingId],
    references: [bookings.id],
  }),
  redemptions: many(voucherRedemptions),
}));

export const voucherRedemptionsRelations = relations(voucherRedemptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [voucherRedemptions.organizationId],
    references: [organizations.id],
  }),
  voucher: one(giftVouchers, {
    fields: [voucherRedemptions.voucherId],
    references: [giftVouchers.id],
  }),
  booking: one(bookings, {
    fields: [voucherRedemptions.bookingId],
    references: [bookings.id],
  }),
}));

// ==========================================
// Types
// ==========================================

export type AddOnType = "per_booking" | "per_person" | "quantity";
export type BookingAddOnStatus = "confirmed" | "cancelled" | "refunded";
export type VoucherType = "monetary" | "tour" | "percentage";
export type VoucherDeliveryMethod = "email" | "print" | "sms";
export type VoucherStatus = "active" | "redeemed" | "expired" | "cancelled" | "partially_redeemed";

export type AddOnProduct = typeof addOnProducts.$inferSelect;
export type NewAddOnProduct = typeof addOnProducts.$inferInsert;

export type TourAddOn = typeof tourAddOns.$inferSelect;
export type NewTourAddOn = typeof tourAddOns.$inferInsert;

export type BookingAddOn = typeof bookingAddOns.$inferSelect;
export type NewBookingAddOn = typeof bookingAddOns.$inferInsert;

export type GiftVoucher = typeof giftVouchers.$inferSelect;
export type NewGiftVoucher = typeof giftVouchers.$inferInsert;

export type VoucherRedemption = typeof voucherRedemptions.$inferSelect;
export type NewVoucherRedemption = typeof voucherRedemptions.$inferInsert;
