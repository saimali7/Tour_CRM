import { BaseService } from "./base-service";

/**
 * Coordinate point with latitude and longitude
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Pickup point with coordinates and optional timing info
 */
export interface PickupPoint extends Coordinate {
  id?: string;
  averagePickupMinutes?: number;
  zone?: string | null;
}

/**
 * Result of pickup time calculation
 */
export interface PickupTimeResult {
  id: string;
  estimatedPickupTime: Date;
}

/**
 * Result of analyzing a pickup addition
 */
export interface PickupAdditionAnalysis {
  /** Minutes added by this pickup */
  addedMinutes: number;
  /** Total route minutes after adding this pickup */
  newTotalMinutes: number;
  /** True if addedMinutes <= 15 (efficiency threshold) */
  isEfficient: boolean;
  /** Route efficiency score 0-100 after adding pickup */
  efficiencyScore: number;
}

/**
 * Zone reference for inferring zone from coordinates
 */
export interface ZoneReference {
  zone: string;
  latitude: number;
  longitude: number;
}

/**
 * Constants for route calculations
 */
const EARTH_RADIUS_KM = 6371;
const AVERAGE_CITY_SPEED_KMH = 30;
const DEFAULT_PICKUP_MINUTES = 5;
const DEFAULT_BUFFER_MINUTES = 5;
const EFFICIENCY_THRESHOLD_MINUTES = 15;
const ZONE_PROXIMITY_THRESHOLD_KM = 5; // Max distance to infer zone

/**
 * RouteOptimizationService - Handles distance calculations and route optimization
 *
 * Uses Haversine formula for distance calculations and nearest-neighbor
 * algorithm for route optimization. Pickup times are calculated backwards
 * from tour start time.
 *
 * @example
 * ```ts
 * const service = new RouteOptimizationService(ctx);
 *
 * // Calculate distance between two points
 * const distance = service.calculateDistance(25.0657, 55.1713, 25.0876, 55.1385);
 * // Returns: ~3.9 km
 *
 * // Optimize pickup order
 * const optimized = service.optimizePickupOrder(pickups, startPoint);
 *
 * // Calculate pickup times working backwards from tour start
 * const times = service.calculatePickupTimes(pickups, destination, tourStartTime);
 * ```
 */
export class RouteOptimizationService extends BaseService {
  // ============================================================
  // DISTANCE CALCULATIONS
  // ============================================================

  /**
   * Calculate distance between two coordinates using Haversine formula
   *
   * The Haversine formula calculates the great-circle distance between
   * two points on a sphere given their longitudes and latitudes.
   *
   * @param lat1 - Latitude of first point in degrees
   * @param lon1 - Longitude of first point in degrees
   * @param lat2 - Latitude of second point in degrees
   * @param lon2 - Longitude of second point in degrees
   * @returns Distance in kilometers
   *
   * @example
   * ```ts
   * // Dubai Marina to Palm Jumeirah (roughly 4km)
   * const distance = service.calculateDistance(25.0657, 55.1713, 25.1124, 55.1387);
   * console.log(distance); // ~5.4 km
   * ```
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Handle same point edge case
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  /**
   * Estimate drive time between two points
   *
   * Uses conservative city driving speed (30 km/h average) to account
   * for traffic, signals, and urban driving conditions.
   *
   * @param from - Starting coordinate
   * @param to - Destination coordinate
   * @returns Drive time in minutes (rounded up)
   *
   * @example
   * ```ts
   * const minutes = service.calculateDriveMinutes(
   *   { latitude: 25.0657, longitude: 55.1713 },
   *   { latitude: 25.0876, longitude: 55.1385 }
   * );
   * console.log(minutes); // ~8 minutes
   * ```
   */
  calculateDriveMinutes(from: Coordinate, to: Coordinate): number {
    // Handle missing coordinates
    if (!this.hasValidCoordinates(from) || !this.hasValidCoordinates(to)) {
      return DEFAULT_PICKUP_MINUTES; // Return default as fallback
    }

    const distanceKm = this.calculateDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    // Convert to minutes: (distance / speed) * 60
    // Always round up to be conservative
    return Math.ceil((distanceKm / AVERAGE_CITY_SPEED_KMH) * 60);
  }

  /**
   * Calculate total route duration for a sequence of pickups
   *
   * Includes drive times between all points plus pickup durations at each stop.
   * The route goes from first pickup through all pickups to the final destination.
   *
   * @param pickups - Array of pickup points in order
   * @param destination - Final destination (e.g., tour meeting point)
   * @returns Total route duration in minutes
   *
   * @example
   * ```ts
   * const duration = service.calculateRouteDuration(
   *   [
   *     { latitude: 25.0657, longitude: 55.1713, averagePickupMinutes: 5 },
   *     { latitude: 25.0876, longitude: 55.1385, averagePickupMinutes: 5 },
   *   ],
   *   { latitude: 25.1124, longitude: 55.1387 } // Tour meeting point
   * );
   * console.log(duration); // Total minutes including drives and pickups
   * ```
   */
  calculateRouteDuration(
    pickups: Array<{
      latitude: number;
      longitude: number;
      averagePickupMinutes?: number;
    }>,
    destination: Coordinate
  ): number {
    // Handle edge cases
    if (pickups.length === 0) {
      return 0;
    }

    let totalMinutes = 0;

    // Add drive time and pickup time for each stop
    for (let i = 0; i < pickups.length; i++) {
      const current = pickups[i]!;

      // Add pickup duration at this stop
      totalMinutes += current.averagePickupMinutes ?? DEFAULT_PICKUP_MINUTES;

      // Add drive time to next stop
      if (i < pickups.length - 1) {
        // Drive to next pickup
        const next = pickups[i + 1]!;
        totalMinutes += this.calculateDriveMinutes(current, next);
      } else {
        // Last pickup - drive to destination
        totalMinutes += this.calculateDriveMinutes(current, destination);
      }
    }

    return totalMinutes;
  }

  // ============================================================
  // ROUTE OPTIMIZATION
  // ============================================================

  /**
   * Optimize pickup order using nearest-neighbor algorithm
   *
   * The nearest-neighbor algorithm is a greedy heuristic that builds a route
   * by repeatedly visiting the nearest unvisited location. While not globally
   * optimal, it produces good results quickly for typical tour pickup scenarios.
   *
   * Algorithm:
   * 1. Start at startPoint (or first pickup if not provided)
   * 2. Find the closest unvisited pickup
   * 3. Move to that pickup, mark as visited
   * 4. Repeat until all pickups are visited
   * 5. Return pickups in optimized order
   *
   * @param pickups - Array of pickups with coordinates
   * @param startPoint - Optional starting location (e.g., guide's home)
   * @returns Pickups reordered to minimize total distance
   *
   * @example
   * ```ts
   * const pickups = [
   *   { id: '1', latitude: 25.0657, longitude: 55.1713, name: 'Marina' },
   *   { id: '2', latitude: 25.1124, longitude: 55.1387, name: 'Palm' },
   *   { id: '3', latitude: 25.0876, longitude: 55.1385, name: 'JBR' },
   * ];
   *
   * const optimized = service.optimizePickupOrder(pickups, { latitude: 25.0, longitude: 55.1 });
   * // Returns pickups reordered for shortest total distance
   * ```
   */
  optimizePickupOrder<T extends Coordinate>(
    pickups: T[],
    startPoint?: Coordinate
  ): T[] {
    // Handle edge cases
    if (pickups.length <= 1) {
      return [...pickups];
    }

    // Filter out pickups with invalid coordinates
    const validPickups = pickups.filter((p) => this.hasValidCoordinates(p));
    if (validPickups.length <= 1) {
      return [...pickups]; // Return original if not enough valid coordinates
    }

    const optimized: T[] = [];
    const remaining = new Set(validPickups);

    // Determine starting point
    let currentPoint: Coordinate;
    if (startPoint && this.hasValidCoordinates(startPoint)) {
      currentPoint = startPoint;
    } else {
      // Use first pickup as start
      const first = validPickups[0]!;
      optimized.push(first);
      remaining.delete(first);
      currentPoint = first;
    }

    // Greedily select nearest unvisited pickup
    while (remaining.size > 0) {
      let nearest: T | null = null;
      let nearestDistance = Infinity;

      for (const pickup of remaining) {
        const distance = this.calculateDistance(
          currentPoint.latitude,
          currentPoint.longitude,
          pickup.latitude,
          pickup.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = pickup;
        }
      }

      if (nearest) {
        optimized.push(nearest);
        remaining.delete(nearest);
        currentPoint = nearest;
      }
    }

    // Add any pickups with invalid coordinates at the end
    const invalidPickups = pickups.filter((p) => !this.hasValidCoordinates(p));
    return [...optimized, ...invalidPickups];
  }

  /**
   * Calculate pickup times working BACKWARDS from tour start
   *
   * Starting from the tour start time, this method works backwards to
   * determine when each pickup should occur. This ensures all customers
   * are picked up in time for the tour to start on schedule.
   *
   * Calculation:
   * - lastPickupArrival = tourStart - buffer
   * - For each pickup (from last to first):
   *   - pickupTime = nextPickupTime - driveToNext - pickupDuration
   *
   * @param pickups - Array of pickups with coordinates and optional timing
   * @param destination - Tour meeting point
   * @param tourStartTime - When the tour begins
   * @param bufferMinutes - Buffer time before tour (default: 5 minutes)
   * @returns Array of pickup IDs with calculated pickup times
   *
   * @example
   * ```ts
   * const pickups = [
   *   { id: 'p1', latitude: 25.0657, longitude: 55.1713, averagePickupMinutes: 5 },
   *   { id: 'p2', latitude: 25.0876, longitude: 55.1385, averagePickupMinutes: 5 },
   * ];
   *
   * const tourStart = new Date('2024-01-15T09:30:00');
   * const times = service.calculatePickupTimes(pickups, destination, tourStart);
   *
   * // Returns:
   * // [
   * //   { id: 'p1', estimatedPickupTime: Date('2024-01-15T08:45:00') },
   * //   { id: 'p2', estimatedPickupTime: Date('2024-01-15T09:00:00') },
   * // ]
   * ```
   */
  calculatePickupTimes(
    pickups: Array<{
      id: string;
      latitude: number;
      longitude: number;
      averagePickupMinutes?: number;
    }>,
    destination: Coordinate,
    tourStartTime: Date,
    bufferMinutes: number = DEFAULT_BUFFER_MINUTES
  ): PickupTimeResult[] {
    // Handle edge cases
    if (pickups.length === 0) {
      return [];
    }

    const results: PickupTimeResult[] = [];

    // Work backwards from tour start time
    // Start with buffer before tour
    let currentTime = new Date(tourStartTime.getTime() - bufferMinutes * 60000);

    // Process pickups in reverse order (last pickup first)
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i]!;

      // For the last pickup, subtract drive time to destination
      if (i === pickups.length - 1) {
        const driveToDestination = this.calculateDriveMinutes(
          pickup,
          destination
        );
        currentTime = new Date(currentTime.getTime() - driveToDestination * 60000);
      }

      // This is the pickup time at this location
      results.unshift({
        id: pickup.id,
        estimatedPickupTime: new Date(currentTime),
      });

      // For non-first pickups, subtract pickup duration and drive time from previous
      if (i > 0) {
        const previousPickup = pickups[i - 1]!;
        const pickupDuration =
          pickup.averagePickupMinutes ?? DEFAULT_PICKUP_MINUTES;
        const driveToCurrent = this.calculateDriveMinutes(previousPickup, pickup);

        currentTime = new Date(
          currentTime.getTime() - (pickupDuration + driveToCurrent) * 60000
        );
      }
    }

    return results;
  }

  // ============================================================
  // EFFICIENCY ANALYSIS
  // ============================================================

  /**
   * Calculate efficiency score for a route (0-100)
   *
   * Efficiency is measured by comparing the total route distance to the
   * theoretical minimum (direct line from first pickup to destination).
   * A perfectly straight route scores 100, while routes with more
   * backtracking score lower.
   *
   * Formula: efficiency = (directDistance / actualDistance) * 100
   *
   * @param pickups - Array of pickup coordinates in order
   * @param destination - Final destination
   * @returns Efficiency score 0-100 (higher = more efficient)
   *
   * @example
   * ```ts
   * const score = service.calculateRouteEfficiency(pickups, destination);
   * if (score < 50) {
   *   console.log('Route may benefit from reordering');
   * }
   * ```
   */
  calculateRouteEfficiency(
    pickups: Array<Coordinate>,
    destination: Coordinate
  ): number {
    // Handle edge cases
    if (pickups.length === 0) {
      return 100; // No pickups = perfectly efficient
    }

    if (pickups.length === 1) {
      return 100; // Single pickup = perfectly efficient
    }

    // Filter valid coordinates
    const validPickups = pickups.filter((p) => this.hasValidCoordinates(p));
    if (validPickups.length === 0) {
      return 0; // No valid coordinates
    }

    // Calculate actual route distance
    let actualDistance = 0;
    for (let i = 0; i < validPickups.length - 1; i++) {
      const current = validPickups[i]!;
      const next = validPickups[i + 1]!;
      actualDistance += this.calculateDistance(
        current.latitude,
        current.longitude,
        next.latitude,
        next.longitude
      );
    }

    // Add distance from last pickup to destination
    const lastPickup = validPickups[validPickups.length - 1]!;
    actualDistance += this.calculateDistance(
      lastPickup.latitude,
      lastPickup.longitude,
      destination.latitude,
      destination.longitude
    );

    // Calculate direct distance (first pickup to destination)
    const firstPickup = validPickups[0]!;
    const directDistance = this.calculateDistance(
      firstPickup.latitude,
      firstPickup.longitude,
      destination.latitude,
      destination.longitude
    );

    // Avoid division by zero
    if (actualDistance === 0) {
      return 100;
    }

    // Calculate efficiency as ratio of direct to actual
    // Clamp between 0 and 100
    const efficiency = Math.min(100, (directDistance / actualDistance) * 100);
    return Math.round(efficiency);
  }

  /**
   * Analyze impact of adding a new pickup to existing route
   *
   * This method calculates how adding a new pickup at a specific position
   * affects the route's total duration and efficiency. Useful for ghost
   * preview calculations in the UI.
   *
   * @param existingPickups - Current pickups in order
   * @param newPickup - The pickup to add
   * @param position - Index where to insert (0 = first, length = last)
   * @param destination - Tour meeting point
   * @returns Analysis including added minutes, efficiency, and recommendation
   *
   * @example
   * ```ts
   * const analysis = service.analyzePickupAddition(
   *   existingPickups,
   *   newPickup,
   *   2, // Insert at position 2
   *   destination
   * );
   *
   * if (!analysis.isEfficient) {
   *   console.log(`Adding +${analysis.addedMinutes}m - consider different position`);
   * }
   * ```
   */
  analyzePickupAddition(
    existingPickups: Array<{
      latitude: number;
      longitude: number;
      averagePickupMinutes?: number;
    }>,
    newPickup: {
      latitude: number;
      longitude: number;
      averagePickupMinutes?: number;
    },
    position: number,
    destination: Coordinate
  ): PickupAdditionAnalysis {
    // Calculate current route duration
    const currentDuration = this.calculateRouteDuration(
      existingPickups,
      destination
    );

    // Insert new pickup at position
    const newPickups = [...existingPickups];
    const insertIndex = Math.max(0, Math.min(position, newPickups.length));
    newPickups.splice(insertIndex, 0, newPickup);

    // Calculate new route duration
    const newTotalMinutes = this.calculateRouteDuration(newPickups, destination);

    // Calculate added minutes
    const addedMinutes = newTotalMinutes - currentDuration;

    // Calculate efficiency score with new pickup
    const efficiencyScore = this.calculateRouteEfficiency(newPickups, destination);

    // Determine if efficient (threshold: 15 minutes added)
    const isEfficient = addedMinutes <= EFFICIENCY_THRESHOLD_MINUTES;

    return {
      addedMinutes,
      newTotalMinutes,
      isEfficient,
      efficiencyScore,
    };
  }

  // ============================================================
  // ZONE-BASED CLUSTERING
  // ============================================================

  /**
   * Cluster pickups by zone
   *
   * Groups items by their zone property for zone-based assignment
   * optimization. Items without a zone are grouped under "unknown".
   *
   * @param items - Array of items with optional zone property
   * @returns Map of zone name to items in that zone
   *
   * @example
   * ```ts
   * const bookings = [
   *   { id: '1', zone: 'Marina' },
   *   { id: '2', zone: 'Downtown' },
   *   { id: '3', zone: 'Marina' },
   *   { id: '4', zone: null },
   * ];
   *
   * const clusters = service.clusterByZone(bookings);
   * // Map {
   * //   'Marina' => [{ id: '1', ... }, { id: '3', ... }],
   * //   'Downtown' => [{ id: '2', ... }],
   * //   'unknown' => [{ id: '4', ... }]
   * // }
   * ```
   */
  clusterByZone<T extends { zone?: string | null }>(items: T[]): Map<string, T[]> {
    const clusters = new Map<string, T[]>();

    for (const item of items) {
      const zone = item.zone || "unknown";

      if (!clusters.has(zone)) {
        clusters.set(zone, []);
      }

      clusters.get(zone)!.push(item);
    }

    return clusters;
  }

  /**
   * Find the best zone match for a pickup based on coordinates
   *
   * When a pickup doesn't have an explicit zone, this method attempts
   * to infer the zone by finding the closest known zone location within
   * a reasonable proximity threshold.
   *
   * @param latitude - Pickup latitude
   * @param longitude - Pickup longitude
   * @param knownZones - Array of known zone reference points
   * @returns Closest zone name if within threshold, null otherwise
   *
   * @example
   * ```ts
   * const knownZones = [
   *   { zone: 'Marina', latitude: 25.0657, longitude: 55.1713 },
   *   { zone: 'Downtown', latitude: 25.1876, longitude: 55.2744 },
   * ];
   *
   * const zone = service.inferZone(25.0700, 55.1750, knownZones);
   * console.log(zone); // 'Marina' (closest match)
   * ```
   */
  inferZone(
    latitude: number,
    longitude: number,
    knownZones: ZoneReference[]
  ): string | null {
    // Handle edge cases
    if (!knownZones || knownZones.length === 0) {
      return null;
    }

    if (!this.hasValidCoordinates({ latitude, longitude })) {
      return null;
    }

    let closestZone: string | null = null;
    let closestDistance = Infinity;

    for (const zoneRef of knownZones) {
      if (!this.hasValidCoordinates(zoneRef)) {
        continue;
      }

      const distance = this.calculateDistance(
        latitude,
        longitude,
        zoneRef.latitude,
        zoneRef.longitude
      );

      if (distance < closestDistance && distance <= ZONE_PROXIMITY_THRESHOLD_KM) {
        closestDistance = distance;
        closestZone = zoneRef.zone;
      }
    }

    return closestZone;
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a coordinate has valid latitude and longitude values
   */
  private hasValidCoordinates(coord: Partial<Coordinate>): boolean {
    return (
      typeof coord.latitude === "number" &&
      typeof coord.longitude === "number" &&
      !isNaN(coord.latitude) &&
      !isNaN(coord.longitude) &&
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180
    );
  }
}
