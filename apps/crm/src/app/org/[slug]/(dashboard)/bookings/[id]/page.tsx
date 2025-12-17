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
  Plus,
  Trash2,
  Copy,
  Send,
  Link2,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { ActivityLogCard } from "@/components/activity-log/activity-log-list";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@tour/ui";
import { toast } from "sonner";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const bookingId = params.id as string;

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<"customer_request" | "booking_cancelled" | "other">("customer_request");
  const [refundNotes, setRefundNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer" | "check" | "other">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
  const confirmModal = useConfirmModal();

  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery({ id: bookingId });

  const utils = trpc.useUtils();

  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking confirmed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to confirm booking: ${error.message}`);
    },
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => {
      toast.error(`Failed to cancel booking: ${error.message}`);
    },
  });

  const completeMutation = trpc.booking.complete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking marked as completed");
    },
    onError: (error) => {
      toast.error(`Failed to complete booking: ${error.message}`);
    },
  });

  const noShowMutation = trpc.booking.markNoShow.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking marked as no-show");
    },
    onError: (error) => {
      toast.error(`Failed to mark as no-show: ${error.message}`);
    },
  });

  const updatePaymentMutation = trpc.booking.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      toast.success("Payment status updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${error.message}`);
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
      toast.success("Refund record created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create refund: ${error.message}`);
    },
  });

  const processRefundMutation = trpc.refund.process.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.refund.getForBooking.invalidate({ bookingId });
      toast.success("Refund processed via Stripe successfully");
    },
    onError: (error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    },
  });

  const processManualRefundMutation = trpc.refund.processManual.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.refund.getForBooking.invalidate({ bookingId });
      toast.success("Refund marked as processed");
    },
    onError: (error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    },
  });

  const createPaymentMutation = trpc.payment.create.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.payment.listByBooking.invalidate({ bookingId });
      utils.payment.getBookingBalance.invalidate({ bookingId });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const deletePaymentMutation = trpc.payment.delete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.payment.listByBooking.invalidate({ bookingId });
      utils.payment.getBookingBalance.invalidate({ bookingId });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete payment: ${error.message}`);
    },
  });

  const createPaymentLinkMutation = trpc.booking.createPaymentLink.useMutation({
    onSuccess: (data) => {
      setPaymentLinkUrl(data.url || "");
      setShowPaymentLinkModal(true);
      toast.success("Payment link created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create payment link: ${error.message}`);
    },
  });

  const sendPaymentLinkEmailMutation = trpc.booking.sendPaymentLinkEmail.useMutation({
    onSuccess: (data) => {
      setPaymentLinkUrl(data.url || "");
      setShowPaymentLinkModal(false);
      toast.success(`Payment link sent to ${booking?.customer?.email}`);
    },
    onError: (error) => {
      toast.error(`Failed to send payment link: ${error.message}`);
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
    { enabled: !!booking }
  );

  // Query for payments
  const { data: payments } = trpc.payment.listByBooking.useQuery(
    { bookingId },
    { enabled: !!booking }
  );

  // Query for booking balance
  const { data: balanceInfo } = trpc.payment.getBookingBalance.useQuery(
    { bookingId },
    { enabled: !!booking }
  );

  const handleProcessRefund = async (refundId: string, viaStripe: boolean) => {
    const confirmed = await confirmModal.confirm({
      title: viaStripe ? "Process Refund via Stripe" : "Mark Refund as Processed",
      description: viaStripe
        ? "This will process the refund through Stripe. The customer will receive their money back within 5-10 business days."
        : "This will mark the refund as processed manually. Use this for cash refunds or refunds processed outside of Stripe.",
      confirmLabel: viaStripe ? "Process via Stripe" : "Mark as Processed",
      variant: "default",
    });

    if (confirmed) {
      if (viaStripe) {
        processRefundMutation.mutate({ id: refundId });
      } else {
        processManualRefundMutation.mutate({ id: refundId });
      }
    }
  };

  const handleConfirm = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Confirm Booking",
      description: "This will send a confirmation email to the customer and update the booking status.",
      confirmLabel: "Confirm Booking",
      variant: "default",
    });

    if (confirmed) {
      confirmMutation.mutate({ id: bookingId });
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const handleCancelSubmit = () => {
    cancelMutation.mutate({
      id: bookingId,
      reason: cancelReason || undefined
    });
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const handleComplete = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Mark as Completed",
      description: "This will mark the booking as completed. The tour has been successfully delivered.",
      confirmLabel: "Mark Completed",
      variant: "default",
    });

    if (confirmed) {
      completeMutation.mutate({ id: bookingId });
    }
  };

  const handleNoShow = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Mark as No-Show",
      description: "This will mark the booking as no-show. The customer did not attend the tour.",
      confirmLabel: "Mark No-Show",
      variant: "destructive",
    });

    if (confirmed) {
      noShowMutation.mutate({ id: bookingId });
    }
  };

  const handleMarkPaid = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Mark as Paid",
      description: "This will update the payment status to paid. Make sure you have received the full payment.",
      confirmLabel: "Mark as Paid",
      variant: "default",
    });

    if (confirmed) {
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

  const handleRecordPayment = () => {
    if (paymentAmount && parseFloat(paymentAmount) > 0) {
      createPaymentMutation.mutate({
        bookingId,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Delete Payment",
      description: "Are you sure you want to delete this payment record? This will recalculate the booking balance.",
      confirmLabel: "Delete Payment",
      variant: "destructive",
    });

    if (confirmed) {
      deletePaymentMutation.mutate({ id: paymentId });
    }
  };

  const handleOpenPaymentModal = () => {
    // Set default amount to remaining balance
    if (balanceInfo) {
      setPaymentAmount(balanceInfo.balance);
    }
    setShowPaymentModal(true);
  };

  const handleCreatePaymentLink = () => {
    createPaymentLinkMutation.mutate({ bookingId });
  };

  const handleCopyPaymentLink = async () => {
    if (paymentLinkUrl) {
      await navigator.clipboard.writeText(paymentLinkUrl);
      toast.success("Payment link copied to clipboard");
    }
  };

  const handleSendPaymentLink = () => {
    sendPaymentLinkEmailMutation.mutate({ bookingId });
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
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading booking: {error.message}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Booking not found</p>
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
        return "bg-warning/10 text-warning-foreground border border-warning/20";
      case "confirmed":
        return "bg-success/10 text-success-foreground border border-success/20";
      case "completed":
        return "bg-info/10 text-info-foreground border border-info/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive-foreground border border-destructive/20";
      case "no_show":
        return "bg-muted text-muted-foreground border border-border";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning-foreground border border-warning/20";
      case "partial":
        return "bg-warning/10 text-warning border border-warning/20";
      case "paid":
        return "bg-success/10 text-success-foreground border border-success/20";
      case "refunded":
        return "bg-primary/10 text-primary border border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive-foreground border border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/bookings` as Route}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">
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
            <p className="text-muted-foreground mt-1">
              {booking.tour?.name} • {booking.schedule && formatDate(booking.schedule.startsAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {booking.status === "pending" && (
            <button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-sm font-medium text-info-foreground hover:bg-info/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </button>
              <button
                onClick={handleNoShow}
                disabled={noShowMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <CalendarClock className="h-4 w-4" />
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Issue Refund
            </button>
          )}
          <Link
            href={`/org/${slug}/bookings/${booking.id}/edit` as Route}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold text-foreground">
                {booking.schedule && formatDate(booking.schedule.startsAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-semibold text-foreground">
                {booking.schedule && formatTime(booking.schedule.startsAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="font-semibold text-foreground">{booking.totalParticipants}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-semibold text-foreground">${parseFloat(booking.total).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Customer</h2>
          {booking.customer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {booking.customer.firstName?.charAt(0) ?? ""}
                    {booking.customer.lastName?.charAt(0) ?? ""}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${booking.customer.email}`} className="hover:text-primary">
                  {booking.customer.email}
                </a>
              </div>
              {booking.customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${booking.customer.phone}`} className="hover:text-primary">
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Customer information not available</p>
          )}
        </div>

        {/* Payment Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Payment Details</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${parseFloat(booking.subtotal).toFixed(2)}</span>
            </div>
            {booking.discount && parseFloat(booking.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-success">
                  -${parseFloat(booking.discount).toFixed(2)}
                </span>
              </div>
            )}
            {booking.tax && parseFloat(booking.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">${parseFloat(booking.tax).toFixed(2)}</span>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">${parseFloat(booking.total).toFixed(2)}</span>
            </div>
            {balanceInfo && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-success">
                    ${parseFloat(balanceInfo.totalPaid).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span className="text-foreground">Balance Due</span>
                  <span className={parseFloat(balanceInfo.balance) > 0 ? "text-warning" : "text-success"}>
                    ${parseFloat(balanceInfo.balance).toFixed(2)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 pt-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <Badge variant={
                booking.paymentStatus === "paid" ? "success" :
                booking.paymentStatus === "partial" ? "warning" :
                booking.paymentStatus === "pending" ? "pending" : "muted"
              }>
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Breakdown */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Guest Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{booking.adultCount}</p>
            <p className="text-sm text-muted-foreground">Adults</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{booking.childCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Children</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{booking.infantCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Infants</p>
          </div>
        </div>
      </div>

      {/* Participants */}
      {booking.participants && booking.participants.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Participants ({booking.participants.length})
          </h2>
          <div className="divide-y divide-border">
            {booking.participants.map((participant) => (
              <div key={participant.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {participant.firstName} {participant.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                    {participant.email && ` • ${participant.email}`}
                  </p>
                </div>
                {(participant.dietaryRequirements || participant.accessibilityNeeds) && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-xs text-warning-foreground">Special requirements</span>
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
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Special Requests</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{booking.specialRequests}</p>
            </div>
          )}
          {booking.dietaryRequirements && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Dietary Requirements</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{booking.dietaryRequirements}</p>
            </div>
          )}
          {booking.accessibilityNeeds && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Accessibility Needs</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{booking.accessibilityNeeds}</p>
            </div>
          )}
          {booking.internalNotes && (
            <div className="bg-warning/5 rounded-lg border border-warning/20 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Internal Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{booking.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Booking Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Booking Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Source</p>
            <p className="font-medium text-foreground">
              {booking.source.charAt(0).toUpperCase() + booking.source.slice(1).replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium text-foreground">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(booking.createdAt))}
            </p>
          </div>
          {booking.confirmedAt && (
            <div>
              <p className="text-muted-foreground">Confirmed</p>
              <p className="font-medium text-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(booking.confirmedAt))}
              </p>
            </div>
          )}
          {booking.cancelledAt && (
            <div>
              <p className="text-muted-foreground">Cancelled</p>
              <p className="font-medium text-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(booking.cancelledAt))}
              </p>
            </div>
          )}
        </div>
        {booking.cancellationReason && (
          <div className="mt-4 p-3 bg-destructive/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Cancellation Reason</p>
            <p className="text-destructive">{booking.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Payment History & Management */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Payment Management</h2>
          <div className="flex items-center gap-2">
            {booking.status !== "cancelled" && balanceInfo && parseFloat(balanceInfo.balance) > 0 && (
              <>
                <button
                  onClick={handleCreatePaymentLink}
                  disabled={createPaymentLinkMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  Generate Link
                </button>
                <button
                  onClick={handleOpenPaymentModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </button>
              </>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        {balanceInfo && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-xl font-semibold text-foreground">
                ${parseFloat(balanceInfo.bookingTotal).toFixed(2)}
              </p>
            </div>
            <div className="text-center border-l border-r border-border">
              <p className="text-sm text-muted-foreground mb-1">Paid</p>
              <p className="text-xl font-semibold text-success">
                ${parseFloat(balanceInfo.totalPaid).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
              <p className={`text-xl font-semibold ${parseFloat(balanceInfo.balance) > 0 ? "text-warning" : "text-success"}`}>
                ${parseFloat(balanceInfo.balance).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Payment History */}
        {payments && payments.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment History</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Method</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Reference</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Recorded By</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(payment.recordedAt))}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        ${parseFloat(payment.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <Badge variant="outline">
                          {payment.method.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {payment.reference || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {payment.recordedByName || "System"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletePaymentMutation.isPending}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No payment records yet</p>
            {booking.status !== "cancelled" && (
              <p className="text-sm mt-1">Record manual payments or generate a payment link for the customer</p>
            )}
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

      {/* Refunds Section */}
      {refunds && refunds.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Refunds</h2>
          <div className="space-y-3">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    ${parseFloat(refund.amount).toFixed(2)} {refund.currency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {refund.reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} •{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(refund.createdAt))}
                  </p>
                  {refund.reasonDetails && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      {refund.reasonDetails}
                    </p>
                  )}
                  {refund.processedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Processed: {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(refund.processedAt))}
                    </p>
                  )}
                  {refund.stripeRefundId && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Stripe ID: {refund.stripeRefundId}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {refund.status === "pending" && (
                    <>
                      {booking.stripePaymentIntentId && (
                        <button
                          onClick={() => handleProcessRefund(refund.id, true)}
                          disabled={processRefundMutation.isPending}
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          Process via Stripe
                        </button>
                      )}
                      <button
                        onClick={() => handleProcessRefund(refund.id, false)}
                        disabled={processManualRefundMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                      >
                        Mark as Processed
                      </button>
                    </>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      refund.status === "succeeded"
                        ? "bg-success/10 text-success-foreground border-success/20"
                        : refund.status === "pending"
                        ? "bg-warning/10 text-warning-foreground border-warning/20"
                        : refund.status === "processing"
                        ? "bg-info/10 text-info-foreground border-info/20"
                        : refund.status === "failed"
                        ? "bg-destructive/10 text-destructive-foreground border-destructive/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Reschedule Booking</h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedScheduleId(null);
                }}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
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
                              ? "border-border hover:border-input"
                              : "border-border opacity-50 cursor-not-allowed"
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
                              <p className="font-medium text-foreground">
                                {new Intl.DateTimeFormat("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }).format(new Date(schedule.startsAt))}
                              </p>
                              <p className="text-sm text-muted-foreground">
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
                              hasCapacity ? "text-muted-foreground" : "text-destructive"
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
                <p className="text-center text-muted-foreground py-8">
                  No other available schedules for this tour
                </p>
              )}

              {rescheduleMutation.error && (
                <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{rescheduleMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedScheduleId(null);
                }}
                className="px-4 py-2 text-foreground hover:bg-accent rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedScheduleId || rescheduleMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Issue Refund</h2>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Refund Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="text"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max refund: ${parseFloat(booking.total).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) =>
                    setRefundReason(
                      e.target.value as "customer_request" | "booking_cancelled" | "other"
                    )
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="customer_request">Customer Request</option>
                  <option value="booking_cancelled">Booking Cancelled</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Additional details about this refund..."
                />
              </div>

              {createRefundMutation.error && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{createRefundMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-foreground hover:bg-accent rounded-lg"
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createRefundMutation.isPending ? "Processing..." : "Issue Refund"}
              </button>
            </div>
          </div>
        </div>
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
            <label className="text-sm font-medium text-foreground">Cancellation Reason (optional)</label>
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

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Record Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setPaymentReference("");
                  setPaymentNotes("");
                }}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Amount <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="0.00"
                  />
                </div>
                {balanceInfo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance due: ${parseFloat(balanceInfo.balance).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Payment Method <span className="text-destructive">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "bank_transfer" | "check" | "other")}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Transaction ID, check number, etc."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For tracking purposes (e.g., transaction ID, check number)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Additional details about this payment..."
                />
              </div>

              {createPaymentMutation.error && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{createPaymentMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setPaymentReference("");
                  setPaymentNotes("");
                }}
                className="px-4 py-2 text-foreground hover:bg-accent rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={
                  !paymentAmount ||
                  parseFloat(paymentAmount) <= 0 ||
                  createPaymentMutation.isPending
                }
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Payment Link Generated</h2>
              <button
                onClick={() => {
                  setShowPaymentLinkModal(false);
                  setPaymentLinkUrl("");
                }}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this payment link with the customer. They can use it to pay online via Stripe.
              </p>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
                <p className="text-sm text-foreground font-mono break-all">
                  {paymentLinkUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyPaymentLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
                <button
                  onClick={handleSendPaymentLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Email Customer
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => {
                  setShowPaymentLinkModal(false);
                  setPaymentLinkUrl("");
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.ConfirmModal}
    </div>
  );
}
