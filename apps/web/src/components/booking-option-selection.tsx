"use client";

import { Check } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

export function BookingOptionSelection() {
  const { state, setBookingOption, nextStep } = useBooking();

  if (state.bookingOptions.length === 0) {
    return null;
  }

  const handleContinue = () => {
    if (state.bookingOptionId) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Choose Your Booking Option</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select how you want to book this tour before choosing tickets.
        </p>
      </div>

      <div className="space-y-3">
        {state.bookingOptions.map((option) => {
          const isSelected = option.id === state.bookingOptionId;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setBookingOption(option.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "border-border hover:border-primary/40"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{option.name}</p>
                    {option.badge && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.shortDescription && (
                    <p className="text-sm text-muted-foreground">{option.shortDescription}</p>
                  )}
                  {option.highlightText && (
                    <p className="text-sm text-primary">{option.highlightText}</p>
                  )}
                </div>

                <div
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Button onClick={handleContinue} disabled={!state.bookingOptionId} className="w-full" size="lg">
        Continue to Tickets
      </Button>
    </div>
  );
}
