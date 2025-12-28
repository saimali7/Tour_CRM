"use client";

import * as React from "react";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export interface TourPreview {
  id: string;
  name: string;
  startsAt: Date | string;
  bookedCount: number;
  maxParticipants: number;
  needsGuide: boolean;
  hasPendingPayments: boolean;
}

export interface DayPreviewStats {
  totalGuests: number;
  totalRevenue: number;
  tourCount: number;
  needsGuide: number;
  pendingPayments: number;
  unconfirmed: number;
}

interface DayPreviewPopoverProps {
  date: Date;
  stats: DayPreviewStats;
  tours: TourPreview[];
  children: React.ReactNode;
}

export function DayPreviewPopover({
  date,
  stats,
  tours,
  children,
}: DayPreviewPopoverProps) {
  const hasAlerts = stats.needsGuide > 0 || stats.pendingPayments > 0 || stats.unconfirmed > 0;
  const toursWithBookings = tours.filter((t) => t.bookedCount > 0);
  const hasBookings = toursWithBookings.length > 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format time
  const formatTime = (time: Date | string) => {
    const d = typeof time === "string" ? new Date(time) : time;
    return format(d, "h:mm a");
  };

  // Build alert summary
  const getAlertSummary = (): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    if (stats.needsGuide > 0) {
      parts.push(
        <span key="guide" className="text-amber-600">
          {stats.needsGuide} needs guide
        </span>
      );
    }
    if (stats.pendingPayments > 0) {
      parts.push(
        <span key="payment" className="text-red-600">
          {stats.pendingPayments} pending
        </span>
      );
    }
    if (stats.unconfirmed > 0) {
      parts.push(
        <span key="unconfirmed" className="text-blue-600">
          {stats.unconfirmed} unconfirmed
        </span>
      );
    }

    // Join with separators
    const result: React.ReactNode[] = [];
    parts.forEach((part, idx) => {
      if (idx > 0) {
        result.push(<span key={`sep-${idx}`} className="text-muted-foreground"> · </span>);
      }
      result.push(part);
    });
    return result;
  };

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 p-0"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">
            {format(date, "EEEE, MMMM d")}
          </p>
        </div>

        {/* Content */}
        {hasBookings ? (
          <>
            {/* Metrics row */}
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium">{stats.totalGuests} guests</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{toursWithBookings.length} {toursWithBookings.length === 1 ? 'tour' : 'tours'}</span>
              </div>
            </div>

            {/* Tour list */}
            <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
              {toursWithBookings.map((tour) => {
                const isFull = tour.bookedCount >= tour.maxParticipants;
                return (
                  <div key={tour.id} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-xs text-muted-foreground tabular-nums shrink-0">
                      {formatTime(tour.startsAt)}
                    </span>
                    <span className="flex-1 truncate">{tour.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {tour.bookedCount}/{tour.maxParticipants}
                    </span>
                    <span className="w-4 flex justify-center shrink-0">
                      {tour.needsGuide ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      ) : isFull ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      ) : tour.hasPendingPayments ? (
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Alert summary */}
            {hasAlerts && (
              <div className="px-3 py-2 border-t border-border bg-muted/30">
                <p className="text-xs">{getAlertSummary()}</p>
              </div>
            )}
          </>
        ) : (
          /* Empty state - no bookings */
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">No bookings</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
