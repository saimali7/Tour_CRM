"use client";

import * as React from "react";
import {
  Clock,
  Map,
  Users,
  DollarSign,
  ExternalLink,
  Plus,
  Calendar,
  Tag,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface TourQuickViewProps {
  tourId: string;
  orgSlug: string;
  onCreateSchedule?: () => void;
}

export function TourQuickView({
  tourId,
  orgSlug,
  onCreateSchedule,
}: TourQuickViewProps) {
  const { data: tour, isLoading, error } = trpc.tour.getById.useQuery({ id: tourId });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading tour: {error.message}
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tour not found
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "status-confirmed",
    archived: "status-pending",
    deleted: "status-cancelled",
  };

  const basePrice = parseFloat(tour.basePrice || "0");
  const currency = tour.currency || "USD";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{tour.name}</h3>
          {tour.shortDescription && (
            <p className="text-sm text-muted-foreground mt-1">
              {tour.shortDescription}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[tour.status] || "bg-muted text-muted-foreground"
            }`}
          >
            {tour.status}
          </span>
          {tour.isPublic && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Public
            </span>
          )}
        </div>
      </div>

      {/* Create Schedule Button */}
      {onCreateSchedule && tour.status === "active" && (
        <Button onClick={onCreateSchedule} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      )}

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-3 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{tour.durationMinutes || "-"}</p>
          <p className="text-xs text-muted-foreground">minutes</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">${basePrice.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">base price</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{tour.maxParticipants || "-"}</p>
          <p className="text-xs text-muted-foreground">max participants</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{tour.minParticipants || 1}</p>
          <p className="text-xs text-muted-foreground">min participants</p>
        </div>
      </div>

      {/* Meeting Point */}
      {tour.meetingPoint && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Meeting Point
          </h4>
          <p className="text-sm">{tour.meetingPoint}</p>
          {tour.meetingPointDetails && (
            <p className="text-xs text-muted-foreground">
              {tour.meetingPointDetails}
            </p>
          )}
        </div>
      )}

      {/* Category & Tags */}
      {(tour.category || (tour.tags && tour.tags.length > 0)) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Category & Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {tour.category && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {tour.category}
              </span>
            )}
            {tour.tags?.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Includes */}
      {tour.includes && tour.includes.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">What's Included</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {tour.includes.slice(0, 4).map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-success">✓</span>
                {item}
              </li>
            ))}
            {tour.includes.length > 4 && (
              <li className="text-xs">+{tour.includes.length - 4} more...</li>
            )}
          </ul>
        </div>
      )}

      {/* Description */}
      {tour.description && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Description</h4>
          <p className="text-sm text-muted-foreground line-clamp-4">
            {tour.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link href={`/org/${orgSlug}/tours/${tour.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
