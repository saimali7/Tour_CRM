import { eq, and, gte, lte, desc, inArray, sql, asc } from "drizzle-orm";
import {
  tours,
  guides,
  bookings,
  customers,
  guideAssignments,
  type BookingParticipant,
  type Tour,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError } from "./types";

export interface ManifestParticipant {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: "adult" | "child" | "infant";
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  notes: string | null;
}

export interface ManifestBooking {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  adultCount: number;
  childCount: number;
  infantCount: number;
  totalParticipants: number;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  paymentStatus: string;
  total: string;
  currency: string;
  participants: ManifestParticipant[];
}

export interface ScheduleManifest {
  schedule: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
    status: string;
    maxParticipants: number;
    bookedCount: number;
  };
  tour: {
    id: string;
    name: string;
    slug: string;
    durationMinutes: number;
  };
  // All confirmed guides assigned to bookings on this schedule
  guides: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  }>;
  bookings: ManifestBooking[];
  summary: {
    totalBookings: number;
    totalParticipants: number;
    totalRevenue: string;
    currency: string;
  };
}

export interface GuideManifestSummary {
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  schedules: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    tourName: string;
    totalParticipants: number;
    bookedCount: number;
  }>;
  summary: {
    totalSchedules: number;
    totalParticipants: number;
  };
}

export interface DateManifestSummary {
  date: Date;
  schedules: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    tourName: string;
    guidesRequired: number;
    guidesAssigned: number;
    totalParticipants: number;
    bookedCount: number;
  }>;
  summary: {
    totalSchedules: number;
    totalParticipants: number;
    totalRevenue: string;
  };
}

/**
 * Tour run manifest - for availability-based booking model
 * Uses tourId + date + time instead of scheduleId
 * This follows the same structure as ScheduleManifest for consistency
 */
export interface TourRunScheduleManifest {
  tourRun: {
    tourId: string;
    date: Date;
    time: string;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
  };
  tour: {
    id: string;
    name: string;
    slug: string;
    durationMinutes: number;
  };
  guides: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  }>;
  bookings: ManifestBooking[];
  summary: {
    totalBookings: number;
    totalParticipants: number;
    totalRevenue: string;
    currency: string;
  };
}

export class ManifestService extends BaseService {
  /**
   * @deprecated Use getForTourRun instead. Schedules table has been removed.
   * Returns empty manifest for backwards compatibility.
   */
  async getManifestForSchedule(_scheduleId: string): Promise<ScheduleManifest> {
    throw new NotFoundError("Schedule", _scheduleId);
  }

  /**
   * Get all manifests for a guide on a specific date
   * Uses availability-based booking model (bookingDate, bookingTime)
   */
  async getManifestsForGuide(
    guideId: string,
    date: Date
  ): Promise<GuideManifestSummary> {
    // Verify guide exists and belongs to organization
    const guide = await this.db.query.guides.findFirst({
      where: and(
        eq(guides.id, guideId),
        eq(guides.organizationId, this.organizationId)
      ),
    });

    if (!guide) {
      throw new NotFoundError("Guide", guideId);
    }

    const dateStr = date.toISOString().split("T")[0]!;

    // Get bookings where this guide has confirmed assignments for the date
    const assignmentBookings = await this.db
      .select({
        booking: bookings,
        tour: {
          id: tours.id,
          name: tours.name,
          durationMinutes: tours.durationMinutes,
        },
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          sql`${bookings.bookingDate}::text = ${dateStr}`
        )
      )
      .orderBy(bookings.bookingTime);

    if (assignmentBookings.length === 0) {
      return {
        guide: {
          id: guide.id,
          firstName: guide.firstName,
          lastName: guide.lastName,
          email: guide.email,
          phone: guide.phone,
        },
        schedules: [],
        summary: {
          totalSchedules: 0,
          totalParticipants: 0,
        },
      };
    }

    // Group bookings by tour run (tourId + time)
    const tourRunsMap = new Map<string, {
      id: string;
      tourId: string;
      tourName: string;
      bookingTime: string | null;
      durationMinutes: number | null;
      totalParticipants: number;
    }>();

    for (const { booking, tour } of assignmentBookings) {
      const key = `${tour.id}-${booking.bookingTime}`;
      const existing = tourRunsMap.get(key);
      if (existing) {
        existing.totalParticipants += booking.totalParticipants;
      } else {
        tourRunsMap.set(key, {
          id: key,
          tourId: tour.id,
          tourName: tour.name,
          bookingTime: booking.bookingTime,
          durationMinutes: tour.durationMinutes,
          totalParticipants: booking.totalParticipants,
        });
      }
    }

    const scheduleSummaries = Array.from(tourRunsMap.values()).map((run) => {
      const startsAt = new Date(date);
      if (run.bookingTime) {
        const [hours, minutes] = run.bookingTime.split(":").map(Number);
        startsAt.setHours(hours || 0, minutes || 0, 0, 0);
      }
      const endsAt = new Date(startsAt.getTime() + (run.durationMinutes || 60) * 60 * 1000);

      return {
        id: run.id,
        startsAt,
        endsAt,
        tourName: run.tourName,
        totalParticipants: run.totalParticipants,
        bookedCount: run.totalParticipants,
      };
    });

    const totalSchedules = scheduleSummaries.length;
    const totalParticipants = scheduleSummaries.reduce(
      (sum, sched) => sum + sched.bookedCount,
      0
    );

    return {
      guide: {
        id: guide.id,
        firstName: guide.firstName,
        lastName: guide.lastName,
        email: guide.email,
        phone: guide.phone,
      },
      schedules: scheduleSummaries,
      summary: {
        totalSchedules,
        totalParticipants,
      },
    };
  }

  /**
   * Get all manifests for a specific date (admin view)
   * Uses availability-based booking model (bookingDate, bookingTime)
   */
  async getManifestsForDate(date: Date): Promise<DateManifestSummary> {
    const dateStr = date.toISOString().split("T")[0]!;

    // Get all confirmed bookings for this date grouped by tour + time
    const bookingResults = await this.db
      .select({
        tourId: bookings.tourId,
        bookingTime: bookings.bookingTime,
        tourName: tours.name,
        tourDuration: tours.durationMinutes,
        totalParticipants: sql<number>`SUM(${bookings.totalParticipants})`,
        totalRevenue: sql<number>`SUM(${bookings.total}::numeric)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(bookings.tourId, bookings.bookingTime, tours.name, tours.durationMinutes)
      .orderBy(bookings.bookingTime);

    let totalRevenue = 0;

    const scheduleSummaries = bookingResults.map((result) => {
      const startsAt = new Date(date);
      if (result.bookingTime) {
        const [hours, minutes] = result.bookingTime.split(":").map(Number);
        startsAt.setHours(hours || 0, minutes || 0, 0, 0);
      }
      const endsAt = new Date(startsAt.getTime() + (result.tourDuration || 60) * 60 * 1000);
      const revenue = Number(result.totalRevenue) || 0;
      totalRevenue += revenue;

      return {
        id: `${result.tourId}-${dateStr}-${result.bookingTime}`,
        startsAt,
        endsAt,
        tourName: result.tourName || "Unknown Tour",
        guidesRequired: 0, // Guide info not available without schedules
        guidesAssigned: 0,
        totalParticipants: Number(result.totalParticipants) || 0,
        bookedCount: Number(result.totalParticipants) || 0,
      };
    });

    const totalSchedules = scheduleSummaries.length;
    const totalParticipants = scheduleSummaries.reduce(
      (sum, sched) => sum + sched.bookedCount,
      0
    );

    return {
      date,
      schedules: scheduleSummaries,
      summary: {
        totalSchedules,
        totalParticipants,
        totalRevenue: totalRevenue.toFixed(2),
      },
    };
  }

  /**
   * Get manifest for a tour run (availability-based booking model)
   * Uses tourId + date + time instead of scheduleId
   */
  async getForTourRun(tourId: string, date: Date, time: string): Promise<TourRunScheduleManifest> {
    // Get tour info
    const tour = await this.db.query.tours.findFirst({
      where: and(
        eq(tours.id, tourId),
        eq(tours.organizationId, this.organizationId)
      ),
    });

    if (!tour) {
      throw new NotFoundError("Tour", tourId);
    }

    // Format date for SQL comparison
    const dateStr = date.toISOString().split("T")[0]!;

    // Get all confirmed bookings for this tour run
    const bookingResults = await this.db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.tourId, tourId),
          sql`${bookings.bookingDate}::text = ${dateStr}`,
          eq(bookings.bookingTime, time),
          eq(bookings.status, "confirmed")
        )
      )
      .orderBy(asc(bookings.createdAt));

    // Get participants for all bookings
    const bookingIds = bookingResults.map((r) => r.booking.id);
    const participants: BookingParticipant[] = [];

    if (bookingIds.length > 0) {
      const participantResults = await this.db.query.bookingParticipants.findMany({
        where: (bp, { inArray, and, eq }) => and(
          inArray(bp.bookingId, bookingIds),
          eq(bp.organizationId, this.organizationId)
        ),
      });
      participants.push(...participantResults);
    }

    // Group participants by booking
    const participantsByBooking = participants.reduce((acc, participant) => {
      if (!acc[participant.bookingId]) {
        acc[participant.bookingId] = [];
      }
      acc[participant.bookingId]!.push({
        id: participant.id,
        bookingId: participant.bookingId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        phone: participant.phone,
        type: participant.type,
        dietaryRequirements: participant.dietaryRequirements,
        accessibilityNeeds: participant.accessibilityNeeds,
        notes: participant.notes,
      });
      return acc;
    }, {} as Record<string, ManifestParticipant[]>);

    // Build manifest bookings
    const manifestBookings: ManifestBooking[] = bookingResults.map((result) => ({
      id: result.booking.id,
      referenceNumber: result.booking.referenceNumber,
      customerId: result.booking.customerId,
      customerName: result.customer?.id
        ? `${result.customer.firstName} ${result.customer.lastName}`
        : "Unknown",
      customerEmail: result.customer?.email || "",
      customerPhone: result.customer?.phone || null,
      adultCount: result.booking.adultCount,
      childCount: result.booking.childCount || 0,
      infantCount: result.booking.infantCount || 0,
      totalParticipants: result.booking.totalParticipants,
      specialRequests: result.booking.specialRequests,
      dietaryRequirements: result.booking.dietaryRequirements,
      accessibilityNeeds: result.booking.accessibilityNeeds,
      internalNotes: result.booking.internalNotes,
      paymentStatus: result.booking.paymentStatus,
      total: result.booking.total,
      currency: result.booking.currency,
      participants: participantsByBooking[result.booking.id] || [],
    }));

    // Get all confirmed guides for bookings in this tour run (via assignments)
    let confirmedGuides: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    }> = [];

    if (bookingIds.length > 0) {
      const guideResults = await this.db
        .select({
          guideId: guideAssignments.guideId,
          firstName: guides.firstName,
          lastName: guides.lastName,
          email: guides.email,
          phone: guides.phone,
        })
        .from(guideAssignments)
        .innerJoin(guides, eq(guideAssignments.guideId, guides.id))
        .where(
          and(
            inArray(guideAssignments.bookingId, bookingIds),
            eq(guideAssignments.organizationId, this.organizationId),
            eq(guideAssignments.status, "confirmed"),
            sql`${guideAssignments.guideId} is not null`
          )
        );

      // Deduplicate guides by ID
      const guideMap = new Map<string, { guideId: string; firstName: string; lastName: string; email: string; phone: string | null }>();
      for (const guide of guideResults) {
        if (guide.guideId) {
          guideMap.set(guide.guideId, { ...guide, guideId: guide.guideId });
        }
      }
      confirmedGuides = Array.from(guideMap.values()).map((g) => ({
        id: g.guideId,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
      }));
    }

    // Calculate summary
    const totalBookings = manifestBookings.length;
    const totalParticipants = manifestBookings.reduce(
      (sum, booking) => sum + booking.totalParticipants,
      0
    );
    const totalRevenue = manifestBookings
      .reduce((sum, booking) => sum + parseFloat(booking.total), 0)
      .toFixed(2);

    return {
      tourRun: {
        tourId: tour.id,
        date,
        time,
        meetingPoint: tour.meetingPoint,
        meetingPointDetails: tour.meetingPointDetails,
      },
      tour: {
        id: tour.id,
        name: tour.name,
        slug: tour.slug,
        durationMinutes: tour.durationMinutes,
      },
      guides: confirmedGuides,
      bookings: manifestBookings,
      summary: {
        totalBookings,
        totalParticipants,
        totalRevenue,
        currency: tour.currency ?? "USD",
      },
    };
  }
}
