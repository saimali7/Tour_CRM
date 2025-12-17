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
