/**
 * Travel Matrix Helper
 *
 * Utilities for building and querying travel time matrices between pickup zones.
 * The travel matrix is used to calculate optimal pickup routes and estimated times.
 */

import { eq } from "drizzle-orm";
import { db as database } from "@tour/database";
import type { TravelMatrix, ZoneTravelTime } from "./types";
import { createServiceLogger } from "../lib/logger";

const logger = createServiceLogger("travel-matrix");

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default travel time when no data is available (minutes) */
const DEFAULT_TRAVEL_TIME_MINUTES = 20;

/** Maximum reasonable travel time (minutes) - used to cap unrealistic values */
const MAX_TRAVEL_TIME_MINUTES = 120;

// =============================================================================
// BUILD TRAVEL MATRIX
// =============================================================================

/**
 * Build a travel time matrix from the database for an organization
 *
 * @param organizationId - The organization to build the matrix for
 * @returns A Map<fromZoneId, Map<toZoneId, minutes>> for fast lookups
 *
 * @example
 * ```ts
 * const matrix = await buildTravelMatrix(db, "org_123");
 * const minutes = getTravelTime(matrix, "marina", "downtown"); // 15
 * ```
 */
export async function buildTravelMatrix(
  organizationId: string
): Promise<TravelMatrix> {
  const matrix: TravelMatrix = new Map();

  try {
    // Query zone_travel_times table if it exists
    // For now, we'll use a placeholder since the table may not exist yet
    // In production, this would query:
    //
    // const travelTimes = await database.query.zoneTravelTimes.findMany({
    //   where: eq(zoneTravelTimes.organizationId, organizationId),
    // });

    // Initialize empty matrix - will be populated from database
    // This allows the algorithm to work even before travel times are configured

    return matrix;
  } catch (error) {
    // Log error but return empty matrix - algorithm will use defaults
    logger.error({ err: error, organizationId }, "Failed to build travel matrix");
    return matrix;
  }
}

/**
 * Build a travel matrix from an array of travel time entries
 * Useful for testing or when data comes from a different source
 *
 * @param entries - Array of zone travel time entries
 * @returns Travel matrix
 */
export function buildTravelMatrixFromEntries(
  entries: ZoneTravelTime[]
): TravelMatrix {
  const matrix: TravelMatrix = new Map();

  for (const entry of entries) {
    if (!matrix.has(entry.fromZoneId)) {
      matrix.set(entry.fromZoneId, new Map());
    }
    matrix.get(entry.fromZoneId)!.set(entry.toZoneId, entry.estimatedMinutes);
  }

  return matrix;
}

// =============================================================================
// QUERY TRAVEL TIME
// =============================================================================

/**
 * Get travel time between two zones
 *
 * @param matrix - The travel matrix to query
 * @param fromZoneId - Starting zone ID (nullable)
 * @param toZoneId - Destination zone ID (nullable)
 * @param defaultMinutes - Default value if no data (default: 20)
 * @returns Travel time in minutes
 *
 * @example
 * ```ts
 * const time = getTravelTime(matrix, "marina", "downtown"); // 15
 * const time2 = getTravelTime(matrix, null, "downtown");    // 20 (default)
 * const time3 = getTravelTime(matrix, "marina", "marina");  // 0 (same zone)
 * ```
 */
export function getTravelTime(
  matrix: TravelMatrix,
  fromZoneId: string | null | undefined,
  toZoneId: string | null | undefined,
  defaultMinutes: number = DEFAULT_TRAVEL_TIME_MINUTES
): number {
  // Same zone or missing zones = minimal travel time
  if (!fromZoneId || !toZoneId) {
    return defaultMinutes;
  }

  // Same zone = no travel needed
  if (fromZoneId === toZoneId) {
    return 0;
  }

  // Try to find in matrix
  const fromMap = matrix.get(fromZoneId);
  if (fromMap) {
    const time = fromMap.get(toZoneId);
    if (time !== undefined) {
      return Math.min(time, MAX_TRAVEL_TIME_MINUTES);
    }
  }

  // Try reverse direction (assume symmetric travel times)
  const reverseMap = matrix.get(toZoneId);
  if (reverseMap) {
    const time = reverseMap.get(fromZoneId);
    if (time !== undefined) {
      return Math.min(time, MAX_TRAVEL_TIME_MINUTES);
    }
  }

  // No data - return default
  return defaultMinutes;
}

/**
 * Calculate total travel time for a route through multiple zones
 *
 * @param matrix - The travel matrix
 * @param zoneIds - Ordered list of zone IDs to visit
 * @returns Total travel time in minutes
 *
 * @example
 * ```ts
 * const total = calculateRouteTravelTime(matrix, ["base", "marina", "downtown", "meetingPoint"]);
 * ```
 */
export function calculateRouteTravelTime(
  matrix: TravelMatrix,
  zoneIds: (string | null | undefined)[]
): number {
  let total = 0;

  for (let i = 0; i < zoneIds.length - 1; i++) {
    total += getTravelTime(matrix, zoneIds[i], zoneIds[i + 1]);
  }

  return total;
}

/**
 * Find the nearest zone from a list of candidates
 *
 * @param matrix - The travel matrix
 * @param fromZoneId - Starting zone
 * @param candidateZoneIds - Candidate destination zones
 * @returns The nearest zone ID and travel time, or null if no candidates
 */
export function findNearestZone(
  matrix: TravelMatrix,
  fromZoneId: string | null | undefined,
  candidateZoneIds: (string | null | undefined)[]
): { zoneId: string; minutes: number } | null {
  let nearest: { zoneId: string; minutes: number } | null = null;

  for (const zoneId of candidateZoneIds) {
    if (!zoneId) continue;

    const minutes = getTravelTime(matrix, fromZoneId, zoneId);

    if (nearest === null || minutes < nearest.minutes) {
      nearest = { zoneId, minutes };
    }
  }

  return nearest;
}

// =============================================================================
// ZONE UTILITIES
// =============================================================================

/**
 * Get all unique zones from a set of bookings
 *
 * @param bookings - Bookings with pickup zone IDs
 * @returns Set of unique zone IDs
 */
export function getUniqueZones(
  bookings: Array<{ pickupZoneId?: string | null }>
): Set<string> {
  const zones = new Set<string>();

  for (const booking of bookings) {
    if (booking.pickupZoneId) {
      zones.add(booking.pickupZoneId);
    }
  }

  return zones;
}

/**
 * Get the most common pickup zone from a list of bookings
 * Useful for determining the "primary" zone for a tour run
 *
 * @param bookings - Bookings with pickup zone IDs
 * @returns The most common zone ID, or undefined if none
 */
export function getMostCommonZone(
  bookings: Array<{ pickupZoneId?: string | null }>
): string | undefined {
  const zoneCounts = new Map<string, number>();

  for (const booking of bookings) {
    if (booking.pickupZoneId) {
      zoneCounts.set(
        booking.pickupZoneId,
        (zoneCounts.get(booking.pickupZoneId) || 0) + 1
      );
    }
  }

  if (zoneCounts.size === 0) {
    return undefined;
  }

  // Find zone with highest count
  let maxZone: string | undefined;
  let maxCount = 0;

  for (const [zone, count] of zoneCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxZone = zone;
    }
  }

  return maxZone;
}

/**
 * Group bookings by pickup zone
 *
 * @param bookings - Bookings to group
 * @returns Map of zone ID to bookings
 */
export function groupBookingsByZone<T extends { pickupZoneId?: string | null }>(
  bookings: T[]
): Map<string | null, T[]> {
  const groups = new Map<string | null, T[]>();

  for (const booking of bookings) {
    const zone = booking.pickupZoneId ?? null;
    if (!groups.has(zone)) {
      groups.set(zone, []);
    }
    groups.get(zone)!.push(booking);
  }

  return groups;
}

// =============================================================================
// MATRIX VALIDATION
// =============================================================================

/**
 * Validate that all required zones have travel time data
 *
 * @param matrix - The travel matrix
 * @param requiredZones - Zone IDs that need travel time data
 * @returns List of missing zone pairs
 */
export function validateMatrixCoverage(
  matrix: TravelMatrix,
  requiredZones: string[]
): Array<{ from: string; to: string }> {
  const missing: Array<{ from: string; to: string }> = [];

  for (const from of requiredZones) {
    for (const to of requiredZones) {
      if (from === to) continue;

      const time = getTravelTime(matrix, from, to, -1);
      if (time === -1) {
        missing.push({ from, to });
      }
    }
  }

  return missing;
}

/**
 * Get statistics about the travel matrix
 */
export function getMatrixStats(matrix: TravelMatrix): {
  zoneCount: number;
  entryCount: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
} {
  const zones = new Set<string>();
  let entryCount = 0;
  let totalTime = 0;
  let minTime = Infinity;
  let maxTime = 0;

  for (const [from, toMap] of matrix) {
    zones.add(from);
    for (const [to, time] of toMap) {
      zones.add(to);
      entryCount++;
      totalTime += time;
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
    }
  }

  return {
    zoneCount: zones.size,
    entryCount,
    averageTime: entryCount > 0 ? Math.round(totalTime / entryCount) : 0,
    minTime: minTime === Infinity ? 0 : minTime,
    maxTime,
  };
}
