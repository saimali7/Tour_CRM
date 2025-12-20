"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Settings, MapPin, Clock, Search, Link2, CalendarClock, Timer, AlertCircle, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  ValidatedFormField,
  ValidatedTextareaField,
  getInputValidationClasses,
} from "@/components/ui/form-field";
import type { TourFormState } from "../tour-creator";

interface SettingsTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
}

// ============================================================================
// Validation Functions
// ============================================================================

const validators = {
  slug: (value: string): string | undefined => {
    if (!value) return undefined; // Optional field
    if (value.length < 3) return "URL slug must be at least 3 characters";
    if (value.length > 100) return "URL slug must be less than 100 characters";
    if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens";
    if (value.startsWith("-") || value.endsWith("-")) return "Cannot start or end with hyphen";
    if (value.includes("--")) return "Cannot have consecutive hyphens";
    return undefined;
  },

  metaTitle: (value: string): string | undefined => {
    if (!value) return undefined; // Optional field
    if (value.length > 60) return "Meta title should be 60 characters or less for SEO";
    return undefined;
  },

  metaDescription: (value: string): string | undefined => {
    if (!value) return undefined; // Optional field
    if (value.length > 160) return "Meta description should be 160 characters or less for SEO";
    return undefined;
  },

  cancellationHours: (value: number): string | undefined => {
    if (value < 0) return "Cannot be negative";
    if (value > 720) return "Maximum 30 days (720 hours)";
    return undefined;
  },

  minimumNoticeHours: (value: number): string | undefined => {
    if (value < 0) return "Cannot be negative";
    if (value > 720) return "Maximum 30 days (720 hours)";
    return undefined;
  },

  maximumAdvanceDays: (value: number): string | undefined => {
    if (value < 1) return "Must be at least 1 day";
    if (value > 365) return "Maximum 365 days";
    return undefined;
  },
};

// ============================================================================
// Field State Types
// ============================================================================

interface FieldState {
  touched: boolean;
  error?: string;
}

type FieldName = "slug" | "metaTitle" | "metaDescription" | "cancellationHours" | "minimumNoticeHours" | "maximumAdvanceDays";

const CANCELLATION_PRESETS = [
  { hours: 24, label: "24 hours", description: "Standard policy" },
  { hours: 48, label: "48 hours", description: "Flexible policy" },
  { hours: 72, label: "72 hours", description: "Very flexible" },
  { hours: 12, label: "12 hours", description: "Strict policy" },
];

export function SettingsTab({ formState, updateForm }: SettingsTabProps) {
  // Track validation state for each field
  const [fields, setFields] = useState<Record<FieldName, FieldState>>({
    slug: { touched: false },
    metaTitle: { touched: false },
    metaDescription: { touched: false },
    cancellationHours: { touched: false },
    minimumNoticeHours: { touched: false },
    maximumAdvanceDays: { touched: false },
  });

  // Validate a specific field
  const validateField = useCallback((fieldName: FieldName, value: unknown): string | undefined => {
    switch (fieldName) {
      case "slug":
        return validators.slug(value as string);
      case "metaTitle":
        return validators.metaTitle(value as string);
      case "metaDescription":
        return validators.metaDescription(value as string);
      case "cancellationHours":
        return validators.cancellationHours(value as number);
      case "minimumNoticeHours":
        return validators.minimumNoticeHours(value as number);
      case "maximumAdvanceDays":
        return validators.maximumAdvanceDays(value as number);
      default:
        return undefined;
    }
  }, []);

  // Handle field blur - validate and mark as touched
  const handleBlur = useCallback((fieldName: FieldName) => {
    const value = formState[fieldName];
    const error = validateField(fieldName, value);
    setFields(prev => ({
      ...prev,
      [fieldName]: { touched: true, error },
    }));
  }, [formState, validateField]);

  // Re-validate on value changes for touched fields
  useEffect(() => {
    if (fields.slug.touched) {
      const error = validateField("slug", formState.slug);
      setFields(prev => ({ ...prev, slug: { ...prev.slug, error } }));
    }
  }, [formState.slug, fields.slug.touched, validateField]);

  useEffect(() => {
    if (fields.metaTitle.touched) {
      const error = validateField("metaTitle", formState.metaTitle);
      setFields(prev => ({ ...prev, metaTitle: { ...prev.metaTitle, error } }));
    }
  }, [formState.metaTitle, fields.metaTitle.touched, validateField]);

  useEffect(() => {
    if (fields.metaDescription.touched) {
      const error = validateField("metaDescription", formState.metaDescription);
      setFields(prev => ({ ...prev, metaDescription: { ...prev.metaDescription, error } }));
    }
  }, [formState.metaDescription, fields.metaDescription.touched, validateField]);

  // Check if a field is valid
  const isFieldValid = (fieldName: FieldName): boolean => {
    const field = fields[fieldName];
    if (!field.touched || field.error) return false;
    const value = formState[fieldName];
    return value !== undefined && value !== "";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-slate-500/5 rounded-xl border border-slate-500/10">
        <div className="p-2 bg-slate-500/10 rounded-lg">
          <Settings className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Tour Settings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure meeting point, policies, and SEO settings
          </p>
        </div>
      </div>

      {/* Meeting Point Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Meeting Point</h3>
            <p className="text-sm text-muted-foreground">Where guests will meet</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Address / Location
            </label>
            <input
              type="text"
              value={formState.meetingPoint}
              onChange={(e) => updateForm({ meetingPoint: e.target.value })}
              placeholder="e.g., Golden Gate Bridge Welcome Center"
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Additional Details
            </label>
            <input
              type="text"
              value={formState.meetingPointDetails}
              onChange={(e) => updateForm({ meetingPointDetails: e.target.value })}
              placeholder="e.g., Look for guide with orange umbrella"
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
          </div>
        </div>
      </div>

      {/* Cancellation Policy Section */}
      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Cancellation Policy</h3>
            <p className="text-sm text-muted-foreground">
              When can guests cancel for a full refund?
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CANCELLATION_PRESETS.map((preset) => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => updateForm({ cancellationHours: preset.hours })}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  formState.cancellationHours === preset.hours
                    ? "bg-primary/5 border-primary text-foreground"
                    : "bg-background border-input text-foreground hover:border-primary/50"
                )}
              >
                <p className="font-semibold">{preset.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Or custom:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={formState.cancellationHours}
                onChange={(e) => updateForm({ cancellationHours: parseInt(e.target.value) || 24 })}
                className={cn(
                  "w-20 px-3 py-2 border rounded-lg text-center transition-all",
                  "bg-background text-foreground",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                )}
              />
              <span className="text-sm text-muted-foreground">hours before start</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Policy Details
              <span className="text-muted-foreground font-normal ml-2">(shown to customers)</span>
            </label>
            <textarea
              value={formState.cancellationPolicy}
              onChange={(e) => updateForm({ cancellationPolicy: e.target.value })}
              placeholder="e.g., Full refund if cancelled 24 hours before. 50% refund within 24 hours. No refund for no-shows."
              rows={3}
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all resize-none",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
          </div>
        </div>
      </div>

      {/* Booking Window Section */}
      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <CalendarClock className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Booking Window</h3>
            <p className="text-sm text-muted-foreground">
              Control when customers can book this tour
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Minimum Notice */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Timer className="h-4 w-4 text-muted-foreground" />
              Minimum Notice Required
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={720}
                value={formState.minimumNoticeHours}
                onChange={(e) => updateForm({ minimumNoticeHours: parseInt(e.target.value) || 0 })}
                className={cn(
                  "w-24 px-3 py-2 border rounded-lg text-center transition-all",
                  "bg-background text-foreground",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                )}
              />
              <span className="text-sm text-muted-foreground">hours before tour start</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Customers must book at least this many hours in advance
            </p>
          </div>

          {/* Maximum Advance Days */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Maximum Advance Booking
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={365}
                value={formState.maximumAdvanceDays}
                onChange={(e) => updateForm({ maximumAdvanceDays: parseInt(e.target.value) || 90 })}
                className={cn(
                  "w-24 px-3 py-2 border rounded-lg text-center transition-all",
                  "bg-background text-foreground",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                )}
              />
              <span className="text-sm text-muted-foreground">days in advance</span>
            </div>
            <p className="text-xs text-muted-foreground">
              How far ahead customers can book (1-365 days)
            </p>
          </div>

          {/* Same Day Booking */}
          <div className="space-y-4">
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                formState.allowSameDayBooking
                  ? "bg-primary/5 border-primary/30"
                  : "bg-muted/30 border-input"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  formState.allowSameDayBooking ? "bg-primary/10" : "bg-muted"
                )}>
                  <CalendarClock className={cn(
                    "h-4 w-4 transition-colors",
                    formState.allowSameDayBooking ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="font-medium text-foreground">Allow Same-Day Booking</p>
                  <p className="text-sm text-muted-foreground">
                    Let customers book for later today
                  </p>
                </div>
              </div>
              <Switch
                checked={formState.allowSameDayBooking}
                onCheckedChange={(checked) => updateForm({ allowSameDayBooking: checked })}
              />
            </div>

            {formState.allowSameDayBooking && (
              <div className="pl-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-medium text-foreground">
                  Same-Day Cutoff Time
                </label>
                <input
                  type="time"
                  value={formState.sameDayCutoffTime}
                  onChange={(e) => updateForm({ sameDayCutoffTime: e.target.value })}
                  className={cn(
                    "w-32 px-3 py-2 border rounded-lg transition-all",
                    "bg-background text-foreground",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Latest time customers can book for same-day tours
                </p>
              </div>
            )}
          </div>

          {/* Preview Box */}
          <div className="p-4 bg-muted/50 rounded-xl space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Booking Window Preview</p>
            <div className="space-y-1 text-sm">
              <p className="text-foreground">
                <span className="text-muted-foreground">Earliest booking:</span>{" "}
                <span className="font-medium">
                  {formState.allowSameDayBooking
                    ? `Today before ${formState.sameDayCutoffTime || "12:00"}`
                    : `${formState.minimumNoticeHours} hours before tour`}
                </span>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Latest booking:</span>{" "}
                <span className="font-medium">{formState.maximumAdvanceDays} days in advance</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Section */}
      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Search className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">SEO Settings</h3>
            <p className="text-sm text-muted-foreground">
              Optimize how your tour appears in search results
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* URL Slug */}
          <ValidatedFormField
            label="URL Slug"
            htmlFor="url-slug"
            optional
            touched={fields.slug.touched}
            error={fields.slug.error}
            valid={isFieldValid("slug")}
            hint="Auto-generated from tour name. Edit to customize."
            shouldShake
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/tours/</span>
              <input
                id="url-slug"
                type="text"
                value={formState.slug}
                onChange={(e) => updateForm({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                onBlur={() => handleBlur("slug")}
                placeholder="golden-gate-walking-tour"
                aria-invalid={fields.slug.touched && !!fields.slug.error}
                className={cn(
                  "flex-1 px-4 py-2 border rounded-lg transition-all font-mono text-sm",
                  "bg-background text-foreground placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-offset-0",
                  getInputValidationClasses({
                    error: fields.slug.error,
                    touched: fields.slug.touched,
                    valid: isFieldValid("slug"),
                  })
                )}
              />
            </div>
          </ValidatedFormField>

          {/* Meta Title */}
          <ValidatedFormField
            label="Meta Title"
            htmlFor="meta-title"
            optional
            touched={fields.metaTitle.touched}
            error={fields.metaTitle.error}
            valid={isFieldValid("metaTitle")}
            showValidState={false}
            shouldShake
          >
            <input
              id="meta-title"
              type="text"
              value={formState.metaTitle}
              onChange={(e) => updateForm({ metaTitle: e.target.value })}
              onBlur={() => handleBlur("metaTitle")}
              placeholder="Leave blank to use tour name"
              maxLength={70}
              aria-invalid={fields.metaTitle.touched && !!fields.metaTitle.error}
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-offset-0",
                getInputValidationClasses({
                  error: fields.metaTitle.error,
                  touched: fields.metaTitle.touched,
                  valid: false,
                }, { showSuccessState: false })
              )}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">Appears in browser tabs and search results</span>
              <span className={cn(
                "tabular-nums transition-colors",
                formState.metaTitle.length > 60
                  ? "text-destructive font-medium"
                  : formState.metaTitle.length > 50
                    ? "text-amber-500"
                    : "text-muted-foreground"
              )}>
                {formState.metaTitle.length}/60
              </span>
            </div>
          </ValidatedFormField>

          {/* Meta Description */}
          <ValidatedTextareaField
            label="Meta Description"
            htmlFor="meta-description"
            optional
            touched={fields.metaDescription.touched}
            error={fields.metaDescription.error}
            valid={false}
            showValidState={false}
            maxLength={160}
            currentLength={formState.metaDescription.length}
            shouldShake
          >
            <textarea
              id="meta-description"
              value={formState.metaDescription}
              onChange={(e) => updateForm({ metaDescription: e.target.value })}
              onBlur={() => handleBlur("metaDescription")}
              placeholder="Leave blank to use short description"
              maxLength={200}
              rows={3}
              aria-invalid={fields.metaDescription.touched && !!fields.metaDescription.error}
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all resize-none",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-offset-0",
                fields.metaDescription.touched && fields.metaDescription.error
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : "border-input focus-visible:ring-primary/30 focus:border-primary"
              )}
            />
          </ValidatedTextareaField>

          {/* Preview */}
          {(formState.metaTitle || formState.name) && (
            <div className="p-4 bg-muted/50 rounded-xl space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Search Preview</p>
              <div className="font-medium text-primary truncate">
                {formState.metaTitle || formState.name || "Tour Name"}
              </div>
              <div className="text-sm text-emerald-600 truncate">
                yourdomain.com/tours/{formState.slug || "tour-slug"}
              </div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {formState.metaDescription || formState.shortDescription || "Tour description will appear here..."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
