import { eq, and, desc, asc, gte, lte, sql, count } from "drizzle-orm";
import {
  schedules,
  tours,
  guides,
  type Schedule,
  type ScheduleStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  type DateRangeFilter,
  NotFoundError,
  ValidationError,
} from "./types";

export interface ScheduleFilters {
  tourId?: string;
  guideId?: string;
  status?: ScheduleStatus;
  dateRange?: DateRangeFilter;
  hasAvailability?: boolean;
}

export type ScheduleSortField = "startsAt" | "createdAt";

export interface ScheduleWithRelations extends Schedule {
  tour?: {
    id: string;
    name: string;
    slug: string;
    durationMinutes: number;
    basePrice: string;
  };
  guide?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface CreateScheduleInput {
  tourId: string;
  guideId?: string;
  startsAt: Date;
  endsAt?: Date;
  maxParticipants?: number;
  price?: string;
  currency?: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  status?: ScheduleStatus;
  internalNotes?: string;
  publicNotes?: string;
}

export interface UpdateScheduleInput extends Partial<Omit<CreateScheduleInput, "tourId">> {}

export interface BulkCreateScheduleInput {
  tourId: string;
  guideId?: string;
  dates: Date[];
  startTime: string;
  maxParticipants?: number;
  price?: string;
}

export interface AutoGenerateScheduleInput {
  tourId: string;
  guideId?: string;
  startDate: Date;
  endDate: Date;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  times: string[]; // Array of times like ["09:00", "14:00"]
  maxParticipants?: number;
  price?: string;
  skipExisting?: boolean; // Don't create duplicates
}

export class ScheduleService extends BaseService {
  async getAll(
    filters: ScheduleFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<ScheduleSortField> = { field: "startsAt", direction: "asc" }
  ): Promise<PaginatedResult<ScheduleWithRelations>> {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(schedules.organizationId, this.organizationId)];

    if (filters.tourId) {
      conditions.push(eq(schedules.tourId, filters.tourId));
    }
    if (filters.guideId) {
      conditions.push(eq(schedules.guideId, filters.guideId));
    }
    if (filters.status) {
      conditions.push(eq(schedules.status, filters.status));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(schedules.startsAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(schedules.startsAt, filters.dateRange.to));
    }
    if (filters.hasAvailability) {
      conditions.push(
        sql`${schedules.bookedCount} < ${schedules.maxParticipants}`
      );
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(schedules[sort.field])
        : desc(schedules[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          schedule: schedules,
          tour: {
            id: tours.id,
            name: tours.name,
            slug: tours.slug,
            durationMinutes: tours.durationMinutes,
            basePrice: tours.basePrice,
          },
          guide: {
            id: guides.id,
            firstName: guides.firstName,
            lastName: guides.lastName,
            email: guides.email,
          },
        })
        .from(schedules)
        .leftJoin(tours, eq(schedules.tourId, tours.id))
        .leftJoin(guides, eq(schedules.guideId, guides.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schedules)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    const formattedData = data.map((row) => ({
      ...row.schedule,
      tour: row.tour?.id ? row.tour : undefined,
      guide: row.guide?.id ? row.guide : null,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<ScheduleWithRelations> {
    const result = await this.db
      .select({
        schedule: schedules,
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          durationMinutes: tours.durationMinutes,
          basePrice: tours.basePrice,
        },
        guide: {
          id: guides.id,
          firstName: guides.firstName,
          lastName: guides.lastName,
          email: guides.email,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .leftJoin(guides, eq(schedules.guideId, guides.id))
      .where(
        and(eq(schedules.id, id), eq(schedules.organizationId, this.organizationId))
      )
      .limit(1);

    const row = result[0];
    if (!row) {
      throw new NotFoundError("Schedule", id);
    }

    return {
      ...row.schedule,
      tour: row.tour?.id ? row.tour : undefined,
      guide: row.guide?.id ? row.guide : null,
    };
  }

  async create(input: CreateScheduleInput): Promise<Schedule> {
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, input.tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", input.tourId);
    }

    if (input.guideId) {
      const guide = await this.db.query.guides.findFirst({
        where: and(
          eq(guides.id, input.guideId),
          eq(guides.organizationId, this.organizationId)
        ),
      });

      if (!guide) {
        throw new NotFoundError("Guide", input.guideId);
      }
    }

    const endsAt =
      input.endsAt ||
      new Date(input.startsAt.getTime() + tour.durationMinutes * 60 * 1000);

    const [schedule] = await this.db
      .insert(schedules)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        guideId: input.guideId,
        startsAt: input.startsAt,
        endsAt,
        maxParticipants: input.maxParticipants || tour.maxParticipants,
        price: input.price,
        currency: input.currency,
        meetingPoint: input.meetingPoint,
        meetingPointDetails: input.meetingPointDetails,
        status: input.status || "scheduled",
        internalNotes: input.internalNotes,
        publicNotes: input.publicNotes,
        bookedCount: 0,
      })
      .returning();

    if (!schedule) {
      throw new Error("Failed to create schedule");
    }

    return schedule;
  }

  async bulkCreate(input: BulkCreateScheduleInput): Promise<Schedule[]> {
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, input.tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", input.tourId);
    }

    const timeParts = input.startTime.split(":");
    const hours = parseInt(timeParts[0] ?? "0", 10);
    const minutes = parseInt(timeParts[1] ?? "0", 10);

    const scheduleValues = input.dates.map((date) => {
      const startsAt = new Date(date);
      startsAt.setHours(hours, minutes, 0, 0);

      const endsAt = new Date(
        startsAt.getTime() + tour.durationMinutes * 60 * 1000
      );

      return {
        organizationId: this.organizationId,
        tourId: input.tourId,
        guideId: input.guideId,
        startsAt,
        endsAt,
        maxParticipants: input.maxParticipants || tour.maxParticipants,
        price: input.price,
        currency: tour.currency,
        status: "scheduled" as const,
        bookedCount: 0,
      };
    });

    const created = await this.db
      .insert(schedules)
      .values(scheduleValues)
      .returning();

    return created;
  }

  async update(id: string, input: UpdateScheduleInput): Promise<Schedule> {
    await this.getById(id);

    if (input.guideId) {
      const guide = await this.db.query.guides.findFirst({
        where: and(
          eq(guides.id, input.guideId),
          eq(guides.organizationId, this.organizationId)
        ),
      });

      if (!guide) {
        throw new NotFoundError("Guide", input.guideId);
      }
    }

    const [schedule] = await this.db
      .update(schedules)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schedules.id, id), eq(schedules.organizationId, this.organizationId))
      )
      .returning();

    if (!schedule) {
      throw new NotFoundError("Schedule", id);
    }

    return schedule;
  }

  async delete(id: string): Promise<void> {
    const schedule = await this.getById(id);

    if (schedule.bookedCount && schedule.bookedCount > 0) {
      throw new ValidationError(
        "Cannot delete schedule with existing bookings. Cancel the bookings first."
      );
    }

    await this.db
      .delete(schedules)
      .where(
        and(eq(schedules.id, id), eq(schedules.organizationId, this.organizationId))
      );
  }

  async cancel(id: string): Promise<Schedule> {
    return this.update(id, { status: "cancelled" });
  }

  async getAvailableForTour(
    tourId: string,
    dateRange?: DateRangeFilter
  ): Promise<Schedule[]> {
    const conditions = [
      eq(schedules.organizationId, this.organizationId),
      eq(schedules.tourId, tourId),
      eq(schedules.status, "scheduled"),
      sql`${schedules.bookedCount} < ${schedules.maxParticipants}`,
      gte(schedules.startsAt, new Date()),
    ];

    if (dateRange?.from) {
      conditions.push(gte(schedules.startsAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(schedules.startsAt, dateRange.to));
    }

    return this.db
      .select()
      .from(schedules)
      .where(and(...conditions))
      .orderBy(asc(schedules.startsAt));
  }

  async getForGuide(
    guideId: string,
    dateRange?: DateRangeFilter
  ): Promise<ScheduleWithRelations[]> {
    const result = await this.getAll(
      {
        guideId,
        dateRange,
        status: "scheduled",
      },
      { limit: 100 }
    );

    return result.data;
  }

  async checkAvailability(
    id: string,
    participants: number
  ): Promise<{
    available: boolean;
    remainingSpots: number;
    reason?: string;
  }> {
    const schedule = await this.getById(id);

    // Check if schedule is in valid status
    if (schedule.status !== "scheduled") {
      return {
        available: false,
        remainingSpots: 0,
        reason: `Schedule is ${schedule.status}`,
      };
    }

    // Check capacity
    const booked = schedule.bookedCount || 0;
    const remainingSpots = schedule.maxParticipants - booked;

    if (remainingSpots < participants) {
      return {
        available: false,
        remainingSpots,
        reason: remainingSpots === 0
          ? "This tour is fully booked"
          : `Only ${remainingSpots} spots remaining`,
      };
    }

    // Check if schedule is in the past
    if (new Date(schedule.startsAt) <= new Date()) {
      return {
        available: false,
        remainingSpots,
        reason: "This tour has already started or passed",
      };
    }

    return { available: true, remainingSpots };
  }

  /**
   * Check availability with booking window settings
   */
  async checkAvailabilityWithSettings(
    id: string,
    participants: number,
    bookingWindowSettings?: {
      minimumNoticeHours?: number;
      maximumAdvanceDays?: number;
      allowSameDayBooking?: boolean;
      sameDayCutoffTime?: string;
    }
  ): Promise<{
    available: boolean;
    remainingSpots: number;
    reason?: string;
  }> {
    const basicCheck = await this.checkAvailability(id, participants);
    if (!basicCheck.available) {
      return basicCheck;
    }

    if (!bookingWindowSettings) {
      return basicCheck;
    }

    const schedule = await this.getById(id);
    const now = new Date();
    const startsAt = new Date(schedule.startsAt);

    // Check minimum notice
    if (bookingWindowSettings.minimumNoticeHours) {
      const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart < bookingWindowSettings.minimumNoticeHours) {
        return {
          available: false,
          remainingSpots: basicCheck.remainingSpots,
          reason: `Bookings must be made at least ${bookingWindowSettings.minimumNoticeHours} hours in advance`,
        };
      }
    }

    // Check maximum advance days
    if (bookingWindowSettings.maximumAdvanceDays && bookingWindowSettings.maximumAdvanceDays > 0) {
      const daysUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilStart > bookingWindowSettings.maximumAdvanceDays) {
        return {
          available: false,
          remainingSpots: basicCheck.remainingSpots,
          reason: `Bookings can only be made up to ${bookingWindowSettings.maximumAdvanceDays} days in advance`,
        };
      }
    }

    // Check same-day booking
    const isToday =
      startsAt.getFullYear() === now.getFullYear() &&
      startsAt.getMonth() === now.getMonth() &&
      startsAt.getDate() === now.getDate();

    if (isToday) {
      if (!bookingWindowSettings.allowSameDayBooking) {
        return {
          available: false,
          remainingSpots: basicCheck.remainingSpots,
          reason: "Same-day bookings are not allowed",
        };
      }

      // Check cutoff time
      if (bookingWindowSettings.sameDayCutoffTime) {
        const [cutoffHours, cutoffMinutes] = bookingWindowSettings.sameDayCutoffTime
          .split(":")
          .map(Number);
        const cutoffTime = new Date(now);
        cutoffTime.setHours(cutoffHours || 0, cutoffMinutes || 0, 0, 0);

        if (now >= cutoffTime) {
          return {
            available: false,
            remainingSpots: basicCheck.remainingSpots,
            reason: `Same-day booking cutoff time (${bookingWindowSettings.sameDayCutoffTime}) has passed`,
          };
        }
      }
    }

    return basicCheck;
  }

  /**
   * Auto-close schedule when capacity is reached
   */
  async checkAndUpdateCapacityStatus(id: string): Promise<void> {
    const schedule = await this.getById(id);
    const booked = schedule.bookedCount || 0;

    // If at capacity and still scheduled, we keep it scheduled but mark as full
    // The availability check will handle preventing bookings
    // This method is mainly for logging/notification purposes
    if (booked >= schedule.maxParticipants && schedule.status === "scheduled") {
      // Could emit an event here for notifications
      // For now, we just return - the schedule stays "scheduled" but has no availability
    }
  }

  async incrementBookedCount(id: string, count: number): Promise<void> {
    await this.db
      .update(schedules)
      .set({
        bookedCount: sql`${schedules.bookedCount} + ${count}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schedules.id, id), eq(schedules.organizationId, this.organizationId))
      );
  }

  async decrementBookedCount(id: string, count: number): Promise<void> {
    await this.db
      .update(schedules)
      .set({
        bookedCount: sql`GREATEST(0, ${schedules.bookedCount} - ${count})`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schedules.id, id), eq(schedules.organizationId, this.organizationId))
      );
  }

  async getStats(dateRange?: DateRangeFilter): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    totalCapacity: number;
    totalBooked: number;
    utilizationRate: number;
  }> {
    const conditions = [eq(schedules.organizationId, this.organizationId)];

    if (dateRange?.from) {
      conditions.push(gte(schedules.startsAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(schedules.startsAt, dateRange.to));
    }

    const statsResult = await this.db
      .select({
        total: count(),
        scheduled: sql<number>`COUNT(*) FILTER (WHERE ${schedules.status} = 'scheduled')`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${schedules.status} = 'completed')`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${schedules.status} = 'cancelled')`,
        totalCapacity: sql<number>`COALESCE(SUM(${schedules.maxParticipants}), 0)`,
        totalBooked: sql<number>`COALESCE(SUM(${schedules.bookedCount}), 0)`,
      })
      .from(schedules)
      .where(and(...conditions));

    const stats = statsResult[0];
    const totalCapacity = Number(stats?.totalCapacity ?? 0);
    const totalBooked = Number(stats?.totalBooked ?? 0);
    const utilizationRate =
      totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

    return {
      total: stats?.total ?? 0,
      scheduled: Number(stats?.scheduled ?? 0),
      completed: Number(stats?.completed ?? 0),
      cancelled: Number(stats?.cancelled ?? 0),
      totalCapacity,
      totalBooked,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };
  }

  /**
   * Auto-generate schedules based on a recurring pattern
   */
  async autoGenerate(input: AutoGenerateScheduleInput): Promise<{
    created: Schedule[];
    skipped: number;
  }> {
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, input.tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", input.tourId);
    }

    if (input.guideId) {
      const guide = await this.db.query.guides.findFirst({
        where: and(
          eq(guides.id, input.guideId),
          eq(guides.organizationId, this.organizationId)
        ),
      });

      if (!guide) {
        throw new NotFoundError("Guide", input.guideId);
      }
    }

    // Generate all dates between start and end that match the days of week
    const dates: Date[] = [];
    const currentDate = new Date(input.startDate);
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (input.daysOfWeek.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate schedule values for all dates and times
    const schedulesToCreate: Array<{
      organizationId: string;
      tourId: string;
      guideId?: string;
      startsAt: Date;
      endsAt: Date;
      maxParticipants: number;
      price?: string;
      currency: string | null;
      status: "scheduled";
      bookedCount: number;
    }> = [];

    let skipped = 0;

    // Get existing schedules if we need to skip duplicates
    let existingSchedules: Schedule[] = [];
    if (input.skipExisting) {
      existingSchedules = await this.db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.organizationId, this.organizationId),
            eq(schedules.tourId, input.tourId),
            gte(schedules.startsAt, input.startDate),
            lte(schedules.startsAt, endDate)
          )
        );
    }

    for (const date of dates) {
      for (const time of input.times) {
        const timeParts = time.split(":");
        const hours = parseInt(timeParts[0] ?? "0", 10);
        const minutes = parseInt(timeParts[1] ?? "0", 10);

        const startsAt = new Date(date);
        startsAt.setHours(hours, minutes, 0, 0);

        // Check if we should skip this schedule
        if (input.skipExisting) {
          const exists = existingSchedules.some((s) => {
            const existingStart = new Date(s.startsAt);
            return (
              existingStart.getFullYear() === startsAt.getFullYear() &&
              existingStart.getMonth() === startsAt.getMonth() &&
              existingStart.getDate() === startsAt.getDate() &&
              existingStart.getHours() === startsAt.getHours() &&
              existingStart.getMinutes() === startsAt.getMinutes()
            );
          });

          if (exists) {
            skipped++;
            continue;
          }
        }

        const endsAt = new Date(
          startsAt.getTime() + tour.durationMinutes * 60 * 1000
        );

        schedulesToCreate.push({
          organizationId: this.organizationId,
          tourId: input.tourId,
          guideId: input.guideId,
          startsAt,
          endsAt,
          maxParticipants: input.maxParticipants || tour.maxParticipants,
          price: input.price,
          currency: tour.currency,
          status: "scheduled" as const,
          bookedCount: 0,
        });
      }
    }

    if (schedulesToCreate.length === 0) {
      return { created: [], skipped };
    }

    const created = await this.db
      .insert(schedules)
      .values(schedulesToCreate)
      .returning();

    return { created, skipped };
  }

  /**
   * Preview auto-generate without creating
   */
  async previewAutoGenerate(input: AutoGenerateScheduleInput): Promise<{
    count: number;
    dates: { date: string; times: string[] }[];
    existingCount: number;
  }> {
    // Generate all dates between start and end that match the days of week
    const dateMap = new Map<string, string[]>();
    const currentDate = new Date(input.startDate);
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (input.daysOfWeek.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split("T")[0]!;
        dateMap.set(dateStr, [...input.times]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count existing if needed
    let existingCount = 0;
    if (input.skipExisting) {
      const existing = await this.db
        .select({ total: count() })
        .from(schedules)
        .where(
          and(
            eq(schedules.organizationId, this.organizationId),
            eq(schedules.tourId, input.tourId),
            gte(schedules.startsAt, input.startDate),
            lte(schedules.startsAt, endDate)
          )
        );
      existingCount = existing[0]?.total ?? 0;
    }

    const dates = Array.from(dateMap.entries()).map(([date, times]) => ({
      date,
      times,
    }));

    return {
      count: dates.length * input.times.length,
      dates,
      existingCount,
    };
  }
}
