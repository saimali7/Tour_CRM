"use client";

import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Search, Calendar, Users, Clock, User, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { addDays, format, startOfDay, endOfDay } from "date-fns";

interface BookingPlannerProps {
  orgSlug: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export function BookingPlanner({ orgSlug }: BookingPlannerProps) {
  const [searchDate, setSearchDate] = useState<string>(formatDateForInput(new Date()));
  const [participants, setParticipants] = useState<number>(2);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [flexDays, setFlexDays] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState(false);
  const { openQuickBooking } = useQuickBookingContext();

  // Get tours for filter dropdown
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Calculate date range for search
  const dateRange = useMemo(() => {
    const baseDate = new Date(searchDate);
    const from = startOfDay(addDays(baseDate, -flexDays));
    const to = endOfDay(addDays(baseDate, flexDays));
    return { from, to };
  }, [searchDate, flexDays]);

  // Search for availability using tourRun.list
  const { data: tourRunsResult, isLoading, error, refetch } = trpc.tourRun.list.useQuery(
    {
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    },
    { enabled: hasSearched }
  );

  // Filter and transform tour runs to availability results
  const results = useMemo(() => {
    if (!tourRunsResult?.tourRuns) return [];

    return tourRunsResult.tourRuns
      .filter((tr) => {
        // Filter by tour if selected
        if (selectedTourId && tr.tourId !== selectedTourId) return false;
        // Filter by available capacity
        const availableSpots = (tr.capacity || 0) - (tr.bookedCount || 0);
        return availableSpots >= participants;
      })
      .map((tr) => ({
        tourId: tr.tourId,
        tourName: tr.tourName,
        date: tr.date,
        time: tr.time,
        availableSpots: (tr.capacity || 0) - (tr.bookedCount || 0),
      }));
  }, [tourRunsResult, selectedTourId, participants]);

  const handleSearch = () => {
    setHasSearched(true);
    refetch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Group results by date
  const groupedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    const groups = new Map<string, typeof results>();
    for (const result of results) {
      const dateKey = new Date(result.date).toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(result);
    }

    return Array.from(groups.entries()).map(([dateKey, tourRuns]) => ({
      date: new Date(dateKey),
      tourRuns,
    }));
  }, [results]);

  const isExactDateMatch = (date: Date) => {
    const searchDateObj = new Date(searchDate);
    return date.toDateString() === searchDateObj.toDateString();
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Availability
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Guests
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                min={1}
                max={50}
                value={participants}
                onChange={(e) => setParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Tour Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Tour (optional)
            </label>
            <select
              value={selectedTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All Tours</option>
              {toursData?.data.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flex Days */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Flexibility
            </label>
            <select
              value={flexDays}
              onChange={(e) => setFlexDays(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value={0}>Exact date</option>
              <option value={1}>+/- 1 day</option>
              <option value={3}>+/- 3 days</option>
              <option value={7}>+/- 1 week</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {isLoading
                ? "Searching..."
                : results?.length
                ? `${results.length} Available Slots`
                : "No Availability Found"}
            </h3>
            {results && results.length > 0 && (
              <span className="text-sm text-muted-foreground">
                For {participants} guest{participants !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-destructive">Error: {error.message}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-8 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && results && results.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">
                No tours available for {participants} guest{participants !== 1 ? "s" : ""} on this date
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your date, party size, or flexibility
              </p>
            </div>
          )}

          {/* Results Grouped by Date */}
          {!isLoading && groupedResults.length > 0 && (
            <div className="space-y-6">
              {groupedResults.map(({ date, tourRuns }) => (
                <div key={date.toISOString()}>
                  {/* Date Header */}
                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-t-lg text-sm font-medium",
                      isExactDateMatch(date)
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }).format(date)}
                    {isExactDateMatch(date) && (
                      <span className="ml-2 text-xs">(Your selected date)</span>
                    )}
                  </div>

                  {/* Tour Run Cards */}
                  <div className="space-y-2">
                    {tourRuns.map((tourRun) => {
                      return (
                        <div
                          key={`${tourRun.tourId}-${tourRun.date}-${tourRun.time}`}
                          className="rounded-b-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Time */}
                            <div className="w-20 flex-shrink-0">
                              <div className="flex items-center gap-1.5 text-lg font-semibold text-foreground">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {formatTime(tourRun.time)}
                              </div>
                            </div>

                            {/* Tour Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {tourRun.tourName}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {tourRun.availableSpots} spots left
                                </span>
                              </div>
                            </div>

                            {/* Book Button */}
                            <button
                              onClick={() => openQuickBooking({ tourId: tourRun.tourId })}
                              className="flex-shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                            >
                              <Ticket className="h-4 w-4" />
                              Book
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">
            Search for available tours by date and party size
          </p>
          <p className="text-sm text-muted-foreground">
            Perfect for phone inquiries when customers ask "What do you have available on Saturday for 4 people?"
          </p>
        </div>
      )}
    </div>
  );
}
