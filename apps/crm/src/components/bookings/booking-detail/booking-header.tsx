"use client";

import { forwardRef, useState } from "react";
import { ArrowLeft, Edit, Calendar, Clock, Users, MapPin, Copy, Check, Phone } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@tour/ui";
import { cn } from "@/lib/utils";
import { QuickContactMenu } from "./quick-contact-menu";
import { UrgencyBadgeLarge, UrgencyBadge } from "@/components/ui/urgency-badge";
import type { BookingData, PrimaryAction, UrgencyLevel } from "./types";

interface BookingHeaderProps {
  booking: BookingData;
  orgSlug: string;
  urgency: UrgencyLevel | null;
  primaryAction: PrimaryAction | null;
  onBack: () => void;
  className?: string;
}

/**
 * Booking Header
 *
 * Customer-first header design that prioritizes:
 * 1. WHO - Customer name (largest, most prominent)
 * 2. WHEN - Date/time with urgency indicator
 * 3. WHAT - Quick context about the booking
 * 4. ACTIONS - Primary action + contact + edit
 *
 * Design Principles:
 * - Customer name is the PRIMARY visual element
 * - Tour name is secondary context
 * - Contact info is immediately actionable
 * - Urgency is visually prominent when relevant
 */
export const BookingHeader = forwardRef<HTMLElement, BookingHeaderProps>(function BookingHeader({
  booking,
  orgSlug,
  urgency,
  primaryAction,
  onBack,
  className,
}, ref) {
  const [copied, setCopied] = useState(false);
  const customer = booking.customer;
  const schedule = booking.schedule;
  const tour = booking.tour;

  const copyReferenceNumber = async () => {
    await navigator.clipboard.writeText(booking.referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };


  // Primary action button styling
  const getPrimaryActionStyle = (variant: PrimaryAction["variant"]) => {
    switch (variant) {
      case "confirm":
        return "bg-success hover:bg-success text-success-foreground shadow-lg shadow-success/25";
      case "complete":
        return "bg-info hover:bg-info text-info-foreground shadow-lg shadow-info/25";
      case "refund":
        return "bg-warning hover:bg-warning text-warning-foreground shadow-lg shadow-warning/25";
      default:
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
  };

  return (
    <header ref={ref} className={cn("space-y-4", className)}>
      {/* Main Header Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: Back + Customer Info */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex-shrink-0 p-2.5 -ml-2.5 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Customer Info - Primary Focus */}
          <div className="min-w-0 flex-1">
            {/* 1. Customer Name - LARGEST, PRIMARY FOCUS */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
              {customer?.firstName} {customer?.lastName}
            </h1>

            {/* 2. Phone & Email - Secondary, immediately actionable */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {customer.phone}
                </a>
              )}
              {customer?.phone && customer?.email && (
                <span className="text-muted-foreground/40 select-none" aria-hidden="true">|</span>
              )}
              {customer?.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors truncate max-w-[220px]"
                >
                  {customer.email}
                </a>
              )}
            </div>

            {/* 3. Reference Number - Tertiary, clickable to copy */}
            <button
              onClick={copyReferenceNumber}
              className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 -ml-2 rounded-md text-xs font-mono text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 transition-all group"
              title="Click to copy"
            >
              <span>{booking.referenceNumber}</span>
              {copied ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="h-3 w-3" />
                  <span className="text-[10px] font-sans font-medium">Copied!</span>
                </span>
              ) : (
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Urgency Badge - Desktop */}
          {urgency && (
            <div className="hidden lg:block mr-1">
              <UrgencyBadgeLarge type={urgency.type} label={urgency.label} />
            </div>
          )}

          {/* Primary Action */}
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className={cn(
                "gap-2 font-semibold min-h-[44px] min-w-[44px] transition-all duration-150",
                "active:scale-[0.98]",
                getPrimaryActionStyle(primaryAction.variant),
                primaryAction.loading && "cursor-not-allowed"
              )}
            >
              {primaryAction.loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline opacity-70">{primaryAction.label}</span>
                </>
              ) : (
                <>
                  <primaryAction.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{primaryAction.label}</span>
                </>
              )}
            </Button>
          )}

          {/* Contact Menu */}
          {customer && (
            <QuickContactMenu
              customerName={`${customer.firstName} ${customer.lastName}`}
              phone={customer.phone}
              email={customer.email}
            />
          )}

          {/* Edit Button */}
          <Button variant="outline" size="icon" asChild>
            <Link href={`/org/${orgSlug}/bookings/${booking.id}/edit` as Route}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Context Row: Tour + Time + Guests */}
      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2 text-sm">
        {/* Urgency Badge - Mobile */}
        {urgency && (
          <div className="lg:hidden mr-1">
            <UrgencyBadge type={urgency.type} label={urgency.label} />
          </div>
        )}

        {/* Tour Name */}
        {tour && (
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate max-w-[200px] sm:max-w-none">{tour.name}</span>
          </div>
        )}

        {/* Divider */}
        {tour && schedule && (
          <span className="hidden sm:block h-4 w-px bg-border" aria-hidden="true" />
        )}

        {/* Date */}
        {schedule && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formatDate(schedule.startsAt)}</span>
          </div>
        )}

        {/* Divider */}
        {schedule && (
          <span className="hidden sm:block h-4 w-px bg-border" aria-hidden="true" />
        )}

        {/* Time */}
        {schedule && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{formatTime(schedule.startsAt)}</span>
          </div>
        )}

        {/* Divider */}
        <span className="hidden sm:block h-4 w-px bg-border" aria-hidden="true" />

        {/* Guest Count */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>
            {booking.totalParticipants} guest{booking.totalParticipants !== 1 ? "s" : ""}
          </span>
        </div>

        {/* View Customer Profile Link */}
        {customer && (
          <Link
            href={`/org/${orgSlug}/customers/${customer.id}` as Route}
            className="text-xs text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors ml-auto px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-primary/5"
          >
            View customer profile
          </Link>
        )}
      </div>
    </header>
  );
});
