"use client";

import { cn } from "@/lib/utils";
import { Map, Navigation2, Clock, AlertTriangle, Lightbulb } from "lucide-react";
import { ZoneBadge, getZoneAccent } from "./zone-badge";

interface RoutePoint {
  id: string;
  type: "pickup" | "destination";
  name: string;
  zone?: string | null;
  address?: string;
  estimatedTime?: string;
  order: number;
}

interface RouteRecommendation {
  type: "info" | "warning" | "suggestion";
  message: string;
}

interface RouteMapPanelProps {
  selectedGuideId?: string | null;
  guideName?: string;
  routePoints: RoutePoint[];
  recommendations: RouteRecommendation[];
  totalDuration?: number; // minutes
  totalDistance?: number; // km
  isLoading?: boolean;
  className?: string;
}

export function RouteMapPanel({
  selectedGuideId,
  guideName,
  routePoints,
  recommendations,
  totalDuration,
  totalDistance,
  isLoading,
  className,
}: RouteMapPanelProps) {
  if (isLoading) {
    return <RouteMapPanelSkeleton className={className} />;
  }

  if (!selectedGuideId) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-shrink-0 p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Route Context</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a guide to view route
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Map className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select a guide from the timeline to see their route
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{guideName}'s Route</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {routePoints.length} stops
              {totalDuration && ` · ${totalDuration} min`}
              {totalDistance && ` · ${totalDistance.toFixed(1)} km`}
            </p>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="h-48 relative bg-muted/30 border-b border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Map coming in V2</p>
          </div>
        </div>

        {/* Simple Route Line Visualization */}
        {routePoints.length > 0 && (
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              {routePoints.map((point, idx) => (
                <div key={point.id} className="flex items-center">
                  {/* Point */}
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2",
                      point.type === "destination"
                        ? "bg-emerald-500 border-emerald-600"
                        : "bg-background border-current"
                    )}
                    style={{
                      borderColor:
                        point.type === "pickup"
                          ? getZoneAccent(point.zone)
                          : undefined,
                    }}
                    title={point.name}
                  />
                  {/* Line to next */}
                  {idx < routePoints.length - 1 && (
                    <div className="w-8 h-0.5 bg-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Route Points List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {routePoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pickups assigned yet
            </p>
          ) : (
            routePoints.map((point, idx) => (
              <div key={point.id} className="flex items-start gap-3">
                {/* Order number + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                      point.type === "destination"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {point.order}
                  </div>
                  {idx < routePoints.length - 1 && (
                    <div className="w-px h-8 bg-border -mb-3" />
                  )}
                </div>

                {/* Point info */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {point.name}
                    </span>
                    {point.zone && <ZoneBadge zone={point.zone} size="sm" />}
                  </div>
                  {point.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {point.address}
                    </p>
                  )}
                  {point.estimatedTime && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {point.estimatedTime}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recommendations
          </h3>
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-2 text-xs p-2 rounded-md",
                rec.type === "warning" && "bg-amber-500/5 text-amber-700 dark:text-amber-400",
                rec.type === "suggestion" && "bg-blue-500/5 text-blue-700 dark:text-blue-400",
                rec.type === "info" && "bg-muted text-muted-foreground"
              )}
            >
              {rec.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
              {rec.type === "suggestion" && <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
              {rec.type === "info" && <Navigation2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
              <span>{rec.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteMapPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-shrink-0 p-4 border-b border-border space-y-1">
        <div className="h-4 w-28 skeleton rounded" />
        <div className="h-3 w-36 skeleton rounded" />
      </div>
      <div className="h-48 skeleton" />
      <div className="flex-1 p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-6 w-6 skeleton rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-3 w-32 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
