import { eq, and, desc, asc, sql, count, ilike, or, gte, lte, inArray } from "drizzle-orm";
import {
  guides,
  schedules,
  bookings,
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
} from "./types";

export interface GuideFilters {
  status?: GuideStatus;
  isPublic?: boolean;
  search?: string;
  language?: string;
}

export type GuideSortField = "lastName" | "createdAt";

export interface GuideWithStats extends Guide {
  totalSchedules?: number;
  upcomingSchedules?: number;
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

    // Count schedules where this guide has confirmed assignments (via bookings)
    const statsResult = await this.db
      .select({
        totalSchedules: sql<number>`COUNT(DISTINCT ${schedules.id})`,
        upcomingSchedules: sql<number>`COUNT(DISTINCT ${schedules.id}) FILTER (WHERE ${schedules.startsAt} > ${now.toISOString()}::timestamp AND ${schedules.status} = 'scheduled')`,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
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
      totalSchedules: Number(stats?.totalSchedules ?? 0),
      upcomingSchedules: Number(stats?.upcomingSchedules ?? 0),
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
      throw new Error("Failed to create guide");
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

  async getSchedules(
    id: string,
    dateRange?: DateRangeFilter
  ) {
    await this.getById(id);

    // Get schedules where this guide has confirmed assignments (via bookings)
    const assignmentConditions = [
      eq(guideAssignments.guideId, id),
      eq(guideAssignments.organizationId, this.organizationId),
      eq(guideAssignments.status, "confirmed"),
    ];

    const assignments = await this.db
      .select({ scheduleId: bookings.scheduleId })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .where(and(...assignmentConditions));

    const scheduleIds = [...new Set(assignments.map((a) => a.scheduleId))];

    if (scheduleIds.length === 0) {
      return [];
    }

    const scheduleConditions = [
      inArray(schedules.id, scheduleIds),
      eq(schedules.organizationId, this.organizationId),
    ];

    if (dateRange?.from) {
      scheduleConditions.push(gte(schedules.startsAt, dateRange.from));
    }
    if (dateRange?.to) {
      scheduleConditions.push(lte(schedules.startsAt, dateRange.to));
    }

    return this.db.query.schedules.findMany({
      where: and(...scheduleConditions),
      orderBy: [asc(schedules.startsAt)],
      with: {
        tour: true,
      },
    });
  }

  async getAvailableForTime(
    startsAt: Date,
    endsAt: Date,
    excludeScheduleId?: string
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

    // Check for overlapping schedules where guides have confirmed assignments
    // A schedule overlaps if it starts before our end AND ends after our start
    const scheduleConditions = [
      eq(schedules.organizationId, this.organizationId),
      eq(schedules.status, "scheduled"),
      lte(schedules.startsAt, endsAt),
      gte(schedules.endsAt, startsAt),
    ];

    if (excludeScheduleId) {
      scheduleConditions.push(sql`${schedules.id} != ${excludeScheduleId}`);
    }

    // Find guides with confirmed assignments for overlapping schedules
    const busyGuides = await this.db
      .select({ guideId: guideAssignments.guideId })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          ...scheduleConditions
        )
      );

    const busyGuideIds = new Set(
      busyGuides.map((b) => b.guideId)
    );

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
