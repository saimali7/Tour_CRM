import { eq, and, desc, asc, sql, count, ilike, or, gte, lte, inArray } from "drizzle-orm";
import {
  guides,
  bookings,
  tours,
  guideAssignments,
  type Guide,
  type GuideStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  type DateRangeFilter,
  NotFoundError,
  ConflictError,
  ServiceError,
} from "./types";

export interface GuideFilters {
  status?: GuideStatus;
  isPublic?: boolean;
  search?: string;
  language?: string;
}

export type GuideSortField = "lastName" | "createdAt";

export interface GuideWithStats extends Guide {
  totalAssignments?: number;
  upcomingAssignments?: number;
}

export interface CreateGuideInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  shortBio?: string;
  languages?: string[];
  certifications?: string[];
  availabilityNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status?: GuideStatus;
  isPublic?: boolean;
  notes?: string;
  userId?: string;
}

export interface UpdateGuideInput extends Partial<CreateGuideInput> {}

export class GuideService extends BaseService {
  async getAll(
    filters: GuideFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<GuideSortField> = { field: "lastName", direction: "asc" }
  ): Promise<PaginatedResult<Guide>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(guides.organizationId, this.organizationId)];

    if (filters.status) {
      conditions.push(eq(guides.status, filters.status));
    }
    if (filters.isPublic !== undefined) {
      conditions.push(eq(guides.isPublic, filters.isPublic));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(guides.email, `%${filters.search}%`),
          ilike(guides.firstName, `%${filters.search}%`),
          ilike(guides.lastName, `%${filters.search}%`)
        )!
      );
    }
    if (filters.language) {
      conditions.push(
        sql`${guides.languages} @> ${JSON.stringify([filters.language])}`
      );
    }

    const orderBy =
      sort.direction === "asc" ? asc(guides[sort.field]) : desc(guides[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(guides)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(guides)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<Guide> {
    const guide = await this.db.query.guides.findFirst({
      where: and(eq(guides.id, id), eq(guides.organizationId, this.organizationId)),
    });

    if (!guide) {
      throw new NotFoundError("Guide", id);
    }

    return guide;
  }

  async getByIdWithStats(id: string): Promise<GuideWithStats> {
    const guide = await this.getById(id);

    const now = new Date();
    const nowDateStr = now.toISOString().split("T")[0];

    // Count confirmed assignments for this guide
    const statsResult = await this.db
      .select({
        totalAssignments: sql<number>`COUNT(*)`,
        upcomingAssignments: sql<number>`COUNT(*) FILTER (WHERE ${bookings.bookingDate}::text >= ${nowDateStr})`,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .where(
        and(
          eq(guideAssignments.guideId, id),
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed")
        )
      );

    const stats = statsResult[0];

    return {
      ...guide,
      totalAssignments: Number(stats?.totalAssignments ?? 0),
      upcomingAssignments: Number(stats?.upcomingAssignments ?? 0),
    };
  }

  async getByEmail(email: string): Promise<Guide | null> {
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.email, email.toLowerCase()),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    return guide || null;
  }

  async create(input: CreateGuideInput): Promise<Guide> {
    const email = input.email.toLowerCase();

    const existing = await this.getByEmail(email);
    if (existing) {
      throw new ConflictError(`Guide with email "${email}" already exists`);
    }

    const [guide] = await this.db
      .insert(guides)
      .values({
        organizationId: this.organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        bio: input.bio,
        shortBio: input.shortBio,
        languages: input.languages || ["en"],
        certifications: input.certifications,
        availabilityNotes: input.availabilityNotes,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        status: input.status || "active",
        isPublic: input.isPublic,
        notes: input.notes,
        userId: input.userId,
      })
      .returning();

    if (!guide) {
      throw new ServiceError("Failed to create guide", "CREATE_FAILED", 500);
    }

    return guide;
  }

  async update(id: string, input: UpdateGuideInput): Promise<Guide> {
    await this.getById(id);

    if (input.email) {
      const email = input.email.toLowerCase();
      const existing = await this.db.query.guides.findFirst({
        where: and(
          eq(guides.email, email),
          eq(guides.organizationId, this.organizationId),
          sql`${guides.id} != ${id}`
        ),
      });

      if (existing) {
        throw new ConflictError(`Guide with email "${email}" already exists`);
      }

      input.email = email;
    }

    const [guide] = await this.db
      .update(guides)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(guides.id, id), eq(guides.organizationId, this.organizationId)))
      .returning();

    if (!guide) {
      throw new NotFoundError("Guide", id);
    }

    return guide;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(guides)
      .where(and(eq(guides.id, id), eq(guides.organizationId, this.organizationId)));
  }

  /**
   * Get bookings where this guide has confirmed assignments
   */
  async getAssignedBookings(
    id: string,
    dateRange?: DateRangeFilter
  ) {
    await this.getById(id);

    // Get booking IDs where this guide has confirmed assignments
    const assignmentConditions = [
      eq(guideAssignments.guideId, id),
      eq(guideAssignments.organizationId, this.organizationId),
      eq(guideAssignments.status, "confirmed"),
    ];

    const assignments = await this.db
      .select({ bookingId: guideAssignments.bookingId })
      .from(guideAssignments)
      .where(and(...assignmentConditions));

    const bookingIds = [...new Set(assignments.map((a) => a.bookingId))];

    if (bookingIds.length === 0) {
      return [];
    }

    const bookingConditions = [
      inArray(bookings.id, bookingIds),
      eq(bookings.organizationId, this.organizationId),
    ];

    if (dateRange?.from) {
      bookingConditions.push(gte(bookings.bookingDate, dateRange.from));
    }
    if (dateRange?.to) {
      bookingConditions.push(lte(bookings.bookingDate, dateRange.to));
    }

    return this.db.query.bookings.findMany({
      where: and(...bookingConditions),
      orderBy: [asc(bookings.bookingDate), asc(bookings.bookingTime)],
      with: {
        tour: true,
      },
    });
  }

  /**
   * Get guides available for a specific time window.
   * Checks for overlapping tour run assignments.
   */
  async getAvailableForTime(
    startsAt: Date,
    endsAt: Date,
    excludeTourRun?: { tourId: string; date: Date; time: string }
  ): Promise<Guide[]> {
    const activeGuides = await this.db
      .select()
      .from(guides)
      .where(
        and(
          eq(guides.organizationId, this.organizationId),
          eq(guides.status, "active")
        )
      );

    // Get all confirmed guide assignments with their booking info
    const confirmedAssignments = await this.db
      .select({
        guideId: guideAssignments.guideId,
        tourId: bookings.tourId,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        tourDurationMinutes: tours.durationMinutes,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      );

    // Build exclude key for tour run
    const excludeKey = excludeTourRun
      ? `${excludeTourRun.tourId}|${excludeTourRun.date.toISOString().split("T")[0]}|${excludeTourRun.time}`
      : null;

    // Find busy guides by checking for time overlaps
    const busyGuideIds = new Set<string>();

    for (const assignment of confirmedAssignments) {
      if (!assignment.guideId || !assignment.bookingDate || !assignment.bookingTime) continue;

      // Skip if this is the same tour run we're checking for
      const tourRunKey = `${assignment.tourId}|${assignment.bookingDate.toISOString().split("T")[0]}|${assignment.bookingTime}`;
      if (excludeKey && tourRunKey === excludeKey) continue;

      // Calculate assignment time window
      const [hours, minutes] = assignment.bookingTime.split(":").map(Number);
      const assignmentStart = new Date(assignment.bookingDate);
      assignmentStart.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const durationMinutes = assignment.tourDurationMinutes || 60;
      const assignmentEnd = new Date(assignmentStart.getTime() + durationMinutes * 60 * 1000);

      // Check for time overlap: startA < endB AND endA > startB
      if (assignmentStart < endsAt && assignmentEnd > startsAt) {
        busyGuideIds.add(assignment.guideId);
      }
    }

    return activeGuides.filter((g) => !busyGuideIds.has(g.id));
  }

  async deactivate(id: string): Promise<Guide> {
    return this.update(id, { status: "inactive" });
  }

  async activate(id: string): Promise<Guide> {
    return this.update(id, { status: "active" });
  }

  async setOnLeave(id: string): Promise<Guide> {
    return this.update(id, { status: "on_leave" });
  }

  async getAllLanguages(): Promise<string[]> {
    const result = await this.db
      .select({ languages: guides.languages })
      .from(guides)
      .where(eq(guides.organizationId, this.organizationId));

    const allLanguages = result.flatMap((r) => r.languages || []);
    return [...new Set(allLanguages)].sort();
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    onLeave: number;
    public: number;
  }> {
    const statsResult = await this.db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${guides.status} = 'active')`,
        inactive: sql<number>`COUNT(*) FILTER (WHERE ${guides.status} = 'inactive')`,
        onLeave: sql<number>`COUNT(*) FILTER (WHERE ${guides.status} = 'on_leave')`,
        public: sql<number>`COUNT(*) FILTER (WHERE ${guides.isPublic} = true)`,
      })
      .from(guides)
      .where(eq(guides.organizationId, this.organizationId));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      active: Number(stats?.active ?? 0),
      inactive: Number(stats?.inactive ?? 0),
      onLeave: Number(stats?.onLeave ?? 0),
      public: Number(stats?.public ?? 0),
    };
  }
}
