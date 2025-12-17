import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const addOnTypeSchema = z.enum(["per_booking", "per_person", "quantity"]);

export const addOnRouter = createRouter({
  // ==========================================
  // Add-On Products
  // ==========================================

  listProducts: protectedProcedure
    .input(
      z.object({
        filters: z.object({
          isActive: z.boolean().optional(),
          category: z.string().optional(),
          type: addOnTypeSchema.optional(),
          search: z.string().optional(),
        }).optional(),
        sortField: z.enum(["name", "price", "createdAt"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.getProducts(
        input?.filters,
        input?.sortField,
        input?.sortDirection
      );
    }),

  getProduct: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.getProductById(input.id);
    }),

  createProduct: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        price: z.string(),
        currency: z.string().optional(),
        type: addOnTypeSchema.optional(),
        minQuantity: z.number().optional(),
        maxQuantity: z.number().optional(),
        trackInventory: z.boolean().optional(),
        inventoryCount: z.number().optional(),
        imageUrl: z.string().optional(),
        category: z.string().optional(),
        requiresInfo: z.boolean().optional(),
        infoPrompt: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.createProduct(input);
    }),

  updateProduct: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          shortDescription: z.string().optional(),
          price: z.string().optional(),
          currency: z.string().optional(),
          type: addOnTypeSchema.optional(),
          minQuantity: z.number().optional(),
          maxQuantity: z.number().nullable().optional(),
          trackInventory: z.boolean().optional(),
          inventoryCount: z.number().nullable().optional(),
          imageUrl: z.string().optional(),
          category: z.string().optional(),
          requiresInfo: z.boolean().optional(),
          infoPrompt: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.updateProduct(input.id, input.data);
    }),

  deleteProduct: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.deleteProduct(input.id);
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const services = createServices({ organizationId: ctx.orgContext.organizationId });
    return services.addOn.getCategories();
  }),

  // ==========================================
  // Tour Add-Ons
  // ==========================================

  getTourAddOns: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.getTourAddOns(input.tourId);
    }),

  addToTour: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        addOnProductId: z.string(),
        priceOverride: z.string().optional(),
        isRequired: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.addToTour(input);
    }),

  removeFromTour: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        addOnProductId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.removeFromTour(input.tourId, input.addOnProductId);
    }),

  updateTourAddOn: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        addOnProductId: z.string(),
        priceOverride: z.string().nullable().optional(),
        isRequired: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const { tourId, addOnProductId, ...data } = input;
      return services.addOn.updateTourAddOn(tourId, addOnProductId, data);
    }),

  getAvailableForTour: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.getAvailableAddOnsForTour(input.tourId);
    }),

  // ==========================================
  // Booking Add-Ons
  // ==========================================

  getBookingAddOns: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.getBookingAddOns(input.bookingId);
    }),

  addToBooking: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        addOnProductId: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.string(),
        additionalInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.addToBooking(input);
    }),

  updateBookingAddOn: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        quantity: z.number().min(1).optional(),
        additionalInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const { id, ...data } = input;
      return services.addOn.updateBookingAddOn(id, data);
    }),

  removeFromBooking: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.removeFromBooking(input.id);
    }),

  cancelBookingAddOn: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.addOn.cancelBookingAddOn(input.id);
    }),

  calculateBookingTotal: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const total = await services.addOn.calculateAddOnsTotal(input.bookingId);
      return { total };
    }),
});
