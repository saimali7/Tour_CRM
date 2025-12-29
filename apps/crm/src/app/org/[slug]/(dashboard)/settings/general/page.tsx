"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "@/components/settings/currency-selector";
import { type CurrencyCode, getCurrencyConfig } from "@tour/validators";

export default function GeneralSettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: organization, isLoading } = trpc.organization.get.useQuery();
  const utils = trpc.useUtils();

  const [saveError, setSaveError] = useState<string | null>(null);

  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaveSuccess(true);
      setSaveError(null);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Save failed:", error);
      setSaveError(error.message);
      setTimeout(() => setSaveError(null), 5000);
    },
  });

  const [businessForm, setBusinessForm] = useState({
    name: "",
    email: "",
    fromEmail: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    timezone: "",
    currency: "AED" as CurrencyCode,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (organization) {
      setBusinessForm({
        name: organization.name || "",
        email: organization.email || "",
        fromEmail: organization.fromEmail || "",
        phone: organization.phone || "",
        website: organization.website || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        country: organization.country || "",
        postalCode: organization.postalCode || "",
        timezone: organization.timezone || "",
        currency: (organization.currency || "AED") as CurrencyCode,
      });
    }
  }, [organization]);

  const handleChange = (field: string, value: string) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateOrgMutation.mutate(businessForm);
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

  const isSubmitting = updateOrgMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">General</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization's basic information and settings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Error Toast */}
          {saveError && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <span className="text-sm font-medium">{saveError}</span>
            </div>
          )}

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
            onClick={handleSave}
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
        {/* Business Information Card */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Business Information</h3>
                <p className="text-xs text-muted-foreground">Your company details and contact info</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessForm.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Your Company Name"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={businessForm.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="contact@company.com"
                />
              </div>

              {/* From Email for transactional emails */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Sender Email
                </label>
                <input
                  type="email"
                  value={businessForm.fromEmail}
                  onChange={(e) => handleChange("fromEmail", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="bookings@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">
                  Used for sending booking confirmations, reminders, etc. Must be verified in Resend.
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={businessForm.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Website
                </label>
                <input
                  type="url"
                  value={businessForm.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="https://yourcompany.com"
                />
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Timezone
                </label>
                <select
                  value={businessForm.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="">Select timezone</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Beijing (CST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                  <option value="Australia/Melbourne">Melbourne (AEST)</option>
                </select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  Currency
                </label>
                <CurrencySelector
                  value={businessForm.currency}
                  onValueChange={(value) => {
                    setBusinessForm((prev) => ({ ...prev, currency: value }));
                    setHasChanges(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Default currency for pricing and bookings. Supports 35+ currencies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <MapPin className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Business Address</h3>
                <p className="text-xs text-muted-foreground">Physical location for invoices and correspondence</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Street Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Street Address
              </label>
              <input
                type="text"
                value={businessForm.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Street address"
              />
            </div>

            {/* City, State, Postal, Country Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">City</label>
                <input
                  type="text"
                  value={businessForm.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">State / Province</label>
                <input
                  type="text"
                  value={businessForm.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="State / Province"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Postal Code</label>
                <input
                  type="text"
                  value={businessForm.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Postal code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Country</label>
                <input
                  type="text"
                  value={businessForm.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
