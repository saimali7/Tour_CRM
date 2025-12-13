"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Map,
  Users,
  User,
  ExternalLink,
  Plus,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface ScheduleQuickViewProps {
  scheduleId: string;
  orgSlug: string;
  onTourClick?: (tourId: string) => void;
  onGuideClick?: (guideId: string) => void;
  onAddBooking?: () => void;
}

export function ScheduleQuickView({
  scheduleId,
  orgSlug,
  onTourClick,
  onGuideClick,
  onAddBooking,
}: ScheduleQuickViewProps) {
  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery({ id: scheduleId });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading schedule: {error.message}
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Schedule not found
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const bookedCount = schedule.bookedCount || 0;
  const maxParticipants = schedule.maxParticipants || 10;
  const capacityPercentage = Math.min((bookedCount / maxParticipants) * 100, 100);
  const remainingSpots = maxParticipants - bookedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {schedule.tour?.name || "Untitled Tour"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(schedule.startsAt), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusColors[schedule.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {schedule.status.replace("_", " ")}
        </span>
      </div>

      {/* Add Booking Button */}
      {onAddBooking && schedule.status === "scheduled" && remainingSpots > 0 && (
        <Button onClick={onAddBooking} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Booking ({remainingSpots} spots left)
        </Button>
      )}

      {/* Time & Duration */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Time & Duration
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Starts</p>
            <p className="font-medium">
              {format(new Date(schedule.startsAt), "h:mm a")}
            </p>
          </div>
          {schedule.endsAt && (
            <div>
              <p className="text-xs text-muted-foreground">Ends</p>
              <p className="font-medium">
                {format(new Date(schedule.endsAt), "h:mm a")}
              </p>
            </div>
          )}
          {schedule.tour?.durationMinutes && (
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{schedule.tour.durationMinutes} min</p>
            </div>
          )}
        </div>
      </div>

      {/* Capacity */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Capacity
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{bookedCount} booked</span>
            <span>{maxParticipants} max</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                capacityPercentage >= 100
                  ? "bg-red-500"
                  : capacityPercentage >= 80
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {remainingSpots > 0
              ? `${remainingSpots} spot${remainingSpots !== 1 ? "s" : ""} remaining`
              : "Fully booked"}
          </p>
        </div>
      </div>

      {/* Tour Info */}
      {schedule.tour && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Map className="h-4 w-4 text-muted-foreground" />
              Tour
            </h4>
            {onTourClick && (
              <button
                onClick={() => onTourClick(schedule.tour!.id)}
                className="text-xs text-primary hover:underline"
              >
                View Tour
              </button>
            )}
          </div>
          <div>
            <p className="font-medium">{schedule.tour.name}</p>
            {schedule.tour.basePrice && (
              <p className="text-sm text-muted-foreground">
                Base price: ${parseFloat(schedule.tour.basePrice).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Guide Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Guide
          </h4>
          {onGuideClick && schedule.guide && (
            <button
              onClick={() => onGuideClick(schedule.guide!.id)}
              className="text-xs text-primary hover:underline"
            >
              View Profile
            </button>
          )}
        </div>
        {schedule.guide ? (
          <div>
            <p className="font-medium">
              {schedule.guide.firstName} {schedule.guide.lastName}
            </p>
            {schedule.guide.email && (
              <a
                href={`mailto:${schedule.guide.email}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {schedule.guide.email}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-yellow-600 font-medium">
            No guide assigned
          </p>
        )}
      </div>

      {/* Meeting Point */}
      {schedule.meetingPoint && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Meeting Point
          </h4>
          <p className="text-sm">{schedule.meetingPoint}</p>
          {schedule.meetingPointDetails && (
            <p className="text-xs text-muted-foreground">
              {schedule.meetingPointDetails}
            </p>
          )}
        </div>
      )}

      {/* Price */}
      {schedule.price && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Price per person</span>
            <span className="font-bold text-lg">
              ${parseFloat(schedule.price).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {schedule.publicNotes && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Notes</h4>
          <p className="text-sm text-muted-foreground">{schedule.publicNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link href={`/org/${orgSlug}/schedules/${schedule.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
