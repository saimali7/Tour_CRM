import { eq, and, desc, asc, count, avg, sql, gte, lte, isNull, isNotNull } from "drizzle-orm";
import {
  reviews,
  bookings,
  customers,
  tours,
  guides,
  type Review,
  type ReviewStatus,
  type ReviewPlatform,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
} from "./types";

export type ReviewSortField = "createdAt" | "overallRating";

export interface CreateReviewInput {
  bookingId: string;
  customerId: string;
  tourId: string;
  guideId?: string;
  overallRating: number;
  tourRating?: number;
  guideRating?: number;
  valueRating?: number;
  comment?: string;
  highlightsLiked?: string;
  improvementSuggestions?: string;
  isPublic?: boolean;
  platform?: ReviewPlatform;
}

export interface UpdateReviewInput {
  overallRating?: number;
  tourRating?: number;
  guideRating?: number;
  valueRating?: number;
  comment?: string;
  highlightsLiked?: string;
  improvementSuggestions?: string;
  isPublic?: boolean;
  status?: ReviewStatus;
}

export interface ReviewFilters {
  tourId?: string;
  guideId?: string;
  customerId?: string;
  status?: ReviewStatus;
  isPublic?: boolean;
  minRating?: number;
  maxRating?: number;
  platform?: ReviewPlatform;
  fromDate?: Date;
  toDate?: Date;
}

export interface ReviewWithRelations extends Review {
  booking?: {
    id: string;
    referenceNumber: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tour?: {
    id: string;
    name: string;
  };
  guide?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  averageTourRating: number | null;
  averageGuideRating: number | null;
  averageValueRating: number | null;
  ratingDistribution: Record<number, number>;
  pendingReviews: number;
  publicTestimonials: number;
}

export interface GuideRatingStats {
  guideId: string;
  guideName: string;
  totalReviews: number;
  averageRating: number;
}

export interface TourRatingStats {
  tourId: string;
  tourName: string;
  totalReviews: number;
  averageRating: number;
}

export class ReviewService extends BaseService {
  async getAll(
    filters: ReviewFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<ReviewSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<ReviewWithRelations>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(reviews.organizationId, this.organizationId)];

    if (filters.tourId) {
      conditions.push(eq(reviews.tourId, filters.tourId));
    }
    if (filters.guideId) {
      conditions.push(eq(reviews.guideId, filters.guideId));
    }
    if (filters.customerId) {
      conditions.push(eq(reviews.customerId, filters.customerId));
    }
    if (filters.status) {
      conditions.push(eq(reviews.status, filters.status));
    }
    if (filters.isPublic !== undefined) {
      conditions.push(eq(reviews.isPublic, filters.isPublic));
    }
    if (filters.minRating) {
      conditions.push(gte(reviews.overallRating, filters.minRating));
    }
    if (filters.maxRating) {
      conditions.push(lte(reviews.overallRating, filters.maxRating));
    }
    if (filters.platform) {
      conditions.push(eq(reviews.platform, filters.platform));
    }
    if (filters.fromDate) {
      conditions.push(gte(reviews.createdAt, filters.fromDate));
    }
    if (filters.toDate) {
      conditions.push(lte(reviews.createdAt, filters.toDate));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(reviews[sort.field])
        : desc(reviews[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: reviews.id,
          organizationId: reviews.organizationId,
          bookingId: reviews.bookingId,
          customerId: reviews.customerId,
          tourId: reviews.tourId,
          guideId: reviews.guideId,
          overallRating: reviews.overallRating,
          tourRating: reviews.tourRating,
          guideRating: reviews.guideRating,
          valueRating: reviews.valueRating,
          comment: reviews.comment,
          highlightsLiked: reviews.highlightsLiked,
          improvementSuggestions: reviews.improvementSuggestions,
          isPublic: reviews.isPublic,
          isVerified: reviews.isVerified,
          platform: reviews.platform,
          externalReviewUrl: reviews.externalReviewUrl,
          externalReviewPosted: reviews.externalReviewPosted,
          responseText: reviews.responseText,
          respondedAt: reviews.respondedAt,
          respondedBy: reviews.respondedBy,
          status: reviews.status,
          requestSentAt: reviews.requestSentAt,
          reminderSentAt: reviews.reminderSentAt,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt,
          booking: {
            id: bookings.id,
            referenceNumber: bookings.referenceNumber,
          },
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
          },
          tour: {
            id: tours.id,
            name: tours.name,
          },
          guide: {
            id: guides.id,
            firstName: guides.firstName,
            lastName: guides.lastName,
          },
        })
        .from(reviews)
        .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
        .leftJoin(customers, eq(reviews.customerId, customers.id))
        .leftJoin(tours, eq(reviews.tourId, tours.id))
        .leftJoin(guides, eq(reviews.guideId, guides.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(reviews)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: data as ReviewWithRelations[],
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<ReviewWithRelations> {
    const result = await this.db
      .select({
        id: reviews.id,
        organizationId: reviews.organizationId,
        bookingId: reviews.bookingId,
        customerId: reviews.customerId,
        tourId: reviews.tourId,
        guideId: reviews.guideId,
        overallRating: reviews.overallRating,
        tourRating: reviews.tourRating,
        guideRating: reviews.guideRating,
        valueRating: reviews.valueRating,
        comment: reviews.comment,
        highlightsLiked: reviews.highlightsLiked,
        improvementSuggestions: reviews.improvementSuggestions,
        isPublic: reviews.isPublic,
        isVerified: reviews.isVerified,
        platform: reviews.platform,
        externalReviewUrl: reviews.externalReviewUrl,
        externalReviewPosted: reviews.externalReviewPosted,
        responseText: reviews.responseText,
        respondedAt: reviews.respondedAt,
        respondedBy: reviews.respondedBy,
        status: reviews.status,
        requestSentAt: reviews.requestSentAt,
        reminderSentAt: reviews.reminderSentAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        booking: {
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
        },
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
        },
        tour: {
          id: tours.id,
          name: tours.name,
        },
        guide: {
          id: guides.id,
          firstName: guides.firstName,
          lastName: guides.lastName,
        },
      })
      .from(reviews)
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .leftJoin(tours, eq(reviews.tourId, tours.id))
      .leftJoin(guides, eq(reviews.guideId, guides.id))
      .where(
        and(
          eq(reviews.id, id),
          eq(reviews.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new NotFoundError("Review", id);
    }

    return result[0] as ReviewWithRelations;
  }

  async getByBookingId(bookingId: string): Promise<Review | null> {
    const review = await this.db.query.reviews.findFirst({
      where: and(
        eq(reviews.bookingId, bookingId),
        eq(reviews.organizationId, this.organizationId)
      ),
    });

    return review ?? null;
  }

  async create(input: CreateReviewInput): Promise<Review> {
    // Check if review already exists for this booking
    const existing = await this.getByBookingId(input.bookingId);
    if (existing) {
      throw new Error("A review already exists for this booking");
    }

    // Validate rating values
    this.validateRating(input.overallRating, "overallRating");
    if (input.tourRating) this.validateRating(input.tourRating, "tourRating");
    if (input.guideRating) this.validateRating(input.guideRating, "guideRating");
    if (input.valueRating) this.validateRating(input.valueRating, "valueRating");

    const [review] = await this.db
      .insert(reviews)
      .values({
        organizationId: this.organizationId,
        bookingId: input.bookingId,
        customerId: input.customerId,
        tourId: input.tourId,
        guideId: input.guideId,
        overallRating: input.overallRating,
        tourRating: input.tourRating,
        guideRating: input.guideRating,
        valueRating: input.valueRating,
        comment: input.comment,
        highlightsLiked: input.highlightsLiked,
        improvementSuggestions: input.improvementSuggestions,
        isPublic: input.isPublic ?? false,
        platform: input.platform ?? "internal",
        status: "submitted",
      })
      .returning();

    if (!review) {
      throw new Error("Failed to create review");
    }

    return review;
  }

  async update(id: string, input: UpdateReviewInput): Promise<Review> {
    await this.getById(id);

    // Validate rating values if provided
    if (input.overallRating) this.validateRating(input.overallRating, "overallRating");
    if (input.tourRating) this.validateRating(input.tourRating, "tourRating");
    if (input.guideRating) this.validateRating(input.guideRating, "guideRating");
    if (input.valueRating) this.validateRating(input.valueRating, "valueRating");

    const [review] = await this.db
      .update(reviews)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviews.id, id),
          eq(reviews.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!review) {
      throw new NotFoundError("Review", id);
    }

    return review;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(reviews)
      .where(
        and(
          eq(reviews.id, id),
          eq(reviews.organizationId, this.organizationId)
        )
      );
  }

  async respond(id: string, responseText: string, respondedBy: string): Promise<Review> {
    const [review] = await this.db
      .update(reviews)
      .set({
        responseText,
        respondedAt: new Date(),
        respondedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviews.id, id),
          eq(reviews.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!review) {
      throw new NotFoundError("Review", id);
    }

    return review;
  }

  async togglePublic(id: string): Promise<Review> {
    const review = await this.getById(id);
    return this.update(id, { isPublic: !review.isPublic });
  }

  async approve(id: string): Promise<Review> {
    return this.update(id, { status: "approved" });
  }

  async reject(id: string): Promise<Review> {
    return this.update(id, { status: "rejected" });
  }

  async flag(id: string): Promise<Review> {
    return this.update(id, { status: "flagged" });
  }

  async markRequestSent(bookingId: string): Promise<void> {
    await this.db
      .update(reviews)
      .set({
        requestSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviews.bookingId, bookingId),
          eq(reviews.organizationId, this.organizationId)
        )
      );
  }

  async markReminderSent(bookingId: string): Promise<void> {
    await this.db
      .update(reviews)
      .set({
        reminderSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviews.bookingId, bookingId),
          eq(reviews.organizationId, this.organizationId)
        )
      );
  }

  async getStats(filters: { tourId?: string; guideId?: string } = {}): Promise<ReviewStats> {
    const conditions = [
      eq(reviews.organizationId, this.organizationId),
      eq(reviews.status, "submitted"),
    ];

    if (filters.tourId) {
      conditions.push(eq(reviews.tourId, filters.tourId));
    }
    if (filters.guideId) {
      conditions.push(eq(reviews.guideId, filters.guideId));
    }

    const [stats] = await this.db
      .select({
        totalReviews: count(),
        averageRating: avg(reviews.overallRating),
        averageTourRating: avg(reviews.tourRating),
        averageGuideRating: avg(reviews.guideRating),
        averageValueRating: avg(reviews.valueRating),
      })
      .from(reviews)
      .where(and(...conditions));

    // Get rating distribution
    const distribution = await this.db
      .select({
        rating: reviews.overallRating,
        count: count(),
      })
      .from(reviews)
      .where(and(...conditions))
      .groupBy(reviews.overallRating);

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d.count;
    });

    // Get pending reviews count
    const [pending] = await this.db
      .select({ count: count() })
      .from(reviews)
      .where(
        and(
          eq(reviews.organizationId, this.organizationId),
          eq(reviews.status, "pending")
        )
      );

    // Get public testimonials count
    const publicConditions = [...conditions, eq(reviews.isPublic, true)];
    const [publicCount] = await this.db
      .select({ count: count() })
      .from(reviews)
      .where(and(...publicConditions));

    return {
      totalReviews: stats?.totalReviews ?? 0,
      averageRating: stats?.averageRating ? parseFloat(String(stats.averageRating)) : 0,
      averageTourRating: stats?.averageTourRating ? parseFloat(String(stats.averageTourRating)) : null,
      averageGuideRating: stats?.averageGuideRating ? parseFloat(String(stats.averageGuideRating)) : null,
      averageValueRating: stats?.averageValueRating ? parseFloat(String(stats.averageValueRating)) : null,
      ratingDistribution,
      pendingReviews: pending?.count ?? 0,
      publicTestimonials: publicCount?.count ?? 0,
    };
  }

  async getGuideRatings(): Promise<GuideRatingStats[]> {
    const result = await this.db
      .select({
        guideId: reviews.guideId,
        guideName: sql<string>`CONCAT(${guides.firstName}, ' ', ${guides.lastName})`,
        totalReviews: count(),
        averageRating: avg(reviews.guideRating),
      })
      .from(reviews)
      .innerJoin(guides, eq(reviews.guideId, guides.id))
      .where(
        and(
          eq(reviews.organizationId, this.organizationId),
          isNotNull(reviews.guideId),
          isNotNull(reviews.guideRating)
        )
      )
      .groupBy(reviews.guideId, guides.firstName, guides.lastName)
      .orderBy(desc(avg(reviews.guideRating)));

    return result.map((r) => ({
      guideId: r.guideId!,
      guideName: r.guideName,
      totalReviews: r.totalReviews,
      averageRating: r.averageRating ? parseFloat(String(r.averageRating)) : 0,
    }));
  }

  async getTourRatings(): Promise<TourRatingStats[]> {
    const result = await this.db
      .select({
        tourId: reviews.tourId,
        tourName: tours.name,
        totalReviews: count(),
        averageRating: avg(reviews.overallRating),
      })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .where(
        and(
          eq(reviews.organizationId, this.organizationId),
          isNotNull(reviews.tourId)
        )
      )
      .groupBy(reviews.tourId, tours.name)
      .orderBy(desc(avg(reviews.overallRating)));

    return result.map((r) => ({
      tourId: r.tourId,
      tourName: r.tourName,
      totalReviews: r.totalReviews,
      averageRating: r.averageRating ? parseFloat(String(r.averageRating)) : 0,
    }));
  }

  async getPublicTestimonials(limit = 10): Promise<ReviewWithRelations[]> {
    const result = await this.getAll(
      { isPublic: true, status: "submitted" },
      { limit },
      { field: "overallRating", direction: "desc" }
    );
    return result.data;
  }

  async getRecentForTour(tourId: string, limit = 5): Promise<ReviewWithRelations[]> {
    const result = await this.getAll(
      { tourId, status: "submitted" },
      { limit },
      { field: "createdAt", direction: "desc" }
    );
    return result.data;
  }

  async getRecentForGuide(guideId: string, limit = 5): Promise<ReviewWithRelations[]> {
    const result = await this.getAll(
      { guideId, status: "submitted" },
      { limit },
      { field: "createdAt", direction: "desc" }
    );
    return result.data;
  }

  async getPendingReviewRequests(): Promise<{ bookingId: string; customerId: string; tourId: string; guideId: string | null }[]> {
    // Get completed bookings without reviews
    const result = await this.db
      .select({
        bookingId: bookings.id,
        customerId: bookings.customerId,
        tourId: sql<string>`(SELECT tour_id FROM schedules WHERE id = ${bookings.scheduleId})`,
        guideId: sql<string | null>`(SELECT guide_id FROM guide_assignments WHERE schedule_id = ${bookings.scheduleId} AND status = 'confirmed' LIMIT 1)`,
      })
      .from(bookings)
      .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "completed"),
          isNull(reviews.id)
        )
      );

    return result;
  }

  private validateRating(rating: number, field: string): void {
    if (rating < 1 || rating > 5) {
      throw new Error(`${field} must be between 1 and 5`);
    }
  }
}
