/**
 * Dispatch Optimizer
 *
 * Implements a greedy assignment algorithm with scoring to optimize
 * guide dispatch for tour operations. This is the core algorithm for
 * the Tour Command Center.
 *
 * Algorithm Overview:
 * 1. Group & Sort Tour Runs (earlier first, larger first)
 * 2. For each tour run, find assignable and available guides
 * 3. Score candidates using multiple factors
 * 4. Assign top N guides (where N = guidesNeeded)
 * 5. Distribute bookings to guides respecting capacity
 * 6. Calculate optimal pickup sequence working backwards from tour start
 * 7. Calculate overall efficiency
 *
 * @module optimization/dispatch-optimizer
 */

import type {
  OptimizationInput,
  OptimizationOutput,
  TourRunInput,
  AvailableGuide,
  BookingInput,
  ProposedAssignment,
  OptimizationWarning,
  GuideSchedule,
  PickupSchedule,
  ScoreBreakdown,
  AssignmentConfidence,
  TravelMatrix,
  WarningType,
  WarningSeverity,
  SuggestedResolution,
} from "./types";
import {
  getTravelTime,
  getMostCommonZone,
} from "./travel-matrix";
import { formatDateForKey } from "../lib/tour-run-utils";
import { formatDateOnlyKey, parseDateOnlyKeyToLocalDate } from "../lib/date-time";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Algorithm version for tracking */
const ALGORITHM_VERSION = "1.0.0";

/** Scoring weights */
const SCORE = {
  PRIMARY_GUIDE_BONUS: 100,
  MAX_ZONE_PROXIMITY: 50,
  CAPACITY_FIT_GOOD: 30,
  CAPACITY_FIT_BAD: -100,
  WORKLOAD_PENALTY_PER_ASSIGNMENT: 15,
  LANGUAGE_MATCH_BONUS: 20,
} as const;

/** Time buffer before tour start (minutes) */
const ARRIVAL_BUFFER_MINUTES = 15;

/** Long drive time threshold for warnings (minutes) */
const LONG_DRIVE_TIME_THRESHOLD = 45;

// =============================================================================
// MAIN OPTIMIZATION FUNCTION
// =============================================================================

/**
 * Run the dispatch optimization algorithm
 *
 * @param input - Optimization input with tour runs, guides, and travel matrix
 * @returns Optimization output with assignments, warnings, and metrics
 *
 * @example
 * ```ts
 * const result = await optimizeDispatch({
 *   date: new Date(),
 *   tourRuns: [...],
 *   availableGuides: [...],
 *   travelMatrix: matrix,
 *   organizationId: "org_123",
 * });
 *
 * console.log(`Efficiency: ${result.efficiency}%`);
 * console.log(`Warnings: ${result.warnings.length}`);
 * ```
 */
export async function optimizeDispatch(
  input: OptimizationInput
): Promise<OptimizationOutput> {
  const { tourRuns, availableGuides, travelMatrix } = input;

  // Initialize tracking structures
  const guideSchedules = initializeGuideSchedules(availableGuides);
  const assignments: ProposedAssignment[] = [];
  const warnings: OptimizationWarning[] = [];
  let totalBookingsProcessed = 0;

  // Step 1: Sort tour runs by priority (earlier first, then larger first)
  const sortedTourRuns = sortTourRunsByPriority(tourRuns);

  // Step 2: Process each tour run
  for (const tourRun of sortedTourRuns) {
    const tourRunAssignments = processTourRun(
      tourRun,
      availableGuides,
      guideSchedules,
      travelMatrix,
      warnings
    );

    assignments.push(...tourRunAssignments);
    totalBookingsProcessed += tourRun.bookings.length;
  }

  // Step 3: Calculate metrics
  const efficiency = calculateEfficiency(assignments, guideSchedules, warnings);
  const totalDriveMinutes = calculateTotalDriveTime(guideSchedules);
  const guidesUsed = countGuidesUsed(guideSchedules);

  return {
    assignments,
    warnings,
    efficiency,
    totalDriveMinutes,
    guidesUsed,
    metadata: {
      optimizedAt: new Date(),
      algorithmVersion: ALGORITHM_VERSION,
      tourRunsProcessed: sortedTourRuns.length,
      bookingsProcessed: totalBookingsProcessed,
    },
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize guide schedule tracking structures
 */
function initializeGuideSchedules(
  guides: AvailableGuide[]
): Map<string, GuideSchedule> {
  const schedules = new Map<string, GuideSchedule>();

  for (const guide of guides) {
    schedules.set(guide.id, {
      guide,
      assignments: [],
      totalDriveMinutes: 0,
      currentZoneId: guide.baseZoneId,
      availableAt: guide.availableFrom,
      guestsAssigned: 0,
    });
  }

  return schedules;
}

/**
 * Sort tour runs by priority:
 * 1. Earlier tours first
 * 2. Larger tours first (harder to staff)
 */
function sortTourRunsByPriority(tourRuns: TourRunInput[]): TourRunInput[] {
  return [...tourRuns].sort((a, b) => {
    // First by time
    const timeCompare = compareTimes(a.time, b.time);
    if (timeCompare !== 0) return timeCompare;

    // Then by guest count (descending - larger first)
    return b.totalGuests - a.totalGuests;
  });
}

// =============================================================================
// TOUR RUN PROCESSING
// =============================================================================

/**
 * Process a single tour run: find guides, score, assign, and distribute bookings
 */
function processTourRun(
  tourRun: TourRunInput,
  allGuides: AvailableGuide[],
  guideSchedules: Map<string, GuideSchedule>,
  travelMatrix: TravelMatrix,
  warnings: OptimizationWarning[]
): ProposedAssignment[] {
  const assignments: ProposedAssignment[] = [];
  const tourRunId = `${tourRun.tourId}|${formatDateKey(tourRun.date)}|${tourRun.time}`;
  const incomingHasExclusive = tourRun.bookings.some((booking) => booking.isPrivate === true);

  // Step 1: Calculate tour run time window
  const tourStartTime = parseTourStartTime(tourRun.date, tourRun.time);
  const tourEndTime = new Date(tourStartTime.getTime() + tourRun.durationMinutes * 60 * 1000);

  // Step 2: Find assignable and available guides
  const candidates = findAssignableGuides(
    tourRunId,
    incomingHasExclusive,
    allGuides,
    guideSchedules,
    tourStartTime,
    tourEndTime
  );

  // Step 3: Score candidates
  const scoredCandidates = candidates.map((guide) => ({
    guide,
    score: scoreGuide(guide, tourRun, guideSchedules, travelMatrix),
    scoreBreakdown: getScoreBreakdown(guide, tourRun, guideSchedules, travelMatrix),
  }));

  // Sort by score (descending)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Step 4: Check if we have enough guides
  const guidesNeeded = tourRun.guidesNeeded;
  const guidesToAssign = scoredCandidates.slice(0, guidesNeeded);

  if (guidesToAssign.length < guidesNeeded) {
    warnings.push(createWarning({
      type: "insufficient_guides",
      severity: "critical",
      message: `Need ${guidesNeeded} guides for ${tourRun.tourName} at ${tourRun.time}, only ${guidesToAssign.length} available`,
      tourRunId,
      suggestedResolutions: createInsufficientGuidesResolutions(
        tourRun,
        scoredCandidates.slice(guidesNeeded),
        travelMatrix
      ),
    }));
  }

  if (guidesToAssign.length === 0) {
    // No guides available - create unassigned booking warnings
    for (const booking of tourRun.bookings) {
      warnings.push(createWarning({
        type: "unassigned_booking",
        severity: "critical",
        message: `Booking ${booking.referenceNumber} for ${tourRun.tourName} has no assigned guide`,
        tourRunId,
        bookingId: booking.id,
        suggestedResolutions: [
          { id: `ext_${booking.id}`, type: "add_external_guide", label: "Add External Guide" },
        ],
      }));
    }
    return [];
  }

  // Step 5: Distribute bookings across assigned guides
  const bookingDistribution = distributeBookings(
    tourRun.bookings,
    guidesToAssign.map((g) => g.guide),
    tourRun.guestsPerGuide
  );
  const assignedBookingIds = new Set(
    Array.from(bookingDistribution.values())
      .flat()
      .map((booking) => booking.id)
  );
  for (const booking of tourRun.bookings) {
    if (assignedBookingIds.has(booking.id)) continue;
    warnings.push(createWarning({
      type: "unassigned_booking",
      severity: "critical",
      message: `Booking ${booking.referenceNumber} for ${tourRun.tourName} could not be assigned`,
      tourRunId,
      bookingId: booking.id,
      suggestedResolutions: [
        { id: `ext_${booking.id}`, type: "add_external_guide", label: "Add External Guide" },
      ],
    }));
  }

  // Step 6: For each guide, calculate pickup sequence and times
  let isFirstGuide = true;

  for (const { guide, score, scoreBreakdown } of guidesToAssign) {
    const guideBookings = bookingDistribution.get(guide.id) || [];
    if (guideBookings.length === 0) continue;

    const schedule = guideSchedules.get(guide.id)!;

    // Calculate optimal pickup order
    const orderedBookings = optimizePickupOrder(
      guideBookings,
      guide.baseZoneId,
      travelMatrix
    );

    // Calculate pickup times working backwards from tour start
    const pickupSchedule = calculatePickupTimes(
      orderedBookings,
      tourStartTime,
      tourRun.meetingPointZoneId,
      travelMatrix
    );

    // Create assignments
    for (const pickup of pickupSchedule) {
      const booking = orderedBookings.find((b) => b.id === pickup.bookingId)!;
      const confidence = determineConfidence(score, pickup.driveMinutes);

      const proposedAssignment: ProposedAssignment = {
        bookingId: pickup.bookingId,
        guideId: guide.id,
        pickupOrder: pickup.order,
        calculatedPickupTime: pickup.time,
        driveTimeMinutes: pickup.driveMinutes,
        confidence,
        scoreBreakdown,
        tourRunId,
        isLeadGuide: isFirstGuide,
      };

      assignments.push(proposedAssignment);
      schedule.assignments.push(proposedAssignment);

      // Add warning for long drive times
      if (pickup.driveMinutes > LONG_DRIVE_TIME_THRESHOLD) {
        warnings.push(createWarning({
          type: "long_drive_time",
          severity: "warning",
          message: `Long drive time (${pickup.driveMinutes}min) to pick up ${booking.customerName}`,
          tourRunId,
          bookingId: pickup.bookingId,
          guideId: guide.id,
          suggestedResolutions: [],
        }));
      }
    }

    // Update guide schedule
    updateGuideSchedule(schedule, tourRun, pickupSchedule, tourStartTime, tourEndTime);
    isFirstGuide = false;
  }

  return assignments;
}

// =============================================================================
// GUIDE FINDING & FILTERING
// =============================================================================

/**
 * Find guides who are:
 * 1. Available during the time window
 * 2. Not conflicting with other assignments
 */
function findAssignableGuides(
  tourRunId: string,
  incomingHasExclusive: boolean,
  allGuides: AvailableGuide[],
  guideSchedules: Map<string, GuideSchedule>,
  tourStartTime: Date,
  tourEndTime: Date
): AvailableGuide[] {
  return allGuides.filter((guide) => {
    // Check availability window
    if (!isWithinAvailabilityWindow(guide, tourStartTime, tourEndTime)) {
      return false;
    }

    // Check for time conflicts
    const schedule = guideSchedules.get(guide.id);
    if (schedule && hasConflict(schedule, tourStartTime, tourEndTime, tourRunId, incomingHasExclusive)) {
      return false;
    }

    return true;
  });
}

/**
 * Check if guide is the primary guide for a tour
 */
function isPrimaryGuideForTour(guide: AvailableGuide, tourId: string): boolean {
  return guide.primaryTourIds.includes(tourId);
}

/**
 * Check if time range is within guide's availability window
 */
function isWithinAvailabilityWindow(
  guide: AvailableGuide,
  startTime: Date,
  endTime: Date
): boolean {
  if (Array.isArray(guide.availabilityWindows) && guide.availabilityWindows.length > 0) {
    return guide.availabilityWindows.some(
      (window) => startTime >= window.start && endTime <= window.end
    );
  }
  return startTime >= guide.availableFrom && endTime <= guide.availableTo;
}

/**
 * Check if guide has a conflicting assignment during the time range
 */
function hasConflict(
  schedule: GuideSchedule,
  startTime: Date,
  endTime: Date,
  tourRunId: string,
  incomingHasExclusive: boolean
): boolean {
  // Check existing assignments from the guide's current assignments
  for (const entry of schedule.guide.currentAssignments) {
    // Time overlap: startA < endB AND endA > startB
    if (entry.startsAt < endTime && entry.endsAt > startTime) {
      // Same run continuation is allowed for shared runs.
      if (entry.id === tourRunId) {
        if (entry.isExclusive || incomingHasExclusive) {
          return true;
        }
        continue;
      }
      return true;
    }
  }

  // Check assignments made by the optimizer in this session
  // Note: These are stored differently, so we need to track separately
  // For now, we track via availableAt
  if (schedule.availableAt > startTime) {
    return true;
  }

  return false;
}

// =============================================================================
// SCORING FUNCTION
// =============================================================================

/**
 * Score a guide for a tour run
 * Higher score = better fit
 */
function scoreGuide(
  guide: AvailableGuide,
  tourRun: TourRunInput,
  guideSchedules: Map<string, GuideSchedule>,
  travelMatrix: TravelMatrix
): number {
  let score = 0;
  const schedule = guideSchedules.get(guide.id);

  // Primary guide bonus (+100)
  if (isPrimaryGuideForTour(guide, tourRun.tourId)) {
    score += SCORE.PRIMARY_GUIDE_BONUS;
  }

  // Zone proximity (+50 to 0)
  // Less drive time from guide's base = higher score
  const avgPickupZone = getMostCommonZone(tourRun.bookings) || tourRun.primaryPickupZone;
  const driveFromBase = getTravelTime(travelMatrix, guide.baseZoneId, avgPickupZone);
  score += Math.max(0, SCORE.MAX_ZONE_PROXIMITY - driveFromBase);

  // Vehicle capacity fit (+30 to -100)
  const guestsPerGuide = Math.ceil(tourRun.totalGuests / tourRun.guidesNeeded);
  const capacityDiff = guide.vehicleCapacity - guestsPerGuide;

  if (capacityDiff >= 0 && capacityDiff <= 2) {
    score += SCORE.CAPACITY_FIT_GOOD; // Good fit
  } else if (capacityDiff < 0) {
    score += SCORE.CAPACITY_FIT_BAD; // Can't fit!
  }
  // capacityDiff > 2: no bonus/penalty (vehicle is bigger than needed)

  // Workload balancing (-15 per existing assignment)
  if (schedule) {
    score -= schedule.assignments.length * SCORE.WORKLOAD_PENALTY_PER_ASSIGNMENT;
  }

  // Language match (+20)
  if (
    tourRun.preferredLanguage &&
    guide.languages.includes(tourRun.preferredLanguage)
  ) {
    score += SCORE.LANGUAGE_MATCH_BONUS;
  }

  return score;
}

/**
 * Get detailed score breakdown for debugging/review
 */
function getScoreBreakdown(
  guide: AvailableGuide,
  tourRun: TourRunInput,
  guideSchedules: Map<string, GuideSchedule>,
  travelMatrix: TravelMatrix
): ScoreBreakdown {
  const schedule = guideSchedules.get(guide.id);
  const avgPickupZone = getMostCommonZone(tourRun.bookings) || tourRun.primaryPickupZone;
  const driveFromBase = getTravelTime(travelMatrix, guide.baseZoneId, avgPickupZone);
  const guestsPerGuide = Math.ceil(tourRun.totalGuests / tourRun.guidesNeeded);
  const capacityDiff = guide.vehicleCapacity - guestsPerGuide;

  const primaryGuideBonus = isPrimaryGuideForTour(guide, tourRun.tourId)
    ? SCORE.PRIMARY_GUIDE_BONUS
    : 0;

  const zoneProximity = Math.max(0, SCORE.MAX_ZONE_PROXIMITY - driveFromBase);

  let capacityFit = 0;
  if (capacityDiff >= 0 && capacityDiff <= 2) {
    capacityFit = SCORE.CAPACITY_FIT_GOOD;
  } else if (capacityDiff < 0) {
    capacityFit = SCORE.CAPACITY_FIT_BAD;
  }

  const workloadBalance = schedule
    ? -(schedule.assignments.length * SCORE.WORKLOAD_PENALTY_PER_ASSIGNMENT)
    : 0;

  const languageMatch =
    tourRun.preferredLanguage && guide.languages.includes(tourRun.preferredLanguage)
      ? SCORE.LANGUAGE_MATCH_BONUS
      : 0;

  return {
    total: primaryGuideBonus + zoneProximity + capacityFit + workloadBalance + languageMatch,
    primaryGuideBonus,
    zoneProximity,
    capacityFit,
    workloadBalance,
    languageMatch,
  };
}

// =============================================================================
// BOOKING DISTRIBUTION
// =============================================================================

/**
 * Distribute bookings across guides respecting vehicle capacity
 * Uses a greedy algorithm: largest bookings first, assign to guide with most remaining capacity
 */
function distributeBookings(
  bookings: BookingInput[],
  guides: AvailableGuide[],
  guestsPerGuide: number
): Map<string, BookingInput[]> {
  const distribution = new Map<string, BookingInput[]>();
  const guideCapacity = new Map<string, number>();
  const guideHasExclusive = new Set<string>();
  const guideHasShared = new Set<string>();

  // Initialize
  for (const guide of guides) {
    distribution.set(guide.id, []);
    guideCapacity.set(guide.id, Math.min(guide.vehicleCapacity, guestsPerGuide));
  }

  // Sort bookings by participant count (descending) - assign larger bookings first
  const sortedBookings = [...bookings].sort((a, b) => {
    const aExclusive = a.isPrivate === true;
    const bExclusive = b.isPrivate === true;
    if (aExclusive !== bExclusive) {
      return aExclusive ? -1 : 1;
    }
    return b.participantCount - a.participantCount;
  });

  // Assign each booking
  for (const booking of sortedBookings) {
    const bookingIsExclusive = booking.isPrivate === true;

    // Find guide with enough remaining capacity
    let bestGuide: string | null = null;
    let bestRemainingCapacity = -1;

    for (const guide of guides) {
      if (guideHasExclusive.has(guide.id)) {
        continue;
      }
      if (bookingIsExclusive && guideHasShared.has(guide.id)) {
        continue;
      }
      const remaining = guideCapacity.get(guide.id)!;
      if (bookingIsExclusive) {
        if (remaining > bestRemainingCapacity) {
          bestGuide = guide.id;
          bestRemainingCapacity = remaining;
        }
        continue;
      }
      if (remaining >= booking.participantCount && remaining > bestRemainingCapacity) {
        bestGuide = guide.id;
        bestRemainingCapacity = remaining;
      }
    }

    // If no guide has enough capacity, find one with most remaining (will be over capacity)
    if (!bestGuide && !bookingIsExclusive) {
      for (const guide of guides) {
        if (guideHasExclusive.has(guide.id)) {
          continue;
        }
        const remaining = guideCapacity.get(guide.id)!;
        if (remaining > bestRemainingCapacity) {
          bestGuide = guide.id;
          bestRemainingCapacity = remaining;
        }
      }
    }

    if (bestGuide) {
      distribution.get(bestGuide)!.push(booking);
      if (bookingIsExclusive) {
        guideHasExclusive.add(bestGuide);
        guideCapacity.set(bestGuide, 0);
      } else {
        guideHasShared.add(bestGuide);
        guideCapacity.set(
          bestGuide,
          guideCapacity.get(bestGuide)! - booking.participantCount
        );
      }
    }
  }

  return distribution;
}

// =============================================================================
// PICKUP OPTIMIZATION
// =============================================================================

/**
 * Find optimal pickup order using nearest neighbor algorithm
 * Starts from guide's base zone and visits each pickup in the order that minimizes travel
 */
function optimizePickupOrder(
  bookings: BookingInput[],
  startZoneId: string | undefined,
  travelMatrix: TravelMatrix
): BookingInput[] {
  if (bookings.length <= 1) {
    return bookings;
  }

  const ordered: BookingInput[] = [];
  const remaining = [...bookings];
  let currentZone = startZoneId;

  while (remaining.length > 0) {
    // Find nearest booking from current location
    let nearestIdx = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const booking = remaining[i]!;
      const distance = getTravelTime(travelMatrix, currentZone, booking.pickupZoneId);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIdx = i;
      }
    }

    // Add to ordered list
    const nearest = remaining.splice(nearestIdx, 1)[0]!;
    ordered.push(nearest);
    currentZone = nearest.pickupZoneId;
  }

  return ordered;
}

/**
 * Calculate pickup times working backwards from tour start
 * Each pickup time = next pickup time - drive time - buffer
 */
function calculatePickupTimes(
  orderedBookings: BookingInput[],
  tourStartTime: Date,
  meetingPointZoneId: string | undefined,
  travelMatrix: TravelMatrix
): PickupSchedule[] {
  if (orderedBookings.length === 0) {
    return [];
  }

  const schedule: PickupSchedule[] = [];

  // Work backwards from tour start
  let currentTime = new Date(tourStartTime.getTime() - ARRIVAL_BUFFER_MINUTES * 60 * 1000);
  let currentZone = meetingPointZoneId;

  // Process in reverse order
  for (let i = orderedBookings.length - 1; i >= 0; i--) {
    const booking = orderedBookings[i]!;
    const driveTime = getTravelTime(travelMatrix, booking.pickupZoneId, currentZone);

    // Pickup time = current time - drive time to next location
    const pickupTime = new Date(currentTime.getTime() - driveTime * 60 * 1000);

    schedule.unshift({
      bookingId: booking.id,
      order: i + 1,
      time: formatTime(pickupTime),
      driveMinutes: driveTime,
      zoneId: booking.pickupZoneId,
    });

    // Move backwards
    currentTime = pickupTime;
    currentZone = booking.pickupZoneId;
  }

  return schedule;
}

// =============================================================================
// SCHEDULE UPDATE
// =============================================================================

/**
 * Update guide's schedule after assigning bookings
 */
function updateGuideSchedule(
  schedule: GuideSchedule,
  tourRun: TourRunInput,
  pickupSchedule: PickupSchedule[],
  tourStartTime: Date,
  tourEndTime: Date
): void {
  // Add total drive time
  const totalDrive = pickupSchedule.reduce((sum, p) => sum + p.driveMinutes, 0);
  schedule.totalDriveMinutes += totalDrive;

  // Update available time (guide is busy until tour ends)
  schedule.availableAt = tourEndTime;

  // Update current zone (at meeting point after pickups)
  schedule.currentZoneId = tourRun.meetingPointZoneId;

  // Track guests
  const guestsThisRun = pickupSchedule.reduce((sum, p) => {
    const booking = tourRun.bookings.find((b) => b.id === p.bookingId);
    return sum + (booking?.participantCount || 0);
  }, 0);
  schedule.guestsAssigned += guestsThisRun;
}

// =============================================================================
// CONFIDENCE & EFFICIENCY
// =============================================================================

/**
 * Determine assignment confidence level based on score and drive time
 */
function determineConfidence(score: number, driveMinutes: number): AssignmentConfidence {
  // Score thresholds
  if (score >= 100) {
    return driveMinutes <= 20 ? "optimal" : "good";
  }
  if (score >= 50) {
    return driveMinutes <= 30 ? "good" : "review";
  }
  if (score >= 0) {
    return "review";
  }
  return "problem";
}

/**
 * Calculate overall efficiency score (0-100)
 */
function calculateEfficiency(
  assignments: ProposedAssignment[],
  guideSchedules: Map<string, GuideSchedule>,
  warnings: OptimizationWarning[]
): number {
  if (assignments.length === 0) {
    return 0;
  }

  // Base efficiency: 100 - (avg drive time ratio)
  // If guides spend 60 min driving per 60 min of work, that's 50% efficiency loss
  const totalGuides = countGuidesUsed(guideSchedules);
  const totalDriveMinutes = calculateTotalDriveTime(guideSchedules);
  const avgDrivePerGuide = totalGuides > 0 ? totalDriveMinutes / totalGuides : 0;

  // Assume 60 min baseline per guide
  let efficiency = 100 - (avgDrivePerGuide / 60) * 50;

  // Penalize for warnings
  const criticalWarnings = warnings.filter((w) => w.severity === "critical").length;
  const regularWarnings = warnings.filter((w) => w.severity === "warning").length;

  efficiency -= criticalWarnings * 10;
  efficiency -= regularWarnings * 5;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(efficiency)));
}

/**
 * Calculate total drive time across all guides
 */
function calculateTotalDriveTime(guideSchedules: Map<string, GuideSchedule>): number {
  let total = 0;
  for (const schedule of guideSchedules.values()) {
    total += schedule.totalDriveMinutes;
  }
  return total;
}

/**
 * Count number of guides with assignments
 */
function countGuidesUsed(guideSchedules: Map<string, GuideSchedule>): number {
  let count = 0;
  for (const schedule of guideSchedules.values()) {
    if (schedule.assignments.length > 0 || schedule.totalDriveMinutes > 0) {
      count++;
    }
  }
  return count;
}

// =============================================================================
// WARNING HELPERS
// =============================================================================

let warningIdCounter = 0;

/**
 * Create a warning with auto-generated ID
 */
function createWarning(params: {
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  tourRunId?: string;
  bookingId?: string;
  guideId?: string;
  suggestedResolutions: SuggestedResolution[];
}): OptimizationWarning {
  return {
    id: `warn_${Date.now()}_${++warningIdCounter}`,
    ...params,
  };
}

/**
 * Create resolutions for insufficient guides warning
 */
function createInsufficientGuidesResolutions(
  tourRun: TourRunInput,
  additionalCandidates: Array<{ guide: AvailableGuide; score: number }>,
  travelMatrix: TravelMatrix
): SuggestedResolution[] {
  const resolutions: SuggestedResolution[] = [];
  const avgPickupZone = getMostCommonZone(tourRun.bookings);

  // Suggest additional candidates if available
  for (const { guide } of additionalCandidates.slice(0, 3)) {
    const driveTime = getTravelTime(travelMatrix, guide.baseZoneId, avgPickupZone);
    resolutions.push({
      id: `assign_${guide.id}`,
      type: "assign_to_guide",
      label: `Assign to ${guide.name}`,
      additionalDriveMinutes: driveTime,
      guideId: guide.id,
      guideName: guide.name,
    });
  }

  // Always offer external guide option
  resolutions.push({
    id: "add_external",
    type: "add_external_guide",
    label: "Add External Guide",
  });

  return resolutions;
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

/**
 * Parse tour start time from date and time string
 */
function parseTourStartTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = parseDateOnlyKeyToLocalDate(formatDateOnlyKey(date));
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

/**
 * Format a Date to HH:MM string
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format date to YYYY-MM-DD key
 */
function formatDateKey(date: Date): string {
  return formatDateForKey(date);
}

/**
 * Compare two time strings (HH:MM format)
 */
function compareTimes(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);

  const minutes1 = (h1 || 0) * 60 + (m1 || 0);
  const minutes2 = (h2 || 0) * 60 + (m2 || 0);

  return minutes1 - minutes2;
}
