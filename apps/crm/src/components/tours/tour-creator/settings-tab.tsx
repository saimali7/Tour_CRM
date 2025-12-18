"use client";

import { cn } from "@/lib/utils";
import { Settings, MapPin, Clock, Search, Link2 } from "lucide-react";
import type { TourFormState } from "../tour-creator";

interface SettingsTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
}

const CANCELLATION_PRESETS = [
  { hours: 24, label: "24 hours", description: "Standard policy" },
  { hours: 48, label: "48 hours", description: "Flexible policy" },
  { hours: 72, label: "72 hours", description: "Very flexible" },
  { hours: 12, label: "12 hours", description: "Strict policy" },
];

export function SettingsTab({ formState, updateForm }: SettingsTabProps) {
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/tours/</span>
              <input
                type="text"
                value={formState.slug}
                onChange={(e) => updateForm({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                placeholder="golden-gate-walking-tour"
                className={cn(
                  "flex-1 px-4 py-2 border rounded-lg transition-all font-mono text-sm",
                  "bg-background text-foreground placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated from tour name. Edit to customize.
            </p>
          </div>

          {/* Meta Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Meta Title
            </label>
            <input
              type="text"
              value={formState.metaTitle}
              onChange={(e) => updateForm({ metaTitle: e.target.value })}
              placeholder="Leave blank to use tour name"
              maxLength={60}
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Appears in browser tabs and search results</span>
              <span className={cn(
                formState.metaTitle.length > 50 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {formState.metaTitle.length}/60
              </span>
            </div>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Meta Description
            </label>
            <textarea
              value={formState.metaDescription}
              onChange={(e) => updateForm({ metaDescription: e.target.value })}
              placeholder="Leave blank to use short description"
              maxLength={160}
              rows={3}
              className={cn(
                "w-full px-4 py-3 border rounded-xl transition-all resize-none",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Appears in search engine results</span>
              <span className={cn(
                formState.metaDescription.length > 140 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {formState.metaDescription.length}/160
              </span>
            </div>
          </div>

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
