"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  User,
  Mail,
  Phone,
  MapPin,
  Tag,
  FileText,
  Plus,
  X,
  Loader2,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AddCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: { id: string; firstName: string; lastName: string }) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  tags: string[];
  notes: string;
  marketingConsent: boolean;
}

interface FormErrors {
  firstName?: string;
  email?: string;
  phone?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // International: +X (XXX) XXX-XXXX
  return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function Section({ title, icon: Icon, children, defaultOpen = false, optional = true }: SectionProps) {
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
  formatter?: (value: string) => string;
  autoFocus?: boolean;
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  error,
  required,
  icon: Icon,
  formatter,
  autoFocus,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;
  const isActive = isFocused || hasValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = formatter ? formatter(e.target.value) : e.target.value;
    onChange(newValue);
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
        className={cn(
          "w-full h-14 rounded-xl border bg-background/80 backdrop-blur-sm",
          "text-foreground placeholder:text-transparent",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          Icon ? "pl-11 pr-4 pt-5 pb-2" : "px-4 pt-5 pb-2",
          error
            ? "border-destructive/50 focus:ring-destructive/20 focus:border-destructive"
            : "border-border/60 hover:border-border"
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

export function AddCustomerSheet({ open, onOpenChange, onSuccess }: AddCustomerSheetProps) {
  const firstNameRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    tags: [],
    notes: "",
    marketingConsent: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: (customer) => {
      utils.customer.list.invalidate();
      utils.customer.getStats.invalidate();

      // Success feedback with confetti-style animation
      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="font-medium">Customer created!</p>
            <p className="text-sm text-muted-foreground">
              {customer.firstName} {customer.lastName} added successfully
            </p>
          </div>
        </div>,
        { duration: 4000 }
      );

      onSuccess?.({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName ?? ""
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  // Reset form when sheet closes
  const resetForm = useCallback(() => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      tags: [],
      notes: "",
      marketingConsent: false,
    });
    setErrors({});
    setTouched(new Set());
    setNewTag("");
  }, []);

  useEffect(() => {
    if (!open) {
      // Delay reset to allow close animation
      const timer = setTimeout(resetForm, 300);
      return () => clearTimeout(timer);
    }
  }, [open, resetForm]);

  // Calculate form progress
  const progress = (() => {
    let filled = 0;
    let total = 3; // Required fields: firstName, lastName, email/phone

    if (formData.firstName.trim()) filled++;
    if (formData.lastName.trim()) filled++;
    if (formData.email.trim() || formData.phone.trim()) filled++;

    return Math.round((filled / total) * 100);
  })();

  // Validation
  const validateField = useCallback((field: keyof FormErrors, value: string): string | undefined => {
    switch (field) {
      case "firstName":
        return value.trim() ? undefined : "First name is required";
      case "email":
        if (!value.trim() && !formData.phone.trim()) {
          return "Email or phone is required";
        }
        if (value.trim() && !isValidEmail(value)) {
          return "Please enter a valid email";
        }
        return undefined;
      case "phone":
        if (!value.trim() && !formData.email.trim()) {
          return "Phone or email is required";
        }
        return undefined;
      default:
        return undefined;
    }
  }, [formData.email, formData.phone]);

  const handleFieldChange = (field: keyof FormData, value: string | boolean | string[]) => {
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

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      handleFieldChange("tags", [...formData.tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    handleFieldChange("tags", formData.tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: FormErrors = {};
    const firstNameError = validateField("firstName", formData.firstName);
    const emailError = validateField("email", formData.email);

    if (firstNameError) newErrors.firstName = firstNameError;
    if (emailError) newErrors.email = emailError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(new Set(["firstName", "email", "phone"]));
      return;
    }

    createMutation.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || "-",
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      country: formData.country.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      notes: formData.notes.trim() || undefined,
      source: "manual",
    });
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

  const canSubmit = formData.firstName.trim() && (formData.email.trim() || formData.phone.trim());

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
                  New Customer
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add a new customer to your CRM
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
            {/* Essential Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Personal Details
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FloatingInput
                  label="First Name"
                  value={formData.firstName}
                  onChange={(v) => handleFieldChange("firstName", v)}
                  error={touched.has("firstName") ? errors.firstName : undefined}
                  required
                  autoFocus
                />
                <FloatingInput
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(v) => handleFieldChange("lastName", v)}
                />
              </div>

              <FloatingInput
                label="Email Address"
                value={formData.email}
                onChange={(v) => handleFieldChange("email", v)}
                type="email"
                icon={Mail}
                error={touched.has("email") ? errors.email : undefined}
              />

              <FloatingInput
                label="Phone Number"
                value={formData.phone}
                onChange={(v) => handleFieldChange("phone", v)}
                type="tel"
                icon={Phone}
                formatter={formatPhoneNumber}
                error={touched.has("phone") ? errors.phone : undefined}
              />

              <p className="text-xs text-muted-foreground -mt-2 ml-1">
                Email or phone required for contact
              </p>
            </div>

            {/* Address Section */}
            <Section title="Address" icon={MapPin}>
              <div className="space-y-4">
                <FloatingInput
                  label="Street Address"
                  value={formData.address}
                  onChange={(v) => handleFieldChange("address", v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label="City"
                    value={formData.city}
                    onChange={(v) => handleFieldChange("city", v)}
                  />
                  <FloatingInput
                    label="State / Region"
                    value={formData.state}
                    onChange={(v) => handleFieldChange("state", v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label="Postal Code"
                    value={formData.postalCode}
                    onChange={(v) => handleFieldChange("postalCode", v)}
                  />
                  <FloatingInput
                    label="Country"
                    value={formData.country}
                    onChange={(v) => handleFieldChange("country", v)}
                  />
                </div>
              </div>
            </Section>

            {/* Tags Section */}
            <Section title="Tags" icon={Tag}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                    className="flex-1 h-10 rounded-lg border-border/60"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addTag}
                    className="h-10 w-10 rounded-lg border-border/60"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium group"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Notes Section */}
            <Section title="Notes" icon={FileText}>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Internal notes about this customer..."
                rows={3}
                className="resize-none rounded-lg border-border/60 focus:ring-primary/20"
              />
            </Section>

            {/* Marketing Consent */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
              <Checkbox
                id="marketing"
                checked={formData.marketingConsent}
                onCheckedChange={(checked) =>
                  handleFieldChange("marketingConsent", checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="marketing"
                  className="text-sm font-medium cursor-pointer"
                >
                  Marketing communications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customer has agreed to receive promotional emails and updates
                </p>
              </div>
            </div>
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
                      Create Customer
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
