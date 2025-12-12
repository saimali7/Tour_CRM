import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { users } from "./users";

// Guides - Tour guides (org-scoped, optionally linked to a user)
export const guides = pgTable("guides", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Link to user (optional - guide may or may not have platform access)
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

  // Profile
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),

  // Bio (for public display)
  bio: text("bio"),
  shortBio: text("short_bio"),

  // Languages spoken
  languages: jsonb("languages").$type<string[]>().default(["en"]),

  // Certifications/qualifications
  certifications: jsonb("certifications").$type<string[]>().default([]),

  // Availability preferences
  availabilityNotes: text("availability_notes"),

  // Emergency contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),

  // Status
  status: text("status").$type<GuideStatus>().notNull().default("active"),
  isPublic: boolean("is_public").default(false), // Show on booking website

  // Notes (internal)
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("guides_org_idx").on(table.organizationId),
  userIdx: index("guides_user_idx").on(table.userId),
  statusIdx: index("guides_status_idx").on(table.status),
}));

// Relations
export const guidesRelations = relations(guides, ({ one }) => ({
  organization: one(organizations, {
    fields: [guides.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [guides.userId],
    references: [users.id],
  }),
}));

// Types
export type GuideStatus = "active" | "inactive" | "on_leave";

export type Guide = typeof guides.$inferSelect;
export type NewGuide = typeof guides.$inferInsert;
