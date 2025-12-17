"use client";

import { useState } from "react";
import { MapPin, Phone, Globe, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BusinessProfileStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const countries = [
  { value: "", label: "Select a country" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "NZ", label: "New Zealand" },
  { value: "MX", label: "Mexico" },
  { value: "BR", label: "Brazil" },
  { value: "TH", label: "Thailand" },
  { value: "IN", label: "India" },
  { value: "OTHER", label: "Other" },
];

export function BusinessProfileStep({
  onComplete,
  onSkip,
}: BusinessProfileStepProps) {
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    phone: "",
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const markComplete = trpc.onboarding.markSetupComplete.useMutation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateWebsite = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (formData.website && !validateWebsite(formData.website)) {
      newErrors.website = "Please enter a valid website URL";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Format website URL
    let website = formData.website;
    if (website && !website.startsWith("http")) {
      website = `https://${website}`;
    }

    await updateOrg.mutateAsync({
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
      phone: formData.phone || undefined,
      website: website || undefined,
    });

    // Mark business profile as complete if we have meaningful data
    const hasLocation = formData.address && formData.city;
    const hasContact = formData.phone || formData.website;
    if (hasLocation || hasContact) {
      await markComplete.mutateAsync({ step: "businessProfile" });
    }
  };

  const hasData =
    formData.address ||
    formData.city ||
    formData.phone ||
    formData.website;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Business Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your business details for customer communications and invoices
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Address Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Location
          </div>

          <div>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street Address"
              className="w-full px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              className="px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State / Province"
              className="px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Postal Code"
              className="px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact
          </div>

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website
            </div>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="www.yourcompany.com"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.website ? "border-destructive" : "border-input"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
            />
            {errors.website && (
              <p className="mt-1 text-sm text-destructive">{errors.website}</p>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={updateOrg.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateOrg.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {hasData ? "Save & Continue" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Skip & Go to Dashboard
          </button>
        </div>
      </form>

      <p className="text-xs text-center text-muted-foreground">
        All fields are optional. You can update these anytime in settings.
      </p>
    </div>
  );
}
