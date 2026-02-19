"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileSignature } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking } from "@/lib/booking-context";

interface FormState {
  fullName: string;
  email: string;
  agree: boolean;
  signature: string;
}

export function WaiverStep() {
  const { state, markWaiverSigned, nextStep } = useBooking();
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingWaivers = useMemo(
    () => state.requiredWaivers.filter((waiver) => !waiver.isSigned),
    [state.requiredWaivers]
  );

  const defaultName = `${state.customer?.firstName || ""} ${state.customer?.lastName || ""}`.trim();
  const defaultEmail = state.customer?.email || "";

  if (!state.bookingId) {
    return null;
  }

  const getForm = (waiverTemplateId: string): FormState => {
    return forms[waiverTemplateId] || {
      fullName: defaultName,
      email: defaultEmail,
      agree: false,
      signature: "",
    };
  };

  const setForm = (waiverTemplateId: string, next: Partial<FormState>) => {
    const current = getForm(waiverTemplateId);
    setForms((prev) => ({
      ...prev,
      [waiverTemplateId]: {
        ...current,
        ...next,
      },
    }));
  };

  const handleSign = async (waiverTemplateId: string) => {
    const form = getForm(waiverTemplateId);
    setError(null);

    if (!form.fullName || !form.email || !form.agree || !form.signature) {
      setError("Complete signature details and agreement before submitting.");
      return;
    }

    setSubmittingId(waiverTemplateId);

    try {
      const response = await fetch("/api/waivers/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: state.bookingId,
          waiverTemplateId,
          signedByName: form.fullName,
          signedByEmail: form.email,
          signatureData: form.signature,
          signatureType: "typed",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to sign waiver");
      }

      const payload = await response.json();
      markWaiverSigned(waiverTemplateId, payload?.signedWaiver?.signedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign waiver");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Waiver Signature</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your booking is confirmed. Please sign the required waiver(s) to finalize your check-in compliance.
        </p>
      </div>

      {state.requiredWaivers.map((waiver) => {
        const form = getForm(waiver.waiverTemplateId);
        const isSigned = waiver.isSigned;

        return (
          <div key={waiver.waiverTemplateId} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-medium">{waiver.waiverName}</h4>
                {waiver.waiverContent ? (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border bg-secondary/70 p-3 text-xs text-muted-foreground">
                    {waiver.waiverContent}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Review and accept this waiver to continue.</p>
                )}
              </div>
              {isSigned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Signed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <FileSignature className="h-3.5 w-3.5" />
                  Pending
                </span>
              )}
            </div>

            {!isSigned && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.fullName}
                    onChange={(event) => setForm(waiver.waiverTemplateId, { fullName: event.target.value })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(event) => setForm(waiver.waiverTemplateId, { email: event.target.value })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Type your full name as signature"
                  value={form.signature}
                  onChange={(event) => setForm(waiver.waiverTemplateId, { signature: event.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />

                <label className="inline-flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(event) => setForm(waiver.waiverTemplateId, { agree: event.target.checked })}
                    className="mt-0.5"
                  />
                  I have read and agree to this waiver.
                </label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSign(waiver.waiverTemplateId)}
                  disabled={submittingId === waiver.waiverTemplateId}
                >
                  {submittingId === waiver.waiverTemplateId ? "Signing..." : "Sign Waiver"}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={pendingWaivers.length > 0}
        onClick={nextStep}
      >
        Continue to Confirmation
      </Button>
    </div>
  );
}
