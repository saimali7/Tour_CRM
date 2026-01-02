import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices, NotFoundError } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const communicationLogFilterSchema = z.object({
  customerId: z.string().optional(),
  bookingId: z.string().optional(),
  tourId: z.string().optional(),
  type: z.enum(["email", "sms"]).optional(),
  status: z.enum(["pending", "sent", "delivered", "failed", "bounced", "opened", "clicked"]).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const sortSchema = z.object({
  field: z.enum(["createdAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const emailTemplateTypeSchema = z.enum([
  "booking_confirmation",
  "booking_reminder",
  "booking_modification",
  "booking_cancellation",
  "schedule_cancellation",
  "review_request",
  "abandoned_cart_1",
  "abandoned_cart_2",
  "abandoned_cart_3",
  "browse_abandonment",
  "price_drop_alert",
  "availability_alert",
  "wishlist_digest",
  "custom",
]);

const smsTemplateTypeSchema = z.enum([
  "booking_confirmation",
  "booking_reminder",
  "booking_cancellation",
  "abandoned_cart",
  "availability_alert",
  "custom",
]);

const automationTypeSchema = z.enum([
  "booking_confirmation",
  "booking_reminder",
  "booking_reminder_2",
  "booking_modification",
  "booking_cancellation",
  "review_request",
  "abandoned_cart_1",
  "abandoned_cart_2",
  "abandoned_cart_3",
  "browse_abandonment",
  "price_drop_alert",
  "availability_alert",
  "wishlist_digest",
]);

export const communicationRouter = createRouter({
  // ============================================
  // Communication Logs
  // ============================================

  listLogs: protectedProcedure
    .input(
      z.object({
        filters: communicationLogFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getLogs(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  getLogById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getLogById(input.id);
    }),

  getCustomerCommunications: protectedProcedure
    .input(z.object({ customerId: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getCustomerCommunications(input.customerId, input.limit);
    }),

  getLogStats: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.communication.getLogStats();
  }),

  // ============================================
  // Email Templates
  // ============================================

  listEmailTemplates: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.communication.getEmailTemplates();
  }),

  getEmailTemplateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getEmailTemplateById(input.id);
    }),

  getEmailTemplateByType: protectedProcedure
    .input(z.object({ type: emailTemplateTypeSchema }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getEmailTemplateByType(input.type);
    }),

  createEmailTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: emailTemplateTypeSchema,
        description: z.string().max(500).optional(),
        subject: z.string().min(1).max(200),
        contentHtml: z.string().min(1).max(100000), // 100KB max for HTML template
        contentPlain: z.string().max(50000).optional(),
        availableVariables: z.array(z.string().max(100)).max(50).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.createEmailTemplate(input);
    }),

  updateEmailTemplate: adminProcedure
    .input(
      z.object({
        id: z.string().max(100),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          subject: z.string().min(1).max(200).optional(),
          contentHtml: z.string().min(1).max(100000).optional(),
          contentPlain: z.string().max(50000).optional(),
          availableVariables: z.array(z.string().max(100)).max(50).optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.updateEmailTemplate(input.id, input.data);
    }),

  deleteEmailTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.communication.deleteEmailTemplate(input.id);
      return { success: true };
    }),

  getDefaultTemplateVariables: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.communication.getDefaultTemplateVariables();
  }),

  // ============================================
  // SMS Templates
  // ============================================

  listSmsTemplates: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.communication.getSmsTemplates();
  }),

  getSmsTemplateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getSmsTemplateById(input.id);
    }),

  getSmsTemplateByType: protectedProcedure
    .input(z.object({ type: smsTemplateTypeSchema }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getSmsTemplateByType(input.type);
    }),

  createSmsTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: smsTemplateTypeSchema,
        description: z.string().optional(),
        content: z.string().min(1).max(160), // SMS character limit
        availableVariables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.createSmsTemplate(input);
    }),

  updateSmsTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          content: z.string().min(1).max(320).optional(), // Allow 2 SMS segments
          availableVariables: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.updateSmsTemplate(input.id, input.data);
    }),

  deleteSmsTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.communication.deleteSmsTemplate(input.id);
      return { success: true };
    }),

  // ============================================
  // Automations
  // ============================================

  listAutomations: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.communication.getAutomations();
  }),

  getAutomationByType: protectedProcedure
    .input(z.object({ type: automationTypeSchema }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getAutomationByType(input.type);
    }),

  createOrUpdateAutomation: adminProcedure
    .input(
      z.object({
        automationType: automationTypeSchema,
        channel: z.enum(["email", "sms", "both"]).optional(),
        isActive: z.boolean().optional(),
        delayMinutes: z.number().min(0).max(60).optional(),
        delayHours: z.number().min(0).max(168).optional(), // Max 1 week
        delayDays: z.number().min(0).max(30).optional(), // Max 30 days
        timingType: z.enum(["before", "after", "immediate"]).optional(),
        emailTemplateId: z.string().max(100).optional(),
        smsTemplateId: z.string().max(100).optional(),
        includeDiscount: z.boolean().optional(),
        discountCode: z.string().max(50).optional(),
        discountPercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.createOrUpdateAutomation(input);
    }),

  toggleAutomation: adminProcedure
    .input(
      z.object({
        type: automationTypeSchema,
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.toggleAutomation(input.type, input.isActive);
    }),

  // ============================================
  // Notification Preferences
  // ============================================

  getNotificationPreferences: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.getNotificationPreferences(input.customerId);
    }),

  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        preferences: z.object({
          emailBookingConfirmation: z.boolean().optional(),
          emailBookingReminder: z.boolean().optional(),
          emailBookingChanges: z.boolean().optional(),
          emailReviewRequest: z.boolean().optional(),
          emailMarketing: z.boolean().optional(),
          emailPriceAlerts: z.boolean().optional(),
          emailAvailabilityAlerts: z.boolean().optional(),
          emailWishlistDigest: z.boolean().optional(),
          emailAbandonedCart: z.boolean().optional(),
          smsBookingConfirmation: z.boolean().optional(),
          smsBookingReminder: z.boolean().optional(),
          smsBookingChanges: z.boolean().optional(),
          smsMarketing: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.updateNotificationPreferences(
        input.customerId,
        input.preferences
      );
    }),

  unsubscribeEmail: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.unsubscribeEmail(input.customerId);
    }),

  unsubscribeSms: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.communication.unsubscribeSms(input.customerId);
    }),

  // ============================================
  // Bulk Email Operations
  // ============================================

  sendBulkEmail: adminProcedure
    .input(
      z.object({
        bookingIds: z.array(z.string().max(100)).min(1).max(100),
        templateType: emailTemplateTypeSchema,
        customSubject: z.string().max(200).optional(),
        customMessage: z.string().max(50000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      const sent: string[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      // Get template
      const template = await services.communication.getEmailTemplateByType(input.templateType);
      if (!template) {
        throw new NotFoundError("Email template", input.templateType);
      }

      for (const bookingId of input.bookingIds) {
        try {
          const booking = await services.booking.getById(bookingId);
          if (!booking.customer?.email) {
            errors.push({ id: bookingId, error: "Customer has no email address" });
            continue;
          }

          // Log the communication
          await services.communication.createLog({
            customerId: booking.customerId,
            bookingId: booking.id,
            type: "email",
            subject: input.customSubject || template.subject,
            content: input.customMessage || template.contentHtml,
            status: "sent",
          });

          sent.push(bookingId);
        } catch (error) {
          errors.push({
            id: bookingId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return { sent, errors, totalSent: sent.length, totalErrors: errors.length };
    }),
});
