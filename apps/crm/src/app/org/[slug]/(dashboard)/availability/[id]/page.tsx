"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Clock,
  Users,
  DollarSign,
  MapPin,
  User,
  Plus,
  ExternalLink,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ScheduleGuideAssignment } from "@/components/schedules/schedule-guide-assignment";
import { ScheduleManifest } from "@/components/schedules/schedule-manifest";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UnifiedBookingSheet } from "@/components/bookings/unified-booking-sheet";

type Tab = "details" | "bookings" | "manifest";

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const scheduleId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showQuickBook, setShowQuickBook] = useState(false);

  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery({ id: scheduleId });
  const { data: scheduleBookings } = trpc.booking.getForSchedule.useQuery(
    { scheduleId },
    { enabled: activeTab === "bookings" }
  );

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
        <p className="text-destructive">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Schedule not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
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

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
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
    setShowQuickBook(true);
  };

  const booked = schedule.bookedCount ?? 0;
  const max = schedule.maxParticipants || 0;
  const availableSpots = max - booked;
  const fillRate = max > 0 ? Math.round((booked / max) * 100) : 0;

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
                {schedule.tour?.name || "Schedule Details"}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  schedule.status === "scheduled"
                    ? "bg-primary/10 text-primary"
                    : schedule.status === "in_progress"
                    ? "status-pending"
                    : schedule.status === "completed"
                    ? "status-completed"
                    : "status-cancelled"
                }`}
              >
                {schedule.status === "in_progress" ? "In Progress" : schedule.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{formatDate(schedule.startsAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableSpots > 0 && (
            <Button onClick={handleAddBooking} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Booking
            </Button>
          )}
          <Link
            href={`/org/${slug}/tours/${schedule.tourId}?tab=schedules` as Route}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit in Tour
          </Link>
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
              style={{ width: `${fillRate}%` }}
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
            className={`${
              activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`${
              activeTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            Bookings
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
              {schedule.bookedCount || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("manifest")}
            className={`${
              activeTab === "manifest"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Manifest
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
                    {formatTime(schedule.startsAt)} - {formatTime(schedule.endsAt)}
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
                    {schedule.bookedCount ?? 0} / {schedule.maxParticipants}
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
                    {schedule.price ? `$${parseFloat(schedule.price).toFixed(2)}` : "Tour default"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  schedule.guide ? "bg-success/10" : "bg-warning/10"
                )}>
                  <User className={cn(
                    "h-5 w-5",
                    schedule.guide ? "text-success" : "text-warning"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guide</p>
                  <p className={cn(
                    "font-semibold",
                    schedule.guide ? "text-foreground" : "text-warning"
                  )}>
                    {schedule.guide
                      ? `${schedule.guide.firstName} ${schedule.guide.lastName}`
                      : "Not assigned"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guide Assignment */}
          {schedule.tour && (
            <ScheduleGuideAssignment
              scheduleId={schedule.id}
              tourId={schedule.tour.id}
              startsAt={schedule.startsAt}
              endsAt={schedule.endsAt}
            />
          )}

          {/* Tour Info */}
          {schedule.tour && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Tour Information</h2>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{schedule.tour.name}</h3>
                  <p className="text-muted-foreground mt-1">
                    {schedule.tour.durationMinutes} minutes • ${parseFloat(schedule.tour.basePrice).toFixed(2)}
                  </p>
                  <Link
                    href={`/org/${slug}/tours/${schedule.tour.id}` as Route}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    View Tour Details
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Point */}
          {(schedule.meetingPoint || schedule.meetingPointDetails) && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meeting Point</h2>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {schedule.meetingPoint || "Not specified"}
                  </p>
                  {schedule.meetingPointDetails && (
                    <p className="text-muted-foreground mt-1">
                      {schedule.meetingPointDetails}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {(schedule.internalNotes || schedule.publicNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedule.internalNotes && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Internal Notes</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{schedule.internalNotes}</p>
                </div>
              )}
              {schedule.publicNotes && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Public Notes</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{schedule.publicNotes}</p>
                </div>
              )}
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
                {schedule.bookedCount || 0} of {schedule.maxParticipants} spots booked
              </p>
            </div>
            {availableSpots > 0 && (
              <Button onClick={handleAddBooking} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Booking
              </Button>
            )}
          </div>

          {scheduleBookings && scheduleBookings.length > 0 ? (
            <div className="divide-y divide-border">
              {scheduleBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 flex items-center justify-between hover:bg-accent/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {booking.customer ? (
                        <span className="text-primary font-semibold text-sm">
                          {booking.customer.firstName?.[0]}
                          {booking.customer.lastName?.[0]}
                        </span>
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {booking.customer
                            ? `${booking.customer.firstName} ${booking.customer.lastName}`
                            : "Unknown Customer"}
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
                        {booking.totalParticipants} participants • ${parseFloat(booking.total).toFixed(2)} • {formatDateTime(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/org/${slug}/bookings/${booking.id}` as Route}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Link>
                </div>
              ))}
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

      {activeTab === "manifest" && <ScheduleManifest scheduleId={scheduleId} />}

      {/* Unified Booking Sheet */}
      <UnifiedBookingSheet
        open={showQuickBook}
        onOpenChange={setShowQuickBook}
        orgSlug={slug}
        preselectedScheduleId={scheduleId}
      />
    </div>
  );
}
