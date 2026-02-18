const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  dateFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timeFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  timeFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    // Throws RangeError for unknown IANA names.
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(
  timeZone: string | null | undefined,
  fallback = "UTC"
): string {
  if (!timeZone) return fallback;
  return isValidTimeZone(timeZone) ? timeZone : fallback;
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Failed to format date key for timezone");
  }
  return `${year}-${month}-${day}`;
}

export function getNowDateKeyInTimeZone(timeZone: string): string {
  return formatDateKeyInTimeZone(new Date(), timeZone);
}

export function getMinutesSinceMidnightInTimeZone(date: Date, timeZone: string): number {
  const parts = getTimeFormatter(timeZone).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  // Noon UTC avoids DST edge cases when shifting dates.
  const base = new Date(Date.UTC(yearRaw, monthRaw - 1, dayRaw, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const day = String(base.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateKeyToDate(dateKey: string): Date {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return new Date(Date.UTC(yearRaw, monthRaw - 1, dayRaw, 12, 0, 0));
}

export function formatDateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalize a DATE-only value (Postgres DATE column or YYYY-MM-DD string)
 * to a stable YYYY-MM-DD key.
 *
 * For Date instances:
 * - UTC-midnight values (DB DATE / ISO date coercion) keep UTC date parts.
 * - Local date values keep local date parts.
 */
export function formatDateOnlyKey(value: Date | string): string {
  if (typeof value === "string") {
    const explicitMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (explicitMatch?.[1]) return explicitMatch[1];
    if (value.includes("T")) return value.split("T")[0]!;
    return value;
  }
  if (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return formatDateKeyLocal(value);
}

/**
 * Parse YYYY-MM-DD into a local Date at midnight for UI/local-date math.
 */
export function parseDateOnlyKeyToLocalDate(dateKey: string): Date {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return new Date(yearRaw, monthRaw - 1, dayRaw);
}
