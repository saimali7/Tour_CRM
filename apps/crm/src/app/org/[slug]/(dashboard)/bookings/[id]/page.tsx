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
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MapPin,
  ExternalLink,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState, useMemo } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuickGuideAssignSheet } from "@/components/scheduling/quick-guide-assign-sheet";
import { BookingItemsSection } from "@/components/bookings/booking-items-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@tour/ui";
import { toast } from "sonner";
import { PageSpinner, ButtonSpinner } from "@/components/ui/spinner";

// Collapsible section component
function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h2>
          {count !== undefined && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {isOpen && (
        <div
          id={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
          className="px-4 pb-4 border-t border-border pt-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}

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
  const [showAssignGuideSheet, setShowAssignGuideSheet] = useState(false);
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
      toast.success("Booking rescheduled successfully");
    },
    onError: (error) => {
      toast.error(`Failed to reschedule: ${error.message}`);
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

  const cancelAssignmentMutation = trpc.guideAssignment.cancelAssignment.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForBooking.invalidate({ bookingId });
      utils.booking.getById.invalidate({ id: bookingId });
      toast.success("Guide assignment removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove assignment: ${error.message}`);
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

  // Query for guide assignments
  const { data: guideAssignments, isLoading: isLoadingAssignments } = trpc.guideAssignment.getAssignmentsForBooking.useQuery(
    { bookingId },
    { enabled: !!booking }
  );

  // Query for available guides (for assignment dialog)
  const { data: availableGuides } = trpc.guide.list.useQuery(
    { filters: { status: "active" } },
    { enabled: showAssignGuideSheet }
  );

  // Calculate urgency/time context
  const timeContext = useMemo(() => {
    if (!booking?.schedule?.startsAt) return null;
    const tourDate = new Date(booking.schedule.startsAt);
    const now = new Date();
    const diffMs = tourDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Tour completed", variant: "muted" as const };
    if (diffDays === 0) return { label: "Today", variant: "warning" as const };
    if (diffDays === 1) return { label: "Tomorrow", variant: "warning" as const };
    if (diffDays <= 3) return { label: `In ${diffDays} days`, variant: "info" as const };
    if (diffDays <= 7) return { label: `In ${diffDays} days`, variant: "default" as const };
    return null;
  }, [booking?.schedule?.startsAt]);

  // Determine action required - uses action types instead of function references to avoid TDZ issues
  const actionRequired = useMemo(() => {
    if (!booking || !balanceInfo) return null;

    const actions: Array<{ message: string; action: string; variant: "warning" | "info" | "destructive"; actionType: "confirm" | "payment" | "review" }> = [];

    // Pending confirmation
    if (booking.status === "pending") {
      actions.push({
        message: "Booking awaiting confirmation",
        action: "Confirm Now",
        variant: "warning",
        actionType: "confirm",
      });
    }

    // Balance due
    if (parseFloat(balanceInfo.balance) > 0 && booking.status !== "cancelled") {
      actions.push({
        message: `Balance due: $${parseFloat(balanceInfo.balance).toFixed(2)}`,
        action: "Collect Payment",
        variant: "warning",
        actionType: "payment",
      });
    }

    // Tour happening soon
    if (timeContext?.variant === "warning" && booking.status === "confirmed") {
      actions.push({
        message: `Tour is ${timeContext.label.toLowerCase()}`,
        action: "Review Details",
        variant: "info",
        actionType: "review",
      });
    }

    return actions.length > 0 ? actions : null;
  }, [booking, balanceInfo, timeContext]);

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

  const handleRemoveAssignment = async (assignmentId: string, guideName: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Remove Guide Assignment",
      description: `Are you sure you want to remove ${guideName} from this booking?`,
      confirmLabel: "Remove",
      variant: "destructive",
    });

    if (confirmed) {
      cancelAssignmentMutation.mutate({ id: assignmentId });
    }
  };

  if (isLoading) {
    return <PageSpinner />;
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

  const formatShortDate = (date: Date) => {
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

  // Determine primary action based on booking state
  const getPrimaryAction = () => {
    if (booking.status === "pending") {
      return {
        label: "Confirm Booking",
        icon: CheckCircle,
        onClick: handleConfirm,
        loading: confirmMutation.isPending,
        className: "bg-success text-success-foreground hover:bg-success/90",
      };
    }
    if (booking.status === "confirmed") {
      return {
        label: "Mark Complete",
        icon: CheckCircle,
        onClick: handleComplete,
        loading: completeMutation.isPending,
        className: "bg-info text-info-foreground hover:bg-info/90",
      };
    }
    if (booking.status === "cancelled" && booking.paymentStatus === "paid") {
      return {
        label: "Issue Refund",
        icon: RotateCcw,
        onClick: () => {
          setRefundAmount(booking.total);
          setShowRefundModal(true);
        },
        loading: false,
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-6">
      {/* Action Required Banner */}
      {actionRequired && actionRequired.length > 0 && (
        <div className="space-y-2">
          {actionRequired.map((action, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                action.variant === "warning"
                  ? "bg-warning/5 border-warning/20"
                  : action.variant === "destructive"
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-info/5 border-info/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`h-5 w-5 ${
                    action.variant === "warning"
                      ? "text-warning"
                      : action.variant === "destructive"
                      ? "text-destructive"
                      : "text-info"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-foreground">{action.message}</span>
              </div>
              {action.actionType !== "review" && (
                <button
                  onClick={() => {
                    if (action.actionType === "confirm") handleConfirm();
                    else if (action.actionType === "payment") handleOpenPaymentModal();
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    action.variant === "warning"
                      ? "bg-warning text-warning-foreground hover:bg-warning/90"
                      : action.variant === "destructive"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-info text-info-foreground hover:bg-info/90"
                  }`}
                >
                  {action.action}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors mt-1"
            aria-label="Go back to bookings list"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
          <div className="space-y-1">
            {/* Tour Name - Primary */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {booking.tour?.name || "Tour"}
              </h1>
              {timeContext && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    timeContext.variant === "warning"
                      ? "bg-warning/10 text-warning border border-warning/20"
                      : timeContext.variant === "info"
                      ? "bg-info/10 text-info border border-info/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {timeContext.label}
                </span>
              )}
            </div>

            {/* Schedule Info */}
            {booking.schedule && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {formatShortDate(booking.schedule.startsAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {formatTime(booking.schedule.startsAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {booking.totalParticipants} guest{booking.totalParticipants !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Reference & Status */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-mono text-muted-foreground">
                {booking.referenceNumber}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status === "no_show"
                  ? "No Show"
                  : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentColor(
                  booking.paymentStatus
                )}`}
              >
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Clear Hierarchy */}
        <div className="flex items-center gap-2 ml-12 md:ml-0">
          {/* Primary Action */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${primaryAction.className}`}
            >
              {primaryAction.loading ? (
                <ButtonSpinner />
              ) : (
                <primaryAction.icon className="h-4 w-4" aria-hidden="true" />
              )}
              {primaryAction.label}
            </button>
          )}

          {/* Edit Button */}
          <Link
            href={`/org/${slug}/bookings/${booking.id}/edit` as Route}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors"
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Edit</span>
          </Link>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {booking.status === "confirmed" && (
                <>
                  <DropdownMenuItem onClick={handleNoShow}>
                    <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Mark No Show
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {(booking.status === "pending" || booking.status === "confirmed") && (
                <>
                  <DropdownMenuItem onClick={() => setShowRescheduleModal(true)}>
                    <CalendarClock className="h-4 w-4 mr-2" aria-hidden="true" />
                    Reschedule
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleCancel}
                    variant="destructive"
                  >
                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                    Cancel Booking
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Card - Always Visible */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Customer
            </h2>
            {booking.customer ? (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold text-lg">
                      {booking.customer.firstName?.charAt(0) ?? ""}
                      {booking.customer.lastName?.charAt(0) ?? ""}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-lg">
                      {booking.customer.firstName} {booking.customer.lastName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <a
                        href={`mailto:${booking.customer.email}`}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {booking.customer.email}
                      </a>
                      {booking.customer.phone && (
                        <a
                          href={`tel:${booking.customer.phone}`}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {booking.customer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/org/${slug}/customers/${booking.customer.id}` as Route}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Profile
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground">Customer information not available</p>
            )}
          </div>

          {/* Guest Breakdown - Collapsible */}
          <CollapsibleSection
            title="Guests"
            count={booking.totalParticipants}
            defaultOpen={false}
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground tabular-nums">{booking.adultCount}</p>
                <p className="text-xs text-muted-foreground">Adults</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground tabular-nums">{booking.childCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Children</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground tabular-nums">{booking.infantCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Infants</p>
              </div>
            </div>

            {/* Participants List */}
            {booking.participants && booking.participants.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Participant Details
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {booking.participants.map((participant) => (
                    <div key={participant.id} className="p-3 flex items-center justify-between bg-card">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {participant.firstName} {participant.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                          {participant.email && ` • ${participant.email}`}
                        </p>
                      </div>
                      {(participant.dietaryRequirements || participant.accessibilityNeeds) && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-warning/10 rounded">
                          <AlertCircle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                          <span className="text-xs text-warning-foreground">Special needs</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Services & Add-ons */}
          <BookingItemsSection bookingId={bookingId} isAdmin={true} />

          {/* Guide Assignment - Collapsible */}
          <CollapsibleSection
            title="Guide Assignment"
            count={guideAssignments?.length || 0}
            defaultOpen={true}
          >
            <div className="space-y-4">
              {/* Assigned Guides */}
              {guideAssignments && guideAssignments.length > 0 ? (
                <div className="space-y-2">
                  {guideAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-medium text-sm">
                            {assignment.guide?.firstName?.charAt(0) ?? ""}
                            {assignment.guide?.lastName?.charAt(0) ?? ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {assignment.guide?.firstName} {assignment.guide?.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {assignment.guide?.email && (
                              <span>{assignment.guide.email}</span>
                            )}
                            {assignment.status && (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  assignment.status === "confirmed"
                                    ? "bg-success/10 text-success-foreground"
                                    : assignment.status === "pending"
                                    ? "bg-warning/10 text-warning-foreground"
                                    : "bg-destructive/10 text-destructive-foreground"
                                }`}
                              >
                                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {booking.status !== "completed" && booking.status !== "cancelled" && (
                        <button
                          onClick={() => handleRemoveAssignment(
                            assignment.id,
                            `${assignment.guide?.firstName} ${assignment.guide?.lastName}`
                          )}
                          disabled={cancelAssignmentMutation.isPending}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          aria-label={`Remove ${assignment.guide?.firstName} ${assignment.guide?.lastName}`}
                        >
                          <UserX className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">No guide assigned to this booking</p>
                </div>
              )}

              {/* Assign Guide Button */}
              {booking.status !== "completed" && booking.status !== "cancelled" && (
                <button
                  onClick={() => setShowAssignGuideSheet(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Assign Guide
                </button>
              )}
            </div>
          </CollapsibleSection>

          {/* Special Requests - Only if present */}
          {(booking.specialRequests ||
            booking.dietaryRequirements ||
            booking.accessibilityNeeds ||
            booking.internalNotes) && (
            <CollapsibleSection title="Notes & Requirements" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.specialRequests && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Special Requests
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{booking.specialRequests}</p>
                  </div>
                )}
                {booking.dietaryRequirements && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Dietary Requirements
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{booking.dietaryRequirements}</p>
                  </div>
                )}
                {booking.accessibilityNeeds && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Accessibility Needs
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{booking.accessibilityNeeds}</p>
                  </div>
                )}
                {booking.internalNotes && (
                  <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                    <p className="text-xs font-medium text-warning uppercase tracking-wide mb-1">
                      Internal Notes
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{booking.internalNotes}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Activity History - Collapsible */}
          <CollapsibleSection title="Activity" defaultOpen={false}>
            <ActivityLogCard
              entityType="booking"
              entityId={bookingId}
              limit={10}
              showTitle={false}
            />
          </CollapsibleSection>
        </div>

        {/* Right Column - Payment & Meta */}
        <div className="space-y-6">
          {/* Payment Card - Consolidated, Prominent */}
          <div
            className={`rounded-lg border p-5 ${
              balanceInfo && parseFloat(balanceInfo.balance) > 0
                ? "bg-warning/5 border-warning/30"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Payment
              </h2>
              <Badge
                variant={
                  booking.paymentStatus === "paid"
                    ? "success"
                    : booking.paymentStatus === "partial"
                    ? "warning"
                    : booking.paymentStatus === "pending"
                    ? "pending"
                    : "muted"
                }
              >
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </Badge>
            </div>

            {/* Balance - Most Prominent */}
            {balanceInfo && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    parseFloat(balanceInfo.balance) > 0 ? "text-warning" : "text-success"
                  }`}
                >
                  ${parseFloat(balanceInfo.balance).toFixed(2)}
                </p>
              </div>
            )}

            {/* Payment Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono tabular-nums">${parseFloat(booking.subtotal).toFixed(2)}</span>
              </div>
              {booking.discount && parseFloat(booking.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono tabular-nums text-success">
                    -${parseFloat(booking.discount).toFixed(2)}
                  </span>
                </div>
              )}
              {booking.tax && parseFloat(booking.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono tabular-nums">${parseFloat(booking.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t border-border">
                <span>Total</span>
                <span className="font-mono tabular-nums">${parseFloat(booking.total).toFixed(2)}</span>
              </div>
              {balanceInfo && (
                <div className="flex justify-between text-success">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono tabular-nums">${parseFloat(balanceInfo.totalPaid).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment Actions */}
            {booking.status !== "cancelled" && balanceInfo && parseFloat(balanceInfo.balance) > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={handleOpenPaymentModal}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Record Payment
                </button>
                <button
                  onClick={handleCreatePaymentLink}
                  disabled={createPaymentLinkMutation.isPending}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  aria-label="Generate payment link"
                >
                  {createPaymentLinkMutation.isPending ? (
                    <ButtonSpinner />
                  ) : (
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}

            {/* Payment History - Compact */}
            {payments && payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Payment History
                </p>
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <div>
                        <p className="font-medium font-mono tabular-nums">
                          ${parseFloat(payment.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.method.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} •{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(payment.recordedAt))}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        disabled={deletePaymentMutation.isPending}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete payment"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Meta - Compact */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Booking Info
            </h2>
            <dl className="space-y-2 text-sm">
              {/* Booking Option */}
              {booking.pricingSnapshot && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Option</dt>
                  <dd className="font-medium">
                    {(booking.pricingSnapshot as { optionName?: string })?.optionName || "Standard Experience"}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium">
                  {booking.source.charAt(0).toUpperCase() + booking.source.slice(1).replace("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(booking.createdAt))}
                </dd>
              </div>
              {booking.confirmedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Confirmed</dt>
                  <dd className="font-medium">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(booking.confirmedAt))}
                  </dd>
                </div>
              )}
              {booking.cancelledAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cancelled</dt>
                  <dd className="font-medium text-destructive">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(booking.cancelledAt))}
                  </dd>
                </div>
              )}
            </dl>
            {booking.cancellationReason && (
              <div className="mt-3 p-2 bg-destructive/5 rounded text-sm">
                <p className="text-xs text-muted-foreground">Cancellation Reason</p>
                <p className="text-destructive">{booking.cancellationReason}</p>
              </div>
            )}
          </div>

          {/* Refunds - Only if present */}
          {refunds && refunds.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-5">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Refunds
              </h2>
              <div className="space-y-3">
                {refunds.map((refund) => (
                  <div key={refund.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold font-mono tabular-nums">
                        ${parseFloat(refund.amount).toFixed(2)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          refund.status === "succeeded"
                            ? "bg-success/10 text-success-foreground border-success/20"
                            : refund.status === "pending"
                            ? "bg-warning/10 text-warning-foreground border-warning/20"
                            : refund.status === "processing"
                            ? "bg-info/10 text-info-foreground border-info/20"
                            : "bg-destructive/10 text-destructive-foreground border-destructive/20"
                        }`}
                      >
                        {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {refund.reason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    {refund.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        {booking.stripePaymentIntentId && (
                          <button
                            onClick={() => handleProcessRefund(refund.id, true)}
                            disabled={processRefundMutation.isPending}
                            className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Via Stripe
                          </button>
                        )}
                        <button
                          onClick={() => handleProcessRefund(refund.id, false)}
                          disabled={processManualRefundMutation.isPending}
                          className="flex-1 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors disabled:opacity-50"
                        >
                          Mark Processed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      <Dialog
        open={showRescheduleModal}
        onOpenChange={(open) => {
          setShowRescheduleModal(open);
          if (!open) setSelectedScheduleId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Currently scheduled for{" "}
              <strong>
                {booking.schedule && formatDate(booking.schedule.startsAt)} at{" "}
                {booking.schedule && formatTime(booking.schedule.startsAt)}
              </strong>
              . Select a new date and time below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {rescheduleMutation.error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{rescheduleMutation.error.message}</p>
              </div>
            )}

            {availableSchedules?.data && availableSchedules.data.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto" role="radiogroup" aria-label="Available schedules">
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
                            aria-label={`${new Intl.DateTimeFormat("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }).format(new Date(schedule.startsAt))} at ${formatTime(schedule.startsAt)} - ${available} spots left`}
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
                              {formatTime(schedule.startsAt)}
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
          </div>

          <DialogFooter>
            <button
              onClick={() => {
                setShowRescheduleModal(false);
                setSelectedScheduleId(null);
              }}
              className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={!selectedScheduleId || rescheduleMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center"
            >
              {rescheduleMutation.isPending && <ButtonSpinner />}
              {rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Process a refund for this booking. The customer will be notified once processed.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {createRefundMutation.error && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{createRefundMutation.error.message}</p>
              </div>
            )}

            <div>
              <label htmlFor="refund-amount" className="block text-sm font-medium text-foreground mb-1">
                Refund Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  id="refund-amount"
                  type="text"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="0.00"
                  aria-describedby="refund-amount-help"
                />
              </div>
              <p id="refund-amount-help" className="text-xs text-muted-foreground mt-1">
                Max refund: ${parseFloat(booking.total).toFixed(2)}
              </p>
            </div>

            <div>
              <label htmlFor="refund-reason" className="block text-sm font-medium text-foreground mb-1">
                Reason
              </label>
              <select
                id="refund-reason"
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
              <label htmlFor="refund-notes" className="block text-sm font-medium text-foreground mb-1">
                Notes (optional)
              </label>
              <textarea
                id="refund-notes"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Additional details about this refund..."
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowRefundModal(false)}
              className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
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
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center"
            >
              {createRefundMutation.isPending && <ButtonSpinner />}
              {createRefundMutation.isPending ? "Processing..." : "Issue Refund"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <label htmlFor="cancel-reason" className="text-sm font-medium text-foreground">
              Cancellation Reason (optional)
            </label>
            <textarea
              id="cancel-reason"
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

      {/* Record Payment Sidebar */}
      <Sheet
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open);
          if (!open) {
            setPaymentAmount("");
            setPaymentReference("");
            setPaymentNotes("");
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          {/* Header */}
          <div className="bg-muted/50 border-b border-border px-6 py-5">
            <SheetHeader className="space-y-1">
              <SheetTitle className="text-lg font-semibold">Record Payment</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {booking?.tour?.name} • {booking?.customer?.firstName} {booking?.customer?.lastName}
              </SheetDescription>
            </SheetHeader>

            {/* Balance Display */}
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance Due</p>
                <p className={`text-3xl font-bold tabular-nums ${
                  balanceInfo && parseFloat(balanceInfo.balance) > 0 ? "text-warning" : "text-success"
                }`}>
                  ${balanceInfo ? parseFloat(balanceInfo.balance).toFixed(2) : "0.00"}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Total: ${parseFloat(booking.total).toFixed(2)}</p>
                {balanceInfo && (
                  <p>Paid: ${parseFloat(balanceInfo.totalPaid).toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {createPaymentMutation.error && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{createPaymentMutation.error.message}</p>
              </div>
            )}

            {/* Quick Amount Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Amount
              </label>
              <div className="flex gap-2 mb-3">
                {balanceInfo && parseFloat(balanceInfo.balance) > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(balanceInfo.balance)}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                        paymentAmount === balanceInfo.balance
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      Full
                      <span className="block text-xs opacity-70">${parseFloat(balanceInfo.balance).toFixed(2)}</span>
                    </button>
                    {parseFloat(balanceInfo.balance) > 20 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount((parseFloat(balanceInfo.balance) / 2).toFixed(2))}
                        className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                          paymentAmount === (parseFloat(balanceInfo.balance) / 2).toFixed(2)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        50%
                        <span className="block text-xs opacity-70">${(parseFloat(balanceInfo.balance) / 2).toFixed(2)}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentAmount("")}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                        paymentAmount !== balanceInfo.balance && paymentAmount !== (parseFloat(balanceInfo.balance) / 2).toFixed(2)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      Custom
                      <span className="block text-xs opacity-70">Enter amount</span>
                    </button>
                  </>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  $
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-input rounded-lg bg-background text-foreground text-xl font-semibold tabular-nums focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="0.00"
                  aria-label="Payment amount"
                />
              </div>
            </div>

            {/* Payment Method Pills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "bank_transfer", "check", "other"] as const).map((method) => {
                  const labels: Record<typeof method, string> = {
                    cash: "Cash",
                    card: "Card",
                    bank_transfer: "Transfer",
                    check: "Check",
                    other: "Other",
                  };
                  const icons: Record<typeof method, React.ReactNode> = {
                    cash: <DollarSign className="h-4 w-4" />,
                    card: <CreditCard className="h-4 w-4" />,
                    bank_transfer: <RotateCcw className="h-4 w-4" />,
                    check: <Edit className="h-4 w-4" />,
                    other: <MoreHorizontal className="h-4 w-4" />,
                  };
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1 px-3 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        paymentMethod === method
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                      aria-pressed={paymentMethod === method}
                    >
                      {icons[method]}
                      <span className="text-xs">{labels[method]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Field */}
            <div>
              <label htmlFor="payment-reference" className="block text-sm font-medium text-foreground mb-1">
                Reference <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="payment-reference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Transaction ID, check #, receipt..."
                aria-label="Payment reference"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="payment-notes" className="block text-sm font-medium text-foreground mb-1">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                placeholder="Additional details about this payment..."
              />
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="border-t border-border bg-card px-6 py-4 mt-auto">
            {/* Summary */}
            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recording</span>
                  <span className="font-semibold text-foreground">
                    ${parseFloat(paymentAmount).toFixed(2)} via {paymentMethod === "bank_transfer" ? "Transfer" : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
                  </span>
                </div>
                {balanceInfo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance after</span>
                    <span className={`font-semibold ${
                      parseFloat(balanceInfo.balance) - parseFloat(paymentAmount) <= 0
                        ? "text-emerald-600"
                        : "text-foreground"
                    }`}>
                      ${Math.max(0, parseFloat(balanceInfo.balance) - parseFloat(paymentAmount)).toFixed(2)}
                      {parseFloat(balanceInfo.balance) - parseFloat(paymentAmount) <= 0 && (
                        <span className="ml-1 text-xs">✓ Paid in full</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleRecordPayment}
              disabled={
                !paymentAmount ||
                parseFloat(paymentAmount) <= 0 ||
                createPaymentMutation.isPending
              }
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center font-medium transition-colors text-base"
            >
              {createPaymentMutation.isPending && <ButtonSpinner />}
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘</kbd>
              <span className="mx-0.5">+</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
              <span className="ml-1">to submit</span>
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Link Modal */}
      <Dialog
        open={showPaymentLinkModal}
        onOpenChange={(open) => {
          setShowPaymentLinkModal(open);
          if (!open) setPaymentLinkUrl("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Link Generated</DialogTitle>
            <DialogDescription>
              Share this payment link with the customer. They can use it to pay online via Stripe.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
              <p className="text-sm text-foreground font-mono break-all" aria-label="Payment link URL">
                {paymentLinkUrl}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyPaymentLink}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors"
                aria-label="Copy payment link to clipboard"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy Link
              </button>
              <button
                onClick={handleSendPaymentLink}
                disabled={sendPaymentLinkEmailMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                aria-label="Send payment link via email"
              >
                {sendPaymentLinkEmailMutation.isPending ? (
                  <ButtonSpinner />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                Email Customer
              </button>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => {
                setShowPaymentLinkModal(false);
                setPaymentLinkUrl("");
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Modal */}
      {confirmModal.ConfirmModal}

      {/* Assign Guide Sheet */}
      <QuickGuideAssignSheet
        open={showAssignGuideSheet}
        onOpenChange={setShowAssignGuideSheet}
        bookingId={bookingId}
        scheduleInfo={booking.schedule ? {
          id: booking.schedule.id,
          tourName: booking.tour?.name || "Tour",
          date: formatShortDate(booking.schedule.startsAt),
          time: formatTime(booking.schedule.startsAt),
        } : undefined}
        availableGuides={availableGuides?.data
          ?.filter((guide) => !guideAssignments?.some((a) => a.guideId === guide.id))
          .map((guide) => ({
            id: guide.id,
            firstName: guide.firstName,
            lastName: guide.lastName,
            email: guide.email,
            phone: guide.phone,
            status: guide.status as "active" | "inactive" | "pending",
          })) || []
        }
        onSuccess={() => {
          utils.guideAssignment.invalidate();
          utils.booking.invalidate();
        }}
      />
    </div>
  );
}
