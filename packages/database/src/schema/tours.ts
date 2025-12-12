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

// Relations
export const toursRelations = relations(tours, ({ one }) => ({
  organization: one(organizations, {
    fields: [tours.organizationId],
    references: [organizations.id],
  }),
}));

// Types
export type TourStatus = "draft" | "active" | "paused" | "archived";

export type Tour = typeof tours.$inferSelect;
export type NewTour = typeof tours.$inferInsert;
