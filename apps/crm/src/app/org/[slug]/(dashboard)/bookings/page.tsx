"use client";

import { trpc } from "@/lib/trpc";
import {
  Eye,
  Edit,
  X,
  CheckCircle,
  Users,
  Ban,
  Mail,
  RefreshCw,
  Zap,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { useBookingOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  SelectAllCheckbox,
  SelectRowCheckbox,
  BulkActionBar,
  useTableSelection,
} from "@/components/ui/data-table";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoBookingsEmpty, NoResultsEmpty } from "@/components/ui/empty-state";
import { BulkRescheduleModal } from "@/components/bookings/bulk-reschedule-modal";
import { BulkEmailModal } from "@/components/bookings/bulk-email-modal";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { BookingMobileCard, BookingMobileCardSkeleton } from "@/components/bookings/booking-mobile-card";
import { useIsMobile } from "@/hooks/use-media-query";

// New view-based components
import { BookingViewTabs } from "@/components/bookings/booking-view-tabs";
import { NeedsActionView, TodayView, UpcomingView } from "@/components/bookings/views";
import { BookingPlanner } from "@/components/availability/booking-planner";

type BookingView = "needs-action" | "upcoming" | "today" | "all" | "find-availability";
type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
type PaymentFilter = "all" | "pending" | "partial" | "paid" | "refunded" | "failed";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

export default function BookingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const isMobile = useIsMobile();
  const { openQuickBooking } = useQuickBookingContext();

  // Get active view from URL or default to "all"
  const viewParam = searchParams.get("view") as BookingView | null;
  const activeView: BookingView = viewParam && ["needs-action", "upcoming", "today", "all", "find-availability"].includes(viewParam)
    ? viewParam
    : "all";

  // Handle view change
  const handleViewChange = useCallback((view: BookingView) => {
    // View change is handled by BookingViewTabs via URL
  }, []);

  // Auto-open quick booking from URL param (e.g., from command palette or dashboard)
  useEffect(() => {
    if (searchParams.get("phone") === "1" || searchParams.get("quick") === "1") {
      openQuickBooking();
      // Remove the query param to prevent re-opening on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("phone");
      params.delete("quick");
      router.replace(`/org/${slug}/bookings${params.toString() ? `?${params.toString()}` : ""}` as Route, { scroll: false });
    }
  }, [searchParams, router, slug, openQuickBooking]);

  // Fetch counts for tabs
  const { data: urgencyData } = trpc.booking.getGroupedByUrgency.useQuery(undefined, {
    staleTime: 30000, // 30 seconds
  });

  const { data: upcomingData } = trpc.booking.getUpcoming.useQuery({ days: 7 }, {
    staleTime: 30000,
  });

  const { data: todayData } = trpc.booking.getTodayWithUrgency.useQuery(undefined, {
    staleTime: 30000,
  });

  const tabCounts = useMemo(() => ({
    needsAction: urgencyData?.stats.needsAction ?? 0,
    upcoming: upcomingData?.stats.totalBookings ?? 0,
    today: todayData?.stats.total ?? 0,
  }), [urgencyData, upcomingData, todayData]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header: Title + Quick Book */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">Bookings</h1>
          {/* Inline summary for needs action view */}
          {activeView === "needs-action" && urgencyData?.stats.critical && urgencyData.stats.critical > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-red-600 font-medium animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {urgencyData.stats.critical} critical
            </span>
          )}
        </div>

        {/* Quick Book buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickBooking()}
            className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
            aria-label="Quick book"
          >
            <Zap className="h-5 w-5" />
          </button>
          <button
            onClick={() => openQuickBooking()}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Quick Book
            <kbd className="hidden md:inline-flex text-primary-foreground/70 text-xs ml-1 px-1.5 py-0.5 rounded bg-primary-foreground/10 font-mono">⌘B</kbd>
          </button>
        </div>
      </header>

      {/* View Tabs */}
      <BookingViewTabs
        activeView={activeView}
        onViewChange={handleViewChange}
        counts={tabCounts}
      />

      {/* View Content */}
      {activeView === "needs-action" && <NeedsActionView orgSlug={slug} />}
      {activeView === "upcoming" && <UpcomingView orgSlug={slug} />}
      {activeView === "today" && <TodayView orgSlug={slug} />}
      {activeView === "all" && <AllBookingsView slug={slug} isMobile={isMobile} openQuickBooking={openQuickBooking} />}
      {activeView === "find-availability" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Search for available tour slots to help customers find the perfect time.
          </p>
          <BookingPlanner orgSlug={slug} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ALL BOOKINGS VIEW (Original Table View)
// =============================================================================

interface AllBookingsViewProps {
  slug: string;
  isMobile: boolean;
  openQuickBooking: () => void;
}

function AllBookingsView({ slug, isMobile, openQuickBooking }: AllBookingsViewProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const confirmModal = useConfirmModal();
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [showBulkRescheduleModal, setShowBulkRescheduleModal] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);

  const hasActiveFilters = statusFilter !== "all" || paymentFilter !== "all" || search !== "";

  const { data, isLoading, error } = trpc.booking.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      status: statusFilter === "all" ? undefined : statusFilter,
      paymentStatus: paymentFilter === "all" ? undefined : paymentFilter,
      search: search || undefined,
    },
    sort: { field: "createdAt", direction: "desc" },
  });

  const { data: stats } = trpc.booking.getStats.useQuery({});

  // Get utils for invalidation in modals
  const utils = trpc.useUtils();

  // Use optimistic mutations for instant UI feedback
  const {
    confirmBooking: confirmMutation,
    cancelBooking: cancelMutation,
    bulkConfirm: bulkConfirmMutationBase,
    bulkCancel: bulkCancelMutationBase,
  } = useBookingOptimisticMutations();

  // Selection hook - memoize getItemId to prevent recreation
  const getItemId = useCallback((item: { id: string }) => item.id, []);
  const selection = useTableSelection({
    items: data?.data ?? [],
    getItemId,
  });

  // Wrap bulk mutations to handle selection clearing and dialog state
  const bulkConfirmMutation = {
    ...bulkConfirmMutationBase,
    mutate: (args: Parameters<typeof bulkConfirmMutationBase.mutate>[0]) => {
      bulkConfirmMutationBase.mutate(args, {
        onSuccess: () => {
          selection.clearSelection();
        },
      });
    },
  };

  const bulkCancelMutation = {
    ...bulkCancelMutationBase,
    mutate: (args: Parameters<typeof bulkCancelMutationBase.mutate>[0]) => {
      bulkCancelMutationBase.mutate(args, {
        onSuccess: () => {
          selection.clearSelection();
          setShowBulkCancelDialog(false);
          setBulkCancelReason("");
        },
      });
    },
  };

  // Bulk actions
  const bulkActions = useMemo(() => {
    const selectedBookings = selection.getSelectedItems();
    const pendingCount = selectedBookings.filter((b) => b.status === "pending").length;
    const cancellableCount = selectedBookings.filter(
      (b) => b.status === "pending" || b.status === "confirmed"
    ).length;

    return [
      {
        label: `Confirm (${pendingCount})`,
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: () => {
          const pendingIds = selectedBookings
            .filter((b) => b.status === "pending")
            .map((b) => b.id);
          if (pendingIds.length > 0) {
            bulkConfirmMutation.mutate({ ids: pendingIds });
          } else {
            toast.info("No pending bookings selected");
          }
        },
        loading: bulkConfirmMutation.isPending,
        disabled: pendingCount === 0,
      },
      {
        label: `Cancel (${cancellableCount})`,
        icon: <Ban className="h-4 w-4" />,
        onClick: () => {
          if (cancellableCount > 0) {
            setShowBulkCancelDialog(true);
          } else {
            toast.info("No cancellable bookings selected");
          }
        },
        variant: "destructive" as const,
        loading: bulkCancelMutation.isPending,
        disabled: cancellableCount === 0,
      },
      {
        label: "Reschedule",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: () => {
          if (cancellableCount > 0) {
            setShowBulkRescheduleModal(true);
          } else {
            toast.info("No reschedulable bookings selected");
          }
        },
        disabled: cancellableCount === 0,
      },
      {
        label: "Send Email",
        icon: <Mail className="h-4 w-4" />,
        onClick: () => {
          setShowBulkEmailModal(true);
        },
        disabled: selectedBookings.length === 0,
      },
    ];
  }, [selection, bulkConfirmMutation, bulkCancelMutation]);

  const handleBulkCancelSubmit = () => {
    const selectedBookings = selection.getSelectedItems();
    const cancellableIds = selectedBookings
      .filter((b) => b.status === "pending" || b.status === "confirmed")
      .map((b) => b.id);
    if (cancellableIds.length > 0) {
      bulkCancelMutation.mutate({
        ids: cancellableIds,
        reason: bulkCancelReason || undefined,
      });
    }
  };

  const handleConfirm = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Confirm Booking",
      description: "This will send a confirmation email to the customer and update the booking status.",
      confirmLabel: "Confirm Booking",
      variant: "default",
    });

    if (confirmed) {
      confirmMutation.mutate({ id });
    }
  };

  const handleCancel = (id: string) => {
    setBookingToCancel(id);
    setShowCancelDialog(true);
  };

  const handleCancelSubmit = () => {
    if (bookingToCancel) {
      cancelMutation.mutate({
        id: bookingToCancel,
        reason: cancelReason || undefined
      });
      setShowCancelDialog(false);
      setCancelReason("");
      setBookingToCancel(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
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
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load bookings</p>
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
      {/* Stats Row */}
      {stats && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <span><span className="font-medium text-foreground">{stats.total}</span> total</span>
            <span><span className="font-medium text-amber-600">{stats.pending}</span> pending</span>
            <span><span className="font-medium text-emerald-600">${parseFloat(stats.revenue).toLocaleString()}</span> revenue</span>
            <span className="hidden lg:inline"><span className="font-medium text-foreground">{stats.participantCount}</span> guests</span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3" role="search" aria-label="Filter bookings">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search bookings..."
            aria-label="Search bookings"
            className="w-full h-10 sm:h-9 pl-3 pr-8 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="flex-1 sm:flex-none h-10 sm:h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "all" ? "Status" : opt.label}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value as PaymentFilter);
              setPage(1);
            }}
            aria-label="Filter by payment"
            className="flex-1 sm:flex-none h-10 sm:h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "all" ? "Payment" : opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPaymentFilter("all");
                setPage(1);
              }}
              className="h-10 sm:h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content: Mobile Cards or Desktop Table */}
      {isLoading ? (
        isMobile ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <BookingMobileCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <TableSkeleton rows={10} columns={7} />
        )
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search ? (
            <NoResultsEmpty searchTerm={search} />
          ) : (
            <NoBookingsEmpty orgSlug={slug} onCreateBooking={() => openQuickBooking()} />
          )}
        </div>
      ) : isMobile ? (
        /* Mobile: Card List View */
        <div className="space-y-3">
          {data?.data.map((booking) => (
            <BookingMobileCard
              key={booking.id}
              booking={booking}
              orgSlug={slug}
              onConfirm={booking.status === "pending" ? handleConfirm : undefined}
              onCancel={(booking.status === "pending" || booking.status === "confirmed") ? handleCancel : undefined}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Table View */
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <SelectAllCheckbox
                    checked={selection.checkboxState}
                    onChange={selection.toggleAll}
                  />
                </TableHead>
                <TableHead>Reference / Customer</TableHead>
                <TableHead>Tour / Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((booking) => {
                const total = parseFloat(booking.total);
                const isHighValue = total >= 500;
                const isOptimistic = (booking as any)._optimistic;
                return (
                <TableRow
                  key={booking.id}
                  data-state={selection.isSelected(booking.id) ? "selected" : undefined}
                  className={cn(
                    "transition-colors cursor-pointer",
                    booking.status === "confirmed" && "border-l-2 border-l-emerald-500",
                    booking.status === "pending" && "border-l-2 border-l-amber-500",
                    booking.status === "cancelled" && "border-l-2 border-l-red-400",
                    booking.paymentStatus === "paid" && !selection.isSelected(booking.id) && "bg-emerald-50/30 dark:bg-emerald-950/10",
                    // Optimistic update styling - subtle opacity to indicate pending server confirmation
                    isOptimistic && "opacity-70"
                  )}
                  onClick={(e) => {
                    // Don't navigate if clicking on checkbox, actions, or links
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('input[type="checkbox"]') ||
                      target.closest('button') ||
                      target.closest('a')
                    ) {
                      return;
                    }
                    // Navigate directly to booking details page
                    router.push(`/org/${slug}/bookings/${booking.id}`);
                  }}
                >
                  <TableCell>
                    <SelectRowCheckbox
                      checked={selection.isSelected(booking.id)}
                      onChange={() => selection.toggleItem(booking.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {/* Customer name - primary focus */}
                      <div className="text-sm font-medium text-foreground">
                        {booking.customer
                          ? `${booking.customer.firstName} ${booking.customer.lastName}`
                          : "Unknown Customer"}
                      </div>
                      {/* Reference - de-emphasized */}
                      <div className="text-[11px] font-mono text-muted-foreground/60 tracking-tight">
                        {booking.referenceNumber}
                      </div>
                      {booking.customer?.email && (
                        <div className="text-xs text-muted-foreground/70">
                          {booking.customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div
                        className="text-sm font-medium text-foreground truncate"
                        title={booking.tour?.name || "Unknown Tour"}
                      >
                        {booking.tour?.name || "Unknown Tour"}
                      </div>
                      {booking.schedule && (
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(booking.schedule.startsAt)} at{" "}
                          {formatTime(booking.schedule.startsAt)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <BookingStatusBadge status={booking.status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"} />
                      {isOptimistic && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <PaymentStatusBadge status={booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed"} />
                      {isOptimistic && booking.paymentStatus !== (data?.data.find(b => b.id === booking.id) as any)?._originalPaymentStatus && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {booking.totalParticipants}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        isHighValue ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      )}>
                        ${total.toFixed(0)}
                      </span>
                      {isHighValue && (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          High Value
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TableActions>
                      <Link href={`/org/${slug}/bookings/${booking.id}` as Route}>
                        <ActionButton tooltip="View booking">
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                      </Link>
                      <Link href={`/org/${slug}/bookings/${booking.id}/edit` as Route}>
                        <ActionButton tooltip="Edit booking">
                          <Edit className="h-4 w-4" />
                        </ActionButton>
                      </Link>
                      {booking.status === "pending" && (
                        <ActionButton
                          variant="success"
                          tooltip="Confirm booking"
                          onClick={() => handleConfirm(booking.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </ActionButton>
                      )}
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <ActionButton
                          variant="danger"
                          tooltip="Cancel booking"
                          onClick={() => handleCancel(booking.id)}
                        >
                          <X className="h-4 w-4" />
                        </ActionButton>
                      )}
                    </TableActions>
                  </TableCell>
                </TableRow>
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
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The booking will be cancelled and the customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground">
              Cancellation Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full mt-2 p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Enter cancellation reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
                setBookingToCancel(null);
              }}
              className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Keep Booking
            </button>
            <button
              onClick={handleCancelSubmit}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Modal */}
      {confirmModal.ConfirmModal}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={data?.data.length ?? 0}
        onClearSelection={selection.clearSelection}
        actions={bulkActions}
      />

      {/* Bulk Cancel Dialog */}
      <Dialog open={showBulkCancelDialog} onOpenChange={setShowBulkCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {selection.selectedCount} Bookings</DialogTitle>
            <DialogDescription>
              This will cancel all selected bookings and notify their customers. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground">
              Cancellation Reason (optional)
            </label>
            <textarea
              value={bulkCancelReason}
              onChange={(e) => setBulkCancelReason(e.target.value)}
              className="w-full mt-2 p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Enter cancellation reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setShowBulkCancelDialog(false);
                setBulkCancelReason("");
              }}
              className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Keep Bookings
            </button>
            <button
              onClick={handleBulkCancelSubmit}
              disabled={bulkCancelMutation.isPending}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {bulkCancelMutation.isPending ? "Cancelling..." : "Cancel Bookings"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reschedule Modal */}
      <BulkRescheduleModal
        open={showBulkRescheduleModal}
        onOpenChange={setShowBulkRescheduleModal}
        selectedBookings={selection.getSelectedItems()}
        onSuccess={() => {
          utils.booking.list.invalidate();
          utils.booking.getStats.invalidate();
          selection.clearSelection();
        }}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        open={showBulkEmailModal}
        onOpenChange={setShowBulkEmailModal}
        selectedBookings={selection.getSelectedItems()}
        onSuccess={() => {
          selection.clearSelection();
        }}
      />
    </div>
  );
}
