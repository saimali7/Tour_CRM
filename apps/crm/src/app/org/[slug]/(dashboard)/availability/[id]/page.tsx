"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Clock,
  Users,
  DollarSign,
  MapPin,
  User,
  Plus,
  Ticket,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { formatLocalDateKey, parseDateKeyToLocalDate } from "@/lib/date-time";

type Tab = "details" | "bookings";

/**
 * Tour Run Detail Page
 *
 * Shows details for a specific tour run (tourId + date + time combination).
 * The ID param is the tourId, and date/time come from search params.
 */
export default function TourRunDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const tourId = params.id as string;
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const { openQuickBooking } = useQuickBookingContext();

  const dateKey = useMemo(() => {
    if (!dateParam) return null;
    const explicitMatch = dateParam.match(/^(\d{4}-\d{2}-\d{2})/);
    return explicitMatch?.[1] ?? null;
  }, [dateParam]);

  // Parse date key for local display
  const date = useMemo(() => {
    if (!dateKey) return new Date();
    return parseDateKeyToLocalDate(dateKey);
  }, [dateKey]);

  const time = timeParam || "09:00";

  // Fetch the tour run data
  const { data: tourRun, isLoading, error } = trpc.tourRun.get.useQuery(
    { tourId, date: dateKey ?? formatLocalDateKey(new Date()), time },
    { enabled: !!tourId && !!dateKey && !!timeParam }
  );

  // Fetch bookings for this tour run
  const { data: manifest } = trpc.tourRun.getManifest.useQuery(
    { tourId, date: dateKey ?? formatLocalDateKey(new Date()), time },
    { enabled: activeTab === "bookings" && !!tourId && !!dateKey && !!timeParam }
  );

  // Fetch the tour for additional details
  const { data: tour } = trpc.tour.getById.useQuery(
    { id: tourId },
    { enabled: !!tourId }
  );

  if (!dateKey || !timeParam) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Missing date or time parameter. Please access this page from the calendar or availability list.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Error loading tour run: {error.message}</p>
      </div>
    );
  }

  if (!tourRun) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Tour run not found</p>
      </div>
    );
  }

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(d));
  };

  const formatTime = (t: string) => {
    const [hours, minutes] = t.split(":");
    const hour = parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(d));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      case "no_show":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleAddBooking = () => {
    // Open quick booking with tour pre-selected
    openQuickBooking({
      tourId,
    });
  };

  const booked = tourRun.bookedCount ?? 0;
  const max = tourRun.capacity || tour?.maxParticipants || 0;
  const availableSpots = max - booked;
  const fillRate = max > 0 ? Math.round((booked / max) * 100) : 0;

  const bookings = manifest?.bookings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {tour?.name || tourRun.tourName || "Tour Details"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">{formatDate(date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableSpots > 0 && (
            <Button onClick={handleAddBooking} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Booking
            </Button>
          )}
        </div>
      </div>

      {/* Capacity Overview Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Capacity</h2>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
            fillRate >= 100 ? "bg-destructive/10 text-destructive" :
              fillRate >= 80 ? "bg-warning/10 text-warning" :
                "bg-success/10 text-success"
          )}>
            <TrendingUp className="h-4 w-4" />
            {fillRate}% filled
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Booked</span>
            <span className="font-medium">{booked} participants</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all",
                fillRate >= 100 ? "bg-destructive" :
                  fillRate >= 80 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className={cn(
              "font-semibold",
              availableSpots > 0 ? "text-success" : "text-destructive"
            )}>
              {availableSpots > 0 ? `${availableSpots} spots left` : "FULL"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("details")}
            className={`${activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`${activeTab === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            Bookings
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
              {tourRun.bookingCount || 0}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold text-foreground">
                    {formatTime(time)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="font-semibold text-foreground">
                    {booked} / {max}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-semibold text-foreground">
                    {tour?.basePrice ? `$${parseFloat(tour.basePrice).toFixed(2)}` : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  (tourRun.guidesAssigned ?? 0) >= (tourRun.guidesRequired ?? 1) ? "bg-success/10" : "bg-warning/10"
                )}>
                  <User className={cn(
                    "h-5 w-5",
                    (tourRun.guidesAssigned ?? 0) >= (tourRun.guidesRequired ?? 1) ? "text-success" : "text-warning"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guides</p>
                  <p className="font-semibold text-foreground">
                    {tourRun.guidesAssigned ?? 0}/{tourRun.guidesRequired ?? 1}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tour Info */}
          {tour && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Tour Information</h2>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{tour.name}</h3>
                  <p className="text-muted-foreground mt-1">
                    {tour.durationMinutes} minutes • ${parseFloat(tour.basePrice).toFixed(2)}
                  </p>
                  <Link
                    href={`/org/${slug}/tours/${tour.id}` as Route}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    View Tour Details
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Point */}
          {(tour?.meetingPoint || tour?.meetingPointDetails) && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meeting Point</h2>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {tour.meetingPoint || "Not specified"}
                  </p>
                  {tour.meetingPointDetails && (
                    <p className="text-muted-foreground mt-1">
                      {tour.meetingPointDetails}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bookings</h2>
              <p className="text-sm text-muted-foreground">
                {booked} of {max} spots booked
              </p>
            </div>
            {availableSpots > 0 && (
              <Button onClick={handleAddBooking} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Booking
              </Button>
            )}
          </div>

          {bookings.length > 0 ? (
            <div className="divide-y divide-border">
              {bookings.map((booking) => {
                const customerInitials = booking.customer?.name
                  ? booking.customer.name.split(" ").map(n => n[0]).join("").slice(0, 2)
                  : "";
                const participantCount = booking.participants?.length || 0;

                return (
                  <div
                    key={booking.id}
                    onClick={() => router.push(`/org/${slug}/bookings/${booking.id}` as Route)}
                    className="p-4 flex items-center justify-between hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {customerInitials ? (
                          <span className="text-primary font-semibold text-sm">
                            {customerInitials}
                          </span>
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {booking.customer?.name || "Unknown Customer"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {booking.referenceNumber}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1).replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {participantCount} participant{participantCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No bookings yet</p>
              {availableSpots > 0 && (
                <Button onClick={handleAddBooking} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Booking
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
