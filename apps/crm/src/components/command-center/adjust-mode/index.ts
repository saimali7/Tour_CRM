/**
 * Adjust Mode Components for Tour Command Center
 *
 * This module provides drag-and-drop guide reassignment functionality.
 *
 * Usage:
 * 1. Wrap your command center with AdjustModeProvider and DndProvider
 * 2. Use AdjustModeToggle to enter/exit adjust mode
 * 3. Wrap segments with DraggableSegment
 * 4. Wrap guide rows with DroppableGuideRow
 *
 * @example
 * ```tsx
 * <AdjustModeProvider>
 *   <DndProvider>
 *     <AdjustModeToggle onApplyChanges={handleApply} />
 *     <DroppableGuideRow guideId={guide.id}>
 *       <DraggableSegment id={segment.id} guideId={guide.id}>
 *         <SegmentContent />
 *       </DraggableSegment>
 *     </DroppableGuideRow>
 *   </DndProvider>
 * </AdjustModeProvider>
 * ```
 */

// Context and hook
export {
  AdjustModeProvider,
  useAdjustMode,
  type PendingChange,
} from "./adjust-mode-context";

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
