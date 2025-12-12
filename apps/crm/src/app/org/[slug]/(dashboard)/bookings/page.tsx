"use client";

import { trpc } from "@/lib/trpc";
import {
  Ticket,
  Plus,
  Eye,
  Edit,
  X,
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
type PaymentFilter = "all" | "pending" | "partial" | "paid" | "refunded" | "failed";

export default function BookingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");

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
    },
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  const handleConfirm = (id: string) => {
    if (confirm("Confirm this booking?")) {
      confirmMutation.mutate({ id });
    }
  };

  const handleCancel = (id: string) => {
    const reason = prompt("Cancellation reason (optional):");
    if (reason !== null) {
      cancelMutation.mutate({ id, reason: reason || undefined });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-orange-100 text-orange-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading bookings: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage customer reservations</p>
        </div>
        <Link
          href={`/org/${slug}/bookings/new` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ticket className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${parseFloat(stats.revenue).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <p className="text-xl font-semibold text-gray-900">{stats.participantCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by reference, customer name, or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "confirmed", "completed", "cancelled", "no_show"] as const).map(
            (status) => (
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
                {status === "no_show"
                  ? "No Show"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Payment Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Payment:</span>
        {(["all", "pending", "partial", "paid", "refunded", "failed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setPaymentFilter(status);
              setPage(1);
            }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paymentFilter === status
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="p-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings yet</h3>
            <p className="mt-2 text-gray-500">
              Create your first booking to get started.
            </p>
            <Link
              href={`/org/${slug}/bookings/new` as Route}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference / Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour / Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-mono font-medium text-gray-900">
                          {booking.referenceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customer
                            ? `${booking.customer.firstName} ${booking.customer.lastName}`
                            : "Unknown Customer"}
                        </div>
                        {booking.customer?.email && (
                          <div className="text-xs text-gray-400">{booking.customer.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.tour?.name || "Unknown Tour"}
                        </div>
                        {booking.schedule && (
                          <div className="text-sm text-gray-500">
                            {formatDate(booking.schedule.startsAt)} at{" "}
                            {formatTime(booking.schedule.startsAt)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status === "no_show"
                          ? "No Show"
                          : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentColor(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus.charAt(0).toUpperCase() +
                          booking.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        {booking.totalParticipants}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(booking.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/org/${slug}/bookings/${booking.id}` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/org/${slug}/bookings/${booking.id}/edit` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {booking.status === "pending" && (
                          <button
                            onClick={() => handleConfirm(booking.id)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                            title="Confirm"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {(booking.status === "pending" || booking.status === "confirmed") && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
                {data.total} bookings
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
    </div>
  );
}
