import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils";

// Organization - The tenant root. Every other entity belongs to an organization.
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Identity
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier

  // Contact
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),

  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  timezone: text("timezone").notNull().default("UTC"),

  // Branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0066FF"),

  // Settings (flexible JSON for org-specific settings)
  settings: jsonb("settings").$type<OrganizationSettings>().default({}),

  // Stripe Connect
  stripeCustomerId: text("stripe_customer_id"), // For billing the org
  stripeConnectAccountId: text("stripe_connect_account_id"), // For receiving payments
  stripeConnectOnboarded: boolean("stripe_connect_onboarded").default(false),

  // Status
  status: text("status").$type<OrganizationStatus>().notNull().default("active"),

  // Feature flags (what this org can access)
  plan: text("plan").$type<OrganizationPlan>().notNull().default("free"),
  features: jsonb("features").$type<string[]>().default([]),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Types
export type OrganizationStatus = "active" | "suspended" | "deleted";
export type OrganizationPlan = "free" | "starter" | "pro" | "enterprise";

export interface TaxSettings {
  enabled: boolean;
  name: string; // e.g., "VAT", "Sales Tax", "GST"
  rate: number; // Percentage, e.g., 20 for 20%
  taxId?: string; // Business tax ID for invoices
  includeInPrice: boolean; // true = prices include tax, false = tax added at checkout
  applyToFees: boolean; // Apply tax to booking fees as well
}

export interface BookingWindowSettings {
  // Minimum notice required before a tour starts (in hours)
  minimumNoticeHours: number;
  // Maximum advance booking window (in days, 0 = unlimited)
  maximumAdvanceDays: number;
  // Whether to allow same-day bookings
  allowSameDayBooking: boolean;
  // Cut-off time for same-day bookings (24h format, e.g., "12:00")
  sameDayCutoffTime?: string;
}

export interface PaymentSettings {
  // Payment link settings
  paymentLinkExpirationHours: number; // How long payment links are valid (default: 24)
  autoSendPaymentReminders: boolean; // Auto-send reminder before expiry
  paymentReminderHours: number; // Hours before expiry to send reminder (default: 6)

  // Deposit settings
  depositEnabled: boolean; // Require deposits for bookings
  depositType: "percentage" | "fixed"; // How deposit is calculated
  depositAmount: number; // Percentage (e.g., 25) or fixed amount (e.g., 50.00)
  depositDueDays: number; // Days before tour when full payment is due (default: 7)

  // Accepted payment methods
  acceptedPaymentMethods: Array<"card" | "cash" | "bank_transfer" | "check" | "other">;

  // Online payment settings
  allowOnlinePayments: boolean; // Whether to accept online card payments
  allowPartialPayments: boolean; // Allow customers to pay in installments

  // Refund settings
  autoRefundOnCancellation: boolean; // Automatically process refunds
  refundDeadlineHours: number; // Hours before tour when refunds are no longer available
}

export interface SetupProgress {
  // Core setup steps
  basicInfo: boolean; // Name, slug, email, timezone, currency set
  businessProfile: boolean; // Address, phone, website filled
  stripeConnect: boolean; // Stripe Connect onboarded

  // First usage milestones
  firstTour: boolean; // Created at least one tour
  firstBooking: boolean; // Received at least one booking

  // Timestamps for when each step was completed
  completedAt?: {
    basicInfo?: string;
    businessProfile?: string;
    stripeConnect?: string;
    firstTour?: string;
    firstBooking?: string;
  };
}

export interface NotificationSettings {
  // Master channel toggles
  emailEnabled?: boolean;
  smsEnabled?: boolean;

  // Customer notifications
  customer?: {
    bookingConfirmed?: { email?: boolean; sms?: boolean; timing?: string };
    paymentReceived?: { email?: boolean; sms?: boolean; timing?: string };
    tourReminder24h?: { email?: boolean; sms?: boolean; timing?: string };
    tourReminder2h?: { email?: boolean; sms?: boolean; timing?: string };
    bookingCancelled?: { email?: boolean; sms?: boolean; timing?: string };
    refundProcessed?: { email?: boolean; sms?: boolean; timing?: string };
  };

  // Staff notifications
  staff?: {
    newBooking?: boolean;
    paymentReceived?: boolean;
    bookingCancelled?: boolean;
    lowAvailability?: boolean;
  };

  // Guide notifications
  guide?: {
    scheduleAssignment?: boolean;
    scheduleUpdate?: boolean;
    dayOfReminder?: boolean;
  };
}

export interface OrganizationSettings {
  // Booking settings
  defaultCurrency?: string;
  defaultLanguage?: string;
  requirePhoneNumber?: boolean;
  requireAddress?: boolean;

  // Booking window/availability settings
  bookingWindow?: BookingWindowSettings;

  // Notification settings (legacy - kept for backwards compatibility)
  emailNotifications?: boolean;
  smsNotifications?: boolean;

  // Detailed notification settings
  notificationSettings?: NotificationSettings;

  // Booking policies
  cancellationPolicy?: string;
  refundPolicy?: string;

  // Tax settings
  tax?: TaxSettings;

  // Payment settings
  payment?: PaymentSettings;

  // Setup progress tracking
  setupProgress?: SetupProgress;

  // Custom fields (org can add their own)
  customFields?: Record<string, unknown>;
}

// Relations are defined in the individual entity files to avoid circular imports
// They reference back to organizations

// Type helpers
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
