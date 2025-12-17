import { pgTable, text, timestamp, boolean, index, unique, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { organizations } from "./organizations";
import { tours } from "./tours";
import { bookings, bookingParticipants } from "./bookings";

// Waiver Templates - Reusable waiver documents that can be assigned to tours
export const waiverTemplates = pgTable("waiver_templates", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Basic info
  name: text("name").notNull(), // e.g., "Standard Liability Waiver", "Photo Release"
  description: text("description"), // Internal description for staff

  // Waiver content - markdown or HTML
  content: text("content").notNull(),

  // Requirements
  requiresSignature: boolean("requires_signature").notNull().default(true),
  requiresInitials: boolean("requires_initials").default(false), // Initials on each section
  requiresEmergencyContact: boolean("requires_emergency_contact").default(false),
  requiresDateOfBirth: boolean("requires_date_of_birth").default(false),
  requiresHealthInfo: boolean("requires_health_info").default(false),

  // Settings
  isActive: boolean("is_active").notNull().default(true),
  version: text("version").default("1.0"), // Track waiver versions

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("waiver_templates_org_idx").on(table.organizationId),
  nameOrgUnique: unique().on(table.organizationId, table.name),
}));

// Tour Waivers - Junction table linking tours to required waivers
export const tourWaivers = pgTable("tour_waivers", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // References
  tourId: text("tour_id")
    .notNull()
    .references(() => tours.id, { onDelete: "cascade" }),

  waiverTemplateId: text("waiver_template_id")
    .notNull()
    .references(() => waiverTemplates.id, { onDelete: "cascade" }),

  // Configuration
  isRequired: boolean("is_required").notNull().default(true), // Required vs optional

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("tour_waivers_org_idx").on(table.organizationId),
  tourIdx: index("tour_waivers_tour_idx").on(table.tourId),
  tourWaiverUnique: unique().on(table.tourId, table.waiverTemplateId),
}));

// Signed Waivers - Records of waivers signed by booking participants
export const signedWaivers = pgTable("signed_waivers", {
  id: text("id").primaryKey().$defaultFn(createId),

  // Organization (tenant isolation)
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // References
  waiverTemplateId: text("waiver_template_id")
    .notNull()
    .references(() => waiverTemplates.id, { onDelete: "restrict" }),

  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Optional: specific participant (null = main booker signs for all)
  participantId: text("participant_id")
    .references(() => bookingParticipants.id, { onDelete: "set null" }),

  // Signer information
  signedByName: text("signed_by_name").notNull(), // Full name
  signedByEmail: text("signed_by_email"), // Email address
  signedByPhone: text("signed_by_phone"), // Phone number

  // Signature data
  signatureData: text("signature_data"), // Base64 encoded signature image or SVG
  signatureType: text("signature_type").$type<SignatureType>().default("typed"),

  // Emergency contact (if required)
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),

  // Health info (if required)
  healthInfo: jsonb("health_info").$type<HealthInfo>(),

  // Date of birth (if required)
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),

  // Audit trail
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"), // IP address at time of signing
  userAgent: text("user_agent"), // Browser user agent

  // Waiver version at time of signing (snapshot)
  waiverVersionAtSigning: text("waiver_version_at_signing"),
  waiverContentAtSigning: text("waiver_content_at_signing"), // Snapshot of waiver content

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("signed_waivers_org_idx").on(table.organizationId),
  bookingIdx: index("signed_waivers_booking_idx").on(table.bookingId),
  waiverIdx: index("signed_waivers_waiver_idx").on(table.waiverTemplateId),
  participantIdx: index("signed_waivers_participant_idx").on(table.participantId),
  // Prevent duplicate signatures for same waiver on same booking/participant
  uniqueSignature: unique().on(table.bookingId, table.waiverTemplateId, table.participantId),
}));

// Relations
export const waiverTemplatesRelations = relations(waiverTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [waiverTemplates.organizationId],
    references: [organizations.id],
  }),
  tourWaivers: many(tourWaivers),
  signedWaivers: many(signedWaivers),
}));

export const tourWaiversRelations = relations(tourWaivers, ({ one }) => ({
  organization: one(organizations, {
    fields: [tourWaivers.organizationId],
    references: [organizations.id],
  }),
  tour: one(tours, {
    fields: [tourWaivers.tourId],
    references: [tours.id],
  }),
  waiverTemplate: one(waiverTemplates, {
    fields: [tourWaivers.waiverTemplateId],
    references: [waiverTemplates.id],
  }),
}));

export const signedWaiversRelations = relations(signedWaivers, ({ one }) => ({
  organization: one(organizations, {
    fields: [signedWaivers.organizationId],
    references: [organizations.id],
  }),
  waiverTemplate: one(waiverTemplates, {
    fields: [signedWaivers.waiverTemplateId],
    references: [waiverTemplates.id],
  }),
  booking: one(bookings, {
    fields: [signedWaivers.bookingId],
    references: [bookings.id],
  }),
  participant: one(bookingParticipants, {
    fields: [signedWaivers.participantId],
    references: [bookingParticipants.id],
  }),
}));

// Types
export type SignatureType = "typed" | "drawn" | "uploaded";

export interface HealthInfo {
  hasAllergies?: boolean;
  allergies?: string;
  hasMedicalConditions?: boolean;
  medicalConditions?: string;
  medications?: string;
  specialNeeds?: string;
}

export type WaiverTemplate = typeof waiverTemplates.$inferSelect;
export type NewWaiverTemplate = typeof waiverTemplates.$inferInsert;

export type TourWaiver = typeof tourWaivers.$inferSelect;
export type NewTourWaiver = typeof tourWaivers.$inferInsert;

export type SignedWaiver = typeof signedWaivers.$inferSelect;
export type NewSignedWaiver = typeof signedWaivers.$inferInsert;
