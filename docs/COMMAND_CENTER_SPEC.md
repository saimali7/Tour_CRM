# Tour Command Center Product Spec

## 1. Purpose

The Tour Command Center is the daily dispatch surface for tour operators.
Its job is to let an operator organize the day quickly, assign every booking to a guide, resolve risks, and send dispatch with confidence.

Primary outcome:
- A dispatcher can move from "day starts messy" to "day dispatched and locked" in minutes with no ambiguity.

## 2. User Roles

- Dispatch Lead: owns final assignment quality and dispatch send.
- Operations Manager: audits warnings, resolves conflicts, and monitors readiness.
- Guide Coordinator: performs manual assignment and reassignment.

## 3. Core Entities

- `Booking`: customer reservation with guest count, pickup context, and constraints.
- `Tour Run`: one scheduled run (`tour + date + time`) containing one or more bookings.
- `Hopper Group`: unassigned bookings grouped by run, except charter bookings which are single-item groups.
- `Guide Row`: one guide with vehicle capacity, utilization, and assigned run blocks.
- `Warning`: unresolved issue preventing dispatch readiness.

## 4. Screen Architecture

Top to bottom:
1. `Command Strip`: date controls, health state, key stats, and primary action.
2. `Warnings Panel`: collapsed by default, expanded for guided resolution.
3. `Dispatch Canvas`: hopper + guide timeline.
4. `Detail Sheets`: guest and guide drill-down.

Desktop:
- Left pane: hopper (`320px`).
- Right pane: timeline canvas (fluid).

Mobile:
- Main canvas remains the timeline.
- Hopper entry point is a bottom sheet with explicit assign flow.

## 5. Interaction Model

### 5.1 Day navigation

- `Left/Right` day controls move to previous or next date.
- `Today` button jumps to current date.
- Keyboard shortcuts:
  - `ArrowLeft`: previous day
  - `ArrowRight`: next day
  - `T`: today
  - `?`: open shortcuts help

### 5.2 Assignment flow (desktop)

- User can drag an unassigned group from hopper to a guide row.
- User can drag a single booking from expanded hopper group to a guide row.
- User can use per-booking `Assign` select in hopper as keyboard/mouse alternative to drag.
- User can drag an assigned run block from one guide row to another (reassign).
- User can drag an assigned run block from guide row back into hopper pane (unassign).

### 5.3 Assignment validation

- Every drop or explicit assignment performs capacity pre-check:
  - projected guests for target guide must be `<= vehicleCapacity`.
- Invalid assignment is blocked with descriptive error feedback.
- During drag-over, target row shows projected capacity preview.

### 5.4 Edit controls and history

- Edit mode toggle gates all mutation interactions.
- Read-only mode applies to:
  - past dates
  - dispatched dates
- Undo/redo are available in edit mode and operate on server-backed change operations.
- `Escape` cancels active drag interaction.

### 5.5 Warning and dispatch flow

- Warnings panel exposes actionable resolutions (quick assign, add external, skip/cancel).
- Dispatch is blocked while unresolved warnings exist.
- Once dispatch succeeds:
  - status becomes dispatched
  - day locks to read-only
  - manifest access becomes primary right-side action

## 6. Canvas Behavior Contract

- Time axis is `06:00` through `24:00`.
- Hour markers are always visible in sticky header.
- Current-time indicator is shown only for current day.
- Guide lane structure:
  - fixed identity column
  - time-grid track
  - absolute positioned run blocks
- Run blocks:
  - minimum visual width to preserve click target readability
  - confidence-based semantic styling (`optimal`, `good`, `review`, `problem`)

## 7. Data and API Contract

Read model:
- `commandCenter.getDispatch({ date })`
- Required to return:
  - day status metadata
  - warnings
  - guide timelines
  - tour runs with bookings

Write model:
- `commandCenter.batchApplyChanges({ date, changes })`
  - operation types: `assign`, `reassign`, `unassign`
- `commandCenter.optimize({ date })`
- `commandCenter.resolveWarning({ date, warningId, resolution })`
- `commandCenter.dispatch({ date })`

Operational requirement:
- every UI mutation must be represented as explicit operation payload with inverse operation for undo.

## 8. State Model

Status states:
- `pending`: initial state, unassigned runs likely present.
- `optimized`: optimized but may still contain warnings.
- `ready`: no unresolved warnings, dispatch allowed.
- `dispatched`: locked read-only.

View overlays:
- loading skeleton state
- empty day state
- error state
- read-only banner state

## 9. Accessibility Requirements

- Every interactive control must be keyboard focusable.
- Minimum touch target size `44px` on mobile actions.
- Live region announcements for success/failure updates.
- Non-drag assignment path must exist (explicit assign select/sheet action).
- Focus-visible outlines must remain enabled across custom controls.

## 10. Reliability and Performance

Performance targets:
- initial paint under `1.5s` on warm session for typical day payload.
- mutation feedback under `150ms` for optimistic UI response.
- scroll and drag interactions must stay at `>= 50fps` on modern laptops.

Reliability targets:
- no silent mutation failures.
- all failed operations surface actionable toast and preserve recoverable state.
- stale data must invalidate after successful mutation.

## 11. Analytics and Operational Metrics

Track per day:
- time to dispatch
- unresolved warning count over time
- number of manual reassign operations
- post-dispatch edit attempts (should trend toward zero)
- capacity exceed attempts blocked

## 12. Test Plan

Functional scenarios:
1. assign hopper group to guide row (success).
2. assign single booking via dropdown (success).
3. blocked assignment when capacity exceeded.
4. reassign run from Guide A to Guide B.
5. unassign run back to hopper.
6. undo and redo mutation sequence integrity.
7. warning resolution updates readiness.
8. dispatch blocked with warnings.
9. dispatch success locks day and enables manifest links.
10. mobile sheet assignment flow from open to confirmation.

State scenarios:
1. no guides available.
2. no unassigned bookings.
3. service error from `getDispatch`.
4. mutation failure from `batchApplyChanges`.
5. past date read-only mode.

## 13. Production Readiness Checklist

- `tsc --noEmit` clean in `@tour/crm`.
- no unused legacy modules under command-center path.
- command-center barrel exports only active production modules.
- keyboard shortcuts verified against existing global bindings.
- drag and non-drag assignment paths both validated.
- warning-to-ready-to-dispatched transition tested end-to-end.
- data model fields required by cards/sheets are present (`total`, `currency`, pickup context, status).

## 14. Explicit Product Decisions

- No `v2` split surface. This is the production command center.
- Dispatch is not allowed when unresolved warnings exist.
- Bulk group assignment is supported via drag.
- Single-booking assignment is supported via drag and explicit assign control.
- Simulation mode is out of scope for current production release.
