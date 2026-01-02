"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Map,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  MapPin,
  Car,
  Route,
  Lightbulb,
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
    id: string;
    customerName: string;
    guestCount: number;
    pickupZone?: { name: string; color: string };
  };
  targetGuide?: {
    id: string;
    name: string;
  };
  impact: {
    driveTimeMinutes: number;
    netChangeMinutes: number;
    efficiency: "efficient" | "acceptable" | "inefficient";
  };
  recommendation?: {
    betterGuideId: string;
    betterGuideName: string;
    savingsMinutes: number;
  };
}

interface MapPanelProps {
  /**
   * Currently selected guide ID
   */
  selectedGuideId?: string | null;

  /**
   * Currently selected guide name
   */
  selectedGuideName?: string;

  /**
   * Route stops for the selected guide
   */
  routeStops?: RouteStop[];

  /**
   * Total drive minutes for the route
   */
  totalDriveMinutes?: number;

  /**
   * Ghost preview data when dragging
   */
  ghostPreview?: GhostPreviewData | null;

  /**
   * Available zones for display
   */
  zones?: Array<{ id: string; name: string; color: string }>;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// EFFICIENCY BADGE
// =============================================================================

function EfficiencyBadge({
  efficiency,
  minutes,
}: {
  efficiency: "efficient" | "acceptable" | "inefficient";
  minutes: number;
}) {
  const config = {
    efficient: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      label: "Efficient",
    },
    acceptable: {
      icon: Clock,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      label: "Acceptable",
    },
    inefficient: {
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Inefficient",
    },
  }[efficiency];

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.color, config.bg)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
      <span className="ml-1.5 text-muted-foreground">
        {minutes > 0 ? "+" : ""}
        {minutes}m
      </span>
    </Badge>
  );
}

// =============================================================================
// MAP PANEL COMPONENT
// =============================================================================

export function MapPanel({
  selectedGuideId,
  selectedGuideName,
  routeStops = [],
  totalDriveMinutes = 0,
  ghostPreview,
  zones = [],
  className,
}: MapPanelProps) {
  // Group stops by zone for stats
  const zoneStats = useMemo(() => {
    const stats: Record<string, { color: string; count: number }> = {};
    for (const stop of routeStops) {
      if (stop.zone) {
        if (!stats[stop.zone.name]) {
          stats[stop.zone.name] = { color: stop.zone.color, count: 0 };
        }
        stats[stop.zone.name]!.count++;
      }
    }
    return stats;
  }, [routeStops]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex-none p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Route Context
            </h3>
          </div>
          {totalDriveMinutes > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              <Car className="h-3 w-3 mr-1" />
              {totalDriveMinutes}m total
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Ghost Preview Card (when dragging) */}
          {ghostPreview?.isActive && (
            <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5">
              <div className="pb-2 pt-3 px-3">
                <h4 className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5" />
                  Proposed Assignment
                </h4>
              </div>
              <div className="px-3 pb-3 space-y-3">
                {/* What's being moved */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Moving</span>
                  <span className="font-medium">
                    {ghostPreview.booking?.customerName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: ghostPreview.booking?.pickupZone?.color,
                      color: ghostPreview.booking?.pickupZone?.color,
                    }}
                  >
                    {ghostPreview.booking?.guestCount} pax
                  </Badge>
                </div>

                {/* Target */}
                <div className="flex items-center gap-2 text-xs">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">
                    {ghostPreview.targetGuide?.name}
                  </span>
                </div>

                {/* Impact */}
                <div className="flex items-center justify-between">
                  <EfficiencyBadge
                    efficiency={ghostPreview.impact.efficiency}
                    minutes={ghostPreview.impact.netChangeMinutes}
                  />
                </div>

                {/* Recommendation */}
                {ghostPreview.recommendation && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Better option available
                      </p>
                      <p className="text-muted-foreground">
                        Assign to{" "}
                        <span className="font-medium">
                          {ghostPreview.recommendation.betterGuideName}
                        </span>{" "}
                        to save {ghostPreview.recommendation.savingsMinutes}m
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Guide Route */}
          {selectedGuideId && routeStops.length > 0 ? (
            <>
              {/* Guide header */}
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedGuideName}</span>
              </div>

              {/* Zone badges */}
              {Object.keys(zoneStats).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(zoneStats).map(([name, { color, count }]) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: color, color: color }}
                    >
                      <MapPin className="h-2.5 w-2.5 mr-1" />
                      {name} ({count})
                    </Badge>
                  ))}
                </div>
              )}

              {/* Route visualization */}
              <div className="space-y-0 relative">
                {/* Connecting line */}
                <div
                  className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border"
                  aria-hidden="true"
                />

                {routeStops.map((stop, index) => (
                  <div key={stop.id} className="flex items-start gap-3 py-2">
                    {/* Stop indicator */}
                    <div
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        stop.type === "pickup" && "bg-primary/10 text-primary",
                        stop.type === "tour" && "bg-amber-500/10 text-amber-500",
                        stop.type === "depot" && "bg-muted text-muted-foreground"
                      )}
                      style={
                        stop.type === "pickup" && stop.zone?.color
                          ? {
                              backgroundColor: `${stop.zone.color}20`,
                              color: stop.zone.color,
                            }
                          : undefined
                      }
                    >
                      <span className="text-[10px] font-bold">{index + 1}</span>
                    </div>

                    {/* Stop details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">
                          {stop.name}
                        </span>
                        {stop.guestCount && stop.guestCount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {stop.guestCount} pax
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {stop.time}
                        </span>
                        {stop.zone && (
                          <span
                            className="text-[10px]"
                            style={{ color: stop.zone.color }}
                          >
                            {stop.zone.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Empty state - no guide selected
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Map className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No Route Selected
              </p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Click on a guide row or drag a booking to see route details
              </p>
            </div>
          )}

          {/* Zone legend (when no guide selected) */}
          {!selectedGuideId && zones.length > 0 && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Pickup Zones
              </p>
              <div className="grid grid-cols-2 gap-2">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {zone.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

MapPanel.displayName = "MapPanel";
