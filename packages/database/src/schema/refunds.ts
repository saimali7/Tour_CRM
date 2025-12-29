import { pgTable, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { bookings } from "./bookings";

// Refund status types
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";
export type RefundReason =
  | "customer_request"
  | "booking_cancelled"
  | "schedule_cancelled"
  | "duplicate"
  | "fraudulent"
  | "other";

// Refunds - Payment refund records (org-scoped)
export const refunds = pgTable("refunds", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking this refund is for
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "restrict" }),

  // Amount
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("AED"),

  // Status
  status: text("status").$type<RefundStatus>().notNull().default("pending"),

  // Reason
  reason: text("reason").$type<RefundReason>().notNull().default("customer_request"),
  reasonDetails: text("reason_details"),

  // Stripe integration
  stripeRefundId: text("stripe_refund_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeErrorMessage: text("stripe_error_message"),

  // Actor info
  processedBy: text("processed_by"), // User ID who initiated refund
  processedByName: text("processed_by_name"),

  // Internal notes
  internalNotes: text("internal_notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("refunds_org_idx").on(table.organizationId),
  bookingIdx: index("refunds_booking_idx").on(table.bookingId),
  statusIdx: index("refunds_status_idx").on(table.status),
  createdAtIdx: index("refunds_created_at_idx").on(table.createdAt),
}));

// Relations
export const refundsRelations = relations(refunds, ({ one }) => ({
  organization: one(organizations, {
    fields: [refunds.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [refunds.bookingId],
    references: [bookings.id],
  }),
}));

// Types
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
