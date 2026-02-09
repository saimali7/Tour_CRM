import type { RouterInputs } from "@/lib/trpc";
import type { CanvasRow, CanvasRun, HopperGroup } from "../dispatch-model";
import type { GuestCardBooking } from "../guest-card";
import type { DispatchWarning } from "../types";

export type BatchChange = RouterInputs["commandCenter"]["batchApplyChanges"]["changes"][number];

export interface DispatchOperation {
  changes: BatchChange[];
  undoChanges: BatchChange[];
  description: string;
}

export interface DragPayload {
  source: "hopper" | "guide";
  sourceGuideId: string | null;
  bookingIds: string[];
  guestCount: number;
  runId?: string;
  runKey?: string;
  tourName?: string;
  startTime?: string;
  durationMinutes?: number;
}

export interface DragPreview {
  guideId: string;
  startTime: string;
  endTime: string;
  leftPercent: number;
  widthPercent: number;
}

export type QueueSortMode = "time" | "tour" | "guests";

export interface QueueFilterState {
  search: string;
  includeJoinRuns: boolean;
  includePrivate: boolean;
}

export type LanePressureLevel = "low" | "medium" | "high" | "critical";

export type ContextSelection =
  | { type: "none" }
  | { type: "guide"; guideId: string }
  | { type: "run"; guideId: string; runId: string }
  | { type: "booking"; bookingId: string }
  | { type: "warning"; warningId: string };

export interface GuideSummary {
  id: string;
  name: string;
  vehicleCapacity: number;
  currentGuests: number;
}

export interface DispatchContextData {
  selection: ContextSelection;
  selectedGuide?: CanvasRow;
  selectedRun?: { row: CanvasRow; run: CanvasRun };
  selectedBooking?: {
    booking: GuestCardBooking;
    assignedGuideId: string | null;
    assignedRun: CanvasRun | null;
  };
  selectedWarning?: DispatchWarning;
  warningLinkedGuides: Set<string>;
  warningLinkedRunIds: Set<string>;
  warningLinkedBookingIds: Set<string>;
}

export interface QueueGroupView {
  group: HopperGroup;
  score: number;
}

export interface RunSignals {
  hasVIP: boolean;
  hasAccessibility: boolean;
  hasChildren: boolean;
}
