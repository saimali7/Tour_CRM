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
  Users,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useGhostPreview, type GhostPreviewData as ContextGhostPreviewData } from "../adjust-mode";

// =============================================================================
// SAFE HOOK WRAPPER
// =============================================================================

/**
 * Safely use ghost preview context
 * Returns null if not within a GhostPreviewProvider
 */
function useGhostPreviewSafe() {
  try {
    return useGhostPreview().ghostPreview;
  } catch {
    // Not within GhostPreviewProvider, return null
    return null;
  }
}

// =============================================================================
// HELPER - Pluralize
// =============================================================================

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

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
    /** Whether this assignment would exceed vehicle capacity */
    exceedsCapacity?: boolean;
    /** Capacity utilization percentage after assignment */
    capacityUtilization?: number;
  };
  recommendation?: {
    betterGuideId: string;
    betterGuideName: string;
    savingsMinutes: number;
  };
}

/** Zone statistics for the day */
export interface ZoneDistribution {
  id: string;
  name: string;
  color: string;
  bookingCount: number;
  guestCount: number;
  assignedCount: number;
  unassignedCount: number;
}

/** Tour run summary for the day */
export interface TourRunSummary {
  tourRunKey: string;
  tourName: string;
  time: string;
  guestCount: number;
  hasGuide: boolean;
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
   * Legacy ghost preview data (deprecated, use context instead)
   * @deprecated Use GhostPreviewProvider context instead
   */
  ghostPreview?: GhostPreviewData | null;

  /**
   * Whether to use context for ghost preview (default: true)
   */
  useGhostPreviewContext?: boolean;

  /**
   * Available zones for display
   */
  zones?: Array<{ id: string; name: string; color: string }>;

  /**
   * Zone distribution data for the day
   */
  zoneDistribution?: ZoneDistribution[];

  /**
   * Tour run summary for the day
   */
  tourRunSummary?: TourRunSummary[];

  /**
   * Total guests for the day
   */
  totalGuests?: number;

  /**
   * Total assigned guests
   */
  assignedGuests?: number;

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
// ZONE DISTRIBUTION CHART (Mini bar chart)
// =============================================================================

function ZoneDistributionChart({
  zones,
  totalGuests,
}: {
  zones: ZoneDistribution[];
  totalGuests: number;
}) {
  if (zones.length === 0) return null;

  // Sort by guest count descending
  const sortedZones = [...zones].sort((a, b) => b.guestCount - a.guestCount);
  const maxGuests = Math.max(...zones.map((z) => z.guestCount), 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Zones</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{totalGuests}p total</span>
      </div>
      <div className="space-y-1.5">
        {sortedZones.map((zone) => {
          const percentage = totalGuests > 0 ? (zone.guestCount / totalGuests) * 100 : 0;
          const barWidth = maxGuests > 0 ? (zone.guestCount / maxGuests) * 100 : 0;
          const assignedPercentage = zone.bookingCount > 0
            ? (zone.assignedCount / zone.bookingCount) * 100
            : 0;

          return (
            <div key={zone.id} className="group">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                  <span className="text-[11px] text-foreground">{zone.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{zone.guestCount}p</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">({Math.round(percentage)}%)</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%`, backgroundColor: zone.color, opacity: assignedPercentage > 0 ? 1 : 0.5 }}
                />
              </div>
              {/* Assignment status */}
              {zone.unassignedCount > 0 && (
                <span className="text-[11px] text-amber-500 font-medium">{zone.unassignedCount} unassigned</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// TOUR RUN TIMELINE (Mini timeline)
// =============================================================================

function TourRunTimeline({
  tourRuns,
}: {
  tourRuns: TourRunSummary[];
}) {
  if (tourRuns.length === 0) return null;

  // Group by time
  const byTime = tourRuns.reduce((acc, run) => {
    if (!acc[run.time]) acc[run.time] = [];
    acc[run.time]!.push(run);
    return acc;
  }, {} as Record<string, TourRunSummary[]>);

  const times = Object.keys(byTime).sort();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">Tours Today</span>
      </div>
      <div className="space-y-1">
        {times.slice(0, 5).map((time) => {
          const runs = byTime[time]!;
          const hasUnassigned = runs.some((r) => !r.hasGuide);
          const totalGuests = runs.reduce((sum, r) => sum + r.guestCount, 0);

          return (
            <div
              key={time}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded text-[11px]",
                hasUnassigned ? "bg-amber-500/10" : "bg-muted/50"
              )}
            >
              <span className="font-mono font-medium text-foreground shrink-0">{time}</span>
              <span className="text-muted-foreground truncate flex-1">
                {runs.length} {pluralize(runs.length, "tour")}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">{totalGuests}p</span>
              {hasUnassigned && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
            </div>
          );
        })}
        {times.length > 5 && (
          <p className="text-[11px] text-muted-foreground text-center">+{times.length - 5} more</p>
        )}
      </div>
    </div>
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
  ghostPreview: legacyGhostPreview,
  useGhostPreviewContext = true,
  zones = [],
  zoneDistribution = [],
  tourRunSummary = [],
  totalGuests = 0,
  assignedGuests = 0,
  className,
}: MapPanelProps) {
  // Get ghost preview from context if available
  const contextGhostPreview = useGhostPreviewContext ? useGhostPreviewSafe() : null;

  // Transform context ghost preview to component format
  const ghostPreview = useMemo(() => {
    // Use legacy prop if provided
    if (legacyGhostPreview) return legacyGhostPreview;

    // Use context if available and active
    if (contextGhostPreview?.isActive && contextGhostPreview.target) {
      return {
        isActive: true,
        booking: contextGhostPreview.source
          ? {
              id: contextGhostPreview.source.bookingId,
              customerName: contextGhostPreview.source.customerName,
              guestCount: contextGhostPreview.source.guestCount,
              pickupZone: contextGhostPreview.source.pickupZone,
            }
          : undefined,
        targetGuide: {
          id: contextGhostPreview.target.guideId,
          name: contextGhostPreview.target.guideName,
        },
        impact: contextGhostPreview.impact
          ? {
              driveTimeMinutes: contextGhostPreview.impact.driveTimeChange,
              netChangeMinutes: contextGhostPreview.impact.driveTimeChange,
              efficiency: contextGhostPreview.impact.efficiency,
              exceedsCapacity: contextGhostPreview.impact.exceedsCapacity,
              capacityUtilization: contextGhostPreview.impact.capacityUtilization,
            }
          : {
              driveTimeMinutes: 0,
              netChangeMinutes: 0,
              efficiency: "acceptable" as const,
            },
        recommendation: contextGhostPreview.recommendation ?? undefined,
      } satisfies GhostPreviewData;
    }

    return null;
  }, [legacyGhostPreview, contextGhostPreview]);

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

  // Calculate assignment percentage
  const assignmentPercentage = totalGuests > 0
    ? Math.round((assignedGuests / totalGuests) * 100)
    : 0;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex-none px-2.5 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground">Route Context</h3>
          </div>
          {totalDriveMinutes > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              <Car className="h-2.5 w-2.5 mr-0.5" />
              {totalDriveMinutes}m
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-3">
          {/* Ghost Preview Card (when dragging) */}
          {ghostPreview?.isActive && (
            <div className={cn(
              "rounded-md border-2 border-dashed",
              ghostPreview.impact?.exceedsCapacity
                ? "border-red-500/50 bg-red-500/5"
                : "border-primary/50 bg-primary/5"
            )}>
              <div className="px-2 py-1.5">
                <h4 className={cn(
                  "text-[11px] font-medium flex items-center gap-1",
                  ghostPreview.impact?.exceedsCapacity ? "text-red-500" : "text-primary"
                )}>
                  <Route className="h-3 w-3" />
                  Proposed Assignment
                </h4>
              </div>
              <div className="px-2 pb-2 space-y-1.5">
                {/* What's being moved */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Moving</span>
                  <span className="font-medium truncate">{ghostPreview.booking?.customerName}</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1"
                    style={{
                      borderColor: ghostPreview.booking?.pickupZone?.color,
                      color: ghostPreview.booking?.pickupZone?.color,
                    }}
                  >
                    <Users className="h-2 w-2 mr-0.5" />
                    {ghostPreview.booking?.guestCount}
                  </Badge>
                </div>

                {/* Target */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="font-medium">{ghostPreview.targetGuide?.name}</span>
                </div>

                {/* Capacity Warning */}
                {ghostPreview.impact?.exceedsCapacity && (
                  <div className="flex items-start gap-1.5 p-1.5 rounded bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                    <div className="text-[10px]">
                      <p className="font-medium text-red-700 dark:text-red-400">Exceeds capacity</p>
                      <p className="text-muted-foreground">{ghostPreview.impact.capacityUtilization}% utilized</p>
                    </div>
                  </div>
                )}

                {/* Impact */}
                <EfficiencyBadge
                  efficiency={ghostPreview.impact?.efficiency ?? "acceptable"}
                  minutes={ghostPreview.impact?.netChangeMinutes ?? 0}
                />

                {/* Recommendation */}
                {ghostPreview.recommendation && !ghostPreview.impact?.exceedsCapacity && (
                  <div className="flex items-start gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5" />
                    <div className="text-[10px]">
                      <p className="font-medium text-amber-700 dark:text-amber-400">Better option</p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">{ghostPreview.recommendation.betterGuideName}</span> saves {ghostPreview.recommendation.savingsMinutes}m
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
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">{selectedGuideName}</span>
              </div>

              {/* Zone badges */}
              {Object.keys(zoneStats).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(zoneStats).map(([name, { color, count }]) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="text-[9px] h-4 px-1"
                      style={{ borderColor: color, color: color }}
                    >
                      <MapPin className="h-2 w-2 mr-0.5" />
                      {name} ({count})
                    </Badge>
                  ))}
                </div>
              )}

              {/* Route visualization */}
              <div className="space-y-0 relative">
                {/* Connecting line */}
                <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-border" aria-hidden="true" />

                {routeStops.map((stop, index) => (
                  <div key={stop.id} className="flex items-start gap-2 py-1.5">
                    {/* Stop indicator */}
                    <div
                      className={cn(
                        "relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                        stop.type === "pickup" && "bg-primary/10 text-primary",
                        stop.type === "tour" && "bg-amber-500/10 text-amber-500",
                        stop.type === "depot" && "bg-muted text-muted-foreground"
                      )}
                      style={
                        stop.type === "pickup" && stop.zone?.color
                          ? { backgroundColor: `${stop.zone.color}20`, color: stop.zone.color }
                          : undefined
                      }
                    >
                      <span className="text-[9px] font-bold">{index + 1}</span>
                    </div>

                    {/* Stop details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium truncate">{stop.name}</span>
                        {stop.guestCount && stop.guestCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">
                            {stop.guestCount}p
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{stop.time}</span>
                        {stop.zone && (
                          <span className="text-[9px]" style={{ color: stop.zone.color }}>{stop.zone.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Empty state - show day overview instead
            <div className="space-y-3">
              {/* Assignment Progress */}
              {totalGuests > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium tabular-nums",
                      assignmentPercentage >= 100 ? "text-green-500" :
                      assignmentPercentage >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                      {assignmentPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        assignmentPercentage >= 100 ? "bg-green-500" :
                        assignmentPercentage >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${assignmentPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>{assignedGuests} assigned</span>
                    <span>{totalGuests - assignedGuests} remaining</span>
                  </div>
                </div>
              )}

              {/* Zone Distribution */}
              {zoneDistribution.length > 0 ? (
                <ZoneDistributionChart
                  zones={zoneDistribution}
                  totalGuests={totalGuests}
                />
              ) : zones.length > 0 ? (
                <div className="pt-2 border-t border-border/50">
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
              ) : null}

              {/* Tour Run Timeline */}
              {tourRunSummary.length > 0 && (
                <TourRunTimeline tourRuns={tourRunSummary} />
              )}

              {/* Fallback empty state if no data */}
              {totalGuests === 0 && zones.length === 0 && tourRunSummary.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Map className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-foreground mb-0.5">No Route</p>
                  <p className="text-[10px] text-muted-foreground max-w-[180px]">
                    Click a guide or drag a booking
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

MapPanel.displayName = "MapPanel";
