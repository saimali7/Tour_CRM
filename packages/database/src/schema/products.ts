import { pgTable, text, timestamp, integer, numeric, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Products - Master catalog for all sellable items (org-scoped)
export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Type discriminator
  type: text("type").$type<ProductType>().notNull(),

  // Core Info
  name: text("name").notNull(),
  slug: text("slug").notNull(), // URL-friendly identifier
  description: text("description"),
  shortDescription: text("short_description"), // max 500 chars (enforced at validation layer)

  // Status
  status: text("status").$type<ProductStatus>().notNull().default("draft"),
  visibility: text("visibility").$type<ProductVisibility>().default("public"),

  // Pricing (base - can be overridden by type-specific tables)
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").default("AED"),
  pricingDisplay: text("pricing_display"), // e.g., "$89/person", "$45 flat"

  // Media
  featuredImage: text("featured_image"),
  gallery: jsonb("gallery").$type<string[]>().default([]),

  // SEO & Display
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  tags: text("tags").array().default([]),

  // Sorting & Organization
  sortOrder: integer("sort_order").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => ({
  // Slug is unique per organization
  slugOrgUnique: unique().on(table.organizationId, table.slug),
  // Indexes for common queries
  orgTypeStatusIdx: index("products_org_type_status_idx").on(table.organizationId, table.type, table.status),
  orgStatusSortIdx: index("products_org_status_sort_idx").on(table.organizationId, table.status, table.sortOrder),
  orgIdx: index("products_org_idx").on(table.organizationId),
}));

// Relations
export const productsRelations = relations(products, ({ one }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  // Note: tours relation is defined in tours.ts to avoid circular imports
  // Note: services relation is defined in services.ts to avoid circular imports
}));

// Types
export type ProductType = "tour" | "service" | "good";
export type ProductStatus = "draft" | "active" | "archived";
export type ProductVisibility = "public" | "private" | "unlisted";

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
