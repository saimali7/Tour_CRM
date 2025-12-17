import { pgTable, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { bookings } from "./bookings";

// Payment method types
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "check" | "other";

// Payments - Manual payment records for bookings (org-scoped)
export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Booking this payment is for
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "restrict" }),

  // Amount
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),

  // Payment method
  method: text("method").$type<PaymentMethod>().notNull(),

  // Reference (check number, transaction ID, etc.)
  reference: text("reference"),

  // Notes
  notes: text("notes"),

  // Actor info
  recordedBy: text("recorded_by").notNull(), // User ID who recorded the payment
  recordedByName: text("recorded_by_name"), // User name for display

  // Timestamps
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("payments_org_idx").on(table.organizationId),
  bookingIdx: index("payments_booking_idx").on(table.bookingId),
  orgBookingIdx: index("payments_org_booking_idx").on(table.organizationId, table.bookingId),
  recordedAtIdx: index("payments_recorded_at_idx").on(table.recordedAt),
}));

// Relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

// Add the many relation to bookings (avoids circular dependency if defined here)
export const bookingsPaymentsRelations = relations(bookings, ({ many }) => ({
  payments: many(payments),
}));

// Types
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
