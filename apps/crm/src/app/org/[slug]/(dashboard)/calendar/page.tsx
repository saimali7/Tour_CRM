"use client";

import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { OperationsCalendar } from "@/components/calendar/operations-calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

function getCalendarDateRange(date: Date): { from: Date; to: Date } {
  const from = startOfMonth(subMonths(date, 1));
  const to = endOfMonth(addMonths(date, 1));
  return { from, to };
}

export default function CalendarPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tourFilter, setTourFilter] = useState<string>("all");

  const calendarDateRange = useMemo(
    () => getCalendarDateRange(selectedDate),
    [selectedDate]
  );

  // Tours for filter
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Fetch tour runs for calendar
  const { data: tourRunsResult, isLoading } = trpc.tourRun.list.useQuery({
    dateFrom: calendarDateRange.from,
    dateTo: calendarDateRange.to,
  });

  const tourRunsData = tourRunsResult?.tourRuns || [];

  // Filter tour runs by tour if selected
  const filteredTourRuns = useMemo(() => {
    if (!tourRunsData.length) return [];
    if (tourFilter === "all") return tourRunsData;
    return tourRunsData.filter((tr) => tr.tourId === tourFilter);
  }, [tourRunsData, tourFilter]);

  // Convert tour runs to schedule-like objects for the calendar component
  const schedules = useMemo(() => {
    return filteredTourRuns.map((tr) => {
      const dateStr = tr.date instanceof Date
        ? tr.date.toISOString().split("T")[0]
        : String(tr.date).split("T")[0];
      const startsAt = new Date(`${dateStr}T${tr.time}:00`);
      const endsAt = new Date(startsAt.getTime() + (tr.durationMinutes || 60) * 60000);
      return {
        id: `${tr.tourId}-${dateStr}-${tr.time}`,
        tourId: tr.tourId,
        startsAt,
        endsAt,
        maxParticipants: tr.capacity || 0,
        bookedCount: tr.bookedCount || 0,
        guidesRequired: tr.guidesRequired || 1,
        guidesAssigned: tr.guidesAssigned || 0,
        status: "scheduled" as const,
        tour: {
          id: tr.tourId,
          name: tr.tourName,
          durationMinutes: tr.durationMinutes,
        },
      };
    });
  }, [filteredTourRuns]);

  // Calculate inline stats
  const stats = useMemo(() => {
    const thisMonth = filteredTourRuns.filter((tr) => {
      const date = new Date(tr.date);
      return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
    });
    const totalTourRuns = thisMonth.length;
    const totalBooked = thisMonth.reduce((sum, tr) => sum + (tr.bookedCount ?? 0), 0);
    const totalCapacity = thisMonth.reduce((sum, tr) => sum + (tr.capacity ?? 0), 0);
    const needsGuide = thisMonth.filter((tr) => (tr.guidesAssigned ?? 0) < (tr.guidesRequired ?? 1)).length;
    return { totalTourRuns, totalBooked, totalCapacity, needsGuide };
  }, [filteredTourRuns, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Header: Title + Inline Stats + Actions */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
          {/* Inline Stats */}
          <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <span><span className="font-medium text-foreground">{stats.totalTourRuns}</span> departures</span>
            <span><span className="font-medium text-foreground">{stats.totalBooked}</span>/{stats.totalCapacity} booked</span>
            {stats.needsGuide > 0 && (
              <span><span className="font-medium text-warning">{stats.needsGuide}</span> need guide</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tour Filter */}
          <Select value={tourFilter} onValueChange={setTourFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <span className="truncate block text-left">
                {tourFilter === "all"
                  ? "All Tours"
                  : toursData?.data.find(t => t.id === tourFilter)?.name ?? "All Tours"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tours</SelectItem>
              {toursData?.data.map((tour) => (
                <SelectItem key={tour.id} value={tour.id}>
                  {tour.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Booking Button */}
          <Link
            href={`/org/${slug}/bookings/new` as Route}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
        </div>
      </header>

      {/* Calendar with inline expansion */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : (
        <OperationsCalendar
          schedules={schedules}
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          orgSlug={slug}
        />
      )}
    </div>
  );
}
