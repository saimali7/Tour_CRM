import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import {
  schedules,
  tours,
  guides,
  bookings,
  customers,
  bookingParticipants,
  type BookingParticipant,
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
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
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
    guideName: string | null;
    totalParticipants: number;
    bookedCount: number;
  }>;
  summary: {
    totalSchedules: number;
    totalParticipants: number;
    totalRevenue: string;
  };
}

export class ManifestService extends BaseService {
  /**
   * Get manifest for a specific schedule
   * Returns all confirmed bookings with participant details
   */
  async getManifestForSchedule(scheduleId: string): Promise<ScheduleManifest> {
    // Get schedule with tour and guide info
    const scheduleResult = await this.db
      .select({
        schedule: schedules,
        tour: {
          id: tours.id,
          name: tours.name,
          slug: tours.slug,
          durationMinutes: tours.durationMinutes,
        },
        guide: {
          id: guides.id,
          firstName: guides.firstName,
          lastName: guides.lastName,
          email: guides.email,
          phone: guides.phone,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .leftJoin(guides, eq(schedules.guideId, guides.id))
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
        where: (bp, { inArray }) => inArray(bp.bookingId, bookingIds),
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
      guide: row.guide?.id ? row.guide : null,
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

    // Get all schedules for this guide on this date
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
          eq(schedules.guideId, guideId),
          eq(schedules.organizationId, this.organizationId),
          gte(schedules.startsAt, startOfDay),
          lte(schedules.startsAt, endOfDay)
        )
      )
      .orderBy(schedules.startsAt);

    const scheduleSummaries = scheduleResults.map((result) => ({
      id: result.schedule.id,
      startsAt: result.schedule.startsAt,
      endsAt: result.schedule.endsAt,
      tourName: result.tour?.name || "Unknown Tour",
      totalParticipants: result.schedule.maxParticipants,
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
        guide: {
          id: guides.id,
          firstName: guides.firstName,
          lastName: guides.lastName,
        },
      })
      .from(schedules)
      .leftJoin(tours, eq(schedules.tourId, tours.id))
      .leftJoin(guides, eq(schedules.guideId, guides.id))
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
      guideName: result.guide?.id
        ? `${result.guide.firstName} ${result.guide.lastName}`
        : null,
      totalParticipants: result.schedule.maxParticipants,
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
}
