import { pgTable, text, timestamp, integer, boolean, index, unique, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

/**
 * Pickup Addresses - Predefined pickup locations for tours (org-scoped)
 *
 * These are the locations where guests are picked up before tours.
 * Each pickup address belongs to a zone (e.g., "Marina", "Downtown", "Palm")
 * which is used for route optimization and guide assignment clustering.
 */
export const pickupAddresses = pgTable("pickup_addresses", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Location Info
  name: text("name").notNull(), // e.g., "Marriott Marina"
  shortName: text("short_name"), // e.g., "Marina Marriott" (for compact displays)
  address: text("address").notNull(), // Full street address
  zone: text("zone"), // Geographic zone for clustering: "Marina", "Downtown", "Palm", etc.

  // Coordinates (for distance calculation and map display)
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),

  // Operational Info
  /** Instructions for drivers/guides on how to complete pickup at this location */
  pickupInstructions: text("pickup_instructions"), // e.g., "Meet at main lobby"
  /** Average time in minutes to complete a pickup at this location */
  averagePickupMinutes: integer("average_pickup_minutes").default(5),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  /** Sort order for display in dropdowns and lists */
  sortOrder: integer("sort_order").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: name must be unique within an organization
  orgNameUnique: unique().on(table.organizationId, table.name),
  // Index for organization queries
  orgIdx: index("pickup_addresses_org_idx").on(table.organizationId),
  // Index for zone-based queries (clustering)
  orgZoneIdx: index("pickup_addresses_org_zone_idx").on(table.organizationId, table.zone),
  // Index for active status queries
  orgActiveIdx: index("pickup_addresses_org_active_idx").on(table.organizationId, table.isActive),
}));

// Relations - exported separately to avoid circular imports
export const pickupAddressesRelations = relations(pickupAddresses, ({ one }) => ({
  organization: one(organizations, {
    fields: [pickupAddresses.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type PickupAddress = typeof pickupAddresses.$inferSelect;
export type NewPickupAddress = typeof pickupAddresses.$inferInsert;
