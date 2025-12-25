"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  DollarSign,
  Calendar,
  Settings,
  ChevronDown,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AddServiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ServiceType = "transfer" | "addon" | "rental" | "package" | "custom";
type PricingModel = "flat" | "per_person" | "per_hour" | "per_day" | "per_vehicle" | "custom";
type AvailabilityType = "always" | "scheduled" | "on_request";

interface FormData {
  name: string;
  slug: string;
  shortDescription: string;
  basePrice: string;
  serviceType: ServiceType;
  pricingModel: PricingModel;
  availabilityType: AvailabilityType;
  isStandalone: boolean;
  isAddon: boolean;
  // Transfer config
  pickupRequired: boolean;
  dropoffRequired: boolean;
  // Rental config
  minDuration: string;
  maxDuration: string;
  rentalUnit: "hour" | "day";
}

interface FormErrors {
  name?: string;
  slug?: string;
  basePrice?: string;
  minDuration?: string;
  maxDuration?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const isValidPrice = (price: string): boolean => {
  return /^\d+(\.\d{1,2})?$/.test(price);
};

const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug);
};

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  optional?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = false, optional = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-5 py-4",
          "hover:bg-accent/50 transition-all duration-200",
          isOpen && "border-b border-border/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={cn(
            "font-medium transition-colors",
            isOpen ? "text-foreground" : "text-foreground/80"
          )}>
            {title}
          </span>
          {optional && (
            <span className="text-xs text-muted-foreground/70 font-normal">optional</span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING LABEL INPUT
// ============================================================================

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
  icon?: React.ElementType;
  autoFocus?: boolean;
  disabled?: boolean;
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  error,
  required,
  icon: Icon,
  autoFocus,
  disabled,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;
  const isActive = isFocused || hasValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative group">
      {Icon && (
        <div className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
          isFocused ? "text-primary" : "text-muted-foreground/60"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          "w-full h-14 rounded-xl border bg-background/80 backdrop-blur-sm",
          "text-foreground placeholder:text-transparent",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          Icon ? "pl-11 pr-4 pt-5 pb-2" : "px-4 pt-5 pb-2",
          error
            ? "border-destructive/50 focus:ring-destructive/20 focus:border-destructive"
            : "border-border/60 hover:border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        placeholder={label}
      />
      <label
        className={cn(
          "absolute left-0 transition-all duration-200 ease-out pointer-events-none",
          Icon ? "left-11" : "left-4",
          isActive
            ? "top-2 text-xs font-medium"
            : "top-1/2 -translate-y-1/2 text-sm",
          isFocused ? "text-primary" : "text-muted-foreground",
          error && "text-destructive"
        )}
      >
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {error && (
        <p className="absolute -bottom-5 left-0 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressIndicator({ progress }: { progress: number }) {
  return (
    <div className="relative h-1 w-full bg-muted/50 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddServiceSheet({ open, onOpenChange, onSuccess }: AddServiceSheetProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    shortDescription: "",
    basePrice: "",
    serviceType: "addon",
    pricingModel: "flat",
    availabilityType: "always",
    isStandalone: true,
    isAddon: true,
    pickupRequired: false,
    dropoffRequired: false,
    minDuration: "",
    maxDuration: "",
    rentalUnit: "day",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [autoSlug, setAutoSlug] = useState(true);

  const utils = trpc.useUtils();

  const createMutation = trpc.catalogService.create.useMutation({
    onSuccess: (service) => {
      utils.catalogService.list.invalidate();

      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="font-medium">Service created!</p>
            <p className="text-sm text-muted-foreground">
              {service.product.name} added successfully
            </p>
          </div>
        </div>,
        { duration: 4000 }
      );

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create service");
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      slug: "",
      shortDescription: "",
      basePrice: "",
      serviceType: "addon",
      pricingModel: "flat",
      availabilityType: "always",
      isStandalone: true,
      isAddon: true,
      pickupRequired: false,
      dropoffRequired: false,
      minDuration: "",
      maxDuration: "",
      rentalUnit: "day",
    });
    setErrors({});
    setTouched(new Set());
    setAutoSlug(true);
  }, []);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(resetForm, 300);
      return () => clearTimeout(timer);
    }
  }, [open, resetForm]);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData(prev => ({ ...prev, slug: slugify(formData.name) }));
    }
  }, [formData.name, autoSlug]);

  // Calculate form progress
  const progress = (() => {
    let filled = 0;
    let total = 4; // Required fields: name, slug, basePrice, serviceType

    if (formData.name.trim()) filled++;
    if (formData.slug.trim()) filled++;
    if (formData.basePrice.trim()) filled++;
    if (formData.serviceType) filled++;

    return Math.round((filled / total) * 100);
  })();

  // Validation
  const validateField = useCallback((field: keyof FormErrors, value: string): string | undefined => {
    switch (field) {
      case "name":
        return value.trim() ? undefined : "Service name is required";
      case "slug":
        if (!value.trim()) return "Slug is required";
        if (!isValidSlug(value)) return "Slug must be lowercase alphanumeric with hyphens";
        return undefined;
      case "basePrice":
        if (!value.trim()) return "Base price is required";
        if (!isValidPrice(value)) return "Invalid price format (e.g., 10.99)";
        return undefined;
      case "minDuration":
        if (formData.serviceType === "rental" && !value.trim()) return "Minimum duration is required";
        if (value && Number(value) <= 0) return "Must be greater than 0";
        return undefined;
      case "maxDuration":
        if (formData.serviceType === "rental" && !value.trim()) return "Maximum duration is required";
        if (value && Number(value) <= 0) return "Must be greater than 0";
        if (value && formData.minDuration && Number(value) < Number(formData.minDuration)) {
          return "Must be greater than or equal to minimum";
        }
        return undefined;
      default:
        return undefined;
    }
  }, [formData.minDuration, formData.serviceType]);

  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error on change
    if (typeof value === "string" && touched.has(field)) {
      const error = validateField(field as keyof FormErrors, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched(prev => new Set(prev).add(field));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSlugChange = (value: string) => {
    setAutoSlug(false);
    handleFieldChange("slug", value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: FormErrors = {};
    const nameError = validateField("name", formData.name);
    const slugError = validateField("slug", formData.slug);
    const priceError = validateField("basePrice", formData.basePrice);

    if (nameError) newErrors.name = nameError;
    if (slugError) newErrors.slug = slugError;
    if (priceError) newErrors.basePrice = priceError;

    // Validate rental-specific fields
    if (formData.serviceType === "rental") {
      const minDurationError = validateField("minDuration", formData.minDuration);
      const maxDurationError = validateField("maxDuration", formData.maxDuration);
      if (minDurationError) newErrors.minDuration = minDurationError;
      if (maxDurationError) newErrors.maxDuration = maxDurationError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(new Set(["name", "slug", "basePrice", "minDuration", "maxDuration"]));
      return;
    }

    // Build the mutation input
    const input: any = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      shortDescription: formData.shortDescription.trim() || undefined,
      basePrice: formData.basePrice.trim(),
      serviceType: formData.serviceType,
      pricingModel: formData.pricingModel,
      availabilityType: formData.availabilityType,
      isStandalone: formData.isStandalone,
      isAddon: formData.isAddon,
    };

    // Add transfer config if transfer type
    if (formData.serviceType === "transfer") {
      input.transferConfig = {
        pickupRequired: formData.pickupRequired,
        dropoffRequired: formData.dropoffRequired,
        locations: [],
      };
    }

    // Add rental config if rental type
    if (formData.serviceType === "rental") {
      input.rentalConfig = {
        minDuration: Number(formData.minDuration),
        maxDuration: Number(formData.maxDuration),
        unit: formData.rentalUnit,
      };
    }

    createMutation.mutate(input);
  };

  // Keyboard shortcut: Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formData]);

  const canSubmit = formData.name.trim() && formData.slug.trim() && formData.basePrice.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 gap-0 border-l border-border/50 bg-gradient-to-b from-background to-muted/20"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold tracking-tight">
                  New Service
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add a new service to your catalog
                </p>
              </div>
            </div>
          </SheetHeader>
          <div className="px-6 pb-4">
            <ProgressIndicator progress={progress} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-140px)]">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Basic Information
                </h3>
              </div>

              <FloatingInput
                label="Service Name"
                value={formData.name}
                onChange={(v) => handleFieldChange("name", v)}
                error={touched.has("name") ? errors.name : undefined}
                required
                autoFocus
              />

              <FloatingInput
                label="URL Slug"
                value={formData.slug}
                onChange={handleSlugChange}
                error={touched.has("slug") ? errors.slug : undefined}
                required
              />

              <div className="relative">
                <Textarea
                  value={formData.shortDescription}
                  onChange={(e) => handleFieldChange("shortDescription", e.target.value)}
                  placeholder="Brief description of the service..."
                  rows={3}
                  className="resize-none rounded-xl border-border/60 focus:ring-primary/20 px-4 py-3"
                />
                <label className="absolute -top-2 left-3 bg-background px-1 text-xs text-muted-foreground">
                  Short Description
                </label>
              </div>

              <FloatingInput
                label="Base Price"
                value={formData.basePrice}
                onChange={(v) => handleFieldChange("basePrice", v)}
                type="text"
                icon={DollarSign}
                error={touched.has("basePrice") ? errors.basePrice : undefined}
                required
              />
            </div>

            {/* Service Type Section */}
            <Section title="Service Type" icon={Settings} defaultOpen>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Service Type *</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(v) => handleFieldChange("serviceType", v as ServiceType)}
                  >
                    <SelectTrigger className="rounded-xl h-12 border-border/60">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                      <SelectItem value="rental">Rental</SelectItem>
                      <SelectItem value="package">Package</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Pricing Model *</Label>
                  <Select
                    value={formData.pricingModel}
                    onValueChange={(v) => handleFieldChange("pricingModel", v as PricingModel)}
                  >
                    <SelectTrigger className="rounded-xl h-12 border-border/60">
                      <SelectValue placeholder="Select pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="per_person">Per Person</SelectItem>
                      <SelectItem value="per_hour">Per Hour</SelectItem>
                      <SelectItem value="per_day">Per Day</SelectItem>
                      <SelectItem value="per_vehicle">Per Vehicle</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* Availability Section */}
            <Section title="Availability" icon={Calendar} defaultOpen>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Availability Type</Label>
                  <Select
                    value={formData.availabilityType}
                    onValueChange={(v) => handleFieldChange("availabilityType", v as AvailabilityType)}
                  >
                    <SelectTrigger className="rounded-xl h-12 border-border/60">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always Available</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="on_request">On Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <Checkbox
                    id="standalone"
                    checked={formData.isStandalone}
                    onCheckedChange={(checked) =>
                      handleFieldChange("isStandalone", checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="standalone"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Standalone Service
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Can be booked independently without other products
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <Checkbox
                    id="addon"
                    checked={formData.isAddon}
                    onCheckedChange={(checked) =>
                      handleFieldChange("isAddon", checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="addon"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Available as Add-on
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Can be added to other bookings
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Transfer Config */}
            {formData.serviceType === "transfer" && (
              <Section title="Transfer Configuration" icon={Settings} optional defaultOpen>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                    <Checkbox
                      id="pickupRequired"
                      checked={formData.pickupRequired}
                      onCheckedChange={(checked) =>
                        handleFieldChange("pickupRequired", checked === true)
                      }
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="pickupRequired"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Pickup Required
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Customer must provide pickup location
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                    <Checkbox
                      id="dropoffRequired"
                      checked={formData.dropoffRequired}
                      onCheckedChange={(checked) =>
                        handleFieldChange("dropoffRequired", checked === true)
                      }
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="dropoffRequired"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Drop-off Required
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Customer must provide drop-off location
                      </p>
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {/* Rental Config */}
            {formData.serviceType === "rental" && (
              <Section title="Rental Configuration" icon={Settings} optional defaultOpen>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FloatingInput
                      label="Min Duration"
                      value={formData.minDuration}
                      onChange={(v) => handleFieldChange("minDuration", v)}
                      type="number"
                      error={touched.has("minDuration") ? errors.minDuration : undefined}
                      required
                    />
                    <FloatingInput
                      label="Max Duration"
                      value={formData.maxDuration}
                      onChange={(v) => handleFieldChange("maxDuration", v)}
                      type="number"
                      error={touched.has("maxDuration") ? errors.maxDuration : undefined}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Duration Unit *</Label>
                    <Select
                      value={formData.rentalUnit}
                      onValueChange={(v) => handleFieldChange("rentalUnit", v as "hour" | "day")}
                    >
                      <SelectTrigger className="rounded-xl h-12 border-border/60">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-background/95 backdrop-blur-md border-t border-border/50">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground hidden sm:block">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘</kbd>
                <span className="mx-1">+</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
                <span className="ml-2">to save</span>
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit || createMutation.isPending}
                  className={cn(
                    "min-w-[140px] rounded-xl font-medium",
                    "bg-gradient-to-r from-primary to-primary/90",
                    "hover:from-primary/90 hover:to-primary/80",
                    "shadow-lg shadow-primary/25",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:shadow-none"
                  )}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Service
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
