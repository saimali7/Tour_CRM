"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe as StripeType, type StripeError } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { ChevronLeft, CreditCard, Lock, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@tour/ui";
import { formatLocalDateKey, useBooking } from "@/lib/booking-context";

interface PaymentStepProps {
  organizationName: string;
  organizationSlug: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

// Lazy-load Stripe.js as a singleton
let stripePromise: Promise<StripeType | null> | null = null;

function getStripePromise(): Promise<StripeType | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// --- Stripe Elements appearance matching the design system ---
const stripeAppearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "hsl(24, 71%, 43%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorText: "hsl(20, 28%, 14%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorTextSecondary: "hsl(22, 15%, 42%)",
    colorTextPlaceholder: "hsl(22, 15%, 62%)",
    fontSizeBase: "14px",
    spacingUnit: "4px",
    borderRadius: "8px",
  },
  rules: {
    ".Input": {
      border: "1px solid hsl(28, 36%, 86%)",
      padding: "12px",
      boxShadow: "inset 0 1px 2px hsl(0 0% 0% / 0.04)",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
    },
    ".Input:focus": {
      border: "1px solid hsl(24, 71%, 43%)",
      boxShadow: "0 0 0 3px hsl(24 71% 43% / 0.15)",
    },
    ".Input--invalid": {
      border: "1px solid hsl(0, 72%, 51%)",
      boxShadow: "0 0 0 3px hsl(0 72% 51% / 0.1)",
    },
    ".Label": {
      color: "hsl(22, 15%, 42%)",
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "6px",
    },
    ".Error": {
      color: "hsl(0, 72%, 51%)",
      fontSize: "13px",
      marginTop: "6px",
    },
    ".Tab": {
      border: "1px solid hsl(28, 36%, 86%)",
      borderRadius: "8px",
    },
    ".Tab--selected": {
      border: "1px solid hsl(24, 71%, 43%)",
      backgroundColor: "hsl(24 71% 43% / 0.05)",
    },
  },
};

// ============================================================
// Main PaymentStep — orchestrates loading, free bookings, and Elements wrapper
// ============================================================
export function PaymentStep({ organizationName, organizationSlug }: PaymentStepProps) {
  const { state, dispatch, prevStep, setAbandonedCartId, setIdempotencyKey, setRequiredWaivers } =
    useBooking();
  const [clientSecret, setClientSecret] = useState<string | null>(state.stripeClientSecret);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isProcessingFree, setIsProcessingFree] = useState(false);
  const bookingCreatedRef = useRef(false);

  // --- Abandoned cart tracking ---
  useEffect(() => {
    const customerEmail = state.customer?.email?.trim();
    if (
      !customerEmail ||
      !state.tour?.id ||
      state.participants.length === 0 ||
      state.abandonedCartId
    ) {
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
            bookingOptionId: state.bookingOptionId ?? undefined,
            participants: state.participants.map((p) => ({ type: p.type })),
            selectedAddOns: state.selectedAddOns.map((a) => ({
              addOnProductId: a.addOnProductId,
              quantity: a.quantity,
            })),
            subtotal: state.subtotal.toFixed(2),
            discount: state.discount.toFixed(2),
            discountCode: state.discountCode,
            total: state.total.toFixed(2),
            currency: state.currency,
            lastStep: "payment",
          }),
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!isCancelled && data?.cartId) {
          setAbandonedCartId(data.cartId as string);
        }
      } catch {
        // Keep checkout resilient if abandoned-cart tracking fails.
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
    state.discount,
    state.discountCode,
    state.customer?.email,
    state.customer?.firstName,
    state.customer?.lastName,
    state.customer?.phone,
    state.customer?.accessibilityNeeds,
    state.customer?.dietaryRequirements,
    state.customer?.specialRequests,
    state.abandonedCartId,
    state.bookingOptionId,
    state.participants,
    state.selectedAddOns,
    state.subtotal,
    state.total,
    state.tour?.id,
  ]);

  // --- Create booking + PaymentIntent on mount (for paid bookings) ---
  useEffect(() => {
    if (state.total === 0 || clientSecret || bookingCreatedRef.current) return;

    bookingCreatedRef.current = true;
    setIsCreatingBooking(true);
    dispatch({ type: "SET_ERROR", error: null });

    const createBooking = async () => {
      try {
        const requestIdempotencyKey =
          state.idempotencyKey ||
          `web-${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}`;
        if (!state.idempotencyKey) {
          setIdempotencyKey(requestIdempotencyKey);
        }

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
            paymentMode: "embedded",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create booking");
        }

        const data = await response.json();

        dispatch({
          type: "SET_BOOKING_RESULT",
          bookingId: data.booking.id,
          referenceNumber: data.booking.referenceNumber,
        });

        if (data.clientSecret) {
          dispatch({ type: "SET_PAYMENT_INTENT", clientSecret: data.clientSecret });
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("Payment session unavailable. Please try again.");
        }
      } catch (error) {
        bookingCreatedRef.current = false;
        dispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "Something went wrong",
        });
      } finally {
        setIsCreatingBooking(false);
      }
    };

    void createBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Free booking handler ---
  const handleFreeBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingFree(true);
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const requestIdempotencyKey =
        state.idempotencyKey ||
        `web-${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}`;
      if (!state.idempotencyKey) {
        setIdempotencyKey(requestIdempotencyKey);
      }

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
          // Keep checkout resilient
        }
      }

      dispatch({ type: "SET_STEP", step: "confirmation" });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsProcessingFree(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={prevStep}
        disabled={isCreatingBooking || isProcessingFree}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to review
      </button>

      {/* Payment Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <CreditCard className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Payment</h3>
          <p className="text-xs text-muted-foreground">Secure, encrypted checkout</p>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Free Booking */}
      {state.total === 0 ? (
        <form onSubmit={handleFreeBooking} className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              No payment required for this booking.
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isProcessingFree}>
            {isProcessingFree ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Confirming...
              </>
            ) : (
              "Complete Free Booking"
            )}
          </Button>
        </form>
      ) : isCreatingBooking || !clientSecret ? (
        /* Loading skeleton while booking + PaymentIntent are created */
        <PaymentSkeleton />
      ) : (
        /* Stripe Elements inline payment */
        <Elements
          stripe={getStripePromise()}
          options={{
            clientSecret,
            appearance: stripeAppearance,
          }}
        >
          <InlinePaymentForm
            organizationName={organizationName}
            organizationSlug={organizationSlug}
          />
        </Elements>
      )}

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>256-bit encrypted &middot; Powered by Stripe</span>
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

// ============================================================
// InlinePaymentForm — rendered inside <Elements> with Stripe context
// ============================================================
function InlinePaymentForm({
  organizationName,
  organizationSlug,
}: {
  organizationName: string;
  organizationSlug: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { state, dispatch, setRequiredWaivers } = useBooking();
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [showExpressCheckout, setShowExpressCheckout] = useState(false);

  const handlePaymentSubmit = useCallback(async () => {
    if (!stripe || !elements || isProcessing) return;

    setIsProcessing(true);
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success?ref=${state.referenceNumber}`,
        },
        redirect: "if_required",
      });

      if (error) {
        dispatch({
          type: "SET_ERROR",
          error: error.message || "Payment failed. Please try again.",
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        setPaymentSucceeded(true);

        // Confirm payment server-side and fetch waivers
        try {
          const confirmResponse = await fetch("/api/bookings/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              bookingId: state.bookingId,
            }),
          });

          if (confirmResponse.ok) {
            const confirmData = await confirmResponse.json();

            if (confirmData.requiredWaivers?.length > 0) {
              setRequiredWaivers(
                confirmData.requiredWaivers.map(
                  (w: { waiverTemplateId: string; waiverName: string; waiverContent?: string | null }) => ({
                    ...w,
                    isSigned: false,
                  })
                )
              );

              // Brief success display before advancing
              setTimeout(() => {
                dispatch({ type: "SET_STEP", step: "waiver" });
              }, 1500);
              return;
            }
          }
        } catch {
          // Payment succeeded — continue to confirmation even if waiver fetch fails
        }

        // Brief success display before advancing
        setTimeout(() => {
          dispatch({ type: "SET_STEP", step: "confirmation" });
        }, 1500);
      } else {
        // 3DS or other action required — Stripe handles redirects automatically
        setIsProcessing(false);
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Payment failed",
      });
      setIsProcessing(false);
    }
  }, [stripe, elements, isProcessing, state.referenceNumber, state.bookingId, dispatch, setRequiredWaivers]);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void handlePaymentSubmit();
    },
    [handlePaymentSubmit]
  );

  const handleExpressCheckoutConfirm = useCallback(
    (event: StripeExpressCheckoutElementConfirmEvent) => {
      void handlePaymentSubmit();
    },
    [handlePaymentSubmit]
  );

  // Payment succeeded overlay
  if (paymentSucceeded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h4 className="text-lg font-semibold">Payment confirmed</h4>
        <p className="text-sm text-muted-foreground">
          Confirmation sent to {state.customer?.email}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      {/* Express Checkout (Apple Pay / Google Pay) */}
      {showExpressCheckout && (
        <>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Express Checkout
            </p>
            <ExpressCheckoutElement
              onConfirm={handleExpressCheckoutConfirm}
              options={{
                buttonType: { applePay: "buy", googlePay: "buy" },
                buttonHeight: 48,
              }}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                or pay with card
              </span>
            </div>
          </div>
        </>
      )}

      {/* Card Payment via PaymentElement */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <PaymentElement
          onReady={() => setIsPaymentReady(true)}
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Express checkout visibility detection */}
      <ExpressCheckoutDetector onAvailable={() => setShowExpressCheckout(true)} />

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          <span>Secure checkout</span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Visa</span>
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Mastercard</span>
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Amex</span>
        </div>
      </div>

      {/* Pay Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !isPaymentReady || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>Pay {formatPrice(state.total, state.currency)}</>
        )}
      </Button>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Processing your payment...</p>
            <p className="text-xs text-muted-foreground">Please do not close this page</p>
          </div>
        </div>
      )}
    </form>
  );
}

// ============================================================
// ExpressCheckoutDetector — hidden element that detects Apple/Google Pay availability
// ============================================================
function ExpressCheckoutDetector({ onAvailable }: { onAvailable: () => void }) {
  const calledRef = useRef(false);

  useEffect(() => {
    // Stripe's ExpressCheckoutElement auto-hides when no methods are available.
    // This component defers rendering the express section until we know it's supported.
    // For simplicity, we show it after a short delay to let Stripe detect methods.
    const timer = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onAvailable();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onAvailable]);

  return null;
}

// ============================================================
// PaymentSkeleton — shown while the booking + PaymentIntent are created
// ============================================================
function PaymentSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-11 bg-muted rounded" />
        <div className="flex gap-3">
          <div className="h-11 flex-1 bg-muted rounded" />
          <div className="h-11 flex-1 bg-muted rounded" />
        </div>
      </div>
      <div className="h-12 bg-muted rounded-lg" />
    </div>
  );
}
