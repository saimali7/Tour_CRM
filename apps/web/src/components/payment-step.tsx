"use client";

import { useState } from "react";
import { ChevronLeft, CreditCard, Lock, AlertCircle } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

interface PaymentStepProps {
  organizationName: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function PaymentStep({ organizationName }: PaymentStepProps) {
  const { state, dispatch, prevStep } = useBooking();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      // Create booking via API using availability-based model
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tourId: state.tour?.id,
          bookingDate: state.bookingDate?.toISOString().split("T")[0],
          bookingTime: state.bookingTime,
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
        return;
      }

      // For paid bookings, we would redirect to Stripe checkout
      // For now, simulate a successful payment
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        // Simulate successful payment for demo
        dispatch({
          type: "SET_BOOKING_RESULT",
          bookingId: data.booking.id,
          referenceNumber: data.booking.referenceNumber,
        });
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
        Back to details
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
        </div>

        <div className="pt-2 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(state.subtotal, state.currency)}</span>
          </div>
          {state.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({state.discountCode})</span>
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
        <a href="/terms" className="text-primary hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
