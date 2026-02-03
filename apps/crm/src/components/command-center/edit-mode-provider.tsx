"use client"

/**
 * EditModeProvider
 *
 * The SINGLE source of truth for all edit mode state.
 * Replaces multiple contexts (AdjustModeContext, GhostPreviewContext, LiveAssignmentContext)
 * with one unified context.
 *
 * Design principles:
 * 1. No pending state - all mutations are instant
 * 2. No ghost previews - show real drop indicators instead
 * 3. Simple drag state - just track what's being dragged
 * 4. React Query handles the actual data
 *
 * Phase 3 Enhancements:
 * - Undo/redo system with Cmd+Z support
 * - Keyboard shortcut handling
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import type { BookingData } from "./booking-block"
import { useUndoSystem, type UndoSystem } from "./use-undo-system"

// =============================================================================
// TYPES
// =============================================================================

interface DragState {
  /** The booking being dragged */
  booking: BookingData
  /** Original guide ID (null if from hopper) */
  sourceGuideId: string | null
}

interface EditModeContextValue {
  /** Whether edit mode is currently active */
  isEditing: boolean

  /** Toggle edit mode on/off */
  setIsEditing: (value: boolean) => void

  /** Current drag state (null if not dragging) */
  dragState: DragState | null

  /** Currently selected booking ID */
  selectedBookingId: string | null

  /** Set the selected booking */
  setSelectedBookingId: (id: string | null) => void

  // Drag handlers
  startDrag: (booking: BookingData, sourceGuideId: string | null) => void
  endDrag: () => void

  // Mutation handlers (with undo support)
  assignBooking: (bookingId: string, guideId: string) => Promise<void>
  unassignBooking: (bookingId: string, sourceGuideId?: string) => Promise<void>
  reassignBooking: (bookingId: string, newGuideId: string) => Promise<void>
  timeShiftBooking: (bookingId: string, guideId: string, newTime: string, previousTime?: string | null) => Promise<void>

  // Group assignment (for SmartHopper)
  assignBookingGroup: (bookingIds: string[], guideId: string) => Promise<void>

  /** Whether a mutation is in progress */
  isMutating: boolean

  // Undo system
  canUndo: boolean
  canRedo: boolean
  undo: () => Promise<boolean>
  redo: () => Promise<boolean>
}

// =============================================================================
// CONTEXT
// =============================================================================

const EditModeContext = createContext<EditModeContextValue | null>(null)

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error("useEditMode must be used within EditModeProvider")
  }
  return context
}

// Also export a hook that returns undefined if not in context (for optional use)
export function useEditModeOptional() {
  return useContext(EditModeContext)
}

// =============================================================================
// PROVIDER
// =============================================================================

interface EditModeProviderProps {
  children: ReactNode
  /** The date this timeline is showing (for cache invalidation) */
  date: string
}

export function EditModeProvider({ children, date }: EditModeProviderProps) {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Selection state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Undo system (handles all mutations)
  const undoSystem = useUndoSystem({
    date,
    enableKeyboardShortcuts: isEditing, // Only enable when in edit mode
  })

  // ==========================================================================
  // DRAG HANDLERS
  // ==========================================================================

  const startDrag = useCallback((booking: BookingData, sourceGuideId: string | null) => {
    setDragState({ booking, sourceGuideId })
  }, [])

  const endDrag = useCallback(() => {
    setDragState(null)
  }, [])

  // ==========================================================================
  // MUTATION HANDLERS (Delegated to undo system)
  // ==========================================================================

  const assignBooking = useCallback(async (bookingId: string, guideId: string) => {
    // Get guide name from drag state if available
    const previousGuideId = dragState?.sourceGuideId ?? null
    const guideName = "guide" // We'll need to pass guide info through drag state

    await undoSystem.assignBooking(
      bookingId,
      guideId,
      guideName,
      previousGuideId,
      previousGuideId ? "previous guide" : null
    )
  }, [undoSystem, dragState])

  const unassignBooking = useCallback(async (bookingId: string, sourceGuideId?: string) => {
    // Get previous guide from parameter or drag state
    const previousGuideId = sourceGuideId ?? dragState?.sourceGuideId
    if (!previousGuideId) {
      // Can't unassign without knowing the previous guide
      toast.error("Cannot determine previous assignment")
      return
    }

    await undoSystem.unassignBooking(bookingId, previousGuideId, "guide")
  }, [undoSystem, dragState])

  const reassignBooking = useCallback(async (bookingId: string, newGuideId: string) => {
    const previousGuideId = dragState?.sourceGuideId ?? null

    await undoSystem.assignBooking(
      bookingId,
      newGuideId,
      "new guide",
      previousGuideId,
      previousGuideId ? "previous guide" : null
    )
  }, [undoSystem, dragState])

  const timeShiftBooking = useCallback(async (
    bookingId: string,
    guideId: string,
    newTime: string,
    previousTime?: string | null
  ) => {
    // Use provided previousTime, or fall back to drag state (which may be null if already cleared)
    const prevTime = previousTime ?? dragState?.booking?.pickupTime ?? "00:00"

    await undoSystem.timeShiftBooking(bookingId, guideId, newTime, prevTime)
  }, [undoSystem, dragState])

  // Group assignment - assign multiple bookings at once
  const assignBookingGroup = useCallback(async (
    bookingIds: string[],
    guideId: string
  ) => {
    if (bookingIds.length === 0) return

    // Assign all bookings in sequence
    // Note: Each assignment creates its own undo entry
    for (const bookingId of bookingIds) {
      await undoSystem.assignBooking(
        bookingId,
        guideId,
        "guide", // TODO: Pass actual guide name
        null, // From hopper (no previous guide)
        null
      )
    }

    toast.success(`Assigned ${bookingIds.length} booking${bookingIds.length > 1 ? 's' : ''}`)
  }, [undoSystem])

  // ==========================================================================
  // KEYBOARD SHORTCUTS (Escape to cancel drag)
  // ==========================================================================

  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel drag
      if (e.key === "Escape" && dragState) {
        e.preventDefault()
        endDrag()
        toast.info("Drag cancelled")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isEditing, dragState, endDrag])

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const value = useMemo<EditModeContextValue>(() => ({
    isEditing,
    setIsEditing,
    dragState,
    selectedBookingId,
    setSelectedBookingId,
    startDrag,
    endDrag,
    assignBooking,
    unassignBooking,
    reassignBooking,
    timeShiftBooking,
    assignBookingGroup,
    isMutating: undoSystem.isMutating,
    canUndo: undoSystem.canUndo,
    canRedo: undoSystem.canRedo,
    undo: undoSystem.undo,
    redo: undoSystem.redo,
  }), [
    isEditing,
    dragState,
    selectedBookingId,
    startDrag,
    endDrag,
    assignBooking,
    unassignBooking,
    reassignBooking,
    timeShiftBooking,
    assignBookingGroup,
    undoSystem,
  ])

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  )
}

// =============================================================================
// EDIT MODE TOGGLE COMPONENT
// =============================================================================

interface EditModeToggleProps {
  /** Whether the date is in the past (disables editing) */
  isPastDate?: boolean
  /** Whether the timeline is read-only (e.g. dispatched) */
  isReadOnly?: boolean
}

export function EditModeToggle({ isPastDate = false, isReadOnly = false }: EditModeToggleProps) {
  const { isEditing, setIsEditing, isMutating, canUndo, canRedo, undo, redo } = useEditMode()

  if (isPastDate || isReadOnly) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-1 bg-muted/50 rounded flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" />
        {isPastDate ? "Past dates cannot be edited" : "Dispatched - read only"}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Undo/Redo buttons (only show in edit mode) */}
      {isEditing && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => undo()}
            disabled={!canUndo || isMutating}
            className="p-1.5 rounded-md text-sm transition-colors bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo || isMutating}
            className="p-1.5 rounded-md text-sm transition-colors bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        disabled={isMutating}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-colors
          ${isEditing
            ? "bg-primary text-primary-foreground"
            : "bg-muted hover:bg-muted/80"
          }
          ${isMutating ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isMutating ? "Saving..." : isEditing ? "Done Editing" : "Edit Assignments"}
      </button>
    </div>
  )
}
