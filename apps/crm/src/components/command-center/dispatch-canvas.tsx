"use client";

import type { CanvasRow, HopperGroup } from "./dispatch-model";
import type { GuestCardBooking } from "./guest-card";
import type { DispatchWarning } from "./types";
import { DispatchShell } from "./canvas/dispatch-shell";
import type { DispatchOperation } from "./canvas/canvas-types";

interface DispatchCanvasProps {
  rows: CanvasRow[];
  groups: HopperGroup[];
  bookingLookup: Map<string, GuestCardBooking>;
  warnings: DispatchWarning[];
  selectedWarningId?: string | null;
  isReadOnly: boolean;
  isEditing: boolean;
  onEditingChange: (value: boolean) => void;
  isMutating: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => Promise<void>;
  onRedo: () => Promise<void>;
  onApplyOperation: (operation: DispatchOperation) => Promise<void>;
  onGuideClick: (guideId: string) => void;
  onBookingClick: (bookingId: string) => void;
  onResolveWarning: (warningId: string, suggestionId: string) => void;
  showCurrentTime: boolean;
}

export type { DispatchOperation };

export function DispatchCanvas(props: DispatchCanvasProps) {
  return <DispatchShell {...props} />;
}
