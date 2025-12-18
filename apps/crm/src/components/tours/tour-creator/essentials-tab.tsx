"use client";

import { cn } from "@/lib/utils";
import { Sparkles, DollarSign, Clock, Users, AlertCircle } from "lucide-react";
import type { TourFormState } from "../tour-creator";

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

export function EssentialsTab({
  formState,
  updateForm,
  onNameChange,
  onCategoryChange,
}: EssentialsTabProps) {
  const isValid = !!(
    formState.name &&
    formState.category &&
    formState.basePrice &&
    parseFloat(formState.basePrice) > 0 &&
    formState.durationMinutes > 0 &&
    formState.maxParticipants > 0
  );

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
            Fill in the basics to get started. All fields here are required.
          </p>
        </div>
      </div>

      {/* Tour Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Tour Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Golden Gate Bridge Walking Tour"
          className={cn(
            "w-full px-4 py-3 text-lg border rounded-xl transition-all",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            !formState.name && "border-input",
            formState.name && "border-emerald-500/50"
          )}
        />
        <p className="text-xs text-muted-foreground">
          Choose a descriptive name that tells customers what to expect
        </p>
      </div>

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
              onClick={() => onCategoryChange(category)}
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
        {formState.category && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Smart defaults applied based on category
          </p>
        )}
      </div>

      {/* Price, Duration, Capacity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Base Price <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={formState.basePrice}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, "");
                updateForm({ basePrice: value });
              }}
              placeholder="0.00"
              className={cn(
                "w-full pl-11 pr-4 py-3 text-lg font-medium border rounded-xl transition-all",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                !formState.basePrice && "border-input",
                formState.basePrice && parseFloat(formState.basePrice) > 0 && "border-emerald-500/50"
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">Per person</p>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Duration <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <select
              value={formState.durationMinutes}
              onChange={(e) => updateForm({ durationMinutes: parseInt(e.target.value) })}
              className={cn(
                "w-full pl-11 pr-4 py-3 text-lg font-medium border rounded-xl transition-all appearance-none",
                "bg-background text-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                "border-emerald-500/50"
              )}
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={150}>2.5 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={300}>5 hours</option>
              <option value={360}>6 hours</option>
              <option value={480}>8 hours</option>
              <option value={600}>10 hours</option>
            </select>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Max Guests <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={formState.maxParticipants}
              onChange={(e) => updateForm({ maxParticipants: parseInt(e.target.value) || 1 })}
              className={cn(
                "w-full pl-11 pr-4 py-3 text-lg font-medium border rounded-xl transition-all",
                "bg-background text-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                "border-emerald-500/50"
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">Per session</p>
        </div>
      </div>

      {/* Short Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Short Description
          <span className="text-muted-foreground font-normal ml-2">(optional but recommended)</span>
        </label>
        <textarea
          value={formState.shortDescription}
          onChange={(e) => updateForm({ shortDescription: e.target.value })}
          placeholder="A brief tagline that appears in search results and listings..."
          maxLength={160}
          rows={2}
          className={cn(
            "w-full px-4 py-3 border rounded-xl transition-all resize-none",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
          )}
        />
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Used for listings and SEO</span>
          <span className={cn(
            formState.shortDescription.length > 140 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {formState.shortDescription.length}/160
          </span>
        </div>
      </div>

      {/* Validation Status */}
      {!isValid && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Complete required fields to continue</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!formState.name && "Name, "}
              {!formState.category && "Category, "}
              {(!formState.basePrice || parseFloat(formState.basePrice) <= 0) && "Price, "}
              need to be filled
            </p>
          </div>
        </div>
      )}

      {isValid && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
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
