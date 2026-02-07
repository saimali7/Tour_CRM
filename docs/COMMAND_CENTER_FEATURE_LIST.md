# Tour Command Center Feature List

## Goal

Ship an operations-grade dispatch experience where operators can assign, adjust, validate, and dispatch without leaving the canvas.

## Shipped (Current)

- Assignment operations:
  - Drag hopper group to guide row.
  - Drag single booking from expanded hopper list.
  - Explicit per-booking `Assign` dropdown (non-drag path).
  - Drag assigned run to another guide (reassign).
  - Drag assigned run to hopper pane (unassign).
- Time adjustment operations:
  - Drag assigned run within the same guide row to reschedule start time (15-minute snap).
  - Keyboard nudge on focused run: `Alt + ArrowLeft` / `Alt + ArrowRight` (15-minute increments).
  - Undo/redo support for time-shift operations.
- Guardrails and feedback:
  - Capacity validation with projected seat preview while dragging.
  - Blocking errors for invalid assignment drops.
  - Read-only lock on past/dispatched days.
  - Live current-time marker on today view.
- Dispatch lifecycle:
  - Warning-driven readiness model.
  - Warning resolution actions.
  - Dispatch confirmation flow and day lock after dispatch.

## Production Gaps (Next Priority)

- Timeline editing depth:
  - Run block resize to adjust duration.
  - Fine-grained time adjust popover with direct HH:MM input.
  - Multi-select move for multiple runs/bookings.
- Situational awareness:
  - Conflict overlays (overlap, late pickup risk, capacity breach risk before drop).
  - Per-guide lane summary chips (remaining seats, next start, idle gap).
  - Filter chips for `unassigned`, `over-capacity`, `needs-review`.
- Speed and control:
  - Quick actions palette on run blocks (reassign, unassign, +15m, -15m).
  - Bulk assign from hopper groups with guide suggestions.
  - Sticky pin for high-priority guides.
- Mobile parity:
  - Mobile lane-level reassignment and time nudging.
  - Better dense mode for hopper list on smaller screens.
- Reliability and observability:
  - Operation telemetry (assignment latency, rollback rate, undo usage).
  - Visual offline/retry states for mutation failures.
  - End-to-end regression suite for dispatch day workflows.

## Definition of Done for UX

- All assignment operations can be completed via mouse and keyboard.
- Every mutation has immediate visual feedback and reversible history where supported.
- No hidden state: warnings, capacity, and dispatch readiness remain visible.
- Mobile and desktop flows reach dispatch without route switching.
- `tsc`, lint, and command center smoke tests pass before release.
