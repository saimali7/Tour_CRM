import { eq, and, gte, lte, desc, inArray, sql, asc } from "drizzle-orm";
import {
  schedules,
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
   * Get manifest for a specific schedule
   * Returns all confirmed bookings with participant details
   */
  async getManifestForSchedule(scheduleId: string): Promise<ScheduleManifest> {
    // Get schedule with tour info
    const scheduleResult = await this.db
      .select({
        schedule: schedules,
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          durationMinutes: tours.durationMinutes,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.id, scheduleId),
          eq(schedules.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const row = scheduleResult[0];
    if (!row) {
      throw new NotFoundError("Schedule", scheduleId);
    }

    // Get all confirmed bookings for this schedule
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
          eq(bookings.scheduleId, scheduleId),
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "confirmed")
        )
      )
      .orderBy(desc(bookings.createdAt));

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

    // Get all confirmed guides for this schedule (via assignments on bookings)
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

      // Deduplicate guides by ID (filter out nulls which shouldn't exist due to innerJoin)
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
      schedule: {
        id: row.schedule.id,
        startsAt: row.schedule.startsAt,
        endsAt: row.schedule.endsAt,
        meetingPoint: row.schedule.meetingPoint,
        meetingPointDetails: row.schedule.meetingPointDetails,
        status: row.schedule.status,
        maxParticipants: row.schedule.maxParticipants,
        bookedCount: row.schedule.bookedCount || 0,
      },
      tour: row.tour!,
      guides: confirmedGuides,
      bookings: manifestBookings,
      summary: {
        totalBookings,
        totalParticipants,
        totalRevenue,
        currency: row.schedule.currency ?? "USD",
      },
    };
  }

  /**
   * Get all manifests for a guide on a specific date
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

    // Get date range (start and end of day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get schedules where this guide has confirmed assignments (via bookings)
    const assignmentScheduleIds = await this.db
      .select({ scheduleId: bookings.scheduleId })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(
        and(
          eq(guideAssignments.guideId, guideId),
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          gte(schedules.startsAt, startOfDay),
          lte(schedules.startsAt, endOfDay)
        )
      );

    const scheduleIds = [...new Set(assignmentScheduleIds.map((a) => a.scheduleId).filter((id): id is string => id !== null))];

    if (scheduleIds.length === 0) {
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

    // Get the schedules with tour info
    const scheduleResults = await this.db
      .select({
        schedule: schedules,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          inArray(schedules.id, scheduleIds),
          eq(schedules.organizationId, this.organizationId)
        )
      )
      .orderBy(schedules.startsAt);

    const scheduleSummaries = scheduleResults.map((result) => ({
      id: result.schedule.id,
      startsAt: result.schedule.startsAt,
      endsAt: result.schedule.endsAt,
      tourName: result.tour?.name || "Unknown Tour",
      totalParticipants: result.schedule.bookedCount || 0,
      bookedCount: result.schedule.bookedCount || 0,
    }));

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
   */
  async getManifestsForDate(date: Date): Promise<DateManifestSummary> {
    // Get date range (start and end of day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all schedules for this date
    const scheduleResults = await this.db
      .select({
        schedule: schedules,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .where(
        and(
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, startOfDay),
          lte(schedules.startsAt, endOfDay)
        )
      )
      .orderBy(schedules.startsAt);

    // Get all confirmed bookings for these schedules
    const scheduleIds = scheduleResults.map((r) => r.schedule.id);
    let totalRevenue = 0;

    if (scheduleIds.length > 0) {
      const bookingResults = await this.db
        .select({
          total: bookings.total,
        })
        .from(bookings)
        .where(
          and(
            inArray(bookings.scheduleId, scheduleIds),
            eq(bookings.organizationId, this.organizationId),
            eq(bookings.status, "confirmed")
          )
        );

      totalRevenue = bookingResults.reduce(
        (sum, booking) => sum + parseFloat(booking.total),
        0
      );
    }

    const scheduleSummaries = scheduleResults.map((result) => ({
      id: result.schedule.id,
      startsAt: result.schedule.startsAt,
      endsAt: result.schedule.endsAt,
      tourName: result.tour?.name || "Unknown Tour",
      // Use guide capacity counts instead of single guide name
      guidesRequired: result.schedule.guidesRequired ?? 0,
      guidesAssigned: result.schedule.guidesAssigned ?? 0,
      totalParticipants: result.schedule.bookedCount || 0,
      bookedCount: result.schedule.bookedCount || 0,
    }));

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
