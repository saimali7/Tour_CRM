"use client";

import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Grid3X3,
  Search,
} from "lucide-react";
import type { Route } from "next";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { CapacityHeatmap } from "@/components/availability/capacity-heatmap";
import { BookingPlanner } from "@/components/availability/booking-planner";
import { cn } from "@/lib/utils";

type ViewMode = "heatmap" | "calendar" | "planner";

function getCalendarDateRange(date: Date): { from: Date; to: Date } {
  // Get 3 months of data centered on current month
  const from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 2, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default function AvailabilityPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // View state
  const initialView = (searchParams.get("view") as ViewMode) || "heatmap";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tourFilter, setTourFilter] = useState<string | undefined>(undefined);

  // Date ranges for queries
  const calendarDateRange = useMemo(
    () => getCalendarDateRange(selectedDate),
    [selectedDate]
  );

  // Tours for filter
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Calendar query
  const calendarQuery = trpc.schedule.list.useQuery(
    {
      pagination: { page: 1, limit: 500 },
      filters: {
        dateRange: calendarDateRange,
        tourId: tourFilter,
      },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: viewMode === "calendar" }
  );

  const schedules = calendarQuery.data?.data || [];
  const isLoading = calendarQuery.isLoading;

  // Handle view changes
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set("view", mode);
    router.replace(`${url.pathname}${url.search}` as Route);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Availability Overview</h1>
          <p className="text-muted-foreground mt-1">
            Plan and manage capacity across all tours
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex">
          <button
            onClick={() => handleViewChange("heatmap")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              viewMode === "heatmap"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
            Capacity Heatmap
          </button>
          <button
            onClick={() => handleViewChange("calendar")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              viewMode === "calendar"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => handleViewChange("planner")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              viewMode === "planner"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="h-4 w-4" />
            Booking Planner
          </button>
        </div>

        {/* Tour Filter (for calendar view) */}
        {viewMode === "calendar" && (
          <select
            value={tourFilter || ""}
            onChange={(e) => setTourFilter(e.target.value || undefined)}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All Tours</option>
            {toursData?.data.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Heatmap View */}
      {viewMode === "heatmap" && (
        <CapacityHeatmap orgSlug={slug} />
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-lg border border-border bg-card p-12">
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </div>
          ) : (
            <AvailabilityCalendar
              schedules={schedules}
              currentDate={selectedDate}
              onDateChange={setSelectedDate}
              orgSlug={slug}
            />
          )}
        </div>
      )}

      {/* Booking Planner View */}
      {viewMode === "planner" && (
        <BookingPlanner orgSlug={slug} />
      )}
    </div>
  );
}
