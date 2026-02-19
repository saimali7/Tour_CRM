"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileSignature } from "lucide-react";
import { Button } from "@tour/ui";

interface PostBookingWaiversProps {
  bookingId: string;
  customerName?: string;
  customerEmail?: string;
}

interface WaiverStatusItem {
  waiverTemplateId: string;
  waiverName: string;
  isSigned: boolean;
  signedAt?: string;
}

interface WaiverStatusPayload {
  bookingId: string;
  requiredWaivers: WaiverStatusItem[];
  allWaiversSigned: boolean;
}

interface FormState {
  fullName: string;
  email: string;
  agree: boolean;
  signature: string;
}

export function PostBookingWaivers({ bookingId, customerName, customerEmail }: PostBookingWaiversProps) {
  const [status, setStatus] = useState<WaiverStatusPayload | null>(null);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/waivers/status?bookingId=${encodeURIComponent(bookingId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to load waiver status");
      }

      const payload = (await response.json()) as { status: WaiverStatusPayload };
      setStatus(payload.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waivers");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const pendingWaivers = useMemo(
    () => status?.requiredWaivers.filter((waiver) => !waiver.isSigned) || [],
    [status]
  );

  const defaultName = customerName || "";
  const defaultEmail = customerEmail || "";

  const getForm = (waiverTemplateId: string): FormState =>
    forms[waiverTemplateId] || {
      fullName: defaultName,
      email: defaultEmail,
      agree: false,
      signature: "",
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

    if (!form.fullName || !form.email || !form.agree || !form.signature) {
      setError("Complete signature details and agreement before submitting.");
      return;
    }

    setSubmitting(waiverTemplateId);
    setError(null);

    try {
      const response = await fetch("/api/waivers/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
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

      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign waiver");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking waiver requirements...</p>;
  }

  if (!status || status.requiredWaivers.length === 0) {
    return null;
  }

  if (status.allWaiversSigned) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="inline-flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          All required waivers are signed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Complete waiver signature</h3>
      <p className="text-xs text-muted-foreground">
        {pendingWaivers.length} required waiver{pendingWaivers.length !== 1 ? "s" : ""} pending.
      </p>

      {pendingWaivers.map((waiver) => {
        const form = getForm(waiver.waiverTemplateId);

        return (
          <div key={waiver.waiverTemplateId} className="rounded-md border border-border bg-secondary/60 p-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <FileSignature className="h-4 w-4" />
              {waiver.waiverName}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />

            <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(event) => setForm(waiver.waiverTemplateId, { agree: event.target.checked })}
              />
              I agree to this waiver.
            </label>

            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleSign(waiver.waiverTemplateId)}
                disabled={submitting === waiver.waiverTemplateId}
              >
                {submitting === waiver.waiverTemplateId ? "Signing..." : "Sign"}
              </Button>
            </div>
          </div>
        );
      })}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
