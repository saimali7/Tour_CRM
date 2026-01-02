"use client";

import { trpc } from "@/lib/trpc";
import {
  Package,
  Tag,
  CalendarClock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

type DateFilter = "next7" | "next14" | "next30" | "all";

interface TourRunGroup {
  date: string;
  dateLabel: string;
  tourRuns: Array<{
    tourId: string;
    tourName: string;
    time: string;
    bookedCount: number;
    maxParticipants: number;
    guidesAssigned: number;
    guidesRequired: number;
  }>;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }
  return format(date, "EEE, MMM d");
}

function getDateRange(filter: DateFilter): { from: Date; to: Date } | undefined {
  if (filter === "all") return undefined;

  const from = startOfDay(new Date());
  const to = endOfDay(addDays(from, filter === "next7" ? 7 : filter === "next14" ? 14 : 30));

  return { from, to };
}

export default function AvailabilityPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Filters
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("next14");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Calculate date range based on filter
  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  // Fetch tours for filter dropdown
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Fetch tour runs for the date range
  const { data: tourRunsResult, isLoading } = trpc.tourRun.list.useQuery(
    {
      dateFrom: dateRange?.from || startOfDay(new Date()),
      dateTo: dateRange?.to || endOfDay(addDays(new Date(), 14)),
    },
    { enabled: !!dateRange }
  );

  const tourRunsData = tourRunsResult?.tourRuns || [];

  // Group tour runs by date
  const groupedTourRuns = useMemo(() => {
    if (!tourRunsData.length) return [];

    // Filter by tour if selected
    const filtered = tourFilter === "all"
      ? tourRunsData
      : tourRunsData.filter((tr) => tr.tourId === tourFilter);

    const groups = new Map<string, TourRunGroup>();

    filtered.forEach((tourRun) => {
      const dateKey = format(new Date(tourRun.date), "yyyy-MM-dd");

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          dateLabel: formatDateLabel(dateKey),
          tourRuns: [],
        });
      }

      groups.get(dateKey)!.tourRuns.push({
        tourId: tourRun.tourId,
        tourName: tourRun.tourName,
        time: tourRun.time,
        bookedCount: tourRun.bookedCount || 0,
        maxParticipants: tourRun.capacity || 0,
        guidesAssigned: tourRun.guidesAssigned || 0,
        guidesRequired: tourRun.guidesRequired || 1,
      });
    });

    // Sort dates
    return Array.from(groups.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [tourRunsData, tourFilter]);

  const toggleDateExpanded = (dateKey: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // Stats
  const totalTourRuns = tourRunsData.length;
  const totalCapacity = tourRunsData.reduce((sum, tr) => sum + (tr.capacity || 0), 0);
  const totalBooked = tourRunsData.reduce((sum, tr) => sum + (tr.bookedCount || 0), 0);
  const needsGuides = tourRunsData.filter((tr) => (tr.guidesAssigned || 0) < (tr.guidesRequired || 1)).length;

  return (
    <div className="space-y-4">
      {/* Header with Catalog Tabs */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Catalog</h1>
            {/* Inline Stats */}
            <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{totalTourRuns}</span> tour runs</span>
              <span><span className="font-medium text-foreground">{totalBooked}</span>/<span className="text-muted-foreground">{totalCapacity}</span> booked</span>
              {needsGuides > 0 && (
                <span className="text-amber-600">
                  <span className="font-medium">{needsGuides}</span> need guides
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Catalog Tabs */}
        <nav className="flex items-center gap-1 border-b border-border -mb-px">
          <Link
            href={`/org/${slug}/tours` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Package className="h-4 w-4" />
            Tours
          </Link>
          <Link
            href={`/org/${slug}/services` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Briefcase className="h-4 w-4" />
            Services
          </Link>
          <Link
            href={`/org/${slug}/promo-codes` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Tag className="h-4 w-4" />
            Pricing
          </Link>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground -mb-px">
            <CalendarClock className="h-4 w-4" />
            Availability
          </button>
        </nav>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tour Filter */}
        <select
          value={tourFilter}
          onChange={(e) => setTourFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="all">All Tours</option>
          {toursData?.data.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {tour.name}
            </option>
          ))}
        </select>

        {/* Date Range Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
          {[
            { value: "next7", label: "7 days" },
            { value: "next14", label: "14 days" },
            { value: "next30", label: "30 days" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateFilter(opt.value as DateFilter)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                dateFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tour Runs Table */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : groupedTourRuns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No tour runs</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No bookings found for the selected date range. Tour runs appear automatically when customers book tours.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr,100px,120px,100px,80px] gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div>Tour Run</div>
            <div className="text-center">Capacity</div>
            <div className="text-center">Guides</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Grouped Tour Run Rows */}
          <div className="divide-y divide-border">
            {groupedTourRuns.map((group) => (
              <div key={group.date}>
                {/* Date Header */}
                <button
                  onClick={() => toggleDateExpanded(group.date)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {expandedDates.has(group.date) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">{group.dateLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.tourRuns.length} departure{group.tourRuns.length !== 1 ? "s" : ""})
                  </span>
                </button>

                {/* Tour Run Rows (expanded by default, collapsible) */}
                {!expandedDates.has(group.date) && (
                  <div className="divide-y divide-border/50">
                    {group.tourRuns.map((tourRun) => {
                      const utilization = tourRun.maxParticipants > 0
                        ? (tourRun.bookedCount / tourRun.maxParticipants) * 100
                        : 0;
                      const isFull = utilization >= 100;
                      const needsGuide = tourRun.guidesAssigned < tourRun.guidesRequired;

                      return (
                        <div
                          key={`${tourRun.tourId}-${tourRun.time}`}
                          className="grid grid-cols-[1fr,100px,120px,100px,80px] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
                        >
                          {/* Time + Tour */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-medium text-foreground w-20">
                              {formatTime(tourRun.time)}
                            </span>
                            <Link
                              href={`/org/${slug}/tours/${tourRun.tourId}` as Route}
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              {tourRun.tourName}
                            </Link>
                          </div>

                          {/* Capacity */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    isFull ? "bg-emerald-500" :
                                    utilization >= 70 ? "bg-emerald-500/70" :
                                    utilization >= 40 ? "bg-amber-500" : "bg-red-400"
                                  )}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {tourRun.bookedCount}/{tourRun.maxParticipants}
                            </span>
                          </div>

                          {/* Guides */}
                          <div className="flex items-center justify-center gap-1.5">
                            {needsGuide ? (
                              <span className="flex items-center gap-1 text-sm text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                {tourRun.guidesAssigned}/{tourRun.guidesRequired}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-emerald-600">
                                <UserCheck className="h-4 w-4" />
                                {tourRun.guidesAssigned}/{tourRun.guidesRequired}
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex justify-center">
                            {isFull ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Full
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Open
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/org/${slug}/availability/${tourRun.tourId}?date=${group.date}&time=${encodeURIComponent(tourRun.time)}` as Route}>
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/org/${slug}/tour-run?tourId=${tourRun.tourId}&date=${group.date}&time=${encodeURIComponent(tourRun.time)}` as Route}>
                                    View Manifest
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/org/${slug}/tours/${tourRun.tourId}` as Route}>
                                    View Tour
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && groupedTourRuns.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {totalTourRuns} tour run{totalTourRuns !== 1 ? "s" : ""} across {groupedTourRuns.length} day{groupedTourRuns.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
