/**
 * Time Utilities for Command Center DnD Operations
 *
 * Extends the base timeline types with DnD-specific calculations.
 * Re-exports shared utilities from types.ts for convenience.
 */

// Re-export shared utilities from types.ts (canonical source)
export {
  timeToPercent,
  segmentWidthPercent,
  formatDuration,
  formatTimeDisplay,
  generateHourMarkers,
} from "./types";

// =============================================================================
// TIME PARSING (DnD-specific)
// =============================================================================

/**
 * Parse a time string (HH:MM) into components
 */
export function parseTime(time: string): {
  hours: number;
  minutes: number;
  totalMinutes: number;
} {
  const [h, m] = time.split(":").map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Convert total minutes to time string (HH:MM)
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Add minutes to a time string
 */
export function addMinutesToTime(time: string, delta: number): string {
  const { totalMinutes } = parseTime(time);
  return minutesToTimeString(totalMinutes + delta);
}

// =============================================================================
// TIMELINE CONFIGURATION
// =============================================================================

/**
 * Timeline configuration for calculations
 */
export interface TimelineConfig {
  startHour: number;
  endHour: number;
  snapMinutes?: number;
  guideColumnWidth?: number;
}

/**
 * Default timeline configuration
 */
export const DEFAULT_TIMELINE_CONFIG: Required<TimelineConfig> = {
  startHour: 7,
  endHour: 20,
  snapMinutes: 15,
  guideColumnWidth: 200,
};

// =============================================================================
// DnD TIMELINE CALCULATIONS
// =============================================================================

/**
 * Calculate width percent for a given duration
 */
export function durationToWidthPercent(
  durationMinutes: number,
  startHour: number,
  endHour: number
): number {
  const totalMinutes = (endHour - startHour) * 60;
  return (durationMinutes / totalMinutes) * 100;
}

/**
 * Snap minutes to the nearest interval
 */
export function snapToInterval(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

/**
 * Clamp minutes to timeline bounds
 */
export function clampToTimelineBounds(
  minutes: number,
  startHour: number,
  endHour: number,
  durationMinutes: number = 0
): number {
  const minMinutes = startHour * 60;
  const maxMinutes = endHour * 60;
  return Math.max(minMinutes, Math.min(maxMinutes - durationMinutes, minutes));
}

// =============================================================================
// TIME SHIFT CALCULATIONS
// =============================================================================

/**
 * Result of a time shift calculation
 */
export interface TimeShiftResult {
  newStartTime: string;
  newEndTime: string;
  minutesDelta: number;
}

/**
 * Calculate new times from a pixel delta
 *
 * @param deltaX - Horizontal pixel movement
 * @param startTime - Original start time (HH:MM)
 * @param durationMinutes - Segment duration in minutes
 * @param containerWidth - Width of timeline area in pixels
 * @param config - Timeline configuration
 * @returns New start and end times, or null if calculation fails
 */
export function calculateTimeShift(
  deltaX: number,
  startTime: string,
  durationMinutes: number,
  containerWidth: number,
  config: TimelineConfig
): TimeShiftResult | null {
  if (containerWidth <= 0) return null;

  const {
    startHour,
    endHour,
    snapMinutes = DEFAULT_TIMELINE_CONFIG.snapMinutes,
  } = config;

  // Calculate total minutes in timeline
  const totalTimelineMinutes = (endHour - startHour) * 60;

  // Calculate minutes delta from pixel delta
  const minutesDelta = Math.round((deltaX / containerWidth) * totalTimelineMinutes);

  // Parse original start time
  const { totalMinutes: originalMinutes } = parseTime(startTime);

  // Calculate new start time in minutes
  let newMinutes = originalMinutes + minutesDelta;

  // Snap to nearest interval
  newMinutes = snapToInterval(newMinutes, snapMinutes);

  // Clamp to timeline bounds
  newMinutes = clampToTimelineBounds(newMinutes, startHour, endHour, durationMinutes);

  // Calculate end time
  const endMinutes = newMinutes + durationMinutes;

  return {
    newStartTime: minutesToTimeString(newMinutes),
    newEndTime: minutesToTimeString(endMinutes),
    minutesDelta: newMinutes - originalMinutes,
  };
}

/**
 * Check if time has meaningfully changed (beyond snap threshold)
 */
export function hasTimeChanged(
  originalTime: string,
  newTime: string,
  snapMinutes: number = DEFAULT_TIMELINE_CONFIG.snapMinutes
): boolean {
  const { totalMinutes: origMinutes } = parseTime(originalTime);
  const { totalMinutes: newMinutes } = parseTime(newTime);

  return Math.abs(newMinutes - origMinutes) >= snapMinutes;
}
