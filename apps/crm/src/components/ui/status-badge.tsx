import { cn } from "@/lib/utils";

// =============================================================================
// BOOKING STATUS BADGE
// =============================================================================

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

const bookingStatusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "status-pending",
  },
  confirmed: {
    label: "Confirmed",
    className: "status-confirmed",
  },
  completed: {
    label: "Completed",
    className: "status-completed",
  },
  cancelled: {
    label: "Cancelled",
    className: "status-cancelled",
  },
  no_show: {
    label: "No Show",
    className: "status-no-show",
  },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const config = bookingStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// PAYMENT STATUS BADGE
// =============================================================================

type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed";

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "payment-pending",
  },
  partial: {
    label: "Partial",
    className: "payment-partial",
  },
  paid: {
    label: "Paid",
    className: "payment-paid",
  },
  refunded: {
    label: "Refunded",
    className: "payment-refunded",
  },
  failed: {
    label: "Failed",
    className: "payment-failed",
  },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// SCHEDULE STATUS BADGE
// =============================================================================

type ScheduleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

const scheduleStatusConfig: Record<
  ScheduleStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "status-completed", // blue
  },
  in_progress: {
    label: "In Progress",
    className: "status-pending", // yellow
  },
  completed: {
    label: "Completed",
    className: "status-confirmed", // green
  },
  cancelled: {
    label: "Cancelled",
    className: "status-cancelled", // red
  },
};

interface ScheduleStatusBadgeProps {
  status: ScheduleStatus;
  className?: string;
}

export function ScheduleStatusBadge({ status, className }: ScheduleStatusBadgeProps) {
  const config = scheduleStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// TOUR STATUS BADGE
// =============================================================================

type TourStatus = "draft" | "active" | "archived";

const tourStatusConfig: Record<
  TourStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "status-no-show", // gray
  },
  active: {
    label: "Active",
    className: "status-confirmed", // green
  },
  archived: {
    label: "Archived",
    className: "status-no-show", // gray
  },
};

interface TourStatusBadgeProps {
  status: TourStatus;
  className?: string;
}

export function TourStatusBadge({ status, className }: TourStatusBadgeProps) {
  const config = tourStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// GENERIC STATUS BADGE (for custom statuses)
// =============================================================================

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";

const variantClassMap: Record<StatusVariant, string> = {
  success: "status-confirmed",
  warning: "status-pending",
  error: "status-cancelled",
  info: "status-completed",
  neutral: "status-no-show",
};

interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
  className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClassMap[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
