"use client";

import {
  Clock,
  Check,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface TourData {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
  coverImageUrl: string | null;
}

export interface TourSelectorProps {
  tours: TourData[];
  selectedTourId: string;
  onSelectTour: (tourId: string) => void;
  error?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TourSelector({
  tours,
  selectedTourId,
  onSelectTour,
  error,
}: TourSelectorProps) {
  return (
    <section className="space-y-3">
      <label className="text-sm font-medium text-foreground">Tour</label>
      <div className="grid grid-cols-1 gap-2">
        {tours.map((tour) => (
          <button
            key={tour.id}
            type="button"
            onClick={() => onSelectTour(tour.id)}
            className={cn(
              "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
              selectedTourId === tour.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            {tour.coverImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={tour.coverImageUrl} alt={tour.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{tour.name}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {tour.durationMinutes}min
                </span>
                <span className="font-medium text-primary">${parseFloat(tour.basePrice).toFixed(0)}</span>
              </div>
            </div>
            {selectedTourId === tour.id && (
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </section>
  );
}
