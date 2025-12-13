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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Failed to load booking: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
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
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
  };

  const paymentColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    refunded: "bg-gray-100 text-gray-800",
    partial_refund: "bg-orange-100 text-orange-800",
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
              statusColors[booking.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {booking.status}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              paymentColors[booking.paymentStatus] || "bg-gray-100 text-gray-800"
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
            <div className="flex justify-between text-green-600">
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
