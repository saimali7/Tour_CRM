import { pgTable, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { products } from "./products";

// ==========================================
// JSONB Type Interfaces
// ==========================================

export interface ServicePricingTier {
  name: string;
  price: number;
}

export interface ServiceTransferConfig {
  pickupRequired: boolean;
  dropoffRequired: boolean;
  locations: Array<{
    type: "airport" | "hotel" | "address";
    name: string;
    address?: string;
  }>;
}

export interface ServiceRentalConfig {
  minDuration: number;
  maxDuration: number;
  unit: "hour" | "day";
}

// ==========================================
// Services Table
// ==========================================

// Services - 1:1 extension table for products with type='service'
export const services = pgTable("services", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Parent product reference (1:1)
  productId: text("product_id")
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Service Classification
  serviceType: text("service_type").$type<ServiceType>().notNull(),

  // Pricing Model
  pricingModel: text("pricing_model").$type<ServicePricingModel>().notNull(),

  // Pricing tiers for variable pricing (e.g., vehicle types)
  pricingTiers: jsonb("pricing_tiers").$type<ServicePricingTier[]>(),

  // Availability Model
  availabilityType: text("availability_type").$type<ServiceAvailabilityType>().notNull().default("always"),

  // Booking Constraints
  isStandalone: boolean("is_standalone").default(true), // Can book without a tour
  isAddon: boolean("is_addon").default(true), // Can attach to tour booking
  requiresApproval: boolean("requires_approval").default(false),

  // Duration (if applicable, in minutes)
  duration: integer("duration"), // nullable

  // For Transfers - JSON config
  transferConfig: jsonb("transfer_config").$type<ServiceTransferConfig>(),

  // For Rentals - JSON config
  rentalConfig: jsonb("rental_config").$type<ServiceRentalConfig>(),

  // For Add-ons: Which products can this attach to?
  applicableToProducts: jsonb("applicable_to_products").$type<string[]>().default([]), // empty = all, or specific product IDs
  applicableToTypes: jsonb("applicable_to_types").$type<string[]>().default([]), // ['tour'] = only tours

  // Capacity (if limited)
  maxQuantity: integer("max_quantity"), // null = unlimited
  maxPerBooking: integer("max_per_booking").default(10),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("services_org_idx").on(table.organizationId),
  productIdx: index("services_product_idx").on(table.productId),
  serviceTypeIdx: index("services_type_idx").on(table.organizationId, table.serviceType),
  availabilityTypeIdx: index("services_availability_type_idx").on(table.availabilityType),
}));

// ==========================================
// Relations
// ==========================================

export const servicesRelations = relations(services, ({ one }) => ({
  organization: one(organizations, {
    fields: [services.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [services.productId],
    references: [products.id],
  }),
}));

// ==========================================
// Types
// ==========================================

export type ServiceType = "transfer" | "addon" | "rental" | "package" | "custom";
export type ServicePricingModel = "flat" | "per_person" | "per_hour" | "per_day" | "per_vehicle" | "custom";
export type ServiceAvailabilityType = "always" | "scheduled" | "on_request";

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
