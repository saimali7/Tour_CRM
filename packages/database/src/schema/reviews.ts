import { pgTable, text, timestamp, integer, boolean, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { bookings } from "./bookings";
import { customers } from "./customers";
import { tours } from "./tours";
import { guides } from "./guides";

// Reviews - Customer feedback after tour completion (org-scoped)
export const reviews = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Linked entities
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),
  guideId: text("guide_id")
    .references(() => guides.id, { onDelete: "set null" }),

  // Ratings (1-5 scale)
  overallRating: integer("overall_rating").notNull(),
  tourRating: integer("tour_rating"),
  guideRating: integer("guide_rating"),
  valueRating: integer("value_rating"),

  // Review content
  comment: text("comment"),
  highlightsLiked: text("highlights_liked"), // What they enjoyed most
  improvementSuggestions: text("improvement_suggestions"),

  // Visibility
  isPublic: boolean("is_public").notNull().default(false), // Can be used as testimonial
  isVerified: boolean("is_verified").notNull().default(true), // Verified purchase

  // External review tracking
  platform: text("platform").$type<ReviewPlatform>().notNull().default("internal"),
  externalReviewUrl: text("external_review_url"),
  externalReviewPosted: boolean("external_review_posted").default(false),

  // Response from business
  responseText: text("response_text"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  respondedBy: text("responded_by"),

  // Status
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),

  // Request tracking
  requestSentAt: timestamp("request_sent_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One review per booking
  bookingUnique: unique().on(table.bookingId),
  orgIdx: index("reviews_org_idx").on(table.organizationId),
  customerIdx: index("reviews_customer_idx").on(table.customerId),
  tourIdx: index("reviews_tour_idx").on(table.tourId),
  guideIdx: index("reviews_guide_idx").on(table.guideId),
  statusIdx: index("reviews_status_idx").on(table.status),
  ratingIdx: index("reviews_rating_idx").on(table.overallRating),
  publicIdx: index("reviews_public_idx").on(table.organizationId, table.isPublic),
}));

// Relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  organization: one(organizations, {
    fields: [reviews.organizationId],
    references: [organizations.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  tour: one(tours, {
    fields: [reviews.tourId],
    references: [tours.id],
  }),
  guide: one(guides, {
    fields: [reviews.guideId],
    references: [guides.id],
  }),
}));

// Types
export type ReviewPlatform = "internal" | "tripadvisor" | "google" | "facebook" | "viator" | "other";
export type ReviewStatus = "pending" | "submitted" | "approved" | "rejected" | "flagged";

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
