"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  X,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  UserMinus,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { ActivityLogCard } from "@/components/activity-log/activity-log-list";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const bookingId = params.id as string;

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<"customer_request" | "booking_cancelled" | "other">("customer_request");
  const [refundNotes, setRefundNotes] = useState("");

  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery({ id: bookingId });

  const utils = trpc.useUtils();

  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
    },
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
    },
  });

  const completeMutation = trpc.booking.complete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
    },
  });

  const noShowMutation = trpc.booking.markNoShow.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
    },
  });

  const updatePaymentMutation = trpc.booking.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
    },
  });

  const rescheduleMutation = trpc.booking.reschedule.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      setShowRescheduleModal(false);
      setSelectedScheduleId(null);
    },
  });

  const createRefundMutation = trpc.refund.create.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.refund.getForBooking.invalidate({ bookingId });
      setShowRefundModal(false);
      setRefundAmount("");
      setRefundNotes("");
    },
  });

  // Query for available schedules (same tour)
  const { data: availableSchedules } = trpc.schedule.list.useQuery(
    {
      filters: {
        tourId: booking?.tour?.id,
        status: "scheduled",
        dateRange: {
          from: new Date(),
        },
      },
      pagination: { limit: 50 },
    },
    { enabled: showRescheduleModal && !!booking?.tour?.id }
  );

  // Query for existing refunds
  const { data: refunds } = trpc.refund.getForBooking.useQuery(
    { bookingId },
    { enabled: !!booking && booking.status === "cancelled" }
  );

  const handleConfirm = () => {
    if (confirm("Confirm this booking?")) {
      confirmMutation.mutate({ id: bookingId });
    }
  };

  const handleCancel = () => {
    const reason = prompt("Cancellation reason (optional):");
    if (reason !== null) {
      cancelMutation.mutate({ id: bookingId, reason: reason || undefined });
    }
  };

  const handleComplete = () => {
    if (confirm("Mark this booking as completed?")) {
      completeMutation.mutate({ id: bookingId });
    }
  };

  const handleNoShow = () => {
    if (confirm("Mark this booking as no-show?")) {
      noShowMutation.mutate({ id: bookingId });
    }
  };

  const handleMarkPaid = () => {
    if (confirm("Mark this booking as paid?")) {
      updatePaymentMutation.mutate({
        id: bookingId,
        paymentStatus: "paid",
        paidAmount: booking?.total,
      });
    }
  };

  const handleReschedule = () => {
    if (selectedScheduleId) {
      rescheduleMutation.mutate({
        id: bookingId,
        newScheduleId: selectedScheduleId,
      });
    }
  };

  const handleCreateRefund = () => {
    if (refundAmount && parseFloat(refundAmount) > 0) {
      createRefundMutation.mutate({
        bookingId,
        amount: refundAmount,
        reason: refundReason,
        reasonDetails: refundNotes || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading booking: {error.message}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Booking not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/bookings` as Route}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {booking.referenceNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status === "no_show"
                  ? "No Show"
                  : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentColor(
                  booking.paymentStatus
                )}`}
              >
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {booking.tour?.name} • {booking.schedule && formatDate(booking.schedule.startsAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {booking.status === "pending" && (
            <button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm
            </button>
          )}
          {booking.status === "confirmed" && (
            <>
              <button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </button>
              <button
                onClick={handleNoShow}
                disabled={noShowMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <UserMinus className="h-4 w-4" />
                No Show
              </button>
            </>
          )}
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                <CalendarClock className="h-4 w-4" />
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          )}
          {booking.status === "cancelled" && booking.paymentStatus === "paid" && (
            <button
              onClick={() => {
                setRefundAmount(booking.total);
                setShowRefundModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Issue Refund
            </button>
          )}
          <Link
            href={`/org/${slug}/bookings/${booking.id}/edit` as Route}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold text-gray-900">
                {booking.schedule && formatDate(booking.schedule.startsAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-semibold text-gray-900">
                {booking.schedule && formatTime(booking.schedule.startsAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Guests</p>
              <p className="font-semibold text-gray-900">{booking.totalParticipants}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="font-semibold text-gray-900">${parseFloat(booking.total).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
          {booking.customer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {booking.customer.firstName[0]}
                    {booking.customer.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.customer.firstName} {booking.customer.lastName}
                  </p>
                  <Link
                    href={`/org/${slug}/customers/${booking.customer.id}` as Route}
                    className="text-sm text-primary hover:underline"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${booking.customer.email}`} className="hover:text-primary">
                  {booking.customer.email}
                </a>
              </div>
              {booking.customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${booking.customer.phone}`} className="hover:text-primary">
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Customer information not available</p>
          )}
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
            {booking.paymentStatus !== "paid" && booking.status !== "cancelled" && (
              <button
                onClick={handleMarkPaid}
                disabled={updatePaymentMutation.isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Mark as Paid
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">${parseFloat(booking.subtotal).toFixed(2)}</span>
            </div>
            {booking.discount && parseFloat(booking.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span className="text-green-600">
                  -${parseFloat(booking.discount).toFixed(2)}
                </span>
              </div>
            )}
            {booking.tax && parseFloat(booking.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">${parseFloat(booking.tax).toFixed(2)}</span>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">${parseFloat(booking.total).toFixed(2)}</span>
            </div>
            {booking.paidAmount && parseFloat(booking.paidAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-600">
                  ${parseFloat(booking.paidAmount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentColor(
                  booking.paymentStatus
                )}`}
              >
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-semibold text-gray-900">{booking.adultCount}</p>
            <p className="text-sm text-gray-500">Adults</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-semibold text-gray-900">{booking.childCount ?? 0}</p>
            <p className="text-sm text-gray-500">Children</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-semibold text-gray-900">{booking.infantCount ?? 0}</p>
            <p className="text-sm text-gray-500">Infants</p>
          </div>
        </div>
      </div>

      {/* Participants */}
      {booking.participants && booking.participants.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Participants ({booking.participants.length})
          </h2>
          <div className="divide-y divide-gray-200">
            {booking.participants.map((participant) => (
              <div key={participant.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {participant.firstName} {participant.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                    {participant.email && ` • ${participant.email}`}
                  </p>
                </div>
                {(participant.dietaryRequirements || participant.accessibilityNeeds) && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Special requirements</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Requests */}
      {(booking.specialRequests ||
        booking.dietaryRequirements ||
        booking.accessibilityNeeds ||
        booking.internalNotes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {booking.specialRequests && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{booking.specialRequests}</p>
            </div>
          )}
          {booking.dietaryRequirements && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dietary Requirements</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{booking.dietaryRequirements}</p>
            </div>
          )}
          {booking.accessibilityNeeds && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Accessibility Needs</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{booking.accessibilityNeeds}</p>
            </div>
          )}
          {booking.internalNotes && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{booking.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Booking Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Source</p>
            <p className="font-medium text-gray-900">
              {booking.source.charAt(0).toUpperCase() + booking.source.slice(1).replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium text-gray-900">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(booking.createdAt))}
            </p>
          </div>
          {booking.confirmedAt && (
            <div>
              <p className="text-gray-500">Confirmed</p>
              <p className="font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(booking.confirmedAt))}
              </p>
            </div>
          )}
          {booking.cancelledAt && (
            <div>
              <p className="text-gray-500">Cancelled</p>
              <p className="font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(booking.cancelledAt))}
              </p>
            </div>
          )}
        </div>
        {booking.cancellationReason && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-500">Cancellation Reason</p>
            <p className="text-red-700">{booking.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <ActivityLogCard
        entityType="booking"
        entityId={bookingId}
        title="Activity History"
        limit={15}
      />

      {/* Refunds Section (for cancelled bookings) */}
      {booking.status === "cancelled" && refunds && refunds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Refunds</h2>
          <div className="space-y-3">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    ${parseFloat(refund.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {refund.reason.replace("_", " ")} •{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                    }).format(new Date(refund.createdAt))}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    refund.status === "succeeded"
                      ? "bg-green-100 text-green-800"
                      : refund.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : refund.status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Reschedule Booking</h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedScheduleId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Select a new date and time for this booking. The booking will be moved
                to the selected schedule.
              </p>

              {availableSchedules?.data && availableSchedules.data.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSchedules.data
                    .filter((schedule) => schedule.id !== booking.scheduleId)
                    .map((schedule) => {
                      const available = schedule.maxParticipants - (schedule.bookedCount || 0);
                      const hasCapacity = available >= booking.totalParticipants;
                      return (
                        <label
                          key={schedule.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedScheduleId === schedule.id
                              ? "border-primary bg-primary/5"
                              : hasCapacity
                              ? "border-gray-200 hover:border-gray-300"
                              : "border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="schedule"
                              value={schedule.id}
                              checked={selectedScheduleId === schedule.id}
                              onChange={(e) => setSelectedScheduleId(e.target.value)}
                              disabled={!hasCapacity}
                              className="text-primary focus:ring-primary"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {new Intl.DateTimeFormat("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }).format(new Date(schedule.startsAt))}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Intl.DateTimeFormat("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }).format(new Date(schedule.startsAt))}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm ${
                              hasCapacity ? "text-gray-500" : "text-red-500"
                            }`}
                          >
                            {hasCapacity
                              ? `${available} spots left`
                              : "Not enough spots"}
                          </span>
                        </label>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No other available schedules for this tour
                </p>
              )}

              {rescheduleMutation.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{rescheduleMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedScheduleId(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedScheduleId || rescheduleMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Issue Refund</h2>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max refund: ${parseFloat(booking.total).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) =>
                    setRefundReason(
                      e.target.value as "customer_request" | "booking_cancelled" | "other"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="customer_request">Customer Request</option>
                  <option value="booking_cancelled">Booking Cancelled</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Additional details about this refund..."
                />
              </div>

              {createRefundMutation.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{createRefundMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRefund}
                disabled={
                  !refundAmount ||
                  parseFloat(refundAmount) <= 0 ||
                  parseFloat(refundAmount) > parseFloat(booking.total) ||
                  createRefundMutation.isPending
                }
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createRefundMutation.isPending ? "Processing..." : "Issue Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
