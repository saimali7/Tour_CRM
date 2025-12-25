"use client";

/**
 * NeedsActionView
 *
 * Displays bookings that need operator attention, grouped by urgency level.
 * Fetches data using trpc.booking.getGroupedByUrgency and presents it in
 * collapsible sections with bulk actions.
 *
 * @example
 * ```tsx
 * import { NeedsActionView } from "@/components/bookings/views";
 *
 * export default function NeedsActionPage() {
 *   const params = useParams();
 *   const orgSlug = params.slug as string;
 *
 *   return <NeedsActionView orgSlug={orgSlug} />;
 * }
 * ```
 */

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { UrgencySection } from "../urgency-section";
import { BookingRow } from "../booking-row";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// =============================================================================
// TYPES
// =============================================================================

interface NeedsActionViewProps {
  orgSlug: string;
}

type UrgencyLevel = "critical" | "high" | "medium" | "low";

interface BookingWithUrgency {
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
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTimeUntilText(booking: BookingWithUrgency): string {
  const tourDate = booking.schedule?.startsAt || booking.bookingDate;
  if (!tourDate) return "";

  const distance = formatDistanceToNow(new Date(tourDate), { addSuffix: false });
  return distance;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function SectionSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <div className="flex-1" />
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Stats Summary Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Urgency Sections Skeleton */}
      <div className="space-y-3">
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-green-500/10 p-4 mb-4">
        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
        All caught up!
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        No bookings need your attention right now. All pending bookings are confirmed and payments are up to date.
      </p>
    </div>
  );
}

// =============================================================================
// STATS SUMMARY
// =============================================================================

interface StatsSummaryProps {
  stats: {
    needsAction: number;
    critical: number;
    pendingConfirmation: number;
    unpaid: number;
  };
}

function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          <AlertTriangle className="h-4 w-4" />
          Need Action
        </div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {stats.needsAction}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          <CheckCircle2 className="h-4 w-4" />
          Pending Confirmation
        </div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {stats.pendingConfirmation}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          <CreditCard className="h-4 w-4" />
          Unpaid
        </div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {stats.unpaid}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NeedsActionView({ orgSlug }: NeedsActionViewProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch grouped bookings
  const { data, isLoading, error } = trpc.booking.getGroupedByUrgency.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Mutations
  const confirmMutation = trpc.booking.confirm.useMutation({
    onSuccess: () => {
      toast.success("Booking confirmed");
      utils.booking.getGroupedByUrgency.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to confirm booking");
    },
  });

  const sendPaymentLinkMutation = trpc.booking.sendPaymentLinkEmail.useMutation({
    onSuccess: () => {
      toast.success("Payment link sent");
      utils.booking.getGroupedByUrgency.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send payment link");
    },
  });

  const bulkConfirmMutation = trpc.booking.bulkConfirm.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.confirmed.length} booking(s) confirmed`);
      utils.booking.getGroupedByUrgency.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to confirm bookings");
    },
  });

  // Handlers
  const handleConfirm = React.useCallback(
    (bookingId: string) => {
      confirmMutation.mutate({ id: bookingId });
    },
    [confirmMutation]
  );

  const handleSendPaymentLink = React.useCallback(
    (bookingId: string) => {
      sendPaymentLinkMutation.mutate({ bookingId });
    },
    [sendPaymentLinkMutation]
  );

  const handleBulkConfirmPending = React.useCallback(
    (urgencyLevel: UrgencyLevel) => {
      if (!data) return;

      const bookingsInLevel = data[urgencyLevel] || [];
      const pendingIds = bookingsInLevel
        .filter((b) => b.status === "pending")
        .map((b) => b.id);

      if (pendingIds.length === 0) {
        toast.info("No pending bookings to confirm in this section");
        return;
      }

      bulkConfirmMutation.mutate({
        ids: pendingIds,
        sendConfirmationEmails: true,
      });
    },
    [data, bulkConfirmMutation]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
          Failed to load bookings
        </h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (!data || data.stats.needsAction === 0) {
    return <EmptyState />;
  }

  // Render sections
  const sections: Array<{
    key: UrgencyLevel;
    title: string;
    defaultExpanded: boolean;
    showBulkConfirm: boolean;
  }> = [
    {
      key: "critical",
      title: "Critical - Action Required",
      defaultExpanded: true,
      showBulkConfirm: true,
    },
    {
      key: "high",
      title: "High Priority - Within 48 Hours",
      defaultExpanded: true,
      showBulkConfirm: true,
    },
    {
      key: "medium",
      title: "This Week",
      defaultExpanded: false,
      showBulkConfirm: true,
    },
    {
      key: "low",
      title: "Later",
      defaultExpanded: false,
      showBulkConfirm: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <StatsSummary stats={data.stats} />

      {/* Urgency Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const bookings = data[section.key] || [];
          if (bookings.length === 0) return null;

          const pendingCount = bookings.filter((b) => b.status === "pending").length;
          const actions = section.showBulkConfirm && pendingCount > 0
            ? [
                {
                  label: `Confirm ${pendingCount} Pending`,
                  onClick: () => handleBulkConfirmPending(section.key),
                  loading: bulkConfirmMutation.isPending,
                },
              ]
            : undefined;

          return (
            <UrgencySection
              key={section.key}
              title={section.title}
              urgency={section.key}
              count={bookings.length}
              defaultExpanded={section.defaultExpanded}
              actions={actions}
            >
              <div className="divide-y divide-border">
                {bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    urgency={section.key}
                    timeUntil={getTimeUntilText(booking)}
                    orgSlug={orgSlug}
                    onConfirm={
                      booking.status === "pending"
                        ? () => handleConfirm(booking.id)
                        : undefined
                    }
                    onSendPaymentLink={
                      booking.paymentStatus !== "paid"
                        ? () => handleSendPaymentLink(booking.id)
                        : undefined
                    }
                    showTourTime={true}
                  />
                ))}
              </div>
            </UrgencySection>
          );
        })}
      </div>
    </div>
  );
}
