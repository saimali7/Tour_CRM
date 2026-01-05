/**
 * Adjust Mode Components for Tour Command Center
 *
 * This module provides drag-and-drop guide reassignment functionality.
 *
 * Usage:
 * 1. Wrap your command center with AdjustModeProvider, GhostPreviewProvider, and DndProvider
 * 2. Use AdjustModeToggle to enter/exit adjust mode
 * 3. Segments in segment-lane.tsx use useDraggable directly (inline DnD)
 * 4. Wrap guide rows with DroppableGuideRow
 * 5. Use useGhostPreview in MapPanel to show drag feedback
 *
 * @example
 * ```tsx
 * <AdjustModeProvider>
 *   <GhostPreviewProvider>
 *     <DndProvider onBookingAssign={handleAssign}>
 *       <AdjustModeToggle onApplyChanges={handleApply} />
 *       <DroppableGuideRow guideId={guide.id} guideName={guideName} ...>
 *         <SegmentLane segments={segments} guide={guide} ... />
 *       </DroppableGuideRow>
 *       <MapPanel />
 *     </DndProvider>
 *   </GhostPreviewProvider>
 * </AdjustModeProvider>
 * ```
 */

// =============================================================================
// CONTEXT & STATE
// =============================================================================

export {
  AdjustModeProvider,
  useAdjustMode,
  type PendingChange,
  type PendingAssignChange,
  type PendingReassignChange,
  type PendingTimeShiftChange,
  type PendingUnassignChange,
  type PendingChangesSummary,
} from "./adjust-mode-context";

export {
  GhostPreviewProvider,
  useGhostPreview,
  calculateEfficiency,
  estimateDriveTimeImpact,
  type GhostPreviewData,
  type EfficiencyRating,
} from "./ghost-preview-context";

// =============================================================================
// COMPONENTS
// =============================================================================

export { AdjustModeToggle } from "./adjust-mode-toggle";
export { PendingChangesPanel } from "./pending-changes-panel";
export { DroppableGuideRow } from "./droppable-guide-row";
export { DndProvider } from "./dnd-provider";

// =============================================================================
// DND TYPES (centralized)
// =============================================================================

export {
  // Drag data types
  type DraggableSegmentData,
  type HopperBookingDragData,
  type ActiveDragData,
  // Drop target types
  type DroppableGuideRowData,
  type DroppableHopperData,
  type DroppableData,
  // State types
  type DragState,
  type DragStartCapture,
  type DndTimelineConfig,
  // Type guards
  isSegmentDrag,
  isHopperBookingDrag,
  isGuideRowDrop,
  isHopperDrop,
  canSegmentBeDragged,
} from "./types";
