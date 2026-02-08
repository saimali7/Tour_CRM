/**
 * Demo data for visual testing of the Command Center.
 *
 * Generates 7 desert safari bookings for today only (mix of shared and
 * private). All bookings are unassigned so they appear in the queue —
 * real guides from the database show in the timeline lanes.
 */

import { format, isToday } from "date-fns";
import type { RouterOutputs } from "@/lib/trpc";

type DispatchResponse = RouterOutputs["commandCenter"]["getDispatch"];
type ServiceTourRun = DispatchResponse["tourRuns"][number];
type BookingShape = ServiceTourRun["bookings"][number];

// ---------------------------------------------------------------------------
// Stable IDs
// ---------------------------------------------------------------------------

const TOUR_MORNING_ID = "demo-tour-morning";
const TOUR_SUNSET_ID = "demo-tour-sunset";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBooking(
  overrides: Partial<BookingShape> &
    Pick<BookingShape, "id" | "referenceNumber" | "customerName" | "totalParticipants" | "adultCount">
): BookingShape {
  return {
    customerId: `cust-${overrides.id}`,
    customerEmail: null,
    customerPhone: null,
    childCount: 0,
    infantCount: 0,
    specialRequests: null,
    dietaryRequirements: null,
    accessibilityNeeds: null,
    internalNotes: null,
    status: "confirmed",
    paymentStatus: "paid",
    total: null,
    currency: "AED",
    pickupZoneId: null,
    pickupZone: null,
    pickupLocation: null,
    pickupTime: null,
    specialOccasion: null,
    isFirstTime: false,
    experienceMode: "join" as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------

const morningTour = {
  id: TOUR_MORNING_ID,
  name: "Desert Safari Morning",
  slug: "desert-safari-morning",
  durationMinutes: 180,
  meetingPoint: "Desert Camp Base",
  meetingPointDetails: "Main parking lot, look for the white Land Cruisers",
  guestsPerGuide: 12,
};

const sunsetTour = {
  id: TOUR_SUNSET_ID,
  name: "Desert Safari Sunset",
  slug: "desert-safari-sunset",
  durationMinutes: 180,
  meetingPoint: "Desert Camp Base",
  meetingPointDetails: "Main parking lot, look for the white Land Cruisers",
  guestsPerGuide: 10,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDemoDispatchResponse(date: Date): DispatchResponse {
  if (!isToday(date)) return emptyResponse(format(date, "yyyy-MM-dd"));
  return buildTodayResponse(format(date, "yyyy-MM-dd"));
}

// ---------------------------------------------------------------------------
// TODAY: 7 bookings, all unassigned (queue only — real guides from DB)
// ---------------------------------------------------------------------------
//
// MORNING (09:00) — 4 bookings, 3 shared + 1 charter
//   BK-2401  Johnson family    4 pax (2A+2C)  shared     Marina pickup     first-timer
//   BK-2402  Williams group    6 pax (6A)      shared     JBR pickup        accessibility
//   BK-2403  Thompson family   3 pax (2A+1inf) shared     Downtown pickup
//   BK-2404  Smith couple      2 pax (2A)      charter    Downtown pickup   anniversary
//
// SUNSET (16:00) — 3 bookings, 2 shared + 1 charter
//   BK-2405  Garcia group      5 pax (4A+1C)   shared     JBR pickup
//   BK-2406  Chen family       3 pax (2A+1C)   shared     Marina pickup
//   BK-2407  Müller couple     2 pax (2A)       charter    Marina pickup     honeymoon

function buildTodayResponse(d: string): DispatchResponse {
  const morningKey = `${TOUR_MORNING_ID}|${d}|09:00`;
  const sunsetKey = `${TOUR_SUNSET_ID}|${d}|16:00`;

  // --- Morning bookings ---------------------------------------------------

  const bk1 = makeBooking({
    id: "demo-bk-001",
    referenceNumber: "BK-2401",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.j@gmail.com",
    customerPhone: "+14155551234",
    totalParticipants: 4,
    adultCount: 2,
    childCount: 2,
    experienceMode: "join",
    pickupZone: { id: "zone-marina", name: "Dubai Marina", color: "#3b82f6" },
    pickupLocation: "Marriott Resort, lobby",
    pickupTime: "07:30",
    isFirstTime: true,
  });

  const bk2 = makeBooking({
    id: "demo-bk-002",
    referenceNumber: "BK-2402",
    customerName: "David Williams",
    customerEmail: "d.williams@outlook.com",
    totalParticipants: 6,
    adultCount: 6,
    experienceMode: "join",
    pickupZone: { id: "zone-jbr", name: "JBR", color: "#10b981" },
    pickupLocation: "Hilton JBR, ground floor",
    pickupTime: "07:45",
    accessibilityNeeds: "Wheelchair ramp needed",
  });

  const bk3 = makeBooking({
    id: "demo-bk-003",
    referenceNumber: "BK-2403",
    customerName: "Emma Thompson",
    customerEmail: "emma.t@yahoo.com",
    totalParticipants: 3,
    adultCount: 2,
    infantCount: 1,
    experienceMode: "join",
    pickupZone: { id: "zone-downtown", name: "Downtown", color: "#f59e0b" },
    pickupLocation: "Address Downtown, valet area",
    pickupTime: "07:15",
  });

  const bk4 = makeBooking({
    id: "demo-bk-004",
    referenceNumber: "BK-2404",
    customerName: "James Smith",
    customerEmail: "james.smith@icloud.com",
    customerPhone: "+447911123456",
    totalParticipants: 2,
    adultCount: 2,
    experienceMode: "charter",
    pickupZone: { id: "zone-downtown", name: "Downtown", color: "#f59e0b" },
    pickupLocation: "Burj Khalifa, main entrance",
    pickupTime: "07:30",
    specialOccasion: "Anniversary",
  });

  // --- Sunset bookings ----------------------------------------------------

  const bk5 = makeBooking({
    id: "demo-bk-005",
    referenceNumber: "BK-2405",
    customerName: "Carlos Garcia",
    customerEmail: "carlos.g@gmail.com",
    customerPhone: "+34612345678",
    totalParticipants: 5,
    adultCount: 4,
    childCount: 1,
    experienceMode: "join",
    pickupZone: { id: "zone-jbr", name: "JBR", color: "#10b981" },
    pickupLocation: "Ritz-Carlton JBR, lobby",
    pickupTime: "14:15",
  });

  const bk6 = makeBooking({
    id: "demo-bk-006",
    referenceNumber: "BK-2406",
    customerName: "Wei Chen",
    customerEmail: "wei.chen@qq.com",
    totalParticipants: 3,
    adultCount: 2,
    childCount: 1,
    experienceMode: "join",
    pickupZone: { id: "zone-marina", name: "Dubai Marina", color: "#3b82f6" },
    pickupLocation: "JW Marriott Marina, entrance",
    pickupTime: "14:30",
  });

  const bk7 = makeBooking({
    id: "demo-bk-007",
    referenceNumber: "BK-2407",
    customerName: "Klaus Müller",
    customerEmail: "k.muller@web.de",
    customerPhone: "+4917612345678",
    totalParticipants: 2,
    adultCount: 2,
    experienceMode: "charter",
    pickupZone: { id: "zone-marina", name: "Dubai Marina", color: "#3b82f6" },
    pickupLocation: "One&Only Royal Mirage, front",
    pickupTime: "14:00",
    specialOccasion: "Honeymoon",
  });

  // --- Tour runs (all unassigned) -----------------------------------------

  const morningBookings = [bk1, bk2, bk3, bk4];
  const sunsetBookings = [bk5, bk6, bk7];
  const totalGuests =
    morningBookings.reduce((s, b) => s + b.totalParticipants, 0) +
    sunsetBookings.reduce((s, b) => s + b.totalParticipants, 0);

  const tourRuns: ServiceTourRun[] = [
    {
      key: morningKey,
      tourId: TOUR_MORNING_ID,
      tour: morningTour,
      date: d,
      time: "09:00",
      bookings: morningBookings,
      totalGuests: morningBookings.reduce((s, b) => s + b.totalParticipants, 0),
      guidesNeeded: 2,
      guidesAssigned: 0,
      assignedGuides: [],
      status: "unassigned",
    },
    {
      key: sunsetKey,
      tourId: TOUR_SUNSET_ID,
      tour: sunsetTour,
      date: d,
      time: "16:00",
      bookings: sunsetBookings,
      totalGuests: sunsetBookings.reduce((s, b) => s + b.totalParticipants, 0),
      guidesNeeded: 1,
      guidesAssigned: 0,
      assignedGuides: [],
      status: "unassigned",
    },
  ];

  return {
    status: {
      date: d,
      status: "pending",
      optimizedAt: null,
      dispatchedAt: null,
      totalGuests,
      totalGuides: 0,
      totalDriveMinutes: 0,
      efficiencyScore: 0,
      unresolvedWarnings: 2,
      warnings: [
        {
          id: "demo-warn-morning",
          type: "no_available_guide",
          message: "Desert Safari Morning at 09:00 has no guide assigned (15 guests)",
          tourRunKey: morningKey,
          bookingId: undefined,
          resolved: false,
          resolutions: [],
        },
        {
          id: "demo-warn-sunset",
          type: "no_available_guide",
          message: "Desert Safari Sunset at 16:00 has no guide assigned (10 guests)",
          tourRunKey: sunsetKey,
          bookingId: undefined,
          resolved: false,
          resolutions: [],
        },
      ],
    },
    tourRuns,
    timelines: [],
  };
}

// ---------------------------------------------------------------------------
// Empty fallback for non-today dates
// ---------------------------------------------------------------------------

function emptyResponse(d: string): DispatchResponse {
  return {
    status: {
      date: d,
      status: "pending",
      optimizedAt: null,
      dispatchedAt: null,
      totalGuests: 0,
      totalGuides: 0,
      totalDriveMinutes: 0,
      efficiencyScore: 0,
      unresolvedWarnings: 0,
      warnings: [],
    },
    tourRuns: [],
    timelines: [],
  };
}
