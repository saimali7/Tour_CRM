"use client";

import { format } from "date-fns";
import { useRef } from "react";
import { CheckCircle, Calendar, Clock, MapPin, Mail, Download, Share2, FileText } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

interface BookingConfirmationProps {
  organizationName: string;
  organizationSlug: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours! * 60 + minutes! + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

export function BookingConfirmation({ organizationName, organizationSlug }: BookingConfirmationProps) {
  const { state, reset } = useBooking();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleAddToCalendar = () => {
    if (!state.bookingDate || !state.bookingTime || !state.tour) return;

    const [hours, minutes] = state.bookingTime.split(":").map(Number);
    const startDate = new Date(state.bookingDate);
    startDate.setHours(hours!, minutes!, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + state.tour.durationMinutes);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tour Platform//Booking//EN
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${state.tour.name}
DESCRIPTION:Booking reference: ${state.referenceNumber}\\nOrganized by ${organizationName}
LOCATION:${state.tour.meetingPoint || ""}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${state.referenceNumber}.ics`;
    link.click();
  };

  const handleDownloadReceipt = () => {
    if (!state.tour || !state.bookingDate || !state.bookingTime || !state.referenceNumber) return;

    const endTimeStr = calculateEndTime(state.bookingTime, state.tour.durationMinutes);
    const participantSummary = (() => {
      const adults = state.participants.filter((p) => p.type === "adult").length;
      const children = state.participants.filter((p) => p.type === "child").length;
      const infants = state.participants.filter((p) => p.type === "infant").length;
      const parts: string[] = [];
      if (adults > 0) parts.push(`${adults} Adult(s)`);
      if (children > 0) parts.push(`${children} Child(ren)`);
      if (infants > 0) parts.push(`${infants} Infant(s)`);
      return parts.join(", ");
    })();

    const lines = [
      `BOOKING CONFIRMATION`,
      `${"=".repeat(48)}`,
      ``,
      `Reference:    ${state.referenceNumber}`,
      `Tour:         ${state.tour.name}`,
      `Date:         ${formatDate(state.bookingDate)}`,
      `Time:         ${formatTime(state.bookingTime)} - ${formatTime(endTimeStr)}`,
      ...(state.tour.meetingPoint ? [`Meeting Point: ${state.tour.meetingPoint}`] : []),
      ``,
      `${"─".repeat(48)}`,
      `Lead Contact: ${state.customer?.firstName} ${state.customer?.lastName}`,
      `Email:        ${state.customer?.email}`,
      `Participants: ${participantSummary}`,
      ...(state.selectedAddOns.length > 0
        ? [`Add-ons:      ${state.selectedAddOns.map((a) => `${a.name} x${a.quantity}`).join(", ")}`]
        : []),
      ``,
      `${"─".repeat(48)}`,
      `Total Paid:   ${formatPrice(state.total, state.currency)}`,
      ``,
      `${"=".repeat(48)}`,
      `Organized by ${organizationName}`,
      ``,
      `Arrive 10-15 minutes before departure time.`,
      `Keep this reference handy: ${state.referenceNumber}`,
    ];

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${state.referenceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleShare = async () => {
    if (!state.tour) return;

    const shareData = {
      title: `Booked: ${state.tour.name}`,
      text: `I just booked ${state.tour.name} with ${organizationName}!`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} Check it out: ${shareData.url}`);
      }
    } catch (error) {
      console.debug("Share action cancelled or failed:", error);
    }
  };

  if (!state.tour || !state.bookingDate || !state.bookingTime || !state.referenceNumber) {
    return null;
  }

  const endTime = calculateEndTime(state.bookingTime, state.tour.durationMinutes);

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-center">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)]" />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A confirmation email has been sent to <span className="font-medium">{state.customer?.email}</span>.
          </p>
        </div>
      </div>

      <div className="inline-block rounded-lg bg-muted/50 p-4">
        <p className="mb-1 text-sm text-muted-foreground">Booking Reference</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{state.referenceNumber}</p>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-6 text-left">
        <h3 className="text-lg font-semibold">{state.tour.name}</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Date</p>
              <p className="text-sm text-muted-foreground">{formatDate(state.bookingDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(state.bookingTime)} - {formatTime(endTime)}
              </p>
            </div>
          </div>

          {state.tour.meetingPoint && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Meeting Point</p>
                <p className="text-sm text-muted-foreground">{state.tour.meetingPoint}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Lead Contact</p>
              <p className="text-sm text-muted-foreground">
                {state.customer?.firstName} {state.customer?.lastName}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-2 font-medium">Participants</p>
          <p className="text-sm text-muted-foreground">
            {state.participants.length} participant{state.participants.length !== 1 ? "s" : ""}
          </p>
          {state.selectedAddOns.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Add-ons: {state.selectedAddOns.map((item) => `${item.name} x ${item.quantity}`).join(", ")}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-semibold">{formatPrice(state.total, state.currency)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={handleAddToCalendar} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Add to Calendar
        </Button>
        <Button onClick={handleDownloadReceipt} variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Download Receipt
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-6 text-left">
        <h4 className="font-semibold">What&apos;s next?</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Check your inbox for full tour instructions and meeting-point details.</li>
          <li>Arrive 10-15 minutes before departure time.</li>
          <li>Keep your reference handy: {state.referenceNumber}</li>
        </ul>
      </div>

      <div className="pt-2">
        <Button asChild onClick={() => reset()}>
          <a href={`/org/${organizationSlug}`}>Browse More Tours</a>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Questions about your booking?{" "}
        <a href={`/org/${organizationSlug}/contact`} className="text-primary hover:underline">
          Contact us
        </a>
      </p>
    </div>
  );
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
