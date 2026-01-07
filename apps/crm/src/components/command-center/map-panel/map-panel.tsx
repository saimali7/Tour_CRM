"use client";

import { cn } from "@/lib/utils";
import {
  Users,
  CheckCircle2,
  Truck,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface RouteStop {
  id: string;
  type: "pickup" | "tour" | "depot";
  name: string;
  zone?: {
    id: string;
    name: string;
    color: string;
  };
  time: string;
  guestCount?: number;
}

export interface GhostPreviewData {
  isActive: boolean;
  booking?: {
    id?: string;
    customerName?: string;
    guestCount?: number;
    pickupZone?: { name: string; color: string };
  };
  targetGuide?: {
    id: string;
    name: string;
  };
  impact?: {
    driveTimeMinutes: number;
    netChangeMinutes: number;
    efficiency: "efficient" | "acceptable" | "inefficient";
    exceedsCapacity?: boolean;
    capacityUtilization?: number;
  };
  recommendation?: {
    betterGuideId: string;
    betterGuideName: string;
    savingsMinutes: number;
  };
}

export interface ZoneDistribution {
  id: string;
  name: string;
  color: string;
  bookingCount: number;
  guestCount: number;
  assignedCount: number;
  unassignedCount: number;
}

export interface TourRunSummary {
  tourRunKey: string;
  tourName: string;
  time: string;
  guestCount: number;
  hasGuide: boolean;
}

interface MapPanelProps {
  selectedGuideId?: string | null;
  selectedGuideName?: string;
  routeStops?: RouteStop[];
  totalDriveMinutes?: number;
  zones?: Array<{ id: string; name: string; color: string }>;
  zoneDistribution?: ZoneDistribution[];
  tourRunSummary?: TourRunSummary[];
  totalGuests?: number;
  assignedGuests?: number;
  className?: string;
}

// =============================================================================
// MAP PANEL - CLEAN VERSION
// =============================================================================

export function MapPanel({
  selectedGuideId,
  selectedGuideName,
  routeStops = [],
  totalDriveMinutes = 0,
  zoneDistribution = [],
  totalGuests = 0,
  assignedGuests = 0,
  className,
}: MapPanelProps) {
  const assignmentPercentage = totalGuests > 0
    ? Math.round((assignedGuests / totalGuests) * 100)
    : 0;

  const unassignedGuests = totalGuests - assignedGuests;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedGuideId && routeStops.length > 0 ? (
          /* Selected Guide Route */
          <div className="p-3">
            {/* Guide Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">{selectedGuideName}</span>
              {totalDriveMinutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  <span>{totalDriveMinutes}m</span>
                </div>
              )}
            </div>

            {/* Route Stops */}
            <div className="space-y-0">
              {routeStops.map((stop, index) => (
                <div key={stop.id} className="flex gap-3">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        stop.type === "tour" && "bg-amber-500"
                      )}
                      style={
                        stop.type === "pickup" && stop.zone?.color
                          ? { backgroundColor: stop.zone.color }
                          : stop.type === "pickup"
                          ? { backgroundColor: "#3B82F6" }
                          : undefined
                      }
                    />
                    {index < routeStops.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>

                  {/* Stop Details */}
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{stop.name}</p>
                        {stop.zone && (
                          <p className="text-xs text-muted-foreground">{stop.zone.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stop.guestCount && stop.guestCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {stop.guestCount}p
                          </span>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          {stop.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Day Overview - No guide selected */
          <div className="p-3 space-y-4">
            {/* Assignment Status */}
            {totalGuests > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Assignments</span>
                  <span className="text-sm tabular-nums">
                    {assignedGuests}/{totalGuests}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      assignmentPercentage >= 100
                        ? "bg-green-500"
                        : assignmentPercentage >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    )}
                    style={{ width: `${assignmentPercentage}%` }}
                  />
                </div>

                {/* Status Text */}
                {unassignedGuests > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {unassignedGuests} guests need assignment
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>All guests assigned</span>
                  </div>
                )}
              </div>
            )}

            {/* Zone Breakdown */}
            {zoneDistribution.length > 0 && (
              <div>
                <span className="text-sm font-medium">By Zone</span>
                <div className="mt-2 space-y-2">
                  {zoneDistribution
                    .sort((a, b) => b.guestCount - a.guestCount)
                    .map((zone) => (
                      <div key={zone.id} className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="text-sm flex-1 truncate">{zone.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {zone.guestCount}
                        </span>
                        {zone.unassignedCount > 0 && (
                          <span className="text-xs text-amber-500 tabular-nums">
                            ({zone.unassignedCount})
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {totalGuests === 0 && zoneDistribution.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No bookings</p>
                <p className="text-xs text-muted-foreground">
                  Select a guide to view their route
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

MapPanel.displayName = "MapPanel";
