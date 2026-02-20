import { pgTable, text, timestamp, integer, index, unique, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { bookings } from "./bookings";

export type CheckoutAttemptStatus =
  | "initiated"
  | "session_created"
  | "paid"
  | "failed"
  | "expired";

export const checkoutAttempts = pgTable("checkout_attempts", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  idempotencyKey: text("idempotency_key").notNull(),
  fingerprintHash: text("fingerprint_hash").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").$type<CheckoutAttemptStatus>().notNull().default("initiated"),
  lastError: text("last_error"),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("checkout_attempts_org_idx").on(table.organizationId),
  bookingIdx: index("checkout_attempts_booking_idx").on(table.bookingId),
  statusIdx: index("checkout_attempts_status_idx").on(table.status),
  orgStatusIdx: index("checkout_attempts_org_status_idx").on(table.organizationId, table.status),
  orgIdempotencyUnique: unique().on(table.organizationId, table.idempotencyKey),
  orgStripeSessionUnique: unique().on(table.organizationId, table.stripeSessionId),
}));

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey().$defaultFn(createId),
  eventId: text("event_id").notNull(),
  type: text("type").notNull(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  eventIdUnique: unique().on(table.eventId),
  typeIdx: index("stripe_webhook_events_type_idx").on(table.type),
  orgIdx: index("stripe_webhook_events_org_idx").on(table.organizationId),
  bookingIdx: index("stripe_webhook_events_booking_idx").on(table.bookingId),
  processedAtIdx: index("stripe_webhook_events_processed_at_idx").on(table.processedAt),
}));

export const checkoutAttemptsRelations = relations(checkoutAttempts, ({ one }) => ({
  organization: one(organizations, {
    fields: [checkoutAttempts.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [checkoutAttempts.bookingId],
    references: [bookings.id],
  }),
}));

export const stripeWebhookEventsRelations = relations(stripeWebhookEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [stripeWebhookEvents.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [stripeWebhookEvents.bookingId],
    references: [bookings.id],
  }),
}));

export type CheckoutAttempt = typeof checkoutAttempts.$inferSelect;
export type NewCheckoutAttempt = typeof checkoutAttempts.$inferInsert;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
