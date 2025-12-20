import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

// Service Health Types (exported for tRPC inference)
export type ServiceStatus = "connected" | "not_configured" | "error";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message?: string;
  details?: Record<string, unknown>;
}

const updateOrganizationSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
});

const taxSettingsSchema = z.object({
  enabled: z.boolean(),
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  taxId: z.string().optional(),
  includeInPrice: z.boolean(),
  applyToFees: z.boolean(),
});

const bookingWindowSettingsSchema = z.object({
  minimumNoticeHours: z.number().min(0),
  maximumAdvanceDays: z.number().min(0),
  allowSameDayBooking: z.boolean(),
  sameDayCutoffTime: z.string().optional(),
});

const paymentSettingsSchema = z.object({
  paymentLinkExpirationHours: z.number().min(1).max(168),
  autoSendPaymentReminders: z.boolean(),
  paymentReminderHours: z.number().min(1).max(24),
  depositEnabled: z.boolean(),
  depositType: z.enum(["percentage", "fixed"]),
  depositAmount: z.number().min(0),
  depositDueDays: z.number().min(0).max(90),
  acceptedPaymentMethods: z.array(z.enum(["card", "cash", "bank_transfer", "check", "other"])),
  allowOnlinePayments: z.boolean(),
  allowPartialPayments: z.boolean(),
  autoRefundOnCancellation: z.boolean(),
  refundDeadlineHours: z.number().min(0).max(720),
});

const notificationEventSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  timing: z.string().optional(),
});

const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  customer: z.object({
    bookingConfirmed: notificationEventSchema.optional(),
    paymentReceived: notificationEventSchema.optional(),
    tourReminder24h: notificationEventSchema.optional(),
    tourReminder2h: notificationEventSchema.optional(),
    bookingCancelled: notificationEventSchema.optional(),
    refundProcessed: notificationEventSchema.optional(),
  }).optional(),
  staff: z.object({
    newBooking: z.boolean().optional(),
    paymentReceived: z.boolean().optional(),
    bookingCancelled: z.boolean().optional(),
    lowAvailability: z.boolean().optional(),
  }).optional(),
  guide: z.object({
    scheduleAssignment: z.boolean().optional(),
    scheduleUpdate: z.boolean().optional(),
    dayOfReminder: z.boolean().optional(),
  }).optional(),
});

const updateSettingsSchema = z.object({
  defaultCurrency: z.string().optional(),
  defaultLanguage: z.string().optional(),
  requirePhoneNumber: z.boolean().optional(),
  requireAddress: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notificationSettings: notificationSettingsSchema.optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  tax: taxSettingsSchema.optional(),
  bookingWindow: bookingWindowSettingsSchema.optional(),
  payment: paymentSettingsSchema.optional(),
});

export const organizationRouter = createRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.get();
  }),

  update: adminProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.organization.update(input);
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.getSettings();
  }),

  updateSettings: adminProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.organization.updateSettings(input);
    }),

  updateBranding: adminProcedure
    .input(
      z.object({
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.organization.updateBranding(input.logoUrl, input.primaryColor);
    }),

  getPlan: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.getPlan();
  }),

  hasFeature: protectedProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.organization.hasFeature(input.feature);
    }),

  canUseWebApp: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.canUseWebApp();
  }),

  getTimezone: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.getTimezone();
  }),

  getDefaultCurrency: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.getDefaultCurrency();
  }),

  isActive: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.isActive();
  }),

  // Stripe Status (Direct Mode - payments go to platform's Stripe account)
  getStripeStatus: protectedProcedure.query(async () => {
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;

    return {
      configured: hasStripeKey,
      testMode: isTestMode,
      message: hasStripeKey
        ? isTestMode
          ? "Stripe configured (Test Mode)"
          : "Stripe configured (Live Mode)"
        : "Stripe not configured",
    };
  }),

  // Service Health Check
  getServiceHealth: adminProcedure.query(async () => {
    const healthChecks: ServiceHealth[] = [];

    // Database - always check
    try {
      const { db, sql } = await import("@tour/database");
      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      healthChecks.push({
        name: "database",
        status: "connected",
        message: `Connected (${Date.now() - startTime}ms)`,
      });
    } catch (error) {
      healthChecks.push({
        name: "database",
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
      });
    }

    // Clerk Authentication
    const clerkEnabled = process.env.ENABLE_CLERK === "true";
    if (clerkEnabled && process.env.CLERK_SECRET_KEY) {
      const isLive = process.env.CLERK_SECRET_KEY.startsWith("sk_live_");
      healthChecks.push({
        name: "authentication",
        status: "connected",
        message: `Clerk ${isLive ? "(Live)" : "(Test)"}`,
        details: { provider: "Clerk", mode: isLive ? "live" : "test" },
      });
    } else if (!clerkEnabled) {
      healthChecks.push({
        name: "authentication",
        status: "not_configured",
        message: "Clerk disabled (dev mode)",
      });
    } else {
      healthChecks.push({
        name: "authentication",
        status: "error",
        message: "CLERK_SECRET_KEY not configured",
      });
    }

    // Stripe Payments
    if (process.env.STRIPE_SECRET_KEY) {
      const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
      healthChecks.push({
        name: "payments",
        status: "connected",
        message: `Stripe ${isTestMode ? "(Test)" : "(Live)"}`,
        details: { provider: "Stripe", mode: isTestMode ? "test" : "live" },
      });
    } else {
      healthChecks.push({
        name: "payments",
        status: "not_configured",
        message: "Stripe not configured",
      });
    }

    // Email (Resend)
    if (process.env.RESEND_API_KEY) {
      const isValidKey = process.env.RESEND_API_KEY.startsWith("re_");
      healthChecks.push({
        name: "email",
        status: isValidKey ? "connected" : "error",
        message: isValidKey ? "Resend configured" : "Invalid API key format",
        details: { provider: "Resend" },
      });
    } else {
      healthChecks.push({
        name: "email",
        status: "not_configured",
        message: "Email service not configured",
      });
    }

    // Background Jobs (Inngest)
    if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY) {
      healthChecks.push({
        name: "automations",
        status: "connected",
        message: "Inngest configured",
        details: { provider: "Inngest" },
      });
    } else {
      healthChecks.push({
        name: "automations",
        status: "not_configured",
        message: "Background jobs not configured",
      });
    }

    // Redis Cache
    if (process.env.REDIS_URL) {
      healthChecks.push({
        name: "cache",
        status: "connected",
        message: "Redis configured",
      });
    } else {
      healthChecks.push({
        name: "cache",
        status: "not_configured",
        message: "Using in-memory cache",
      });
    }

    return {
      services: healthChecks,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    };
  }),
});
