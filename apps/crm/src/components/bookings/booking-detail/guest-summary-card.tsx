"use client";

import { useState } from "react";
import {
  Users,
  User,
  Baby,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Utensils,
  Accessibility,
  CheckCircle,
} from "lucide-react";
import { Button } from "@tour/ui";
import { cn } from "@/lib/utils";
import type { BookingData, BookingParticipant } from "./types";

interface GuestSummaryCardProps {
  booking: BookingData;
  className?: string;
}

/**
 * Guest Summary Card
 *
 * A compact yet comprehensive view of booking guests that:
 * 1. Shows guest count breakdown (adults, children, infants)
 * 2. Prominently highlights special requirements
 * 3. Provides expandable participant list
 *
 * Design Principles:
 * - Special needs are IMPOSSIBLE to miss
 * - Count breakdown is at a glance
 * - Detailed participant list is expandable (not hidden by default when there are needs)
 */
export function GuestSummaryCard({ booking, className }: GuestSummaryCardProps) {
  // Check for special needs
  const participantsWithNeeds = booking.participants?.filter(
    (p) => p.dietaryRequirements || p.accessibilityNeeds
  ) || [];
  const hasSpecialNeeds = participantsWithNeeds.length > 0;

  // Default open if there are special needs
  const [isExpanded, setIsExpanded] = useState(hasSpecialNeeds);

  const adultCount = booking.adultCount || 0;
  const childCount = booking.childCount || 0;
  const infantCount = booking.infantCount || 0;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      hasSpecialNeeds && "border-warning dark:border-warning",
      className
    )}>
      {/* Header - Always Visible */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Guest Count Section */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Guests
                </h3>
                <p className="text-xs text-muted-foreground">
                  {booking.totalParticipants} total
                </p>
              </div>
            </div>

            {/* Count Breakdown */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground tabular-nums">{adultCount}</span>
                <span className="text-muted-foreground">Adult{adultCount !== 1 ? "s" : ""}</span>
              </div>
              {childCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-bold text-foreground tabular-nums">{childCount}</span>
                  <span className="text-muted-foreground">Child{childCount !== 1 ? "ren" : ""}</span>
                </div>
              )}
              {infantCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-foreground tabular-nums">{infantCount}</span>
                  <span className="text-muted-foreground">Infant{infantCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Needs Badge */}
          {hasSpecialNeeds && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-warning dark:bg-warning/50",
              "border border-warning dark:border-warning"
            )}>
              <AlertTriangle className="h-4 w-4 text-warning dark:text-warning" />
              <span className="text-sm font-semibold text-warning dark:text-warning">
                {participantsWithNeeds.length} special need{participantsWithNeeds.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {booking.participants && booking.participants.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide participant details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show participant details
              </>
            )}
          </Button>
        )}
      </div>

      {/* Expanded Participant List */}
      {isExpanded && booking.participants && booking.participants.length > 0 && (
        <div className="border-t border-border">
          <div className="divide-y divide-border">
            {booking.participants.map((participant) => (
              <ParticipantRow key={participant.id} participant={participant} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Participant Row
function ParticipantRow({ participant }: { participant: BookingParticipant }) {
  const hasNeeds = participant.dietaryRequirements || participant.accessibilityNeeds;

  return (
    <div className={cn(
      "px-4 sm:px-5 py-3",
      hasNeeds && "bg-warning/50 dark:bg-warning/20"
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Participant Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {participant.firstName} {participant.lastName}
            </span>
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              participant.type === "adult" && "bg-muted text-muted-foreground",
              participant.type === "child" && "bg-info/10 text-info",
              participant.type === "infant" && "bg-info/10 text-info"
            )}>
              {participant.type}
            </span>
          </div>
          {participant.email && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {participant.email}
            </p>
          )}
        </div>

        {/* Special Needs Indicators */}
        {hasNeeds ? (
          <div className="flex flex-col items-end gap-1">
            {participant.dietaryRequirements && (
              <div className="flex items-center gap-1.5 text-xs text-warning dark:text-warning">
                <Utensils className="h-3.5 w-3.5" />
                <span className="font-medium">{participant.dietaryRequirements}</span>
              </div>
            )}
            {participant.accessibilityNeeds && (
              <div className="flex items-center gap-1.5 text-xs text-warning dark:text-warning">
                <Accessibility className="h-3.5 w-3.5" />
                <span className="font-medium">{participant.accessibilityNeeds}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-success dark:text-success">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>No special needs</span>
          </div>
        )}
      </div>
    </div>
  );
}
