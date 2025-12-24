"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  CreditCard,
  Mail,
  Phone,
  User,
  Users,
  ExternalLink,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface BookingQuickViewProps {
  bookingId: string;
  orgSlug: string;
  onCustomerClick?: (customerId: string) => void;
  onScheduleClick?: (scheduleId: string) => void;
}

export function BookingQuickView({
  bookingId,
  orgSlug,
  onCustomerClick,
  onScheduleClick,
}: BookingQuickViewProps) {
  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery({ id: bookingId });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load booking: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Booking not found
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "status-pending",
    confirmed: "status-confirmed",
    cancelled: "status-cancelled",
    completed: "status-completed",
  };

  const paymentColors: Record<string, string> = {
    pending: "status-pending",
    paid: "status-confirmed",
    refunded: "bg-muted text-muted-foreground",
    partial_refund: "status-warning",
  };

  const childCount = booking.childCount ?? 0;
  const total = parseFloat(booking.total || "0");
  const discount = parseFloat(booking.discount || "0");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Booking #{booking.referenceNumber}
          </h3>
          <p className="text-sm text-muted-foreground">
            Created {format(new Date(booking.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[booking.status] || "bg-muted text-muted-foreground"
            }`}
          >
            {booking.status}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              paymentColors[booking.paymentStatus] || "bg-muted text-muted-foreground"
            }`}
          >
            {booking.paymentStatus}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Customer
          </h4>
          {onCustomerClick && booking.customer && (
            <button
              onClick={() => onCustomerClick(booking.customer!.id)}
              className="text-xs text-primary hover:underline"
            >
              View Profile
            </button>
          )}
        </div>
        {booking.customer ? (
          <div className="space-y-1">
            <p className="font-medium">
              {booking.customer.firstName} {booking.customer.lastName}
            </p>
            {booking.customer.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {booking.customer.email}
              </p>
            )}
            {booking.customer.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {booking.customer.phone}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No customer data</p>
        )}
      </div>

      {/* Schedule Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Tour Details
          </h4>
          {onScheduleClick && booking.schedule && (
            <button
              onClick={() => onScheduleClick(booking.schedule!.id)}
              className="text-xs text-primary hover:underline"
            >
              View Schedule
            </button>
          )}
        </div>
        {booking.schedule ? (
          <div className="space-y-2">
            {booking.tour && (
              <p className="font-medium">{booking.tour.name}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(booking.schedule.startsAt), "EEE, MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(booking.schedule.startsAt), "h:mm a")}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No schedule data</p>
        )}
      </div>

      {/* Booking Option */}
      {booking.pricingSnapshot && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Booking Option
          </h4>
          <div className="space-y-2">
            <p className="font-medium">
              {(booking.pricingSnapshot as { optionName?: string })?.optionName || "Standard Experience"}
            </p>
            {(booking.pricingSnapshot as { experienceMode?: string })?.experienceMode && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground capitalize">
                {(booking.pricingSnapshot as { experienceMode?: string }).experienceMode}
              </span>
            )}
            {(booking.pricingSnapshot as { priceBreakdown?: string })?.priceBreakdown && (
              <p className="text-sm text-muted-foreground font-mono">
                {(booking.pricingSnapshot as { priceBreakdown?: string }).priceBreakdown}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Participants
        </h4>
        <div className="flex gap-4">
          {booking.adultCount > 0 && (
            <span className="text-sm">
              <span className="font-medium">{booking.adultCount}</span> Adult
              {booking.adultCount !== 1 ? "s" : ""}
            </span>
          )}
          {childCount > 0 && (
            <span className="text-sm">
              <span className="font-medium">{childCount}</span> Child
              {childCount !== 1 ? "ren" : ""}
            </span>
          )}
        </div>
        <p className="text-sm font-medium">
          Total: {booking.totalParticipants} participants
        </p>
      </div>

      {/* Payment */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Payment
        </h4>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="font-medium">${total.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span className="text-sm">Discount Applied</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link href={`/org/${orgSlug}/bookings/${booking.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Details
          </Button>
        </Link>
      </div>

      {/* Special Requests */}
      {booking.specialRequests && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Special Requests</h4>
          <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
        </div>
      )}
    </div>
  );
}
