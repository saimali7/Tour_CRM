import { pgTable, text, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";

// Users - Platform users (linked to Clerk)
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Clerk integration
  clerkId: text("clerk_id").notNull().unique(),

  // Profile
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),

  // Platform-level flags
  isSuperAdmin: boolean("is_super_admin").default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
}, (table) => ({
  clerkIdIdx: index("users_clerk_id_idx").on(table.clerkId),
  emailIdx: index("users_email_idx").on(table.email),
}));

// Organization Members - Links users to organizations with roles
export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey().$defaultFn(createId),

  // References
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Role within this organization
  role: text("role").$type<OrganizationRole>().notNull().default("support"),

  // Status
  status: text("status").$type<MemberStatus>().notNull().default("active"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgUserUnique: unique().on(table.organizationId, table.userId),
  orgIdx: index("org_members_org_idx").on(table.organizationId),
  userIdx: index("org_members_user_idx").on(table.userId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// Types
export type OrganizationRole = "owner" | "admin" | "manager" | "support" | "guide";
export type MemberStatus = "active" | "invited" | "suspended";

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
