"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ReviewStep() {
  const { state, nextStep, prevStep } = useBooking();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const guestMix = useMemo(() => {
    const adults = state.participants.filter((participant) => participant.type === "adult").length;
    const children = state.participants.filter((participant) => participant.type === "child").length;
    const infants = state.participants.filter((participant) => participant.type === "infant").length;
    return { adults, children, infants };
  }, [state.participants]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={prevStep}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to details
      </button>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Review Your Booking</h3>
        <p className="text-sm text-muted-foreground">
          Confirm details before continuing to secure payment.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tour</p>
          <p className="font-medium">{state.tour?.name || "Selected tour"}</p>
          <p className="text-sm text-muted-foreground">
            {state.bookingDate
              ? new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(state.bookingDate)
              : "Date TBD"}{" "}
            • {state.bookingTime || "Time TBD"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Guest mix</p>
            <p className="text-sm">
              {guestMix.adults} Adult(s)
              {guestMix.children > 0 ? ` • ${guestMix.children} Child(ren)` : ""}
              {guestMix.infants > 0 ? ` • ${guestMix.infants} Infant(s)` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead contact</p>
            <p className="text-sm">
              {state.customer?.firstName} {state.customer?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{state.customer?.email}</p>
          </div>
        </div>

        {state.selectedAddOns.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Add-ons</p>
            <ul className="space-y-1 text-sm">
              {state.selectedAddOns.map((addOn) => (
                <li key={addOn.addOnProductId}>
                  {addOn.name} x {addOn.quantity} (
                  {formatMoney(addOn.unitPrice * addOn.quantity, state.currency)})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.customer?.specialRequests ? (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Special requests</p>
            <p className="text-sm text-muted-foreground">{state.customer.specialRequests}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Participants</span>
          <span>{formatMoney(state.participantSubtotal, state.currency)}</span>
        </div>
        {state.addOnSubtotal > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Add-ons</span>
            <span>{formatMoney(state.addOnSubtotal, state.currency)}</span>
          </div>
        ) : null}
        {state.discount > 0 ? (
          <div className="flex items-center justify-between text-sm text-green-700">
            <span>Discount</span>
            <span>-{formatMoney(state.discount, state.currency)}</span>
          </div>
        ) : null}
        {state.tax > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(state.tax, state.currency)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(state.total, state.currency)}</span>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-start gap-2 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            By continuing, you confirm booking details are correct and you agree to cancellation and payment terms.
          </span>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => setAgreedToTerms(event.target.checked)}
            className="mt-1"
          />
          <span>I confirm the information above and want to continue to payment.</span>
        </label>
      </div>

      {!agreedToTerms ? (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Accept confirmation before continuing to payment.</span>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={nextStep}
        className="w-full"
        size="lg"
        disabled={!agreedToTerms}
      >
        Continue to Payment
      </Button>
    </div>
  );
}
