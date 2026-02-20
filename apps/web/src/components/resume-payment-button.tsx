"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

interface ResumePaymentButtonProps {
  referenceNumber: string;
  email: string;
  className?: string;
}

export function ResumePaymentButton({
  referenceNumber,
  email,
  className,
}: ResumePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/manage/resume-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber,
          email,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { paymentUrl?: string; message?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to resume payment right now.");
      }

      if (payload?.paymentUrl) {
        window.location.href = payload.paymentUrl;
        return;
      }

      throw new Error(payload?.message || "Unable to resume payment right now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resume payment right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={
          className ||
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        <RotateCcw className="h-4 w-4" />
        {isLoading ? "Preparing payment..." : "Resume Payment"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
