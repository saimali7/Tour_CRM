"use client";

import { CalendarDays, Users, TrendingUp, AlertCircle } from "lucide-react";

interface AvailabilityStats {
  totalTours: number;
  totalCapacity: number;
  totalBooked: number;
  availableSpots: number;
  utilizationRate: number;
  toursNeedingGuides: number;
  toursNearCapacity: number;
}

interface StatsBarProps {
  stats: AvailabilityStats;
  dateLabel: string;
  isLoading?: boolean;
}

export function StatsBar({ stats, dateLabel, isLoading }: StatsBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const hasAlerts = stats.toursNeedingGuides > 0 || stats.toursNearCapacity > 0;

  return (
    <div className="space-y-4">
      {/* Date Context */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{dateLabel}</h2>
        {hasAlerts && (
          <div className="flex items-center gap-2 text-sm">
            {stats.toursNeedingGuides > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {stats.toursNeedingGuides} need guides
              </span>
            )}
            {stats.toursNearCapacity > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                {stats.toursNearCapacity} almost full
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tours Count */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Tours</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalTours}</p>
          <p className="text-xs text-muted-foreground mt-1">scheduled</p>
        </div>

        {/* Total Capacity */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Capacity</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalCapacity}</p>
          <p className="text-xs text-muted-foreground mt-1">total spots</p>
        </div>

        {/* Booked */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Booked</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {stats.totalBooked}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({stats.utilizationRate}%)
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">participants</p>
        </div>

        {/* Available - Highlighted */}
        <div className="rounded-lg border-2 border-success bg-success/5 p-4">
          <div className="flex items-center gap-2 text-success mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Available</span>
          </div>
          <p className="text-2xl font-bold text-success">{stats.availableSpots}</p>
          <p className="text-xs text-success/80 mt-1">spots to sell</p>
        </div>
      </div>
    </div>
  );
}
