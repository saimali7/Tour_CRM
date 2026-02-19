"use client";

import { Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function AddonSelection() {
  const { state, setAddOnQuantity, nextStep, prevStep } = useBooking();

  const selectedLookup = new Map(
    state.selectedAddOns.map((selection) => [selection.addOnProductId, selection])
  );

  if (state.availableAddOns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={prevStep}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back
      </button>

      <div>
        <h3 className="text-lg font-semibold">Add extras to your booking</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose optional upgrades before you enter traveler details.
        </p>
      </div>

      <div className="space-y-3">
        {state.availableAddOns.map((addOn) => {
          const selected = selectedLookup.get(addOn.id);
          const quantity = selected?.quantity || 0;
          const selectedLineTotal = quantity * addOn.effectivePrice;
          const isRequired = Boolean(addOn.isRequired);

          return (
            <div
              key={addOn.id}
              className={`rounded-lg border p-4 ${quantity > 0 ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <p className="font-medium">{addOn.name}</p>
                    {addOn.isRecommended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                        <Sparkles className="h-3 w-3" />
                        Recommended
                      </span>
                    )}
                    {isRequired && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                  {addOn.shortDescription || addOn.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{addOn.shortDescription || addOn.description}</p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium">
                    {formatPrice(addOn.effectivePrice, state.currency)}
                    {addOn.type === "per_person" ? " per guest" : addOn.type === "quantity" ? " each" : " per booking"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddOnQuantity(addOn.id, quantity - 1)}
                    disabled={isRequired ? quantity <= 1 : quantity <= 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Decrease ${addOn.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const increment = addOn.type === "per_person" && quantity === 0
                        ? state.participants.length || 1
                        : quantity + 1;
                      setAddOnQuantity(addOn.id, increment);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
                    aria-label={`Increase ${addOn.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {quantity > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Added: {quantity} · {formatPrice(selectedLineTotal, state.currency)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Add-ons total</span>
          <span className="font-semibold">{formatPrice(state.addOnSubtotal, state.currency)}</span>
        </div>
      </div>

      <Button type="button" className="w-full" size="lg" onClick={nextStep}>
        Continue to Details
      </Button>
    </div>
  );
}
