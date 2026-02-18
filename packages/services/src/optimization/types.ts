/**
 * Dispatch Optimization Types
 *
 * Types for the Tour Command Center auto-assignment algorithm.
 * This module implements a greedy assignment algorithm with scoring
 * to optimize guide dispatch for tour operations.
 */

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * A tour run is a virtual grouping of bookings for a specific tour departure
 * (tourId + date + time)
 */
export interface TourRunInput {
  /** Tour ID */
  tourId: string;
  /** Tour name */
  tourName: string;
  /** Tour date */
  date: Date;
  /** Departure time in HH:MM format */
  time: string;
  /** Tour duration in minutes */
  durationMinutes: number;
  /** How many guests one guide can handle */
  guestsPerGuide: number;
  /** Total guests across all bookings */
  totalGuests: number;
  /** Number of guides needed for this tour run */
  guidesNeeded: number;
  /** Preferred language for this tour run (if applicable) */
  preferredLanguage?: string;
  /** Primary pickup zone for efficiency calculation */
  primaryPickupZone?: string;
  /** Meeting point zone ID */
  meetingPointZoneId?: string;
  /** Bookings for this tour run */
  bookings: BookingInput[];
}

/**
 * Booking input for optimization
 */
export interface BookingInput {
  /** Booking ID */
  id: string;
  /** Reference number */
  referenceNumber: string;
  /** Number of participants */
  participantCount: number;
  /** Pickup zone ID */
  pickupZoneId?: string;
  /** Specific pickup location */
  pickupLocation?: string;
  /** Customer name (lead booker) */
  customerName: string;
  /** Special requests / notes */
  specialRequests?: string;
  /** Is this a private booking? */
  isPrivate?: boolean;
}

/**
 * Guide with availability information for optimization
 */
export interface AvailableGuide {
  /** Guide ID */
  id: string;
  /** Full name */
  name: string;
  /** Vehicle capacity (seats) */
  vehicleCapacity: number;
  /** Vehicle description */
  vehicleDescription?: string;
  /** Base zone ID (where guide starts) */
  baseZoneId?: string;
  /** Languages spoken */
  languages: string[];
  /** Tour IDs where this guide is the primary guide */
  primaryTourIds: string[];
  /** Availability window start */
  availableFrom: Date;
  /** Availability window end */
  availableTo: Date;
  /** Optional explicit availability windows for split shifts */
  availabilityWindows?: Array<{
    start: Date;
    end: Date;
  }>;
  /** Current assignments (for conflict detection) */
  currentAssignments: GuideScheduleEntry[];
}

/**
 * Existing assignment on a guide's schedule
 */
export interface GuideScheduleEntry {
  /** Tour run ID or booking ID */
  id: string;
  /** Start time */
  startsAt: Date;
  /** End time */
  endsAt: Date;
  /** Whether this assignment is exclusive (private/charter) */
  isExclusive?: boolean;
  /** Zone ID (for travel time calculation) */
  endZoneId?: string;
}

// =============================================================================
// OPTIMIZATION INPUT/OUTPUT
// =============================================================================

/**
 * Main input for the optimization algorithm
 */
export interface OptimizationInput {
  /** Date being optimized */
  date: Date;
  /** Tour runs to assign guides to */
  tourRuns: TourRunInput[];
  /** Available guides for the day */
  availableGuides: AvailableGuide[];
  /** Travel time matrix: zoneId -> zoneId -> minutes */
  travelMatrix: TravelMatrix;
  /** Organization ID */
  organizationId: string;
}

/**
 * Output from the optimization algorithm
 */
export interface OptimizationOutput {
  /** Proposed assignments */
  assignments: ProposedAssignment[];
  /** Warnings/issues encountered */
  warnings: OptimizationWarning[];
  /** Overall efficiency score (0-100) */
  efficiency: number;
  /** Total drive minutes across all guides */
  totalDriveMinutes: number;
  /** Number of guides used */
  guidesUsed: number;
  /** Optimization metadata */
  metadata: {
    /** When optimization was run */
    optimizedAt: Date;
    /** Algorithm version */
    algorithmVersion: string;
    /** Number of tour runs processed */
    tourRunsProcessed: number;
    /** Number of bookings processed */
    bookingsProcessed: number;
  };
}

/**
 * A proposed assignment from the optimizer
 */
export interface ProposedAssignment {
  /** Booking ID */
  bookingId: string;
  /** Assigned guide ID */
  guideId: string;
  /** Pickup order (1, 2, 3...) within guide's route */
  pickupOrder: number;
  /** Calculated pickup time in HH:MM format */
  calculatedPickupTime: string;
  /** Drive time to this pickup in minutes */
  driveTimeMinutes: number;
  /** Confidence level of this assignment */
  confidence: AssignmentConfidence;
  /** Score breakdown for debugging/review */
  scoreBreakdown?: ScoreBreakdown;
  /** Tour run this assignment belongs to */
  tourRunId: string;
  /** Is this guide the lead guide for the tour run? */
  isLeadGuide: boolean;
}

/**
 * Assignment confidence level
 */
export type AssignmentConfidence = "optimal" | "good" | "review" | "problem";

/**
 * Score breakdown for a guide-tour assignment
 */
export interface ScoreBreakdown {
  /** Total score */
  total: number;
  /** Primary guide bonus */
  primaryGuideBonus: number;
  /** Zone proximity score */
  zoneProximity: number;
  /** Vehicle capacity fit score */
  capacityFit: number;
  /** Workload balancing score */
  workloadBalance: number;
  /** Language match score */
  languageMatch: number;
}

// =============================================================================
// WARNING TYPES
// =============================================================================

/**
 * Warning from the optimization process
 */
export interface OptimizationWarning {
  /** Warning ID (for resolution tracking) */
  id: string;
  /** Type of warning */
  type: WarningType;
  /** Severity level */
  severity: WarningSeverity;
  /** Human-readable message */
  message: string;
  /** Related tour run ID */
  tourRunId?: string;
  /** Related booking ID */
  bookingId?: string;
  /** Related guide ID */
  guideId?: string;
  /** Suggested resolutions */
  suggestedResolutions: SuggestedResolution[];
}

/**
 * Warning types
 */
export type WarningType =
  | "insufficient_guides"
  | "vehicle_capacity_exceeded"
  | "time_conflict"
  | "long_drive_time"
  | "unassigned_booking"
  | "suboptimal_assignment";

/**
 * Warning severity levels
 */
export type WarningSeverity = "critical" | "warning" | "info";

/**
 * Suggested resolution for a warning
 */
export interface SuggestedResolution {
  /** Resolution ID */
  id: string;
  /** Resolution type */
  type: ResolutionType;
  /** Human-readable label */
  label: string;
  /** Additional drive time if this resolution is applied */
  additionalDriveMinutes?: number;
  /** Guide ID (for reassignment resolutions) */
  guideId?: string;
  /** Guide name (for display) */
  guideName?: string;
}

/**
 * Resolution types
 */
export type ResolutionType =
  | "assign_to_guide"
  | "add_external_guide"
  | "split_across_guides"
  | "request_overtime"
  | "cancel_booking"
  | "merge_tour_runs";

// =============================================================================
// TRAVEL MATRIX
// =============================================================================

/**
 * Travel time matrix type
 * Map<fromZoneId, Map<toZoneId, minutes>>
 */
export type TravelMatrix = Map<string, Map<string, number>>;

/**
 * Zone travel time entry
 */
export interface ZoneTravelTime {
  fromZoneId: string;
  toZoneId: string;
  estimatedMinutes: number;
}

// =============================================================================
// GUIDE SCHEDULE TRACKING
// =============================================================================

/**
 * Internal tracking of a guide's schedule during optimization
 */
export interface GuideSchedule {
  /** Guide info */
  guide: AvailableGuide;
  /** Assignments made by optimizer */
  assignments: ProposedAssignment[];
  /** Total drive time accumulated */
  totalDriveMinutes: number;
  /** Current zone (for calculating next drive time) */
  currentZoneId?: string;
  /** When guide becomes available again */
  availableAt: Date;
  /** Number of guests currently assigned */
  guestsAssigned: number;
}

/**
 * Pickup schedule entry for a booking
 */
export interface PickupSchedule {
  /** Booking ID */
  bookingId: string;
  /** Pickup order */
  order: number;
  /** Pickup time in HH:MM format */
  time: string;
  /** Drive time from previous location */
  driveMinutes: number;
  /** Zone ID for this pickup */
  zoneId?: string;
}
