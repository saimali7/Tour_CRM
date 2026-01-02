import { pgTable, text, timestamp, integer, numeric, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Pickup Zones - Geographic grouping for pickup locations (org-scoped)
export const pickupZones = pgTable("pickup_zones", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Zone details
  name: text("name").notNull(), // "Marina", "Downtown", "Palm Jumeirah"
  color: text("color").notNull(), // Hex color for map markers "#3B82F6"

  // Zone center coordinates for map display
  centerLat: numeric("center_lat", { precision: 10, scale: 7 }),
  centerLng: numeric("center_lng", { precision: 10, scale: 7 }),

  // Sort order for display
  sortOrder: integer("sort_order").notNull().default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("pickup_zones_org_idx").on(table.organizationId),
  orgNameUnique: unique("pickup_zones_org_name_unique").on(table.organizationId, table.name),
}));

// Zone Travel Times - Travel time matrix between pickup zones (org-scoped)
export const zoneTravelTimes = pgTable("zone_travel_times", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Zone references
  fromZoneId: text("from_zone_id")
    .notNull()
    .references(() => pickupZones.id, { onDelete: "cascade" }),
  toZoneId: text("to_zone_id")
    .notNull()
    .references(() => pickupZones.id, { onDelete: "cascade" }),

  // Average drive time in minutes
  estimatedMinutes: integer("estimated_minutes").notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("zone_travel_times_org_idx").on(table.organizationId),
  fromZoneIdx: index("zone_travel_times_from_zone_idx").on(table.fromZoneId),
  toZoneIdx: index("zone_travel_times_to_zone_idx").on(table.toZoneId),
  orgZonesUnique: unique("zone_travel_times_org_zones_unique").on(table.organizationId, table.fromZoneId, table.toZoneId),
}));

// Relations
export const pickupZonesRelations = relations(pickupZones, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pickupZones.organizationId],
    references: [organizations.id],
  }),
  // Travel times from this zone
  travelTimesFrom: many(zoneTravelTimes, { relationName: "fromZone" }),
  // Travel times to this zone
  travelTimesTo: many(zoneTravelTimes, { relationName: "toZone" }),
}));

export const zoneTravelTimesRelations = relations(zoneTravelTimes, ({ one }) => ({
  organization: one(organizations, {
    fields: [zoneTravelTimes.organizationId],
    references: [organizations.id],
  }),
  fromZone: one(pickupZones, {
    fields: [zoneTravelTimes.fromZoneId],
    references: [pickupZones.id],
    relationName: "fromZone",
  }),
  toZone: one(pickupZones, {
    fields: [zoneTravelTimes.toZoneId],
    references: [pickupZones.id],
    relationName: "toZone",
  }),
}));

// Types
export type PickupZone = typeof pickupZones.$inferSelect;
export type NewPickupZone = typeof pickupZones.$inferInsert;

export type ZoneTravelTime = typeof zoneTravelTimes.$inferSelect;
export type NewZoneTravelTime = typeof zoneTravelTimes.$inferInsert;
