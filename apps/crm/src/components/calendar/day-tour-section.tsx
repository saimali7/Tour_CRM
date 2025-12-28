"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { format } from "date-fns";
import {
  Clock,
  Users,
  FileText,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  User,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// TYPES
// =============================================================================

interface Schedule {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
  bookedCount: number | null;
  maxParticipants: number;
  guidesRequired?: number | null;
  guidesAssigned?: number | null;
  tour?: {
    id: string;
    name: string;
  } | null;
  guideAssignments?: Array<{
    guide?: {
      firstName: string;
      lastName: string;
    } | null;
  }>;
}

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  totalParticipants: number;
  total: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  schedule?: {
    id: string;
  } | null;
}

interface DayTourSectionProps {
  schedule: Schedule;
  bookings: Booking[];
  orgSlug: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DayTourSection({
  schedule,
  bookings,
  orgSlug,
}: DayTourSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const utils = trpc.useUtils();

  // Use actual bookings count, not schedule.bookedCount which may be stale
  const actualBookedCount = bookings.reduce((sum, b) => sum + b.totalParticipants, 0);
  const booked = actualBookedCount > 0 ? actualBookedCount : (schedule.bookedCount ?? 0);
  const capacity = schedule.maxParticipants;
  const isFull = booked >= capacity;
  const hasBookings = bookings.length > 0;
  const needsGuide =
    (schedule.guidesAssigned ?? 0) < (schedule.guidesRequired ?? 1) &&
    hasBookings;

  // Get assigned guide name
  const guideName = schedule.guideAssignments?.[0]?.guide
    ? `${schedule.guideAssignments[0].guide.firstName} ${schedule.guideAssignments[0].guide.lastName}`
    : null;

  // Format time
  const formatTime = (time: Date | string) => {
    const d = typeof time === "string" ? new Date(time) : time;
    return format(d, "h:mm a");
  };

  // Mutations for inline actions
  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
    },
  });

  const updatePaymentMutation = trpc.booking.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
    },
  });

  const handleConfirm = async (bookingId: string) => {
    await confirmMutation.mutateAsync({ id: bookingId });
  };

  const handleMarkPaid = async (bookingId: string) => {
    await updatePaymentMutation.mutateAsync({
      id: bookingId,
      paymentStatus: "paid"
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left transition-colors",
          "hover:bg-muted/50",
          needsGuide && "bg-amber-500/5"
        )}
      >
        <div className="flex-1 min-w-0">
          {/* Tour Name */}
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            {schedule.tour?.name || "Unknown Tour"}
          </h2>

          {/* Time + Guide Info */}
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(schedule.startsAt)}
            </span>
            <span className="text-muted-foreground/50">·</span>
            {guideName ? (
              <span>Guide: {guideName}</span>
            ) : needsGuide ? (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                No guide assigned
              </span>
            ) : hasBookings ? (
              <span className="text-muted-foreground/60">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
            ) : null}
          </div>
        </div>

        {/* Right side: Capacity + Expand indicator */}
        <div className="flex items-center gap-4 ml-4">
          {/* Capacity */}
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">
              <span className="font-semibold">{booked}</span>
              <span className="text-muted-foreground">/{capacity}</span>
            </span>
            {isFull && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                Full
              </Badge>
            )}
          </div>

          {/* Expand/Collapse */}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Action Bar - Outside the button to avoid nesting issues */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/20">
        {/* Assign Guide Button */}
        {needsGuide && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Open assign guide dialog
            }}
          >
            Assign Guide
          </Button>
        )}

        {/* Manifest Link */}
        <Link
          href={`/org/${orgSlug}/tour-run?scheduleId=${schedule.id}` as Route}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <FileText className="h-4 w-4" />
          Manifest
        </Link>
      </div>

      {/* Bookings Table */}
      {isExpanded && (
        <div className="border-t border-border">
          {bookings.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <p className="text-sm">No bookings yet</p>
              <Button variant="link" size="sm" className="mt-1" asChild>
                <Link
                  href={
                    `/org/${orgSlug}/bookings/new?scheduleId=${schedule.id}` as Route
                  }
                >
                  Add booking
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  orgSlug={orgSlug}
                  onConfirm={handleConfirm}
                  onMarkPaid={handleMarkPaid}
                  isConfirming={
                    confirmMutation.isPending &&
                    confirmMutation.variables?.id === booking.id
                  }
                  isMarkingPaid={
                    updatePaymentMutation.isPending &&
                    updatePaymentMutation.variables?.id === booking.id
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BOOKING ROW COMPONENT
// =============================================================================

function BookingRow({
  booking,
  orgSlug,
  onConfirm,
  onMarkPaid,
  isConfirming,
  isMarkingPaid,
}: {
  booking: Booking;
  orgSlug: string;
  onConfirm: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  isConfirming: boolean;
  isMarkingPaid: boolean;
}) {
  const isConfirmed = booking.status === "confirmed";
  const isPaid = booking.paymentStatus === "paid";
  const isReady = isConfirmed && isPaid;
  const needsPayment = !isPaid;
  const needsConfirmation = booking.status === "pending";

  // Status dot color
  const getStatusColor = () => {
    if (isReady) return "bg-emerald-500";
    if (needsPayment && isConfirmed) return "bg-amber-500";
    if (needsConfirmation) return "bg-blue-500";
    if (booking.status === "cancelled") return "bg-muted";
    return "bg-muted";
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Status Dot */}
      <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor())} />

      {/* Customer Info */}
      <Link
        href={`/org/${orgSlug}/bookings/${booking.id}` as Route}
        className="flex-1 min-w-0 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {booking.customer?.firstName} {booking.customer?.lastName}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            #{booking.referenceNumber}
          </span>
        </div>
      </Link>

      {/* Guests */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground w-16 shrink-0">
        <Users className="h-3.5 w-3.5" />
        <span className="tabular-nums">{booking.totalParticipants}</span>
      </div>

      {/* Amount */}
      <div className="w-20 text-right shrink-0">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            isPaid ? "text-foreground" : "text-amber-600"
          )}
        >
          {formatCurrency(booking.total)}
        </span>
      </div>

      {/* Payment Status Badge */}
      <div className="w-24 shrink-0">
        {isPaid ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-500/20"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )}
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Confirm Booking */}
          {needsConfirmation && (
            <DropdownMenuItem
              onClick={() => onConfirm(booking.id)}
              disabled={isConfirming}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isConfirming ? "Confirming..." : "Confirm Booking"}
            </DropdownMenuItem>
          )}

          {/* Mark as Paid */}
          {needsPayment && (
            <DropdownMenuItem
              onClick={() => onMarkPaid(booking.id)}
              disabled={isMarkingPaid}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isMarkingPaid ? "Processing..." : "Mark as Paid"}
            </DropdownMenuItem>
          )}

          {(needsConfirmation || needsPayment) && <DropdownMenuSeparator />}

          {/* View Details */}
          <DropdownMenuItem asChild>
            <Link href={`/org/${orgSlug}/bookings/${booking.id}` as Route}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Link>
          </DropdownMenuItem>

          {/* View Customer */}
          {booking.customer && (
            <DropdownMenuItem asChild>
              <Link
                href={`/org/${orgSlug}/customers/${booking.customer.id}` as Route}
              >
                <User className="h-4 w-4 mr-2" />
                View Customer
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
