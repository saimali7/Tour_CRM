"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Printer,
  Download,
  Loader2,
  UtensilsCrossed,
  Accessibility,
  FileText,
  Baby,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TourRunManifestProps {
  tourId: string;
  date: Date;
  time: string;
  orgSlug: string;
}

export function TourRunManifest({
  tourId,
  date,
  time,
  orgSlug,
}: TourRunManifestProps) {
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(
    new Set()
  );

  const { data: manifest, isLoading } = trpc.tourRun.getManifest.useQuery({
    tourId,
    date,
    time,
  });

  const toggleBooking = (id: string) => {
    setExpandedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Manifest not found</p>
      </div>
    );
  }

  const { tourRun, summary, bookings, guides } = manifest;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {tourRun.tourName}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {new Date(tourRun.date).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              at {tourRun.time}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {tourRun.durationMinutes} min
            </span>
          </div>
          {tourRun.meetingPoint && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {tourRun.meetingPoint}
              {tourRun.meetingPointDetails && (
                <span className="text-muted-foreground/70">
                  — {tourRun.meetingPointDetails}
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{tourRun.tourName} — Manifest</h1>
        <p className="text-sm">
          {new Date(tourRun.date).toLocaleDateString()} at {tourRun.time} •{" "}
          {tourRun.durationMinutes} min
        </p>
        {tourRun.meetingPoint && (
          <p className="text-sm">Meeting Point: {tourRun.meetingPoint}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FileText className="h-4 w-4" />
            Bookings
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {summary.totalBookings}
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="h-4 w-4" />
            Participants
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {summary.totalParticipants}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.adults} adults • {summary.children} children •{" "}
            {summary.infants} infants
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <UserCheck className="h-4 w-4" />
            Checked In
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {summary.checkedInCount}/{summary.totalParticipants}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalParticipants > 0
              ? Math.round(
                  (summary.checkedInCount / summary.totalParticipants) * 100
                )
              : 0}
            % complete
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <User className="h-4 w-4" />
            Guides
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {guides.length}
          </p>
          {guides.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {guides.map((g) => g.firstName).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Guides Section */}
      {guides.length > 0 && (
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="font-semibold text-foreground mb-3">
            Assigned Guides
          </h3>
          <div className="flex flex-wrap gap-3">
            {guides.map((guide, idx) => (
              <div
                key={guide.id || idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {guide.firstName} {guide.lastName}
                    {guide.isOutsourced && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        External
                      </Badge>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {guide.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {guide.phone}
                      </span>
                    )}
                    {guide.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {guide.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">
          Bookings ({bookings.length})
        </h3>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No bookings for this tour run</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => {
              const isExpanded = expandedBookings.has(booking.id);
              const hasSpecialNeeds =
                booking.specialRequests ||
                booking.dietaryRequirements ||
                booking.accessibilityNeeds;

              return (
                <div
                  key={booking.id}
                  className="border border-border rounded-lg bg-card overflow-hidden"
                >
                  {/* Booking Header */}
                  <button
                    onClick={() => toggleBooking(booking.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-foreground">
                          {booking.participants.length}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {booking.customer.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{booking.referenceNumber}
                          </span>
                          {hasSpecialNeeds && (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {booking.customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {booking.customer.phone}
                            </span>
                          )}
                          {booking.customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {booking.customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          booking.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                      <Badge
                        variant={
                          booking.paymentStatus === "paid"
                            ? "default"
                            : "outline"
                        }
                        className={cn(
                          booking.paymentStatus === "paid" &&
                            "bg-success text-success-foreground",
                          booking.paymentStatus === "pending" &&
                            "border-warning text-warning"
                        )}
                      >
                        {booking.paymentStatus}
                      </Badge>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-muted/20 space-y-4">
                      {/* Special Needs */}
                      {hasSpecialNeeds && (
                        <div className="space-y-2">
                          {booking.specialRequests && (
                            <div className="flex items-start gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <span className="font-medium">
                                  Special Requests:
                                </span>{" "}
                                {booking.specialRequests}
                              </div>
                            </div>
                          )}
                          {booking.dietaryRequirements && (
                            <div className="flex items-start gap-2 text-sm">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <span className="font-medium">Dietary:</span>{" "}
                                {booking.dietaryRequirements}
                              </div>
                            </div>
                          )}
                          {booking.accessibilityNeeds && (
                            <div className="flex items-start gap-2 text-sm">
                              <Accessibility className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <span className="font-medium">
                                  Accessibility:
                                </span>{" "}
                                {booking.accessibilityNeeds}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Participants */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">
                          Participants ({booking.participants.length})
                        </h4>
                        <div className="space-y-1">
                          {booking.participants.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between py-2 px-3 rounded bg-background"
                            >
                              <div className="flex items-center gap-3">
                                {p.checkedIn === "checked_in" ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                                )}
                                <span className="text-sm">
                                  {p.firstName} {p.lastName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {p.type === "adult" && (
                                    <User className="h-3 w-3 mr-1" />
                                  )}
                                  {p.type === "child" && (
                                    <Users className="h-3 w-3 mr-1" />
                                  )}
                                  {p.type === "infant" && (
                                    <Baby className="h-3 w-3 mr-1" />
                                  )}
                                  {p.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {p.dietaryRequirements && (
                                  <UtensilsCrossed className="h-3.5 w-3.5 text-warning" />
                                )}
                                {p.accessibilityNeeds && (
                                  <Accessibility className="h-3.5 w-3.5 text-warning" />
                                )}
                                {p.checkedInAt && (
                                  <span>
                                    Checked in{" "}
                                    {new Date(p.checkedInAt).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
