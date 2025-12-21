"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  FileText,
  Globe,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingForm {
  defaultCurrency: string;
  defaultLanguage: string;
  requirePhoneNumber: boolean;
  requireAddress: boolean;
  cancellationPolicy: string;
  refundPolicy: string;
}

const POLICY_TEMPLATES = {
  cancellation: `Cancellation Policy:
- Full refund if cancelled 48 hours before tour start time
- 50% refund if cancelled 24-48 hours before tour start time
- No refund if cancelled less than 24 hours before tour start time
- Weather-related cancellations decided by tour operator`,

  refund: `Refund Policy:
- Approved refunds will be processed within 5-7 business days
- Refunds will be issued to the original payment method
- Processing fees may be non-refundable
- No-shows are not eligible for refunds`,
};

export default function BookingSettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    defaultCurrency: "AED",
    defaultLanguage: "en",
    requirePhoneNumber: false,
    requireAddress: false,
    cancellationPolicy: "",
    refundPolicy: "",
  });

  const { data: settings, isLoading } = trpc.organization.getSettings.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      utils.organization.getSettings.invalidate();
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  useEffect(() => {
    if (settings) {
      setBookingForm({
        defaultCurrency: settings.defaultCurrency || "AED",
        defaultLanguage: settings.defaultLanguage || "en",
        requirePhoneNumber: settings.requirePhoneNumber || false,
        requireAddress: settings.requireAddress || false,
        cancellationPolicy: settings.cancellationPolicy || "",
        refundPolicy: settings.refundPolicy || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateSettingsMutation.mutate(bookingForm);
  };

  const handleUseTemplate = (type: "cancellation" | "refund") => {
    if (type === "cancellation") {
      setBookingForm((prev) => ({
        ...prev,
        cancellationPolicy: POLICY_TEMPLATES.cancellation,
      }));
    } else {
      setBookingForm((prev) => ({
        ...prev,
        refundPolicy: POLICY_TEMPLATES.refund,
      }));
    }
    setHasChanges(true);
  };

  const updateField = <K extends keyof BookingForm>(field: K, value: BookingForm[K]) => {
    setBookingForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const isSubmitting = updateSettingsMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Booking Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure booking policies and requirements
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Success Toast */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300",
              saveSuccess
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 translate-x-0 opacity-100"
                : "translate-x-4 opacity-0 pointer-events-none"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Changes saved</span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              hasChanges
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Defaults Section */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Defaults</h3>
                <p className="text-xs text-muted-foreground">Currency and language settings</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  Default Currency
                </label>
                <select
                  value={bookingForm.defaultCurrency}
                  onChange={(e) => updateField("defaultCurrency", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Default Language</label>
                <select
                  value={bookingForm.defaultLanguage}
                  onChange={(e) => updateField("defaultLanguage", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        {/* Customer Requirements Section */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Customer Requirements</h3>
                <p className="text-xs text-muted-foreground">Required fields for booking</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div
              onClick={() => updateField("requirePhoneNumber", !bookingForm.requirePhoneNumber)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                bookingForm.requirePhoneNumber
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  bookingForm.requirePhoneNumber
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {bookingForm.requirePhoneNumber && (
                  <svg
                    className="h-2.5 w-2.5 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 12 12"
                  >
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">Require phone number</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers must provide a phone number to complete booking
                </p>
              </div>
            </div>

            <div
              onClick={() => updateField("requireAddress", !bookingForm.requireAddress)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                bookingForm.requireAddress
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  bookingForm.requireAddress
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {bookingForm.requireAddress && (
                  <svg
                    className="h-2.5 w-2.5 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 12 12"
                  >
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">Require address</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers must provide a full address to complete booking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Policies Section */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <FileText className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Policies</h3>
                <p className="text-xs text-muted-foreground">Terms shown to customers</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Cancellation Policy</label>
                <button
                  type="button"
                  onClick={() => handleUseTemplate("cancellation")}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Use template
                </button>
              </div>
              <textarea
                value={bookingForm.cancellationPolicy}
                onChange={(e) => updateField("cancellationPolicy", e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Describe your cancellation policy..."
              />
              <p className="text-xs text-muted-foreground">
                Displayed to customers during booking and in confirmations
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Refund Policy</label>
                <button
                  type="button"
                  onClick={() => handleUseTemplate("refund")}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Use template
                </button>
              </div>
              <textarea
                value={bookingForm.refundPolicy}
                onChange={(e) => updateField("refundPolicy", e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Describe your refund policy..."
              />
              <p className="text-xs text-muted-foreground">
                Explains how and when refunds are processed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
