"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { SingleImageUploader, ImageUploader } from "@/components/uploads/image-uploader";
import type { TourFormState } from "../tour-creator";

interface ContentTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
  orgSlug: string;
}

export function ContentTab({ formState, updateForm, orgSlug }: ContentTabProps) {
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const addToList = (
    field: "includes" | "excludes" | "requirements" | "tags",
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim()) {
      updateForm({ [field]: [...formState[field], value.trim()] });
      setValue("");
    }
  };

  const removeFromList = (
    field: "includes" | "excludes" | "requirements" | "tags",
    index: number
  ) => {
    updateForm({ [field]: formState[field].filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <FileText className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Tour Content</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add details that help customers understand what they'll experience
          </p>
        </div>
      </div>

      {/* Full Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Full Description
        </label>
        <textarea
          value={formState.description}
          onChange={(e) => updateForm({ description: e.target.value })}
          placeholder="Tell the story of your tour. What makes it special? What will guests experience? Paint a picture..."
          rows={6}
          className={cn(
            "w-full px-4 py-3 border rounded-xl transition-all resize-none",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
          )}
        />
      </div>

      {/* Includes / Excludes / Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What's Included */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            What's Included
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={includeInput}
              onChange={(e) => setIncludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("includes", includeInput, setIncludeInput);
                }
              }}
              placeholder="e.g., Professional guide"
              className={cn(
                "flex-1 px-3 py-2 text-sm border rounded-lg transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
            <button
              type="button"
              onClick={() => addToList("includes", includeInput, setIncludeInput)}
              className="px-3 py-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formState.includes.length > 0 && (
            <ul className="space-y-2">
              {formState.includes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg group"
                >
                  <span className="text-sm text-foreground flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromList("includes", index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Not Included */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground flex items-center gap-2">
            <X className="h-4 w-4 text-rose-500" />
            Not Included
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("excludes", excludeInput, setExcludeInput);
                }
              }}
              placeholder="e.g., Transportation"
              className={cn(
                "flex-1 px-3 py-2 text-sm border rounded-lg transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
            <button
              type="button"
              onClick={() => addToList("excludes", excludeInput, setExcludeInput)}
              className="px-3 py-2 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formState.excludes.length > 0 && (
            <ul className="space-y-2">
              {formState.excludes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-rose-500/5 border border-rose-500/10 rounded-lg group"
                >
                  <span className="text-sm text-foreground flex items-center gap-2">
                    <X className="h-3.5 w-3.5 text-rose-500" />
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromList("excludes", index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Requirements */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Requirements
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("requirements", requirementInput, setRequirementInput);
                }
              }}
              placeholder="e.g., Walking shoes"
              className={cn(
                "flex-1 px-3 py-2 text-sm border rounded-lg transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
              )}
            />
            <button
              type="button"
              onClick={() => addToList("requirements", requirementInput, setRequirementInput)}
              className="px-3 py-2 bg-amber-500/10 text-amber-600 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formState.requirements.length > 0 && (
            <ul className="space-y-2">
              {formState.requirements.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg group"
                >
                  <span className="text-sm text-foreground flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromList("requirements", index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Tags
          <span className="text-muted-foreground font-normal ml-2">Help customers find your tour</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addToList("tags", tagInput, setTagInput);
              }
            }}
            placeholder="e.g., family-friendly, sunset, romantic"
            className={cn(
              "flex-1 px-3 py-2 text-sm border rounded-lg transition-all",
              "bg-background text-foreground placeholder:text-muted-foreground",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
            )}
          />
          <button
            type="button"
            onClick={() => addToList("tags", tagInput, setTagInput)}
            className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {formState.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formState.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium group"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeFromList("tags", index)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Images Section */}
      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <ImageIcon className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Images</h3>
            <p className="text-sm text-muted-foreground">
              Add photos to showcase your tour
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cover Image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Cover Image
            </label>
            <SingleImageUploader
              value={formState.coverImageUrl}
              onChange={(url) => updateForm({ coverImageUrl: url })}
              folder="tours/covers"
              orgSlug={orgSlug}
            />
          </div>

          {/* Gallery */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Gallery
              <span className="text-muted-foreground font-normal ml-2">Up to 10 images</span>
            </label>
            <ImageUploader
              value={formState.images}
              onChange={(urls) => updateForm({ images: urls })}
              maxFiles={10}
              folder="tours/gallery"
              orgSlug={orgSlug}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
