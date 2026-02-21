"use client";

import { useMemo } from "react";
import { Plus, Minus, Users, Info } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";
import type { TourPricingTier } from "@tour/database";

interface TicketSelectionProps {
  basePrice: number;
  maxParticipants: number;
  availableSpots: number;
  currency: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

interface TicketRowProps {
  tier: {
    id: string;
    label: string;
    price: number;
    type: "adult" | "child" | "infant";
    description?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
  };
  count: number;
  onAdd: () => void;
  onRemove: () => void;
  canAdd: boolean;
  currency: string;
}

function TicketRow({ tier, count, onAdd, onRemove, canAdd, currency }: TicketRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tier.label}</span>
          {tier.minAge !== null && tier.maxAge !== null && (
            <span className="text-xs text-muted-foreground">
              (Ages {tier.minAge}-{tier.maxAge})
            </span>
          )}
        </div>
        {tier.description && (
          <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
        )}
        <p className="text-sm font-semibold mt-1">
          {tier.price === 0 ? "Free" : formatPrice(tier.price, currency)}
        </p>
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={`${tier.label} quantity`}>
        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          className="w-8 h-8 rounded-full border flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-accent transition-colors"
          aria-label={`Remove one ${tier.label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span
          className="w-8 text-center font-medium"
          role="status"
          aria-live="polite"
          aria-label={`${count} ${tier.label} selected`}
        >
          {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="w-8 h-8 rounded-full border flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-accent transition-colors"
          aria-label={`Add one ${tier.label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TicketSelection({
  basePrice,
  maxParticipants,
  availableSpots,
  currency,
}: TicketSelectionProps) {
  const { state, addParticipant, removeParticipant, nextStep } = useBooking();

  // Build ticket tiers from pricing tiers or default to base price
  const ticketTiers = useMemo(() => {
    if (state.pricingTiers.length > 0) {
      return state.pricingTiers
        .filter((tier): tier is TourPricingTier & { id: string } => Boolean(tier.isActive))
        .map((tier) => ({
          id: tier.id,
          label: tier.label,
          price: parseFloat(tier.price as string),
          type: (tier.label.toLowerCase().includes("child")
            ? "child"
            : tier.label.toLowerCase().includes("infant")
            ? "infant"
            : "adult") as "adult" | "child" | "infant",
          description: tier.description,
          minAge: tier.minAge,
          maxAge: tier.maxAge,
        }));
    }

    // Default tiers if no pricing tiers configured
    return [
      {
        id: "adult",
        label: "Adult",
        price: basePrice,
        type: "adult" as const,
        description: null,
        minAge: 18,
        maxAge: null,
      },
      {
        id: "child",
        label: "Child",
        price: basePrice * 0.7,
        type: "child" as const,
        description: "Ages 3-17",
        minAge: 3,
        maxAge: 17,
      },
      {
        id: "infant",
        label: "Infant",
        price: 0,
        type: "infant" as const,
        description: "Under 3 years",
        minAge: 0,
        maxAge: 2,
      },
    ];
  }, [state.pricingTiers, basePrice]);

  // Count participants by tier
  const countsByTier = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tier of ticketTiers) {
      counts[tier.id] = state.participants.filter(
        (p) => p.pricingTierId === tier.id || (p.type === tier.type && !p.pricingTierId)
      ).length;
    }
    return counts;
  }, [state.participants, ticketTiers]);

  const totalParticipants = state.participants.length;
  const canAddMore = totalParticipants < Math.min(maxParticipants, availableSpots);

  const handleAdd = (tier: (typeof ticketTiers)[0]) => {
    if (canAddMore) {
      addParticipant(tier.type, tier.price, tier.id);
    }
  };

  const handleRemove = (tierId: string) => {
    // Find a participant matching this tier and remove it
    const participant = state.participants.find(
      (p) => p.pricingTierId === tierId || (ticketTiers.find((t) => t.id === tierId)?.type === p.type && !p.pricingTierId)
    );
    if (participant) {
      removeParticipant(participant.id);
    }
  };

  const handleContinue = () => {
    if (totalParticipants > 0) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* Availability info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {availableSpots} spot{availableSpots !== 1 ? "s" : ""} available
        </span>
      </div>

      {/* Ticket rows */}
      <div className="border rounded-lg p-4">
        {ticketTiers.map((tier) => (
          <TicketRow
            key={tier.id}
            tier={tier}
            count={countsByTier[tier.id] || 0}
            onAdd={() => handleAdd(tier)}
            onRemove={() => handleRemove(tier.id)}
            canAdd={canAddMore}
            currency={currency}
          />
        ))}
      </div>

      {/* Warning if near capacity */}
      {availableSpots <= 3 && availableSpots > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 text-orange-800 text-sm">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Only {availableSpots} spot{availableSpots !== 1 ? "s" : ""} left! Book now to secure
            your place.
          </span>
        </div>
      )}

      {/* Summary */}
      {totalParticipants > 0 && (
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
            </span>
            <span className="font-medium">{formatPrice(state.subtotal, currency)}</span>
          </div>
          {state.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({state.discountCode})</span>
              <span>-{formatPrice(state.discount, currency)}</span>
            </div>
          )}
          {state.taxConfig.enabled && state.taxConfig.rate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax ({state.taxConfig.rate}%)
                {state.taxConfig.includeInPrice && (
                  <span className="ml-1 text-[10px]">(incl.)</span>
                )}
              </span>
              <span>{formatPrice(state.tax, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span>Total</span>
            <span>{formatPrice(state.total, currency)}</span>
          </div>
        </div>
      )}

      {/* Continue button */}
      <Button
        onClick={handleContinue}
        disabled={totalParticipants === 0}
        className="w-full"
        size="lg"
      >
        {state.availableAddOns.length > 0 ? "Continue to Add-ons" : "Continue to Details"}
      </Button>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        You won&apos;t be charged yet. Review your booking on the next step.
      </p>
    </div>
  );
}
