"use client";

import { trpc } from "@/lib/trpc";
import { Edit, Trash2, Eye, Archive, Check, Copy, ChevronRight, ChevronDown, ChevronLeft, Calendar, List, LayoutGrid } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Design system components
import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { FilterChipGroup } from "@/components/ui/filter-bar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableActions,
  ActionButton,
} from "@/components/ui/data-table";
import { TourStatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoToursEmpty } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";

// Tour-specific components
import { TourScheduleStats } from "@/components/tours/tour-schedule-stats";
import { TourSchedulePreview } from "@/components/tours/tour-schedule-preview";
import { ToursDayView } from "@/components/tours/tours-day-view";
import { ToursWeekView } from "@/components/tours/tours-week-view";

type ViewMode = "day" | "week" | "list";
type StatusFilter = "all" | "draft" | "active" | "paused" | "archived";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function ToursPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // View mode
  const initialView = (searchParams.get("view") as ViewMode) || "day";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // List view state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedTourIds, setExpandedTourIds] = useState<Set<string>>(new Set());
  const { confirm, ConfirmModal } = useConfirmModal();

  // Use the new endpoint with schedule stats (only for list view)
  const { data, isLoading, error } = trpc.tour.listWithScheduleStats.useQuery(
    {
      pagination: { page, limit: 10 },
      filters: statusFilter === "all" ? undefined : { status: statusFilter },
    },
    { enabled: viewMode === "list" }
  );

  const utils = trpc.useUtils();

  const deleteMutation = trpc.tour.delete.useMutation({
    onSuccess: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      toast.success("Tour deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete tour: ${error.message}`);
    },
  });

  const archiveMutation = trpc.tour.archive.useMutation({
    onSuccess: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      toast.success("Tour archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive tour: ${error.message}`);
    },
  });

  const publishMutation = trpc.tour.publish.useMutation({
    onSuccess: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      toast.success("Tour published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish tour: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.tour.duplicate.useMutation({
    onSuccess: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      toast.success("Tour duplicated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to duplicate tour: ${error.message}`);
    },
  });

  const toggleExpand = useCallback((tourId: string) => {
    setExpandedTourIds((prev) => {
      const next = new Set(prev);
      if (next.has(tourId)) {
        next.delete(tourId);
      } else {
        next.add(tourId);
      }
      return next;
    });
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Tour",
      description: "This will permanently delete this tour and all its schedules. This action cannot be undone.",
      confirmLabel: "Delete Tour",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ id });
  };

  const handlePublish = (id: string) => {
    publishMutation.mutate({ id });
  };

  const handleDuplicate = (id: string, name: string) => {
    duplicateMutation.mutate({ id, newName: `${name} (Copy)` });
  };

  // View mode change
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set("view", mode);
    router.replace(`${url.pathname}${url.search}` as Route);
  };

  // Date navigation
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // List view handlers
  const handleFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setExpandedTourIds(new Set());
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setExpandedTourIds(new Set());
  };

  // Day click from week view
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    handleViewChange("day");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tours"
        description={viewMode === "list" ? "Manage your tour offerings" : `Operations for ${formatDateLabel(selectedDate)}`}
      >
        <PageHeaderAction href={`/org/${slug}/tours/new`}>
          Create Tour
        </PageHeaderAction>
      </PageHeader>

      {/* View Mode Toggle & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date Navigation (for day/week views) */}
        {(viewMode === "day" || viewMode === "week") && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate("prev")}
              className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-input hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate("next")}
              className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 text-sm font-medium text-foreground">
              {formatDateLabel(selectedDate)}
            </span>
          </div>
        )}

        {/* Status Filter (for list view) */}
        {viewMode === "list" && (
          <FilterChipGroup
            value={statusFilter}
            onChange={handleFilterChange}
            options={STATUS_OPTIONS}
          />
        )}

        {/* View Toggle */}
        <div className="flex rounded-lg border border-input bg-background p-1">
          <button
            onClick={() => handleViewChange("day")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
              viewMode === "day"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Day
          </button>
          <button
            onClick={() => handleViewChange("week")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
              viewMode === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Calendar className="h-4 w-4" />
            Week
          </button>
          <button
            onClick={() => handleViewChange("list")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="h-4 w-4" />
            Products
          </button>
        </div>
      </div>

      {/* Day View */}
      {viewMode === "day" && (
        <ToursDayView orgSlug={slug} selectedDate={selectedDate} />
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <ToursWeekView orgSlug={slug} weekStart={selectedDate} onDayClick={handleDayClick} />
      )}

      {/* List View (Product Catalog) */}
      {viewMode === "list" && (
        <>
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
              <p className="text-destructive">Error loading tours: {error.message}</p>
            </div>
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : data?.data.length === 0 ? (
            <div className="rounded-lg border border-border bg-card">
              <NoToursEmpty orgSlug={slug} />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Schedule Stats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((tour) => {
                    const isExpanded = expandedTourIds.has(tour.id);
                    const stats = tour.scheduleStats;

                    return (
                      <>
                        {/* Main Row */}
                        <TableRow
                          key={tour.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isExpanded && "bg-muted/50"
                          )}
                          onClick={() => toggleExpand(tour.id)}
                        >
                          {/* Expand Toggle */}
                          <TableCell className="w-10 pr-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(tour.id);
                              }}
                              className="p-1 rounded hover:bg-accent transition-colors"
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>

                          {/* Tour Name */}
                          <TableCell>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {tour.name}
                              </div>
                              <div className="text-sm text-muted-foreground">{tour.slug}</div>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <TourStatusBadge status={tour.status as "draft" | "active" | "archived"} />
                          </TableCell>

                          {/* Duration */}
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {tour.durationMinutes} min
                            </span>
                          </TableCell>

                          {/* Capacity */}
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {tour.minParticipants ?? 1} - {tour.maxParticipants}
                            </span>
                          </TableCell>

                          {/* Price */}
                          <TableCell>
                            <span className="text-sm font-medium text-foreground">
                              ${parseFloat(tour.basePrice).toFixed(2)}
                            </span>
                          </TableCell>

                          {/* Schedule Stats */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <TourScheduleStats
                              upcomingCount={stats.upcomingCount}
                              totalCapacity={stats.totalCapacity}
                              totalBooked={stats.totalBooked}
                              utilizationPercent={stats.utilizationPercent}
                              nextScheduleDate={stats.nextScheduleDate}
                            />
                          </TableCell>

                          {/* Actions */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <TableActions>
                              <Link href={`/org/${slug}/tours/${tour.id}` as Route}>
                                <ActionButton tooltip="View tour">
                                  <Eye className="h-4 w-4" />
                                </ActionButton>
                              </Link>
                              <Link href={`/org/${slug}/tours/${tour.id}?tab=details` as Route}>
                                <ActionButton tooltip="Edit tour">
                                  <Edit className="h-4 w-4" />
                                </ActionButton>
                              </Link>
                              <ActionButton
                                tooltip="Duplicate tour"
                                onClick={() => handleDuplicate(tour.id, tour.name)}
                                disabled={duplicateMutation.isPending}
                              >
                                <Copy className="h-4 w-4" />
                              </ActionButton>
                              {tour.status === "draft" && (
                                <ActionButton
                                  variant="success"
                                  tooltip="Publish tour"
                                  onClick={() => handlePublish(tour.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </ActionButton>
                              )}
                              {tour.status === "active" && (
                                <ActionButton
                                  tooltip="Archive tour"
                                  onClick={() => handleArchive(tour.id)}
                                >
                                  <Archive className="h-4 w-4" />
                                </ActionButton>
                              )}
                              <ActionButton
                                variant="danger"
                                tooltip="Delete tour"
                                onClick={() => handleDelete(tour.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </ActionButton>
                            </TableActions>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <TableRow key={`${tour.id}-expanded`}>
                            <TableCell colSpan={8} className="p-0">
                              <TourSchedulePreview
                                tourId={tour.id}
                                orgSlug={slug}
                                isExpanded={isExpanded}
                                maxDisplay={5}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <TablePagination
                  page={page}
                  totalPages={data.totalPages}
                  total={data.total}
                  pageSize={10}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </>
      )}

      {ConfirmModal}
    </div>
  );
}
