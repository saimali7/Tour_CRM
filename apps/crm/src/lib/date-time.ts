const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(timeZone: string | null | undefined, fallback = "UTC"): string {
  if (!timeZone) return fallback;
  return isValidTimeZone(timeZone) ? timeZone : fallback;
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return formatDateKeyInTimeZone(new Date(), normalizeTimeZone(timeZone));
}

export function isDateKey(value: string): boolean {
  return DATE_KEY_REGEX.test(value);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const base = new Date(Date.UTC(yearRaw, monthRaw - 1, dayRaw, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const day = String(base.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalize DATE-only values from DB/routers to YYYY-MM-DD.
 * Uses UTC date parts for Date instances to preserve stored calendar date.
 */
export function formatDbDateKey(date: Date | string): string {
  if (typeof date === "string") {
    const trimmed = date.trim();
    const explicitMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (explicitMatch?.[1]) return explicitMatch[1];
    if (date.includes("T")) {
      const [datePart] = date.split("T");
      if (datePart) return datePart;
    }
    return trimmed;
  }
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
  return formatLocalDateKey(date);
}

export function parseDateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/**
 * Parse YYYY-MM-DD for DB DATE columns.
 * Uses UTC midnight so DATE serialization stays stable across server timezones.
 */
export function parseDateKeyToDbDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/**
 * Coerce incoming date input (YYYY-MM-DD or datetime string) into a date key.
 * For datetime strings, organization timezone should be provided to avoid drift.
 */
export function coerceDateInputToDateKey(
  value: string,
  organizationTimeZone?: string | null
): string {
  const trimmed = value.trim();
  if (isDateKey(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date input: ${value}`);
  }

  if (organizationTimeZone) {
    return formatDateKeyInTimeZone(parsed, normalizeTimeZone(organizationTimeZone));
  }

  return formatDbDateKey(parsed);
}

export function dbDateToLocalDate(date: Date | string): Date {
  return parseDateKeyToLocalDate(formatDbDateKey(date));
}
