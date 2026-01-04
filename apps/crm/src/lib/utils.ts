import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely escape a CSV value to prevent CSV injection attacks.
 * - Escapes values starting with dangerous characters (=, +, -, @, \t, \r)
 * - Wraps values containing commas, quotes, or newlines in quotes
 * - Escapes internal double quotes
 */
export function escapeCsvValue(value: unknown): string {
  const stringValue = String(value ?? "");
  // Escape formula injection - prefix with single quote if starts with dangerous chars
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];
  let escaped = stringValue;
  if (dangerousChars.some((char) => escaped.startsWith(char))) {
    escaped = `'${escaped}`;
  }
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }
  return escaped;
}

/**
 * Convert an array of objects to CSV format with proper escaping
 */
export function toCsv<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]!);
  return [
    headers.map(escapeCsvValue).join(","),
    ...data.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ].join("\n");
}

/**
 * Download data as a CSV file
 */
export function downloadCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  const csvContent = toCsv(data);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Pluralize a word based on count.
 * @param count - The number to check
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The appropriate form of the word
 *
 * @example
 * pluralize(1, 'guest') // 'guest'
 * pluralize(3, 'guest') // 'guests'
 * pluralize(2, 'person', 'people') // 'people'
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Format a duration in minutes to a human-readable string.
 * @param minutes - The duration in minutes
 * @returns Formatted string like "1h 30m" or "45m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
