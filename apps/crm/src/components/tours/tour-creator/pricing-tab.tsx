"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Users,
  Car,
  Layers,
  Check,
  Info,
  Plus,
  X,
  Crown,
  UserPlus,
  Lock,
} from "lucide-react";
import type { TourFormState } from "../tour-creator";

// ============================================================================
// Types
// ============================================================================

export type PricingModelType = "per_person" | "per_unit" | "flat_rate" | "tiered_group" | "base_plus_person";
export type CapacityModelType = "shared" | "unit";
export type TourType = "shared" | "private";

export interface PricingFormState {
  tourType: TourType;
  pricingType: PricingModelType;
  capacityType: CapacityModelType;
  // Per-person pricing
  adultPrice: string;
  childPrice: string;
  infantPrice: string;
  hasChildPrice: boolean;
  hasInfantPrice: boolean;
  // Per-unit pricing
  pricePerUnit: string;
  maxOccupancy: string;
  // Flat rate
  flatPrice: string;
  flatMaxParticipants: string;
  // Base + person
  basePricePricing: string;
  pricePerAdditional: string;
  includedParticipants: string;
  baseMaxParticipants: string;
  // Tiered group
  tierRanges: Array<{ min: string; max: string; price: string }>;
  // Capacity (shared)
  totalSeats: string;
  // Capacity (unit)
  totalUnits: string;
  occupancyPerUnit: string;
}

interface PricingTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
}

// ============================================================================
// Default State
// ============================================================================

const defaultPricingState: PricingFormState = {
  tourType: "shared",
  pricingType: "per_person",
  capacityType: "shared",
  adultPrice: "",
  childPrice: "",
  infantPrice: "0",
  hasChildPrice: true,
  hasInfantPrice: true,
  pricePerUnit: "",
  maxOccupancy: "6",
  flatPrice: "",
  flatMaxParticipants: "10",
  basePricePricing: "",
  pricePerAdditional: "",
  includedParticipants: "2",
  baseMaxParticipants: "10",
  tierRanges: [{ min: "1", max: "4", price: "" }],
  totalSeats: "20",
  totalUnits: "3",
  occupancyPerUnit: "6",
};

// ============================================================================
// Component
// ============================================================================

export function PricingTab({ formState, updateForm }: PricingTabProps) {
  // Track if initial sync has happened
  const hasSyncedRef = useRef(false);

  // Use pricing state from form or default
  const [pricingState, setPricingState] = useState<PricingFormState>(() => {
    // Initialize from formState.pricingConfig if available
    if (formState.pricingConfig) {
      return formState.pricingConfig as PricingFormState;
    }
    // Auto-populate adult price from basePrice if set
    return {
      ...defaultPricingState,
      adultPrice: formState.basePrice || "",
      childPrice: formState.basePrice ? (parseFloat(formState.basePrice) * 0.5).toFixed(2) : "",
      totalSeats: formState.maxParticipants?.toString() || "20",
    };
  });

  // Sync initial state to parent after mount (not during render)
  useEffect(() => {
    if (!hasSyncedRef.current && !formState.pricingConfig) {
      hasSyncedRef.current = true;
      updateForm({ pricingConfig: pricingState });
    }
  }, [formState.pricingConfig, pricingState, updateForm]);

  // Update local state and sync to form
  const updatePricing = useCallback((updates: Partial<PricingFormState>) => {
    setPricingState(prev => {
      const next = { ...prev, ...updates };
      return next;
    });
  }, []);

  // Sync pricing state changes to parent
  useEffect(() => {
    if (hasSyncedRef.current) {
      updateForm({ pricingConfig: pricingState });
    }
  }, [pricingState, updateForm]);

  // Handle tour type change - auto-select appropriate pricing model
  const handleTourTypeChange = (tourType: TourType) => {
    if (tourType === "shared") {
      updatePricing({
        tourType,
        pricingType: "per_person",
        capacityType: "shared",
      });
    } else {
      updatePricing({
        tourType,
        pricingType: "per_unit",
        capacityType: "unit",
      });
    }
  };

  // Add tier for tiered pricing
  const addTier = () => {
    const lastTier = pricingState.tierRanges[pricingState.tierRanges.length - 1];
    const newMin = lastTier ? (parseInt(lastTier.max) + 1).toString() : "1";
    const newMax = lastTier ? (parseInt(lastTier.max) + 4).toString() : "4";
    updatePricing({
      tierRanges: [...pricingState.tierRanges, { min: newMin, max: newMax, price: "" }],
    });
  };

  const removeTier = (index: number) => {
    updatePricing({
      tierRanges: pricingState.tierRanges.filter((_, i) => i !== index),
    });
  };

  const updateTier = (index: number, field: "min" | "max" | "price", value: string) => {
    updatePricing({
      tierRanges: pricingState.tierRanges.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    });
  };

  // Calculate preview price
  const getPreviewPrice = (): string => {
    switch (pricingState.pricingType) {
      case "per_person":
        return pricingState.adultPrice ? `$${pricingState.adultPrice}/person` : "Set price";
      case "per_unit":
        return pricingState.pricePerUnit ? `$${pricingState.pricePerUnit}/vehicle` : "Set price";
      case "flat_rate":
        return pricingState.flatPrice ? `$${pricingState.flatPrice} flat` : "Set price";
      case "base_plus_person":
        return pricingState.basePricePricing ? `$${pricingState.basePricePricing} base` : "Set price";
      case "tiered_group":
        return "Tiered pricing";
      default:
        return "Configure pricing";
    }
  };

  const isPricingValid = (): boolean => {
    switch (pricingState.pricingType) {
      case "per_person":
        return !!pricingState.adultPrice && parseFloat(pricingState.adultPrice) > 0;
      case "per_unit":
        return !!pricingState.pricePerUnit && parseFloat(pricingState.pricePerUnit) > 0;
      case "flat_rate":
        return !!pricingState.flatPrice && parseFloat(pricingState.flatPrice) > 0;
      case "base_plus_person":
        return !!pricingState.basePricePricing && parseFloat(pricingState.basePricePricing) > 0;
      case "tiered_group":
        return pricingState.tierRanges.length > 0 &&
          pricingState.tierRanges.every(t => t.price && parseFloat(t.price) > 0);
      default:
        return false;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
        <div className="p-2 bg-primary/10 rounded-lg">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Pricing Setup</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure how customers book and pay for this tour.
          </p>
        </div>
      </div>

      {/* Step 1: Tour Type */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            What type of tour is this? <span className="text-destructive">*</span>
          </label>
          <p className="text-sm text-muted-foreground mb-4">
            This determines how customers book and how capacity is managed.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shared Group Tour */}
          <button
            type="button"
            onClick={() => handleTourTypeChange("shared")}
            className={cn(
              "p-5 rounded-xl border-2 text-left transition-all",
              pricingState.tourType === "shared"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2.5 rounded-lg",
                pricingState.tourType === "shared" ? "bg-primary/10" : "bg-muted"
              )}>
                <Users className={cn(
                  "h-6 w-6",
                  pricingState.tourType === "shared" ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  pricingState.tourType === "shared" ? "text-primary" : "text-foreground"
                )}>
                  Shared Group Tour
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Multiple bookings join the same tour. Charge per person.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Walking tours</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Food tours</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Group activities</span>
                </div>
              </div>
              {pricingState.tourType === "shared" && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          </button>

          {/* Private Experience */}
          <button
            type="button"
            onClick={() => handleTourTypeChange("private")}
            className={cn(
              "p-5 rounded-xl border-2 text-left transition-all",
              pricingState.tourType === "private"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2.5 rounded-lg",
                pricingState.tourType === "private" ? "bg-primary/10" : "bg-muted"
              )}>
                <Lock className={cn(
                  "h-6 w-6",
                  pricingState.tourType === "private" ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  pricingState.tourType === "private" ? "text-primary" : "text-foreground"
                )}>
                  Private Experience
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  One booking gets the entire experience. Exclusive access.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Vehicle tours</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">VIP experiences</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Private guides</span>
                </div>
              </div>
              {pricingState.tourType === "private" && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Pricing Configuration (based on tour type) */}
      <div className="p-6 bg-card rounded-xl border border-border space-y-6">
        {pricingState.tourType === "shared" ? (
          <>
            {/* Shared Tour Pricing */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Per-Person Pricing
              </h3>
              <button
                type="button"
                onClick={() => updatePricing({
                  pricingType: pricingState.pricingType === "tiered_group" ? "per_person" : "tiered_group"
                })}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-colors",
                  pricingState.pricingType === "tiered_group"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <Layers className="h-3 w-3 inline-block mr-1" />
                Group Discounts
              </button>
            </div>

            {pricingState.pricingType === "tiered_group" ? (
              /* Tiered Group Pricing */
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set different prices based on group size. Larger groups can get better rates.
                </p>
                {pricingState.tierRanges.map((tier, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        min="1"
                        value={tier.min}
                        onChange={(e) => updateTier(index, "min", e.target.value)}
                        className="w-20 px-3 py-2 border border-input rounded-lg bg-background text-center"
                        placeholder="1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="number"
                        min="1"
                        value={tier.max}
                        onChange={(e) => updateTier(index, "max", e.target.value)}
                        className="w-20 px-3 py-2 border border-input rounded-lg bg-background text-center"
                        placeholder="4"
                      />
                      <span className="text-muted-foreground">people:</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tier.price}
                          onChange={(e) => updateTier(index, "price", e.target.value)}
                          className="w-28 pl-8 pr-3 py-2 border border-input rounded-lg bg-background"
                          placeholder="0.00"
                        />
                      </div>
                      <span className="text-muted-foreground text-sm">/person</span>
                    </div>
                    {pricingState.tierRanges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add tier
                </button>
              </div>
            ) : (
              /* Standard Per-Person Pricing */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Adult Price */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Adult Price <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingState.adultPrice}
                        onChange={(e) => updatePricing({ adultPrice: e.target.value })}
                        placeholder="89.00"
                        className={cn(
                          "w-full pl-8 pr-4 py-3 text-lg font-medium border rounded-xl transition-all",
                          "bg-background text-foreground placeholder:text-muted-foreground",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          pricingState.adultPrice ? "border-success" : "border-input"
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Ages 13+</p>
                  </div>

                  {/* Child Price */}
                  {pricingState.hasChildPrice && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Child Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingState.childPrice}
                          onChange={(e) => updatePricing({ childPrice: e.target.value })}
                          placeholder="45.00"
                          className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Ages 3-12</p>
                    </div>
                  )}

                  {/* Infant */}
                  {pricingState.hasInfantPrice && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Infant</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingState.infantPrice}
                          onChange={(e) => updatePricing({ infantPrice: e.target.value })}
                          placeholder="0"
                          className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Ages 0-2</p>
                    </div>
                  )}
                </div>

                {/* Age tier toggles */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingState.hasChildPrice}
                      onChange={(e) => updatePricing({ hasChildPrice: e.target.checked })}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Child pricing (3-12)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingState.hasInfantPrice}
                      onChange={(e) => updatePricing({ hasInfantPrice: e.target.checked })}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Infant pricing (0-2)</span>
                  </label>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Private Experience Pricing */}
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
                <Lock className="h-4 w-4 text-muted-foreground" />
                How do you charge for private bookings?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { type: "per_unit" as const, label: "Per Vehicle", icon: Car, desc: "Charge per vehicle/unit" },
                  { type: "flat_rate" as const, label: "Flat Rate", icon: Crown, desc: "One price for everything" },
                  { type: "base_plus_person" as const, label: "Base + Per Person", icon: UserPlus, desc: "Base fee + per guest" },
                ].map((pm) => (
                  <button
                    key={pm.type}
                    type="button"
                    onClick={() => updatePricing({ pricingType: pm.type })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      pricingState.pricingType === pm.type
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <pm.icon className={cn(
                      "h-5 w-5 mb-2",
                      pricingState.pricingType === pm.type ? "text-primary" : "text-muted-foreground"
                    )} />
                    <p className={cn(
                      "font-medium text-sm",
                      pricingState.pricingType === pm.type ? "text-primary" : "text-foreground"
                    )}>
                      {pm.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pm.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Private Pricing Fields */}
            {pricingState.pricingType === "per_unit" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Price per Vehicle <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingState.pricePerUnit}
                      onChange={(e) => updatePricing({ pricePerUnit: e.target.value })}
                      placeholder="400.00"
                      className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Max Guests per Vehicle</label>
                  <input
                    type="number"
                    min="1"
                    value={pricingState.maxOccupancy}
                    onChange={(e) => updatePricing({ maxOccupancy: e.target.value })}
                    placeholder="6"
                    className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Guests included in the vehicle price</p>
                </div>
              </div>
            )}

            {pricingState.pricingType === "flat_rate" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Total Price <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingState.flatPrice}
                      onChange={(e) => updatePricing({ flatPrice: e.target.value })}
                      placeholder="800.00"
                      className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={pricingState.flatMaxParticipants}
                    onChange={(e) => updatePricing({ flatMaxParticipants: e.target.value })}
                    placeholder="4"
                    className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum group size for this price</p>
                </div>
              </div>
            )}

            {pricingState.pricingType === "base_plus_person" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Base Price <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingState.basePricePricing}
                        onChange={(e) => updatePricing({ basePricePricing: e.target.value })}
                        placeholder="200.00"
                        className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Additional Per Person
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingState.pricePerAdditional}
                        onChange={(e) => updatePricing({ pricePerAdditional: e.target.value })}
                        placeholder="50.00"
                        className="w-full pl-8 pr-4 py-3 text-lg font-medium border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Guests Included in Base</label>
                    <input
                      type="number"
                      min="1"
                      value={pricingState.includedParticipants}
                      onChange={(e) => updatePricing({ includedParticipants: e.target.value })}
                      placeholder="2"
                      className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Max Total Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={pricingState.baseMaxParticipants}
                      onChange={(e) => updatePricing({ baseMaxParticipants: e.target.value })}
                      placeholder="10"
                      className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                {pricingState.basePricePricing && pricingState.pricePerAdditional && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Example:</span> For {pricingState.includedParticipants || 2} guests: ${pricingState.basePricePricing}.
                      For {parseInt(pricingState.includedParticipants || "2") + 2} guests: ${(parseFloat(pricingState.basePricePricing || "0") + parseFloat(pricingState.pricePerAdditional || "0") * 2).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 3: Capacity */}
      <div className="p-6 bg-card rounded-xl border border-border space-y-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Capacity
        </h3>

        {pricingState.tourType === "shared" ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Total Seats per Session
            </label>
            <input
              type="number"
              min="1"
              value={pricingState.totalSeats}
              onChange={(e) => updatePricing({ totalSeats: e.target.value })}
              placeholder="20"
              className="w-full max-w-xs px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum guests across all bookings for a single time slot
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Number of Vehicles/Units
              </label>
              <input
                type="number"
                min="1"
                value={pricingState.totalUnits}
                onChange={(e) => updatePricing({ totalUnits: e.target.value })}
                placeholder="3"
                className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many can run at the same time
              </p>
            </div>
            {pricingState.pricingType === "per_unit" && (
              <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  With {pricingState.totalUnits || 3} vehicles at {pricingState.maxOccupancy || 6} guests each,
                  you can accommodate up to {(parseInt(pricingState.totalUnits) || 3) * (parseInt(pricingState.maxOccupancy) || 6)} guests per time slot.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        isPricingValid()
          ? "bg-success/5 border-success/20"
          : "bg-muted/50 border-border"
      )}>
        {isPricingValid() ? (
          <Check className="h-5 w-5 text-success mt-0.5" />
        ) : (
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
        )}
        <div>
          <p className={cn(
            "font-medium",
            isPricingValid() ? "text-success dark:text-success" : "text-muted-foreground"
          )}>
            {isPricingValid()
              ? `Pricing configured: ${getPreviewPrice()}`
              : "Set your pricing to continue"
            }
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pricingState.tourType === "shared"
              ? `Shared group tour with ${pricingState.totalSeats} seats per session`
              : `Private experience with ${pricingState.totalUnits} units available`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
