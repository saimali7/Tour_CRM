"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Send, Users, DollarSign, Clock } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface BookingRowProps {
  booking: {
    id: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    totalParticipants: number;
    customer?: {
      firstName: string;
      lastName: string;
      email: string | null;
    };
    tour?: {
      name: string;
    };
    schedule?: {
      startsAt: Date;
    };
    bookingDate?: Date | null;
    bookingTime?: string | null;
  };
  urgency?: "critical" | "high" | "medium" | "low" | "none";
  timeUntil?: string;
  orgSlug: string;
  onConfirm?: () => void;
  onSendPaymentLink?: () => void;
  showTourTime?: boolean;
}

// =============================================================================
// URGENCY CONFIGURATION
// =============================================================================

const urgencyConfig = {
  critical: {
    borderColor: "border-l-destructive",
    badgeClass: "bg-destructive text-destructive-foreground",
    rowClass: "bg-destructive/10",
  },
  high: {
    borderColor: "border-l-warning",
    badgeClass: "bg-warning text-warning-foreground",
    rowClass: "bg-warning/10",
  },
  medium: {
    borderColor: "border-l-info",
    badgeClass: "bg-info text-info-foreground",
    rowClass: "",
  },
  low: {
    borderColor: "border-l-border",
    badgeClass: "bg-muted text-muted-foreground",
    rowClass: "",
  },
  none: {
    borderColor: "border-l-transparent",
    badgeClass: "bg-muted text-muted-foreground",
    rowClass: "",
  },
} as const;

// =============================================================================
// BOOKING ROW COMPONENT
// =============================================================================

export function BookingRow({
  booking,
  urgency = "none",
  timeUntil,
  orgSlug,
  onConfirm,
  onSendPaymentLink,
  showTourTime = true,
}: BookingRowProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);

  const config = urgencyConfig[urgency];
  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : "Walk-in Customer";

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    router.push(`/org/${orgSlug}/bookings/${booking.id}`);
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
  };

  const handleSendPaymentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSendPaymentLink?.();
  };

  // Format tour time for display
  const getTourTimeDisplay = () => {
    if (!showTourTime) return null;

    if (booking.schedule?.startsAt) {
      const date = new Date(booking.schedule.startsAt);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (booking.bookingTime) {
      return booking.bookingTime;
    }

    return null;
  };

  const tourTime = getTourTimeDisplay();

  // Determine if we should show quick actions
  const showConfirmAction = booking.status === "pending" && onConfirm;
  const showPaymentAction = booking.paymentStatus !== "paid" && onSendPaymentLink;
  const hasQuickActions = showConfirmAction || showPaymentAction;

  return (
    <div
      className={cn(
        // Base styles
        "group relative cursor-pointer border-l-4 bg-card transition-all duration-150",
        // Border color based on urgency
        config.borderColor,
        // Background tint based on urgency
        config.rowClass,
        // Hover effects
        "hover:bg-accent/50 hover:shadow-sm",
        // Focus styles for accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/org/${orgSlug}/bookings/${booking.id}`);
        }
      }}
    >
      <div className="flex items-center gap-3 p-4 sm:gap-4">
        {/* Time Urgency Badge */}
        {timeUntil && urgency !== "none" && (
          <div className="flex-shrink-0">
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide",
                config.badgeClass
              )}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {timeUntil}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {/* Customer & Tour Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {customerName}
              </span>
              <span className="text-xs text-muted-foreground">
                #{booking.referenceNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {booking.tour?.name && (
                <>
                  <span className="truncate">{booking.tour.name}</span>
                  {tourTime && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {tourTime}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metadata: Guests & Total */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                {booking.totalParticipants}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                {booking.total}
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <BookingStatusBadge
              status={booking.status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"}
            />
            <PaymentStatusBadge
              status={booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed"}
            />
          </div>
        </div>

        {/* Quick Actions */}
        {hasQuickActions && (
          <div
            className={cn(
              "flex flex-shrink-0 items-center gap-2 transition-opacity duration-150",
              // Always visible on mobile, show on hover on desktop
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
              isHovered && "opacity-100"
            )}
          >
            {showConfirmAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirmClick}
                className="h-8 gap-1 px-2 text-xs"
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Confirm</span>
              </Button>
            )}
            {showPaymentAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendPaymentClick}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Payment</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
