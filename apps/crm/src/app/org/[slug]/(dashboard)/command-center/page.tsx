"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useCallback, useEffect } from "react";
import { format, parseISO, addDays, subDays, isToday } from "date-fns";
import { CommandCenter } from "@/components/command-center/command-center";
import { useHotkeys } from "@/hooks/use-keyboard-navigation";
import type { Route } from "next";

function getDateFromParam(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  try {
    return parseISO(dateParam);
  } catch {
    // Invalid date format, fall back to today
    return new Date();
  }
}

export default function CommandCenterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Get date from URL params, defaulting to today
  const dateParam = searchParams.get("date");
  const selectedDate = useMemo(() => getDateFromParam(dateParam), [dateParam]);

  // Navigation helper
  const navigateToDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
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

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Tour Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage guide assignments and dispatch for the day
          </p>
        </div>
      </header>

      {/* Main Command Center Component */}
      <CommandCenter
        date={selectedDate}
        onDateChange={handleDateChange}
        onPreviousDay={handlePreviousDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
      />
    </div>
  );
}
