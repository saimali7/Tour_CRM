# Guide Assignment Feature: Path to Perfection

> Making guide assignment so good that tour operators can't imagine working without it.

## Current State Assessment

The guide assignment feature has solid foundations:
- ✅ Three-panel layout (hopper, timeline, map)
- ✅ Drag-and-drop with visual feedback
- ✅ Optimization algorithm
- ✅ Warning system with suggestions
- ✅ Mobile hopper sheet

But to be **world-class**, we need to address critical gaps.

---

## The Vision

A tour operator should be able to:
1. **Open dispatch at 6 AM** → See today's bookings organized by tour/time
2. **Click "Auto-Assign"** → Smart algorithm assigns 90% of bookings optimally
3. **Review warnings** → Handle edge cases with one-click resolutions
4. **Make manual tweaks** → Drag-drop with real-time validation and undo
5. **Dispatch in 30 seconds** → Guides notified with full route details
6. **Handle day-of changes** → Reassign on the fly without breaking routes

---

## Critical Fixes (Ship Blockers)

### 1. Double-Assignment Prevention

**Problem:** User can drag same booking twice, creating conflicting assignments.

**Solution:**
```typescript
// In adjust-mode-context.tsx
function addPendingChange(change: Omit<PendingChange, "id" | "timestamp">) {
  // Check for duplicate booking assignment
  if (change.type === "assign") {
    const existingAssign = pendingChanges.find(
      c => c.type === "assign" && c.bookingId === change.bookingId
    );
    if (existingAssign) {
      toast.warning("Booking already assigned", {
        description: "Remove existing assignment first"
      });
      return;
    }
  }
  // ... rest of function
}
```

### 2. Guide Availability Revalidation

**Problem:** Guide availability can change between drag and apply.

**Solution:**
```typescript
// In applyReassignments mutation handler
async function applyReassignments({ date, changes }) {
  // Step 1: Revalidate all target guides
  const guideIds = [...new Set(changes.map(c => c.toGuideId))];
  const availability = await guideAvailabilityService.checkBulk(guideIds, date);

  const unavailable = availability.filter(a => !a.isAvailable);
  if (unavailable.length > 0) {
    throw new ConflictError(
      `Guides no longer available: ${unavailable.map(a => a.guideName).join(", ")}`
    );
  }

  // Step 2: Check time conflicts for each assignment
  for (const change of changes) {
    const conflicts = await checkTimeConflicts(change.toGuideId, change.bookingId);
    if (conflicts.length > 0) {
      throw new ConflictError(`Time conflict detected for ${change.toGuideId}`);
    }
  }

  // Step 3: Apply all changes in transaction
  return db.transaction(async (tx) => {
    // ... apply changes
  });
}
```

### 3. Transaction Rollback for Batch Changes

**Problem:** Partial apply leaves inconsistent state.

**Solution:** Wrap all changes in database transaction (see above).

### 4. Time Conflict Detection with Drive Time

**Problem:** Adjacent tours without drive time buffer are allowed.

**Solution:**
```typescript
// Add drive time margin to conflict check
const DRIVE_TIME_BUFFER_MINUTES = 15; // Minimum drive time between tours

function hasTimeConflict(existingTour, newTour) {
  const existingEnd = addMinutes(existingTour.endTime, DRIVE_TIME_BUFFER_MINUTES);
  const newStart = newTour.startTime;

  // Conflict if new tour starts before existing tour + buffer ends
  return newStart < existingEnd && newTour.endTime > existingTour.startTime;
}
```

---

## High-Impact UX Improvements

### 5. Pending Changes Summary Panel

**Problem:** Users can't review changes before applying.

**Design:**
```
┌─────────────────────────────────────┐
│ 📋 Pending Changes (3)        [Apply] │
├─────────────────────────────────────┤
│ ✓ John Smith (4 guests) → Ahmed      │ [×]
│ ✓ Sarah Jones (2 guests) → Mohammed  │ [×]
│ ✓ Reassign: Marina pickup → Khalid   │ [×]
├─────────────────────────────────────┤
│ Impact: +12 min drive time           │
│ Capacity: All guides within limits   │
└─────────────────────────────────────┘
```

**Implementation:**
- New component: `PendingChangesPanel`
- Shows in adjust mode instead of (or alongside) warnings
- Each change has individual remove button
- Shows aggregate impact calculation

### 6. Real-Time Capacity Validation During Drag

**Problem:** User doesn't know if drop will exceed capacity until after.

**Solution:**
```typescript
// In DroppableGuideRow, show capacity status during drag
const capacityStatus = useMemo(() => {
  if (!isOver || !activeData) return null;

  const guestCount = activeData.type === "hopper-booking"
    ? activeData.booking.guestCount
    : 0;

  const newTotal = currentGuests + guestCount;
  const utilization = (newTotal / vehicleCapacity) * 100;

  if (newTotal > vehicleCapacity) return "over";
  if (utilization > 90) return "warning";
  return "ok";
}, [isOver, activeData, currentGuests, vehicleCapacity]);

// Visual feedback
{capacityStatus === "over" && (
  <Badge variant="destructive" className="absolute top-2 right-2">
    Over Capacity!
  </Badge>
)}
```

### 7. Undo/Redo Stack

**Problem:** No way to undo individual changes.

**Solution:**
```typescript
// In adjust-mode-context.tsx
interface AdjustModeState {
  pendingChanges: PendingChange[];
  undoStack: PendingChange[][]; // Previous states
  redoStack: PendingChange[][]; // Future states
}

function undo() {
  if (undoStack.length === 0) return;

  const previousState = undoStack.pop();
  redoStack.push([...pendingChanges]);
  setPendingChanges(previousState);

  toast.info("Change undone");
}

function redo() {
  if (redoStack.length === 0) return;

  const nextState = redoStack.pop();
  undoStack.push([...pendingChanges]);
  setPendingChanges(nextState);

  toast.info("Change redone");
}

// Keyboard shortcuts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

### 8. Smart Auto-Assign Button

**Problem:** Optimize button exists but isn't prominent or smart enough.

**Design:**
```
┌────────────────────────────────────────┐
│ [🪄 Auto-Assign 12 Bookings]           │
│                                        │
│ Preview:                               │
│ • Ahmed: 3 pickups (Marina zone)       │
│ • Mohammed: 2 pickups (Downtown)       │
│ • Khalid: 4 pickups (JBR area)         │
│ • 3 bookings need manual assignment    │
│                                        │
│ [Cancel]              [Apply Suggestions] │
└────────────────────────────────────────┘
```

**Algorithm Improvements:**
```typescript
// Enhanced scoring function
function scoreGuideForBooking(guide, booking, existingAssignments) {
  let score = 100;

  // Zone proximity (most important)
  const zoneMatch = guide.preferredZones?.includes(booking.pickupZone?.id);
  if (zoneMatch) score += 50;

  // Existing pickups in same zone (efficiency)
  const sameZonePickups = existingAssignments.filter(
    a => a.pickupZone?.id === booking.pickupZone?.id
  );
  score += sameZonePickups.length * 20; // Cluster same-zone pickups

  // Capacity utilization (prefer balanced load)
  const newUtilization = (guide.currentGuests + booking.guestCount) / guide.vehicleCapacity;
  if (newUtilization > 1) score -= 100; // Hard penalty for over-capacity
  else if (newUtilization > 0.9) score -= 20; // Soft penalty for near-capacity
  else if (newUtilization > 0.7) score += 10; // Reward good utilization

  // Workload balance (penalize overworked guides)
  score -= guide.assignedTours * 15;

  // Time conflict check (hard constraint)
  if (hasTimeConflict(guide, booking)) score = -Infinity;

  // VIP handling (dedicated guide preference)
  if (booking.isVIP && guide.vipRating >= 4) score += 30;

  // First-timer handling (experienced guide preference)
  if (booking.isFirstTimer && guide.experienceYears >= 2) score += 15;

  return score;
}
```

---

## Data Model Improvements

### 9. Per-Booking Guide Assignment (Canonical via `guide_assignments`)

**Current:** `guide_assignments` is the source of truth (1:1 booking → guide) for dispatch.
**Note:** `bookings.assignedGuideId` exists for legacy/simple flows, but is **deprecated for Command Center dispatch**.

**Guideline:**
- Use `guide_assignments` + `pickup_assignments` for all dispatch/timeline operations.
- Avoid reading `bookings.assignedGuideId` in Command Center logic.

### 10. Drive Time Estimation Table

**Current:** Hardcoded estimates
**Needed:** Zone-to-zone travel time matrix

**Schema:**
```typescript
export const zoneTravelTimes = pgTable("zone_travel_times", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  fromZoneId: uuid("from_zone_id").references(() => pickupZones.id),
  toZoneId: uuid("to_zone_id").references(() => pickupZones.id),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  trafficFactor: decimal("traffic_factor").default("1.0"), // Rush hour multiplier
});
```

**Usage:**
```typescript
async function getDriveTime(fromZone, toZone, departureTime) {
  const base = await db.query.zoneTravelTimes.findFirst({
    where: and(
      eq(zoneTravelTimes.fromZoneId, fromZone),
      eq(zoneTravelTimes.toZoneId, toZone)
    )
  });

  const isRushHour = isWithinRushHour(departureTime);
  return base.estimatedMinutes * (isRushHour ? base.trafficFactor : 1);
}
```

---

## Visual Polish

### 11. Enhanced Timeline Segments

**Current:** Basic colored blocks
**Improved:** Rich information density

```
┌──────────────────────────────────────────────┐
│ 🚐 Ahmed (6 seats) • 4/6 guests • 67% util   │
├──────────────────────────────────────────────┤
│ [🏠Marina]──[🚗15m]──[🎯Tour 2h]──[idle]     │
│  John 4p     drive    Desert      free       │
│  09:00      09:15     09:30-11:30  11:30+   │
└──────────────────────────────────────────────┘
```

**Segment Enhancements:**
- Pickup: Show customer name + guest count prominently
- Drive: Show estimated minutes + route
- Tour: Show tour name + total guests
- Idle: Show available time window

### 12. Capacity Visualization

**Current:** Small progress bar in guide info
**Improved:** Prominent visual indicator

```typescript
// In GuideRow
<div className="relative">
  {/* Capacity meter */}
  <div
    className={cn(
      "absolute -left-1 top-0 bottom-0 w-1 rounded-full",
      utilization < 50 && "bg-emerald-500",
      utilization >= 50 && utilization < 80 && "bg-blue-500",
      utilization >= 80 && utilization < 100 && "bg-amber-500",
      utilization >= 100 && "bg-red-500 animate-pulse"
    )}
  />
  {/* Rest of row content */}
</div>
```

### 13. Zone Color Coding

**Current:** Zones have colors but inconsistently applied
**Improved:** Consistent zone theming throughout

```typescript
// Zone colors applied to:
// - Hopper cards (left border)
// - Pickup segments (background)
// - Map panel zones
// - Drop preview highlights

const zoneTheme = {
  marina: { bg: "bg-teal-500", border: "border-teal-500", text: "text-teal-700" },
  downtown: { bg: "bg-orange-500", border: "border-orange-500", text: "text-orange-700" },
  // ...
};
```

---

## Keyboard Navigation & Accessibility

### 14. Full Keyboard Support

```
Shortcuts:
├── Navigation
│   ├── ← → : Previous/Next day
│   ├── T : Jump to today
│   ├── Tab : Move between panels
│   └── ↑ ↓ : Navigate within panel
│
├── Actions
│   ├── A : Auto-assign all
│   ├── O : Run optimization
│   ├── D : Dispatch (with confirmation)
│   ├── E : Enter adjust mode
│   └── Esc : Exit adjust mode / Cancel
│
├── Selection
│   ├── Space : Select booking/segment
│   ├── Enter : Confirm action
│   └── 1-9 : Quick assign to guide N
│
└── Undo/Redo
    ├── Cmd+Z : Undo
    └── Cmd+Shift+Z : Redo
```

### 15. Screen Reader Support

```typescript
// Announce changes
const { announce } = useLiveAnnouncer();

// On assignment
announce(`${customerName} assigned to ${guideName}. ${guideName} now has ${newTotal} of ${capacity} guests.`);

// On conflict
announce(`Warning: ${guideName} is over capacity. ${excess} guests over limit.`);
```

---

## Implementation Phases

### Phase 1: Critical Fixes (This Sprint)
- [ ] Double-assignment prevention
- [ ] Guide availability revalidation
- [ ] Transaction rollback for batch changes
- [ ] Time conflict with drive buffer

### Phase 2: UX Improvements (Next Sprint)
- [ ] Pending changes summary panel
- [ ] Real-time capacity validation during drag
- [ ] Undo/redo stack with keyboard shortcuts
- [ ] Enhanced auto-assign preview

### Phase 3: Data Model (Following Sprint)
- [ ] Per-booking guide assignment
- [ ] Zone travel time matrix
- [ ] Guide preferences schema

### Phase 4: Visual Polish
- [ ] Enhanced timeline segments
- [ ] Capacity visualization improvements
- [ ] Consistent zone theming
- [ ] Animation polish

### Phase 5: Power Features
- [ ] Batch operations (multi-select)
- [ ] Booking split functionality
- [ ] Offline support with sync
- [ ] Real-time collaboration

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to dispatch (avg) | ~5 min | < 1 min |
| Manual assignments needed | ~40% | < 10% |
| Over-capacity errors | ~5/day | 0 |
| User satisfaction (NPS) | Unknown | > 50 |

---

## Conclusion

The guide assignment feature is the **heart** of this CRM. Getting it right means:
- Tour operators save hours every morning
- Fewer mistakes = happier guides and guests
- Better routes = lower fuel costs
- Faster day-of changes = better service recovery

Every improvement here directly impacts the operator's daily experience. This is where we win or lose the customer.
