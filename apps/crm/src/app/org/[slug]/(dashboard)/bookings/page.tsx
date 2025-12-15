"use client";

import { trpc } from "@/lib/trpc";
import {
  Ticket,
  Eye,
  Edit,
  X,
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// New design system components
import { PageHeader, PageHeaderAction, StatsRow, StatCard } from "@/components/ui/page-header";
import { FilterBar, FilterSearch, FilterChipGroup, FilterRow, SmallFilterChipGroup } from "@/components/ui/filter-bar";
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
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoBookingsEmpty, NoResultsEmpty } from "@/components/ui/empty-state";

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
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const confirmModal = useConfirmModal();

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

  const utils = trpc.useUtils();

  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
      toast.success("Booking confirmed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to confirm booking: ${error.message}`);
    },
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => {
      toast.error(`Failed to cancel booking: ${error.message}`);
    },
  });

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
        <p className="text-destructive">Error loading bookings: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Bookings"
        description="Manage customer reservations"
      >
        <PageHeaderAction href={`/org/${slug}/bookings/new`}>
          New Booking
        </PageHeaderAction>
      </PageHeader>

      {/* Stats Row */}
      {stats && (
        <StatsRow>
          <StatCard
            icon={Ticket}
            label="Total"
            value={stats.total}
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
          />
          <StatCard
            icon={Calendar}
            label="Pending"
            value={stats.pending}
            iconColor="text-warning"
            iconBgColor="bg-warning/10"
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={`$${parseFloat(stats.revenue).toLocaleString()}`}
            iconColor="text-success"
            iconBgColor="bg-success/10"
          />
          <StatCard
            icon={Users}
            label="Participants"
            value={stats.participantCount}
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
          />
        </StatsRow>
      )}

      {/* Filters */}
      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by reference, customer name, or email..."
        />
        <FilterChipGroup
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
      </FilterBar>

      {/* Secondary Filters */}
      <FilterRow label="Payment:">
        <SmallFilterChipGroup
          value={paymentFilter}
          onChange={(value) => {
            setPaymentFilter(value);
            setPage(1);
          }}
          options={PAYMENT_OPTIONS}
        />
      </FilterRow>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search ? (
            <NoResultsEmpty searchTerm={search} />
          ) : (
            <NoBookingsEmpty orgSlug={slug} />
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
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
              {data?.data.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <div className="text-sm font-mono font-medium text-foreground">
                        {booking.referenceNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.customer
                          ? `${booking.customer.firstName} ${booking.customer.lastName}`
                          : "Unknown Customer"}
                      </div>
                      {booking.customer?.email && (
                        <div className="text-xs text-muted-foreground/70">
                          {booking.customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {booking.tour?.name || "Unknown Tour"}
                      </div>
                      {booking.schedule && (
                        <div className="text-sm text-muted-foreground">
                          {formatDate(booking.schedule.startsAt)} at{" "}
                          {formatTime(booking.schedule.startsAt)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"} />
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {booking.totalParticipants}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-foreground">
                      ${parseFloat(booking.total).toFixed(2)}
                    </span>
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
              ))}
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
    </div>
  );
}
