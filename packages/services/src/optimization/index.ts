/**
 * Dispatch Optimization Module
 *
 * This module implements the auto-assignment algorithm for the Tour Command Center.
 * It provides functions to optimize guide dispatch for tour operations, minimizing
 * drive time while respecting constraints like guide qualifications, vehicle capacity,
 * and availability.
 *
 * @module optimization
 *
 * @example
 * ```ts
 * import {
 *   optimizeDispatch,
 *   buildTravelMatrix,
 *   getTravelTime,
 * } from "@tour/services/optimization";
 *
 * // Build travel matrix for the organization
 * const matrix = await buildTravelMatrix("org_123");
 *
 * // Run optimization
 * const result = await optimizeDispatch({
 *   date: new Date(),
 *   tourRuns: [...],
 *   availableGuides: [...],
 *   travelMatrix: matrix,
 *   organizationId: "org_123",
 * });
 *
 * console.log(`Efficiency: ${result.efficiency}%`);
 * console.log(`Assignments: ${result.assignments.length}`);
 * console.log(`Warnings: ${result.warnings.length}`);
 * ```
 */

// =============================================================================
// MAIN OPTIMIZATION FUNCTION
// =============================================================================

export { optimizeDispatch } from "./dispatch-optimizer";

// =============================================================================
// TRAVEL MATRIX UTILITIES
// =============================================================================

export {
  buildTravelMatrix,
  buildTravelMatrixFromEntries,
  getTravelTime,
  calculateRouteTravelTime,
  findNearestZone,
  getUniqueZones,
  getMostCommonZone,
  groupBookingsByZone,
  validateMatrixCoverage,
  getMatrixStats,
} from "./travel-matrix";

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Input types
  OptimizationInput,
  TourRunInput,
  BookingInput,
  AvailableGuide,
  GuideScheduleEntry,

  // Output types
  OptimizationOutput,
  ProposedAssignment,
  AssignmentConfidence,
  ScoreBreakdown,

  // Warning types
  OptimizationWarning,
  WarningType,
  WarningSeverity,
  SuggestedResolution,
  ResolutionType,

  // Travel matrix types
  TravelMatrix,
  ZoneTravelTime,

  // Internal types (exported for testing)
  GuideSchedule,
  PickupSchedule,
} from "./types";
