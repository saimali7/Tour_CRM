"use client"

/**
 * Undo System for Command Center
 *
 * Implements the Command Pattern for undo/redo functionality.
 * Each action creates a command with execute and undo functions.
 *
 * Features:
 * - Undo/redo stack with configurable max history
 * - Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
 * - Command descriptions for user feedback
 * - Automatic cleanup of old commands
 */

import { useCallback, useRef, useReducer, useEffect } from "react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"

// =============================================================================
// TYPES
// =============================================================================

interface Command {
  id: string
  type: "assign" | "unassign" | "reassign" | "timeShift"
  description: string
  timestamp: Date
  /** Data needed to undo */
  previousState: {
    bookingId: string
    guideId: string | null
    pickupTime?: string | null
  }
  /** Data needed to redo */
  newState: {
    bookingId: string
    guideId: string | null
    pickupTime?: string | null
  }
}

interface UndoState {
  past: Command[]
  future: Command[]
}

type UndoAction =
  | { type: "EXECUTE"; command: Command }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" }

const MAX_HISTORY = 50

// =============================================================================
// REDUCER
// =============================================================================

function undoReducer(state: UndoState, action: UndoAction): UndoState {
  switch (action.type) {
    case "EXECUTE":
      return {
        past: [...state.past.slice(-MAX_HISTORY + 1), action.command],
        future: [], // Clear redo stack on new action
      }
    case "UNDO": {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        past: state.past.slice(0, -1),
        future: [previous, ...state.future],
      }
    }
    case "REDO": {
      if (state.future.length === 0) return state
      const next = state.future[0]
      if (!next) return state
      return {
        past: [...state.past, next],
        future: state.future.slice(1),
      }
    }
    case "CLEAR":
      return { past: [], future: [] }
    default:
      return state
  }
}

// =============================================================================
// HOOK
// =============================================================================

interface UseUndoSystemOptions {
  /** The date for the dispatch data (for cache invalidation) */
  date: string
  /** Whether to enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean
}

export function useUndoSystem({ date, enableKeyboardShortcuts = true }: UseUndoSystemOptions) {
  const [state, dispatch] = useReducer(undoReducer, { past: [], future: [] })
  const isUndoingRef = useRef(false)

  // tRPC utils for invalidation
  const utils = trpc.useUtils()

  // Mutations
  const assignMutation = trpc.commandCenter.manualAssign.useMutation()
  const unassignMutation = trpc.commandCenter.unassign.useMutation()
  const timeShiftMutation = trpc.commandCenter.timeShift.useMutation()

  const isMutating =
    assignMutation.isPending ||
    unassignMutation.isPending ||
    timeShiftMutation.isPending

  // Invalidate cache
  const invalidateTimeline = useCallback(() => {
    utils.commandCenter.getDispatch.invalidate({ date })
    utils.commandCenter.getGuideTimelines.invalidate({ date })
    utils.commandCenter.getTourRuns.invalidate({ date })
  }, [utils, date])

  // ==========================================================================
  // COMMAND EXECUTION
  // ==========================================================================

  /**
   * Execute a command and add it to the undo stack
   */
  const executeCommand = useCallback(async (command: Command) => {
    try {
      const { newState } = command

      if (newState.guideId === null) {
        // Unassign
        await unassignMutation.mutateAsync({ bookingId: newState.bookingId })
      } else if (command.type === "timeShift" && newState.pickupTime) {
        // Time shift
        await timeShiftMutation.mutateAsync({
          bookingId: newState.bookingId,
          guideId: newState.guideId,
          newStartTime: newState.pickupTime,
        })
      } else {
        // Assign or reassign
        await assignMutation.mutateAsync({
          bookingId: newState.bookingId,
          guideId: newState.guideId,
        })
      }

      invalidateTimeline()

      // Only add to undo stack if not currently undoing/redoing
      if (!isUndoingRef.current) {
        dispatch({ type: "EXECUTE", command })
      }

      return true
    } catch (error) {
      toast.error("Action failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      return false
    }
  }, [assignMutation, unassignMutation, timeShiftMutation, invalidateTimeline])

  /**
   * Undo the last command
   */
  const undo = useCallback(async () => {
    const lastCommand = state.past[state.past.length - 1]
    if (!lastCommand || isMutating) return false

    isUndoingRef.current = true
    try {
      const { previousState } = lastCommand

      if (previousState.guideId === null) {
        // Was unassigned - unassign again
        await unassignMutation.mutateAsync({ bookingId: previousState.bookingId })
      } else if (lastCommand.type === "timeShift" && previousState.pickupTime) {
        // Time shift - restore previous time
        await timeShiftMutation.mutateAsync({
          bookingId: previousState.bookingId,
          guideId: previousState.guideId,
          newStartTime: previousState.pickupTime,
        })
      } else {
        // Was assigned - assign to previous guide
        await assignMutation.mutateAsync({
          bookingId: previousState.bookingId,
          guideId: previousState.guideId,
        })
      }

      invalidateTimeline()
      dispatch({ type: "UNDO" })
      toast.info("Undone", { description: lastCommand.description })
      return true
    } catch (error) {
      toast.error("Undo failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      return false
    } finally {
      isUndoingRef.current = false
    }
  }, [state.past, isMutating, assignMutation, unassignMutation, timeShiftMutation, invalidateTimeline])

  /**
   * Redo the last undone command
   */
  const redo = useCallback(async () => {
    const nextCommand = state.future[0]
    if (!nextCommand || isMutating) return false

    isUndoingRef.current = true
    try {
      const { newState } = nextCommand

      if (newState.guideId === null) {
        await unassignMutation.mutateAsync({ bookingId: newState.bookingId })
      } else if (nextCommand.type === "timeShift" && newState.pickupTime) {
        await timeShiftMutation.mutateAsync({
          bookingId: newState.bookingId,
          guideId: newState.guideId,
          newStartTime: newState.pickupTime,
        })
      } else {
        await assignMutation.mutateAsync({
          bookingId: newState.bookingId,
          guideId: newState.guideId,
        })
      }

      invalidateTimeline()
      dispatch({ type: "REDO" })
      toast.info("Redone", { description: nextCommand.description })
      return true
    } catch (error) {
      toast.error("Redo failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      return false
    } finally {
      isUndoingRef.current = false
    }
  }, [state.future, isMutating, assignMutation, unassignMutation, timeShiftMutation, invalidateTimeline])

  // ==========================================================================
  // COMMAND CREATORS
  // ==========================================================================

  /**
   * Assign a booking to a guide
   */
  const assignBooking = useCallback(async (
    bookingId: string,
    guideId: string,
    guideName: string,
    previousGuideId: string | null = null,
    previousGuideName: string | null = null
  ) => {
    const command: Command = {
      id: crypto.randomUUID(),
      type: previousGuideId ? "reassign" : "assign",
      description: previousGuideId
        ? `Moved booking from ${previousGuideName} to ${guideName}`
        : `Assigned booking to ${guideName}`,
      timestamp: new Date(),
      previousState: {
        bookingId,
        guideId: previousGuideId,
      },
      newState: {
        bookingId,
        guideId,
      },
    }

    const success = await executeCommand(command)
    if (success && !isUndoingRef.current) {
      toast.success(command.description)
    }
    return success
  }, [executeCommand])

  /**
   * Unassign a booking from a guide
   */
  const unassignBooking = useCallback(async (
    bookingId: string,
    previousGuideId: string,
    previousGuideName: string
  ) => {
    const command: Command = {
      id: crypto.randomUUID(),
      type: "unassign",
      description: `Unassigned booking from ${previousGuideName}`,
      timestamp: new Date(),
      previousState: {
        bookingId,
        guideId: previousGuideId,
      },
      newState: {
        bookingId,
        guideId: null,
      },
    }

    const success = await executeCommand(command)
    if (success && !isUndoingRef.current) {
      toast.success(command.description)
    }
    return success
  }, [executeCommand])

  /**
   * Shift a booking's pickup time
   */
  const timeShiftBooking = useCallback(async (
    bookingId: string,
    guideId: string,
    newTime: string,
    previousTime: string
  ) => {
    const command: Command = {
      id: crypto.randomUUID(),
      type: "timeShift",
      description: `Changed pickup time from ${previousTime} to ${newTime}`,
      timestamp: new Date(),
      previousState: {
        bookingId,
        guideId,
        pickupTime: previousTime,
      },
      newState: {
        bookingId,
        guideId,
        pickupTime: newTime,
      },
    }

    const success = await executeCommand(command)
    if (success && !isUndoingRef.current) {
      toast.success(command.description)
    }
    return success
  }, [executeCommand])

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z or Ctrl+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Cmd+Shift+Z or Ctrl+Shift+Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      // Cmd+Y or Ctrl+Y for redo (Windows convention)
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableKeyboardShortcuts, undo, redo])

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    canUndo: state.past.length > 0 && !isMutating,
    canRedo: state.future.length > 0 && !isMutating,
    undoCount: state.past.length,
    redoCount: state.future.length,
    isMutating,

    // Actions
    undo,
    redo,
    clearHistory: () => dispatch({ type: "CLEAR" }),

    // Command creators (with undo support)
    assignBooking,
    unassignBooking,
    timeShiftBooking,

    // Last action description (for UI)
    lastActionDescription: state.past[state.past.length - 1]?.description ?? null,
  }
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type UndoSystem = ReturnType<typeof useUndoSystem>
