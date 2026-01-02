# Tour Command Center — Complete Design Document

**Version:** 2.0
**Created:** January 2, 2026
**Last Updated:** January 2, 2026
**Status:** Design Complete, Ready for Implementation
**Priority:** Critical Core Feature

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [First Principles](#first-principles)
3. [Design Philosophy](#design-philosophy)
4. [The Refined Vision](#the-refined-vision)
5. [UI/UX Specification](#uiux-specification)
6. [Data Model](#data-model)
7. [Auto-Assignment Algorithm](#auto-assignment-algorithm)
8. [Technical Architecture](#technical-architecture)
9. [Implementation Plan](#implementation-plan)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### The Problem

Every morning, tour operators face the same puzzle: *"How do I get all my customers picked up and on their tours today?"*

On a busy day with 15+ tours, manually solving this takes 30-60 minutes and is error-prone. Operators must:
- Calculate guides needed per tour
- Check availability and qualifications
- Consider vehicle capacity
- Account for drive time between pickups
- Distribute customers across guides

### The Solution: Tour Command Center

A system where **the computer solves the puzzle, and humans review the solution**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   OVERNIGHT           MORNING              REVIEW              DISPATCH     │
│                                                                             │
│   ┌──────────┐       ┌──────────┐        ┌──────────┐       ┌──────────┐  │
│   │  Auto-   │       │  Open    │        │ Resolve  │       │ Send to  │  │
│   │ Optimize │──────▶│ Command  │───────▶│ Warnings │──────▶│  Guides  │  │
│   │ Schedule │       │  Center  │        │ (if any) │       │          │  │
│   └──────────┘       └──────────┘        └──────────┘       └──────────┘  │
│                                                                             │
│   System solves      Operator sees        Tap warnings,      One button,   │
│   the puzzle         pre-built day        pick from          all guides    │
│   automatically      ready for review     suggestions        notified      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Computer does the work** | Auto-assignment algorithm runs overnight |
| **Human provides judgment** | Operator reviews and approves |
| **Time is the truth** | Horizontal timeline is the primary view |
| **Drive time is visible** | Segmented tape shows travel as first-class citizen |
| **Guests are people** | Human details surfaced, not just "4 Pax" |
| **Completion has ceremony** | Clear "Ready to Dispatch" state with delight |

---

## First Principles

### The Core Question

> **"How do I get all my customers picked up and on their tours today?"**

Everything else is implementation detail.

### The Atomic Units of Reality

| Unit | Truth |
|------|-------|
| **Time** | The day unfolds sequentially. Tours start at fixed times. Non-negotiable. |
| **Space** | Customers are scattered geographically. Travel takes time. Physics. |
| **Guides** | People with vehicles. Limited capacity. Can only be in one place at once. |
| **Guests** | Humans expecting to be picked up and have an experience. Not inventory. |

### The Optimization Problem

```
MINIMIZE: Total drive time, customer wait time, guide idle time
MAXIMIZE: Guide utilization, customer experience, operational efficiency

SUBJECT TO:
  - Vehicle capacity limits
  - Tour start times (fixed)
  - Guide availability windows
  - Guide qualifications per tour
  - Physical travel time between locations
```

### The Insight: This is a Solved Problem

Vehicle routing with time windows (VRPTW) is a well-studied optimization problem. Computers are better at this than humans. Yet most tour operators solve it manually every morning.

**Our approach:** Let the algorithm solve it. Let humans review and override.

---

## Design Philosophy

### What Steve Jobs Would Demand

1. **"The computer should do the work."**
   - Don't make operators play Tetris
   - Present the BEST solution, let them approve or tweak

2. **"Show me one thing at a time."**
   - Timeline is primary
   - Map and details are secondary, on-demand

3. **"Where's the customer?"**
   - Guests are people with stories, not rectangles
   - Surface birthdays, first-timers, special requests

4. **"Where's the delight?"**
   - Completion should feel satisfying
   - The interface should celebrate "ready to dispatch"

### What Jony Ive Would Refine

1. **"Clear visual hierarchy."**
   - Primary: Timeline with guide rows
   - Secondary: Guest details on tap
   - Tertiary: Map for spatial context

2. **"Form honors meaning."**
   - Drive segments are connective tissue (subtle)
   - Pickup segments are arrivals (prominent)
   - Tour segments are the destination (bold)

3. **"Color is precious."**
   - Use color for STATUS (confidence), not geography
   - Green = optimal, Amber = review, Red = problem

4. **"Completion transforms the interface."**
   - When done, the UI should breathe differently
   - Clear signal that work is complete

---

## The Refined Vision

### State 1: Pre-Optimized View (Default)

When the operator opens Command Center, they see a **solved day**:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TOUR COMMAND CENTER                                                            │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ◀ Jan 1        JANUARY 2, 2026 (Today)        Jan 3 ▶                        │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ OPTIMIZED                                           [Adjust] [Send]  │   │
│  │                                                                        │   │
│  │ 15 guests  ·  3 guides  ·  52 min total driving  ·  94% efficiency    │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  ════════════════════════════════════════════════════════════════════════════ │
│                                                                                │
│         07:00   08:00   09:00   10:00   11:00   12:00   13:00                 │
│         ──────────────────────────────────────────────────────                │
│                                                                                │
│  Ahmed  ░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████████████████████░░░░░░░        │
│  8 seats        ├─────────────────┴───────────────────────────┤               │
│                 │ Marina (4) → Downtown (2) → Desert Safari   │               │
│                 │ 07:45                        09:30 - 12:30  │               │
│                 └─────────────────────────────────────────────┘               │
│                                                                                │
│  Sarah  ░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓████████████████████░░░░░░░░░░░░░░░        │
│  8 seats                ├─────────┴───────────────────┤                       │
│                         │ Palm (6) → Boat Cruise      │                       │
│                         │ 08:00      09:00 - 11:00    │                       │
│                         └─────────────────────────────┘                       │
│                                                                                │
│  Hassan ░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓██████████████████████████░░░░░░░░░        │
│  6 seats            ├─────────────┴─────────────────────────┤                 │
│                     │ JBR (3) → City Walking Tour           │                 │
│                     │ 08:30      10:00 - 13:00              │                 │
│                     └───────────────────────────────────────┘                 │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Summary bar shows optimization status
- Timeline dominates the view
- Guides as rows, time as horizontal axis
- Segments show: drive (░), pickup (▓), tour (█)
- No "hopper" — everything is pre-assigned

### State 2: Warnings/Exceptions

If the algorithm couldn't solve everything optimally:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ NEEDS REVIEW                                         [Adjust] [Send]      │
│                                                                                │
│  15 guests  ·  3 guides  ·  2 issues to resolve                               │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Noah Brown (6 pax) couldn't fit — vehicle capacity exceeded           │ │
│  │    [Assign to Ahmed +18m] [Assign to Sarah +25m] [Add External Guide]    │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ ⚠️ No qualified guide for Sunset Safari — requires certification         │ │
│  │    [Request Ahmed to cover] [Add External Guide] [Cancel Tour]           │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ════════════════════════════════════════════════════════════════════════════ │
│  ... timeline below ...                                                        │
```

**Key elements:**
- Clear warning banner replaces "optimized" state
- Each issue has **actionable choices** (not open-ended)
- Operator taps to resolve, doesn't drag
- Timeline shows unassigned items with amber glow

### State 3: Ready to Dispatch

When all issues resolved:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                              ✓ READY TO DISPATCH                               │
│                                                                                │
│                    15 guests  ·  3 guides  ·  All optimized                   │
│                                                                                │
│                           ┌─────────────────────┐                              │
│                           │  Send to All Guides │                              │
│                           └─────────────────────┘                              │
│                                                                                │
│                  Manifests will be sent via WhatsApp & Email                  │
│                                                                                │
│  ════════════════════════════════════════════════════════════════════════════ │
│  ... timeline below (all segments solid, confident) ...                        │
```

**Key elements:**
- Interface transforms — feels complete
- Clear call-to-action
- Subtle animation: segments "settle" into place
- Optional: gentle chime sound

### State 4: Dispatched

After sending:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                           ✓ DISPATCHED AT 06:45                                │
│                                                                                │
│                    15 guests  ·  3 guides  ·  All notified                    │
│                                                                                │
│                       [View Manifests] [Undo Dispatch]                         │
│                                                                                │
│  ════════════════════════════════════════════════════════════════════════════ │
│  ... timeline in "locked" visual state ...                                     │
```

---

## UI/UX Specification

### The Segmented Tape

The core visualization: a horizontal timeline showing a guide's day.

```
SEGMENT TYPES:

░░░░░  Idle/Available    Light gray, subtle
       Guide is free during this time

═════  Drive             Dark gray, thin
       Travel time between locations
       Shows duration: "15m"

▓▓▓▓▓  Pickup            Colored by confidence
       Customer pickup at a location
       Shows: Location (Guest count)

█████  Tour              Bold, saturated
       The actual tour/activity
       Shows: Tour name (duration)
```

**Color System (Confidence-Based):**

| Color | Meaning | Usage |
|-------|---------|-------|
| Green | Optimal | Assignment is ideal |
| Blue | Good | Assignment works well |
| Amber | Review | Suboptimal, but workable |
| Red | Problem | Over capacity, conflict, etc. |

**Not** zone-based colors. Color indicates confidence, not geography.

### The Guest Card (On Tap)

When operator taps a pickup segment:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Liam Smith                                          [✕ Close] │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  👨‍👩‍👧‍👦  4 guests                                                  │
│      Liam Smith, Emma Smith (adults)                           │
│      Oliver Smith, Sophia Smith (children, 8 & 6)              │
│                                                                 │
│  📍  Marina Zone                                                │
│      Hilton Dubai Marina, Tower 2 Lobby                        │
│      Pickup: 08:15                                              │
│                                                                 │
│  🎂  Birthday celebration for Oliver                            │
│                                                                 │
│  ⭐  First time with us                                         │
│                                                                 │
│  💬  "Kids are excited about seeing camels!"                    │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  Assigned to: Ahmed Hassan                                      │
│  Desert Safari Tour · 09:30 - 12:30                            │
│                                                                 │
│  [Move to Different Guide]  [Call]  [WhatsApp]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Full guest details (not just "4 Pax")
- Special occasions highlighted
- First-timer flag
- Special requests / notes
- Quick actions

### The Guide Row (On Tap)

When operator taps a guide's name:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Ahmed Hassan                                        [✕ Close] │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  🚗  Toyota Land Cruiser · 8 seats                             │
│  🗣️  English, Arabic, French                                    │
│  ⭐  Primary guide for Desert Safari                            │
│                                                                 │
│  TODAY'S SCHEDULE                                               │
│  ───────────────────────────────────────────────────────────── │
│  07:45  Depart base                                             │
│  08:00  📍 Hilton Marina — Smith Family (4)                    │
│  08:25  📍 Address Downtown — Johnson (2)                       │
│  09:30  🏜️ Desert Safari Tour (3h)                              │
│  12:30  Return                                                  │
│                                                                 │
│  Driving: 47 min · Guests: 6/8 seats                           │
│                                                                 │
│  [View Full Manifest]  [Call]  [WhatsApp]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Adjust Mode: Three-Panel Layout

The dispatcher's primary workspace. Based on the principle that **tour dispatch is a spatial + temporal puzzle** that benefits from visualizing both dimensions simultaneously.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TOUR COMMAND CENTER                                              [Optimize] [Dispatch]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│ ┌─────────────────┐ ┌──────────────────────────────────────────┐ ┌───────────────────┐ │
│ │ HOPPER          │ │ GUIDE DISPATCH TIMELINE                  │ │ ROUTE CONTEXT     │ │
│ │ (Source)        │ │ (Canvas)                                 │ │ (Map)             │ │
│ │                 │ │                                          │ │                   │ │
│ │ ┌─────────────┐ │ │  07:00   08:00   09:00   10:00   11:00   │ │    ┌─────────┐   │ │
│ │ │ Liam Smith  │ │ │  ─────────────────────────────────────── │ │    │  🗺️     │   │ │
│ │ │ 4 Pax       │ │ │                                          │ │    │         │   │ │
│ │ │ Marina Zone │ │ │  Guide Ahmed (🚐 8 Seats)                │ │    │ Marina  │   │ │
│ │ └─────────────┘ │ │  ┌────┬──────────┬────┬────────┬───────┐ │ │    │   ↓     │   │ │
│ │                 │ │  │Drv │ Pickup A │Drv │Pickup B│ Tour  │ │ │    │Downtown │   │ │
│ │ ┌─────────────┐ │ │  │15m │ Marina   │30m │Downtown│ 3h    │ │ │    │   ↓     │   │ │
│ │ │Emma Johnson │ │ │  │    │ 4px ●●●● │    │ 2px ●● │       │ │ │    │ Palm    │   │ │
│ │ │ 2 Pax       │ │ │  └────┴──────────┴────┴────────┴───────┘ │ │    └─────────┘   │ │
│ │ │Downtown Zone│ │ │                                          │ │                   │ │
│ │ └─────────────┘ │ │  Guide Sarah (🚐 8 Seats)   "Ghost"      │ │  +45m driving     │ │
│ │                 │ │  ┌────┬──────────┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  │ │  Recommend:       │ │
│ │ ┌─────────────┐ │ │  │Drv │ Pickup C │  Ghost preview    │  │ │  Marina guide     │ │
│ │ │ Noah Brown  │ │ │  │20m │ Palm     │  (45m, inefficient)│  │ │                   │ │
│ │ │ 6 Pax       │ │ │  └────┴──────────┴┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘  │ │                   │ │
│ │ │Palm Jumeirah│ │ │                                          │ │                   │ │
│ │ └─────────────┘ │ │                                          │ │                   │ │
│ │                 │ │                                          │ │                   │ │
│ │ Sorted by       │ │                                          │ │                   │ │
│ │ priority        │ │                                          │ │                   │ │
│ └─────────────────┘ └──────────────────────────────────────────┘ └───────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Panel 1: Unassigned Bookings Hopper (Left)

The **source** of drag operations. Bookings awaiting assignment.

**Visual Design:**
- Cards show: Customer name, pax count, zone badge
- Zone badge uses **zone-specific colors** for instant geographic clustering
- Priority sorting (tour time urgency > VIP status > group size)
- Special icons: ♿ wheelchair, 👶 child seat, ⭐ VIP, 🎂 birthday

**Zone Color System:**
| Zone | Color | Rationale |
|------|-------|-----------|
| Marina Zone | Teal `#0EA5E9` | Coastal/water association |
| Downtown | Orange `#F97316` | Urban/energy |
| Palm Jumeirah | Green `#22C55E` | Palm tree association |
| JBR | Purple `#8B5CF6` | Luxury/premium |
| Business Bay | Blue `#3B82F6` | Corporate |

> **Design Decision:** Zone colors (not confidence colors) in the hopper and pickup segments.
> This enables instant visual pattern recognition: "All the green cards should go to the green pickups."

#### Panel 2: Guide Dispatch Timeline (Center)

The **canvas** where assignments live. Time is X-axis, guides are rows.

**Segmented Tape Anatomy:**
```
┌──────┬────────────────┬──────┬────────────────┬──────┬─────────────────────┐
│ DRIVE│    PICKUP A    │ DRIVE│    PICKUP B    │ DRIVE│       TOUR          │
│ 15m  │  Marina Zone   │ 30m  │  Downtown      │ 15m  │   Desert Safari     │
│ gray │  4px ●●●●      │ gray │  2px ●●        │ gray │      (3h)           │
│      │  (zone color)  │      │  (zone color)  │      │   (tour color)      │
└──────┴────────────────┴──────┴────────────────┴──────┴─────────────────────┘
 07:45   08:00            08:30   09:00            09:30     09:45 - 12:45
```

**Segment Types:**
| Type | Appearance | Content |
|------|------------|---------|
| Drive | Gray bar | Duration in minutes |
| Pickup | Zone-colored bar | Zone name, pax dots (●●●●), zone color |
| Tour | Bold branded color | Tour name, duration |
| Ghost | Dashed border | Preview of proposed drop |

**Guide Row Header:**
```
Guide Ahmed
🚐 8 Seats | 6/8 assigned | Base: Marina Zone
```

#### Panel 3: Route Context Map (Right)

The **spatial context** panel. Shows geographic impact of assignments.

**Features:**
- Zone markers with colored pins
- Current route polyline for hovered/selected guide
- Ghost route preview when dragging
- Efficiency callout: "+45m driving" or "✓ Efficient route"
- Recommendation: "Assign to Marina-based guide instead"

**Interactions:**
- Hover guide row → highlight their route on map
- Drag booking → show proposed route change
- Click zone on map → filter hopper to that zone

#### Ghost Preview: The Magic

When dragging a booking over a guide's timeline:

1. **Calculate insertion point** — Where in the pickup sequence does this fit?
2. **Calculate drive time impact** — How much time does this add?
3. **Show ghost segment** — Dashed outline with zone color
4. **Show efficiency feedback** — "+45m drive time! (Inefficient)" or "✓ Efficient (+5m)"
5. **Update map** — Show dotted line for proposed route addition
6. **Show recommendation** — If inefficient, suggest better alternative

```typescript
interface GhostPreview {
  guideId: string;
  insertAfterPickup: number;  // Index in pickup sequence
  segment: {
    startTime: Date;
    endTime: Date;
    zone: PickupZone;
    paxCount: number;
  };
  impact: {
    driveTimeBefore: number;   // Minutes to reach this pickup
    driveTimeAfter: number;    // Minutes to next stop
    netChange: number;         // Total added minutes
    efficiency: 'efficient' | 'acceptable' | 'inefficient';
  };
  recommendation?: {
    betterGuideId: string;
    betterGuideName: string;
    savingsMinutes: number;
  };
}
```

---

### Legacy: Simple Adjust Mode

For operators who prefer a simpler interface:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ADJUST MODE                                              [Done] [Reset]        │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────────┐                                                          │
│  │ UNASSIGNED (2)  │    Timeline with drag-drop enabled                       │
│  │                 │                                                          │
│  │ ┌─────────────┐ │    ════════════════════════════════════════════════════ │
│  │ │ Noah Brown  │ │                                                          │
│  │ │ 6 Pax       │ │    Ahmed  ░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████████░░░░░░░  │
│  │ │ Palm Zone   │ │           ↑                                              │
│  │ │ ≡ Drag      │ │           Drop here: +18m drive                          │
│  │ └─────────────┘ │                                                          │
│  │                 │    Sarah  ░░░░░░░░░░▓▓▓▓▓▓▓▓████████████░░░░░░░░░░░░░░  │
│  │ ┌─────────────┐ │                                                          │
│  │ │ Chen Wei    │ │                                                          │
│  │ │ 2 Pax       │ │    Hassan ░░░░░░░▓▓▓▓▓▓▓▓▓▓████████████████████░░░░░░░  │
│  │ │ Airport     │ │                                                          │
│  │ └─────────────┘ │                                                          │
│  └─────────────────┘                                                          │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ 🗺️ ROUTE PREVIEW                                                         │ │
│  │                                                                          │ │
│  │    [Map showing proposed route with +18m impact highlighted]             │ │
│  │                                                                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Explicitly labeled "Adjust Mode"
- Unassigned hopper only appears in this mode
- Drag-drop enabled
- Ghost preview shows impact
- Map slides in for spatial context
- Clear "Done" to exit mode

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate dates |
| `T` | Jump to today |
| `A` | Enter adjust mode |
| `D` | Dispatch (when ready) |
| `Esc` | Close panel / Exit adjust mode |
| `?` | Show shortcuts |

### Responsive Behavior

**Desktop (1200px+):** Full timeline view as shown

**Tablet (768-1199px):**
- Timeline scrolls horizontally
- Guest cards as slide-over panels
- Adjust mode as full-screen overlay

**Mobile (< 768px):**
- Vertical timeline (guides stack)
- Bottom sheet for guest details
- Simplified adjust mode

---

## Data Model

### Schema Changes

#### 1. Pickup Zones (New Table)

```sql
CREATE TABLE pickup_zones (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),

  name TEXT NOT NULL,           -- "Marina", "Downtown", "Palm"
  color TEXT NOT NULL,          -- Hex color for map markers

  -- Zone center for map display
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, name)
);
```

#### 2. Zone Travel Times (New Table)

```sql
CREATE TABLE zone_travel_times (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),

  from_zone_id TEXT NOT NULL REFERENCES pickup_zones(id),
  to_zone_id TEXT NOT NULL REFERENCES pickup_zones(id),

  estimated_minutes INTEGER NOT NULL,  -- Average drive time

  UNIQUE(organization_id, from_zone_id, to_zone_id)
);
```

#### 3. Guides (Enhanced)

```sql
ALTER TABLE guides
ADD COLUMN vehicle_capacity INTEGER NOT NULL DEFAULT 6,
ADD COLUMN vehicle_description TEXT,        -- "Toyota Land Cruiser"
ADD COLUMN base_zone_id TEXT REFERENCES pickup_zones(id);  -- Where they start
```

#### 4. Bookings (Enhanced)

```sql
ALTER TABLE bookings
ADD COLUMN pickup_zone_id TEXT REFERENCES pickup_zones(id),
ADD COLUMN pickup_location TEXT,            -- Specific venue name
ADD COLUMN pickup_address TEXT,             -- Full address
ADD COLUMN pickup_lat DECIMAL(10, 7),
ADD COLUMN pickup_lng DECIMAL(10, 7),
ADD COLUMN pickup_time TEXT,                -- Calculated: "08:15"
ADD COLUMN pickup_notes TEXT,               -- "Tower 2 lobby"
ADD COLUMN is_private_booking BOOLEAN DEFAULT FALSE,
ADD COLUMN special_occasion TEXT,           -- "Birthday", "Anniversary"
ADD COLUMN special_requests TEXT;           -- Guest notes
```

#### 5. Guide Assignments (Enhanced)

```sql
ALTER TABLE guide_assignments
ADD COLUMN is_lead_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN pickup_order INTEGER,            -- 1, 2, 3... sequence
ADD COLUMN calculated_pickup_time TEXT,     -- "08:15"
ADD COLUMN drive_time_minutes INTEGER;      -- Minutes to reach this pickup
```

#### 6. Dispatch Status (New Table)

```sql
CREATE TABLE dispatch_status (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),

  dispatch_date DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',   -- pending, optimized, dispatched
  optimized_at TIMESTAMP WITH TIME ZONE,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  dispatched_by TEXT REFERENCES users(id),

  -- Optimization results
  total_guests INTEGER,
  total_guides INTEGER,
  total_drive_minutes INTEGER,
  efficiency_score DECIMAL(5, 2),           -- 0-100%

  -- Issues
  unresolved_warnings INTEGER DEFAULT 0,

  UNIQUE(organization_id, dispatch_date)
);
```

### Entity Relationships

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DISPATCH DATA MODEL                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   pickup_zones ◄─────────────────────────────────────────┐                  │
│   ├── id, name, color                                     │                  │
│   └── center_lat, center_lng                              │                  │
│         │                                                 │                  │
│         │                                                 │                  │
│         ▼                                                 │                  │
│   zone_travel_times                                       │                  │
│   ├── from_zone_id ──────────────────────────────────────┤                  │
│   ├── to_zone_id ────────────────────────────────────────┘                  │
│   └── estimated_minutes                                                      │
│                                                                              │
│   guides                          bookings                                   │
│   ├── vehicle_capacity            ├── pickup_zone_id ───────► pickup_zones  │
│   ├── vehicle_description         ├── pickup_location                       │
│   ├── base_zone_id ──────────────►├── pickup_time                           │
│   │                               ├── is_private_booking                    │
│   │                               └── special_occasion                      │
│   │                                     │                                    │
│   │                                     │                                    │
│   │                                     ▼                                    │
│   │                               guide_assignments                          │
│   └──────────────────────────────► ├── booking_id                           │
│                                    ├── guide_id                              │
│                                    ├── pickup_order                          │
│                                    ├── calculated_pickup_time                │
│                                    └── drive_time_minutes                    │
│                                                                              │
│   dispatch_status                                                            │
│   ├── dispatch_date                                                          │
│   ├── status (pending/optimized/dispatched)                                  │
│   ├── efficiency_score                                                       │
│   └── unresolved_warnings                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Assignment Algorithm

### Overview

The algorithm runs automatically (via Inngest cron) at 4:00 AM for the current day, or on-demand when operator requests re-optimization.

### Input

```typescript
interface OptimizationInput {
  date: Date;
  bookings: BookingWithPickup[];      // All bookings for the date
  guides: GuideWithAvailability[];    // Available guides
  travelMatrix: TravelTimeMatrix;     // Zone-to-zone times
  tours: TourWithSchedule[];          // Tour start times & durations
}
```

### Algorithm: Greedy Assignment with Local Optimization

```typescript
async function optimizeDispatch(input: OptimizationInput): Promise<OptimizationResult> {
  const { date, bookings, guides, travelMatrix, tours } = input;

  // Step 1: Group bookings by tour run (tour + date + time)
  const tourRuns = groupBookingsByTourRun(bookings, tours);

  // Step 2: Calculate guides needed per tour run
  for (const tourRun of tourRuns) {
    tourRun.guidesNeeded = Math.ceil(
      tourRun.totalGuests / tourRun.tour.guestsPerGuide
    );
  }

  // Step 3: Sort tour runs by priority
  // Earlier tours first, then by guest count (larger harder to staff)
  const sortedTourRuns = tourRuns.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    return b.totalGuests - a.totalGuests;
  });

  // Step 4: Initialize guide schedules
  const guideSchedules = new Map<string, GuideSchedule>();
  for (const guide of guides) {
    guideSchedules.set(guide.id, {
      guide,
      assignments: [],
      totalDriveMinutes: 0,
      currentZone: guide.baseZoneId,
      availableFrom: guide.availableFrom,
    });
  }

  // Step 5: Assign guides to tour runs
  const assignments: Assignment[] = [];
  const warnings: Warning[] = [];

  for (const tourRun of sortedTourRuns) {
    const needed = tourRun.guidesNeeded;

    // Find qualified, available guides
    const candidates = guides.filter(g =>
      isQualified(g, tourRun.tour) &&
      isAvailable(g, tourRun, guideSchedules.get(g.id)!)
    );

    // Score candidates
    const scored = candidates.map(guide => ({
      guide,
      score: scoreGuideForTourRun(guide, tourRun, guideSchedules, travelMatrix),
    })).sort((a, b) => b.score - a.score);

    // Assign top N guides
    const toAssign = scored.slice(0, needed);

    if (toAssign.length < needed) {
      warnings.push({
        type: 'insufficient_guides',
        tourRunId: tourRun.id,
        needed,
        found: toAssign.length,
        message: `Need ${needed} guides, only ${toAssign.length} available`,
      });
    }

    for (const { guide } of toAssign) {
      // Distribute bookings to this guide
      const guideBookings = distributeBookings(
        tourRun.bookings,
        guide,
        guideSchedules.get(guide.id)!,
        travelMatrix
      );

      // Calculate pickup times
      const pickupSequence = calculatePickupSequence(
        guideBookings,
        tourRun.startTime,
        guide.baseZoneId,
        travelMatrix
      );

      // Record assignments
      for (const pickup of pickupSequence) {
        assignments.push({
          bookingId: pickup.bookingId,
          guideId: guide.id,
          pickupOrder: pickup.order,
          calculatedPickupTime: pickup.time,
          driveTimeMinutes: pickup.driveMinutes,
        });
      }

      // Update guide schedule
      updateGuideSchedule(guideSchedules.get(guide.id)!, tourRun, pickupSequence);
    }
  }

  // Step 6: Calculate efficiency score
  const efficiency = calculateEfficiency(assignments, guides, travelMatrix);

  return {
    assignments,
    warnings,
    efficiency,
    totalDriveMinutes: sumDriveTime(assignments),
  };
}
```

### Scoring Function

```typescript
function scoreGuideForTourRun(
  guide: Guide,
  tourRun: TourRun,
  schedules: Map<string, GuideSchedule>,
  travelMatrix: TravelTimeMatrix
): number {
  let score = 0;
  const schedule = schedules.get(guide.id)!;

  // Primary guide bonus (+100)
  if (isPrimaryGuide(guide, tourRun.tour)) {
    score += 100;
  }

  // Zone proximity bonus (+50 to +0)
  // Closer base zone = less initial drive
  const avgPickupZone = getMostCommonZone(tourRun.bookings);
  const driveFromBase = travelMatrix.get(guide.baseZoneId, avgPickupZone) || 30;
  score += Math.max(0, 50 - driveFromBase);

  // Vehicle capacity fit (+30 to -50)
  // Prefer guides whose capacity matches the load
  const guestsToAssign = Math.ceil(tourRun.totalGuests / tourRun.guidesNeeded);
  const capacityDiff = guide.vehicleCapacity - guestsToAssign;
  if (capacityDiff >= 0 && capacityDiff <= 2) {
    score += 30;  // Good fit
  } else if (capacityDiff < 0) {
    score -= 50;  // Can't fit!
  }

  // Workload balancing (-10 per existing assignment)
  // Spread work across guides
  score -= schedule.assignments.length * 10;

  // Language match (+20)
  if (tourRun.preferredLanguage && guide.languages.includes(tourRun.preferredLanguage)) {
    score += 20;
  }

  return score;
}
```

### Pickup Sequence Calculation

```typescript
function calculatePickupSequence(
  bookings: Booking[],
  tourStartTime: Date,
  baseZoneId: string,
  travelMatrix: TravelTimeMatrix
): PickupSequence[] {
  // Work backwards from tour start time
  let currentTime = tourStartTime;
  let currentZone = getTourMeetingZone();

  // Sort bookings by zone to minimize backtracking
  const sortedBookings = optimizePickupOrder(bookings, baseZoneId, travelMatrix);

  // Calculate times in reverse
  const sequence: PickupSequence[] = [];

  for (let i = sortedBookings.length - 1; i >= 0; i--) {
    const booking = sortedBookings[i];
    const driveTime = travelMatrix.get(booking.pickupZoneId, currentZone) || 15;

    // Subtract drive time to get pickup time
    const pickupTime = subtractMinutes(currentTime, driveTime);

    sequence.unshift({
      bookingId: booking.id,
      order: i + 1,
      time: formatTime(pickupTime),  // "08:15"
      driveMinutes: driveTime,
      zone: booking.pickupZoneId,
    });

    currentTime = pickupTime;
    currentZone = booking.pickupZoneId;
  }

  return sequence;
}
```

---

## Technical Architecture

### New Service: CommandCenterService

```typescript
// packages/services/src/command-center-service.ts

export class CommandCenterService extends BaseService {
  /**
   * Get dispatch status for a date
   */
  async getDispatchStatus(date: Date): Promise<DispatchStatus>;

  /**
   * Get optimized schedule for a date
   * Returns pre-computed assignments with timeline data
   */
  async getOptimizedSchedule(date: Date): Promise<OptimizedSchedule>;

  /**
   * Trigger re-optimization for a date
   */
  async reoptimize(date: Date): Promise<OptimizationResult>;

  /**
   * Resolve a warning by selecting an option
   */
  async resolveWarning(
    warningId: string,
    resolution: WarningResolution
  ): Promise<void>;

  /**
   * Manually assign a booking to a guide
   */
  async manualAssign(
    bookingId: string,
    guideId: string
  ): Promise<AssignmentResult>;

  /**
   * Dispatch: send notifications to all guides
   */
  async dispatch(date: Date): Promise<DispatchResult>;

  /**
   * Get guide timeline data for visualization
   */
  async getGuideTimelines(date: Date): Promise<GuideTimeline[]>;
}
```

### New tRPC Router: commandCenterRouter

```typescript
// apps/crm/src/server/routers/command-center.ts

export const commandCenterRouter = router({
  // Get full dispatch view for a date
  getDispatch: adminProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      const [status, schedule, timelines] = await Promise.all([
        ctx.services.commandCenter.getDispatchStatus(input.date),
        ctx.services.commandCenter.getOptimizedSchedule(input.date),
        ctx.services.commandCenter.getGuideTimelines(input.date),
      ]);
      return { status, schedule, timelines };
    }),

  // Trigger re-optimization
  reoptimize: adminProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.commandCenter.reoptimize(input.date);
    }),

  // Resolve a warning
  resolveWarning: adminProcedure
    .input(z.object({
      warningId: z.string(),
      resolution: warningResolutionSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.commandCenter.resolveWarning(
        input.warningId,
        input.resolution
      );
    }),

  // Manual assignment
  manualAssign: adminProcedure
    .input(z.object({
      bookingId: z.string(),
      guideId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.commandCenter.manualAssign(
        input.bookingId,
        input.guideId
      );
    }),

  // Send dispatch to all guides
  dispatch: adminProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.commandCenter.dispatch(input.date);
    }),

  // Get guest details
  getGuestDetails: adminProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.commandCenter.getGuestDetails(input.bookingId);
    }),
});
```

### Inngest Jobs

```typescript
// Auto-optimize at 4 AM daily
inngest.createFunction(
  { id: 'daily-dispatch-optimization' },
  { cron: '0 4 * * *' },  // 4:00 AM every day
  async ({ step }) => {
    const today = new Date();

    // Get all organizations
    const orgs = await step.run('get-orgs', () => getActiveOrganizations());

    // Optimize each org
    for (const org of orgs) {
      await step.run(`optimize-${org.id}`, () =>
        commandCenterService.reoptimize(today, org.id)
      );
    }
  }
);

// Send dispatch notifications
inngest.createFunction(
  { id: 'dispatch-notifications' },
  { event: 'dispatch.sent' },
  async ({ event, step }) => {
    const { organizationId, date, guideIds } = event.data;

    for (const guideId of guideIds) {
      await step.run(`notify-${guideId}`, () =>
        sendGuideManifest(guideId, date, organizationId)
      );
    }
  }
);
```

### Component Structure

```
apps/crm/src/
├── app/org/[slug]/(dashboard)/
│   └── command-center/
│       ├── page.tsx                 # Main command center page
│       └── loading.tsx              # Skeleton loader
│
├── components/command-center/
│   ├── command-center.tsx           # Main orchestrator
│   ├── dispatch-header.tsx          # Date nav, status, actions
│   ├── status-banner.tsx            # Optimized/Needs Review/Ready
│   ├── warnings-panel.tsx           # Issue resolution UI
│   │
│   ├── timeline/
│   │   ├── timeline-container.tsx   # Scrollable timeline area
│   │   ├── timeline-header.tsx      # Time axis (07:00, 08:00, etc.)
│   │   ├── guide-row.tsx            # Single guide's timeline
│   │   ├── segment.tsx              # Base segment component
│   │   ├── drive-segment.tsx        # Travel time segment
│   │   ├── pickup-segment.tsx       # Customer pickup segment
│   │   └── tour-segment.tsx         # Tour duration segment
│   │
│   ├── panels/
│   │   ├── guest-card.tsx           # Guest details slide-over
│   │   ├── guide-card.tsx           # Guide details slide-over
│   │   └── route-preview.tsx        # Map with route
│   │
│   ├── adjust-mode/
│   │   ├── adjust-overlay.tsx       # Full adjust mode UI
│   │   ├── unassigned-hopper.tsx    # Draggable unassigned bookings
│   │   ├── drop-zone.tsx            # Guide row drop targets
│   │   └── ghost-preview.tsx        # Preview of drag result
│   │
│   └── hooks/
│       ├── use-dispatch-data.ts     # Data fetching & caching
│       ├── use-timeline-scroll.ts   # Horizontal scroll sync
│       ├── use-drag-drop.ts         # @dnd-kit integration
│       └── use-keyboard-nav.ts      # Keyboard shortcuts
```

---

## Implementation Plan

### Phase 1: Foundation (3 days)

**Day 1: Schema & Migrations**
- [ ] Create `pickup_zones` table
- [ ] Create `zone_travel_times` table
- [ ] Add columns to `guides` (vehicle_capacity, base_zone_id)
- [ ] Add columns to `bookings` (pickup_zone_id, pickup_location, etc.)
- [ ] Add columns to `guide_assignments` (pickup_order, calculated_pickup_time)
- [ ] Create `dispatch_status` table
- [ ] Run migrations

**Day 2: Core Services**
- [ ] Create `CommandCenterService`
- [ ] Implement `getDispatchStatus`
- [ ] Implement `getGuideTimelines`
- [ ] Create `commandCenterRouter`

**Day 3: Optimization Algorithm**
- [ ] Implement `reoptimize` method
- [ ] Implement scoring function
- [ ] Implement pickup sequence calculation
- [ ] Create Inngest cron job for 4 AM optimization

### Phase 2: Timeline UI (4 days)

**Day 4: Basic Layout**
- [ ] Create command center page
- [ ] Implement `dispatch-header.tsx`
- [ ] Implement `status-banner.tsx`
- [ ] Date navigation

**Day 5: Timeline Core**
- [ ] Implement `timeline-container.tsx`
- [ ] Implement `timeline-header.tsx` (time axis)
- [ ] Implement `guide-row.tsx`
- [ ] Horizontal scrolling & time alignment

**Day 6: Segments**
- [ ] Implement `segment.tsx` base component
- [ ] Implement `drive-segment.tsx`
- [ ] Implement `pickup-segment.tsx`
- [ ] Implement `tour-segment.tsx`
- [ ] Confidence-based coloring

**Day 7: Interactivity**
- [ ] Click segment to open details
- [ ] Implement `guest-card.tsx`
- [ ] Implement `guide-card.tsx`
- [ ] Keyboard shortcuts

### Phase 3: Warnings & Resolution (2 days)

**Day 8: Warnings System**
- [ ] Implement `warnings-panel.tsx`
- [ ] Warning card with resolution options
- [ ] `resolveWarning` mutation

**Day 9: Resolution Flow**
- [ ] Tap-to-resolve UI
- [ ] Reassignment options
- [ ] Add external guide flow
- [ ] Re-optimization after resolution

### Phase 4: Adjust Mode (2 days)

**Day 10: Drag & Drop**
- [ ] Implement `adjust-overlay.tsx`
- [ ] Implement `unassigned-hopper.tsx`
- [ ] Set up @dnd-kit
- [ ] Drag from hopper to timeline

**Day 11: Ghost Preview & Map**
- [ ] Implement `ghost-preview.tsx`
- [ ] Show drive time impact
- [ ] Implement `route-preview.tsx` with map
- [ ] Drop confirmation

### Phase 5: Dispatch & Polish (2 days)

**Day 12: Dispatch Flow**
- [ ] "Ready to Dispatch" state
- [ ] Dispatch mutation
- [ ] Inngest notification job
- [ ] WhatsApp & Email manifest sending

**Day 13: Polish**
- [ ] Completion animation
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsiveness
- [ ] E2E tests

### Total: ~13 days

---

## Future Enhancements

### Phase 2: Intelligence

1. **Learning from History**
   - Track which assignments worked well
   - Adjust scoring based on past performance
   - "Ahmed always handles Marina VIPs well"

2. **Predictive Staffing**
   - Forecast guide needs for future dates
   - Alert when understaffed days detected

3. **Real-time Updates**
   - Live location tracking during tours
   - Automatic delay notifications
   - Dynamic re-routing

### Phase 3: Integration

1. **Google Maps Integration**
   - Real-time traffic-aware travel times
   - Actual route visualization
   - Turn-by-turn directions in manifest

2. **WhatsApp Business API**
   - Interactive manifests
   - One-tap confirmation from guides
   - Real-time pickup updates

3. **Customer Communication**
   - Automated "guide is on the way" messages
   - Live ETA updates
   - Post-pickup confirmation

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Tour Run** | A single instance of a tour on a specific date/time |
| **Pickup Zone** | A geographic area for grouping pickup locations |
| **Segmented Tape** | The timeline visualization showing drive/pickup/tour segments |
| **Ghost Preview** | Visual preview of what an assignment would look like |
| **Dispatch** | The act of finalizing and sending manifests to guides |

### Status Flow

```
pending → optimized → ready → dispatched
   │          │         │
   │          │         └── All warnings resolved
   │          └── Algorithm ran, may have warnings
   └── No optimization yet (new day)
```

### Confidence Scoring

| Score | Color | Meaning |
|-------|-------|---------|
| 90-100% | Green | Optimal assignment |
| 70-89% | Blue | Good assignment |
| 50-69% | Amber | Suboptimal, review recommended |
| < 50% | Red | Problematic, action required |

---

*Document Version: 2.0 | Updated: January 2, 2026 | Status: Ready for Implementation*
