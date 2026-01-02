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
 * Format a Date object to YYYY-MM-DD string for use in tour run keys.
 *
 * @param date - The Date object to format
 * @returns The date string in YYYY-MM-DD format
 */
export function formatDateForKey(date: Date): string {
  return date.toISOString().split("T")[0]!;
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
