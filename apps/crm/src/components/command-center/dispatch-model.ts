import type { RouterOutputs } from "@/lib/trpc";
import type { DispatchWarning, DispatchData } from "./types";
import type { GuestCardBooking } from "./guest-card";
import type { GuideAssignment, GuideCardData, AssignmentBooking } from "./guide-card";
import type { HopperBooking } from "./hopper/hopper-card";

type DispatchResponse = RouterOutputs["commandCenter"]["getDispatch"];
type ServiceTourRun = DispatchResponse["tourRuns"][number];
type ServiceTimeline = DispatchResponse["timelines"][number];
type ServiceSegment = ServiceTimeline["segments"][number];

export interface CanvasRun {
  id: string;
  tourRunKey: string;
  guideId: string;
  tourName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  confidence: "optimal" | "good" | "review" | "problem";
  bookingIds: string[];
  guestCount: number;
}

export interface CanvasRow {
  guide: ServiceTimeline["guide"];
  vehicleCapacity: number;
  totalGuests: number;
  utilization: number;
  runs: CanvasRun[];
  rawSegments: ServiceSegment[];
}

export interface HopperGroup {
  id: string;
  tourRunKey: string;
  tourName: string;
  tourTime: string;
  totalGuests: number;
  totalBookings: number;
  isCharter: boolean;
  bookings: HopperBooking[];
}

export interface CommandCenterViewModel {
  rows: CanvasRow[];
  groups: HopperGroup[];
  bookingLookup: Map<string, GuestCardBooking>;
  guideLookup: Map<string, GuideCardData>;
  assignedBookingIds: Set<string>;
}

function toGuestCardBooking(run: ServiceTourRun, booking: ServiceTourRun["bookings"][number]): GuestCardBooking {
  return {
    id: booking.id,
    referenceNumber: booking.referenceNumber,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    guestCount: booking.totalParticipants,
    adultCount: booking.adultCount,
    childCount: booking.childCount,
    pickupLocation: booking.pickupLocation,
    pickupAddress: run.tour?.meetingPointDetails ?? run.tour?.meetingPoint ?? null,
    pickupTime: booking.pickupTime ?? run.time,
    pickupZoneName: booking.pickupZone?.name ?? null,
    pickupZoneColor: booking.pickupZone?.color ?? null,
    specialOccasion: booking.specialOccasion,
    specialRequests: booking.specialRequests,
    dietaryRequirements: booking.dietaryRequirements,
    accessibilityNeeds: booking.accessibilityNeeds,
    tourName: run.tour?.name ?? "Tour",
    tourTime: run.time,
    status: booking.status ?? "pending",
    paymentStatus: booking.paymentStatus ?? "pending",
    total: booking.total ?? null,
    currency: booking.currency ?? null,
  };
}

function toHopperBooking(run: ServiceTourRun, booking: ServiceTourRun["bookings"][number]): HopperBooking {
  const experienceMode = booking.experienceMode ?? "join";
  return {
    id: booking.id,
    referenceNumber: booking.referenceNumber,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail ?? null,
    guestCount: booking.totalParticipants,
    adultCount: booking.adultCount,
    childCount: booking.childCount,
    infantCount: booking.infantCount,
    pickupZone: booking.pickupZone
      ? {
          id: booking.pickupZone.id,
          name: booking.pickupZone.name,
          color: booking.pickupZone.color,
        }
      : null,
    pickupLocation: booking.pickupLocation,
    pickupTime: booking.pickupTime,
    tourName: run.tour?.name ?? "Tour",
    tourTime: run.time,
    tourRunKey: run.key,
    tourDurationMinutes: run.tour?.durationMinutes ?? 120,
    experienceMode,
    isVIP: false,
    isFirstTimer: booking.isFirstTime,
    specialOccasion: booking.specialOccasion,
    accessibilityNeeds: booking.accessibilityNeeds,
    hasChildren: booking.childCount > 0 || booking.infantCount > 0,
  };
}

function collectAssignedBookingIds(timelines: DispatchResponse["timelines"]): Set<string> {
  const assigned = new Set<string>();
  for (const timeline of timelines) {
    for (const segment of timeline.segments) {
      if (segment.type === "pickup" && segment.booking?.id) {
        assigned.add(segment.booking.id);
      }
      if (segment.type === "tour" && Array.isArray(segment.bookingIds)) {
        for (const bookingId of segment.bookingIds) {
          assigned.add(bookingId);
        }
      }
    }
  }
  return assigned;
}

function buildRuns(
  timeline: ServiceTimeline,
  bookingLookup: Map<string, GuestCardBooking>
): CanvasRun[] {
  const runs: CanvasRun[] = [];
  for (const segment of timeline.segments) {
    if (segment.type !== "tour") continue;
    const tourRunKey = segment.tourRunKey ?? `${segment.tour?.id ?? "tour"}|${segment.startTime}`;
    const bookingIds = Array.isArray(segment.bookingIds) ? segment.bookingIds : [];
    const guestCount = bookingIds.reduce(
      (sum, bookingId) => sum + (bookingLookup.get(bookingId)?.guestCount ?? 0),
      0
    );

    runs.push({
      id: `${timeline.guide.id}_${tourRunKey}`,
      tourRunKey,
      guideId: timeline.guide.id,
      tourName: segment.tour?.name ?? "Tour",
      startTime: segment.startTime,
      endTime: segment.endTime,
      durationMinutes: segment.durationMinutes,
      confidence: (segment.confidence ?? "optimal") as CanvasRun["confidence"],
      bookingIds,
      guestCount: segment.guestCount ?? guestCount,
    });
  }

  runs.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return runs;
}

function buildGuideLookup(
  rows: CanvasRow[],
  bookingLookup: Map<string, GuestCardBooking>
): Map<string, GuideCardData> {
  const lookup = new Map<string, GuideCardData>();

  for (const row of rows) {
    const assignments: GuideAssignment[] = row.runs.map((run) => {
      const bookings: AssignmentBooking[] = run.bookingIds
        .map((id) => bookingLookup.get(id))
        .filter((booking): booking is GuestCardBooking => Boolean(booking))
        .map((booking) => ({
          id: booking.id,
          referenceNumber: booking.referenceNumber,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          guestCount: booking.guestCount,
          adultCount: booking.adultCount,
          childCount: booking.childCount ?? null,
          pickupLocation: booking.pickupLocation ?? null,
          pickupTime: booking.pickupTime ?? null,
          pickupZoneName: booking.pickupZoneName ?? null,
          pickupZoneColor: booking.pickupZoneColor ?? null,
          isFirstTime: false,
          specialOccasion: booking.specialOccasion ?? null,
          accessibilityNeeds: booking.accessibilityNeeds ?? null,
          dietaryRequirements: booking.dietaryRequirements ?? null,
          specialRequests: booking.specialRequests ?? null,
        }));

      return {
        tourRunId: run.tourRunKey,
        tourName: run.tourName,
        startTime: run.startTime,
        endTime: run.endTime,
        guestCount: run.guestCount,
        pickupCount: bookings.length,
        bookings,
      };
    });

    lookup.set(row.guide.id, {
      id: row.guide.id,
      name: `${row.guide.firstName} ${row.guide.lastName}`.trim(),
      email: row.guide.email,
      phone: row.guide.phone,
      avatarUrl: row.guide.avatarUrl,
      vehicleCapacity: row.vehicleCapacity,
      status: assignments.length > 0 ? "assigned" : "available",
      totalAssignments: assignments.length,
      totalGuests: row.totalGuests,
      totalDriveMinutes: row.rawSegments
        .filter((segment) => segment.type === "drive")
        .reduce((sum, segment) => sum + segment.durationMinutes, 0),
      assignments,
    });
  }

  return lookup;
}

function buildUnassignedGroups(
  runs: DispatchResponse["tourRuns"],
  assignedBookingIds: Set<string>
): HopperGroup[] {
  const groups = new Map<string, HopperGroup>();

  for (const run of runs) {
    const unassignedBookings = run.bookings.filter((booking) => !assignedBookingIds.has(booking.id));
    if (unassignedBookings.length === 0) continue;

    for (const booking of unassignedBookings) {
      const isCharter = booking.experienceMode === "charter";
      const groupId = isCharter ? `charter_${booking.id}` : `run_${run.key}`;

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          tourRunKey: run.key,
          tourName: run.tour?.name ?? "Tour",
          tourTime: run.time,
          totalGuests: 0,
          totalBookings: 0,
          isCharter,
          bookings: [],
        });
      }

      const group = groups.get(groupId)!;
      const hopperBooking = toHopperBooking(run, booking);
      group.bookings.push(hopperBooking);
      group.totalGuests += hopperBooking.guestCount;
      group.totalBookings += 1;
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.tourTime.localeCompare(b.tourTime));
}

export function buildCommandCenterViewModel(response: DispatchResponse): CommandCenterViewModel {
  const bookingLookup = new Map<string, GuestCardBooking>();
  for (const run of response.tourRuns) {
    for (const booking of run.bookings) {
      bookingLookup.set(booking.id, toGuestCardBooking(run, booking));
    }
  }

  const assignedBookingIds = collectAssignedBookingIds(response.timelines);
  const rows: CanvasRow[] = response.timelines
    .map((timeline) => ({
      guide: timeline.guide,
      vehicleCapacity: timeline.vehicleCapacity,
      totalGuests: timeline.totalGuests,
      utilization: timeline.utilization,
      rawSegments: timeline.segments,
      runs: buildRuns(timeline, bookingLookup),
    }))
    .sort((a, b) =>
      `${a.guide.firstName} ${a.guide.lastName}`.localeCompare(
        `${b.guide.firstName} ${b.guide.lastName}`
      )
    );

  const groups = buildUnassignedGroups(response.tourRuns, assignedBookingIds);
  const guideLookup = buildGuideLookup(rows, bookingLookup);

  return {
    rows,
    groups,
    bookingLookup,
    guideLookup,
    assignedBookingIds,
  };
}

export function mapWarningType(type: string): DispatchWarning["type"] {
  switch (type) {
    case "insufficient_guides":
    case "capacity_exceeded":
      return "capacity";
    case "no_qualified_guide":
    case "no_available_guide":
      return "no_guide";
    case "conflict":
    case "schedule_conflict":
      return "conflict";
    default:
      return "conflict";
  }
}

export function mapStatus(status: string, unresolvedWarnings: number): DispatchData["status"] {
  if (status === "dispatched") return "dispatched";
  if (status === "ready") return "ready";
  if (status === "optimized" && unresolvedWarnings > 0) return "needs_review";
  if (status === "optimized") return "optimized";
  return "pending";
}
