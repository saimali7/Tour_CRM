/**
 * Command Center Types
 *
 * Shared type definitions for the Command Center component and its subcomponents.
 */

import type { GuideTimeline } from "./timeline/types";

// =============================================================================
// DISPATCH STATUS
// =============================================================================

export type DispatchStatus = "pending" | "optimized" | "needs_review" | "ready" | "dispatched";

// =============================================================================
// WARNINGS
// =============================================================================

export interface DispatchSuggestion {
  id: string;
  label: string;
  description?: string;
  impact?: string; // e.g., "+18m drive"
  guideId?: string;
  action?: "assign_guide" | "add_external" | "cancel_tour" | "split_booking" | "acknowledge";
}

export interface DispatchWarning {
  id: string;
  type: "capacity" | "no_guide" | "conflict" | "late_pickup";
  message: string;
  bookingId?: string;
  tourRunKey?: string;
  guestName?: string;
  guestCount?: number;
  suggestions: DispatchSuggestion[];
}

// =============================================================================
// DISPATCH DATA
// =============================================================================

export interface DispatchData {
  status: DispatchStatus;
  totalGuests: number;
  totalGuides: number;
  totalDriveMinutes: number;
  efficiencyScore: number;
  dispatchedAt?: Date;
  warnings: DispatchWarning[];
  guideTimelines: GuideTimeline[];
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface CommandCenterProps {
  date: Date;
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}
