import { pgTable, text, timestamp, jsonb, index, unique, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { bookings } from "./bookings";
import { tours } from "./tours";

// ============================================
// Communication Logs - Email/SMS history
// ============================================

export type CommunicationType = "email" | "sms";
export type CommunicationStatus = "pending" | "sent" | "delivered" | "failed" | "bounced" | "opened" | "clicked";

export const communicationLogs = pgTable("communication_logs", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Recipient
  customerId: text("customer_id")
    .references(() => customers.id, { onDelete: "set null" }),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  recipientName: text("recipient_name"),

  // Related entities (optional)
  bookingId: text("booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),
  tourId: text("tour_id")
    .references(() => tours.id, { onDelete: "set null" }),
  // scheduleId kept for migration, no FK constraint (schedules table removed)
  scheduleId: text("schedule_id"),

  // Communication details
  type: text("type").$type<CommunicationType>().notNull(),
  templateId: text("template_id"), // Reference to email_templates.id
  templateName: text("template_name"), // Snapshot of template name at send time

  // Content
  subject: text("subject"), // For emails
  content: text("content").notNull(), // Text content (or HTML for email)
  contentPlain: text("content_plain"), // Plain text version for email

  // Status tracking
  status: text("status").$type<CommunicationStatus>().notNull().default("pending"),
  statusDetails: text("status_details"),

  // Delivery tracking
  externalId: text("external_id"), // Resend ID / Twilio SID
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),

  // Metadata
  metadata: jsonb("metadata").$type<{
    trigger?: string; // What triggered this communication
    links?: Array<{ url: string; clicks: number }>; // Link tracking
    variables?: Record<string, string>; // Template variables used
    errorMessage?: string;
    webhookPayload?: Record<string, unknown>;
  }>().default({}),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("communication_logs_org_idx").on(table.organizationId),
  customerIdx: index("communication_logs_customer_idx").on(table.customerId),
  bookingIdx: index("communication_logs_booking_idx").on(table.bookingId),
  typeIdx: index("communication_logs_type_idx").on(table.type),
  statusIdx: index("communication_logs_status_idx").on(table.status),
  createdAtIdx: index("communication_logs_created_at_idx").on(table.createdAt),
  orgTypeCreatedIdx: index("communication_logs_org_type_created_idx").on(table.organizationId, table.type, table.createdAt),
  customerOrgIdx: index("comm_logs_customer_org_idx").on(table.customerId, table.organizationId),
}));

// ============================================
// Email Templates - Custom templates
// ============================================

export type EmailTemplateType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_modification"
  | "booking_cancellation"
  | "schedule_cancellation"
  | "review_request"
  | "abandoned_cart_1" // 15 min
  | "abandoned_cart_2" // 24h
  | "abandoned_cart_3" // 72h
  | "browse_abandonment"
  | "price_drop_alert"
  | "availability_alert"
  | "wishlist_digest"
  | "custom";

export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Template info
  name: text("name").notNull(),
  type: text("type").$type<EmailTemplateType>().notNull(),
  description: text("description"),

  // Content
  subject: text("subject").notNull(),
  contentHtml: text("content_html").notNull(),
  contentPlain: text("content_plain"),

  // Available variables for this template
  availableVariables: jsonb("available_variables").$type<string[]>().default([]),

  // Settings
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // System default template

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("email_templates_org_idx").on(table.organizationId),
  typeIdx: index("email_templates_type_idx").on(table.type),
  typeOrgUnique: unique().on(table.organizationId, table.type), // One template per type per org
}));

// ============================================
// SMS Templates
// ============================================

export type SmsTemplateType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancellation"
  | "abandoned_cart"
  | "availability_alert"
  | "custom";

export const smsTemplates = pgTable("sms_templates", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Template info
  name: text("name").notNull(),
  type: text("type").$type<SmsTemplateType>().notNull(),
  description: text("description"),

  // Content (max 160 chars recommended for single SMS)
  content: text("content").notNull(),

  // Available variables
  availableVariables: jsonb("available_variables").$type<string[]>().default([]),

  // Settings
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("sms_templates_org_idx").on(table.organizationId),
  typeIdx: index("sms_templates_type_idx").on(table.type),
  typeOrgUnique: unique().on(table.organizationId, table.type),
}));

// ============================================
// Abandoned Carts
// ============================================

export type AbandonedCartStatus = "active" | "recovered" | "expired" | "unsubscribed";
export type AbandonedCartStep = "tour_selected" | "date_selected" | "participants_added" | "customer_info" | "payment";

export const abandonedCarts = pgTable("abandoned_carts", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Customer (may or may not have an account)
  customerId: text("customer_id")
    .references(() => customers.id, { onDelete: "set null" }),
  email: text("email").notNull(), // Always captured
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),

  // Cart contents
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),
  // scheduleId kept for migration, no FK constraint (schedules table removed)
  scheduleId: text("schedule_id"),

  // Participants
  adultCount: integer("adult_count").default(1),
  childCount: integer("child_count").default(0),
  infantCount: integer("infant_count").default(0),

  // Pricing at time of cart
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),

  // Cart state
  lastStep: text("last_step").$type<AbandonedCartStep>().notNull(),
  status: text("status").$type<AbandonedCartStatus>().notNull().default("active"),

  // Recovery tracking
  recoveryToken: text("recovery_token").$defaultFn(() => createId()), // Unique token for recovery link
  emailsSent: integer("emails_sent").default(0),
  lastEmailSentAt: timestamp("last_email_sent_at", { withTimezone: true }),
  smsSent: boolean("sms_sent").default(false),

  // Recovery outcome
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  recoveredBookingId: text("recovered_booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),
  discountApplied: text("discount_applied"), // Promo code if any

  // Session info
  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),

  // Metadata
  metadata: jsonb("metadata").$type<{
    specialRequests?: string;
    selectedVariant?: string;
    selectedPricingTier?: string;
  }>().default({}),

  // Timestamps
  cartStartedAt: timestamp("cart_started_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("abandoned_carts_org_idx").on(table.organizationId),
  emailIdx: index("abandoned_carts_email_idx").on(table.email),
  customerIdx: index("abandoned_carts_customer_idx").on(table.customerId),
  statusIdx: index("abandoned_carts_status_idx").on(table.status),
  tourIdx: index("abandoned_carts_tour_idx").on(table.tourId),
  recoveryTokenIdx: index("abandoned_carts_recovery_token_idx").on(table.recoveryToken),
  createdAtIdx: index("abandoned_carts_created_at_idx").on(table.createdAt),
}));

// ============================================
// Wishlists
// ============================================

export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Customer (may or may not have an account)
  customerId: text("customer_id")
    .references(() => customers.id, { onDelete: "cascade" }),
  email: text("email"), // For non-registered users
  sessionId: text("session_id"), // For anonymous users

  // Wishlisted tour
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  // Alert preferences
  priceDropAlert: boolean("price_drop_alert").default(true),
  availabilityAlert: boolean("availability_alert").default(true),

  // Tracking
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }), // Price when wishlisted
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  notificationCount: integer("notification_count").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("wishlists_org_idx").on(table.organizationId),
  customerIdx: index("wishlists_customer_idx").on(table.customerId),
  tourIdx: index("wishlists_tour_idx").on(table.tourId),
  emailIdx: index("wishlists_email_idx").on(table.email),
  sessionIdx: index("wishlists_session_idx").on(table.sessionId),
  // Unique wishlist per customer+tour or session+tour
  customerTourUnique: unique().on(table.organizationId, table.customerId, table.tourId),
}));

// ============================================
// Availability Alerts (Notify Me)
// ============================================

export type AvailabilityAlertStatus = "active" | "notified" | "booked" | "expired";

export const availabilityAlerts = pgTable("availability_alerts", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Customer
  customerId: text("customer_id")
    .references(() => customers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  phone: text("phone"),

  // Tour/Schedule they want
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),
  // scheduleId kept for migration, no FK constraint (schedules table removed)
  scheduleId: text("schedule_id"),

  // Requested capacity
  requestedSpots: integer("requested_spots").default(1),

  // Status
  status: text("status").$type<AvailabilityAlertStatus>().notNull().default("active"),

  // Notification tracking
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  notificationCount: integer("notification_count").default(0),

  // Outcome
  bookedAt: timestamp("booked_at", { withTimezone: true }),
  bookingId: text("booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // Auto-expire after schedule date
}, (table) => ({
  orgIdx: index("availability_alerts_org_idx").on(table.organizationId),
  emailIdx: index("availability_alerts_email_idx").on(table.email),
  tourIdx: index("availability_alerts_tour_idx").on(table.tourId),
  scheduleIdx: index("availability_alerts_schedule_idx").on(table.scheduleId),
  statusIdx: index("availability_alerts_status_idx").on(table.status),
}));

// ============================================
// Customer Notes
// ============================================

export const customerNotes = pgTable("customer_notes", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Customer
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  // Author (staff member)
  authorId: text("author_id").notNull(), // Clerk user ID
  authorName: text("author_name").notNull(),

  // Content
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("customer_notes_org_idx").on(table.organizationId),
  customerIdx: index("customer_notes_customer_idx").on(table.customerId),
  createdAtIdx: index("customer_notes_created_at_idx").on(table.createdAt),
}));

// ============================================
// Notification Preferences
// ============================================

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Customer
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  // Email preferences
  emailBookingConfirmation: boolean("email_booking_confirmation").default(true),
  emailBookingReminder: boolean("email_booking_reminder").default(true),
  emailBookingChanges: boolean("email_booking_changes").default(true),
  emailReviewRequest: boolean("email_review_request").default(true),
  emailMarketing: boolean("email_marketing").default(true),
  emailPriceAlerts: boolean("email_price_alerts").default(true),
  emailAvailabilityAlerts: boolean("email_availability_alerts").default(true),
  emailWishlistDigest: boolean("email_wishlist_digest").default(true),
  emailAbandonedCart: boolean("email_abandoned_cart").default(true),

  // SMS preferences
  smsBookingConfirmation: boolean("sms_booking_confirmation").default(true),
  smsBookingReminder: boolean("sms_booking_reminder").default(true),
  smsBookingChanges: boolean("sms_booking_changes").default(true),
  smsMarketing: boolean("sms_marketing").default(false), // Opt-in by default

  // Global opt-out
  emailUnsubscribedAt: timestamp("email_unsubscribed_at", { withTimezone: true }),
  smsUnsubscribedAt: timestamp("sms_unsubscribed_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("notification_preferences_org_idx").on(table.organizationId),
  orgCustomerUnique: unique().on(table.organizationId, table.customerId), // One preferences record per customer per org
}));

// ============================================
// Communication Automation Settings (Org-level)
// ============================================

export const communicationAutomations = pgTable("communication_automations", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Automation type
  automationType: text("automation_type").$type<
    | "booking_confirmation"
    | "booking_reminder"
    | "booking_reminder_2"
    | "booking_modification"
    | "booking_cancellation"
    | "review_request"
    | "abandoned_cart_1"
    | "abandoned_cart_2"
    | "abandoned_cart_3"
    | "browse_abandonment"
    | "price_drop_alert"
    | "availability_alert"
    | "wishlist_digest"
  >().notNull(),

  // Channel
  channel: text("channel").$type<"email" | "sms" | "both">().notNull().default("email"),

  // Settings
  isActive: boolean("is_active").default(true),

  // Timing (in minutes, hours, or days depending on automation)
  delayMinutes: integer("delay_minutes"), // For immediate or short delays
  delayHours: integer("delay_hours"), // For hour-based delays
  delayDays: integer("delay_days"), // For day-based delays

  // For reminder-type automations: time before event
  timingType: text("timing_type").$type<"before" | "after" | "immediate">().default("immediate"),

  // Template overrides
  emailTemplateId: text("email_template_id")
    .references(() => emailTemplates.id, { onDelete: "set null" }),
  smsTemplateId: text("sms_template_id")
    .references(() => smsTemplates.id, { onDelete: "set null" }),

  // Optional settings
  includeDiscount: boolean("include_discount").default(false), // For cart recovery
  discountCode: text("discount_code"),
  discountPercentage: integer("discount_percentage"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("communication_automations_org_idx").on(table.organizationId),
  typeUnique: unique().on(table.organizationId, table.automationType), // One automation per type per org
}));

// ============================================
// Relations
// ============================================

export const communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationLogs.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [communicationLogs.customerId],
    references: [customers.id],
  }),
  booking: one(bookings, {
    fields: [communicationLogs.bookingId],
    references: [bookings.id],
  }),
  tour: one(tours, {
    fields: [communicationLogs.tourId],
    references: [tours.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [smsTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const abandonedCartsRelations = relations(abandonedCarts, ({ one }) => ({
  organization: one(organizations, {
    fields: [abandonedCarts.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [abandonedCarts.customerId],
    references: [customers.id],
  }),
  tour: one(tours, {
    fields: [abandonedCarts.tourId],
    references: [tours.id],
  }),
  recoveredBooking: one(bookings, {
    fields: [abandonedCarts.recoveredBookingId],
    references: [bookings.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  organization: one(organizations, {
    fields: [wishlists.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [wishlists.customerId],
    references: [customers.id],
  }),
  tour: one(tours, {
    fields: [wishlists.tourId],
    references: [tours.id],
  }),
}));

export const availabilityAlertsRelations = relations(availabilityAlerts, ({ one }) => ({
  organization: one(organizations, {
    fields: [availabilityAlerts.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [availabilityAlerts.customerId],
    references: [customers.id],
  }),
  tour: one(tours, {
    fields: [availabilityAlerts.tourId],
    references: [tours.id],
  }),
  booking: one(bookings, {
    fields: [availabilityAlerts.bookingId],
    references: [bookings.id],
  }),
}));

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  organization: one(organizations, {
    fields: [customerNotes.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [customerNotes.customerId],
    references: [customers.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  organization: one(organizations, {
    fields: [notificationPreferences.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [notificationPreferences.customerId],
    references: [customers.id],
  }),
}));

export const communicationAutomationsRelations = relations(communicationAutomations, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationAutomations.organizationId],
    references: [organizations.id],
  }),
  emailTemplate: one(emailTemplates, {
    fields: [communicationAutomations.emailTemplateId],
    references: [emailTemplates.id],
  }),
  smsTemplate: one(smsTemplates, {
    fields: [communicationAutomations.smsTemplateId],
    references: [smsTemplates.id],
  }),
}));

// ============================================
// Types
// ============================================

export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type NewCommunicationLog = typeof communicationLogs.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type NewSmsTemplate = typeof smsTemplates.$inferInsert;

export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type NewAbandonedCart = typeof abandonedCarts.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type AvailabilityAlert = typeof availabilityAlerts.$inferSelect;
export type NewAvailabilityAlert = typeof availabilityAlerts.$inferInsert;

export type CustomerNote = typeof customerNotes.$inferSelect;
export type NewCustomerNote = typeof customerNotes.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

export type CommunicationAutomation = typeof communicationAutomations.$inferSelect;
export type NewCommunicationAutomation = typeof communicationAutomations.$inferInsert;
