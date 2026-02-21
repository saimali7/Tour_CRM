"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronUp, Clock, MapPin, X } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";
import { PromoCodeInput } from "./promo-code-input";

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getParticipantSummary(participants: Array<{ type: string }>): string {
  const adults = participants.filter((p) => p.type === "adult").length;
  const children = participants.filter((p) => p.type === "child").length;
  const infants = participants.filter((p) => p.type === "infant").length;
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? "s" : ""}`);
  if (children > 0) parts.push(`${children} Child${children !== 1 ? "ren" : ""}`);
  if (infants > 0) parts.push(`${infants} Infant${infants !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : "No guests selected";
}

export function MobileCheckoutBar() {
  const { state, nextStep } = useBooking();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [priceAnimating, setPriceAnimating] = useState(false);
  const prevTotal = useRef(state.total);

  const participantSummary = useMemo(
    () => getParticipantSummary(state.participants),
    [state.participants]
  );

  useEffect(() => {
    if (prevTotal.current !== state.total && prevTotal.current !== 0) {
      setPriceAnimating(true);
      const timer = setTimeout(() => setPriceAnimating(false), 300);
      prevTotal.current = state.total;
      return () => clearTimeout(timer);
    }
    prevTotal.current = state.total;
  }, [state.total]);

  if (state.step === "confirmation" || state.step === "waiver") return null;

  return (
    <>
      {/* Sticky bottom bar — visible only below lg */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden animate-slide-up">
        <div
          className="border-t border-border/60 bg-card/95 backdrop-blur-xl shadow-[0_-4px_20px_rgb(0_0_0/0.08)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center justify-center gap-1 px-4 pt-2 pb-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="View booking summary"
          >
            <ChevronUp className="h-3 w-3" />
            <span>View details</span>
          </button>

          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-0.5">
            <div className="min-w-0 flex-1">
              <p
                className={`text-lg font-bold tracking-tight text-foreground tabular-nums transition-transform ${
                  priceAnimating ? "scale-105" : ""
                }`}
              >
                {formatPrice(state.total, state.currency)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {participantSummary}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={nextStep}
              disabled={state.step === "payment" || state.participants.length === 0}
              className="shrink-0 px-5 text-sm font-semibold shadow-md"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded summary sheet */}
      {sheetOpen && <MobileCheckoutSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}

function MobileCheckoutSheet({ onClose }: { onClose: () => void }) {
  const { state } = useBooking();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border/60 bg-card shadow-2xl animate-sheet-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Booking summary"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-base font-semibold text-foreground">Booking Summary</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close summary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {/* Tour info */}
          <div className="space-y-2 pb-4">
            <h4 className="text-sm font-medium text-foreground">
              {state.tour?.name ?? "Selected Tour"}
            </h4>
            {state.bookingDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(state.bookingDate)}
                </span>
              </div>
            )}
            {state.bookingTime && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{formatTime(state.bookingTime)}</span>
              </div>
            )}
            {state.tour?.meetingPoint && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{state.tour.meetingPoint}</span>
              </div>
            )}
          </div>

          {/* Participants */}
          {state.participants.length > 0 && (
            <div className="border-t border-border/40 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Participants
              </p>
              <div className="space-y-1">
                {(() => {
                  const adults = state.participants.filter((p) => p.type === "adult");
                  const children = state.participants.filter((p) => p.type === "child");
                  const infants = state.participants.filter((p) => p.type === "infant");
                  return (
                    <>
                      {adults.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {adults.length} Adult{adults.length !== 1 ? "s" : ""}
                          </span>
                          <span className="tabular-nums">
                            {formatPrice(adults.reduce((s, p) => s + p.price, 0), state.currency)}
                          </span>
                        </div>
                      )}
                      {children.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {children.length} Child{children.length !== 1 ? "ren" : ""}
                          </span>
                          <span className="tabular-nums">
                            {formatPrice(children.reduce((s, p) => s + p.price, 0), state.currency)}
                          </span>
                        </div>
                      )}
                      {infants.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {infants.length} Infant{infants.length !== 1 ? "s" : ""}
                          </span>
                          <span className="tabular-nums text-muted-foreground">Free</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {state.selectedAddOns.length > 0 && (
            <div className="border-t border-border/40 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Add-ons
              </p>
              <div className="space-y-1">
                {state.selectedAddOns.map((addon) => (
                  <div key={addon.addOnProductId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {addon.name} x {addon.quantity}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(addon.unitPrice * addon.quantity, state.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="border-t border-border/40 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Participants</span>
              <span className="tabular-nums">
                {formatPrice(state.participantSubtotal, state.currency)}
              </span>
            </div>
            {state.addOnSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-ons</span>
                <span className="tabular-nums">
                  {formatPrice(state.addOnSubtotal, state.currency)}
                </span>
              </div>
            )}
            {state.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span className="tabular-nums">
                  -{formatPrice(state.discount, state.currency)}
                </span>
              </div>
            )}
            {state.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">
                  {formatPrice(state.tax, state.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/40 pt-3 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatPrice(state.total, state.currency)}
              </span>
            </div>
          </div>

          {/* Promo code */}
          <div className="border-t border-border/40 pt-3">
            <PromoCodeInput collapsed />
          </div>
        </div>
      </div>
    </>
  );
}
