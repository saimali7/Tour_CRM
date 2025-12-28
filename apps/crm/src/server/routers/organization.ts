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
  email: z.string().email().optional().or(z.literal("")),
  fromEmail: z.string().email().optional().or(z.literal("")), // Email address for sending transactional emails
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
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

    // Supabase Storage
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      healthChecks.push({
        name: "storage",
        status: "connected",
        message: "Supabase Storage configured",
        details: { provider: "Supabase" },
      });
    } else {
      healthChecks.push({
        name: "storage",
        status: "not_configured",
        message: "File storage not configured",
      });
    }

    return {
      services: healthChecks,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    };
  }),

  // Test individual service connection
  testService: adminProcedure
    .input(z.object({ service: z.enum(["database", "authentication", "payments", "email", "automations", "storage"]) }))
    .mutation(async ({ input }): Promise<{ success: boolean; message: string; latency?: number }> => {
      const startTime = Date.now();

      switch (input.service) {
        case "database": {
          try {
            const { db, sql } = await import("@tour/database");
            await db.execute(sql`SELECT 1`);
            return { success: true, message: "Database connected", latency: Date.now() - startTime };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
          }
        }

        case "authentication": {
          const clerkEnabled = process.env.ENABLE_CLERK === "true";
          if (!clerkEnabled) {
            return { success: true, message: "Clerk disabled in dev mode" };
          }
          if (!process.env.CLERK_SECRET_KEY) {
            return { success: false, message: "CLERK_SECRET_KEY not configured" };
          }
          try {
            // Actually test Clerk API
            const { clerkClient } = await import("@clerk/nextjs/server");
            const client = await clerkClient();
            await client.users.getCount();
            return { success: true, message: "Clerk API connected", latency: Date.now() - startTime };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Clerk API error" };
          }
        }

        case "payments": {
          if (!process.env.STRIPE_SECRET_KEY) {
            return { success: false, message: "Stripe not configured" };
          }
          try {
            const { default: Stripe } = await import("stripe");
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            await stripe.balance.retrieve();
            const isTest = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
            return { success: true, message: `Stripe connected (${isTest ? "Test" : "Live"})`, latency: Date.now() - startTime };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Stripe API error" };
          }
        }

        case "email": {
          if (!process.env.RESEND_API_KEY) {
            return { success: false, message: "Resend not configured" };
          }
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            // Get domains to verify API key works
            await resend.domains.list();
            return { success: true, message: "Resend API connected", latency: Date.now() - startTime };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Resend API error" };
          }
        }

        case "automations": {
          if (!process.env.INNGEST_EVENT_KEY) {
            return { success: false, message: "Inngest event key not configured" };
          }
          if (!process.env.INNGEST_SIGNING_KEY) {
            return { success: false, message: "Inngest signing key not configured" };
          }
          // Inngest doesn't have a simple ping endpoint, so we verify config is present
          return { success: true, message: "Inngest configured (send test event to verify)", latency: Date.now() - startTime };
        }

        case "storage": {
          if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, message: "Supabase storage not configured" };
          }
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            // List buckets to verify connection
            const { error } = await supabase.storage.listBuckets();
            if (error) throw error;
            return { success: true, message: "Supabase Storage connected", latency: Date.now() - startTime };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Storage API error" };
          }
        }

        default:
          return { success: false, message: "Unknown service" };
      }
    }),

  // Functional test - actually exercises the service end-to-end
  functionalTestService: adminProcedure
    .input(z.object({
      service: z.enum(["database", "email", "storage", "payments", "automations"]),
      testEmail: z.string().email().optional(), // Required for email test
    }))
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      details?: Record<string, unknown>;
      latency?: number;
    }> => {
      const startTime = Date.now();
      const orgId = ctx.orgContext.organizationId;

      switch (input.service) {
        case "database": {
          // Test: Create, read, update, delete a test record
          try {
            const { db, sql } = await import("@tour/database");

            // Test write
            const testId = `test_${Date.now()}`;
            await db.execute(sql`
              CREATE TEMP TABLE IF NOT EXISTS _health_check (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT NOW()
              )
            `);
            await db.execute(sql`INSERT INTO _health_check (id) VALUES (${testId})`);

            // Test read
            const result = await db.execute(sql`SELECT * FROM _health_check WHERE id = ${testId}`);

            // Test delete
            await db.execute(sql`DELETE FROM _health_check WHERE id = ${testId}`);

            return {
              success: true,
              message: "Database CRUD operations working",
              details: { operations: ["CREATE", "INSERT", "SELECT", "DELETE"], rowsReturned: result.length },
              latency: Date.now() - startTime,
            };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Database test failed" };
          }
        }

        case "email": {
          // Test: Send an actual test email
          if (!input.testEmail) {
            return { success: false, message: "Test email address required" };
          }
          if (!process.env.RESEND_API_KEY) {
            return { success: false, message: "Resend not configured" };
          }
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Get org for fromEmail
            const { db, eq, organizations } = await import("@tour/database");
            const org = await db.query.organizations.findFirst({
              where: eq(organizations.id, orgId),
            });

            const fromEmail = org?.fromEmail || "onboarding@resend.dev";

            const { data, error } = await resend.emails.send({
              from: fromEmail,
              to: input.testEmail,
              subject: "🧪 Test Email from Tour CRM",
              html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>Email Service Test</h2>
                  <p>This is a test email from your Tour CRM system.</p>
                  <p>If you received this, your email service is working correctly!</p>
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="color: #666; font-size: 12px;">
                    Sent at: ${new Date().toISOString()}<br/>
                    Organization: ${org?.name || "Unknown"}
                  </p>
                </div>
              `,
            });

            if (error) {
              return { success: false, message: error.message };
            }

            return {
              success: true,
              message: `Test email sent to ${input.testEmail}`,
              details: { messageId: data?.id, from: fromEmail },
              latency: Date.now() - startTime,
            };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Email test failed" };
          }
        }

        case "storage": {
          // Test: Upload, download, delete a test file
          if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, message: "Supabase storage not configured" };
          }
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

            const testFileName = `_health_check_${Date.now()}.txt`;
            const testContent = `Health check at ${new Date().toISOString()}`;
            const bucket = "tour-images";

            // Upload test file
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(`${orgId}/_tests/${testFileName}`, testContent, {
                contentType: "text/plain",
              });

            if (uploadError) {
              // Bucket might not exist
              if (uploadError.message.includes("not found")) {
                return { success: false, message: `Bucket "${bucket}" not found. Create it in Supabase dashboard.` };
              }
              throw uploadError;
            }

            // Download and verify
            const { data: downloadData, error: downloadError } = await supabase.storage
              .from(bucket)
              .download(`${orgId}/_tests/${testFileName}`);

            if (downloadError) throw downloadError;

            const downloadedContent = await downloadData.text();
            const contentMatches = downloadedContent === testContent;

            // Cleanup - delete test file
            await supabase.storage
              .from(bucket)
              .remove([`${orgId}/_tests/${testFileName}`]);

            return {
              success: contentMatches,
              message: contentMatches ? "Storage upload/download/delete working" : "Content mismatch after download",
              details: { bucket, operations: ["upload", "download", "delete"], fileSize: testContent.length },
              latency: Date.now() - startTime,
            };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Storage test failed" };
          }
        }

        case "payments": {
          // Test: Create and cancel a test payment intent
          if (!process.env.STRIPE_SECRET_KEY) {
            return { success: false, message: "Stripe not configured" };
          }
          try {
            const { default: Stripe } = await import("stripe");
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const isTest = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");

            if (!isTest) {
              // Don't create real payment intents in live mode
              const balance = await stripe.balance.retrieve();
              return {
                success: true,
                message: "Stripe Live mode - skipping payment intent test",
                details: { mode: "live", available: balance.available },
                latency: Date.now() - startTime,
              };
            }

            // Create a test payment intent
            const paymentIntent = await stripe.paymentIntents.create({
              amount: 100, // $1.00 in cents
              currency: "usd",
              metadata: { test: "true", orgId },
              automatic_payment_methods: { enabled: true },
            });

            // Immediately cancel it
            await stripe.paymentIntents.cancel(paymentIntent.id);

            return {
              success: true,
              message: "Payment intent create/cancel working",
              details: { mode: "test", paymentIntentId: paymentIntent.id, status: "canceled" },
              latency: Date.now() - startTime,
            };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Payment test failed" };
          }
        }

        case "automations": {
          // Test: Send a test event to Inngest
          if (!process.env.INNGEST_EVENT_KEY) {
            return { success: false, message: "Inngest event key not configured" };
          }
          try {
            const { inngest } = await import("@/inngest");

            // Send a test event
            const result = await inngest.send({
              name: "test/health-check",
              data: {
                organizationId: orgId,
                timestamp: new Date().toISOString(),
                test: true,
              },
            });

            return {
              success: true,
              message: "Test event sent to Inngest",
              details: { eventIds: result.ids },
              latency: Date.now() - startTime,
            };
          } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Inngest test failed" };
          }
        }

        default:
          return { success: false, message: "Unknown service" };
      }
    }),
});
