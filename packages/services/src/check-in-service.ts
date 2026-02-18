import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@tour/database";
import {
  bookingParticipants,
  bookings,
  tours,
  organizations,
} from "@tour/database/schema";
import type { CheckedInStatus } from "@tour/database/schema";
import { type ServiceContext, NotFoundError } from "./types";
import { formatDateOnlyKey, getNowDateKeyInTimeZone, normalizeTimeZone, parseDateOnlyKeyToLocalDate } from "./lib/date-time";

/**
 * Tour run check-in status result
 */
export interface TourRunCheckInStatus {
  tourId: string;
  date: Date;
  time: string;
  total: number;
  checkedIn: number;
  noShows: number;
  pending: number;
  percentComplete: number;
  participants: Array<{
    id: string;
    bookingId: string;
    bookingReference: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    type: string;
    checkedIn: string | null;
    checkedInAt: Date | null;
    checkedInBy: string | null;
  }>;
}

export class CheckInService {
  private organizationTimeZoneCache?: Promise<string>;

  constructor(private ctx: ServiceContext) {}

  private async getOrganizationTimezone(): Promise<string> {
    if (!this.organizationTimeZoneCache) {
      this.organizationTimeZoneCache = (async () => {
        if (this.ctx.timezone) {
          return normalizeTimeZone(this.ctx.timezone, "UTC");
        }

        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, this.ctx.organizationId),
          columns: { timezone: true },
        });

        return normalizeTimeZone(org?.timezone, "UTC");
      })();
    }

    return this.organizationTimeZoneCache;
  }

  private async getTodayDateKey(): Promise<string> {
    const timezone = await this.getOrganizationTimezone();
    return getNowDateKeyInTimeZone(timezone);
  }

  // ==========================================
  // Check-In Operations
  // ==========================================

  async checkInParticipant(
    participantId: string,
    checkedInBy: string,
    status: CheckedInStatus = "yes"
  ) {
    const results = await db
      .update(bookingParticipants)
      .set({
        checkedIn: status,
        checkedInAt: status === "no" ? null : new Date(),
        checkedInBy: status === "no" ? null : checkedInBy,
      })
      .where(
        and(
          eq(bookingParticipants.id, participantId),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  async checkInAllForBooking(
    bookingId: string,
    checkedInBy: string,
    status: CheckedInStatus = "yes"
  ) {
    const results = await db
      .update(bookingParticipants)
      .set({
        checkedIn: status,
        checkedInAt: status === "no" ? null : new Date(),
        checkedInBy: status === "no" ? null : checkedInBy,
      })
      .where(
        and(
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results;
  }

  async markNoShow(participantId: string, checkedInBy: string) {
    return this.checkInParticipant(participantId, checkedInBy, "no_show");
  }

  async undoCheckIn(participantId: string) {
    const results = await db
      .update(bookingParticipants)
      .set({
        checkedIn: "no",
        checkedInAt: null,
        checkedInBy: null,
      })
      .where(
        and(
          eq(bookingParticipants.id, participantId),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  // ==========================================
  // Bulk Operations
  // ==========================================

  async bulkCheckIn(
    participantIds: string[],
    checkedInBy: string,
    status: CheckedInStatus = "yes"
  ) {
    if (participantIds.length === 0) return [];

    const results = await db
      .update(bookingParticipants)
      .set({
        checkedIn: status,
        checkedInAt: status === "no" ? null : new Date(),
        checkedInBy: status === "no" ? null : checkedInBy,
      })
      .where(
        and(
          inArray(bookingParticipants.id, participantIds),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results;
  }

  // ==========================================
  // Tour Run Check-In Status (availability-based model)
  // ==========================================

  /**
   * @deprecated Use getTourRunCheckInStatus instead
   * This method is kept for backwards compatibility but schedules table has been removed
   */
  async getScheduleCheckInStatus(_scheduleId: string) {
    // Return empty result - schedules table removed
    return {
      total: 0,
      checkedIn: 0,
      noShows: 0,
      pending: 0,
      percentComplete: 0,
      participants: [],
    };
  }

  async getBookingCheckInStatus(bookingId: string) {
    const participants = await db
      .select()
      .from(bookingParticipants)
      .where(
        and(
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      );

    const total = participants.length;
    const checkedIn = participants.filter((p) => p.checkedIn === "yes").length;
    const noShows = participants.filter((p) => p.checkedIn === "no_show").length;
    const pending = total - checkedIn - noShows;

    return {
      total,
      checkedIn,
      noShows,
      pending,
      allCheckedIn: checkedIn === total,
      participants,
    };
  }

  // ==========================================
  // Today's Check-Ins
  // ==========================================

  /**
   * Get today's check-in summary using availability-based booking model
   * Groups bookings by tour run (tourId + date + time)
   */
  async getTodaysCheckInSummary() {
    const todayStr = await this.getTodayDateKey();
    const today = parseDateOnlyKeyToLocalDate(todayStr);

    // Get today's bookings with check-in status
    const todayBookings = await db
      .select({
        booking: bookings,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          sql`${bookings.bookingDate}::text = ${todayStr}`,
          eq(bookings.status, "confirmed")
        )
      )
      .orderBy(bookings.bookingTime);

    // Group by tour run (tourId + time)
    const tourRunsMap = new Map<string, {
      tourRunId: string;
      tourId: string;
      tourName: string;
      bookingTime: string | null;
      bookingIds: string[];
    }>();

    for (const { booking, tour } of todayBookings) {
      const key = `${tour.id}-${booking.bookingTime}`;
      const existing = tourRunsMap.get(key);
      if (existing) {
        existing.bookingIds.push(booking.id);
      } else {
        tourRunsMap.set(key, {
          tourRunId: key,
          tourId: tour.id,
          tourName: tour.name,
          bookingTime: booking.bookingTime,
          bookingIds: [booking.id],
        });
      }
    }

    // Get check-in stats for each tour run
    const summaries = await Promise.all(
      Array.from(tourRunsMap.values()).map(async (tourRun) => {
        const status = await this.getTourRunCheckInStatus(
          tourRun.tourId,
          today,
          tourRun.bookingTime || "00:00"
        );

        // Create startsAt from date and time
        const startsAt = new Date(today);
        if (tourRun.bookingTime) {
          const [hours, minutes] = tourRun.bookingTime.split(":").map(Number);
          startsAt.setHours(hours || 0, minutes || 0, 0, 0);
        }

        return {
          scheduleId: tourRun.tourRunId, // Virtual schedule ID for backwards compat
          tourName: tourRun.tourName,
          startsAt,
          total: status.total,
          checkedIn: status.checkedIn,
          noShows: status.noShows,
          pending: status.pending,
          percentComplete: status.percentComplete,
          participants: status.participants,
        };
      })
    );

    // Overall totals
    const totals = summaries.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        checkedIn: acc.checkedIn + s.checkedIn,
        noShows: acc.noShows + s.noShows,
        pending: acc.pending + s.pending,
      }),
      { total: 0, checkedIn: 0, noShows: 0, pending: 0 }
    );

    return {
      schedules: summaries,
      totals: {
        ...totals,
        percentComplete:
          totals.total > 0
            ? Math.round((totals.checkedIn / totals.total) * 100)
            : 0,
      },
    };
  }

  // ==========================================
  // Auto-Complete Bookings
  // ==========================================

  /**
   * @deprecated Use completeBookingsForTourRun instead
   * This method is kept for backwards compatibility but schedules table has been removed
   */
  async completeBookingsForSchedule(_scheduleId: string) {
    // Return empty result - schedules table removed
    // Use completeBookingsForTourRun instead
    return {
      completed: 0,
      noShows: 0,
    };
  }

  // ==========================================
  // Tour Run Check-In (Availability-based model)
  // ==========================================

  /**
   * Get check-in status for a tour run (tourId + date + time)
   */
  async getTourRunCheckInStatus(
    tourId: string,
    date: Date,
    time: string
  ): Promise<TourRunCheckInStatus> {
    // Format date for SQL comparison
    const dateStr = formatDateOnlyKey(date);

    // Get all bookings and their participants for this tour run
    const participants = await db
      .select({
        participant: bookingParticipants,
        booking: {
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
          status: bookings.status,
        },
      })
      .from(bookingParticipants)
      .innerJoin(bookings, eq(bookingParticipants.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          eq(bookings.status, "confirmed")
        )
      );

    const total = participants.length;
    const checkedIn = participants.filter(
      (p) => p.participant.checkedIn === "yes"
    ).length;
    const noShows = participants.filter(
      (p) => p.participant.checkedIn === "no_show"
    ).length;
    const pending = total - checkedIn - noShows;

    return {
      tourId,
      date,
      time,
      total,
      checkedIn,
      noShows,
      pending,
      percentComplete: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
      participants: participants.map((p) => ({
        id: p.participant.id,
        bookingId: p.booking.id,
        bookingReference: p.booking.referenceNumber,
        firstName: p.participant.firstName,
        lastName: p.participant.lastName,
        email: p.participant.email,
        phone: p.participant.phone,
        type: p.participant.type,
        checkedIn: p.participant.checkedIn,
        checkedInAt: p.participant.checkedInAt,
        checkedInBy: p.participant.checkedInBy,
      })),
    };
  }

  /**
   * Check in all participants for a booking within a tour run
   * Validates that the booking belongs to the specified tour run
   */
  async checkInBookingForTourRun(
    tourId: string,
    date: Date,
    time: string,
    bookingId: string,
    checkedInBy: string,
    status: CheckedInStatus = "yes"
  ) {
    // Format date for SQL comparison
    const dateStr = formatDateOnlyKey(date);

    // First verify the booking belongs to this tour run
    const booking = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time)
        )
      )
      .limit(1);

    if (booking.length === 0) {
      throw new NotFoundError("Booking");
    }

    // Check in all participants for this booking
    const results = await db
      .update(bookingParticipants)
      .set({
        checkedIn: status,
        checkedInAt: status === "no" ? null : new Date(),
        checkedInBy: status === "no" ? null : checkedInBy,
      })
      .where(
        and(
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results;
  }

  /**
   * Auto-complete bookings for a tour run based on check-in status
   */
  async completeBookingsForTourRun(tourId: string, date: Date, time: string) {
    const checkInStatus = await this.getTourRunCheckInStatus(tourId, date, time);

    // Group by booking
    const bookingGroups = new Map<
      string,
      { total: number; checkedIn: number; noShows: number }
    >();

    for (const p of checkInStatus.participants) {
      const current = bookingGroups.get(p.bookingId) || {
        total: 0,
        checkedIn: 0,
        noShows: 0,
      };
      current.total++;
      if (p.checkedIn === "yes") current.checkedIn++;
      if (p.checkedIn === "no_show") current.noShows++;
      bookingGroups.set(p.bookingId, current);
    }

    // Update bookings where everyone attended or is no-show
    const completedBookingIds: string[] = [];
    const noShowBookingIds: string[] = [];

    for (const [bookingId, stats] of bookingGroups) {
      if (stats.checkedIn + stats.noShows === stats.total) {
        if (stats.noShows === stats.total) {
          // All no-shows
          noShowBookingIds.push(bookingId);
        } else {
          // At least some attended
          completedBookingIds.push(bookingId);
        }
      }
    }

    // Update completed bookings
    if (completedBookingIds.length > 0) {
      await db
        .update(bookings)
        .set({ status: "completed", updatedAt: new Date() })
        .where(
          and(
            inArray(bookings.id, completedBookingIds),
            eq(bookings.organizationId, this.ctx.organizationId)
          )
        );
    }

    // Update no-show bookings
    if (noShowBookingIds.length > 0) {
      await db
        .update(bookings)
        .set({ status: "no_show", updatedAt: new Date() })
        .where(
          and(
            inArray(bookings.id, noShowBookingIds),
            eq(bookings.organizationId, this.ctx.organizationId)
          )
        );
    }

    return {
      completed: completedBookingIds.length,
      noShows: noShowBookingIds.length,
    };
  }
}
