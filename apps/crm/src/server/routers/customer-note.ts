import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["createdAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const customerNoteRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerNote.getAll(
        input.customerId,
        input.pagination,
        input.sort
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerNote.getById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        content: z.string().min(1),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });

      // Get author info from context
      const authorId = ctx.user?.id || "unknown";
      const authorName = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "Unknown";

      return services.customerNote.create({
        customerId: input.customerId,
        content: input.content,
        isPinned: input.isPinned,
        authorId,
        authorName,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          content: z.string().min(1).optional(),
          isPinned: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerNote.update(input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.customerNote.delete(input.id);
      return { success: true };
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerNote.togglePin(input.id);
    }),

  getPinned: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.customerNote.getPinnedNotes(input.customerId);
    }),
});
