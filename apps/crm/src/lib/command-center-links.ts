import type { Route } from "next";
import { formatDbDateKey, formatLocalDateKey } from "@/lib/date-time";

export type CommandCenterFocus = "booking" | "run";

export interface CommandCenterLinkOptions {
  orgSlug: string;
  date?: Date | string | null;
  bookingId?: string | null;
  runKey?: string | null;
  focus?: CommandCenterFocus;
}

function toDateKey(date: Date | string | null | undefined): string {
  if (!date) return formatLocalDateKey(new Date());
  return formatDbDateKey(date);
}

export function buildCommandCenterHref({
  orgSlug,
  date,
  bookingId,
  runKey,
  focus,
}: CommandCenterLinkOptions): Route {
  const params = new URLSearchParams();
  params.set("date", toDateKey(date));

  const normalizedBookingId = bookingId?.trim();
  const normalizedRunKey = runKey?.trim();
  if (normalizedBookingId) {
    params.set("bookingId", normalizedBookingId);
  }
  if (normalizedRunKey) {
    params.set("runKey", normalizedRunKey);
  }

  const resolvedFocus =
    focus ??
    (normalizedRunKey ? "run" : normalizedBookingId ? "booking" : undefined);
  if (resolvedFocus) {
    params.set("focus", resolvedFocus);
  }

  return `/org/${orgSlug}/command-center?${params.toString()}` as Route;
}
