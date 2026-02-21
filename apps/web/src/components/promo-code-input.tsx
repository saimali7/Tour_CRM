"use client";

import { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

type DiscountType = "promo" | "voucher";

function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseAppliedDiscountCode(
  discountCode: string | null
): { type: DiscountType; code: string } | null {
  if (!discountCode) return null;
  const [rawType, ...codeParts] = discountCode.split(":");
  const code = codeParts.join(":").trim();
  const type = rawType?.trim().toLowerCase();
  if (!code || (type !== "promo" && type !== "voucher")) return null;
  return { type, code };
}

interface PromoCodeInputProps {
  collapsed?: boolean;
}

export function PromoCodeInput({ collapsed = true }: PromoCodeInputProps) {
  const { state, dispatch } = useBooking();
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [discountType, setDiscountType] = useState<DiscountType>("promo");
  const [codeInput, setCodeInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appliedDiscount = parseAppliedDiscountCode(state.discountCode);

  useEffect(() => {
    const current = parseAppliedDiscountCode(state.discountCode);
    if (!current) return;
    setDiscountType((prev) => (prev === current.type ? prev : current.type));
    setCodeInput((prev) => (prev === current.code ? prev : current.code));
  }, [state.discountCode]);

  const handleApply = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setError("Enter a promo or voucher code.");
      setFeedback(null);
      return;
    }

    if (!state.tour?.id) {
      setError("Tour details are missing.");
      return;
    }

    if (!state.customer?.email || !state.customer.firstName || !state.customer.lastName) {
      setError("Please fill in your details first before applying a code.");
      return;
    }

    setIsApplying(true);
    setError(null);
    setFeedback(null);

    try {
      let calculatedDiscount = 0;

      if (discountType === "promo") {
        const response = await fetch("/api/promos/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        if (!response.ok) throw new Error(data.message || "Unable to validate promo code.");
        if (!data.valid) throw new Error(data.error || "Invalid promo code.");
        if (!data.discount) throw new Error("Promo code is valid but no discount was returned.");

        calculatedDiscount =
          data.discount.type === "percentage"
            ? state.subtotal * ((data.discount.value || 0) / 100)
            : Number(data.discount.value || 0);
      } else {
        const response = await fetch("/api/vouchers/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = (await response.json()) as {
          valid?: boolean;
          message?: string;
          error?: string;
          type?: string;
          value?: number;
          voucher?: { tourId?: string | null } | null;
        };

        if (!response.ok) throw new Error(data.message || "Unable to validate voucher.");
        if (!data.valid) throw new Error(data.error || "Invalid voucher.");

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
        throw new Error("Calculated discount is invalid.");
      }

      const amount = roundToTwoDecimals(Math.min(state.subtotal, calculatedDiscount));
      dispatch({ type: "SET_DISCOUNT", code: `${discountType}:${code}`, amount });
      setFeedback(discountType === "promo" ? "Promo code applied!" : "Voucher applied!");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply discount code.");
      setFeedback(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = () => {
    dispatch({ type: "CLEAR_DISCOUNT" });
    setCodeInput("");
    setFeedback("Discount removed.");
    setError(null);
  };

  if (appliedDiscount) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/60 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Tag className="h-3.5 w-3.5" />
          <span className="font-medium">{appliedDiscount.code}</span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      {collapsed && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Have a promo code?</span>
        </button>
      ) : (
        <div className="space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              disabled={isApplying}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="promo">Promo</option>
              <option value="voucher">Voucher</option>
            </select>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleApply();
                }
              }}
              placeholder="Enter code"
              disabled={isApplying}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleApply()}
              disabled={isApplying || codeInput.trim().length === 0}
            >
              {isApplying ? "..." : "Apply"}
            </Button>
          </div>
          {feedback && <p className="text-xs text-green-700">{feedback}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
