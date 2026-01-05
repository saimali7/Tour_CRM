"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, DollarSign, Users, AlertCircle, Check } from "lucide-react";
import { DurationInput } from "@/components/ui/duration-input";
import type { TourFormState } from "../tour-creator";
import {
  ValidatedFormField,
  ValidatedTextareaField,
  getInputValidationClasses,
} from "@/components/ui/form-field";

interface EssentialsTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: string) => void;
}

const CATEGORIES = [
  "Walking Tours",
  "Food & Wine",
  "Adventure",
  "Cultural",
  "Historical",
  "Nature",
  "City Tours",
  "Day Trips",
  "Water Activities",
  "Photography",
  "Private Tours",
  "Group Tours",
];

// ============================================================================
// Validation Functions
// ============================================================================

const validators = {
  name: (value: string): string | undefined => {
    if (!value || value.trim().length === 0) {
      return "Tour name is required";
    }
    if (value.trim().length < 3) {
      return "Tour name must be at least 3 characters";
    }
    if (value.length > 100) {
      return "Tour name must be less than 100 characters";
    }
    return undefined;
  },

  category: (value: string): string | undefined => {
    if (!value) {
      return "Please select a category";
    }
    return undefined;
  },

  basePrice: (value: string): string | undefined => {
    if (!value || value.trim().length === 0) {
      return "Price is required";
    }
    const price = parseFloat(value);
    if (isNaN(price)) {
      return "Please enter a valid price";
    }
    if (price < 0) {
      return "Price cannot be negative";
    }
    if (price === 0) {
      return "Price must be greater than 0";
    }
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return "Price can have at most 2 decimal places";
    }
    return undefined;
  },

  maxParticipants: (value: number): string | undefined => {
    if (!value || value < 1) {
      return "Must allow at least 1 guest";
    }
    if (value > 100) {
      return "Maximum 100 guests per session";
    }
    if (!Number.isInteger(value)) {
      return "Must be a whole number";
    }
    return undefined;
  },

  shortDescription: (value: string): string | undefined => {
    if (value.length > 160) {
      return "Description must be 160 characters or less";
    }
    return undefined;
  },
};

// ============================================================================
// Field Validation State Type
// ============================================================================

interface FieldState {
  touched: boolean;
  error?: string;
}

type FieldName = "name" | "category" | "basePrice" | "maxParticipants" | "shortDescription";

// ============================================================================
// EssentialsTab Component
// ============================================================================

export function EssentialsTab({
  formState,
  updateForm,
  onNameChange,
  onCategoryChange,
}: EssentialsTabProps) {
  // Track validation state for each field
  const [fields, setFields] = useState<Record<FieldName, FieldState>>({
    name: { touched: false },
    category: { touched: false },
    basePrice: { touched: false },
    maxParticipants: { touched: false },
    shortDescription: { touched: false },
  });

  // Validate a specific field
  const validateField = useCallback((fieldName: FieldName, value: unknown): string | undefined => {
    switch (fieldName) {
      case "name":
        return validators.name(value as string);
      case "category":
        return validators.category(value as string);
      case "basePrice":
        return validators.basePrice(value as string);
      case "maxParticipants":
        return validators.maxParticipants(value as number);
      case "shortDescription":
        return validators.shortDescription(value as string);
      default:
        return undefined;
    }
  }, []);

  // Handle field blur - validate and mark as touched
  const handleBlur = useCallback((fieldName: FieldName) => {
    const value = fieldName === "maxParticipants"
      ? formState.maxParticipants
      : formState[fieldName];
    const error = validateField(fieldName, value);

    setFields(prev => ({
      ...prev,
      [fieldName]: { touched: true, error },
    }));
  }, [formState, validateField]);

  // Handle field change - re-validate only if already touched
  const handleChange = useCallback((fieldName: FieldName, value: unknown) => {
    setFields(prev => {
      if (!prev[fieldName].touched) return prev;

      const error = validateField(fieldName, value);
      return {
        ...prev,
        [fieldName]: { ...prev[fieldName], error },
      };
    });
  }, [validateField]);

  // Re-validate on value changes for touched fields
  useEffect(() => {
    if (fields.name.touched) {
      const error = validateField("name", formState.name);
      setFields(prev => ({ ...prev, name: { ...prev.name, error } }));
    }
  }, [formState.name, fields.name.touched, validateField]);

  useEffect(() => {
    if (fields.category.touched) {
      const error = validateField("category", formState.category);
      setFields(prev => ({ ...prev, category: { ...prev.category, error } }));
    }
  }, [formState.category, fields.category.touched, validateField]);

  useEffect(() => {
    if (fields.basePrice.touched) {
      const error = validateField("basePrice", formState.basePrice);
      setFields(prev => ({ ...prev, basePrice: { ...prev.basePrice, error } }));
    }
  }, [formState.basePrice, fields.basePrice.touched, validateField]);

  useEffect(() => {
    if (fields.maxParticipants.touched) {
      const error = validateField("maxParticipants", formState.maxParticipants);
      setFields(prev => ({ ...prev, maxParticipants: { ...prev.maxParticipants, error } }));
    }
  }, [formState.maxParticipants, fields.maxParticipants.touched, validateField]);

  useEffect(() => {
    if (fields.shortDescription.touched) {
      const error = validateField("shortDescription", formState.shortDescription);
      setFields(prev => ({ ...prev, shortDescription: { ...prev.shortDescription, error } }));
    }
  }, [formState.shortDescription, fields.shortDescription.touched, validateField]);

  // Check if a field is valid (touched, no error, has value)
  const isFieldValid = (fieldName: FieldName): boolean => {
    const field = fields[fieldName];
    if (!field.touched || field.error) return false;

    const value = formState[fieldName];
    if (fieldName === "maxParticipants") {
      return typeof value === "number" && value >= 1;
    }
    return Boolean(value);
  };

  // Overall form validity
  const isValid = !!(
    formState.name &&
    !validators.name(formState.name) &&
    formState.category &&
    formState.basePrice &&
    !validators.basePrice(formState.basePrice) &&
    formState.durationMinutes > 0 &&
    formState.maxParticipants > 0 &&
    !validators.maxParticipants(formState.maxParticipants)
  );

  // Get missing fields for summary
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!formState.name || validators.name(formState.name)) missing.push("Name");
    if (!formState.category) missing.push("Category");
    if (!formState.basePrice || validators.basePrice(formState.basePrice)) missing.push("Price");
    return missing;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Essential Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the basics to get started. All fields marked with * are required.
          </p>
        </div>
      </div>

      {/* Tour Name */}
      <ValidatedFormField
        label="Tour Name"
        htmlFor="tour-name"
        required
        touched={fields.name.touched}
        error={fields.name.error}
        valid={isFieldValid("name")}
        hint="Choose a descriptive name that tells customers what to expect"
      >
        <input
          id="tour-name"
          type="text"
          value={formState.name}
          onChange={(e) => {
            onNameChange(e.target.value);
            handleChange("name", e.target.value);
          }}
          onBlur={() => handleBlur("name")}
          placeholder="e.g., Golden Gate Bridge Walking Tour"
          aria-invalid={fields.name.touched && !!fields.name.error}
          aria-describedby={fields.name.error ? "tour-name-error" : undefined}
          className={cn(
            "w-full px-4 py-3 text-lg border rounded-xl transition-all",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:ring-2 focus:ring-offset-0",
            getInputValidationClasses({
              error: fields.name.error,
              touched: fields.name.touched,
              valid: isFieldValid("name"),
            })
          )}
        />
      </ValidatedFormField>

      {/* Category */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Category <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                onCategoryChange(category);
                // Mark as touched and validate
                setFields(prev => ({
                  ...prev,
                  category: { touched: true, error: undefined },
                }));
              }}
              className={cn(
                "px-4 py-3 text-sm font-medium rounded-xl border transition-all",
                formState.category === category
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-accent"
              )}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="min-h-[20px]">
          {fields.category.touched && fields.category.error && (
            <p
              role="alert"
              className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{fields.category.error}</span>
            </p>
          )}
          {formState.category && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
              <Sparkles className="h-3.5 w-3.5" />
              Smart defaults applied based on category
            </p>
          )}
        </div>
      </div>

      {/* Price, Duration, Capacity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Price */}
        <ValidatedFormField
          label="Base Price"
          htmlFor="base-price"
          required
          touched={fields.basePrice.touched}
          error={fields.basePrice.error}
          valid={isFieldValid("basePrice")}
          hint="Per person"
          showValidState={true}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="base-price"
              type="text"
              inputMode="decimal"
              value={formState.basePrice}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, "");
                updateForm({ basePrice: value });
                handleChange("basePrice", value);
              }}
              onBlur={() => handleBlur("basePrice")}
              placeholder="0.00"
              aria-invalid={fields.basePrice.touched && !!fields.basePrice.error}
              aria-describedby={fields.basePrice.error ? "base-price-error" : undefined}
              className={cn(
                "w-full pl-11 pr-4 py-3 text-lg font-medium border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-offset-0",
                getInputValidationClasses({
                  error: fields.basePrice.error,
                  touched: fields.basePrice.touched,
                  valid: isFieldValid("basePrice"),
                })
              )}
            />
          </div>
        </ValidatedFormField>

        {/* Duration */}
        <div className="space-y-2">
          <label htmlFor="duration" className="block text-sm font-medium text-foreground">
            Duration <span className="text-destructive">*</span>
          </label>
          <DurationInput
            id="duration"
            value={formState.durationMinutes}
            onChange={(minutes) => updateForm({ durationMinutes: minutes })}
            min={15}
            max={1440}
          />
          <div className="min-h-[20px]">
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Duration set</span>
            </p>
          </div>
        </div>

        {/* Capacity */}
        <ValidatedFormField
          label="Max Guests"
          htmlFor="max-guests"
          required
          touched={fields.maxParticipants.touched}
          error={fields.maxParticipants.error}
          valid={isFieldValid("maxParticipants")}
          hint="Per session"
          showValidState={true}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="max-guests"
              type="number"
              min={1}
              max={100}
              value={formState.maxParticipants}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                updateForm({ maxParticipants: value });
                handleChange("maxParticipants", value);
              }}
              onBlur={() => handleBlur("maxParticipants")}
              aria-invalid={fields.maxParticipants.touched && !!fields.maxParticipants.error}
              aria-describedby={fields.maxParticipants.error ? "max-guests-error" : undefined}
              className={cn(
                "w-full pl-11 pr-4 py-3 text-lg font-medium border rounded-xl transition-all",
                "bg-background text-foreground",
                "focus:ring-2 focus:ring-offset-0",
                getInputValidationClasses({
                  error: fields.maxParticipants.error,
                  touched: fields.maxParticipants.touched,
                  valid: isFieldValid("maxParticipants"),
                })
              )}
            />
          </div>
        </ValidatedFormField>
      </div>

      {/* Short Description */}
      <ValidatedTextareaField
        label="Short Description"
        htmlFor="short-description"
        optional
        touched={fields.shortDescription.touched}
        error={fields.shortDescription.error}
        valid={false}
        showValidState={false}
        hint="Used for listings and SEO"
        maxLength={160}
        currentLength={formState.shortDescription.length}
      >
        <textarea
          id="short-description"
          value={formState.shortDescription}
          onChange={(e) => {
            updateForm({ shortDescription: e.target.value });
            handleChange("shortDescription", e.target.value);
          }}
          onBlur={() => handleBlur("shortDescription")}
          placeholder="A brief tagline that appears in search results and listings..."
          maxLength={200} // Allow typing beyond limit to show error
          rows={2}
          aria-invalid={fields.shortDescription.touched && !!fields.shortDescription.error}
          aria-describedby={fields.shortDescription.error ? "short-description-error" : undefined}
          className={cn(
            "w-full px-4 py-3 border rounded-xl transition-all resize-none",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:ring-2 focus:ring-offset-0",
            fields.shortDescription.touched && fields.shortDescription.error
              ? "border-destructive focus-visible:ring-destructive/30"
              : "border-input focus-visible:ring-primary/30 focus:border-primary"
          )}
        />
      </ValidatedTextareaField>

      {/* Validation Summary */}
      {!isValid && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Complete required fields to continue</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getMissingFields().length > 0
                ? `${getMissingFields().join(", ")} ${getMissingFields().length === 1 ? "needs" : "need"} to be filled`
                : "Please fix the validation errors above"
              }
            </p>
          </div>
        </div>
      )}

      {isValid && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Essentials complete!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can now proceed to add more details or save as draft
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
