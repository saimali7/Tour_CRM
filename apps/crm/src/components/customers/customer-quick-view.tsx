"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  MapPin,
  User,
  ExternalLink,
  Plus,
  Calendar,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface CustomerQuickViewProps {
  customerId: string;
  orgSlug: string;
  onQuickBook?: () => void;
}

export function CustomerQuickView({
  customerId,
  orgSlug,
  onQuickBook,
}: CustomerQuickViewProps) {
  const { data: customer, isLoading, error } = trpc.customer.getByIdWithStats.useQuery({ id: customerId });

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Failed to load customer: {error.message}
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

  if (!customer) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Customer not found
      </div>
    );
  }

  const totalSpent = parseFloat(customer.totalSpent || "0");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {customer.firstName} {customer.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">
            Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
          </p>
        </div>
        {customer.tags && customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {customer.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
            {customer.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{customer.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Book Button */}
      {onQuickBook && (
        <Button onClick={onQuickBook} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Quick Book for {customer.firstName}
        </Button>
      )}

      {/* Contact Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Contact Information
        </h4>
        <div className="space-y-2">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3 w-3" />
              {customer.email}
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3 w-3" />
              {customer.phone}
            </a>
          )}
          {(customer.city || customer.country) && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[customer.city, customer.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{customer.totalBookings || 0}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total Spent</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-sm font-medium">
            {customer.lastBookingAt
              ? format(new Date(customer.lastBookingAt), "MMM d")
              : "-"}
          </p>
          <p className="text-xs text-muted-foreground">Last Booking</p>
        </div>
      </div>

      {/* View Recent Bookings Link */}
      {(customer.totalBookings ?? 0) > 0 && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Booking History
            </h4>
            <Link
              href={`/org/${orgSlug}/customers/${customer.id}`}
              className="text-xs text-primary hover:underline"
            >
              View All Bookings
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {customer.totalBookings} booking{customer.totalBookings !== 1 ? "s" : ""} on record
          </p>
        </div>
      )}

      {/* Notes */}
      {customer.notes && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Notes</h4>
          <p className="text-sm text-muted-foreground">{customer.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link href={`/org/${orgSlug}/customers/${customer.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
