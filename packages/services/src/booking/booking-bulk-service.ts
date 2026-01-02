/**
 * BookingBulkService - Bulk operations for bookings
 *
 * This service handles all bulk operations:
 * - bulkConfirm: Confirm multiple bookings
 * - bulkCancel: Cancel multiple bookings
 * - bulkUpdatePaymentStatus: Update payment status for multiple bookings
 * - bulkReschedule: Reschedule multiple bookings
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import {
  bookings,
  schedules,
  type PaymentStatus,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext } from "../types";
import { bookingLogger } from "../lib/logger";
import { BookingCore } from "./booking-core";
import { BookingCommandService } from "./booking-command-service";
import type {
  BulkConfirmResult,
  BulkCancelResult,
  BulkPaymentUpdateResult,
  BulkRescheduleResult,
} from "./types";

export class BookingBulkService extends BaseService {
  constructor(
    ctx: ServiceContext,
    private core: BookingCore,
    private commandService: BookingCommandService
  ) {
    super(ctx);
  }

  /**
   * Bulk confirm multiple bookings
   * Optimized to use batch queries instead of N+1
   */
  async bulkConfirm(ids: string[]): Promise<BulkConfirmResult> {
    if (ids.length === 0) {
      return { confirmed: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all bookings in one query
    const allBookings = await this.db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(allBookings.map(b => b.id));
    const confirmableIds: string[] = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }

      const booking = allBookings.find(b => b.id === id);
      if (booking?.status !== "pending") {
        errors.push({ id, error: `Cannot confirm booking with status "${booking?.status}"` });
        continue;
      }

      confirmableIds.push(id);
    }

    // Batch update all confirmable bookings in one query
    if (confirmableIds.length > 0) {
      await this.db
        .update(bookings)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, confirmableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        confirmedCount: confirmableIds.length,
        ids: confirmableIds,
      }, "Bulk confirmed bookings");
    }

    return { confirmed: confirmableIds, errors };
  }

  /**
   * Bulk cancel multiple bookings
   * Optimized to use batch queries instead of N+1
   */
  async bulkCancel(
    ids: string[],
    reason?: string
  ): Promise<BulkCancelResult> {
    if (ids.length === 0) {
      return { cancelled: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all bookings in one query
    const allBookings = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        scheduleId: bookings.scheduleId,
        totalParticipants: bookings.totalParticipants,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(allBookings.map(b => b.id));
    const cancellableBookings: Array<{ id: string; scheduleId: string | null; totalParticipants: number }> = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }

      const booking = allBookings.find(b => b.id === id);
      if (booking?.status === "cancelled") {
        errors.push({ id, error: "Booking is already cancelled" });
        continue;
      }
      if (booking?.status === "completed") {
        errors.push({ id, error: "Cannot cancel a completed booking" });
        continue;
      }

      cancellableBookings.push({
        id: booking!.id,
        scheduleId: booking!.scheduleId,
        totalParticipants: booking!.totalParticipants,
      });
    }

    if (cancellableBookings.length > 0) {
      const cancellableIds = cancellableBookings.map(b => b.id);

      // Group by schedule to update booked counts efficiently
      const scheduleUpdates = new Map<string, number>();
      for (const booking of cancellableBookings) {
        if (booking.scheduleId) {
          const current = scheduleUpdates.get(booking.scheduleId) || 0;
          scheduleUpdates.set(booking.scheduleId, current + booking.totalParticipants);
        }
      }

      // Update each schedule's booked count (can't batch different decrements easily)
      for (const [scheduleId, totalToDecrement] of scheduleUpdates) {
        await this.db
          .update(schedules)
          .set({
            bookedCount: sql`GREATEST(0, ${schedules.bookedCount} - ${totalToDecrement})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schedules.id, scheduleId),
              eq(schedules.organizationId, this.organizationId)
            )
          );
      }

      // Batch cancel all bookings in one query
      await this.db
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, cancellableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        cancelledCount: cancellableIds.length,
        ids: cancellableIds,
        reason,
      }, "Bulk cancelled bookings");

      // Recalculate guide requirements for all affected schedules
      const affectedScheduleIds = [...scheduleUpdates.keys()];
      await Promise.all(
        affectedScheduleIds.map((scheduleId) =>
          this.core.recalculateGuideRequirements(scheduleId)
        )
      );

      return { cancelled: cancellableIds, errors };
    }

    return { cancelled: [], errors };
  }

  /**
   * Bulk update payment status for multiple bookings
   * Optimized to use batch queries instead of N+1
   */
  async bulkUpdatePaymentStatus(
    ids: string[],
    paymentStatus: PaymentStatus
  ): Promise<BulkPaymentUpdateResult> {
    if (ids.length === 0) {
      return { updated: [], errors: [] };
    }

    const errors: Array<{ id: string; error: string }> = [];

    // Batch fetch all booking IDs in one query to verify they exist
    const existingBookings = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          inArray(bookings.id, ids),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const foundIds = new Set(existingBookings.map(b => b.id));
    const updatableIds: string[] = [];

    // Check each ID for errors
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Booking not found" });
        continue;
      }
      updatableIds.push(id);
    }

    // Batch update all valid bookings in one query
    if (updatableIds.length > 0) {
      await this.db
        .update(bookings)
        .set({
          paymentStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(bookings.id, updatableIds),
            eq(bookings.organizationId, this.organizationId)
          )
        );

      bookingLogger.info({
        organizationId: this.organizationId,
        updatedCount: updatableIds.length,
        ids: updatableIds,
        paymentStatus,
      }, "Bulk updated payment status");
    }

    return { updated: updatableIds, errors };
  }

  /**
   * Bulk reschedule multiple bookings to a new schedule
   * Uses the single-booking reschedule method for proper validation
   */
  async bulkReschedule(
    ids: string[],
    newScheduleId: string
  ): Promise<BulkRescheduleResult> {
    const rescheduled: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.commandService.reschedule(id, newScheduleId);
        rescheduled.push(id);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { rescheduled, errors };
  }
}
