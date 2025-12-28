"use client";

import { Clock, Users, DollarSign, MapPin, Calendar, Check, X, Star, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TourOverviewTabProps {
  tour: {
    id: string;
    name: string;
    slug: string | null;
    status: "draft" | "active" | "paused" | "archived";
    description: string | null;
    shortDescription: string | null;
    durationMinutes: number;
    maxParticipants: number;
    minParticipants: number | null;
    basePrice: string;
    cancellationHours: number | null;
    cancellationPolicy: string | null;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
    includes: string[] | null;
    excludes: string[] | null;
    productId?: string | null;
  };
}

export function TourOverviewTab({ tour }: TourOverviewTabProps) {
  // Fetch tour ratings from reviews
  const { data: tourRatings } = trpc.review.tourRatings.useQuery();
  const thisTourRating = tourRatings?.find((r) => r.tourId === tour.id);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Star className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              {thisTourRating ? (
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-foreground">
                    {thisTourRating.averageRating.toFixed(1)}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    ({thisTourRating.totalReviews})
                  </span>
                </div>
              ) : (
                <p className="font-semibold text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-semibold text-foreground">{tour.durationMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-semibold text-foreground">
                {tour.minParticipants ?? 1} - {tour.maxParticipants}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="font-semibold text-foreground">
                ${parseFloat(tour.basePrice).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cutoff</p>
              <p className="font-semibold text-foreground">{tour.cancellationHours ?? 24}h before</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog Info */}
      {tour.productId && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Product Catalog</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This tour is part of the unified product catalog. Product information is synced automatically.
          </p>
        </div>
      )}

      {/* Description */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
        {tour.shortDescription && (
          <p className="text-muted-foreground mb-4 font-medium">{tour.shortDescription}</p>
        )}
        {tour.description ? (
          <p className="text-muted-foreground whitespace-pre-wrap">{tour.description}</p>
        ) : (
          <p className="text-muted-foreground italic">No description provided</p>
        )}
      </div>

      {/* Inclusions & Exclusions */}
      {((tour.includes && tour.includes.length > 0) || (tour.excludes && tour.excludes.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tour.includes && tour.includes.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">What&apos;s Included</h2>
              <ul className="space-y-2">
                {tour.includes.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tour.excludes && tour.excludes.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Not Included</h2>
              <ul className="space-y-2">
                {tour.excludes.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <X className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Meeting Point */}
      {(tour.meetingPoint || tour.meetingPointDetails) && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Meeting Point</h2>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              {tour.meetingPoint && (
                <p className="font-medium text-foreground">{tour.meetingPoint}</p>
              )}
              {tour.meetingPointDetails && (
                <p className="text-muted-foreground mt-1">{tour.meetingPointDetails}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Policy */}
      {tour.cancellationPolicy && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Cancellation Policy</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{tour.cancellationPolicy}</p>
        </div>
      )}
    </div>
  );
}
