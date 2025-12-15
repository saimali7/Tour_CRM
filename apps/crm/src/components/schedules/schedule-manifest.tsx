"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Printer,
  Mail,
  User,
  Phone,
  MessageSquare,
  Utensils,
  Accessibility,
  FileText,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react";

interface ScheduleManifestProps {
  scheduleId: string;
}

export function ScheduleManifest({ scheduleId }: ScheduleManifestProps) {
  const { data: manifest, isLoading, error } = trpc.manifest.getForSchedule.useQuery({
    scheduleId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleEmailGuide = () => {
    if (manifest?.guide) {
      window.location.href = `mailto:${manifest.guide.email}?subject=Manifest for ${manifest.tour.name} - ${format(new Date(manifest.schedule.startsAt), "MMMM d, yyyy")}`;
    }
  };

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
        <p className="text-destructive">Error loading manifest: {error.message}</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Manifest not found</p>
      </div>
    );
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      pending: "status-pending",
      partial: "bg-warning/20 text-warning",
      paid: "status-confirmed",
      refunded: "bg-muted text-muted-foreground",
      failed: "status-cancelled",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons - Hide on print */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print Manifest
        </button>
        {manifest.guide && (
          <button
            onClick={handleEmailGuide}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email to Guide
          </button>
        )}
      </div>

      {/* Manifest Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{manifest.tour.name}</h2>
            <p className="text-muted-foreground mt-1">
              Tour Manifest - {format(new Date(manifest.schedule.startsAt), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              manifest.schedule.status === "scheduled"
                ? "bg-primary/10 text-primary"
                : manifest.schedule.status === "in_progress"
                ? "status-pending"
                : manifest.schedule.status === "completed"
                ? "status-completed"
                : "status-cancelled"
            }`}
          >
            {manifest.schedule.status === "in_progress" ? "In Progress" : manifest.schedule.status}
          </span>
        </div>

        {/* Schedule Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-semibold text-foreground">
                {format(new Date(manifest.schedule.startsAt), "h:mm a")} -{" "}
                {format(new Date(manifest.schedule.endsAt), "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Users className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-semibold text-foreground">
                {manifest.summary.totalParticipants} / {manifest.schedule.maxParticipants}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="font-semibold text-foreground">
                ${parseFloat(manifest.summary.totalRevenue).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Calendar className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bookings</p>
              <p className="font-semibold text-foreground">{manifest.summary.totalBookings}</p>
            </div>
          </div>
        </div>

        {/* Guide Info */}
        {manifest.guide && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Assigned Guide</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {manifest.guide.firstName} {manifest.guide.lastName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{manifest.guide.email}</span>
              </div>
              {manifest.guide.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{manifest.guide.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meeting Point */}
        {manifest.schedule.meetingPoint && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Meeting Point</h3>
                <p className="text-muted-foreground mt-1">{manifest.schedule.meetingPoint}</p>
                {manifest.schedule.meetingPointDetails && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {manifest.schedule.meetingPointDetails}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participants Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Participants</h3>
        </div>

        {manifest.bookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No confirmed bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ref #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Special Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {manifest.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground">
                        {booking.referenceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{booking.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{booking.customerEmail}</span>
                        </div>
                        {booking.customerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{booking.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {booking.adultCount > 0 && <div>{booking.adultCount} Adult(s)</div>}
                        {booking.childCount > 0 && <div>{booking.childCount} Child(ren)</div>}
                        {booking.infantCount > 0 && <div>{booking.infantCount} Infant(s)</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(
                            booking.paymentStatus
                          )}`}
                        >
                          {booking.paymentStatus}
                        </span>
                        <div className="text-sm text-foreground">
                          ${parseFloat(booking.total).toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 max-w-md">
                        {booking.specialRequests && (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{booking.specialRequests}</span>
                          </div>
                        )}
                        {booking.dietaryRequirements && (
                          <div className="flex items-start gap-2">
                            <Utensils className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {booking.dietaryRequirements}
                            </span>
                          </div>
                        )}
                        {booking.accessibilityNeeds && (
                          <div className="flex items-start gap-2">
                            <Accessibility className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {booking.accessibilityNeeds}
                            </span>
                          </div>
                        )}
                        {booking.internalNotes && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground italic">
                              {booking.internalNotes}
                            </span>
                          </div>
                        )}
                        {booking.participants.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold text-foreground mb-2">
                              Individual Participants:
                            </p>
                            <div className="space-y-1">
                              {booking.participants.map((participant) => (
                                <div
                                  key={participant.id}
                                  className="text-xs text-muted-foreground flex items-center gap-2"
                                >
                                  <span className="font-medium">
                                    {participant.firstName} {participant.lastName}
                                  </span>
                                  <span className="text-muted-foreground">({participant.type})</span>
                                  {participant.email && (
                                    <span className="text-muted-foreground">{participant.email}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Footer */}
        {manifest.bookings.length > 0 && (
          <div className="px-6 py-4 bg-muted border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-lg font-semibold text-foreground">
                    {manifest.summary.totalBookings}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-lg font-semibold text-foreground">
                    {manifest.summary.totalParticipants}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${parseFloat(manifest.summary.totalRevenue).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
