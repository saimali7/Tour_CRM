"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Users,
  Cake,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingWithCustomer } from "./timeline/types";

// =============================================================================
// TYPES
// =============================================================================

export interface GuestCardBooking {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  guestCount: number;
  adultCount: number;
  childCount?: number | null;
  pickupLocation?: string | null;
  pickupAddress?: string | null;
  pickupTime?: string | null;
  pickupZoneColor?: string | null;
  pickupZoneName?: string | null;
  specialOccasion?: string | null;
  specialRequests?: string | null;
  dietaryRequirements?: string | null;
  accessibilityNeeds?: string | null;
  tourName: string;
  tourTime: string;
  status: string;
  paymentStatus: string;
  total: string;
  currency: string;
}

export interface GuestCardProps {
  /**
   * Whether the sheet is open
   */
  open: boolean;

  /**
   * Callback when the sheet should close
   */
  onClose: () => void;

  /**
   * The booking to display
   */
  booking: GuestCardBooking | null;

  /**
   * Optional callback when "View Booking" is clicked
   */
  onViewBooking?: (bookingId: string) => void;
}

// =============================================================================
// PAYMENT STATUS STYLES
// =============================================================================

const paymentStatusStyles: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
  paid: { variant: "success", label: "Paid" },
  partial: { variant: "warning", label: "Partial" },
  pending: { variant: "secondary", label: "Pending" },
  refunded: { variant: "destructive", label: "Refunded" },
  failed: { variant: "destructive", label: "Failed" },
};

// =============================================================================
// GUEST CARD COMPONENT
// =============================================================================

/**
 * Guest Card
 *
 * A slide-over panel showing comprehensive guest/booking details.
 * Appears when clicking on a pickup segment in the timeline.
 *
 * Displays:
 * - Customer name and reference number
 * - Special occasion banner (if applicable)
 * - Contact information with click-to-call/email
 * - Pickup location and time
 * - Tour details and guest count
 * - Special requirements (dietary, accessibility, requests)
 * - Payment status
 * - Quick action buttons
 */
export function GuestCard({
  open,
  onClose,
  booking,
  onViewBooking,
}: GuestCardProps) {
  if (!booking) return null;

  const paymentStyle = paymentStatusStyles[booking.paymentStatus] || {
    variant: "secondary" as const,
    label: booking.paymentStatus,
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto sm:w-[480px]">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-3">
            {booking.pickupZoneColor && (
              <div
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: booking.pickupZoneColor }}
                aria-hidden="true"
              />
            )}
            <SheetTitle className="text-lg">{booking.customerName}</SheetTitle>
          </div>
          <SheetDescription className="font-mono text-sm">
            {booking.referenceNumber}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Special Occasion Banner */}
          {booking.specialOccasion && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-3",
                "border border-amber-500/20 bg-amber-500/10"
              )}
              role="status"
              aria-label={`Special occasion: ${booking.specialOccasion}`}
            >
              <Cake className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {booking.specialOccasion}
              </span>
            </div>
          )}

          {/* Contact Info */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Contact
            </h4>
            <div className="space-y-2">
              {booking.customerPhone && (
                <a
                  href={`tel:${booking.customerPhone}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="hover:underline">{booking.customerPhone}</span>
                </a>
              )}
              {booking.customerEmail && (
                <a
                  href={`mailto:${booking.customerEmail}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate hover:underline">{booking.customerEmail}</span>
                </a>
              )}
              {!booking.customerPhone && !booking.customerEmail && (
                <p className="text-sm text-muted-foreground">No contact information available</p>
              )}
            </div>
          </section>

          {/* Pickup Info */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Pickup
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {booking.pickupLocation || "No pickup location"}
                  </p>
                  {booking.pickupAddress && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {booking.pickupAddress}
                    </p>
                  )}
                  {booking.pickupZoneName && booking.pickupZoneName !== booking.pickupLocation && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {booking.pickupZoneColor && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: booking.pickupZoneColor }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {booking.pickupZoneName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {booking.pickupTime && (
                <div className="mt-3 flex items-center gap-3 border-t pt-3">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-mono text-sm font-medium">{booking.pickupTime}</span>
                </div>
              )}
            </div>
          </section>

          {/* Tour Info */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Tour
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{booking.tourName}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {booking.tourTime}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>
                  {booking.guestCount} guest{booking.guestCount !== 1 ? "s" : ""}
                  <span className="mx-1.5 text-muted-foreground/50">-</span>
                  {booking.adultCount} adult{booking.adultCount !== 1 ? "s" : ""}
                  {booking.childCount && booking.childCount > 0 && (
                    <>, {booking.childCount} child{booking.childCount !== 1 ? "ren" : ""}</>
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Special Requirements */}
          {(booking.specialRequests || booking.dietaryRequirements || booking.accessibilityNeeds) && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Special Requirements
              </h4>
              <div className="space-y-2">
                {booking.specialRequests && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="font-medium text-muted-foreground">Requests: </span>
                    <span className="italic">{booking.specialRequests}</span>
                  </div>
                )}
                {booking.dietaryRequirements && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="font-medium text-muted-foreground">Dietary: </span>
                    {booking.dietaryRequirements}
                  </div>
                )}
                {booking.accessibilityNeeds && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="font-medium text-muted-foreground">Accessibility: </span>
                    {booking.accessibilityNeeds}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Payment Status */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Payment
            </h4>
            <div className="flex items-center justify-between">
              <Badge variant={paymentStyle.variant}>{paymentStyle.label}</Badge>
              <span className="font-mono font-medium">
                {booking.currency} {booking.total}
              </span>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            {booking.customerPhone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
              >
                <a href={`tel:${booking.customerPhone}`}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                  Call
                </a>
              </Button>
            )}
            {booking.customerEmail && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
              >
                <a href={`mailto:${booking.customerEmail}`}>
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                  Email
                </a>
              </Button>
            )}
            {onViewBooking && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewBooking(booking.id)}
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                View Booking
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

GuestCard.displayName = "GuestCard";
