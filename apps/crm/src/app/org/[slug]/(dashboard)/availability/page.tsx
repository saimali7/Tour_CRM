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
  X,
  Plus,
  Calendar,
  Search,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { NoSchedulesEmpty } from "@/components/ui/empty-state";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirmModal } from "@/components/ui/confirm-modal";

type StatusFilter = "all" | "scheduled" | "completed" | "cancelled";
type DateFilter = "next7" | "next14" | "next30" | "all";

interface ScheduleGroup {
  date: string;
  dateLabel: string;
  schedules: Array<{
    id: string;
    startsAt: Date;
    time: string;
    tourId: string;
    tourName: string;
    bookedCount: number;
    maxParticipants: number;
    guidesAssigned: number;
    guidesRequired: number;
    status: string;
    bookings?: Array<{
      id: string;
      customerName: string;
      participants: number;
      status: string;
    }>;
  }>;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function formatDateLabel(date: Date): string {
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
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getDateRange(filter: DateFilter): { from: Date; to: Date } | undefined {
  if (filter === "all") return undefined;

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);

  switch (filter) {
    case "next7":
      to.setDate(to.getDate() + 7);
      break;
    case "next14":
      to.setDate(to.getDate() + 14);
      break;
    case "next30":
      to.setDate(to.getDate() + 30);
      break;
  }
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export default function SchedulesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { confirm, ConfirmModal } = useConfirmModal();

  // Filters
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("scheduled");
  const [dateFilter, setDateFilter] = useState<DateFilter>("next14");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Calculate date range based on filter
  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  // Fetch tours for filter dropdown
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Fetch schedules
  const { data, isLoading } = trpc.schedule.list.useQuery({
    pagination: { page: 1, limit: 200 },
    filters: {
      tourId: tourFilter !== "all" ? tourFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      dateRange,
    },
    sort: { field: "startsAt", direction: "asc" },
  });

  const utils = trpc.useUtils();

  // Mutations
  const cancelMutation = trpc.schedule.cancel.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
    },
  });

  const handleCancel = async (id: string, tourName: string, time: string) => {
    const confirmed = await confirm({
      title: "Cancel Schedule",
      description: `This will cancel the ${tourName} departure at ${time}. Customers with bookings will need to be notified.`,
      confirmLabel: "Cancel Schedule",
      variant: "destructive",
    });

    if (confirmed) {
      cancelMutation.mutate({ id });
    }
  };

  // Group schedules by date
  const groupedSchedules = useMemo(() => {
    if (!data?.data) return [];

    const groups = new Map<string, ScheduleGroup>();

    data.data.forEach((schedule) => {
      const date = new Date(schedule.startsAt);
      const dateKey = date.toISOString().split("T")[0]!;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          dateLabel: formatDateLabel(date),
          schedules: [],
        });
      }

      const tour = toursData?.data.find((t) => t.id === schedule.tourId);

      groups.get(dateKey)!.schedules.push({
        id: schedule.id,
        startsAt: date,
        time: formatTime(date),
        tourId: schedule.tourId,
        tourName: tour?.name || "Unknown Tour",
        bookedCount: schedule.bookedCount || 0,
        maxParticipants: schedule.maxParticipants || tour?.maxParticipants || 0,
        guidesAssigned: schedule.guidesAssigned || 0,
        guidesRequired: schedule.guidesRequired || 1,
        status: schedule.status,
      });
    });

    return Array.from(groups.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data?.data, toursData?.data]);

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
  const totalSchedules = data?.data.length || 0;
  const totalCapacity = data?.data.reduce((sum, s) => sum + (s.maxParticipants || 0), 0) || 0;
  const totalBooked = data?.data.reduce((sum, s) => sum + (s.bookedCount || 0), 0) || 0;
  const needsGuides = data?.data.filter((s) => (s.guidesAssigned || 0) < (s.guidesRequired || 1)).length || 0;

  return (
    <div className="space-y-4">
      {/* Header with Catalog Tabs */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Catalog</h1>
            {/* Inline Stats */}
            <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{totalSchedules}</span> schedules</span>
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
            Schedules
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
            { value: "all", label: "All" },
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

        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
          {[
            { value: "scheduled", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as StatusFilter)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedules Table */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : groupedSchedules.length === 0 ? (
        <NoSchedulesEmpty orgSlug={slug} />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr,100px,120px,100px,80px] gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div>Schedule</div>
            <div className="text-center">Capacity</div>
            <div className="text-center">Guides</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Grouped Schedule Rows */}
          <div className="divide-y divide-border">
            {groupedSchedules.map((group) => (
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
                    ({group.schedules.length} departure{group.schedules.length !== 1 ? "s" : ""})
                  </span>
                </button>

                {/* Schedule Rows (expanded by default, collapsible) */}
                {!expandedDates.has(group.date) && (
                  <div className="divide-y divide-border/50">
                    {group.schedules.map((schedule) => {
                      const utilization = schedule.maxParticipants > 0
                        ? (schedule.bookedCount / schedule.maxParticipants) * 100
                        : 0;
                      const isFull = utilization >= 100;
                      const needsGuide = schedule.guidesAssigned < schedule.guidesRequired;
                      const isCancelled = schedule.status === "cancelled";

                      return (
                        <div
                          key={schedule.id}
                          className={cn(
                            "grid grid-cols-[1fr,100px,120px,100px,80px] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors",
                            isCancelled && "opacity-50"
                          )}
                        >
                          {/* Time + Tour */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-medium text-foreground w-20">
                              {schedule.time}
                            </span>
                            <Link
                              href={`/org/${slug}/tours/${schedule.tourId}` as Route}
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              {schedule.tourName}
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
                              {schedule.bookedCount}/{schedule.maxParticipants}
                            </span>
                          </div>

                          {/* Guides */}
                          <div className="flex items-center justify-center gap-1.5">
                            {needsGuide ? (
                              <span className="flex items-center gap-1 text-sm text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                {schedule.guidesAssigned}/{schedule.guidesRequired}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-emerald-600">
                                <UserCheck className="h-4 w-4" />
                                {schedule.guidesAssigned}/{schedule.guidesRequired}
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex justify-center">
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="h-3 w-3" />
                                Cancelled
                              </span>
                            ) : isFull ? (
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
                                  <Link href={`/org/${slug}/tour-run?tourId=${schedule.tourId}&date=${group.date}&time=${encodeURIComponent(schedule.time)}` as Route}>
                                    View Manifest
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/org/${slug}/tours/${schedule.tourId}` as Route}>
                                    View Tour
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!isCancelled && (
                                  <DropdownMenuItem
                                    onClick={() => handleCancel(schedule.id, schedule.tourName, schedule.time)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Cancel Departure
                                  </DropdownMenuItem>
                                )}
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
      {!isLoading && groupedSchedules.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {totalSchedules} schedule{totalSchedules !== 1 ? "s" : ""} across {groupedSchedules.length} day{groupedSchedules.length !== 1 ? "s" : ""}
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
