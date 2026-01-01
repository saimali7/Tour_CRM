"use client";

import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { type BookingCardData } from "./booking-card";
import { DraggableBookingCard } from "./draggable-booking-card";
import { Search, Filter, SortAsc, Lock, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BookingHopperProps {
  bookings: BookingCardData[];
  selectedBookingId?: string | null;
  onSelectBooking: (bookingId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

type SortOption = "priority" | "zone" | "guests";
type FilterOption = "all" | "private" | "shared";

export function BookingHopper({
  bookings,
  selectedBookingId,
  onSelectBooking,
  isLoading,
  className,
}: BookingHopperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.customerName.toLowerCase().includes(query) ||
          b.zone?.toLowerCase().includes(query) ||
          b.pickupAddress?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterBy === "private") {
      result = result.filter((b) => b.isPrivate);
    } else if (filterBy === "shared") {
      result = result.filter((b) => !b.isPrivate);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "priority") {
        // Private first, then by zone, then by guests (descending)
        if (a.isPrivate !== b.isPrivate) return a.isPrivate ? -1 : 1;
        if (a.zone !== b.zone) return (a.zone || "").localeCompare(b.zone || "");
        return b.guestCount - a.guestCount;
      }
      if (sortBy === "zone") {
        return (a.zone || "zzz").localeCompare(b.zone || "zzz");
      }
      if (sortBy === "guests") {
        return b.guestCount - a.guestCount;
      }
      return 0;
    });

    return result;
  }, [bookings, searchQuery, sortBy, filterBy]);

  // Stats
  const stats = useMemo(() => {
    const unassigned = bookings.filter((b) => !b.assignedGuideId);
    return {
      total: bookings.length,
      unassigned: unassigned.length,
      privateCount: unassigned.filter((b) => b.isPrivate).length,
      totalGuests: unassigned.reduce((sum, b) => sum + b.guestCount, 0),
    };
  }, [bookings]);

  if (isLoading) {
    return <BookingHopperSkeleton className={className} />;
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Unassigned</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.unassigned} bookings · {stats.totalGuests} guests
            </p>
          </div>
          {stats.privateCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" />
              {stats.privateCount} private
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter/Sort Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <FilterPill
            label="All"
            isActive={filterBy === "all"}
            onClick={() => setFilterBy("all")}
          />
          <FilterPill
            label="Private"
            icon={<Lock className="h-3 w-3" />}
            isActive={filterBy === "private"}
            onClick={() => setFilterBy("private")}
          />
          <FilterPill
            label="Shared"
            icon={<Users className="h-3 w-3" />}
            isActive={filterBy === "shared"}
            onClick={() => setFilterBy("shared")}
          />
          <div className="w-px h-4 bg-border" />
          <SortPill
            label="Priority"
            isActive={sortBy === "priority"}
            onClick={() => setSortBy("priority")}
          />
          <SortPill
            label="Zone"
            isActive={sortBy === "zone"}
            onClick={() => setSortBy("zone")}
          />
          <SortPill
            label="Guests"
            isActive={sortBy === "guests"}
            onClick={() => setSortBy("guests")}
          />
        </div>
      </div>

      {/* Booking List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No matching bookings" : "All bookings assigned"}
            </p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <DraggableBookingCard
              key={booking.id}
              booking={booking}
              isSelected={selectedBookingId === booking.id}
              onSelect={() =>
                onSelectBooking(selectedBookingId === booking.id ? null : booking.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SortPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      {isActive && <SortAsc className="h-3 w-3" />}
      {label}
    </button>
  );
}

function BookingHopperSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="h-9 skeleton rounded-md" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-16 skeleton rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 skeleton rounded-lg" />
        ))}
      </div>
    </div>
  );
}
