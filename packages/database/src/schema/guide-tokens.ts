import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { guides } from "./guides";

// Guide Tokens - Magic link tokens for guide portal access (org-scoped)
export const guideTokens = pgTable("guide_tokens", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Guide reference
  guideId: text("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),

  // Token (hashed for security)
  token: text("token").notNull().unique(),

  // Expiration
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  // Usage tracking
  usedAt: timestamp("used_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),

  // IP and User Agent for security
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("guide_tokens_org_idx").on(table.organizationId),
  guideIdx: index("guide_tokens_guide_idx").on(table.guideId),
  tokenIdx: index("guide_tokens_token_idx").on(table.token),
  expiresIdx: index("guide_tokens_expires_idx").on(table.expiresAt),
}));

// Relations
export const guideTokensRelations = relations(guideTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [guideTokens.organizationId],
    references: [organizations.id],
  }),
  guide: one(guides, {
    fields: [guideTokens.guideId],
    references: [guides.id],
  }),
}));

// Types
export type GuideToken = typeof guideTokens.$inferSelect;
export type NewGuideToken = typeof guideTokens.$inferInsert;
