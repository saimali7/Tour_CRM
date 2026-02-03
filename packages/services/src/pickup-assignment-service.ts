import { and, eq, inArray, sql } from "drizzle-orm";
import {
  bookings,
  guideAssignments,
  pickupAssignments,
  type PickupAssignment,
} from "@tour/database";
import { BaseService } from "./base-service";
import { createTourRunKey, formatDateForKey } from "./lib/tour-run-utils";
import { createServiceLogger } from "./lib/logger";

const DEFAULT_PICKUP_MINUTES = 5;
const DEFAULT_DRIVE_MINUTES = 10;

interface AssignmentRow {
  guideAssignmentId: string;
  guideId: string | null;
  outsourcedGuideName: string | null;
  bookingId: string;
  assignedAt: Date;
  existingPickupOrder: number | null;
  existingCalculatedPickupTime: string | null;
  existingDriveTimeMinutes: number | null;
  tourId: string | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  pickupTime: string | null;
  totalParticipants: number | null;
  createdAt: Date;
}

export interface PickupAssignmentSummary {
  pickupAssignmentId: string;
  bookingId: string;
  guideAssignmentId: string;
  guideId: string | null;
  outsourcedGuideName: string | null;
  pickupOrder: number;
  pickupTime: string | null;
  driveTimeMinutes: number | null;
  passengerCount: number;
  tourRunKey: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  removed: number;
}

/**
 * Pickup Assignment Service
 *
 * Keeps pickup_assignments in sync with confirmed guide assignments
 * and provides pickup ordering for Command Center timelines.
 */
export class PickupAssignmentService extends BaseService {
  private logger = createServiceLogger("pickup-assignment", this.organizationId);

  /**
   * Sync pickup assignments for a date based on confirmed guide assignments.
   */
  async syncForDate(date: Date | string): Promise<SyncResult> {
    const dateKey = formatDateForKey(date);

    const assignmentRows = await this.db
      .select({
        guideAssignmentId: guideAssignments.id,
        guideId: guideAssignments.guideId,
        outsourcedGuideName: guideAssignments.outsourcedGuideName,
        bookingId: guideAssignments.bookingId,
        assignedAt: guideAssignments.assignedAt,
        existingPickupOrder: guideAssignments.pickupOrder,
        existingCalculatedPickupTime: guideAssignments.calculatedPickupTime,
        existingDriveTimeMinutes: guideAssignments.driveTimeMinutes,
        tourId: bookings.tourId,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        pickupTime: bookings.pickupTime,
        totalParticipants: bookings.totalParticipants,
        createdAt: bookings.createdAt,
      })
      .from(guideAssignments)
      .innerJoin(bookings, eq(guideAssignments.bookingId, bookings.id))
      .where(
        and(
          eq(guideAssignments.organizationId, this.organizationId),
          eq(guideAssignments.status, "confirmed"),
          sql`${bookings.bookingDate}::text = ${dateKey}`
        )
      );

    if (assignmentRows.length === 0) {
      // Clean up any pickup assignments for this date
      const removed = await this.removePickupsForDate(dateKey, new Set());
      return { created: 0, updated: 0, removed };
    }

    // Deduplicate to one assignment per booking (most recent wins)
    const assignmentByBooking = new Map<string, AssignmentRow>();
    for (const row of assignmentRows) {
      const existing = assignmentByBooking.get(row.bookingId);
      if (!existing || row.assignedAt > existing.assignedAt) {
        assignmentByBooking.set(row.bookingId, row);
      }
    }

    const assignments = Array.from(assignmentByBooking.values());

    // Group by tour run + guide for pickup ordering
    const grouped = new Map<string, AssignmentRow[]>();
    for (const row of assignments) {
      if (!row.tourId || !row.bookingTime) {
        this.logger.warn(
          { bookingId: row.bookingId },
          "Skipping pickup assignment: missing tourId or bookingTime"
        );
        continue;
      }

      const tourRunKey = createTourRunKey(row.tourId, dateKey, row.bookingTime);
      const guideKey = row.guideId ?? `outsourced:${row.outsourcedGuideName ?? row.guideAssignmentId}`;
      const groupKey = `${tourRunKey}|${guideKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(row);
    }

    const desiredAssignments: Array<{
      bookingId: string;
      guideAssignmentId: string;
      pickupOrder: number;
      pickupTime: string;
      driveTimeMinutes: number;
      passengerCount: number;
      scheduleId: string;
    }> = [];

    for (const [groupKey, rows] of grouped) {
      const splitIndex = groupKey.lastIndexOf("|");
      const tourRunKey = splitIndex >= 0 ? groupKey.slice(0, splitIndex) : groupKey;
      const bookingTime = rows[0]?.bookingTime ?? "00:00";

      const withTime = rows.filter((r) => r.pickupTime || r.existingCalculatedPickupTime);
      const missing = rows.filter((r) => !r.pickupTime && !r.existingCalculatedPickupTime);

      const computedTimes = new Map<string, string>();
      if (missing.length > 0) {
        const anchor = withTime.length > 0
          ? minTime(
              withTime
                .map((r) => r.pickupTime ?? r.existingCalculatedPickupTime)
                .filter(Boolean) as string[]
            )
          : bookingTime;
        const anchorMinutes = timeToMinutes(anchor);
        const spacing = DEFAULT_PICKUP_MINUTES + DEFAULT_DRIVE_MINUTES;
        let startMinutes = anchorMinutes - spacing * missing.length;
        if (startMinutes < 0) startMinutes = 0;

        const missingSorted = [...missing].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        for (let i = 0; i < missingSorted.length; i++) {
          const row = missingSorted[i]!;
          const minutes = startMinutes + i * spacing;
          computedTimes.set(row.bookingId, minutesToTime(minutes));
        }
      }

      // Build ordered list
      const ordered = [...rows]
        .map((row) => ({
          row,
          time: row.pickupTime
            ?? row.existingCalculatedPickupTime
            ?? computedTimes.get(row.bookingId)
            ?? bookingTime,
        }))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      let previousTime: string | null = null;
      ordered.forEach((entry, index) => {
        let driveMinutes = 0;
        if (previousTime) {
          const gap = timeToMinutes(entry.time) - timeToMinutes(previousTime) - DEFAULT_PICKUP_MINUTES;
          driveMinutes = Math.max(0, gap);
        }

        desiredAssignments.push({
          bookingId: entry.row.bookingId,
          guideAssignmentId: entry.row.guideAssignmentId,
          pickupOrder: index + 1,
          pickupTime: entry.time,
          driveTimeMinutes: driveMinutes,
          passengerCount: entry.row.totalParticipants ?? 1,
          scheduleId: tourRunKey || bookingTime,
        });

        previousTime = entry.time;
      });
    }

    const bookingIds = desiredAssignments.map((a) => a.bookingId);
    const existing = bookingIds.length > 0
      ? await this.db.query.pickupAssignments.findMany({
          where: and(
            eq(pickupAssignments.organizationId, this.organizationId),
            inArray(pickupAssignments.bookingId, bookingIds)
          ),
        })
      : [];

    const existingByBooking = new Map<string, PickupAssignment>();
    for (const row of existing) {
      existingByBooking.set(row.bookingId, row);
    }

    let created = 0;
    let updated = 0;

    for (const desired of desiredAssignments) {
      const existingPickup = existingByBooking.get(desired.bookingId);
      const estimatedPickupTime = toDate(dateKey, desired.pickupTime);

      if (!existingPickup) {
        await this.db.insert(pickupAssignments).values({
          organizationId: this.organizationId,
          scheduleId: desired.scheduleId,
          guideAssignmentId: desired.guideAssignmentId,
          bookingId: desired.bookingId,
          pickupOrder: desired.pickupOrder,
          estimatedPickupTime,
          passengerCount: desired.passengerCount,
        });
        created++;
      } else {
        const needsUpdate =
          existingPickup.guideAssignmentId !== desired.guideAssignmentId ||
          existingPickup.pickupOrder !== desired.pickupOrder ||
          existingPickup.passengerCount !== desired.passengerCount ||
          existingPickup.scheduleId !== desired.scheduleId ||
          !!estimatedPickupTime &&
            (!existingPickup.estimatedPickupTime ||
              existingPickup.estimatedPickupTime.getTime() !== estimatedPickupTime.getTime());

        if (needsUpdate) {
          await this.db
            .update(pickupAssignments)
            .set({
              guideAssignmentId: desired.guideAssignmentId,
              scheduleId: desired.scheduleId,
              pickupOrder: desired.pickupOrder,
              estimatedPickupTime,
              passengerCount: desired.passengerCount,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(pickupAssignments.id, existingPickup.id),
                eq(pickupAssignments.organizationId, this.organizationId)
              )
            );
          updated++;
        }
      }

      // Keep guide assignment in sync for display
      const assignmentRow = assignmentByBooking.get(desired.bookingId);
      if (
        assignmentRow &&
        (assignmentRow.existingPickupOrder !== desired.pickupOrder ||
          assignmentRow.existingCalculatedPickupTime !== desired.pickupTime ||
          assignmentRow.existingDriveTimeMinutes !== desired.driveTimeMinutes)
      ) {
        await this.db
          .update(guideAssignments)
          .set({
            pickupOrder: desired.pickupOrder,
            calculatedPickupTime: desired.pickupTime,
            driveTimeMinutes: desired.driveTimeMinutes,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(guideAssignments.id, desired.guideAssignmentId),
              eq(guideAssignments.organizationId, this.organizationId)
            )
          );
      }
    }

    const removed = await this.removePickupsForDate(dateKey, new Set(bookingIds));

    return { created, updated, removed };
  }

  /**
   * Get pickup assignments for a date (used by timelines).
   */
  async getForDate(date: Date | string): Promise<PickupAssignmentSummary[]> {
    const dateKey = formatDateForKey(date);

    const rows = await this.db
      .select({
        pickupAssignmentId: pickupAssignments.id,
        bookingId: pickupAssignments.bookingId,
        guideAssignmentId: pickupAssignments.guideAssignmentId,
        pickupOrder: pickupAssignments.pickupOrder,
        passengerCount: pickupAssignments.passengerCount,
        guideId: guideAssignments.guideId,
        outsourcedGuideName: guideAssignments.outsourcedGuideName,
        calculatedPickupTime: guideAssignments.calculatedPickupTime,
        driveTimeMinutes: guideAssignments.driveTimeMinutes,
        estimatedPickupTime: pickupAssignments.estimatedPickupTime,
        tourId: bookings.tourId,
        bookingTime: bookings.bookingTime,
      })
      .from(pickupAssignments)
      .innerJoin(guideAssignments, eq(pickupAssignments.guideAssignmentId, guideAssignments.id))
      .innerJoin(bookings, eq(pickupAssignments.bookingId, bookings.id))
      .where(
        and(
          eq(pickupAssignments.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text = ${dateKey}`
        )
      );

    return rows.map((row) => {
      const tourRunKey = row.tourId && row.bookingTime
        ? createTourRunKey(row.tourId, dateKey, row.bookingTime)
        : `${row.tourId ?? "unknown"}|${dateKey}|${row.bookingTime ?? "00:00"}`;

      const pickupTime = row.calculatedPickupTime
        ?? (row.estimatedPickupTime ? formatTime(row.estimatedPickupTime) : null);

      return {
        pickupAssignmentId: row.pickupAssignmentId,
        bookingId: row.bookingId,
        guideAssignmentId: row.guideAssignmentId,
        guideId: row.guideId,
        outsourcedGuideName: row.outsourcedGuideName,
        pickupOrder: row.pickupOrder,
        pickupTime,
        driveTimeMinutes: row.driveTimeMinutes ?? null,
        passengerCount: row.passengerCount,
        tourRunKey,
      };
    });
  }

  private async removePickupsForDate(dateKey: string, keepBookingIds: Set<string>): Promise<number> {
    const existing = await this.db
      .select({
        id: pickupAssignments.id,
        bookingId: pickupAssignments.bookingId,
      })
      .from(pickupAssignments)
      .innerJoin(bookings, eq(pickupAssignments.bookingId, bookings.id))
      .where(
        and(
          eq(pickupAssignments.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text = ${dateKey}`
        )
      );

    const toRemove = existing.filter((row) => !keepBookingIds.has(row.bookingId));
    if (toRemove.length === 0) {
      return 0;
    }

    await this.db.delete(pickupAssignments).where(
      and(
        eq(pickupAssignments.organizationId, this.organizationId),
        inArray(pickupAssignments.id, toRemove.map((row) => row.id))
      )
    );

    return toRemove.length;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function minTime(times: string[]): string {
  return times.reduce((min, time) => (timeToMinutes(time) < timeToMinutes(min) ? time : min), times[0] || "00:00");
}

function toDate(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00`);
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}
