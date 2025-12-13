"use client";

import { trpc } from "@/lib/trpc";
import { Calendar, Plus, Edit, Trash2, Eye, X, Users, Clock, List, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { ScheduleCalendar, getCalendarDateRange } from "@/components/schedules/schedule-calendar";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoSchedulesEmpty } from "@/components/ui/empty-state";

type StatusFilter = "all" | "scheduled" | "in_progress" | "completed" | "cancelled";
type ViewMode = "list" | "calendar";
type CalendarView = "month" | "week" | "day" | "agenda";

export default function SchedulesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const confirmModal = useConfirmModal();

  // View state
  const initialView = (searchParams.get("view") as ViewMode) || "list";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // List view state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tourFilter, setTourFilter] = useState<string | undefined>(undefined);

  // Calculate date range for calendar view
  const calendarDateRange = useMemo(
    () => getCalendarDateRange(calendarDate),
    [calendarDate]
  );

  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Query for list view - paginated
  const listQuery = trpc.schedule.list.useQuery(
    {
      pagination: { page, limit: 20 },
      filters: {
        status: statusFilter === "all" ? undefined : statusFilter,
        tourId: tourFilter,
      },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: viewMode === "list" }
  );

  // Query for calendar view - full date range
  const calendarQuery = trpc.schedule.list.useQuery(
    {
      pagination: { page: 1, limit: 500 },
      filters: {
        dateRange: calendarDateRange,
        tourId: tourFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: viewMode === "calendar" }
  );

  const data = viewMode === "list" ? listQuery.data : calendarQuery.data;
  const isLoading = viewMode === "list" ? listQuery.isLoading : calendarQuery.isLoading;
  const error = viewMode === "list" ? listQuery.error : calendarQuery.error;

  const utils = trpc.useUtils();

  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
    },
  });

  const cancelMutation = trpc.schedule.cancel.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
    },
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Delete Schedule",
      description: "This will permanently delete this schedule. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCancel = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Cancel Schedule",
      description: "This will cancel this scheduled tour. Customers with bookings will be notified.",
      confirmLabel: "Cancel Schedule",
      variant: "destructive",
    });

    if (confirmed) {
      cancelMutation.mutate({ id });
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set("view", mode);
    router.replace(`${url.pathname}${url.search}` as Route);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading schedules: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-500 mt-1">Schedule tour times and manage availability</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => handleViewModeChange("list")}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => handleViewModeChange("calendar")}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "calendar"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
          </div>

          <Link
            href={`/org/${slug}/schedules/new` as Route}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {(["all", "scheduled", "in_progress", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === status
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={tourFilter || ""}
          onChange={(e) => {
            setTourFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">All Tours</option>
          {toursData?.data.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {tour.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        viewMode === "calendar" ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>
        ) : (
          <TableSkeleton rows={10} columns={6} />
        )
      ) : viewMode === "calendar" ? (
        /* Calendar View */
        <ScheduleCalendar
          schedules={data?.data || []}
          currentDate={calendarDate}
          onDateChange={setCalendarDate}
          view={calendarView}
          onViewChange={setCalendarView}
        />
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <NoSchedulesEmpty orgSlug={slug} />
        </div>
      ) : (
        /* List View */
        <>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour / Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.tour?.name || "Unknown Tour"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(schedule.startsAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {formatTime(schedule.startsAt)} - {formatTime(schedule.endsAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : schedule.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : schedule.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {schedule.status === "in_progress" ? "In Progress" : schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full min-w-[140px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">{schedule.bookedCount ?? 0} / {schedule.maxParticipants}</span>
                          <span className={`font-medium ${
                            schedule.maxParticipants === 0 ? 'text-gray-600' :
                            ((schedule.bookedCount ?? 0) / schedule.maxParticipants) >= 1 ? 'text-red-600' :
                            ((schedule.bookedCount ?? 0) / schedule.maxParticipants) >= 0.8 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {schedule.maxParticipants === 0 ? 'N/A' : Math.round(((schedule.bookedCount ?? 0) / schedule.maxParticipants) * 100) + '%'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              schedule.maxParticipants === 0 ? 'bg-gray-400' :
                              ((schedule.bookedCount ?? 0) / schedule.maxParticipants) >= 1 ? 'bg-red-500' :
                              ((schedule.bookedCount ?? 0) / schedule.maxParticipants) >= 0.8 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${schedule.maxParticipants === 0 ? 0 : Math.min(100, ((schedule.bookedCount ?? 0) / schedule.maxParticipants) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.price ? `$${parseFloat(schedule.price).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/org/${slug}/schedules/${schedule.id}` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="View"
                          aria-label="View schedule details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/org/${slug}/schedules/${schedule.id}/edit` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                          aria-label="Edit schedule"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {schedule.status === "scheduled" && (
                          <button
                            onClick={() => handleCancel(schedule.id)}
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded"
                            title="Cancel"
                            aria-label="Cancel schedule"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, data.total)} of {data.total} schedules
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmModal.ConfirmModal}
    </div>
  );
}
