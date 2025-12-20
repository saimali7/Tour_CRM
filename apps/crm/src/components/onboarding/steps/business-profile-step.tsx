"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useOnboarding } from "@/providers/onboarding-provider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  Loader2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface BusinessProfileStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function BusinessProfileStep({
  onComplete,
  onSkipStep,
}: BusinessProfileStepProps) {
  const { setStepData, state } = useOnboarding();

  // Initialize form with existing data or defaults
  const [formData, setFormData] = useState({
    businessName: state.data.businessProfile?.businessName ?? "",
    contactEmail: state.data.businessProfile?.contactEmail ?? "",
    phone: state.data.businessProfile?.phone ?? "",
    timezone: state.data.businessProfile?.timezone ?? "UTC",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update organization mutation
  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("Business profile saved");
      setStepData("businessProfile", formData);
      onComplete();
    },
    onError: (error) => {
      toast.error("Failed to save profile");
      setErrors({ submit: error.message });
    },
  });

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle blur for validation
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // Field validation
  const validateField = (field: string): boolean => {
    const value = formData[field as keyof typeof formData];
    let error = "";

    switch (field) {
      case "businessName":
        if (!value || value.length < 2) {
          error = "Business name must be at least 2 characters";
        }
        break;
      case "contactEmail":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "phone":
        // Phone is optional, but validate format if provided
        if (value && !/^[\d\s\-+()]+$/.test(value)) {
          error = "Please enter a valid phone number";
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return false;
    }
    return true;
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName || formData.businessName.length < 2) {
      newErrors.businessName = "Business name is required";
    }

    if (
      formData.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)
    ) {
      newErrors.contactEmail = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Save to context and update organization
    await updateOrg.mutateAsync({
      name: formData.businessName,
      email: formData.contactEmail || undefined,
      phone: formData.phone || undefined,
      timezone: formData.timezone,
    });
  };

  // Check if form has meaningful data
  const hasData = formData.businessName.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Friendly intro */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This information will appear on your booking pages and customer
          communications. You can update it anytime in settings.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Business Name */}
        <FormField
          label="Business Name"
          htmlFor="businessName"
          required
          error={touched.businessName ? errors.businessName : undefined}
        >
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              onBlur={() => handleBlur("businessName")}
              placeholder="Adventure Tours Co."
              className="pl-10"
              error={touched.businessName && !!errors.businessName}
            />
          </div>
        </FormField>

        {/* Contact Email */}
        <FormField
          label="Contact Email"
          htmlFor="contactEmail"
          optional
          error={touched.contactEmail ? errors.contactEmail : undefined}
          hint="For booking confirmations and customer inquiries"
        >
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              onBlur={() => handleBlur("contactEmail")}
              placeholder="hello@yourbusiness.com"
              className="pl-10"
              error={touched.contactEmail && !!errors.contactEmail}
            />
          </div>
        </FormField>

        {/* Phone */}
        <FormField
          label="Phone Number"
          htmlFor="phone"
          optional
          error={touched.phone ? errors.phone : undefined}
        >
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              placeholder="+1 (555) 000-0000"
              className="pl-10"
              error={touched.phone && !!errors.phone}
            />
          </div>
        </FormField>

        {/* Timezone */}
        <FormField
          label="Timezone"
          htmlFor="timezone"
          hint="All tour times will be displayed in this timezone"
        >
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange("timezone", value)}
            >
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormField>
      </div>

      {/* Error message */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={updateOrg.isPending || !formData.businessName}
          className="w-full h-11 gap-2 font-medium"
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
        </Button>
      </div>
    </form>
  );
}
