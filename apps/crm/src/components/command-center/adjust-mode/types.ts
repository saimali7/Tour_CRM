/**
 * DnD Types for Command Center Adjust Mode
 *
 * Centralized type definitions for drag-and-drop operations,
 * shared across DndProvider, DroppableGuideRow, and segment components.
 */

import type { HopperBooking } from "../hopper/hopper-card";

// =============================================================================
// SEGMENT DRAG DATA
// =============================================================================

/**
 * Data attached to draggable timeline segments
 */
export interface DraggableSegmentData {
  type: "segment";
  /** Unique segment ID */
  segmentId: string;
  /** Guide this segment belongs to */
  guideId: string;
  /** Tour run ID for this segment */
  tourRunId: string;
  /** Type of segment (pickup, tour, drive, idle) */
  segmentType: "pickup" | "tour" | "drive" | "idle";
  /** Booking IDs associated with this segment */
  bookingIds?: string[];
  /** Segment start time in HH:MM format */
  startTime?: string;
  /** Segment end time in HH:MM format */
  endTime?: string;
  /** Duration in minutes */
  durationMinutes?: number;
  /** Guest count for capacity validation */
  guestCount?: number;
}

// =============================================================================
// HOPPER DRAG DATA
// =============================================================================

/**
 * Data attached to draggable hopper bookings
 */
export interface HopperBookingDragData {
  type: "hopper-booking";
  booking: HopperBooking;
}

// =============================================================================
// DROPPABLE DATA
// =============================================================================

/**
 * Data attached to droppable guide rows
 */
export interface DroppableGuideRowData {
  type: "guide-row";
  /** Guide ID this row represents */
  guideId: string;
  /** Guide name for display */
  guideName: string;
  /** Vehicle capacity for validation */
  vehicleCapacity: number;
  /** Index in the timelines array */
  timelineIndex: number;
}

/**
 * Data for hopper drop target
 */
export interface DroppableHopperData {
  type: "hopper";
}

// =============================================================================
// COMPOSITE TYPES
// =============================================================================

/**
 * Union of all drag source data types
 */
export type ActiveDragData = DraggableSegmentData | HopperBookingDragData;

/**
 * Union of all drop target data types
 */
export type DroppableData = DroppableGuideRowData | DroppableHopperData;

// =============================================================================
// DRAG STATE
// =============================================================================

/**
 * Current drag operation state
 */
export interface DragState {
  /** ID of the dragged element */
  activeId: string;
  /** Data from the dragged element */
  data: ActiveDragData;
  /** Target time being hovered (HH:MM) */
  targetTime?: string;
  /** Formatted target time for display (e.g., "10:15 AM") */
  targetDisplayTime?: string;
}

/**
 * Initial position capture for time shift calculations
 */
export interface DragStartCapture {
  /** Initial client X position */
  clientX: number;
  /** Original segment start time */
  segmentStartTime?: string;
  /** Original segment end time */
  segmentEndTime?: string;
  /** Segment duration in minutes */
  durationMinutes?: number;
}

// =============================================================================
// TIMELINE CONFIG
// =============================================================================

/**
 * Timeline configuration for DnD operations
 */
export interface DndTimelineConfig {
  /** Start hour of timeline (e.g., 7 for 7 AM) */
  startHour: number;
  /** End hour of timeline (e.g., 20 for 8 PM) */
  endHour: number;
  /** Snap interval in minutes (default: 15) */
  snapMinutes?: number;
  /** Width of guide info column in pixels (default: 200) */
  guideColumnWidth?: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if drag data is from a segment
 */
export function isSegmentDrag(data: ActiveDragData): data is DraggableSegmentData {
  return data.type === "segment";
}

/**
 * Check if drag data is from a hopper booking
 */
export function isHopperBookingDrag(data: ActiveDragData): data is HopperBookingDragData {
  return data.type === "hopper-booking";
}

/**
 * Check if drop data is a guide row
 */
export function isGuideRowDrop(data: DroppableData): data is DroppableGuideRowData {
  return data.type === "guide-row";
}

/**
 * Check if drop data is the hopper
 */
export function isHopperDrop(data: DroppableData): data is DroppableHopperData {
  return data.type === "hopper";
}

/**
 * Check if a segment type can be dragged
 */
export function canSegmentBeDragged(segmentType: string): boolean {
  return segmentType === "pickup" || segmentType === "tour";
}
