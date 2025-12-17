"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StripeConnectStep } from "@/components/onboarding/stripe-connect-step";
import { BusinessProfileStep } from "@/components/onboarding/business-profile-step";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [createdOrgSlug, setCreatedOrgSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    timezone: "UTC",
    currency: "USD",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for URL params (returning from Stripe, etc.)
  useEffect(() => {
    const urlStep = searchParams.get("step");
    const urlOrg = searchParams.get("org");

    if (urlStep) {
      const stepNum = parseInt(urlStep, 10);
      if (stepNum >= 1 && stepNum <= TOTAL_STEPS) {
        setStep(stepNum);
      }
    }

    if (urlOrg) {
      setCreatedOrgSlug(urlOrg);
    }
  }, [searchParams]);

  // Check slug availability
  const slugCheck = trpc.onboarding.checkSlugAvailability.useQuery(
    { slug: formData.slug },
    {
      enabled: formData.slug.length >= 3,
      staleTime: 1000,
    }
  );

  // Create organization mutation
  const createOrg = trpc.onboarding.createOrganization.useMutation({
    onSuccess: (data) => {
      setCreatedOrgSlug(data.organization.slug);
      setStep(3); // Move to Stripe Connect step
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.name),
      }));
    }
  }, [formData.name, slugEdited]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "slug") {
      setSlugEdited(true);
    }

    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Business name must be at least 2 characters";
    }

    if (!formData.slug || formData.slug.length < 3) {
      newErrors.slug = "Slug must be at least 3 characters";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    } else if (slugCheck.data && !slugCheck.data.available) {
      newErrors.slug = "This slug is already taken";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    createOrg.mutate({
      name: formData.name,
      slug: formData.slug,
      email: formData.email,
      timezone: formData.timezone,
      settings: {
        defaultCurrency: formData.currency,
        defaultLanguage: "en",
      },
    });
  };

  const handleStripeComplete = () => {
    setStep(4);
  };

  const handleStripeSkip = () => {
    setStep(4);
  };

  const handleBusinessProfileComplete = () => {
    if (createdOrgSlug) {
      router.push(`/org/${createdOrgSlug}`);
    }
  };

  const handleBusinessProfileSkip = () => {
    if (createdOrgSlug) {
      router.push(`/org/${createdOrgSlug}`);
    }
  };

  const stepLabels = [
    "Business Details",
    "Preferences",
    "Payments",
    "Profile",
  ];

  return (
    <main className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {step <= 2 ? "Create Your Organization" : "Complete Setup"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === 1 && "Tell us about your tour business"}
            {step === 2 && "Configure your default settings"}
            {step === 3 && "Set up payment processing"}
            {step === 4 && "Add your business details"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {stepLabels.map((label, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                    step > index + 1
                      ? "bg-primary text-primary-foreground"
                      : step === index + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {label}
                </span>
              </div>
              {index < TOTAL_STEPS - 1 && (
                <div
                  className={`h-1 w-6 sm:w-8 mx-1 rounded transition-colors ${
                    step > index + 1 ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          {/* Step 1: Business Details */}
          {step === 1 && (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Business Details
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell us about your tour business
                  </p>
                </div>

                {/* Business Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Awesome Tours Inc."
                    className={`w-full px-3 py-2 rounded-lg border ${
                      errors.name ? "border-destructive" : "border-input"
                    } focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* URL Slug */}
                <div>
                  <label
                    htmlFor="slug"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    URL Slug *
                  </label>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-lg border border-r-0 border-input">
                      /org/
                    </span>
                    <input
                      type="text"
                      id="slug"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      placeholder="awesome-tours"
                      className={`flex-1 px-3 py-2 rounded-r-lg border ${
                        errors.slug ? "border-destructive" : "border-input"
                      } focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                    />
                  </div>
                  {errors.slug ? (
                    <p className="mt-1 text-sm text-destructive">{errors.slug}</p>
                  ) : formData.slug.length >= 3 && slugCheck.isLoading ? (
                    <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                    </p>
                  ) : slugCheck.data?.available ? (
                    <p className="mt-1 text-sm text-success flex items-center gap-1">
                      <Check className="h-3 w-3" /> This slug is available
                    </p>
                  ) : slugCheck.data && !slugCheck.data.available ? (
                    <p className="mt-1 text-sm text-destructive">This slug is already taken</p>
                  ) : null}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Business Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contact@awesometours.com"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      errors.email ? "border-destructive" : "border-input"
                    } focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <form onSubmit={handleCreateOrg}>
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Preferences
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure your default settings
                  </p>
                </div>

                {/* Timezone */}
                <div>
                  <label
                    htmlFor="timezone"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label
                    htmlFor="currency"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Default Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.value} value={curr.value}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.submit && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium border border-input text-foreground hover:bg-accent transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={createOrg.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createOrg.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Organization
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Stripe Connect */}
          {step === 3 && createdOrgSlug && (
            <StripeConnectStep
              orgSlug={createdOrgSlug}
              onComplete={handleStripeComplete}
              onSkip={handleStripeSkip}
            />
          )}

          {/* Step 4: Business Profile */}
          {step === 4 && (
            <BusinessProfileStep
              onComplete={handleBusinessProfileComplete}
              onSkip={handleBusinessProfileSkip}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {step <= 2
            ? "You can update these settings later in your organization settings."
            : "All optional fields can be updated anytime in settings."}
        </p>
      </div>
    </main>
  );
}
