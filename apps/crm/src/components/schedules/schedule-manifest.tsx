"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { useState } from "react";
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
  CheckCircle,
  XCircle,
  UserMinus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ScheduleManifestProps {
  scheduleId: string;
}

export function ScheduleManifest({ scheduleId }: ScheduleManifestProps) {
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: manifest, isLoading, error } = trpc.manifest.getForSchedule.useQuery({
    scheduleId,
  });

  const { data: checkInStatus, refetch: refetchCheckIn } = trpc.checkIn.getScheduleCheckInStatus.useQuery(
    { scheduleId },
    { enabled: !!scheduleId }
  );

  const checkInMutation = trpc.checkIn.checkInParticipant.useMutation({
    onSuccess: () => {
      refetchCheckIn();
      utils.manifest.getForSchedule.invalidate({ scheduleId });
      toast.success("Participant checked in");
    },
    onError: (error) => {
      toast.error(`Failed to check in: ${error.message}`);
    },
    onSettled: () => {
      setCheckingIn(null);
    },
  });

  const noShowMutation = trpc.checkIn.markNoShow.useMutation({
    onSuccess: () => {
      refetchCheckIn();
      utils.manifest.getForSchedule.invalidate({ scheduleId });
      toast.success("Marked as no-show");
    },
    onError: (error) => {
      toast.error(`Failed to mark no-show: ${error.message}`);
    },
    onSettled: () => {
      setCheckingIn(null);
    },
  });

  const undoCheckInMutation = trpc.checkIn.undoCheckIn.useMutation({
    onSuccess: () => {
      refetchCheckIn();
      utils.manifest.getForSchedule.invalidate({ scheduleId });
      toast.success("Check-in undone");
    },
    onError: (error) => {
      toast.error(`Failed to undo check-in: ${error.message}`);
    },
    onSettled: () => {
      setCheckingIn(null);
    },
  });

  const bulkCheckInMutation = trpc.checkIn.checkInAllForBooking.useMutation({
    onSuccess: () => {
      refetchCheckIn();
      utils.manifest.getForSchedule.invalidate({ scheduleId });
      toast.success("All participants checked in");
    },
    onError: (error) => {
      toast.error(`Failed to check in: ${error.message}`);
    },
  });

  const handleCheckIn = (participantId: string) => {
    setCheckingIn(participantId);
    checkInMutation.mutate({ participantId });
  };

  const handleNoShow = (participantId: string) => {
    setCheckingIn(participantId);
    noShowMutation.mutate({ participantId });
  };

  const handleUndoCheckIn = (participantId: string) => {
    setCheckingIn(participantId);
    undoCheckInMutation.mutate({ participantId });
  };

  const handleBulkCheckIn = (bookingId: string) => {
    bulkCheckInMutation.mutate({ bookingId });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailGuide = () => {
    if (manifest?.guides && manifest.guides.length > 0) {
      const emails = manifest.guides.map(g => g.email).filter(Boolean).join(',');
      window.location.href = `mailto:${emails}?subject=Manifest for ${manifest.tour.name} - ${format(new Date(manifest.schedule.startsAt), "MMMM d, yyyy")}`;
    }
  };

  const getParticipantCheckInStatus = (participantId: string) => {
    return checkInStatus?.participants.find((p: { id: string }) => p.id === participantId);
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
      <div className="flex items-center justify-between print:hidden">
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Manifest
          </button>
          {manifest.guides.length > 0 && (
            <button
              onClick={handleEmailGuide}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email to Guide{manifest.guides.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Check-in Progress */}
        {checkInStatus && checkInStatus.total > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {checkInStatus.checkedIn} / {checkInStatus.total} checked in
              </p>
              <p className="text-xs text-muted-foreground">
                {checkInStatus.noShows > 0 && `${checkInStatus.noShows} no-show(s)`}
                {checkInStatus.noShows > 0 && checkInStatus.pending > 0 && " • "}
                {checkInStatus.pending > 0 && `${checkInStatus.pending} pending`}
              </p>
            </div>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${checkInStatus.percentComplete}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">
              {checkInStatus.percentComplete}%
            </span>
          </div>
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
        {manifest.guides.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Assigned Guide{manifest.guides.length > 1 ? 's' : ''}</h3>
            <div className="space-y-3">
              {manifest.guides.map((guide) => (
                <div key={guide.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {guide.firstName} {guide.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{guide.email}</span>
                  </div>
                  {guide.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{guide.phone}</span>
                    </div>
                  )}
                </div>
              ))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider print:hidden">
                    Check-in
                  </th>
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
                {manifest.bookings.map((booking) => {
                  // Get check-in status for all participants in this booking
                  const bookingParticipants = booking.participants.map((p) => ({
                    ...p,
                    checkInStatus: getParticipantCheckInStatus(p.id),
                  }));
                  const allCheckedIn = bookingParticipants.length > 0 &&
                    bookingParticipants.every((p) => p.checkInStatus?.checkedIn === "yes");
                  const someCheckedIn = bookingParticipants.some((p) => p.checkInStatus?.checkedIn === "yes");
                  const someNoShow = bookingParticipants.some((p) => p.checkInStatus?.checkedIn === "no_show");

                  return (
                  <tr key={booking.id} className="hover:bg-muted/50">
                    {/* Check-in Cell */}
                    <td className="px-6 py-4 print:hidden">
                      <div className="space-y-2">
                        {/* Booking-level quick check-in */}
                        {booking.participants.length > 0 && !allCheckedIn && (
                          <button
                            onClick={() => handleBulkCheckIn(booking.id)}
                            disabled={bulkCheckInMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-xs font-medium rounded hover:bg-success/20 transition-colors disabled:opacity-50"
                          >
                            {bulkCheckInMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Check in all
                          </button>
                        )}

                        {/* Status indicator */}
                        {allCheckedIn && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-xs font-medium rounded">
                            <CheckCircle className="h-3 w-3" />
                            All checked in
                          </span>
                        )}

                        {/* Individual participant check-ins */}
                        {booking.participants.length > 0 && (
                          <div className="space-y-1">
                            {bookingParticipants.map((participant) => {
                              const status = participant.checkInStatus?.checkedIn;
                              const isChecking = checkingIn === participant.id;

                              return (
                                <div key={participant.id} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground truncate max-w-[100px]">
                                    {participant.firstName}
                                  </span>
                                  {status === "yes" ? (
                                    <button
                                      onClick={() => handleUndoCheckIn(participant.id)}
                                      disabled={isChecking}
                                      className="text-success hover:text-success/80 disabled:opacity-50"
                                      title="Undo check-in"
                                    >
                                      {isChecking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </button>
                                  ) : status === "no_show" ? (
                                    <button
                                      onClick={() => handleUndoCheckIn(participant.id)}
                                      disabled={isChecking}
                                      className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                                      title="Undo no-show"
                                    >
                                      {isChecking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <UserMinus className="h-4 w-4" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleCheckIn(participant.id)}
                                        disabled={isChecking}
                                        className="p-1 text-muted-foreground hover:text-success hover:bg-success/10 rounded disabled:opacity-50"
                                        title="Check in"
                                      >
                                        {isChecking ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleNoShow(participant.id)}
                                        disabled={isChecking}
                                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                                        title="Mark no-show"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Legacy: If no participants, show booking-level status */}
                        {booking.participants.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No participants</span>
                        )}
                      </div>
                    </td>
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
                  );
                })}
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
