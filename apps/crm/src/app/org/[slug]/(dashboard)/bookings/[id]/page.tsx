"use client";

import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  X,
  RotateCcw,
  Copy,
  Send,
  MoreHorizontal,
  UserMinus,
  DollarSign,
  CreditCard,
  Edit,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
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
import { Button, Badge } from "@tour/ui";
import { toast } from "sonner";
import { PageSpinner, ButtonSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// New booking detail components
import {
  BookingHeader,
  OperationsAlertBar,
  StatusCards,
  FloatingActionBar,
  GuestsSection,
  GuideSection,
  PaymentsSection,
  ActivitySection,
  ActionItemsCard,
  type UrgencyLevel,
  type PrimaryAction,
  type BookingData,
  type BalanceInfo,
  type BookingGuideAssignment,
} from "@/components/bookings/booking-detail";

// ============================================================================
// BOOKING DETAIL PAGE
// ============================================================================
// An action-first, operator-optimized booking detail view.
//
// Design Principles:
// 1. Customer name is PRIMARY (operators need to know WHO immediately)
// 2. Balance due and booking status are the most critical metrics
// 3. Special requirements are IMPOSSIBLE to overlook
// 4. Common actions are 1 click away
// 5. Mobile-first for guides checking on phones
// ============================================================================

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const bookingId = params.id as string;
  const headerRef = useRef<HTMLElement>(null);

  // Modal/Sheet states
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showAssignGuideSheet, setShowAssignGuideSheet] = useState(false);

  // Form states
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

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery({ id: bookingId });
  const utils = trpc.useUtils();

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
  const { data: guideAssignments } = trpc.guideAssignment.getAssignmentsForBooking.useQuery(
    { bookingId },
    { enabled: !!booking }
  );

  // Query for available guides
  const { data: availableGuides } = trpc.guide.list.useQuery(
    { filters: { status: "active" } },
    { enabled: showAssignGuideSheet }
  );

  // Query for activity log
  const { data: activityLogData, isLoading: isActivityLoading } = trpc.activityLog.getForEntity.useQuery(
    { entityType: "booking", entityId: bookingId, pagination: { page: 1, limit: 10 } },
    { enabled: !!booking }
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking confirmed successfully");
    },
    onError: (error) => toast.error(`Failed to confirm booking: ${error.message}`),
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => toast.error(`Failed to cancel booking: ${error.message}`),
  });

  const completeMutation = trpc.booking.complete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking marked as completed");
    },
    onError: (error) => toast.error(`Failed to complete booking: ${error.message}`),
  });

  const noShowMutation = trpc.booking.markNoShow.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.booking.list.invalidate();
      toast.success("Booking marked as no-show");
    },
    onError: (error) => toast.error(`Failed to mark as no-show: ${error.message}`),
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
    onError: (error) => toast.error(`Failed to create refund: ${error.message}`),
  });

  const processRefundMutation = trpc.refund.process.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.refund.getForBooking.invalidate({ bookingId });
      toast.success("Refund processed via Stripe successfully");
    },
    onError: (error) => toast.error(`Failed to process refund: ${error.message}`),
  });

  const processManualRefundMutation = trpc.refund.processManual.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.refund.getForBooking.invalidate({ bookingId });
      toast.success("Refund marked as processed");
    },
    onError: (error) => toast.error(`Failed to process refund: ${error.message}`),
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
    onError: (error) => toast.error(`Failed to record payment: ${error.message}`),
  });

  const deletePaymentMutation = trpc.payment.delete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ id: bookingId });
      utils.payment.listByBooking.invalidate({ bookingId });
      utils.payment.getBookingBalance.invalidate({ bookingId });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete payment: ${error.message}`),
  });

  const createPaymentLinkMutation = trpc.booking.createPaymentLink.useMutation({
    onSuccess: (data) => {
      setPaymentLinkUrl(data.url || "");
      setShowPaymentLinkModal(true);
      toast.success("Payment link created successfully");
    },
    onError: (error) => toast.error(`Failed to create payment link: ${error.message}`),
  });

  const sendPaymentLinkEmailMutation = trpc.booking.sendPaymentLinkEmail.useMutation({
    onSuccess: () => {
      setShowPaymentLinkModal(false);
      toast.success(`Payment link sent to ${booking?.customer?.email}`);
    },
    onError: (error) => toast.error(`Failed to send payment link: ${error.message}`),
  });

  const cancelAssignmentMutation = trpc.guideAssignment.cancelAssignment.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForBooking.invalidate({ bookingId });
      utils.booking.getById.invalidate({ id: bookingId });
      toast.success("Guide assignment removed");
    },
    onError: (error) => toast.error(`Failed to remove assignment: ${error.message}`),
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Calculate urgency/time context
  const urgency: UrgencyLevel | null = useMemo(() => {
    if (!booking?.bookingDate) return null;
    const tourDate = new Date(booking.bookingDate);
    const now = new Date();
    const diffMs = tourDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { type: "past", label: "Completed", daysUntil: diffDays };
    if (diffDays === 0) return { type: "today", label: "Today", daysUntil: 0 };
    if (diffDays === 1) return { type: "tomorrow", label: "Tomorrow", daysUntil: 1 };
    if (diffDays <= 3) return { type: "soon", label: `In ${diffDays} days`, daysUntil: diffDays };
    return { type: "normal", label: `In ${diffDays} days`, daysUntil: diffDays };
  }, [booking?.bookingDate]);

  // Primary action based on booking state
  const primaryAction: PrimaryAction | null = useMemo(() => {
    if (!booking) return null;

    if (booking.status === "pending") {
      return {
        label: "Confirm Booking",
        icon: CheckCircle,
        onClick: () => handleConfirm(),
        loading: confirmMutation.isPending,
        variant: "confirm",
      };
    }
    if (booking.status === "confirmed") {
      return {
        label: "Mark Complete",
        icon: CheckCircle,
        onClick: () => handleComplete(),
        loading: completeMutation.isPending,
        variant: "complete",
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
        variant: "refund",
      };
    }
    return null;
  }, [booking, confirmMutation.isPending, completeMutation.isPending]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConfirm = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Confirm Booking",
      description: "This will send a confirmation email to the customer and update the booking status.",
      confirmLabel: "Confirm Booking",
      variant: "default",
    });
    if (confirmed) confirmMutation.mutate({ id: bookingId });
  };

  const handleComplete = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Mark as Completed",
      description: "This will mark the booking as completed. The tour has been successfully delivered.",
      confirmLabel: "Mark Completed",
      variant: "default",
    });
    if (confirmed) completeMutation.mutate({ id: bookingId });
  };

  const handleNoShow = async () => {
    const confirmed = await confirmModal.confirm({
      title: "Mark as No-Show",
      description: "This will mark the booking as no-show. The customer did not attend the tour.",
      confirmLabel: "Mark No-Show",
      variant: "destructive",
    });
    if (confirmed) noShowMutation.mutate({ id: bookingId });
  };

  const handleCancel = () => setShowCancelDialog(true);

  const handleCancelSubmit = () => {
    cancelMutation.mutate({ id: bookingId, reason: cancelReason || undefined });
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const handleOpenPaymentModal = useCallback(() => {
    if (balanceInfo) setPaymentAmount(balanceInfo.balance);
    setShowPaymentModal(true);
  }, [balanceInfo]);

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
    if (confirmed) deletePaymentMutation.mutate({ id: paymentId });
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
      if (viaStripe) processRefundMutation.mutate({ id: refundId });
      else processManualRefundMutation.mutate({ id: refundId });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, guideName: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Remove Guide Assignment",
      description: `Are you sure you want to remove ${guideName} from this booking?`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (confirmed) cancelAssignmentMutation.mutate({ id: assignmentId });
  };

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // P - Open payment modal (if balance due)
      if (e.key === "p" && balanceInfo && parseFloat(balanceInfo.balance) > 0) {
        e.preventDefault();
        handleOpenPaymentModal();
      }

      // E - Edit booking
      if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push(`/org/${slug}/bookings/${bookingId}/edit` as Route);
      }

      // Escape - Go back
      if (e.key === "Escape" && !showPaymentModal && !showRefundModal && !showCancelDialog) {
        router.back();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [balanceInfo, handleOpenPaymentModal, router, slug, bookingId, showPaymentModal, showRefundModal, showCancelDialog]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) return <PageSpinner />;

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

  // Format helpers
  const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date(date));

  const formatShortDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric",
  }).format(new Date(date));

  const formatTime = (date: Date) => new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(date));

  // Cast booking to our type (the actual data matches)
  const bookingData = booking as unknown as BookingData;
  const balanceData: BalanceInfo | null = balanceInfo ? {
    total: booking.total,
    totalPaid: balanceInfo.totalPaid,
    balance: balanceInfo.balance,
  } : null;

  return (
    <div className="space-y-3 pb-24">
      {/* Operations Alert - CRITICAL INFO AT TOP */}
      <OperationsAlertBar booking={bookingData} />

      {/* Header - Customer First */}
      <BookingHeader
        ref={headerRef}
        booking={bookingData}
        orgSlug={slug}
        urgency={urgency}
        primaryAction={primaryAction}
        onBack={() => router.back()}
      />

      {/* Status Bar + Action Items - Single Row */}
      <div className="space-y-2">
        <StatusCards
          bookingStatus={booking.status}
          paymentStatus={booking.paymentStatus}
          balanceInfo={balanceData}
          onCollectPayment={handleOpenPaymentModal}
          isPaymentLoading={createPaymentMutation.isPending}
        />
        <ActionItemsCard
          bookingStatus={booking.status}
          balanceInfo={balanceData}
          guideAssignments={guideAssignments as BookingGuideAssignment[] | null | undefined}
          onConfirm={handleConfirm}
          onCollectPayment={handleOpenPaymentModal}
          onAssignGuide={() => setShowAssignGuideSheet(true)}
          isConfirmLoading={confirmMutation.isPending}
        />
      </div>

      {/* Zone 4: Main Content Grid with Collapsible Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column - Operations Info (Collapsible Sections) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Guests Section - Shows participant details with dietary/accessibility needs */}
          <GuestsSection
            booking={bookingData}
            participants={booking.participants as BookingData["participants"]}
          />

          {/* Guide Section - Shows assigned guides or CTA to assign */}
          <GuideSection
            guideAssignments={guideAssignments as BookingGuideAssignment[] | null | undefined}
            bookingStatus={booking.status}
            onAssignGuide={() => setShowAssignGuideSheet(true)}
            onRemoveAssignment={handleRemoveAssignment}
          />

          {/* Notes & Requirements - Keep as static card since it's critical info */}
          {(booking.specialRequests || booking.internalNotes) && (
            <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Notes
              </h3>
              {booking.specialRequests && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Customer Request
                  </p>
                  <p className="text-sm text-foreground">{booking.specialRequests}</p>
                </div>
              )}
              {booking.internalNotes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                    Internal Note
                  </p>
                  <p className="text-sm text-foreground">{booking.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Section - Shows activity timeline */}
          <ActivitySection
            activities={activityLogData?.data?.map((log) => ({
              id: log.id,
              action: log.action,
              description: log.description,
              createdAt: log.createdAt,
              actorName: log.actorName,
              actorType: log.actorType,
            })) || null}
            isLoading={isActivityLoading}
          />
        </div>

        {/* Right Column - Financial & Meta */}
        <div className="space-y-3">
          {/* Payments Section - Shows balance and payment history */}
          <PaymentsSection
            balanceInfo={balanceData}
            payments={payments?.map((p) => ({
              id: p.id,
              amount: p.amount,
              method: p.method,
              recordedAt: p.recordedAt,
              reference: p.reference,
            })) || null}
            onRecordPayment={handleOpenPaymentModal}
            onDeletePayment={handleDeletePayment}
          />

          {/* Booking Meta */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Booking Info
            </h3>
            <dl className="space-y-2 text-sm">
              {booking.pricingSnapshot && (booking.pricingSnapshot as { optionName?: string })?.optionName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Option</dt>
                  <dd className="font-medium">{(booking.pricingSnapshot as { optionName?: string })?.optionName}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium capitalize">{booking.source.replace("_", " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(booking.createdAt))}
                </dd>
              </div>
              {booking.confirmedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Confirmed</dt>
                  <dd className="font-medium text-emerald-600">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(booking.confirmedAt))}
                  </dd>
                </div>
              )}
              {booking.cancelledAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cancelled</dt>
                  <dd className="font-medium text-destructive">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(booking.cancelledAt))}
                  </dd>
                </div>
              )}
            </dl>
            {booking.cancellationReason && (
              <div className="mt-3 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cancellation Reason</p>
                <p className="text-sm text-destructive">{booking.cancellationReason}</p>
              </div>
            )}
          </div>

          {/* Refunds */}
          {refunds && refunds.length > 0 && (
            <div className="rounded-xl border bg-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                Refunds
              </h3>
              <div className="space-y-3">
                {refunds.map((refund) => (
                  <div key={refund.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold font-mono tabular-nums">
                        ${parseFloat(refund.amount).toFixed(2)}
                      </span>
                      <Badge
                        variant={
                          refund.status === "succeeded" ? "success" :
                          refund.status === "pending" ? "warning" :
                          refund.status === "processing" ? "info" : "destructive"
                        }
                      >
                        {refund.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {refund.reason.replace(/_/g, " ")}
                    </p>
                    {refund.status === "pending" && (
                      <div className="flex gap-2">
                        {booking.stripePaymentIntentId && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessRefund(refund.id, true)}
                            disabled={processRefundMutation.isPending}
                            className="flex-1 text-xs"
                          >
                            Via Stripe
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessRefund(refund.id, false)}
                          disabled={processManualRefundMutation.isPending}
                          className="flex-1 text-xs"
                        >
                          Mark Processed
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {(booking.status === "pending" || booking.status === "confirmed") && (
                <>
                  {booking.status === "confirmed" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleNoShow}
                    >
                      <UserMinus className="h-4 w-4" />
                      Mark No-Show
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4" />
                    Cancel Booking
                  </Button>
                </>
              )}
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Shortcuts:</span>{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">P</kbd> Payment{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">E</kbd> Edit{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> Back
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        customerName={`${booking.customer?.firstName} ${booking.customer?.lastName}`}
        balanceInfo={balanceData}
        primaryAction={primaryAction}
        onCollectPayment={handleOpenPaymentModal}
        headerRef={headerRef as React.RefObject<HTMLElement>}
      />

      {/* ================================================================== */}
      {/* MODALS & SHEETS */}
      {/* ================================================================== */}

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>Process a refund for this booking.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Refund Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="text"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Max: ${parseFloat(booking.total).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value as typeof refundReason)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="customer_request">Customer Request</option>
                <option value="booking_cancelled">Booking Cancelled</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateRefund}
              disabled={!refundAmount || parseFloat(refundAmount) <= 0 || createRefundMutation.isPending}
            >
              {createRefundMutation.isPending && <ButtonSpinner />}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Cancellation Reason (optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full mt-2 p-3 border rounded-lg"
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancelSubmit} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Sheet */}
      <Sheet open={showPaymentModal} onOpenChange={(open) => {
        setShowPaymentModal(open);
        if (!open) { setPaymentAmount(""); setPaymentReference(""); setPaymentNotes(""); }
      }}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <div className="bg-muted/50 border-b px-6 py-5">
            <SheetHeader>
              <SheetTitle>Record Payment</SheetTitle>
              <SheetDescription>
                {booking?.tour?.name} • {booking?.customer?.firstName} {booking?.customer?.lastName}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance Due</p>
                <p className={cn(
                  "text-3xl font-bold tabular-nums",
                  balanceInfo && parseFloat(balanceInfo.balance) > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  ${balanceInfo ? parseFloat(balanceInfo.balance).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <div className="flex gap-2 mb-3">
                {balanceInfo && parseFloat(balanceInfo.balance) > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(balanceInfo.balance)}
                      className={cn(
                        "flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all",
                        paymentAmount === balanceInfo.balance
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      Full<br /><span className="text-xs opacity-70">${parseFloat(balanceInfo.balance).toFixed(2)}</span>
                    </button>
                    {parseFloat(balanceInfo.balance) > 20 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount((parseFloat(balanceInfo.balance) / 2).toFixed(2))}
                        className={cn(
                          "flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all",
                          paymentAmount === (parseFloat(balanceInfo.balance) / 2).toFixed(2)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        50%<br /><span className="text-xs opacity-70">${(parseFloat(balanceInfo.balance) / 2).toFixed(2)}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentAmount("")}
                      className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 border-border hover:border-primary/50"
                    >
                      Custom<br /><span className="text-xs opacity-70">Enter amount</span>
                    </button>
                  </>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border rounded-lg text-xl font-semibold tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "bank_transfer", "check", "other"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-3 text-sm font-medium rounded-lg border-2 transition-all",
                      paymentMethod === method
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {method === "cash" && <DollarSign className="h-4 w-4" />}
                    {method === "card" && <CreditCard className="h-4 w-4" />}
                    {method === "bank_transfer" && <RotateCcw className="h-4 w-4" />}
                    {method === "check" && <Edit className="h-4 w-4" />}
                    {method === "other" && <MoreHorizontal className="h-4 w-4" />}
                    <span className="text-xs capitalize">{method.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Reference <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg"
                placeholder="Transaction ID, check #..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border rounded-lg resize-none"
                placeholder="Additional details..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-card px-6 py-4 mt-auto">
            {paymentAmount && parseFloat(paymentAmount) > 0 && balanceInfo && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recording</span>
                  <span className="font-semibold">${parseFloat(paymentAmount).toFixed(2)} via {paymentMethod.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance after</span>
                  <span className={cn(
                    "font-semibold",
                    parseFloat(balanceInfo.balance) - parseFloat(paymentAmount) <= 0 ? "text-emerald-600" : ""
                  )}>
                    ${Math.max(0, parseFloat(balanceInfo.balance) - parseFloat(paymentAmount)).toFixed(2)}
                    {parseFloat(balanceInfo.balance) - parseFloat(paymentAmount) <= 0 && " ✓ Paid"}
                  </span>
                </div>
              </div>
            )}
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || createPaymentMutation.isPending}
              className="w-full py-3 text-base font-medium"
            >
              {createPaymentMutation.isPending && <ButtonSpinner />}
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Link Modal */}
      <Dialog open={showPaymentLinkModal} onOpenChange={(open) => {
        setShowPaymentLinkModal(open);
        if (!open) setPaymentLinkUrl("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Link Generated</DialogTitle>
            <DialogDescription>Share this link with the customer to collect payment.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
              <p className="text-sm font-mono break-all">{paymentLinkUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={async () => {
                  await navigator.clipboard.writeText(paymentLinkUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => sendPaymentLinkEmailMutation.mutate({ bookingId })}
                disabled={sendPaymentLinkEmailMutation.isPending}
              >
                <Send className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentLinkModal(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Assignment Sheet */}
      <QuickGuideAssignSheet
        open={showAssignGuideSheet}
        onOpenChange={setShowAssignGuideSheet}
        bookingId={bookingId}
        scheduleInfo={booking.bookingDate ? {
          id: `${booking.tourId}-${booking.bookingDate}-${booking.bookingTime}`,
          tourName: booking.tour?.name || "Tour",
          date: formatShortDate(new Date(booking.bookingDate)),
          time: booking.bookingTime || "",
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

      {/* Confirm Modal */}
      {confirmModal.ConfirmModal}
    </div>
  );
}
