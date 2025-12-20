"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import {
  ContextPanelSection,
  ContextPanelRow,
  ContextPanelSkeleton,
  ContextPanelEmpty,
} from "@/components/layout/context-panel";
import { cn } from "@/lib/utils";

interface BookingPreviewProps {
  bookingId: string;
}

export function BookingPreview({ bookingId }: BookingPreviewProps) {
  const params = useParams();
  const slug = params.slug as string;

  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery(
    { id: bookingId },
    { enabled: !!bookingId }
  );

  if (isLoading) {
    return <ContextPanelSkeleton />;
  }

  if (error || !booking) {
    return (
      <ContextPanelEmpty
        icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        title="Booking not found"
        description="This booking may have been deleted"
      />
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
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

  const total = parseFloat(booking.total);
  // Calculate amount paid from payments relation if available, otherwise use 0
  const paid = 0; // TODO: Calculate from payments when available
  const remaining = total - paid;

  return (
    <>
      {/* Status Section */}
      <ContextPanelSection>
        <div className="flex items-center gap-2 mb-3">
          <BookingStatusBadge status={booking.status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"} />
          <PaymentStatusBadge status={booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed"} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold text-foreground">
            {booking.referenceNumber}
          </span>
        </div>
      </ContextPanelSection>

      {/* Customer Section */}
      <ContextPanelSection title="Customer">
        {booking.customer ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {booking.customer.firstName} {booking.customer.lastName}
                </p>
              </div>
            </div>
            {booking.customer.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{booking.customer.email}</span>
              </div>
            )}
            {booking.customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{booking.customer.phone}</span>
              </div>
            )}
            <Link
              href={`/org/${slug}/customers/${booking.customerId}` as Route}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              View customer profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No customer information</p>
        )}
      </ContextPanelSection>

      {/* Tour & Schedule Section */}
      <ContextPanelSection title="Tour Details">
        {booking.tour && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{booking.tour.name}</p>
            {booking.schedule && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDate(booking.schedule.startsAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatTime(booking.schedule.startsAt)}</span>
                </div>
              </>
            )}
            {booking.tour.meetingPoint && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{booking.tour.meetingPoint}</span>
              </div>
            )}
          </div>
        )}
      </ContextPanelSection>

      {/* Participants Section */}
      <ContextPanelSection title="Participants">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-2xl font-semibold tabular-nums">{booking.totalParticipants}</span>
          <span className="text-sm text-muted-foreground">guests</span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {booking.adultCount > 0 && (
            <span>{booking.adultCount} adult{booking.adultCount !== 1 ? "s" : ""}</span>
          )}
          {(booking.childCount ?? 0) > 0 && (
            <span>{booking.childCount} child{booking.childCount !== 1 ? "ren" : ""}</span>
          )}
          {(booking.infantCount ?? 0) > 0 && (
            <span>{booking.infantCount} infant{booking.infantCount !== 1 ? "s" : ""}</span>
          )}
        </div>
      </ContextPanelSection>

      {/* Payment Section */}
      <ContextPanelSection title="Payment">
        <div className="space-y-1">
          <ContextPanelRow
            label="Total"
            value={
              <span className="font-semibold tabular-nums">
                ${total.toFixed(2)}
              </span>
            }
          />
          <ContextPanelRow
            label="Paid"
            value={
              <span className={cn(
                "tabular-nums",
                paid > 0 ? "text-emerald-600 dark:text-emerald-400" : ""
              )}>
                ${paid.toFixed(2)}
              </span>
            }
          />
          {remaining > 0 && (
            <ContextPanelRow
              label="Remaining"
              value={
                <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                  ${remaining.toFixed(2)}
                </span>
              }
            />
          )}
        </div>
      </ContextPanelSection>

      {/* Special Requests */}
      {(booking.specialRequests || booking.dietaryRequirements || booking.accessibilityNeeds) && (
        <ContextPanelSection title="Special Requests">
          <div className="space-y-2 text-sm text-muted-foreground">
            {booking.dietaryRequirements && (
              <p><span className="font-medium">Dietary:</span> {booking.dietaryRequirements}</p>
            )}
            {booking.accessibilityNeeds && (
              <p><span className="font-medium">Accessibility:</span> {booking.accessibilityNeeds}</p>
            )}
            {booking.specialRequests && (
              <p>{booking.specialRequests}</p>
            )}
          </div>
        </ContextPanelSection>
      )}

      {/* Internal Notes */}
      {booking.internalNotes && (
        <ContextPanelSection title="Internal Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {booking.internalNotes}
          </p>
        </ContextPanelSection>
      )}
    </>
  );
}

// Footer actions for the booking preview
export function BookingPreviewActions({ bookingId }: { bookingId: string }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/bookings/${bookingId}` as Route}>
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Link>
      </Button>
      <Button variant="default" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/bookings/${bookingId}/edit` as Route}>
          <Edit className="h-4 w-4 mr-1.5" />
          Edit
        </Link>
      </Button>
    </div>
  );
}
