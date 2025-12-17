import { pgTable, text, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Customers - People who book tours (org-scoped)
export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Contact info (email OR phone required - enforced at application level)
  email: text("email"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  contactPreference: text("contact_preference").$type<ContactPreference>().default("email"),

  // Address (optional)
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),

  // Preferences
  language: text("language").default("en"),
  currency: text("currency").default("USD"),

  // Notes and metadata
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  // Source tracking
  source: text("source").$type<CustomerSource>().default("manual"),
  sourceDetails: text("source_details"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Email is unique per organization when present (same person can be customer of multiple orgs)
  // Note: Unique constraint with nullable columns only considers non-null values
  emailOrgUnique: unique().on(table.organizationId, table.email),
  orgIdx: index("customers_org_idx").on(table.organizationId),
  emailIdx: index("customers_email_idx").on(table.email),
  nameIdx: index("customers_name_idx").on(table.firstName, table.lastName),
}));

// Relations
export const customersRelations = relations(customers, ({ one }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type CustomerSource = "manual" | "website" | "api" | "import" | "referral";
export type ContactPreference = "email" | "phone" | "both";

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
