import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  CheckCheck,
  XCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  RefreshCw,
  Calendar,
  Play,
  Pause,
  FileEdit,
  Archive,
  Zap,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// BOOKING STATUS BADGE
// Icons provide additional visual cues for color-blind accessibility
// =============================================================================

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

const bookingStatusConfig: Record<
  BookingStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  pending: {
    label: "Pending",
    className: "status-pending",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    className: "status-confirmed",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    className: "status-completed",
    icon: CheckCheck,
  },
  cancelled: {
    label: "Cancelled",
    className: "status-cancelled",
    icon: XCircle,
  },
  no_show: {
    label: "No Show",
    className: "status-no-show",
    icon: AlertCircle,
  },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
  /** Show icon for additional accessibility (default: true) */
  showIcon?: boolean;
  /** Compact mode with just icon and no text */
  compact?: boolean;
}

export function BookingStatusBadge({
  status,
  className,
  showIcon = true,
  compact = false,
}: BookingStatusBadgeProps) {
  const config = bookingStatusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.className,
          className
        )}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
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
  { label: string; className: string; icon: LucideIcon }
> = {
  pending: {
    label: "Pending",
    className: "payment-pending",
    icon: Clock,
  },
  partial: {
    label: "Partial",
    className: "payment-partial",
    icon: CreditCard,
  },
  paid: {
    label: "Paid",
    className: "payment-paid",
    icon: DollarSign,
  },
  refunded: {
    label: "Refunded",
    className: "payment-refunded",
    icon: RefreshCw,
  },
  failed: {
    label: "Failed",
    className: "payment-failed",
    icon: XCircle,
  },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function PaymentStatusBadge({
  status,
  className,
  showIcon = true,
  compact = false,
}: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.className,
          className
        )}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
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
  { label: string; className: string; icon: LucideIcon }
> = {
  scheduled: {
    label: "Scheduled",
    className: "status-completed", // blue
    icon: Calendar,
  },
  in_progress: {
    label: "In Progress",
    className: "status-pending", // yellow
    icon: Play,
  },
  completed: {
    label: "Completed",
    className: "status-confirmed", // green
    icon: CheckCheck,
  },
  cancelled: {
    label: "Cancelled",
    className: "status-cancelled", // red
    icon: XCircle,
  },
};

interface ScheduleStatusBadgeProps {
  status: ScheduleStatus;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function ScheduleStatusBadge({
  status,
  className,
  showIcon = true,
  compact = false,
}: ScheduleStatusBadgeProps) {
  const config = scheduleStatusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.className,
          className
        )}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </span>
  );
}

// =============================================================================
// TOUR STATUS BADGE
// =============================================================================

type TourStatus = "draft" | "active" | "paused" | "archived";

const tourStatusConfig: Record<
  TourStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  draft: {
    label: "Draft",
    className: "status-pending", // yellow
    icon: FileEdit,
  },
  active: {
    label: "Active",
    className: "status-confirmed", // green
    icon: Zap,
  },
  paused: {
    label: "Paused",
    className: "status-pending", // yellow
    icon: Pause,
  },
  archived: {
    label: "Archived",
    className: "status-no-show", // gray
    icon: Archive,
  },
};

interface TourStatusBadgeProps {
  status: TourStatus;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function TourStatusBadge({
  status,
  className,
  showIcon = true,
  compact = false,
}: TourStatusBadgeProps) {
  const config = tourStatusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.className,
          className
        )}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </span>
  );
}

// =============================================================================
// GENERIC STATUS BADGE (for custom statuses)
// =============================================================================

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";

const variantConfig: Record<StatusVariant, { className: string; icon: LucideIcon }> = {
  success: { className: "status-confirmed", icon: CheckCircle },
  warning: { className: "status-pending", icon: AlertCircle },
  error: { className: "status-cancelled", icon: XCircle },
  info: { className: "status-completed", icon: Clock },
  neutral: { className: "status-no-show", icon: Clock },
};

type BadgeSize = "sm" | "default" | "lg";

interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
  className?: string;
  showIcon?: boolean;
  icon?: LucideIcon;
  compact?: boolean;
  size?: BadgeSize;
}

const sizeClasses: Record<BadgeSize, { badge: string; icon: string }> = {
  sm: { badge: "px-2 py-0.5 text-[10px]", icon: "h-2.5 w-2.5" },
  default: { badge: "px-2.5 py-0.5 text-xs", icon: "h-3 w-3" },
  lg: { badge: "px-3 py-1 text-sm", icon: "h-3.5 w-3.5" },
};

export function StatusBadge({
  label,
  variant,
  className,
  showIcon = true,
  icon,
  compact = false,
  size = "default",
}: StatusBadgeProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;
  const sizeClass = sizeClasses[size];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.className,
          className
        )}
        title={label}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeClass.badge,
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={sizeClass.icon} aria-hidden="true" />}
      {label}
    </span>
  );
}
