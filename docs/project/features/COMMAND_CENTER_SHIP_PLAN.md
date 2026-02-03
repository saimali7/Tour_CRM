# Command Center: Production Ship Plan

**Goal:** Make the Command Center the single, trusted, ops‑grade surface where an operator can visually organize the day, resolve issues fast, and dispatch with confidence.

**North Star:** Open at 6:00 AM → see a fully understandable day in <10 seconds → resolve issues in <2 minutes → dispatch with one click.

**This doc is the execution plan we will follow until completion.**  
Use it as the source of truth for scope, sequencing, and Definition of Done.

---

## Scope

**In scope**
- Command Center core workflow (tour runs → assignments → warnings → dispatch)
- Guide assignment integrity and timeline fidelity (drive + pickup + tour)
- Dispatch status persistence + locked state after dispatch
- Auto‑assignment that produces reliable, reviewable results
- Production safety rails and operational correctness

**Out of scope (for this ship)**
- Map panel v2
- Live location tracking
- External partner integrations
- Mobile guide PWA improvements

---

## Current State (Summary)

**Working**
- Command Center page and simplified timeline UI
- Drag/drop assignments + undo/redo
- Basic optimization (greedy)
- Warnings panel + quick resolve actions
- Dispatch notifications (email) via Inngest

**Missing / insufficient**
- Timeline lacks pickup + drive segments (not truly ops‑grade)
- Dispatch status is in memory (not persisted)
- `pickup_assignments` exists but not used
- Travel matrix returns empty (no real drive time)
- Advanced optimizer exists but isn’t wired
- Day is not locked after dispatch
- Warning resolution is shallow, not fully enforced

---

## Definition of Done (Production Readiness)

**Functional**
- Timeline shows **drive → pickup → tour** segments for all assigned guides.
- Unassigned bookings are visible and resolvable.
- Warnings are actionable and **must be resolved** before dispatch.
- Dispatch state is persisted and survives refresh/deploy.
- Dispatch locks the day (no assignment edits without explicit override).

**Data Integrity**
- `guide_assignments` is the source of truth for assignments.
- `pickup_assignments` stores pickup order, times, and drive minutes.
- No double‑assignment or orphaned pickup records.

**UX**
- Operator can understand the day at a glance.
- Errors are clear and reversible.
- UI remains usable with 50+ bookings.

**Engineering**
- `pnpm typecheck` and `pnpm build` pass.
- Key flows covered by manual QA checklist below.

---

## Milestones & Tasks

### Milestone 1: Persistence + Source of Truth (Blocker)
**Outcome:** Command Center state survives refresh and is consistent.

**Tasks**
- [x] Implement `dispatch_status` table access in services (replace in‑memory cache).
  - Files: `packages/services/src/command-center-service.ts`
  - Add service read/write/update
- [x] Ensure dispatch status is updated on optimize/dispatch/resolveWarning.
- [x] Clarify assignment source of truth:
  - Keep `guide_assignments` canonical.
  - Document `bookings.assignedGuideId` as deprecated for dispatch (or remove usage).

**DoD**
- Refreshing the page preserves dispatch status and warnings.

---

### Milestone 2: Pickup Assignments + Real Timeline (Blocker)
**Outcome:** Timeline reflects the real operational day.

**Tasks**
- [x] Create `pickup-assignment-service.ts` to manage `pickup_assignments`.
- [x] Update optimization output to persist pickup order + pickup time + drive minutes.
- [x] Update `CommandCenterService.getGuideTimelines()` to use:
  - `pickup_assignments` for pickup segments
  - `guide_assignments` for tour segments
  - computed drive segments between pickups/tour start
- [x] Ensure timeline uses pickup time vs tour start for segment placement.

**DoD**
- Timeline shows idle, drive, pickup, and tour segments.
- Pickup order is stable and persisted.

---

### Milestone 3: Real Optimization + Travel Matrix
**Outcome:** Auto‑assignment yields efficient, reviewable results.

**Tasks**
- [x] Wire `packages/services/src/optimization/dispatch-optimizer.ts` into `CommandCenterService.optimize()`.
- [x] Implement travel matrix building from `zone_travel_times`.
  - Files: `packages/services/src/optimization/travel-matrix.ts`
- [x] Ensure optimizer outputs drive time + pickup time values.

**DoD**
- Optimization output includes drive/pickup times and efficiency score.
- Warnings reflect real constraint violations (capacity, conflicts, unqualified).

---

### Milestone 4: UX & Safety Rails
**Outcome:** A clear, reliable workflow operators trust.

**Tasks**
- [x] Lock dispatch day after dispatch (readonly UI + server guard).
- [x] Warning resolution gates dispatch (cannot dispatch with unresolved warnings).
- [x] Improve warning actions to always have a concrete resolution.
- [x] Add explicit “Ready to Dispatch” state and “Dispatched” banner.
- [x] Ensure drag/drop respects capacity and conflicts in real‑time.

**DoD**
- Operators cannot accidentally modify a dispatched day.
- Warnings are always resolved before dispatch.

---

### Milestone 5: Production QA + Performance
**Outcome:** Safe to ship in production.

**Tasks**
- [ ] Load test: 50–100 bookings, 10–15 guides.
- [ ] Validate no N+1 queries in Command Center data fetch.
- [ ] Run smoke tests for:
  - optimization
  - manual assignment
  - warning resolution
  - dispatch
- [ ] Update docs + progress tracking.

**DoD**
- `pnpm build` + `pnpm typecheck` pass.
- Manual QA checklist (below) passes.

---

## Manual QA Checklist (Required)

1. **Basic Load**
   - Open Command Center for today.
   - Status + timeline render without errors.

2. **Optimize**
   - Click Optimize.
   - Warnings appear if necessary.
   - Efficiency score updates.

3. **Assignments**
   - Drag booking from hopper to guide.
   - Assignment appears immediately.
   - Undo works.

4. **Warnings**
   - Resolve warning via suggestion.
   - Warning disappears, timeline updates.

5. **Dispatch**
   - Attempt dispatch with warnings → blocked.
   - Resolve warnings → dispatch succeeds.
   - Day becomes locked.

6. **Persistence**
   - Refresh page → dispatch status + assignments persist.

---

## Open Decisions (Track Here)

- **Single source of truth:** Keep `guide_assignments` canonical, use `pickup_assignments` for ordering and routing.
- **Dispatch status storage:** Use `dispatch_status` table.
- **Conflict buffer:** Minimum drive time buffer between tours (default 15 minutes).

---

## Progress Tracking

- [x] Milestone 1: Persistence + Source of Truth
- [x] Milestone 2: Pickup Assignments + Real Timeline
- [x] Milestone 3: Real Optimization + Travel Matrix
- [x] Milestone 4: UX & Safety Rails
- [ ] Milestone 5: Production QA + Performance

---

## Notes

This doc is the execution contract. We will update it as tasks complete and keep it aligned with production readiness.
