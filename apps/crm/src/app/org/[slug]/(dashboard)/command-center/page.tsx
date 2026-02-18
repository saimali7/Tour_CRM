"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useCallback } from "react";
import { addDays, subDays } from "date-fns";
import { CommandCenter } from "@/components/command-center/command-center";
import { useHotkeys } from "@/hooks/use-keyboard-navigation";
import type { Route } from "next";
import { formatLocalDateKey, parseDateKeyToLocalDate } from "@/lib/date-time";

function getDateFromParam(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  const explicitMatch = dateParam.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!explicitMatch?.[1]) return new Date();
  return parseDateKeyToLocalDate(explicitMatch[1]);
}

export default function CommandCenterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Get date from URL params, defaulting to today
  const dateParam = searchParams.get("date");
  const bookingIdParam = searchParams.get("bookingId");
  const runKeyParam = searchParams.get("runKey");
  const focusParam = searchParams.get("focus");
  const selectedDate = useMemo(() => getDateFromParam(dateParam), [dateParam]);
  const initialFocus = useMemo(() => {
    const bookingId = bookingIdParam?.trim();
    const runKey = runKeyParam?.trim();
    const focus: "booking" | "run" | undefined =
      focusParam === "run" || focusParam === "booking"
        ? focusParam
        : undefined;

    if (!bookingId && !runKey && !focus) {
      return undefined;
    }

    return {
      bookingId: bookingId || undefined,
      runKey: runKey || undefined,
      focus,
    };
  }, [bookingIdParam, runKeyParam, focusParam]);

  // Navigation helper
  const navigateToDate = useCallback(
    (date: Date) => {
      const dateStr = formatLocalDateKey(date);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("date", dateStr);
      router.push(`/org/${slug}/command-center?${newParams.toString()}` as Route);
    },
    [router, slug, searchParams]
  );

  // Date navigation handlers
  const handleDateChange = useCallback(
    (date: Date) => {
      navigateToDate(date);
    },
    [navigateToDate]
  );

  const handlePreviousDay = useCallback(() => {
    navigateToDate(subDays(selectedDate, 1));
  }, [selectedDate, navigateToDate]);

  const handleNextDay = useCallback(() => {
    navigateToDate(addDays(selectedDate, 1));
  }, [selectedDate, navigateToDate]);

  const handleToday = useCallback(() => {
    navigateToDate(new Date());
  }, [navigateToDate]);

  // Keyboard shortcuts for date navigation
  useHotkeys(
    {
      arrowleft: handlePreviousDay,
      arrowright: handleNextDay,
      t: handleToday,
    },
    { enabled: true }
  );

  // Height calculation accounts for:
  // - Mobile: header (4rem) + mobile nav (4rem) = 8rem offset
  // - Desktop: minimal padding (1.5rem) = 1.5rem offset
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-1.5rem)]">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <CommandCenter
          date={selectedDate}
          onDateChange={handleDateChange}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          initialFocus={initialFocus}
        />
      </div>
    </div>
  );
}
