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
import { UserAvatar } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  Car,
  MapPin,
  Clock,
  Users,
  Languages,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "./timeline/types";

// =============================================================================
// TYPES
// =============================================================================

export interface GuideAssignment {
  tourRunId: string;
  tourName: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  pickupCount: number;
}

export interface GuideCardData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  vehicleCapacity: number;
  vehicleDescription?: string | null;
  languages?: string[] | null;
  baseZoneName?: string | null;
  baseZoneColor?: string | null;
  status: "available" | "assigned" | "off";
  totalAssignments: number;
  totalGuests: number;
  totalDriveMinutes: number;
  assignments: GuideAssignment[];
}

export interface GuideCardProps {
  /**
   * Whether the sheet is open
   */
  open: boolean;

  /**
   * Callback when the sheet should close
   */
  onClose: () => void;

  /**
   * The guide data to display
   */
  guide: GuideCardData | null;

  /**
   * Optional callback when "View Calendar" is clicked
   */
  onViewCalendar?: (guideId: string) => void;

  /**
   * Optional callback when "View Profile" is clicked
   */
  onViewProfile?: (guideId: string) => void;
}

// =============================================================================
// STATUS STYLES
// =============================================================================

const statusStyles: Record<GuideCardData["status"], { variant: "default" | "secondary" | "outline"; label: string }> = {
  available: { variant: "default", label: "Available" },
  assigned: { variant: "secondary", label: "Assigned" },
  off: { variant: "outline", label: "Off Duty" },
};

// =============================================================================
// GUIDE CARD COMPONENT
// =============================================================================

/**
 * Guide Card
 *
 * A slide-over panel showing comprehensive guide details.
 * Appears when clicking on a guide row header in the timeline.
 *
 * Displays:
 * - Guide avatar and name
 * - Current status
 * - Contact information
 * - Vehicle details
 * - Base zone
 * - Languages spoken
 * - Today's statistics (tours, guests, drive time)
 * - Today's schedule with tour assignments
 * - Quick action buttons
 */
export function GuideCard({
  open,
  onClose,
  guide,
  onViewCalendar,
  onViewProfile,
}: GuideCardProps) {
  if (!guide) return null;

  const statusStyle = statusStyles[guide.status] || {
    variant: "secondary" as const,
    label: guide.status,
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto sm:w-[480px]">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={guide.name}
              src={guide.avatarUrl}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg">{guide.name}</SheetTitle>
              <div className="mt-1">
                <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Guide details and today&apos;s schedule
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Contact
            </h4>
            <div className="space-y-2">
              {guide.phone && (
                <a
                  href={`tel:${guide.phone}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="hover:underline">{guide.phone}</span>
                </a>
              )}
              {guide.email && (
                <a
                  href={`mailto:${guide.email}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate hover:underline">{guide.email}</span>
                </a>
              )}
              {!guide.phone && !guide.email && (
                <p className="text-sm text-muted-foreground">No contact information available</p>
              )}
            </div>
          </section>

          {/* Vehicle Info */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Vehicle
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {guide.vehicleCapacity} passenger capacity
                  </p>
                  {guide.vehicleDescription && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {guide.vehicleDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Base Zone */}
          {guide.baseZoneName && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Base Zone
              </h4>
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: guide.baseZoneColor || "#888" }}
                  aria-hidden="true"
                />
                <span className="text-sm">{guide.baseZoneName}</span>
              </div>
            </section>
          )}

          {/* Languages */}
          {guide.languages && guide.languages.length > 0 && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Languages
              </h4>
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex flex-wrap gap-1.5">
                  {guide.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Today's Stats */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Today&apos;s Stats
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="font-mono text-2xl font-bold tabular-nums">
                  {guide.totalAssignments}
                </p>
                <p className="text-xs text-muted-foreground">Tours</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="font-mono text-2xl font-bold tabular-nums">
                  {guide.totalGuests}
                </p>
                <p className="text-xs text-muted-foreground">Guests</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="font-mono text-2xl font-bold tabular-nums">
                  {formatDuration(guide.totalDriveMinutes)}
                </p>
                <p className="text-xs text-muted-foreground">Drive</p>
              </div>
            </div>
          </section>

          {/* Today's Schedule */}
          {guide.assignments.length > 0 && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Today&apos;s Schedule
              </h4>
              <div className="space-y-2">
                {guide.assignments.map((assignment) => (
                  <div
                    key={assignment.tourRunId}
                    className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{assignment.tourName}</span>
                      <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                        {assignment.startTime} - {assignment.endTime}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {assignment.guestCount} guest{assignment.guestCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {assignment.pickupCount} pickup{assignment.pickupCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty Schedule State */}
          {guide.assignments.length === 0 && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Today&apos;s Schedule
              </h4>
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No tours assigned for today
                </p>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            {guide.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
              >
                <a href={`tel:${guide.phone}`}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                  Call
                </a>
              </Button>
            )}
            {onViewCalendar && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewCalendar(guide.id)}
              >
                <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                Calendar
              </Button>
            )}
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewProfile(guide.id)}
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Profile
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

GuideCard.displayName = "GuideCard";
