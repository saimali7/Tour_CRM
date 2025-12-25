"use client";

import { trpc } from "@/lib/trpc";
import { Edit, Trash2, Eye, Archive, Check, Copy, Plus, Calendar, Clock, Users, DollarSign, ChevronRight, MoreHorizontal, CalendarPlus, AlertTriangle, Loader2, Package, Tag, CalendarClock, Briefcase } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTourOptimisticMutations } from "@/hooks/use-optimistic-mutations";

// Design system components
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type StatusFilter = "all" | "draft" | "active" | "paused" | "archived";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export default function ToursPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { confirm, ConfirmModal } = useConfirmModal();

  // Fetch tours with schedule stats
  const { data, isLoading, error } = trpc.tour.listWithScheduleStats.useQuery({
    pagination: { page, limit: 20 },
    filters: statusFilter === "all" ? undefined : { status: statusFilter },
  });

  const { data: stats } = trpc.tour.getStats.useQuery();

  // Use optimistic mutations for instant UI feedback
  const {
    deleteTour: deleteMutation,
    archiveTour: archiveMutation,
    publishTour: publishMutation,
    duplicateTour: duplicateMutation,
  } = useTourOptimisticMutations();

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

  const handleFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load tours</p>
            <p className="text-xs text-destructive/70 mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Catalog Title + Tabs + Create Tour */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Catalog</h1>
            {/* Inline Stats */}
            {stats && (
              <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
                <span><span className="font-medium text-foreground">{stats.active}</span> active</span>
                <span><span className="font-medium text-amber-600">{stats.draft}</span> draft</span>
                <span><span className="font-medium text-foreground">{stats.total}</span> total</span>
              </div>
            )}
          </div>

          <Link
            href={`/org/${slug}/tours/new` as Route}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Tour
          </Link>
        </div>

        {/* Catalog Tabs */}
        <nav className="flex items-center gap-1 border-b border-border -mb-px">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground -mb-px">
            <Package className="h-4 w-4" />
            Tours
          </button>
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
          <Link
            href={`/org/${slug}/availability` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <CalendarClock className="h-4 w-4" />
            Schedules
          </Link>
        </nav>
      </header>

      {/* Compact Filter Bar */}
      <div className="flex items-center gap-3">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
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

      {/* Tour Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded mb-4" />
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <NoToursEmpty orgSlug={slug} />
        </div>
      ) : (
        <>
          {/* Tour Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((tour) => {
              const stats = tour.scheduleStats;
              const isOptimistic = (tour as any)._optimistic;
              const utilizationColor = stats.utilizationPercent >= 80
                ? "text-destructive"
                : stats.utilizationPercent >= 50
                  ? "text-warning"
                  : "text-success";

              return (
                <div
                  key={tour.id}
                  className={cn(
                    "group rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all",
                    stats.utilizationPercent >= 80 && tour.status === "active"
                      ? "border-emerald-200 dark:border-emerald-900/50"
                      : "border-border",
                    tour.status === "active" && stats.upcomingCount > 0 && "ring-1 ring-primary/10",
                    // Optimistic update styling - subtle opacity and pulse animation
                    isOptimistic && "opacity-70 animate-pulse"
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        {isOptimistic ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="font-medium text-foreground line-clamp-1">
                              {tour.name}
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={`/org/${slug}/tours/${tour.id}` as Route}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {tour.name}
                          </Link>
                        )}
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {tour.durationMinutes} min · ${parseFloat(tour.basePrice).toFixed(0)}
                        </p>
                      </div>
                      <TourStatusBadge status={tour.status as "draft" | "active" | "archived"} />
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{stats.upcomingCount} upcoming</span>
                      </div>

                      {/* Visual capacity bar */}
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                stats.utilizationPercent >= 80 ? "bg-emerald-500" :
                                stats.utilizationPercent >= 50 ? "bg-primary" :
                                stats.utilizationPercent >= 20 ? "bg-amber-500" : "bg-red-400"
                              )}
                              style={{ width: `${Math.min(stats.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            stats.utilizationPercent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                            stats.utilizationPercent < 30 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          )}>
                            {stats.utilizationPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Schedule */}
                    {stats.nextScheduleDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Next: {new Date(stats.nextScheduleDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/30">
                    <Link
                      href={`/org/${slug}/tours/${tour.id}/schedules/new` as Route}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Add Schedule
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/org/${slug}/tours/${tour.id}` as Route}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/org/${slug}/tours/${tour.id}?tab=details` as Route}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Tour
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(tour.id, tour.name)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tour.status === "draft" && (
                          <DropdownMenuItem onClick={() => handlePublish(tour.id)}>
                            <Check className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {tour.status === "active" && (
                          <DropdownMenuItem onClick={() => handleArchive(tour.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(tour.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {ConfirmModal}
    </div>
  );
}
