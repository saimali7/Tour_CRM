/**
 * BookingCore - Shared utilities and helpers for booking services
 *
 * This class contains:
 * - Common query builders for booking relations
 * - Shared validation logic
 * - Utility methods used across multiple booking services
 * - Urgency calculation logic
 */

import { eq, and, sql, or, isNotNull } from "drizzle-orm";
import {
  bookings,
  bookingParticipants,
  customers,
  schedules,
  tours,
  type Booking,
} from "@tour/database";
import type { ServiceContext } from "../types";
import { bookingLogger } from "../lib/logger";
import { ScheduleService } from "../schedule-service";
import type { BookingWithRelations } from "./types";

export type UrgencyLevel = "critical" | "high" | "medium" | "low" | "none" | "past";

export class BookingCore {
  constructor(private ctx: ServiceContext) {}

  get organizationId(): string {
    return this.ctx.organizationId;
  }

  get serviceContext(): ServiceContext {
    return this.ctx;
  }

  /**
   * Helper to recalculate guide requirements after booking changes
   * Used by create, update, cancel, reschedule operations
   */
  async recalculateGuideRequirements(scheduleId: string): Promise<void> {
    try {
      const scheduleService = new ScheduleService(this.ctx);
      await scheduleService.recalculateGuideRequirements(scheduleId);
    } catch (error) {
      // Log but don't fail the booking operation
      bookingLogger.warn({
        organizationId: this.organizationId,
        scheduleId,
        error: error instanceof Error ? error.message : "Unknown error",
      }, "Failed to recalculate guide requirements");
    }
  }

  /**
   * Extract time (HH:MM) from a Date object
   */
  extractTimeFromDate(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Urgency level based on tour time and booking status
   * Used by stats/urgency grouping methods
   */
  getBookingUrgency(booking: BookingWithRelations): UrgencyLevel {
    const now = new Date();
    let tourDate: Date | null = null;

    // Determine tour date from schedule or booking fields
    if (booking.schedule?.startsAt) {
      tourDate = new Date(booking.schedule.startsAt);
    } else if (booking.bookingDate && booking.bookingTime) {
      const parts = booking.bookingTime.split(":");
      const hours = parseInt(parts[0] ?? "0", 10);
      const minutes = parseInt(parts[1] ?? "0", 10);
      tourDate = new Date(booking.bookingDate);
      tourDate.setHours(hours, minutes, 0, 0);
    }

    if (!tourDate) return "none";

    // Past tours
    if (tourDate < now) return "past";

    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hasStatusIssue = booking.status === "pending";
    const hasPaymentIssue = booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded";
    const hasIssue = hasStatusIssue || hasPaymentIssue;

    if (!hasIssue) return "none";

    // Critical: Tour is within 24 hours AND has issues
    if (hoursUntilTour <= 24) return "critical";

    // High: Tour is within 48 hours AND has issues
    if (hoursUntilTour <= 48) return "high";

    // Medium: Tour is within 7 days AND has issues
    if (hoursUntilTour <= 168) return "medium";

    // Low: Has issues but tour is far out
    return "low";
  }

  /**
   * Build the standard booking select fields for queries
   * Returns consistent field selection for all booking queries
   */
  getBookingSelectFields() {
    return {
      booking: bookings,
      customer: {
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
      },
      schedule: {
        id: schedules.id,
        startsAt: schedules.startsAt,
        endsAt: schedules.endsAt,
        status: schedules.status,
      },
      tour: {
        id: tours.id,
        name: tours.name,
        slug: tours.slug,
        meetingPoint: tours.meetingPoint,
        meetingPointDetails: tours.meetingPointDetails,
      },
    };
  }

  /**
   * Get the standard join condition for tours
   * Handles both schedule-based and availability-based bookings
   */
  getTourJoinCondition() {
    return or(
      eq(schedules.tourId, tours.id),
      and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id))
    );
  }

  /**
   * Transform a raw query result row into BookingWithRelations
   */
  transformBookingRow(row: {
    booking: Booking;
    customer?: { id: string; email: string | null; firstName: string; lastName: string; phone: string | null } | null;
    schedule?: { id: string; startsAt: Date; endsAt: Date; status: string } | null;
    tour?: { id: string; name: string; slug: string; meetingPoint: string | null; meetingPointDetails: string | null } | null;
    scheduleTour?: { id: string; name: string; slug: string; meetingPoint: string | null; meetingPointDetails: string | null } | null;
  }): BookingWithRelations {
    // Handle both 'tour' and 'scheduleTour' field naming
    const tourData = row.tour || row.scheduleTour;

    return {
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      schedule: row.schedule?.id ? row.schedule : undefined,
      tour: tourData?.id ? {
        id: tourData.id,
        name: tourData.name,
        slug: tourData.slug,
        meetingPoint: tourData.meetingPoint,
        meetingPointDetails: tourData.meetingPointDetails,
      } : undefined,
    };
  }
}
