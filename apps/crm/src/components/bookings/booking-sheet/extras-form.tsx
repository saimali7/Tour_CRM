"use client";

import { MapPin } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtrasFormProps {
  pickupLocation: string;
  onPickupLocationChange: (location: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExtrasForm({
  pickupLocation,
  onPickupLocationChange,
  notes,
  onNotesChange,
}: ExtrasFormProps) {
  return (
    <section className="space-y-3">
      <label className="text-sm font-medium text-foreground">Details (optional)</label>
      <div className="space-y-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => onPickupLocationChange(e.target.value)}
            placeholder="Pickup location / hotel"
            className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Special requests, dietary needs..."
          rows={2}
          className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
        />
      </div>
    </section>
  );
}
