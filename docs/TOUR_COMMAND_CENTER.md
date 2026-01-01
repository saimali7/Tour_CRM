# Tour Command Center - Feature Design Document

> **Status:** Planning
> **Priority:** Critical (Core Feature)
> **Estimated Complexity:** High
> **Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Research & Workflows](#3-user-research--workflows)
4. [Solution Architecture](#4-solution-architecture)
5. [Data Model](#5-data-model)
6. [Algorithm Design](#6-algorithm-design)
7. [UI/UX Specification](#7-uiux-specification)
8. [Technical Implementation](#8-technical-implementation)
9. [API Design](#9-api-design)
10. [Testing Strategy](#10-testing-strategy)
11. [Rollout Plan](#11-rollout-plan)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

### What We're Building

The **Tour Command Center** is a daily operations hub that enables tour operators to assign guides to bookings and optimize pickup routes in under 5 minutes, even on busy days with 15+ tours.

### Key Innovation

- **Timeline-based visualization** (Gantt-style) instead of traditional card/list views
- **Ghost preview** showing assignment impact before committing
- **Intelligent auto-assignment** with zone clustering and route optimization
- **Real-time route context** with map visualization

### Business Impact

| Metric | Before | After |
|--------|--------|-------|
| Morning setup time | 30-60 min | <5 min |
| Assignment errors | Common | Rare (system-validated) |
| Route efficiency | Manual guesswork | Optimized automatically |
| Guide utilization | Unbalanced | Balanced by algorithm |

---

## 2. Problem Statement

### The Daily Challenge

Every morning, tour operators face a complex logistics puzzle:

```
Given:
- 15 tours scheduled today
- 47 customers across 23 bookings
- 8 available guides with varying vehicle capacities
- Predefined pickup locations across 5 zones

Solve:
- Which guide handles which bookings?
- In what order should each guide pick up customers?
- What time should each pickup occur?
- How do we minimize total drive time while maximizing vehicle utilization?
```

### Current Pain Points

1. **Time-consuming** - Manual assignment takes 30-60 minutes on busy days
2. **Error-prone** - Easy to exceed vehicle capacity or create inefficient routes
3. **No visibility** - Hard to see the "big picture" of the day's operations
4. **Reactive** - Problems discovered during execution, not planning
5. **Unbalanced workloads** - Some guides overworked, others underutilized

### Constraints We Must Respect

#### Hard Constraints (Must Never Violate)

| Constraint | Description | Validation |
|------------|-------------|------------|
| Guide Qualification | Guide must be certified for tour type | Check `tour_guide_qualifications` |
| Guide Availability | Guide must not be on leave or conflicting tour | Check `guide_availability` + existing assignments |
| Vehicle Capacity | Total passengers ≤ guide's vehicle capacity | Sum passenger counts vs `vehicleCapacity` |
| Private Exclusivity | Private booking = exclusive vehicle | No other bookings with same guide for that tour |
| Time Feasibility | All pickups must complete before tour start | Calculate route duration backwards |

#### Soft Constraints (Optimize For)

| Constraint | Description | Weight |
|------------|-------------|--------|
| Minimize Drive Time | Shorter routes = lower cost, happier customers | High |
| Zone Clustering | Same-zone pickups with same guide | High |
| Vehicle Utilization | Fill seats efficiently | Medium |
| Workload Balance | Distribute tours evenly across guides | Medium |
| Guide Preferences | Respect preferred zones when possible | Low |
| Customer Familiarity | Repeat customers with same guide | Low |

---

## 3. User Research & Workflows

### Primary User: Operations Manager

**Demographics:**
- Uses CRM daily, 6-7 AM start
- Moderate tech comfort
- Values speed over features
- Often interrupted (phone calls, walk-ins)

**Mental Model:**
```
"I have a list of tours. For each tour, I need to figure out
which guides are available and who goes with which guide.
I usually group by pickup area to save time."
```

### The Morning Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  06:00 AM - OPERATOR ARRIVES                                                │
│                                                                             │
│  Step 1: OVERVIEW (30 seconds)                                              │
│  ├─ "What's happening today?"                                               │
│  ├─ How many tours? How many guests?                                        │
│  ├─ Any obvious problems? (no guide, overbooking)                           │
│  └─ Priority: Which tours need attention first?                             │
│                                                                             │
│  Step 2: ASSIGNMENT (3-4 minutes)                                           │
│  ├─ Option A: Auto-assign all, review results                               │
│  └─ Option B: Tour by tour, manual or semi-automatic                        │
│      ├─ Select tour (usually by time - morning first)                       │
│      ├─ See available guides                                                │
│      ├─ See unassigned bookings                                             │
│      ├─ Drag bookings to guides OR click auto-assign                        │
│      ├─ Adjust if needed (reorder, move between guides)                     │
│      └─ Approve and move to next tour                                       │
│                                                                             │
│  Step 3: NOTIFICATION (30 seconds)                                          │
│  ├─ Review approved tours                                                   │
│  ├─ Click "Notify All Guides"                                               │
│  └─ Manifests sent via email/SMS with pickup details                        │
│                                                                             │
│  Step 4: COFFEE ☕                                                           │
│  └─ Done in under 5 minutes                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Cases & Scenarios

#### Scenario 1: Large Group Exceeds Single Vehicle
```
Booking: Al-Hassan Family (8 people)
Largest vehicle: 6 seats

Solution Options:
A) Split across 2 guides (family may not like)
B) Rent larger vehicle (requires advance notice)
C) Contact customer to discuss options

System behavior: Flag for manual review with options
```

#### Scenario 2: Last-Minute Cancellation
```
7:30 AM: Customer cancels
Guide Ahmed now has only 2 passengers (was 6)

System behavior:
- Remove booking from assignment
- Recalculate route and times
- Option: Redistribute to consolidate vehicles
- Notify affected guide of change
```

#### Scenario 3: Guide Calls in Sick
```
6:45 AM: Guide Khalid unavailable
He had 2 tours assigned (9 AM, 2 PM)

System behavior:
- Mark Khalid unavailable
- Show affected tours with "Needs Reassignment" flag
- Suggest redistribution to available guides
- One-click "Reassign Khalid's bookings"
```

#### Scenario 4: Remote Pickup Location
```
One booking pickup is 45 min from others
Adding to any guide creates inefficient route

System behavior:
- Ghost preview shows "+45 min drive"
- Recommendation: "Assign dedicated guide" or "Offer alternate pickup"
- Highlight inefficiency visually on map
```

#### Scenario 5: Overbooking Prevention
```
Guide at 6/6 capacity
User tries to add 2 more passengers

System behavior:
- Prevent drop (visual feedback)
- Show "Exceeds capacity by 2"
- Suggest alternative guides with space
```

---

## 4. Solution Architecture

### Two-Level Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  LEVEL 1: DAY OVERVIEW                                                      │
│  ──────────────────────                                                     │
│  Purpose: See all tours, identify problems, bulk actions                    │
│  URL: /org/[slug]/operations                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  January 15, 2026                                                    │   │
│  │                                                                      │   │
│  │  [15 Tours] [47 Guests] [8 Guides] [3 Need Attention]               │   │
│  │                                                                      │   │
│  │  [🪄 Auto-Assign All]                                                │   │
│  │                                                                      │   │
│  │  MORNING                                                             │   │
│  │  ├─ ⚠️ Desert Safari 9AM     12 guests   3/4 guides   [Open]        │   │
│  │  ├─ ✓  City Tour 10AM         8 guests   2/2 guides   [Open]        │   │
│  │  └─ ✓  Marina Cruise 11AM     6 guests   1/1 guides   [Open]        │   │
│  │                                                                      │   │
│  │  AFTERNOON                                                           │   │
│  │  ├─ ⚠️ Desert Safari 2PM     15 guests   4/5 guides   [Open]        │   │
│  │  └─ ✓  City Tour 3PM          4 guests   1/1 guides   [Open]        │   │
│  │                                                                      │   │
│  │  [Approve All Ready] [Notify All Guides] [Print Day]                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              │ Click "Open"                                 │
│                              ▼                                              │
│                                                                             │
│  LEVEL 2: TOUR ASSIGNMENT                                                   │
│  ────────────────────────────                                               │
│  Purpose: Assign bookings to guides for ONE tour                            │
│  URL: /org/[slug]/operations/[scheduleId]                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ← Back    Desert Safari · 9:00 AM                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────┬─────────────────────────────┬─────────────────┐    │   │
│  │  │  HOPPER     │  GUIDE DISPATCH TIMELINE    │  ROUTE MAP      │    │   │
│  │  │             │                             │                 │    │   │
│  │  │  Unassigned │  07:00  08:00  09:00  10:00 │  [Map Context]  │    │   │
│  │  │  bookings   │                             │                 │    │   │
│  │  │             │  Ahmed ████████████████     │  Shows selected │    │   │
│  │  │  [Drag to   │  Sarah ████████░░░░░░░░     │  guide's route  │    │   │
│  │  │   assign]   │  Khalid ██████░░░░░░░░░     │                 │    │   │
│  │  │             │                             │  + Suggestions  │    │   │
│  │  └─────────────┴─────────────────────────────┴─────────────────┘    │   │
│  │                                                                      │   │
│  │  [Auto-Assign] [Approve Tour] [Notify Guides]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
pages/
  org/[slug]/(dashboard)/
    operations/
      page.tsx                      # Day Overview
      [scheduleId]/
        page.tsx                    # Tour Assignment

components/
  operations/
    # Day Overview Components
    day-overview/
      day-header.tsx                # Date picker, stats
      tour-list.tsx                 # Grouped tour cards
      tour-card.tsx                 # Single tour row
      day-stats.tsx                 # Summary metrics
      bulk-actions.tsx              # Approve all, notify all

    # Tour Assignment Components
    tour-assignment/
      assignment-header.tsx         # Tour info, actions
      booking-hopper.tsx            # Left panel
      booking-card.tsx              # Draggable booking
      guide-timeline.tsx            # Center panel (main)
      guide-row.tsx                 # Single guide's timeline
      timeline-segment.tsx          # Drive/pickup/tour block
      ghost-preview.tsx             # Drag preview overlay
      route-map.tsx                 # Right panel
      route-visualization.tsx       # Map with route lines
      assignment-suggestion.tsx     # AI recommendations

    # Shared Components
    shared/
      zone-badge.tsx                # Color-coded zone
      capacity-bar.tsx              # Visual capacity
      time-display.tsx              # Formatted times
      drag-overlay.tsx              # Custom drag preview
```

### State Management

```typescript
// Tour Assignment State
interface TourAssignmentState {
  // Data
  schedule: Schedule;
  bookings: Booking[];
  guides: GuideWithAssignments[];
  pickupAddresses: PickupAddress[];

  // UI State
  selectedGuideId: string | null;
  draggedBookingId: string | null;
  ghostPreview: GhostPreview | null;

  // Computed
  unassignedBookings: Booking[];
  assignmentsByGuide: Map<string, PickupAssignment[]>;
  routeByGuide: Map<string, RouteInfo>;
}

// Actions
type TourAssignmentAction =
  | { type: 'ASSIGN_BOOKING'; bookingId: string; guideId: string; position?: number }
  | { type: 'UNASSIGN_BOOKING'; bookingId: string }
  | { type: 'REORDER_PICKUP'; guideId: string; fromIndex: number; toIndex: number }
  | { type: 'SET_DRAGGING'; bookingId: string | null }
  | { type: 'SET_GHOST_PREVIEW'; preview: GhostPreview | null }
  | { type: 'SELECT_GUIDE'; guideId: string | null }
  | { type: 'AUTO_ASSIGN_COMPLETE'; assignments: PickupAssignment[] }
  | { type: 'APPROVE_TOUR' }
  | { type: 'RESET' };
```

---

## 5. Data Model

### New Tables

#### `pickup_addresses` - Predefined Pickup Locations

```sql
CREATE TABLE pickup_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Location Info
  name VARCHAR(255) NOT NULL,              -- "Marriott Marina"
  short_name VARCHAR(50),                  -- "Marina Marriott"
  address TEXT NOT NULL,                   -- Full street address
  zone VARCHAR(100),                       -- "Marina", "Downtown", "Palm"

  -- Coordinates (for distance calculation)
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Operational Info
  pickup_instructions TEXT,                -- "Meet at main lobby"
  average_pickup_minutes INTEGER DEFAULT 5,-- Time to complete pickup

  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, name)
);

-- Indexes
CREATE INDEX idx_pickup_addresses_org ON pickup_addresses(organization_id);
CREATE INDEX idx_pickup_addresses_zone ON pickup_addresses(organization_id, zone);
CREATE INDEX idx_pickup_addresses_active ON pickup_addresses(organization_id, is_active);
```

#### `pickup_assignments` - Booking-to-Guide Assignments

```sql
CREATE TABLE pickup_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Relationships
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  guide_assignment_id UUID NOT NULL REFERENCES guide_assignments(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  pickup_address_id UUID REFERENCES pickup_addresses(id),

  -- Pickup Details
  pickup_order INTEGER NOT NULL,           -- 1, 2, 3... sequence
  estimated_pickup_time TIMESTAMP,         -- Calculated pickup time
  actual_pickup_time TIMESTAMP,            -- For day-of tracking
  passenger_count INTEGER NOT NULL,        -- Cached for quick queries

  -- Status
  status VARCHAR(20) DEFAULT 'pending',    -- pending, picked_up, no_show, cancelled

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, schedule_id, booking_id)
);

-- Indexes
CREATE INDEX idx_pickup_assignments_schedule ON pickup_assignments(schedule_id);
CREATE INDEX idx_pickup_assignments_guide ON pickup_assignments(guide_assignment_id);
CREATE INDEX idx_pickup_assignments_booking ON pickup_assignments(booking_id);
CREATE INDEX idx_pickup_assignments_status ON pickup_assignments(organization_id, status);
```

### Table Extensions

#### `guides` - Add Vehicle Info

```sql
ALTER TABLE guides ADD COLUMN vehicle_capacity INTEGER DEFAULT 6;
ALTER TABLE guides ADD COLUMN vehicle_type VARCHAR(50);  -- "SUV", "Van", "Bus"
ALTER TABLE guides ADD COLUMN preferred_zones JSONB;     -- ["Marina", "Downtown"]
ALTER TABLE guides ADD COLUMN max_tours_per_day INTEGER DEFAULT 3;
```

#### `bookings` - Add Pickup Info

```sql
ALTER TABLE bookings ADD COLUMN pickup_address_id UUID REFERENCES pickup_addresses(id);
ALTER TABLE bookings ADD COLUMN is_private BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN pickup_notes TEXT;
```

### Drizzle Schema

```typescript
// packages/database/src/schema/pickup-addresses.ts

import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const pickupAddresses = pgTable('pickup_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),

  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),
  address: text('address').notNull(),
  zone: varchar('zone', { length: 100 }),

  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),

  pickupInstructions: text('pickup_instructions'),
  averagePickupMinutes: integer('average_pickup_minutes').default(5),

  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// packages/database/src/schema/pickup-assignments.ts

import { pgTable, uuid, integer, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { schedules } from './schedules';
import { guideAssignments } from './guide-assignments';
import { bookings } from './bookings';
import { pickupAddresses } from './pickup-addresses';

export const pickupAssignments = pgTable('pickup_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),

  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id),
  guideAssignmentId: uuid('guide_assignment_id').notNull().references(() => guideAssignments.id),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id),
  pickupAddressId: uuid('pickup_address_id').references(() => pickupAddresses.id),

  pickupOrder: integer('pickup_order').notNull(),
  estimatedPickupTime: timestamp('estimated_pickup_time'),
  actualPickupTime: timestamp('actual_pickup_time'),
  passengerCount: integer('passenger_count').notNull(),

  status: varchar('status', { length: 20 }).default('pending'),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │     tours       │       │     guides      │
│─────────────────│       │─────────────────│       │─────────────────│
│ id              │◄──┐   │ id              │       │ id              │
│ name            │   │   │ organizationId  │───┐   │ organizationId  │──┐
│ ...             │   │   │ name            │   │   │ name            │  │
└─────────────────┘   │   │ ...             │   │   │ vehicleCapacity │  │
                      │   └─────────────────┘   │   │ preferredZones  │  │
                      │           │             │   └─────────────────┘  │
                      │           │             │           │            │
                      │           ▼             │           │            │
                      │   ┌─────────────────┐   │           │            │
                      │   │    schedules    │   │           │            │
                      │   │─────────────────│   │           │            │
                      │   │ id              │◄──┼───────────┼────────┐   │
                      │   │ organizationId  │───┤           │        │   │
                      │   │ tourId          │───┘           │        │   │
                      │   │ startsAt        │               │        │   │
                      │   └─────────────────┘               │        │   │
                      │           │                         │        │   │
                      │           │                         ▼        │   │
                      │           │             ┌─────────────────┐  │   │
                      │           │             │guide_assignments│  │   │
                      │           │             │─────────────────│  │   │
                      │           │             │ id              │◄─┼───┼──┐
                      │           │             │ scheduleId      │──┘   │  │
                      │           │             │ guideId         │──────┘  │
                      │           │             │ status          │         │
                      │           │             └─────────────────┘         │
                      │           │                         │               │
                      │           │                         │               │
┌─────────────────┐   │           │                         │               │
│pickup_addresses │   │           │                         │               │
│─────────────────│   │           │                         │               │
│ id              │◄──┼───────────┼─────────────────────────┼───────┐       │
│ organizationId  │───┤           │                         │       │       │
│ name            │   │           │                         │       │       │
│ zone            │   │           │                         │       │       │
│ latitude        │   │           │                         │       │       │
│ longitude       │   │           │                         │       │       │
└─────────────────┘   │           │                         │       │       │
                      │           │                         │       │       │
                      │           ▼                         │       │       │
                      │   ┌─────────────────┐               │       │       │
                      │   │    bookings     │               │       │       │
                      │   │─────────────────│               │       │       │
                      │   │ id              │◄──────────────┼───┐   │       │
                      │   │ organizationId  │───┘           │   │   │       │
                      │   │ scheduleId      │───────────────┘   │   │       │
                      │   │ pickupAddressId │───────────────────┼───┘       │
                      │   │ isPrivate       │                   │           │
                      │   │ participantCount│                   │           │
                      │   └─────────────────┘                   │           │
                      │                                         │           │
                      │                                         │           │
                      │   ┌─────────────────────────────────────┼───────────┘
                      │   │                                     │
                      │   ▼                                     │
                      │   ┌─────────────────┐                   │
                      └───│pickup_assignments│                   │
                          │─────────────────│                   │
                          │ id              │                   │
                          │ organizationId  │                   │
                          │ scheduleId      │                   │
                          │ guideAssignmentId│──────────────────┘
                          │ bookingId       │───────────────────┘
                          │ pickupAddressId │
                          │ pickupOrder     │
                          │ estimatedTime   │
                          │ status          │
                          └─────────────────┘
```

---

## 6. Algorithm Design

### Auto-Assignment Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  AUTO-ASSIGNMENT ALGORITHM                                                  │
│                                                                             │
│  Input: scheduleId (one tour instance)                                      │
│  Output: List of PickupAssignment records                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: GATHER DATA                                                        │
│  ───────────────────                                                        │
│  schedule ← getSchedule(scheduleId)                                         │
│  bookings ← getUnassignedBookings(scheduleId)                               │
│  guides ← getAvailableQualifiedGuides(schedule)                             │
│  addresses ← getPickupAddresses(organizationId)                             │
│                                                                             │
│  STEP 2: SEPARATE BY BOOKING TYPE                                           │
│  ────────────────────────────────                                           │
│  privateBookings ← bookings.filter(b => b.isPrivate)                        │
│  sharedBookings ← bookings.filter(b => !b.isPrivate)                        │
│                                                                             │
│  STEP 3: ASSIGN PRIVATE BOOKINGS (Simple 1:1)                               │
│  ────────────────────────────────────────────                               │
│  FOR each booking IN privateBookings:                                       │
│    guide ← findGuideWithCapacity(guides, booking.passengerCount)            │
│    IF guide EXISTS:                                                         │
│      createAssignment(booking, guide, exclusive=true)                       │
│      guide.availableForShared ← false                                       │
│    ELSE:                                                                    │
│      flagAsUnassignable(booking, "No guide with sufficient capacity")       │
│                                                                             │
│  STEP 4: CLUSTER SHARED BOOKINGS BY ZONE                                    │
│  ───────────────────────────────────────                                    │
│  clusters ← Map<zone, List<Booking>>                                        │
│  FOR each booking IN sharedBookings:                                        │
│    zone ← booking.pickupAddress.zone                                        │
│    clusters[zone].add(booking)                                              │
│                                                                             │
│  // Example result:                                                         │
│  // { "Marina": [booking1, booking4], "Downtown": [booking2, booking3] }    │
│                                                                             │
│  STEP 5: BIN-PACK CLUSTERS INTO VEHICLES                                    │
│  ───────────────────────────────────────                                    │
│  FOR each (zone, zoneBookings) IN clusters:                                 │
│    totalPassengers ← sum(zoneBookings.map(b => b.passengerCount))           │
│                                                                             │
│    // Find best guide for this zone                                         │
│    guide ← findBestGuide(guides, zone, totalPassengers)                     │
│                                                                             │
│    IF guide.capacity >= totalPassengers:                                    │
│      // All fit in one vehicle                                              │
│      FOR each booking IN zoneBookings:                                      │
│        createAssignment(booking, guide)                                     │
│    ELSE:                                                                    │
│      // Need to split across multiple guides                                │
│      binPackBookings(zoneBookings, availableGuides)                         │
│                                                                             │
│  STEP 6: OPTIMIZE PICKUP ORDER (Per Guide)                                  │
│  ─────────────────────────────────────────                                  │
│  FOR each guide IN guidesWithAssignments:                                   │
│    IF guide.assignments.length > 1:                                         │
│      optimizeRoute(guide)  // Nearest-neighbor or 2-opt                     │
│    calculatePickupTimes(guide, schedule.startsAt)                           │
│                                                                             │
│  STEP 7: VALIDATE AND RETURN                                                │
│  ────────────────────────────                                               │
│  validateAllConstraints(assignments)                                        │
│  RETURN {                                                                   │
│    assignments,                                                             │
│    unassigned: bookingsWithNoGuide,                                         │
│    flags: validationWarnings,                                               │
│    stats: { totalDriveTime, utilization, balance }                          │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bin-Packing Algorithm (First-Fit Decreasing)

```typescript
function binPackBookings(
  bookings: Booking[],
  guides: Guide[]
): Assignment[] {
  const assignments: Assignment[] = [];

  // Sort bookings by passenger count (largest first)
  const sorted = [...bookings].sort((a, b) =>
    b.passengerCount - a.passengerCount
  );

  // Track remaining capacity per guide
  const remainingCapacity = new Map<string, number>();
  guides.forEach(g => remainingCapacity.set(g.id, g.vehicleCapacity));

  for (const booking of sorted) {
    // Find first guide with enough capacity
    const guide = guides.find(g =>
      remainingCapacity.get(g.id)! >= booking.passengerCount
    );

    if (guide) {
      assignments.push({ booking, guide });
      remainingCapacity.set(
        guide.id,
        remainingCapacity.get(guide.id)! - booking.passengerCount
      );
    } else {
      // No guide can fit this booking - flag for manual review
      flagAsUnassignable(booking, "Cannot fit in any vehicle");
    }
  }

  return assignments;
}
```

### Route Optimization (Nearest Neighbor)

```typescript
function optimizeRoute(guide: GuideWithAssignments): void {
  const pickups = guide.assignments;
  if (pickups.length <= 1) return;

  const optimized: PickupAssignment[] = [];
  const remaining = new Set(pickups);

  // Start from guide's location (or first pickup arbitrarily)
  let current = pickups[0];
  optimized.push(current);
  remaining.delete(current);

  // Greedily pick nearest unvisited
  while (remaining.size > 0) {
    let nearest: PickupAssignment | null = null;
    let nearestDistance = Infinity;

    for (const pickup of remaining) {
      const distance = calculateDistance(
        current.pickupAddress,
        pickup.pickupAddress
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = pickup;
      }
    }

    if (nearest) {
      optimized.push(nearest);
      remaining.delete(nearest);
      current = nearest;
    }
  }

  // Update pickup order
  optimized.forEach((pickup, index) => {
    pickup.pickupOrder = index + 1;
  });

  guide.assignments = optimized;
}
```

### Pickup Time Calculation (Backwards from Tour Start)

```typescript
function calculatePickupTimes(
  guide: GuideWithAssignments,
  tourStartTime: Date
): void {
  const BUFFER_MINUTES = 5;
  const assignments = guide.assignments.sort((a, b) => a.pickupOrder - b.pickupOrder);

  // Work backwards from tour start
  let currentTime = subMinutes(tourStartTime, BUFFER_MINUTES);

  // Calculate from last pickup to tour start
  const lastPickup = assignments[assignments.length - 1];
  const driveToTour = calculateDriveMinutes(
    lastPickup.pickupAddress,
    guide.schedule.meetingPoint
  );
  currentTime = subMinutes(currentTime, driveToTour);
  lastPickup.estimatedPickupTime = currentTime;

  // Work backwards through remaining pickups
  for (let i = assignments.length - 2; i >= 0; i--) {
    const pickup = assignments[i];
    const nextPickup = assignments[i + 1];

    const driveBetween = calculateDriveMinutes(
      pickup.pickupAddress,
      nextPickup.pickupAddress
    );
    const pickupDuration = pickup.pickupAddress.averagePickupMinutes || 5;

    currentTime = subMinutes(currentTime, driveBetween + pickupDuration);
    pickup.estimatedPickupTime = currentTime;
  }

  // Calculate guide departure time
  const firstPickup = assignments[0];
  const driveToFirst = calculateDriveMinutes(
    guide.startLocation,
    firstPickup.pickupAddress
  );
  guide.departureTime = subMinutes(firstPickup.estimatedPickupTime, driveToFirst);
}
```

### Ghost Preview Calculation

```typescript
interface GhostPreview {
  valid: boolean;
  reason?: string;
  addedDriveMinutes: number;
  newCapacity: { current: number; max: number };
  isEfficient: boolean;
  recommendation?: string;
  newSegments: TimelineSegment[];
}

function calculateGhostPreview(
  guide: GuideWithAssignments,
  booking: Booking,
  dropPosition: number
): GhostPreview {
  // 1. Check capacity
  const newPassengerCount = guide.currentPassengers + booking.passengerCount;
  if (newPassengerCount > guide.vehicleCapacity) {
    return {
      valid: false,
      reason: `Exceeds capacity (${newPassengerCount}/${guide.vehicleCapacity})`,
      addedDriveMinutes: 0,
      newCapacity: { current: newPassengerCount, max: guide.vehicleCapacity },
      isEfficient: false,
      newSegments: [],
    };
  }

  // 2. Calculate current route duration
  const currentDuration = calculateRouteDuration(guide.assignments);

  // 3. Insert booking at position and calculate new duration
  const newAssignments = [...guide.assignments];
  newAssignments.splice(dropPosition, 0, {
    booking,
    pickupOrder: dropPosition + 1,
    pickupAddress: booking.pickupAddress,
    passengerCount: booking.passengerCount,
  });

  // Re-optimize route with new pickup
  optimizeRoute({ assignments: newAssignments });
  const newDuration = calculateRouteDuration(newAssignments);

  // 4. Calculate added time
  const addedDriveMinutes = newDuration - currentDuration;

  // 5. Determine efficiency
  const isEfficient = addedDriveMinutes <= 15; // Threshold: 15 minutes

  // 6. Generate recommendation if inefficient
  let recommendation: string | undefined;
  if (!isEfficient) {
    const betterGuide = findBetterGuide(booking, availableGuides);
    if (betterGuide) {
      recommendation = `Assign to ${betterGuide.name} (+${betterGuide.addedMinutes}m)`;
    }
  }

  // 7. Build preview segments
  const newSegments = buildTimelineSegments(newAssignments, guide.schedule);

  return {
    valid: true,
    addedDriveMinutes,
    newCapacity: { current: newPassengerCount, max: guide.vehicleCapacity },
    isEfficient,
    recommendation,
    newSegments,
  };
}
```

### Distance Calculation

```typescript
// Using Haversine formula for distance between coordinates
function calculateDistance(
  addr1: PickupAddress,
  addr2: PickupAddress
): number {
  const R = 6371; // Earth's radius in km

  const lat1 = toRadians(addr1.latitude);
  const lat2 = toRadians(addr2.latitude);
  const deltaLat = toRadians(addr2.latitude - addr1.latitude);
  const deltaLon = toRadians(addr2.longitude - addr1.longitude);

  const a = Math.sin(deltaLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
}

// Estimate drive time (rough: 30 km/h average in city)
function calculateDriveMinutes(
  addr1: PickupAddress,
  addr2: PickupAddress
): number {
  const distanceKm = calculateDistance(addr1, addr2);
  const averageSpeedKmH = 30; // Conservative city driving
  return Math.ceil((distanceKm / averageSpeedKmH) * 60);
}
```

---

## 7. UI/UX Specification

### Design Principles

1. **One-Click Happy Path** - 80% of days should be: Auto-assign → Review → Approve
2. **Progressive Disclosure** - Start simple, reveal complexity only when needed
3. **Visual Confidence** - Colors, bars, and icons communicate status instantly
4. **Drag-to-Fix** - Direct manipulation is faster than forms
5. **Instant Feedback** - Every action shows immediate result

### Color System

```scss
// Zone Colors (for badges and route lines)
$zone-marina: #3B82F6;      // Blue
$zone-downtown: #F97316;    // Orange
$zone-palm: #8B5CF6;        // Purple
$zone-jbr: #10B981;         // Green
$zone-default: #6B7280;     // Gray

// Status Colors
$status-unassigned: #EF4444; // Red
$status-assigned: #F59E0B;   // Amber
$status-approved: #10B981;   // Green
$status-notified: #3B82F6;   // Blue

// Efficiency Indicators
$efficient: #10B981;         // Green
$inefficient: #EF4444;       // Red
$warning: #F59E0B;           // Amber

// Capacity Bar
$capacity-available: #E5E7EB; // Light gray (empty)
$capacity-filled: #3B82F6;    // Blue (filled)
$capacity-full: #F59E0B;      // Amber (at capacity)
$capacity-over: #EF4444;      // Red (over capacity)
```

### Component Specifications

#### Booking Card (Hopper)

```
┌─────────────────────────────────┐
│                                 │
│  Liam Smith                     │  ← Customer name (semibold)
│  👥 4 passengers                │  ← Passenger count
│                                 │
│  ┌─────────────┐                │
│  │ Marina Zone │                │  ← Zone badge (colored)
│  └─────────────┘                │
│                                 │
│  📍 Marriott Marina             │  ← Pickup location
│                                 │
│  💡 Fits with Ahmed (+12m)      │  ← Smart suggestion (optional)
│                                 │
└─────────────────────────────────┘

States:
- Default: White background, subtle border
- Dragging: Elevated shadow, slight scale
- Hover: Light background tint
- Suggested: Pulsing border highlight
```

#### Timeline Segment

```
DRIVE SEGMENT
┌─────────┐
│  Drive  │  ← Type label
│  15m    │  ← Duration
│         │
│ ─ ─ ─ → │  ← Direction indicator
└─────────┘
Background: Gray-100
Height: Full row height

PICKUP SEGMENT
┌──────────────────┐
│  Pickup A        │  ← Label
│  Marina · 4px    │  ← Zone + passenger count
│  ● ● ● ● ○ ○     │  ← Passenger dots
│  08:00 AM        │  ← Pickup time
└──────────────────┘
Background: Zone color (light tint)
Border-left: Zone color (solid)
Height: Full row height

TOUR SEGMENT
┌──────────────────────────────┐
│  Desert Safari Tour          │
│  3h duration                 │
│  09:30 - 12:30               │
└──────────────────────────────┘
Background: Primary color (green)
Height: Full row height
```

#### Capacity Bar

```
LOW (0-50%):
████░░░░░░░░░░░░░░░░  3/6 seats
     ↑ Blue fill

MEDIUM (51-80%):
████████████░░░░░░░░  5/6 seats
             ↑ Blue fill

FULL (100%):
████████████████████  6/6 seats
↑ Amber fill

OVER (>100%):
████████████████████████  8/6 seats (INVALID)
↑ Red fill + warning icon
```

#### Ghost Preview Overlay

```
VALID + EFFICIENT:
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ✓ Drop here
│ +12m drive                   │
  New: 5/6 seats
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
Border: Green dashed
Background: Green-50

VALID + INEFFICIENT:
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ⚠️ Inefficient
│ +45m drive                   │
  💡 Better: Guide Khalid
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
Border: Amber dashed
Background: Amber-50

INVALID:
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ✕ Cannot drop
│ Exceeds capacity (8/6)       │
│                              │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
Border: Red dashed
Background: Red-50
Cursor: not-allowed
```

### Responsive Behavior

```
DESKTOP (≥1280px):
┌─────────────┬─────────────────────────────┬─────────────────┐
│   HOPPER    │         TIMELINE            │      MAP        │
│   280px     │         flex-1              │     320px       │
└─────────────┴─────────────────────────────┴─────────────────┘

TABLET (768-1279px):
┌─────────────┬─────────────────────────────┐
│   HOPPER    │         TIMELINE            │
│   240px     │         flex-1              │
└─────────────┴─────────────────────────────┘
Map: Hidden (available in modal)

MOBILE (<768px):
┌─────────────────────────────────────────────┐
│  [Hopper ▾]  [Timeline ▾]  [Map ▾]         │  ← Tab switcher
├─────────────────────────────────────────────┤
│                                             │
│  [Active panel content]                     │
│                                             │
└─────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + D` | Open Tour Command Center |
| `⌘ + A` | Auto-assign current tour |
| `⌘ + Enter` | Approve current tour |
| `⌘ + N` | Notify guides |
| `←` / `→` | Navigate between tours |
| `Esc` | Cancel drag / Close modal |
| `⌘ + Z` | Undo last assignment |

### Accessibility

- All interactive elements keyboard-navigable
- ARIA labels for drag-drop regions
- Screen reader announcements for assignment changes
- High contrast mode support
- Focus indicators on all interactive elements

---

## 8. Technical Implementation

### File Structure

```
packages/
  database/
    src/
      schema/
        pickup-addresses.ts        # NEW
        pickup-assignments.ts      # NEW
        guides.ts                  # EXTEND
        bookings.ts                # EXTEND
        index.ts                   # UPDATE exports

  services/
    src/
      pickup-address-service.ts    # NEW
      pickup-assignment-service.ts # NEW
      auto-assignment-service.ts   # NEW
      route-optimization-service.ts # NEW
      daily-operations-service.ts  # NEW
      index.ts                     # UPDATE exports

  validators/
    src/
      pickup-address.ts            # NEW
      pickup-assignment.ts         # NEW
      auto-assignment.ts           # NEW

apps/crm/
  src/
    app/
      org/[slug]/(dashboard)/
        operations/
          page.tsx                 # Day Overview
          loading.tsx
          [scheduleId]/
            page.tsx               # Tour Assignment
            loading.tsx

    server/
      routers/
        operations.ts              # NEW - tRPC router
        pickup-address.ts          # NEW
        pickup-assignment.ts       # NEW

    components/
      operations/
        day-overview/
          index.tsx
          day-header.tsx
          day-stats.tsx
          tour-list.tsx
          tour-card.tsx
          bulk-actions.tsx

        tour-assignment/
          index.tsx
          assignment-header.tsx
          booking-hopper.tsx
          booking-card.tsx
          guide-timeline.tsx
          guide-row.tsx
          timeline-segment.tsx
          ghost-preview.tsx
          route-map.tsx
          suggestion-card.tsx

        shared/
          zone-badge.tsx
          capacity-bar.tsx
          time-display.tsx

    hooks/
      use-tour-assignment.ts       # State management
      use-drag-drop.ts             # DnD logic
      use-ghost-preview.ts         # Preview calculation
      use-route-optimization.ts    # Client-side route calc

    lib/
      route-utils.ts               # Distance/time calculations
      zone-colors.ts               # Zone color mapping
```

### Service Implementations

#### PickupAddressService

```typescript
// packages/services/src/pickup-address-service.ts

export class PickupAddressService extends BaseService {
  async getAll(options?: { zone?: string; activeOnly?: boolean }) {
    const conditions = [eq(pickupAddresses.organizationId, this.organizationId)];

    if (options?.zone) {
      conditions.push(eq(pickupAddresses.zone, options.zone));
    }
    if (options?.activeOnly !== false) {
      conditions.push(eq(pickupAddresses.isActive, true));
    }

    return this.db.query.pickupAddresses.findMany({
      where: and(...conditions),
      orderBy: [asc(pickupAddresses.zone), asc(pickupAddresses.sortOrder)],
    });
  }

  async getById(id: string) {
    return this.db.query.pickupAddresses.findFirst({
      where: and(
        eq(pickupAddresses.id, id),
        eq(pickupAddresses.organizationId, this.organizationId)
      ),
    });
  }

  async create(input: CreatePickupAddressInput) {
    const [address] = await this.db.insert(pickupAddresses).values({
      ...input,
      organizationId: this.organizationId,
    }).returning();
    return address;
  }

  async update(id: string, input: UpdatePickupAddressInput) {
    const [address] = await this.db.update(pickupAddresses)
      .set({ ...input, updatedAt: new Date() })
      .where(and(
        eq(pickupAddresses.id, id),
        eq(pickupAddresses.organizationId, this.organizationId)
      ))
      .returning();
    return address;
  }

  async getZones() {
    const result = await this.db.selectDistinct({ zone: pickupAddresses.zone })
      .from(pickupAddresses)
      .where(and(
        eq(pickupAddresses.organizationId, this.organizationId),
        eq(pickupAddresses.isActive, true),
        isNotNull(pickupAddresses.zone)
      ));
    return result.map(r => r.zone).filter(Boolean);
  }
}
```

#### DailyOperationsService

```typescript
// packages/services/src/daily-operations-service.ts

export class DailyOperationsService extends BaseService {
  async getDayOverview(date: Date) {
    const startOfDay = startOfDayFn(date);
    const endOfDay = endOfDayFn(date);

    // Get all schedules for the day
    const daySchedules = await this.db.query.schedules.findMany({
      where: and(
        eq(schedules.organizationId, this.organizationId),
        gte(schedules.startsAt, startOfDay),
        lte(schedules.startsAt, endOfDay),
        ne(schedules.status, 'cancelled')
      ),
      with: {
        tour: true,
        bookings: {
          where: ne(bookings.status, 'cancelled'),
          with: {
            pickupAddress: true,
          },
        },
        guideAssignments: {
          with: {
            guide: true,
            pickupAssignments: true,
          },
        },
      },
      orderBy: asc(schedules.startsAt),
    });

    // Calculate stats
    const stats = {
      totalTours: daySchedules.length,
      totalGuests: daySchedules.reduce((sum, s) =>
        sum + s.bookings.reduce((bSum, b) => bSum + b.participantCount, 0), 0
      ),
      totalGuides: new Set(
        daySchedules.flatMap(s => s.guideAssignments.map(ga => ga.guideId))
      ).size,
      needsAttention: daySchedules.filter(s =>
        s.bookings.some(b => !this.isBookingAssigned(b, s.guideAssignments))
      ).length,
    };

    // Group by time period
    const grouped = this.groupByTimePeriod(daySchedules);

    return { date, stats, schedules: daySchedules, grouped };
  }

  async getTourAssignmentData(scheduleId: string) {
    const schedule = await this.db.query.schedules.findFirst({
      where: and(
        eq(schedules.id, scheduleId),
        eq(schedules.organizationId, this.organizationId)
      ),
      with: {
        tour: true,
        bookings: {
          where: ne(bookings.status, 'cancelled'),
          with: {
            pickupAddress: true,
            customer: true,
          },
        },
        guideAssignments: {
          with: {
            guide: true,
            pickupAssignments: {
              with: {
                booking: true,
                pickupAddress: true,
              },
              orderBy: asc(pickupAssignments.pickupOrder),
            },
          },
        },
      },
    });

    if (!schedule) throw new Error('Schedule not found');

    // Get available guides for this tour
    const availableGuides = await this.getAvailableGuides(schedule);

    // Separate assigned and unassigned bookings
    const assignedBookingIds = new Set(
      schedule.guideAssignments.flatMap(ga =>
        ga.pickupAssignments.map(pa => pa.bookingId)
      )
    );

    const unassignedBookings = schedule.bookings.filter(
      b => !assignedBookingIds.has(b.id)
    );

    return {
      schedule,
      unassignedBookings,
      guideAssignments: schedule.guideAssignments,
      availableGuides,
    };
  }

  private async getAvailableGuides(schedule: Schedule) {
    // Get qualified guides
    const qualifiedGuides = await this.db.query.tourGuideQualifications.findMany({
      where: eq(tourGuideQualifications.tourId, schedule.tourId),
      with: { guide: true },
    });

    // Filter by availability
    const availableGuides = [];
    for (const { guide } of qualifiedGuides) {
      const isAvailable = await this.checkGuideAvailability(guide.id, schedule);
      if (isAvailable) {
        availableGuides.push(guide);
      }
    }

    return availableGuides;
  }

  private groupByTimePeriod(schedules: Schedule[]) {
    return {
      morning: schedules.filter(s => getHours(s.startsAt) < 12),
      afternoon: schedules.filter(s => getHours(s.startsAt) >= 12 && getHours(s.startsAt) < 17),
      evening: schedules.filter(s => getHours(s.startsAt) >= 17),
    };
  }
}
```

#### AutoAssignmentService

```typescript
// packages/services/src/auto-assignment-service.ts

export class AutoAssignmentService extends BaseService {
  async autoAssignTour(scheduleId: string): Promise<AutoAssignResult> {
    const data = await this.ctx.services.dailyOperations.getTourAssignmentData(scheduleId);
    const { schedule, unassignedBookings, availableGuides } = data;

    if (unassignedBookings.length === 0) {
      return { success: true, assigned: 0, unassigned: 0, flags: [] };
    }

    const assignments: PickupAssignmentInsert[] = [];
    const flags: AssignmentFlag[] = [];

    // Separate private vs shared
    const privateBookings = unassignedBookings.filter(b => b.isPrivate);
    const sharedBookings = unassignedBookings.filter(b => !b.isPrivate);

    // Track guide capacity
    const guideCapacity = new Map<string, number>();
    const guideAssignmentMap = new Map<string, string>(); // guideId -> guideAssignmentId

    for (const guide of availableGuides) {
      guideCapacity.set(guide.id, guide.vehicleCapacity);

      // Get or create guide assignment for this schedule
      let guideAssignment = data.guideAssignments.find(ga => ga.guideId === guide.id);
      if (!guideAssignment) {
        guideAssignment = await this.createGuideAssignment(scheduleId, guide.id);
      }
      guideAssignmentMap.set(guide.id, guideAssignment.id);

      // Subtract already assigned passengers
      const assignedPassengers = guideAssignment.pickupAssignments.reduce(
        (sum, pa) => sum + pa.passengerCount, 0
      );
      guideCapacity.set(guide.id, guide.vehicleCapacity - assignedPassengers);
    }

    // 1. Assign private bookings
    for (const booking of privateBookings) {
      const guide = this.findGuideWithCapacity(availableGuides, guideCapacity, booking.participantCount);

      if (guide) {
        assignments.push({
          organizationId: this.organizationId,
          scheduleId,
          guideAssignmentId: guideAssignmentMap.get(guide.id)!,
          bookingId: booking.id,
          pickupAddressId: booking.pickupAddressId,
          pickupOrder: 1,
          passengerCount: booking.participantCount,
          status: 'pending',
        });
        guideCapacity.set(guide.id, 0); // Private = exclusive
      } else {
        flags.push({
          bookingId: booking.id,
          type: 'no_capacity',
          message: `No guide available for private booking (${booking.participantCount} passengers)`,
        });
      }
    }

    // 2. Cluster shared bookings by zone
    const clusters = this.clusterByZone(sharedBookings);

    // 3. Assign clusters
    for (const [zone, zoneBookings] of clusters) {
      const result = this.assignZoneCluster(
        zoneBookings,
        availableGuides,
        guideCapacity,
        guideAssignmentMap,
        scheduleId,
        zone
      );
      assignments.push(...result.assignments);
      flags.push(...result.flags);
    }

    // 4. Save assignments
    if (assignments.length > 0) {
      await this.db.insert(pickupAssignments).values(assignments);
    }

    // 5. Optimize routes and calculate times
    for (const guideId of guideAssignmentMap.keys()) {
      await this.optimizeGuideRoute(guideAssignmentMap.get(guideId)!, schedule.startsAt);
    }

    return {
      success: flags.length === 0,
      assigned: assignments.length,
      unassigned: flags.length,
      flags,
    };
  }

  async autoAssignDay(date: Date): Promise<DayAssignResult> {
    const dayData = await this.ctx.services.dailyOperations.getDayOverview(date);
    const results: TourAssignResult[] = [];

    for (const schedule of dayData.schedules) {
      const result = await this.autoAssignTour(schedule.id);
      results.push({ scheduleId: schedule.id, ...result });
    }

    return {
      date,
      totalTours: dayData.stats.totalTours,
      fullyAssigned: results.filter(r => r.unassigned === 0).length,
      needsAttention: results.filter(r => r.unassigned > 0).length,
      results,
    };
  }

  private clusterByZone(bookings: Booking[]): Map<string, Booking[]> {
    const clusters = new Map<string, Booking[]>();

    for (const booking of bookings) {
      const zone = booking.pickupAddress?.zone || 'unknown';
      if (!clusters.has(zone)) clusters.set(zone, []);
      clusters.get(zone)!.push(booking);
    }

    return clusters;
  }

  private findGuideWithCapacity(
    guides: Guide[],
    capacityMap: Map<string, number>,
    needed: number
  ): Guide | null {
    return guides.find(g => capacityMap.get(g.id)! >= needed) || null;
  }

  private async optimizeGuideRoute(guideAssignmentId: string, tourStartTime: Date) {
    const guideAssignment = await this.db.query.guideAssignments.findFirst({
      where: eq(guideAssignments.id, guideAssignmentId),
      with: {
        pickupAssignments: {
          with: { pickupAddress: true },
        },
        guide: true,
      },
    });

    if (!guideAssignment || guideAssignment.pickupAssignments.length <= 1) return;

    // Optimize order using nearest neighbor
    const optimizedOrder = this.nearestNeighborRoute(guideAssignment.pickupAssignments);

    // Calculate pickup times (backwards from tour start)
    const times = this.calculatePickupTimes(optimizedOrder, tourStartTime);

    // Update assignments
    for (let i = 0; i < optimizedOrder.length; i++) {
      await this.db.update(pickupAssignments)
        .set({
          pickupOrder: i + 1,
          estimatedPickupTime: times[i],
          updatedAt: new Date(),
        })
        .where(eq(pickupAssignments.id, optimizedOrder[i].id));
    }
  }
}
```

### tRPC Router

```typescript
// apps/crm/src/server/routers/operations.ts

export const operationsRouter = router({
  // Day Overview
  getDayOverview: orgProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.dailyOperations.getDayOverview(input.date);
    }),

  // Tour Assignment Data
  getTourAssignment: orgProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.dailyOperations.getTourAssignmentData(input.scheduleId);
    }),

  // Auto-assign single tour
  autoAssignTour: adminProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.autoAssignment.autoAssignTour(input.scheduleId);
    }),

  // Auto-assign entire day
  autoAssignDay: adminProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.autoAssignment.autoAssignDay(input.date);
    }),

  // Manual assignment
  assignBooking: adminProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
      guideAssignmentId: z.string().uuid(),
      bookingId: z.string().uuid(),
      position: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.pickupAssignment.assign(input);
    }),

  // Unassign booking
  unassignBooking: adminProcedure
    .input(z.object({ pickupAssignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.pickupAssignment.unassign(input.pickupAssignmentId);
    }),

  // Reorder pickups
  reorderPickups: adminProcedure
    .input(z.object({
      guideAssignmentId: z.string().uuid(),
      pickupOrder: z.array(z.string().uuid()), // Ordered pickup assignment IDs
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.pickupAssignment.reorder(input);
    }),

  // Calculate ghost preview
  calculateGhostPreview: orgProcedure
    .input(z.object({
      guideAssignmentId: z.string().uuid(),
      bookingId: z.string().uuid(),
      position: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.services.pickupAssignment.calculateGhostPreview(input);
    }),

  // Approve tour
  approveTour: adminProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.pickupAssignment.approveTour(input.scheduleId);
    }),

  // Notify guides
  notifyGuides: adminProcedure
    .input(z.object({
      scheduleIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Trigger Inngest job to send notifications
      await inngest.send({
        name: 'operations/notify-guides',
        data: {
          organizationId: ctx.organizationId,
          scheduleIds: input.scheduleIds,
        },
      });
      return { success: true };
    }),

  // Add guide to tour
  addGuideToTour: adminProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
      guideId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guideAssignment.create({
        scheduleId: input.scheduleId,
        guideId: input.guideId,
        status: 'pending',
      });
    }),
});
```

---

## 9. API Design

### REST Endpoints (for external integrations)

```
GET  /api/v1/operations/:date
     Returns day overview for date

GET  /api/v1/operations/:date/schedules/:scheduleId
     Returns tour assignment data

POST /api/v1/operations/:date/auto-assign
     Triggers auto-assignment for entire day

POST /api/v1/operations/schedules/:scheduleId/auto-assign
     Triggers auto-assignment for single tour

POST /api/v1/operations/schedules/:scheduleId/assignments
     Creates manual assignment

DELETE /api/v1/operations/assignments/:assignmentId
     Removes assignment

PUT /api/v1/operations/schedules/:scheduleId/approve
     Approves tour assignments

POST /api/v1/operations/notify
     Notifies guides (body: { scheduleIds: string[] })
```

### Webhook Events (via Inngest)

```typescript
// New events for operations
type OperationsEvents = {
  'operations/auto-assigned': {
    organizationId: string;
    date: string;
    results: DayAssignResult;
  };

  'operations/tour-approved': {
    organizationId: string;
    scheduleId: string;
    assignments: PickupAssignment[];
  };

  'operations/notify-guides': {
    organizationId: string;
    scheduleIds: string[];
  };

  'operations/assignment-changed': {
    organizationId: string;
    scheduleId: string;
    bookingId: string;
    previousGuideId: string | null;
    newGuideId: string | null;
  };
};
```

---

## 10. Testing Strategy

### Unit Tests

```typescript
// Auto-assignment algorithm
describe('AutoAssignmentService', () => {
  describe('autoAssignTour', () => {
    it('assigns private bookings to dedicated guides');
    it('clusters shared bookings by zone');
    it('respects vehicle capacity limits');
    it('flags bookings when no capacity available');
    it('optimizes pickup order within each guide');
    it('calculates correct pickup times');
  });

  describe('clusterByZone', () => {
    it('groups bookings by pickup zone');
    it('handles bookings without zone');
  });

  describe('nearestNeighborRoute', () => {
    it('produces shorter routes than random order');
    it('handles single pickup');
    it('handles empty pickup list');
  });
});

// Ghost preview calculation
describe('GhostPreview', () => {
  it('returns invalid when exceeds capacity');
  it('calculates correct added drive time');
  it('marks efficient when under threshold');
  it('suggests better guide when inefficient');
});
```

### Integration Tests

```typescript
describe('Operations Flow', () => {
  it('creates day overview with correct stats');
  it('auto-assigns entire day successfully');
  it('allows manual drag-drop assignment');
  it('recalculates route on reorder');
  it('approves and locks assignments');
  it('sends notifications to guides');
});
```

### E2E Tests

```typescript
describe('Tour Command Center', () => {
  it('displays day overview with all tours');
  it('opens tour assignment view');
  it('shows ghost preview on drag');
  it('prevents drop on over-capacity guide');
  it('updates timeline after assignment');
  it('bulk approves and notifies');
});
```

---

## 11. Rollout Plan

### Phase 1: Foundation (Week 1)
- [ ] Database schema (pickup_addresses, pickup_assignments)
- [ ] Schema extensions (guides.vehicleCapacity, bookings.pickupAddressId)
- [ ] Run migrations
- [ ] Create seed data for testing

### Phase 2: Services (Week 1-2)
- [ ] PickupAddressService
- [ ] PickupAssignmentService
- [ ] DailyOperationsService
- [ ] AutoAssignmentService
- [ ] RouteOptimizationService (basic)

### Phase 3: API Layer (Week 2)
- [ ] tRPC router (operations.ts)
- [ ] Validators
- [ ] Unit tests

### Phase 4: Day Overview UI (Week 2-3)
- [ ] Page layout
- [ ] Day stats
- [ ] Tour list with status
- [ ] Bulk actions

### Phase 5: Tour Assignment UI (Week 3-4)
- [ ] Three-panel layout
- [ ] Booking hopper
- [ ] Guide timeline (basic)
- [ ] Timeline segments

### Phase 6: Drag & Drop (Week 4)
- [ ] @dnd-kit integration
- [ ] Ghost preview
- [ ] Capacity validation
- [ ] Drop handlers

### Phase 7: Route Map (Week 4-5)
- [ ] Map component
- [ ] Route visualization
- [ ] Context switching

### Phase 8: Polish & Testing (Week 5)
- [ ] Responsive design
- [ ] Keyboard shortcuts
- [ ] E2E tests
- [ ] Performance optimization

### Phase 9: Release (Week 6)
- [ ] Documentation
- [ ] User training materials
- [ ] Staged rollout
- [ ] Monitoring & alerts

---

## 12. Success Metrics

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Morning setup time | <5 min | Time from page load to all guides notified |
| Auto-assign success rate | >80% | Bookings assigned without manual intervention |
| Assignment errors | <1% | Capacity violations, qualification mismatches |

### Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Route efficiency | >20% improvement | Compare to baseline random assignment |
| Guide workload balance | <15% variance | Tours per guide distribution |
| User satisfaction | >4/5 rating | Post-feature survey |

### Monitoring

- Track time spent on operations page
- Log auto-assign vs manual assignment ratio
- Alert on assignment failures
- Monitor route calculation performance

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Booking** | A customer reservation for a tour |
| **Schedule** | A specific instance of a tour on a date/time |
| **Guide Assignment** | A guide assigned to work a schedule |
| **Pickup Assignment** | A booking assigned to a specific guide for pickup |
| **Hopper** | The list of unassigned bookings |
| **Ghost Preview** | Visual preview of what would happen if a booking is assigned |
| **Zone** | Geographic region for pickup clustering (Marina, Downtown, etc.) |
| **Private Booking** | Exclusive vehicle for one booking |
| **Shared Booking** | Can be combined with other bookings |

---

## Appendix B: References

- [Vehicle Routing Problem (Wikipedia)](https://en.wikipedia.org/wiki/Vehicle_routing_problem)
- [@dnd-kit Documentation](https://dndkit.com/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Nearest Neighbor Algorithm](https://en.wikipedia.org/wiki/Nearest_neighbour_algorithm)

---

*Document authored collaboratively during design session, January 2026*
