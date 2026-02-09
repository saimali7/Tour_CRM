import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices, logger } from "@tour/services";

const inboxOptionsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  unreadOnly: z.boolean().default(false),
});

const notificationIdsSchema = z.array(z.string().min(1).max(100)).min(1).max(100);

function resolveOrgSlug(ctx: {
  orgSlug: string | null;
  orgContext: { organization: { slug: string } };
}) {
  return ctx.orgSlug ?? ctx.orgContext.organization.slug;
}

function isNotificationTableError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("notifications") ||
      error.message.includes("relation") ||
      error.message.includes("does not exist"))
  );
}

export const notificationRouter = createRouter({
  list: protectedProcedure
    .input(inboxOptionsSchema.optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.orgContext.user.id;
      const orgSlug = resolveOrgSlug(ctx);
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
        userId,
      });

      try {
        await services.notification.syncOperationalSignalsForUser(userId, orgSlug);
        return services.notification.getInbox(userId, input);
      } catch (error) {
        if (!isNotificationTableError(error)) throw error;

        logger.warn(
          { err: error, organizationId: ctx.orgContext.organizationId, userId },
          "Notifications table unavailable, falling back to operational in-memory feed"
        );
        return services.notification.getOperationalFallback(orgSlug, input);
      }
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.orgContext.user.id;
    const orgSlug = resolveOrgSlug(ctx);
    const services = createServices({
      organizationId: ctx.orgContext.organizationId,
      userId,
    });

    try {
      await services.notification.syncOperationalSignalsForUser(userId, orgSlug);
      const unreadCount = await services.notification.getUnreadCount(userId);
      return { unreadCount };
    } catch (error) {
      if (!isNotificationTableError(error)) throw error;

      logger.warn(
        { err: error, organizationId: ctx.orgContext.organizationId, userId },
        "Notifications table unavailable, using fallback unread count"
      );
      const fallback = await services.notification.getOperationalFallback(orgSlug, {
        page: 1,
        limit: 1,
      });
      return { unreadCount: fallback.unreadCount };
    }
  }),

  markRead: protectedProcedure
    .input(z.object({ ids: notificationIdsSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.orgContext.user.id;
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
        userId,
      });
      try {
        return services.notification.markRead(userId, input.ids);
      } catch (error) {
        if (!isNotificationTableError(error)) throw error;
        return { updated: 0 };
      }
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.orgContext.user.id;
    const services = createServices({
      organizationId: ctx.orgContext.organizationId,
      userId,
    });
    try {
      return services.notification.markAllRead(userId);
    } catch (error) {
      if (!isNotificationTableError(error)) throw error;
      return { updated: 0 };
    }
  }),

  archive: protectedProcedure
    .input(z.object({ ids: notificationIdsSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.orgContext.user.id;
      const services = createServices({
        organizationId: ctx.orgContext.organizationId,
        userId,
      });
      try {
        return services.notification.archive(userId, input.ids);
      } catch (error) {
        if (!isNotificationTableError(error)) throw error;
        return { archived: 0 };
      }
    }),

  archiveAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.orgContext.user.id;
    const services = createServices({
      organizationId: ctx.orgContext.organizationId,
      userId,
    });
    try {
      return services.notification.archiveAllRead(userId);
    } catch (error) {
      if (!isNotificationTableError(error)) throw error;
      return { archived: 0 };
    }
  }),
});
