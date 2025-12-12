import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  isAccountOnboarded,
  createDashboardLink,
} from "@/lib/stripe";

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
  logoUrl: z.string().url().optional(),
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

const updateSettingsSchema = z.object({
  defaultCurrency: z.string().optional(),
  defaultLanguage: z.string().optional(),
  requirePhoneNumber: z.boolean().optional(),
  requireAddress: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  tax: taxSettingsSchema.optional(),
  bookingWindow: bookingWindowSettingsSchema.optional(),
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
        logoUrl: z.string().url().optional(),
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

  hasStripeConnect: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.organization.hasStripeConnect();
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

  // Stripe Connect endpoints
  getStripeConnectStatus: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    const org = await services.organization.get();

    if (!org.stripeConnectAccountId) {
      return {
        connected: false,
        accountId: null,
        onboarded: false,
        details: null,
      };
    }

    try {
      const account = await getConnectAccount(org.stripeConnectAccountId);
      return {
        connected: true,
        accountId: org.stripeConnectAccountId,
        onboarded: org.stripeConnectOnboarded,
        details: {
          businessType: account.business_type || null,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          email: account.email || null,
          country: account.country || null,
        },
      };
    } catch (error) {
      // Account may have been deleted on Stripe
      console.error("Error fetching Stripe account:", error);
      return {
        connected: false,
        accountId: org.stripeConnectAccountId,
        onboarded: false,
        details: null,
        error: "Unable to retrieve account details",
      };
    }
  }),

  startStripeConnectOnboarding: adminProcedure
    .input(z.object({ orgSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const org = await services.organization.get();

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      let accountId = org.stripeConnectAccountId;

      // Create a new Stripe Connect account if one doesn't exist
      if (!accountId) {
        const account = await createConnectAccount(
          ctx.orgContext.organizationId,
          org.email || undefined
        );
        accountId = account.id;

        // Save the account ID to the organization
        await services.organization.updateStripeConnect(accountId, false);
      }

      // Create an account link for onboarding
      const accountLink = await createAccountLink(
        accountId,
        `${baseUrl}/api/stripe/connect/refresh?org=${input.orgSlug}`,
        `${baseUrl}/api/stripe/connect/callback?org=${input.orgSlug}&account=${accountId}`
      );

      return {
        url: accountLink.url,
        accountId,
      };
    }),

  refreshStripeConnectOnboarding: adminProcedure
    .input(z.object({ orgSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const org = await services.organization.get();

      if (!org.stripeConnectAccountId) {
        throw new Error("No Stripe Connect account found");
      }

      // Check if account is already onboarded
      const onboarded = await isAccountOnboarded(org.stripeConnectAccountId);
      if (onboarded && !org.stripeConnectOnboarded) {
        // Update organization to mark as onboarded
        await services.organization.updateStripeConnect(
          org.stripeConnectAccountId,
          true
        );
        return { alreadyOnboarded: true, url: null };
      }

      if (onboarded) {
        return { alreadyOnboarded: true, url: null };
      }

      // Create new onboarding link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const accountLink = await createAccountLink(
        org.stripeConnectAccountId,
        `${baseUrl}/api/stripe/connect/refresh?org=${input.orgSlug}`,
        `${baseUrl}/api/stripe/connect/callback?org=${input.orgSlug}&account=${org.stripeConnectAccountId}`
      );

      return {
        alreadyOnboarded: false,
        url: accountLink.url,
      };
    }),

  getStripeDashboardLink: adminProcedure.mutation(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    const org = await services.organization.get();

    if (!org.stripeConnectAccountId || !org.stripeConnectOnboarded) {
      throw new Error("Stripe Connect not configured");
    }

    const loginLink = await createDashboardLink(org.stripeConnectAccountId);
    return { url: loginLink.url };
  }),

  disconnectStripeConnect: adminProcedure.mutation(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    const org = await services.organization.get();

    if (!org.stripeConnectAccountId) {
      throw new Error("No Stripe Connect account to disconnect");
    }

    // Note: We don't delete the Stripe account, just remove the link
    // The organization can reconnect later if needed
    await services.organization.updateStripeConnect("", false);

    return { success: true };
  }),
});
