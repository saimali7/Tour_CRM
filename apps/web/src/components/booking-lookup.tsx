"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@tour/ui";
import { parseLocalDateKey } from "@/lib/booking-context";

interface BookingLookupProps {
  organizationSlug: string;
  initialReferenceNumber?: string;
  magicToken?: string;
}

interface BookingDetails {
  id: string;
  referenceNumber: string;
  status: string;
  cancellationReason?: string | null;
  paymentStatus: string;
  canResumePayment?: boolean;
  totalParticipants: number;
  total: string;
  currency: string;
  bookingDate: string | null;
  bookingTime: string | null;
  tour: {
    id?: string;
    name: string;
    meetingPoint: string | null;
  } | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

function formatTime(time: string | null): string {
  if (!time) return "Time TBD";
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return time;
  }

  const normalizedHours = ((hours % 24) + 24) % 24;
  const ampm = normalizedHours >= 12 ? "PM" : "AM";
  const hour12 = normalizedHours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "Date TBD";
  const dateKey = dateValue.includes("T") ? dateValue.slice(0, 10) : dateValue;
  return format(parseLocalDateKey(dateKey), "EEEE, MMMM d, yyyy");
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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

export function BookingLookup({
  organizationSlug,
  initialReferenceNumber,
  magicToken,
}: BookingLookupProps) {
  const [referenceNumber, setReferenceNumber] = useState(initialReferenceNumber || "");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);

  const showManageActions =
    (booking?.status === "confirmed" || booking?.status === "pending") &&
    booking?.customer?.email;
  const canResumePayment = Boolean(booking?.canResumePayment);

  const lookupBooking = async (ref: string, customerEmail: string) => {
    const response = await fetch(
      `/api/bookings/lookup?reference=${encodeURIComponent(ref)}&email=${encodeURIComponent(customerEmail)}`
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Booking not found");
    }

    const data = await response.json();
    return data.booking as BookingDetails;
  };

  useEffect(() => {
    if (!magicToken) return;

    const verifyMagicToken = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/bookings/magic-link/verify?token=${encodeURIComponent(magicToken)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Invalid magic link");
        }

        const data = await response.json();
        setBooking(data.booking as BookingDetails);
        setReferenceNumber(data.booking.referenceNumber || "");
        setEmail(data.booking.customer?.email || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify magic link");
      } finally {
        setIsLoading(false);
      }
    };

    void verifyMagicToken();
  }, [magicToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    setMagicLinkUrl(null);

    try {
      const result = await lookupBooking(referenceNumber, email);
      setBooking(result);
    } catch (err) {
      setBooking(null);
      setError(err instanceof Error ? err.message : "Failed to find booking");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking?.customer?.email) return;

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await fetch("/api/bookings/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: booking.referenceNumber,
          email: booking.customer.email,
          reason: "Cancelled by customer self-service",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Failed to cancel booking");
      }

      const refreshed = await lookupBooking(booking.referenceNumber, booking.customer.email);
      setBooking(refreshed);
      setActionMessage("Booking cancelled successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!booking?.customer?.email) return;
    if (!rescheduleDate || !rescheduleTime) {
      setError("Select both a date and time to reschedule.");
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await fetch("/api/bookings/manage/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: booking.referenceNumber,
          email: booking.customer.email,
          bookingDate: rescheduleDate,
          bookingTime: rescheduleTime,
          tourId: booking.tour?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Failed to reschedule booking");
      }

      const refreshed = await lookupBooking(booking.referenceNumber, booking.customer.email);
      setBooking(refreshed);
      setActionMessage("Booking rescheduled successfully.");
      setRescheduleDate("");
      setRescheduleTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateMagicLink = async () => {
    if (!referenceNumber || !email) {
      setError("Enter your booking reference and email first.");
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);
    setMagicLinkUrl(null);

    try {
      const response = await fetch("/api/bookings/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber, email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Failed to create magic link");
      }

      const data = await response.json();
      setMagicLinkUrl(data.magicLink || null);
      setActionMessage("Secure magic link generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create magic link");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumePayment = async () => {
    if (!booking?.customer?.email) return;

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await fetch("/api/bookings/manage/resume-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: booking.referenceNumber,
          email: booking.customer.email,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            paymentUrl?: string;
            status?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "Unable to resume payment.");
      }

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      setActionMessage(data?.message || "Payment is already completed.");
      const refreshed = await lookupBooking(booking.referenceNumber, booking.customer.email);
      setBooking(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume payment");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClear = () => {
    setBooking(null);
    setReferenceNumber("");
    setEmail("");
    setError(null);
    setActionMessage(null);
    setMagicLinkUrl(null);
  };

  if (booking) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Booking Found</span>
        </div>

        <div className="p-6 rounded-lg border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-mono font-bold text-lg">{booking.referenceNumber}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold text-lg mb-3">{booking.tour?.name ?? "Tour booking"}</h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(booking.bookingDate)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(booking.bookingTime)}</span>
              </div>

              {booking.tour?.meetingPoint && (
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

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">Lead Contact</p>
            {booking.customer ? (
              <>
                <p className="font-medium">
                  {booking.customer.firstName} {booking.customer.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Customer details unavailable</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-lg">{formatPrice(booking.total, booking.currency)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Payment status:{" "}
              <span className={booking.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}>
                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
              </span>
            </p>
          </div>
        </div>

        {canResumePayment ? (
          <div className="space-y-3 rounded-lg border border-green-200 bg-green-50/50 p-4">
            <h4 className="text-sm font-semibold text-green-900">Payment</h4>
            <p className="text-sm text-green-800">
              Your booking has an outstanding balance. Continue to secure checkout.
            </p>
            <Button onClick={handleResumePayment} disabled={isActionLoading} className="w-full">
              Pay Now
            </Button>
          </div>
        ) : null}

        {showManageActions ? (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h4 className="text-sm font-semibold">Manage Booking</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={handleCancelBooking} disabled={isActionLoading}>
                Cancel Booking
              </Button>
              <Button variant="outline" onClick={handleCreateMagicLink} disabled={isActionLoading}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Generate Magic Link
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button onClick={handleRescheduleBooking} disabled={isActionLoading}>
                Reschedule
              </Button>
            </div>

            {magicLinkUrl && (
              <p className="text-xs text-muted-foreground break-all">
                Secure link: {magicLinkUrl}
              </p>
            )}
          </div>
        ) : null}

        {actionMessage && <p className="text-sm text-green-700">{actionMessage}</p>}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleClear} className="w-full">
            Look Up Another Booking
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Need to make changes?{" "}
          <a href={`/org/${organizationSlug}/contact`} className="text-primary hover:underline">
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
          <p className="text-xs text-muted-foreground mt-1">Found in your confirmation email</p>
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
          <p className="text-xs text-muted-foreground mt-1">The email used when booking</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionMessage && <p className="text-sm text-green-700">{actionMessage}</p>}

      <div className="space-y-3">
        <Button type="submit" className="w-full" size="lg" disabled={isLoading || isActionLoading}>
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

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCreateMagicLink}
          disabled={isActionLoading || isLoading}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Generate Magic Link
        </Button>
      </div>

      {magicLinkUrl && (
        <p className="text-xs text-muted-foreground break-all">Secure link: {magicLinkUrl}</p>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Can&apos;t find your booking?{" "}
        <a href={`/org/${organizationSlug}/contact`} className="text-primary hover:underline">
          Contact us
        </a>{" "}
        for help.
      </p>
    </form>
  );
}
