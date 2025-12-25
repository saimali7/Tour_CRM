import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

// ============================================
// Schema Definitions
// ============================================

const bookingItemStatusSchema = z.enum([
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
]);

const listByBookingSchema = z.object({
  bookingId: z.string(),
});

const getByIdSchema = z.object({
  id: z.string(),
});

const addItemSchema = z.object({
  bookingId: z.string(),
  productId: z.string(),
  quantity: z.number().min(1).optional(),
  participants: z.number().min(1).optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal"),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Discount must be a valid decimal").optional(),
  scheduleId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  internalNotes: z.string().max(5000).optional(),
});

const updateItemSchema = z.object({
  id: z.string(),
  quantity: z.number().min(1).optional(),
  participants: z.number().min(1).optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal").optional(),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Discount must be a valid decimal").optional(),
  scheduleId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  internalNotes: z.string().max(5000).optional(),
});

const removeItemSchema = z.object({
  id: z.string(),
});

const updateStatusSchema = z.object({
  id: z.string(),
  status: bookingItemStatusSchema,
});

const fulfillItemSchema = z.object({
  id: z.string(),
});

const calculateTotalSchema = z.object({
  bookingId: z.string(),
});

export const bookingItemRouter = createRouter({
  // ============================================
  // Query Operations
  // ============================================

  listByBooking: protectedProcedure
    .input(listByBookingSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.bookingItem.getByBookingId(input.bookingId);
    }),

  getById: protectedProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.bookingItem.getById(input.id);
    }),

  calculateTotal: protectedProcedure
    .input(calculateTotalSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const total = await services.bookingItem.calculateBookingTotal(input.bookingId);
      return { total: total.toFixed(2) };
    }),

  // ============================================
  // Mutation Operations
  // ============================================

  add: adminProcedure
    .input(addItemSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const { bookingId, ...itemInput } = input;
      return services.bookingItem.add(bookingId, itemInput);
    }),

  update: adminProcedure
    .input(updateItemSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const { id, ...data } = input;
      return services.bookingItem.update(id, data);
    }),

  remove: adminProcedure
    .input(removeItemSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.bookingItem.remove(input.id);
      return { success: true };
    }),

  updateStatus: adminProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.bookingItem.updateStatus(input.id, input.status);
    }),

  fulfill: adminProcedure
    .input(fulfillItemSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.bookingItem.fulfill(input.id);
    }),
});
