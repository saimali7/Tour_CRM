"use client";

import { format } from "date-fns";
import { CheckCircle, Calendar, Clock, MapPin, Mail, Download, Share2 } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

interface BookingConfirmationProps {
  organizationName: string;
}

function formatTime(time: string): string {
  // time is in HH:MM format
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

// Calculate end time based on tour duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours! * 60 + minutes! + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

export function BookingConfirmation({ organizationName }: BookingConfirmationProps) {
  const { state, reset } = useBooking();

  const handleAddToCalendar = () => {
    if (!state.bookingDate || !state.bookingTime || !state.tour) return;

    // Create start and end dates from booking date and time
    const [hours, minutes] = state.bookingTime.split(":").map(Number);
    const startDate = new Date(state.bookingDate);
    startDate.setHours(hours!, minutes!, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + state.tour.durationMinutes);

    // Create ICS file content
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

    // Download ICS file
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${state.referenceNumber}.ics`;
    link.click();
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
        await navigator.clipboard.writeText(
          `${shareData.text} Check it out: ${shareData.url}`
        );
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled share dialog or clipboard error - expected behavior
      console.debug("Share action cancelled or failed:", error);
    }
  };

  if (!state.tour || !state.bookingDate || !state.bookingTime || !state.referenceNumber) {
    return null;
  }

  const endTime = calculateEndTime(state.bookingTime, state.tour.durationMinutes);

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-muted-foreground">
          Thank you for your booking. A confirmation email has been sent to{" "}
          <span className="font-medium">{state.customer?.email}</span>.
        </p>
      </div>

      {/* Reference Number */}
      <div className="p-4 rounded-lg bg-muted/50 inline-block">
        <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
        <p className="text-2xl font-mono font-bold tracking-wider">
          {state.referenceNumber}
        </p>
      </div>

      {/* Booking Details */}
      <div className="text-left p-6 rounded-lg border bg-card space-y-4">
        <h3 className="font-semibold text-lg">{state.tour.name}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(state.bookingDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(state.bookingTime)} - {formatTime(endTime)}
              </p>
            </div>
          </div>

          {state.tour.meetingPoint && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Meeting Point</p>
                <p className="text-sm text-muted-foreground">{state.tour.meetingPoint}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Lead Contact</p>
              <p className="text-sm text-muted-foreground">
                {state.customer?.firstName} {state.customer?.lastName}
              </p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="pt-4 border-t">
          <p className="font-medium mb-2">Participants</p>
          <p className="text-sm text-muted-foreground">
            {state.participants.length} participant
            {state.participants.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Payment Summary */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-semibold">{formatPrice(state.total, state.currency)}</span>
          </div>
          {state.total === 0 && (
            <p className="text-xs text-green-600">Free booking - no payment required</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={handleAddToCalendar} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Add to Calendar
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      {/* What's Next */}
      <div className="text-left p-6 rounded-lg border bg-muted/30 space-y-3">
        <h4 className="font-semibold">What&apos;s Next?</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Check your email for the confirmation with full details</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Add the tour to your calendar so you don&apos;t forget</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>
              Arrive at the meeting point 10-15 minutes before the start time
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Bring your booking reference: {state.referenceNumber}</span>
          </li>
        </ul>
      </div>

      {/* Back to Tours */}
      <div className="pt-4">
        <Button asChild onClick={() => reset()}>
          <a href="/">Browse More Tours</a>
        </Button>
      </div>

      {/* Support */}
      <p className="text-sm text-muted-foreground">
        Questions about your booking?{" "}
        <a href="/contact" className="text-primary hover:underline">
          Contact us
        </a>
      </p>
    </div>
  );
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
