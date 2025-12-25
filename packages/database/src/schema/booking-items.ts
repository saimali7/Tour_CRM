import { pgTable, text, timestamp, integer, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { bookings } from "./bookings";
import { products, type ProductType } from "./products";
import { schedules } from "./schedules";

// ==========================================
// Booking Items - Line items within a booking
// ==========================================

// Booking items - Individual line items within a booking (enables multi-product bookings)
export const bookingItems = pgTable("booking_items", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking this item belongs to
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // ==========================================
  // Product Reference (what was booked)
  // ==========================================

  // Product reference
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),

  // Product type (denormalized for fast queries)
  productType: text("product_type").$type<ProductType>().notNull(),

  // Product name snapshot (at booking time)
  productName: text("product_name").notNull(),

  // ==========================================
  // Schedule Reference (for tours)
  // ==========================================

  // For tours: link to specific schedule (optional, for scheduled items)
  scheduleId: text("schedule_id")
    .references(() => schedules.id, { onDelete: "restrict" }),

  // ==========================================
  // Quantities
  // ==========================================

  // Base quantity
  quantity: integer("quantity").notNull().default(1),

  // Participants (for per-person items like tours)
  participants: integer("participants"),

  // ==========================================
  // Pricing (snapshot at booking time)
  // ==========================================

  // Unit price at time of booking
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),

  // Subtotal before discounts
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),

  // Discount amount
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),

  // Final total price
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),

  // ==========================================
  // Status
  // ==========================================

  // Item status
  status: text("status").$type<BookingItemStatus>().notNull().default("pending"),

  // Fulfillment tracking
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),

  // ==========================================
  // Type-Specific Details (JSONB)
  // ==========================================

  // Type-specific metadata
  metadata: jsonb("metadata").$type<BookingItemMetadata>().default({}),
  // For transfers: { pickupLocation, dropoffLocation, pickupTime, flightNumber }
  // For rentals: { startTime, endTime, equipmentId }
  // For add-ons: { notes }

  // ==========================================
  // Notes
  // ==========================================

  // Internal notes (not visible to customer)
  internalNotes: text("internal_notes"),

  // ==========================================
  // Timestamps
  // ==========================================

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Common lookup patterns
  bookingIdx: index("booking_items_booking_idx").on(table.bookingId),
  productIdx: index("booking_items_product_idx").on(table.productId),
  scheduleIdx: index("booking_items_schedule_idx").on(table.scheduleId),
  // Organization + status for admin queries
  orgStatusIdx: index("booking_items_org_status_idx").on(table.organizationId, table.status),
}));

// ==========================================
// Relations
// ==========================================

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookingItems.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [bookingItems.bookingId],
    references: [bookings.id],
  }),
  product: one(products, {
    fields: [bookingItems.productId],
    references: [products.id],
  }),
  schedule: one(schedules, {
    fields: [bookingItems.scheduleId],
    references: [schedules.id],
  }),
}));

// Add the many relation to bookings (avoids circular dependency if defined here)
export const bookingsItemsRelations = relations(bookings, ({ many }) => ({
  items: many(bookingItems),
}));

// Add the many relation to products (avoids circular dependency if defined here)
export const productsBookingItemsRelations = relations(products, ({ many }) => ({
  bookingItems: many(bookingItems),
}));

// ==========================================
// TypeScript Interfaces for Metadata
// ==========================================

// Transfer-specific metadata
export interface TransferMetadata {
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: string; // ISO timestamp or time string
  flightNumber?: string;
  vehicleType?: string;
  notes?: string;
}

// Rental-specific metadata
export interface RentalMetadata {
  startTime?: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  equipmentId?: string;
  size?: string;
  condition?: string;
  notes?: string;
}

// Add-on-specific metadata
export interface AddOnMetadata {
  notes?: string;
  additionalInfo?: string;
}

// Generic metadata (supports all types)
export type BookingItemMetadata =
  | TransferMetadata
  | RentalMetadata
  | AddOnMetadata
  | Record<string, unknown>;

// ==========================================
// Type Exports
// ==========================================

// ProductType is imported from ./products
export type BookingItemStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export type BookingItem = typeof bookingItems.$inferSelect;
export type NewBookingItem = typeof bookingItems.$inferInsert;
