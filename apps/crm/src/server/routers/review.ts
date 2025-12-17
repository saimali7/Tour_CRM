import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { createServices } from "@tour/services";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["createdAt", "overallRating"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const filtersSchema = z.object({
  tourId: z.string().optional(),
  guideId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(["pending", "submitted", "approved", "rejected", "flagged"]).optional(),
  isPublic: z.boolean().optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  platform: z.enum(["internal", "tripadvisor", "google", "facebook", "viator", "other"]).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
});

export const reviewRouter = createRouter({
  // List reviews with filters
  list: protectedProcedure
    .input(
      z.object({
        filters: filtersSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getAll(
        input.filters,
        input.pagination,
        input.sort
      );
    }),

  // Get single review
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getById(input.id);
    }),

  // Get review by booking ID
  getByBookingId: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getByBookingId(input.bookingId);
    }),

  // Create review (can be from customer portal or staff)
  create: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        customerId: z.string(),
        tourId: z.string(),
        guideId: z.string().optional(),
        overallRating: z.number().min(1).max(5),
        tourRating: z.number().min(1).max(5).optional(),
        guideRating: z.number().min(1).max(5).optional(),
        valueRating: z.number().min(1).max(5).optional(),
        comment: z.string().optional(),
        highlightsLiked: z.string().optional(),
        improvementSuggestions: z.string().optional(),
        isPublic: z.boolean().optional(),
        platform: z.enum(["internal", "tripadvisor", "google", "facebook", "viator", "other"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.create(input);
    }),

  // Update review
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          overallRating: z.number().min(1).max(5).optional(),
          tourRating: z.number().min(1).max(5).optional(),
          guideRating: z.number().min(1).max(5).optional(),
          valueRating: z.number().min(1).max(5).optional(),
          comment: z.string().optional(),
          highlightsLiked: z.string().optional(),
          improvementSuggestions: z.string().optional(),
          isPublic: z.boolean().optional(),
          status: z.enum(["pending", "submitted", "approved", "rejected", "flagged"]).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.update(input.id, input.data);
    }),

  // Delete review
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      await services.review.delete(input.id);
      return { success: true };
    }),

  // Respond to review
  respond: adminProcedure
    .input(
      z.object({
        id: z.string(),
        responseText: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const respondedBy = ctx.user
        ? `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() || ctx.user.id
        : "Unknown";
      return services.review.respond(input.id, input.responseText, respondedBy);
    }),

  // Toggle public visibility (testimonial)
  togglePublic: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.togglePublic(input.id);
    }),

  // Approve review
  approve: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.approve(input.id);
    }),

  // Reject review
  reject: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.reject(input.id);
    }),

  // Flag review
  flag: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.flag(input.id);
    }),

  // Get review stats
  stats: protectedProcedure
    .input(
      z.object({
        tourId: z.string().optional(),
        guideId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getStats(input);
    }),

  // Get guide ratings
  guideRatings: protectedProcedure
    .query(async ({ ctx }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getGuideRatings();
    }),

  // Get tour ratings
  tourRatings: protectedProcedure
    .query(async ({ ctx }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getTourRatings();
    }),

  // Get public testimonials
  testimonials: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getPublicTestimonials(input?.limit);
    }),

  // Get recent reviews for a tour
  recentForTour: protectedProcedure
    .input(
      z.object({
        tourId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getRecentForTour(input.tourId, input.limit);
    }),

  // Get recent reviews for a guide
  recentForGuide: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.review.getRecentForGuide(input.guideId, input.limit);
    }),
});
