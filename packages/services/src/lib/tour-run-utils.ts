import { ValidationError } from "../types";

/**
 * Tour Run Key Utilities
 *
 * A "tour run" is a virtual grouping of (tourId, date, time) that represents
 * a single departure of a tour. This module provides utilities for creating
 * and parsing the composite key used to identify tour runs.
 *
 * Key format: `${tourId}|${YYYY-MM-DD}|${HH:MM}`
 *
 * @example
 * ```typescript
 * import { createTourRunKey, parseTourRunKey } from "@tour/services/lib/tour-run-utils";
 *
 * // Create a key
 * const key = createTourRunKey("tour_123", new Date("2026-01-02"), "09:00");
 * // => "tour_123|2026-01-02|09:00"
 *
 * // Parse a key
 * const { tourId, date, time } = parseTourRunKey(key);
 * // => { tourId: "tour_123", date: "2026-01-02", time: "09:00" }
 * ```
 */

/**
 * Create a tour run key from its components.
 *
 * @param tourId - The tour ID
 * @param date - The date (Date object or ISO date string YYYY-MM-DD)
 * @param time - The time in HH:MM format
 * @returns The composite tour run key
 */
export function createTourRunKey(
  tourId: string,
  date: Date | string,
  time: string
): string {
  const dateStr = typeof date === "string" ? date : formatDateForKey(date);
  return `${tourId}|${dateStr}|${time}`;
}

/**
 * Parse a tour run key into its components.
 *
 * @param key - The composite tour run key
 * @returns Object containing tourId, date (as string), and time
 * @throws Error if the key format is invalid
 */
export function parseTourRunKey(key: string): {
  tourId: string;
  date: string;
  time: string;
} {
  const parts = key.split("|");

  if (parts.length !== 3) {
    throw new ValidationError(
      `Invalid tour run key format: "${key}". Expected format: tourId|YYYY-MM-DD|HH:MM`
    );
  }

  const [tourId, date, time] = parts;

  if (!tourId || !date || !time) {
    throw new ValidationError(
      `Invalid tour run key format: "${key}". All parts must be non-empty.`
    );
  }

  return { tourId, date, time };
}

/**
 * Format a Date object or date string to YYYY-MM-DD string for use in tour run keys.
 *
 * IMPORTANT: This function extracts the LOCAL date from a Date object.
 * For consistent behavior across timezones:
 * - Prefer passing ISO date strings (YYYY-MM-DD) directly
 * - When passing Date objects, the LOCAL date will be used
 *
 * @param date - The Date object or ISO date string to format
 * @returns The date string in YYYY-MM-DD format
 */
export function formatDateForKey(date: Date | string): string {
  // If already a string in YYYY-MM-DD format, return as-is
  if (typeof date === "string") {
    // Validate format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse ISO string and extract date part
    if (date.includes("T")) {
      return date.split("T")[0]!;
    }
    // Return as-is if it looks like a date string
    return date;
  }

  // DB DATE columns and `new Date("YYYY-MM-DD")` normalize to 00:00 UTC.
  // Preserve the stored date in those cases; otherwise keep local-date semantics.
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // For local date values (e.g. Date picker), use local components.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the day of week (0-6, Sunday-Saturday) from a date.
 *
 * @param date - The Date object or ISO date string (YYYY-MM-DD)
 * @returns The day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date | string): number {
  if (typeof date === "string") {
    // Parse YYYY-MM-DD string - create date at noon UTC to avoid timezone issues
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
    return d.getUTCDay();
  }
  return date.getDay();
}

/**
 * Check if a string is a valid tour run key format.
 *
 * @param key - The string to validate
 * @returns true if the key is valid, false otherwise
 */
export function isValidTourRunKey(key: string): boolean {
  const parts = key.split("|");
  if (parts.length !== 3) return false;

  const [tourId, date, time] = parts;
  if (!tourId || !date || !time) return false;

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  // Validate time format (HH:MM)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) return false;

  return true;
}
