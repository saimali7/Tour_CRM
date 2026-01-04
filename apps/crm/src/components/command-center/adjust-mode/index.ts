/**
 * Adjust Mode Components for Tour Command Center
 *
 * This module provides drag-and-drop guide reassignment functionality.
 *
 * Usage:
 * 1. Wrap your command center with AdjustModeProvider, GhostPreviewProvider, and DndProvider
 * 2. Use AdjustModeToggle to enter/exit adjust mode
 * 3. Wrap segments with DraggableSegment
 * 4. Wrap guide rows with DroppableGuideRow
 * 5. Use useGhostPreview in MapPanel to show drag feedback
 *
 * @example
 * ```tsx
 * <AdjustModeProvider>
 *   <GhostPreviewProvider>
 *     <DndProvider onBookingAssign={handleAssign}>
 *       <AdjustModeToggle onApplyChanges={handleApply} />
 *       <DroppableGuideRow guideId={guide.id}>
 *         <DraggableSegment id={segment.id} guideId={guide.id}>
 *           <SegmentContent />
 *         </DraggableSegment>
 *       </DroppableGuideRow>
 *       <MapPanel />
 *     </DndProvider>
 *   </GhostPreviewProvider>
 * </AdjustModeProvider>
 * ```
 */

// Context and hook
export {
  AdjustModeProvider,
  useAdjustMode,
  type PendingChange,
  type PendingAssignChange,
  type PendingReassignChange,
  type PendingTimeShiftChange,
  type PendingChangesSummary,
} from "./adjust-mode-context";

// Pending changes panel
export { PendingChangesPanel } from "./pending-changes-panel";

// Ghost preview context for map panel feedback
export {
  GhostPreviewProvider,
  useGhostPreview,
  calculateEfficiency,
  estimateDriveTimeImpact,
  type GhostPreviewData,
  type EfficiencyRating,
} from "./ghost-preview-context";

// Toggle button
export { AdjustModeToggle } from "./adjust-mode-toggle";

// Drag and drop components
export {
  DraggableSegment,
  type DraggableSegmentData,
} from "./draggable-segment";

export {
  DroppableGuideRow,
  type DroppableGuideRowData,
} from "./droppable-guide-row";

export { DndProvider } from "./dnd-provider";
