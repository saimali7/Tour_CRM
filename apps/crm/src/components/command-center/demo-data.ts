/**
 * Demo data for visual testing of the Command Center.
 *
 * Generates 5 desert safari bookings across today and tomorrow,
 * with 3 guides and a mix of shared (join) and private (charter) runs.
 *
 * Used as fallback when the real API returns no data for the selected date.
 */

import { format } from "date-fns";
import type { RouterOutputs } from "@/lib/trpc";

type DispatchResponse = RouterOutputs["commandCenter"]["getDispatch"];
type ServiceTourRun = DispatchResponse["tourRuns"][number];
type ServiceTimeline = DispatchResponse["timelines"][number];
type BookingShape = ServiceTourRun["bookings"][number];

// ---------------------------------------------------------------------------
// IDs (stable so React keys don't thrash)
// ---------------------------------------------------------------------------

const TOUR_MORNING_ID = "demo-tour-morning";
const TOUR_SUNSET_ID = "demo-tour-sunset";

const GUIDE_AHMED_ID = "demo-guide-ahmed";
const GUIDE_FATIMA_ID = "demo-guide-fatima";
const GUIDE_OMAR_ID = "demo-guide-omar";

const BK_1_ID = "demo-bk-001";
const BK_2_ID = "demo-bk-002";
const BK_3_ID = "demo-bk-003";
const BK_4_ID = "demo-bk-004";
const BK_5_ID = "demo-bk-005";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function makeBooking(overrides: Partial<BookingShape> & Pick<BookingShape, "id" | "referenceNumber" | "customerName" | "totalParticipants" | "adultCount">): BookingShape {
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
// Tour shapes
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
// Guide shapes
// ---------------------------------------------------------------------------

const guideAhmed = {
  id: GUIDE_AHMED_ID,
  firstName: "Ahmed",
  lastName: "Al-Rashid",
  email: "ahmed@desertsafari.ae",
  phone: "+971501234567",
  avatarUrl: null as string | null,
};

const guideFatima = {
  id: GUIDE_FATIMA_ID,
  firstName: "Fatima",
  lastName: "Hassan",
  email: "fatima@desertsafari.ae",
  phone: "+971509876543",
  avatarUrl: null as string | null,
};

const guideOmar = {
  id: GUIDE_OMAR_ID,
  firstName: "Omar",
  lastName: "Khalil",
  email: "omar@desertsafari.ae",
  phone: "+971505551234",
  avatarUrl: null as string | null,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDemoDispatchResponse(date: Date): DispatchResponse {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = dateStr(today);
  const tomorrowStr = dateStr(tomorrow);
  const selectedStr = dateStr(date);

  if (selectedStr === todayStr) {
    return buildTodayResponse(todayStr);
  }
  if (selectedStr === tomorrowStr) {
    return buildTomorrowResponse(tomorrowStr);
  }
  // Other dates — return empty
  return emptyResponse(selectedStr);
}

// ---------------------------------------------------------------------------
// TODAY: 3 bookings, 2 guides active
// ---------------------------------------------------------------------------
// BK-001: Johnson family (4 pax, 2 adults + 2 kids) — shared morning — assigned to Ahmed
// BK-002: Smith couple (2 pax) — private/charter sunset — unassigned (in queue)
// BK-003: Williams group (6 pax) — shared morning — assigned to Ahmed

function buildTodayResponse(d: string): DispatchResponse {
  const morningKey = `${TOUR_MORNING_ID}|${d}|09:00`;
  const sunsetKey = `${TOUR_SUNSET_ID}|${d}|16:00`;

  const bk1: BookingShape = makeBooking({
    id: BK_1_ID,
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
    specialOccasion: null,
    isFirstTime: true,
  });

  const bk2: BookingShape = makeBooking({
    id: BK_2_ID,
    referenceNumber: "BK-2402",
    customerName: "James Smith",
    customerEmail: "james.smith@icloud.com",
    customerPhone: "+447911123456",
    totalParticipants: 2,
    adultCount: 2,
    experienceMode: "charter",
    pickupZone: { id: "zone-downtown", name: "Downtown", color: "#f59e0b" },
    pickupLocation: "Burj Khalifa, main entrance",
    pickupTime: "14:30",
    specialOccasion: "Anniversary",
  });

  const bk3: BookingShape = makeBooking({
    id: BK_3_ID,
    referenceNumber: "BK-2403",
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

  const tourRuns: ServiceTourRun[] = [
    {
      key: morningKey,
      tourId: TOUR_MORNING_ID,
      tour: morningTour,
      date: d,
      time: "09:00",
      bookings: [bk1, bk3],
      totalGuests: 10,
      guidesNeeded: 1,
      guidesAssigned: 1,
      assignedGuides: [
        {
          assignmentId: "assign-ahmed-morning",
          guideId: GUIDE_AHMED_ID,
          guideName: "Ahmed Al-Rashid",
          guideEmail: guideAhmed.email,
          guidePhone: guideAhmed.phone,
          isOutsourced: false,
          isLeadGuide: true,
          pickupOrder: null,
          calculatedPickupTime: null,
          driveTimeMinutes: null,
          status: "confirmed",
        },
      ],
      status: "assigned",
    },
    {
      key: sunsetKey,
      tourId: TOUR_SUNSET_ID,
      tour: sunsetTour,
      date: d,
      time: "16:00",
      bookings: [bk2],
      totalGuests: 2,
      guidesNeeded: 1,
      guidesAssigned: 0,
      assignedGuides: [],
      status: "unassigned",
    },
  ];

  const timelines: ServiceTimeline[] = [
    {
      guide: guideAhmed,
      vehicleCapacity: 12,
      segments: [
        {
          type: "pickup",
          startTime: "07:30",
          endTime: "07:45",
          durationMinutes: 15,
          booking: bk1,
          pickupLocation: "Marriott Resort, lobby",
          pickupZoneName: "Dubai Marina",
          pickupZoneColor: "#3b82f6",
          guestCount: 4,
          confidence: "optimal",
        },
        {
          type: "pickup",
          startTime: "07:45",
          endTime: "08:00",
          durationMinutes: 15,
          booking: bk3,
          pickupLocation: "Hilton JBR, ground floor",
          pickupZoneName: "JBR",
          pickupZoneColor: "#10b981",
          guestCount: 6,
          confidence: "good",
        },
        {
          type: "drive",
          startTime: "08:00",
          endTime: "08:45",
          durationMinutes: 45,
          confidence: "optimal",
        },
        {
          type: "tour",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          tour: { id: TOUR_MORNING_ID, name: "Desert Safari Morning", slug: "desert-safari-morning" },
          tourRunKey: morningKey,
          bookingIds: [BK_1_ID, BK_3_ID],
          guestCount: 10,
          confidence: "optimal",
        },
      ],
      totalDriveMinutes: 45,
      totalGuests: 10,
      utilization: 83,
    },
    {
      guide: guideFatima,
      vehicleCapacity: 8,
      segments: [],
      totalDriveMinutes: 0,
      totalGuests: 0,
      utilization: 0,
    },
    {
      guide: guideOmar,
      vehicleCapacity: 10,
      segments: [],
      totalDriveMinutes: 0,
      totalGuests: 0,
      utilization: 0,
    },
  ];

  return {
    status: {
      date: d,
      status: "pending",
      optimizedAt: null,
      dispatchedAt: null,
      totalGuests: 12,
      totalGuides: 3,
      totalDriveMinutes: 45,
      efficiencyScore: 72,
      unresolvedWarnings: 1,
      warnings: [
        {
          id: "demo-warn-sunset-unassigned",
          type: "no_available_guide",
          message: "Desert Safari Sunset at 16:00 has no guide assigned",
          tourRunKey: sunsetKey,
          bookingId: undefined,
          resolved: false,
          resolutions: [
            {
              id: "quick_assign_fatima",
              label: "Assign Fatima Hassan",
              guideId: GUIDE_FATIMA_ID,
              action: "assign_guide",
              impactMinutes: undefined,
            },
            {
              id: "quick_assign_omar",
              label: "Assign Omar Khalil",
              guideId: GUIDE_OMAR_ID,
              action: "assign_guide",
              impactMinutes: undefined,
            },
          ],
        },
      ],
    },
    tourRuns,
    timelines,
  };
}

// ---------------------------------------------------------------------------
// TOMORROW: 2 bookings, 1 guide active
// ---------------------------------------------------------------------------
// BK-004: Chen family (3 pax, 2A+1C) — shared sunset — unassigned (in queue)
// BK-005: Müller couple (2 pax) — private/charter morning — assigned to Fatima

function buildTomorrowResponse(d: string): DispatchResponse {
  const morningKey = `${TOUR_MORNING_ID}|${d}|09:00`;
  const sunsetKey = `${TOUR_SUNSET_ID}|${d}|16:00`;

  const bk4: BookingShape = makeBooking({
    id: BK_4_ID,
    referenceNumber: "BK-2404",
    customerName: "Wei Chen",
    customerEmail: "wei.chen@qq.com",
    totalParticipants: 3,
    adultCount: 2,
    childCount: 1,
    experienceMode: "join",
    pickupZone: { id: "zone-downtown", name: "Downtown", color: "#f59e0b" },
    pickupLocation: "Address Downtown, valet area",
    pickupTime: "14:30",
  });

  const bk5: BookingShape = makeBooking({
    id: BK_5_ID,
    referenceNumber: "BK-2405",
    customerName: "Klaus Müller",
    customerEmail: "k.muller@web.de",
    customerPhone: "+4917612345678",
    totalParticipants: 2,
    adultCount: 2,
    experienceMode: "charter",
    pickupZone: { id: "zone-marina", name: "Dubai Marina", color: "#3b82f6" },
    pickupLocation: "One&Only Royal Mirage, front",
    pickupTime: "07:30",
    specialOccasion: "Honeymoon",
  });

  const tourRuns: ServiceTourRun[] = [
    {
      key: morningKey,
      tourId: TOUR_MORNING_ID,
      tour: morningTour,
      date: d,
      time: "09:00",
      bookings: [bk5],
      totalGuests: 2,
      guidesNeeded: 1,
      guidesAssigned: 1,
      assignedGuides: [
        {
          assignmentId: "assign-fatima-morning-tmrw",
          guideId: GUIDE_FATIMA_ID,
          guideName: "Fatima Hassan",
          guideEmail: guideFatima.email,
          guidePhone: guideFatima.phone,
          isOutsourced: false,
          isLeadGuide: true,
          pickupOrder: null,
          calculatedPickupTime: null,
          driveTimeMinutes: null,
          status: "confirmed",
        },
      ],
      status: "assigned",
    },
    {
      key: sunsetKey,
      tourId: TOUR_SUNSET_ID,
      tour: sunsetTour,
      date: d,
      time: "16:00",
      bookings: [bk4],
      totalGuests: 3,
      guidesNeeded: 1,
      guidesAssigned: 0,
      assignedGuides: [],
      status: "unassigned",
    },
  ];

  const timelines: ServiceTimeline[] = [
    {
      guide: guideFatima,
      vehicleCapacity: 8,
      segments: [
        {
          type: "pickup",
          startTime: "07:30",
          endTime: "07:45",
          durationMinutes: 15,
          booking: bk5,
          pickupLocation: "One&Only Royal Mirage, front",
          pickupZoneName: "Dubai Marina",
          pickupZoneColor: "#3b82f6",
          guestCount: 2,
          confidence: "optimal",
        },
        {
          type: "drive",
          startTime: "07:45",
          endTime: "08:30",
          durationMinutes: 45,
          confidence: "optimal",
        },
        {
          type: "tour",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          tour: { id: TOUR_MORNING_ID, name: "Desert Safari Morning", slug: "desert-safari-morning" },
          tourRunKey: morningKey,
          bookingIds: [BK_5_ID],
          guestCount: 2,
          confidence: "optimal",
        },
      ],
      totalDriveMinutes: 45,
      totalGuests: 2,
      utilization: 25,
    },
    {
      guide: guideAhmed,
      vehicleCapacity: 12,
      segments: [],
      totalDriveMinutes: 0,
      totalGuests: 0,
      utilization: 0,
    },
    {
      guide: guideOmar,
      vehicleCapacity: 10,
      segments: [],
      totalDriveMinutes: 0,
      totalGuests: 0,
      utilization: 0,
    },
  ];

  return {
    status: {
      date: d,
      status: "pending",
      optimizedAt: null,
      dispatchedAt: null,
      totalGuests: 5,
      totalGuides: 3,
      totalDriveMinutes: 45,
      efficiencyScore: 45,
      unresolvedWarnings: 1,
      warnings: [
        {
          id: "demo-warn-sunset-tmrw-unassigned",
          type: "no_available_guide",
          message: "Desert Safari Sunset at 16:00 has no guide assigned",
          tourRunKey: sunsetKey,
          bookingId: undefined,
          resolved: false,
          resolutions: [
            {
              id: "quick_assign_ahmed",
              label: "Assign Ahmed Al-Rashid",
              guideId: GUIDE_AHMED_ID,
              action: "assign_guide",
              impactMinutes: undefined,
            },
            {
              id: "quick_assign_omar",
              label: "Assign Omar Khalil",
              guideId: GUIDE_OMAR_ID,
              action: "assign_guide",
              impactMinutes: undefined,
            },
          ],
        },
      ],
    },
    tourRuns,
    timelines,
  };
}

// ---------------------------------------------------------------------------
// Empty fallback
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
