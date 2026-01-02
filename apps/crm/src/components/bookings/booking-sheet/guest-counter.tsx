"use client";

import {
  Plus,
  Minus,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface PriceBreakdownItem {
  label: string;
  count: number;
  price: number;
  total: number;
}

export interface GuestCounterProps {
  guestCounts: GuestCounts;
  onGuestCountsChange: (counts: GuestCounts) => void;
  availableSpots: number;
  basePrice: number;
  pricing: {
    breakdown: PriceBreakdownItem[];
    total: number;
  };
  showPriceBreakdown: boolean;
  onTogglePriceBreakdown: () => void;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GuestCounter({
  guestCounts,
  onGuestCountsChange,
  availableSpots,
  basePrice,
  pricing,
  showPriceBreakdown,
  onTogglePriceBreakdown,
  error,
}: GuestCounterProps) {
  const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;

  const updateCount = (type: keyof GuestCounts, delta: number) => {
    const newCounts = { ...guestCounts };
    if (type === "adults") {
      newCounts.adults = Math.max(1, guestCounts.adults + delta);
    } else if (type === "children") {
      newCounts.children = Math.max(0, guestCounts.children + delta);
    } else {
      newCounts.infants = Math.max(0, guestCounts.infants + delta);
    }
    onGuestCountsChange(newCounts);
  };

  const getPrice = (type: "adult" | "child" | "infant"): number => {
    if (type === "adult") {
      return pricing.breakdown.find(b => b.label.toLowerCase().includes("adult"))?.price || basePrice;
    } else if (type === "child") {
      return pricing.breakdown.find(b => b.label.toLowerCase().includes("child"))?.price || basePrice * 0.5;
    }
    return 0; // Infants free
  };

  return (
    <section className="space-y-3">
      <label className="text-sm font-medium text-foreground">Guests</label>

      <div className="space-y-1 bg-muted/50 rounded-lg border border-border divide-y divide-border overflow-hidden">
        {/* Adults */}
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium text-foreground">Adults</p>
            <p className="text-xs text-muted-foreground">Ages 13+</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16 text-right">
              {formatCurrency(getPrice("adult"))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCount("adults", -1)}
                disabled={guestCounts.adults <= 1}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-semibold">{guestCounts.adults}</span>
              <button
                type="button"
                onClick={() => updateCount("adults", 1)}
                disabled={totalGuests >= availableSpots}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium text-foreground">Children</p>
            <p className="text-xs text-muted-foreground">Ages 3-12</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16 text-right">
              {formatCurrency(getPrice("child"))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCount("children", -1)}
                disabled={guestCounts.children <= 0}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-semibold">{guestCounts.children}</span>
              <button
                type="button"
                onClick={() => updateCount("children", 1)}
                disabled={totalGuests >= availableSpots}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Infants */}
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium text-foreground">Infants</p>
            <p className="text-xs text-muted-foreground">Under 3</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16 text-right">Free</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCount("infants", -1)}
                disabled={guestCounts.infants <= 0}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-semibold">{guestCounts.infants}</span>
              <button
                type="button"
                onClick={() => updateCount("infants", 1)}
                disabled={totalGuests >= availableSpots}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible price breakdown */}
      {pricing.breakdown.length > 0 && (
        <>
          <button
            type="button"
            onClick={onTogglePriceBreakdown}
            className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1"
          >
            {showPriceBreakdown ? 'Hide' : 'Show'} price breakdown
            <ChevronDown className={cn("h-3 w-3 transition-transform", showPriceBreakdown && "rotate-180")} />
          </button>

          {showPriceBreakdown && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 text-sm">
              {pricing.breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {item.count}x {item.label}
                  </span>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(pricing.total)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {totalGuests > availableSpots && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Only {availableSpots} spots available
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </section>
  );
}
