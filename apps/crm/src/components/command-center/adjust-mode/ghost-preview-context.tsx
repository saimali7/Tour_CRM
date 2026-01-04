"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Efficiency rating for a proposed assignment
 */
export type EfficiencyRating = "efficient" | "acceptable" | "inefficient";

/**
 * Ghost preview data shown during drag operations
 * Displays proposed assignment impact on the map panel
 */
export interface GhostPreviewData {
  /** Whether a drag operation is actively in progress */
  isActive: boolean;

  /** Source information - what's being dragged */
  source: {
    type: "segment" | "hopper-booking";
    bookingId?: string;
    customerName?: string;
    guestCount?: number;
    pickupZone?: {
      name: string;
      color: string;
    };
    /** For segment drags, the current guide */
    fromGuideId?: string;
    fromGuideName?: string;
  } | null;

  /** Target guide being hovered over */
  target: {
    guideId: string;
    guideName: string;
    vehicleCapacity: number;
    currentGuestCount: number;
  } | null;

  /** Calculated impact of the proposed assignment */
  impact: {
    /** Net change in drive time (positive = more drive time) */
    driveTimeChange: number;
    /** Efficiency rating based on route optimization */
    efficiency: EfficiencyRating;
    /** Whether this would exceed vehicle capacity */
    exceedsCapacity: boolean;
    /** Current capacity utilization after assignment */
    capacityUtilization: number;
  } | null;

  /** Better alternative suggestion if available */
  recommendation: {
    betterGuideId: string;
    betterGuideName: string;
    savingsMinutes: number;
  } | null;
}

interface GhostPreviewContextType {
  /** Current ghost preview state */
  ghostPreview: GhostPreviewData;

  /** Start a drag operation */
  startDrag: (source: GhostPreviewData["source"]) => void;

  /** Update target when hovering over a guide */
  setDragTarget: (target: GhostPreviewData["target"], impact?: GhostPreviewData["impact"], recommendation?: GhostPreviewData["recommendation"]) => void;

  /** Clear target when leaving a guide */
  clearDragTarget: () => void;

  /** End the drag operation */
  endDrag: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialGhostPreview: GhostPreviewData = {
  isActive: false,
  source: null,
  target: null,
  impact: null,
  recommendation: null,
};

// =============================================================================
// CONTEXT
// =============================================================================

const GhostPreviewContext = createContext<GhostPreviewContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface GhostPreviewProviderProps {
  children: ReactNode;
}

export function GhostPreviewProvider({ children }: GhostPreviewProviderProps) {
  const [ghostPreview, setGhostPreview] = useState<GhostPreviewData>(initialGhostPreview);

  const startDrag = useCallback((source: GhostPreviewData["source"]) => {
    setGhostPreview({
      isActive: true,
      source,
      target: null,
      impact: null,
      recommendation: null,
    });
  }, []);

  const setDragTarget = useCallback((
    target: GhostPreviewData["target"],
    impact?: GhostPreviewData["impact"],
    recommendation?: GhostPreviewData["recommendation"]
  ) => {
    setGhostPreview((prev) => ({
      ...prev,
      target,
      impact: impact ?? null,
      recommendation: recommendation ?? null,
    }));
  }, []);

  const clearDragTarget = useCallback(() => {
    setGhostPreview((prev) => ({
      ...prev,
      target: null,
      impact: null,
      recommendation: null,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setGhostPreview(initialGhostPreview);
  }, []);

  return (
    <GhostPreviewContext.Provider
      value={{
        ghostPreview,
        startDrag,
        setDragTarget,
        clearDragTarget,
        endDrag,
      }}
    >
      {children}
    </GhostPreviewContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access ghost preview context
 * Must be used within a GhostPreviewProvider
 */
export function useGhostPreview(): GhostPreviewContextType {
  const context = useContext(GhostPreviewContext);
  if (!context) {
    throw new Error("useGhostPreview must be used within a GhostPreviewProvider");
  }
  return context;
}

/**
 * Calculate efficiency rating from drive time change
 */
export function calculateEfficiency(driveTimeChange: number): EfficiencyRating {
  if (driveTimeChange <= 5) return "efficient";
  if (driveTimeChange <= 15) return "acceptable";
  return "inefficient";
}

/**
 * Estimate drive time impact for a booking assignment
 * This is a simplified calculation - in production would use zone travel times
 */
export function estimateDriveTimeImpact(
  bookingZoneId: string | undefined,
  guideBaseZoneId: string | undefined,
  existingPickups: number
): number {
  // Base estimate: each pickup adds ~10 minutes average
  // Same zone pickups add less time
  if (!bookingZoneId || !guideBaseZoneId) {
    return 10 + existingPickups * 2;
  }

  if (bookingZoneId === guideBaseZoneId) {
    return 5 + existingPickups * 1;
  }

  // Different zone, more drive time
  return 15 + existingPickups * 3;
}
