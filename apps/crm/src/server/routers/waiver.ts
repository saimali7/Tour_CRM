import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

// Schemas
const healthInfoSchema = z.object({
  hasAllergies: z.boolean().optional(),
  allergies: z.string().optional(),
  hasMedicalConditions: z.boolean().optional(),
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  specialNeeds: z.string().optional(),
});

const signatureTypeSchema = z.enum(["typed", "drawn", "uploaded"]);

export const waiverRouter = createRouter({
  // ==========================================
  // Waiver Templates
  // ==========================================

  // List all waiver templates
  listTemplates: protectedProcedure
    .input(
      z.object({
        filters: z.object({
          isActive: z.boolean().optional(),
          search: z.string().optional(),
        }).optional(),
        sortField: z.enum(["name", "createdAt", "updatedAt"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getTemplates(
        input?.filters,
        input?.sortField,
        input?.sortDirection
      );
    }),

  // Get single template
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getTemplateById(input.id);
    }),

  // Get template with associated tours
  getTemplateWithTours: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getTemplateWithTours(input.id);
    }),

  // Create template
  createTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        content: z.string().min(1),
        requiresSignature: z.boolean().optional(),
        requiresInitials: z.boolean().optional(),
        requiresEmergencyContact: z.boolean().optional(),
        requiresDateOfBirth: z.boolean().optional(),
        requiresHealthInfo: z.boolean().optional(),
        isActive: z.boolean().optional(),
        version: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.createTemplate(input);
    }),

  // Update template
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          content: z.string().min(1).optional(),
          requiresSignature: z.boolean().optional(),
          requiresInitials: z.boolean().optional(),
          requiresEmergencyContact: z.boolean().optional(),
          requiresDateOfBirth: z.boolean().optional(),
          requiresHealthInfo: z.boolean().optional(),
          isActive: z.boolean().optional(),
          version: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.updateTemplate(input.id, input.data);
    }),

  // Delete template (soft delete)
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const success = await services.waiver.deleteTemplate(input.id);
      return { success };
    }),

  // ==========================================
  // Tour-Waiver Associations
  // ==========================================

  // Get waivers required for a tour
  getTourWaivers: protectedProcedure
    .input(z.object({ tourId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getTourWaivers(input.tourId);
    }),

  // Add waiver to tour
  addWaiverToTour: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        waiverTemplateId: z.string(),
        isRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.addWaiverToTour(input);
    }),

  // Remove waiver from tour
  removeWaiverFromTour: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        waiverTemplateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const success = await services.waiver.removeWaiverFromTour(
        input.tourId,
        input.waiverTemplateId
      );
      return { success };
    }),

  // Update waiver requirement for tour
  updateTourWaiver: adminProcedure
    .input(
      z.object({
        tourId: z.string(),
        waiverTemplateId: z.string(),
        isRequired: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.updateTourWaiver(
        input.tourId,
        input.waiverTemplateId,
        input.isRequired
      );
    }),

  // ==========================================
  // Signed Waivers
  // ==========================================

  // Get signed waivers for a booking
  getSignedWaiversForBooking: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getSignedWaiversForBooking(input.bookingId);
    }),

  // Get specific signed waiver
  getSignedWaiver: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getSignedWaiver(input.id);
    }),

  // Sign a waiver
  signWaiver: protectedProcedure
    .input(
      z.object({
        waiverTemplateId: z.string(),
        bookingId: z.string(),
        participantId: z.string().optional(),
        signedByName: z.string().min(1),
        signedByEmail: z.string().email().optional(),
        signedByPhone: z.string().optional(),
        signatureData: z.string().optional(),
        signatureType: signatureTypeSchema.optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        emergencyContactRelationship: z.string().optional(),
        healthInfo: healthInfoSchema.optional(),
        dateOfBirth: z.date().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.signWaiver(input);
    }),

  // Check waiver status for a booking
  getBookingWaiverStatus: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getBookingWaiverStatus(input.bookingId);
    }),

  // Check waivers signed for multiple bookings
  checkWaiversForBookings: protectedProcedure
    .input(z.object({ bookingIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const result = await services.waiver.checkWaiversSignedForBookings(input.bookingIds);
      // Convert Map to object for serialization
      return Object.fromEntries(result);
    }),

  // Get all pending waivers across upcoming bookings
  getPendingWaivers: protectedProcedure
    .query(async ({ ctx }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.waiver.getPendingWaivers();
    }),
});
