"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, CreditCard, Lock, AlertCircle } from "lucide-react";
import { Button } from "@tour/ui";
import { formatLocalDateKey, useBooking } from "@/lib/booking-context";

interface PaymentStepProps {
  organizationName: string;
  organizationSlug: string;
}

type DiscountType = "promo" | "voucher";

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseAppliedDiscountCode(
  discountCode: string | null
): { type: DiscountType; code: string } | null {
  if (!discountCode) {
    return null;
  }

  const [rawType, ...codeParts] = discountCode.split(":");
  const code = codeParts.join(":").trim();
  const type = rawType?.trim().toLowerCase();

  if (!code || (type !== "promo" && type !== "voucher")) {
    return null;
  }

  return {
    type,
    code,
  };
}

export function PaymentStep({ organizationName, organizationSlug }: PaymentStepProps) {
  const {
    state,
    dispatch,
    prevStep,
    setAbandonedCartId,
    setIdempotencyKey,
    setRequiredWaivers,
  } = useBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("promo");
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountFeedback, setDiscountFeedback] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const appliedDiscount = parseAppliedDiscountCode(state.discountCode);
  const appliedDiscountLabel = appliedDiscount
    ? `${appliedDiscount.type === "promo" ? "Promo" : "Voucher"} ${appliedDiscount.code}`
    : state.discountCode;

  useEffect(() => {
    const customerEmail = state.customer?.email?.trim();
    if (!customerEmail || !state.tour?.id || state.participants.length === 0) {
      return;
    }

    let isCancelled = false;

    const persistAbandonedCart = async () => {
      try {
        const response = await fetch("/api/abandoned-carts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourId: state.tour?.id,
            customer: {
              email: state.customer?.email,
              firstName: state.customer?.firstName,
              lastName: state.customer?.lastName,
              phone: state.customer?.phone,
            },
            bookingDate: state.bookingDate ? formatLocalDateKey(state.bookingDate) : undefined,
            bookingTime: state.bookingTime,
            participants: state.participants.map((participant) => ({
              type: participant.type,
            })),
            selectedAddOns: state.selectedAddOns.map((addOn) => ({
              addOnProductId: addOn.addOnProductId,
              quantity: addOn.quantity,
            })),
            subtotal: state.subtotal.toFixed(2),
            total: state.total.toFixed(2),
            currency: state.currency,
            lastStep: "payment",
          }),
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!isCancelled && data?.cartId) {
          setAbandonedCartId(data.cartId as string);
        }
      } catch {
        // Keep checkout flow resilient if abandoned-cart tracking fails.
      }
    };

    void persistAbandonedCart();

    return () => {
      isCancelled = true;
    };
  }, [
    setAbandonedCartId,
    state.bookingDate,
    state.bookingTime,
    state.currency,
    state.customer?.email,
    state.customer?.firstName,
    state.customer?.lastName,
    state.customer?.phone,
    state.participants,
    state.selectedAddOns,
    state.subtotal,
    state.total,
    state.tour?.id,
  ]);

  useEffect(() => {
    const currentAppliedDiscount = parseAppliedDiscountCode(state.discountCode);
    if (!currentAppliedDiscount) {
      return;
    }

    setDiscountType((previous) =>
      previous === currentAppliedDiscount.type
        ? previous
        : currentAppliedDiscount.type
    );
    setDiscountCodeInput((previous) =>
      previous === currentAppliedDiscount.code
        ? previous
        : currentAppliedDiscount.code
    );
  }, [state.discountCode]);

  const handleApplyDiscount = async () => {
    const code = discountCodeInput.trim().toUpperCase();

    if (!code) {
      setDiscountError("Enter a promo or voucher code.");
      setDiscountFeedback(null);
      return;
    }

    if (!state.tour?.id) {
      setDiscountError("Tour details are missing. Please go back and select a tour again.");
      setDiscountFeedback(null);
      return;
    }

    if (
      !state.customer?.email ||
      !state.customer.firstName ||
      !state.customer.lastName
    ) {
      setDiscountError("Customer details are required before applying a code.");
      setDiscountFeedback(null);
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError(null);
    setDiscountFeedback(null);
    dispatch({ type: "SET_ERROR", error: null });

    try {
      let calculatedDiscount = 0;

      if (discountType === "promo") {
        const response = await fetch("/api/promos/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            tourId: state.tour.id,
            bookingAmount: state.subtotal.toFixed(2),
            customer: {
              email: state.customer.email,
              firstName: state.customer.firstName,
              lastName: state.customer.lastName,
              phone: state.customer.phone,
            },
          }),
        });

        const data = (await response.json()) as {
          valid?: boolean;
          message?: string;
          error?: string;
          discount?: { type?: string; value?: number };
        };

        if (!response.ok) {
          throw new Error(data.message || "Unable to validate promo code.");
        }

        if (!data.valid) {
          throw new Error(data.error || "Invalid promo code.");
        }

        if (!data.discount) {
          throw new Error("Promo code is valid but no discount was returned.");
        }

        if (data.discount.type === "percentage") {
          calculatedDiscount = state.subtotal * ((data.discount.value || 0) / 100);
        } else {
          calculatedDiscount = Number(data.discount.value || 0);
        }
      } else {
        const response = await fetch("/api/vouchers/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data = (await response.json()) as {
          valid?: boolean;
          message?: string;
          error?: string;
          type?: string;
          value?: number;
          voucher?: {
            tourId?: string | null;
          } | null;
        };

        if (!response.ok) {
          throw new Error(data.message || "Unable to validate voucher.");
        }

        if (!data.valid) {
          throw new Error(data.error || "Invalid voucher.");
        }

        if (data.type === "tour") {
          const voucherTourId = data.voucher?.tourId;
          if (voucherTourId && voucherTourId !== state.tour.id) {
            throw new Error("This voucher is not valid for the selected tour.");
          }
          calculatedDiscount = state.subtotal;
        } else if (data.type === "percentage") {
          calculatedDiscount = state.subtotal * ((data.value || 0) / 100);
        } else {
          calculatedDiscount = Number(data.value || 0);
        }
      }

      if (!Number.isFinite(calculatedDiscount) || calculatedDiscount < 0) {
        throw new Error("Calculated discount is invalid. Please try another code.");
      }

      const amount = roundToTwoDecimals(Math.min(state.subtotal, calculatedDiscount));
      dispatch({
        type: "SET_DISCOUNT",
        code: `${discountType}:${code}`,
        amount,
      });
      setDiscountFeedback(
        discountType === "promo" ? "Promo code applied." : "Voucher applied."
      );
      setDiscountError(null);
    } catch (error) {
      setDiscountError(
        error instanceof Error ? error.message : "Failed to apply discount code."
      );
      setDiscountFeedback(null);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    dispatch({ type: "CLEAR_DISCOUNT" });
    setDiscountFeedback("Discount removed.");
    setDiscountError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const requestIdempotencyKey =
        state.idempotencyKey ||
        `web-${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}`;
      if (!state.idempotencyKey) {
        setIdempotencyKey(requestIdempotencyKey);
      }

      // Create booking via API using availability-based model
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": requestIdempotencyKey,
        },
        body: JSON.stringify({
          tourId: state.tour?.id,
          bookingDate: state.bookingDate ? formatLocalDateKey(state.bookingDate) : undefined,
          bookingTime: state.bookingTime,
          bookingOptionId: state.bookingOptionId ?? undefined,
          selectedAddOns: state.selectedAddOns.map((addOn) => ({
            addOnProductId: addOn.addOnProductId,
            quantity: addOn.quantity,
          })),
          customer: state.customer,
          participants: state.participants.map((p) => ({
            firstName: p.firstName || state.customer?.firstName,
            lastName: p.lastName || state.customer?.lastName,
            email: p.email,
            type: p.type,
          })),
          subtotal: state.subtotal.toFixed(2),
          discount: state.discount.toFixed(2),
          tax: state.tax.toFixed(2),
          total: state.total.toFixed(2),
          discountCode: state.discountCode,
          abandonedCartId: state.abandonedCartId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create booking");
      }

      const data = await response.json();

      // For free bookings, skip payment and go to confirmation
      if (state.total === 0) {
        dispatch({
          type: "SET_BOOKING_RESULT",
          bookingId: data.booking.id,
          referenceNumber: data.booking.referenceNumber,
        });

        if (state.tour?.id) {
          try {
            const waiverResponse = await fetch(
              `/api/waivers/required?tourId=${encodeURIComponent(state.tour.id)}`,
              { cache: "no-store" }
            );

            if (waiverResponse.ok) {
              const waiverPayload = (await waiverResponse.json()) as {
                waivers?: Array<{
                  waiverTemplateId: string;
                  waiverName: string;
                  waiverContent?: string | null;
                }>;
              };

              const requiredWaivers = (waiverPayload.waivers || []).map((waiver) => ({
                waiverTemplateId: waiver.waiverTemplateId,
                waiverName: waiver.waiverName,
                waiverContent: waiver.waiverContent ?? null,
                isSigned: false,
              }));

              setRequiredWaivers(requiredWaivers);

              if (requiredWaivers.length > 0) {
                dispatch({ type: "SET_STEP", step: "waiver" });
                return;
              }
            }
          } catch {
            // Keep checkout resilient and continue to confirmation.
          }
        }

        dispatch({ type: "SET_STEP", step: "confirmation" });
        return;
      }

      // For paid bookings, we would redirect to Stripe checkout
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("Payment session unavailable. Please try again in a moment.");
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={prevStep}
        disabled={isProcessing}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to review
      </button>

      {/* Payment Header */}
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Payment</h3>
      </div>

      {/* Order Summary */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
        <h4 className="font-medium">Order Summary</h4>

        <div className="space-y-2 text-sm">
          {state.participants.filter((p) => p.type === "adult").length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Adults x {state.participants.filter((p) => p.type === "adult").length}
              </span>
              <span>
                {formatPrice(
                  state.participants
                    .filter((p) => p.type === "adult")
                    .reduce((sum, p) => sum + p.price, 0),
                  state.currency
                )}
              </span>
            </div>
          )}
          {state.participants.filter((p) => p.type === "child").length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Children x {state.participants.filter((p) => p.type === "child").length}
              </span>
              <span>
                {formatPrice(
                  state.participants
                    .filter((p) => p.type === "child")
                    .reduce((sum, p) => sum + p.price, 0),
                  state.currency
                )}
              </span>
            </div>
          )}
          {state.participants.filter((p) => p.type === "infant").length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Infants x {state.participants.filter((p) => p.type === "infant").length}
              </span>
              <span>Free</span>
            </div>
          )}
          {state.selectedAddOns.map((addOn) => (
            <div key={addOn.addOnProductId} className="flex justify-between">
              <span className="text-muted-foreground">
                {addOn.name} x {addOn.quantity}
              </span>
              <span>{formatPrice(addOn.quantity * addOn.unitPrice, state.currency)}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(state.subtotal, state.currency)}</span>
          </div>
          {state.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({appliedDiscountLabel})</span>
              <span>-{formatPrice(state.discount, state.currency)}</span>
            </div>
          )}
          {state.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(state.tax, state.currency)}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(state.total, state.currency)}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <h4 className="font-medium">Promo or Voucher</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="discountType" className="block text-xs font-medium mb-1 text-muted-foreground">
                Code type
              </label>
              <select
                id="discountType"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                disabled={isProcessing || isApplyingDiscount}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="promo">Promo</option>
                <option value="voucher">Voucher</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="discountCode" className="block text-xs font-medium mb-1 text-muted-foreground">
                Code
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="discountCode"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleApplyDiscount();
                    }
                  }}
                  placeholder={discountType === "promo" ? "Enter promo code" : "Enter voucher code"}
                  disabled={isProcessing || isApplyingDiscount}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleApplyDiscount()}
                  disabled={isProcessing || isApplyingDiscount || discountCodeInput.trim().length === 0}
                >
                  {isApplyingDiscount ? "Applying..." : "Apply"}
                </Button>
                {state.discountCode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveDiscount}
                    disabled={isProcessing || isApplyingDiscount}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
          {discountFeedback && (
            <p className="text-sm text-green-700">{discountFeedback}</p>
          )}
          {discountError && (
            <p className="text-sm text-red-600">{discountError}</p>
          )}
        </div>

        {state.total > 0 ? (
          <>
            {/* Card Input Placeholder */}
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground mb-4">
                You will be redirected to our secure payment provider to complete your purchase.
              </p>

              {/* Payment Method Icons */}
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 bg-muted rounded text-xs font-medium">Visa</div>
                <div className="px-2 py-1 bg-muted rounded text-xs font-medium">Mastercard</div>
                <div className="px-2 py-1 bg-muted rounded text-xs font-medium">Amex</div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>Pay {formatPrice(state.total, state.currency)}</>
              )}
            </Button>
          </>
        ) : (
          <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Confirming...
              </>
            ) : (
              "Complete Free Booking"
            )}
          </Button>
        )}
      </form>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secure payment powered by Stripe</span>
      </div>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center">
        By completing this booking, you agree to {organizationName}&apos;s{" "}
        <a href={`/org/${organizationSlug}/terms`} className="text-primary hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href={`/org/${organizationSlug}/privacy`} className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
