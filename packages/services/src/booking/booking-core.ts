/**
 * BookingCore - Shared utilities and helpers for booking services
 *
 * This class contains:
 * - Common query builders for booking relations
 * - Shared validation logic
 * - Utility methods used across multiple booking services
 * - Urgency calculation logic
 */

import { eq, and, or, isNotNull } from "drizzle-orm";
import {
  bookings,
  customers,
  tours,
  type Booking,
} from "@tour/database";
import type { ServiceContext } from "../types";
import { bookingLogger } from "../lib/logger";
import { formatDateOnlyKey, parseDateOnlyKeyToLocalDate } from "../lib/date-time";
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

    // Determine tour date from booking fields
    if (booking.bookingDate && booking.bookingTime) {
      const parts = booking.bookingTime.split(":");
      const hours = parseInt(parts[0] ?? "0", 10);
      const minutes = parseInt(parts[1] ?? "0", 10);
      tourDate = parseDateOnlyKeyToLocalDate(formatDateOnlyKey(booking.bookingDate));
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
   * Joins via bookings.tourId
   */
  getTourJoinCondition() {
    return and(isNotNull(bookings.tourId), eq(bookings.tourId, tours.id));
  }

  /**
   * Transform a raw query result row into BookingWithRelations
   */
  transformBookingRow(row: {
    booking: Booking;
    customer?: { id: string; email: string | null; firstName: string; lastName: string; phone: string | null } | null;
    tour?: { id: string; name: string; slug: string; meetingPoint: string | null; meetingPointDetails: string | null } | null;
  }): BookingWithRelations {
    return {
      ...row.booking,
      customer: row.customer?.id ? row.customer : undefined,
      tour: row.tour?.id ? {
        id: row.tour.id,
        name: row.tour.name,
        slug: row.tour.slug,
        meetingPoint: row.tour.meetingPoint,
        meetingPointDetails: row.tour.meetingPointDetails,
      } : undefined,
    };
  }
}
