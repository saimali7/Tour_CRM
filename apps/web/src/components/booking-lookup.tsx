"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, Calendar, Clock, MapPin, Users, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@tour/ui";

interface BookingLookupProps {
  organizationId: string;
}

interface BookingDetails {
  id: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  totalParticipants: number;
  total: string;
  currency: string;
  schedule: {
    startsAt: string;
    endsAt: string;
  };
  tour: {
    name: string;
    meetingPoint: string | null;
  };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy");
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function BookingLookup({ organizationId }: BookingLookupProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBooking(null);

    try {
      const response = await fetch(
        `/api/bookings/lookup?reference=${encodeURIComponent(referenceNumber)}&email=${encodeURIComponent(email)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Booking not found");
      }

      const data = await response.json();
      setBooking(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find booking");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setBooking(null);
    setReferenceNumber("");
    setEmail("");
    setError(null);
  };

  // Avoid unused variable warning
  void organizationId;

  if (booking) {
    return (
      <div className="space-y-6">
        {/* Success Badge */}
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Booking Found</span>
        </div>

        {/* Booking Details Card */}
        <div className="p-6 rounded-lg border bg-card space-y-4">
          {/* Reference and Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-mono font-bold text-lg">{booking.referenceNumber}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                booking.status
              )}`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>

          {/* Tour Info */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-lg mb-3">{booking.tour.name}</h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(booking.schedule.startsAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(booking.schedule.startsAt)} -{" "}
                  {formatTime(booking.schedule.endsAt)}
                </span>
              </div>

              {booking.tour.meetingPoint && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.tour.meetingPoint}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {booking.totalParticipants} participant
                  {booking.totalParticipants !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">Lead Contact</p>
            <p className="font-medium">
              {booking.customer.firstName} {booking.customer.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
          </div>

          {/* Payment */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-lg">
                {formatPrice(booking.total, booking.currency)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Payment status:{" "}
              <span
                className={
                  booking.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"
                }
              >
                {booking.paymentStatus.charAt(0).toUpperCase() +
                  booking.paymentStatus.slice(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {booking.status === "confirmed" && (
            <Button variant="outline" className="w-full" disabled>
              Request Cancellation (Coming Soon)
            </Button>
          )}
          <Button variant="outline" onClick={handleClear} className="w-full">
            Look Up Another Booking
          </Button>
        </div>

        {/* Help */}
        <p className="text-sm text-muted-foreground text-center">
          Need to make changes?{" "}
          <a href="/contact" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-lg border bg-card space-y-4">
        <div>
          <label htmlFor="referenceNumber" className="block text-sm font-medium mb-2">
            Booking Reference <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            placeholder="e.g., BK-ABC123"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Found in your confirmation email
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="john@example.com"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            The email used when booking
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Searching...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Find Booking
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Can&apos;t find your booking?{" "}
        <a href="/contact" className="text-primary hover:underline">
          Contact us
        </a>{" "}
        for help.
      </p>
    </form>
  );
}
