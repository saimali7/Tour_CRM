"use client";

import { trpc } from "@/lib/trpc";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Printer,
  Share2,
  User,
  Phone,
  Mail,
  ChefHat,
  Accessibility,
  FileText,
  CheckSquare,
  Square,
  Loader2,
  Calendar,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

export default function TourRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Get tour run identifiers from query params
  const tourId = searchParams.get("tourId");
  const dateStr = searchParams.get("date");
  const time = searchParams.get("time");

  // Parse date
  const date = dateStr ? parseISO(dateStr) : null;

  // Fetch manifest data
  const {
    data: manifest,
    isLoading,
    error,
    refetch,
  } = trpc.tourRun.getManifest.useQuery(
    {
      tourId: tourId!,
      date: date!,
      time: time!,
    },
    {
      enabled: !!tourId && !!date && !!time,
      refetchInterval: 30000, // Refresh every 30s for live updates
    }
  );

  // Check-in mutation
  const utils = trpc.useUtils();
  const checkInMutation = trpc.checkIn.checkInParticipant.useMutation({
    onSuccess: () => {
      utils.tourRun.getManifest.invalidate();
      toast.success("Participant checked in");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Share handler
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: `Manifest: ${manifest?.tourRun.tourName}`,
        text: `Tour manifest for ${manifest?.tourRun.tourName} on ${dateStr} at ${time}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error or missing params
  if (!tourId || !date || !time) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Invalid tour run</p>
            <p className="text-sm text-destructive/70">
              Missing tour ID, date, or time parameter.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/org/${slug}` as Route)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Today
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load manifest</p>
            <p className="text-sm text-destructive/70">{error.message}</p>
          </div>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">No bookings found</p>
        <p className="text-sm text-muted-foreground mt-1">
          There are no bookings for this tour run yet.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/org/${slug}` as Route)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Today
        </Button>
      </div>
    );
  }

  const { tourRun, summary, bookings, guides } = manifest;
  const checkInProgress = (summary.checkedInCount / summary.totalParticipants) * 100;
  const hasSpecialNeeds = bookings.some(
    (b) => b.dietaryRequirements || b.accessibilityNeeds || b.specialRequests
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hidden on print */}
      <header className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </header>

      {/* Tour Run Header */}
      <div className="rounded-xl border border-border bg-card p-6 print:border-0 print:p-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {tourRun.tourName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(parseISO(tourRun.date), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {tourRun.time} ({tourRun.durationMinutes} min)
              </span>
              {tourRun.meetingPoint && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {tourRun.meetingPoint}
                </span>
              )}
            </div>
          </div>

          {/* Check-in Progress */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Check-in Progress</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {summary.checkedInCount}/{summary.totalParticipants}
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${checkInProgress} 100`}
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {Math.round(checkInProgress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Participants</span>
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {summary.totalParticipants}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({summary.adults}A {summary.children > 0 && `${summary.children}C `}
                {summary.infants > 0 && `${summary.infants}I`})
              </span>
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">Bookings</span>
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {summary.totalBookings}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Guides</span>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {guides.length > 0 ? (
                guides.map((g) => g.firstName).join(", ")
              ) : (
                <span className="text-destructive">Unassigned</span>
              )}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Checked In</span>
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {summary.checkedInCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                of {summary.totalParticipants}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Special Notes Alert */}
      {hasSpecialNeeds && (
        <div className="rounded-lg border border-warning bg-warning dark:border-warning/50 dark:bg-warning/30 p-4 print:bg-warning">
          <h3 className="text-sm font-semibold text-warning dark:text-warning flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4" />
            Special Requirements
          </h3>
          <div className="space-y-2">
            {bookings
              .filter((b) => b.dietaryRequirements || b.accessibilityNeeds || b.specialRequests)
              .map((booking) => (
                <div key={booking.id} className="text-sm">
                  <span className="font-medium text-warning dark:text-warning">
                    {booking.customer.name}:
                  </span>
                  <ul className="ml-4 mt-1 space-y-0.5 text-warning dark:text-warning">
                    {booking.dietaryRequirements && (
                      <li className="flex items-center gap-1.5">
                        <ChefHat className="h-3 w-3" />
                        {booking.dietaryRequirements}
                      </li>
                    )}
                    {booking.accessibilityNeeds && (
                      <li className="flex items-center gap-1.5">
                        <Accessibility className="h-3 w-3" />
                        {booking.accessibilityNeeds}
                      </li>
                    )}
                    {booking.specialRequests && (
                      <li className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        {booking.specialRequests}
                      </li>
                    )}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Manifest Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden print:border print:rounded-none">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Manifest
          </h2>
        </div>
        <div className="divide-y divide-border">
          {bookings.map((booking, bookingIndex) => (
            <div key={booking.id} className="p-4">
              {/* Booking Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {bookingIndex + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/org/${slug}/customers/${booking.customer.id}` as Route}
                        className="font-medium text-foreground hover:text-primary transition-colors print:no-underline"
                      >
                        {booking.customer.name}
                      </Link>
                      <Badge
                        variant={
                          booking.status === "confirmed"
                            ? "success"
                            : booking.status === "pending"
                            ? "warning"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {booking.status}
                      </Badge>
                      <Badge
                        variant={
                          booking.paymentStatus === "paid"
                            ? "success"
                            : booking.paymentStatus === "partial"
                            ? "warning"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {booking.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{booking.referenceNumber}</span>
                      {booking.customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {booking.customer.phone}
                        </span>
                      )}
                      {booking.customer.email && (
                        <span className="flex items-center gap-1 print:hidden">
                          <Mail className="h-3 w-3" />
                          {booking.customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {booking.participants.length} participant
                  {booking.participants.length !== 1 && "s"}
                </div>
              </div>

              {/* Participants List */}
              <div className="ml-11 space-y-1">
                {booking.participants.map((participant) => {
                  const isCheckedIn = participant.checkedIn === "checked_in";
                  return (
                    <div
                      key={participant.id}
                      className={cn(
                        "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                        isCheckedIn
                          ? "bg-success dark:bg-success/30"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (!isCheckedIn) {
                              checkInMutation.mutate({
                                participantId: participant.id,
                                status: "yes",
                              });
                            }
                          }}
                          disabled={isCheckedIn || checkInMutation.isPending}
                          className={cn(
                            "flex-shrink-0 transition-colors print:hidden",
                            isCheckedIn
                              ? "text-success cursor-default"
                              : "text-muted-foreground hover:text-primary cursor-pointer"
                          )}
                        >
                          {isCheckedIn ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                        {/* Print checkbox */}
                        <span className="hidden print:inline-block w-4 h-4 border border-border rounded-sm" />
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCheckedIn && "text-success dark:text-success"
                            )}
                          >
                            {participant.firstName} {participant.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {participant.type}
                            </Badge>
                            {participant.dietaryRequirements && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <ChefHat className="h-3 w-3 text-warning" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {participant.dietaryRequirements}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {participant.accessibilityNeeds && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Accessibility className="h-3 w-3 text-info" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {participant.accessibilityNeeds}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                      {isCheckedIn && participant.checkedInAt && (
                        <span className="text-xs text-success dark:text-success tabular-nums">
                          {format(new Date(participant.checkedInAt), "h:mm a")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Booking Notes */}
              {booking.internalNotes && (
                <div className="ml-11 mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                  <span className="font-medium">Notes:</span> {booking.internalNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Guides Section */}
      {guides.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
            Assigned Guides
          </h3>
          <div className="flex flex-wrap gap-4">
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

      {/* Meeting Point Details */}
      {tourRun.meetingPointDetails && (
        <div className="rounded-xl border border-border bg-card p-4 print:border print:rounded-none">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Meeting Point Details
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {tourRun.meetingPointDetails}
          </p>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t">
        Printed on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")} | Tour CRM
      </div>
    </div>
  );
}
