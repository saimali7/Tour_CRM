# Bookings Page Redesign - Linear-Style Focus Management

## Problem Statement

The current bookings page has no hierarchy of attention. Every booking is treated equally in a flat chronological list, making it impossible to quickly understand:
- What needs my action right now?
- What's at risk of falling through the cracks?
- What's "done" and can be ignored?

## Design Philosophy

**"Inbox Zero for Bookings"** - The page should guide operators to zero unresolved items through clear visual hierarchy and smart grouping.

---

## Core Concept: Views Instead of Filters

Replace passive dropdown filters with **active views** (tabs) that answer operational questions:

| View | Question It Answers | Contents |
|------|---------------------|----------|
| **Needs Action** | "What requires my attention right now?" | Pending confirmations, unpaid upcoming tours, issues |
| **Upcoming** | "What's happening soon?" | Next 7 days, grouped by day |
| **Today** | "What's happening today?" | Today's bookings, sorted by tour time |
| **All Bookings** | "Show me everything" | Traditional list with filters |

---

## Visual Hierarchy System

### Urgency Levels (Color-coded left borders + backgrounds)

```
CRITICAL (Red)     → Tour is TODAY and booking is unconfirmed/unpaid
HIGH (Amber)       → Tour is within 48 hours and needs action
MEDIUM (Blue)      → Tour is this week, pending items
NORMAL (None)      → Everything is fine, tour is confirmed + paid
MUTED (Gray)       → Past tours, cancelled bookings
```

### Attention Indicators

```tsx
// Example row with urgency
<TableRow className="border-l-4 border-l-red-500 bg-red-50/50">
  <TimeUrgencyBadge>IN 3 HOURS</TimeUrgencyBadge>
  <span className="text-red-600 font-medium">Needs Confirmation</span>
</TableRow>
```

---

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Bookings                                           [Quick Book] │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┬──────────┬─────────┬──────────────┐           │
│ │ Needs Action │ Upcoming │  Today  │ All Bookings │   [Search]│
│ │    (12)      │   (34)   │   (8)   │              │           │
│ └──────────────┴──────────┴─────────┴──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ CRITICAL: Action Required ─────────────────────────────────┐
│  │                                                              │
│  │  🔴 Sarah Johnson - Sunset Kayak Tour                       │
│  │     IN 3 HOURS • 4 guests • $240                            │
│  │     ⚠️ Unconfirmed  ⚠️ Unpaid                    [Confirm ▾]│
│  │                                                              │
│  │  🔴 Mike Chen - Morning Hike                                │
│  │     TOMORROW 9AM • 2 guests • $80                           │
│  │     ⚠️ Unpaid                                   [Send Link] │
│  │                                                              │
│  └──────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─ PENDING CONFIRMATION ───────────────────────────────────────┐
│  │                                                              │
│  │  ○ Emma Wilson - Whale Watch                                │
│  │     Dec 28 • 6 guests • $420 • Paid ✓           [Confirm ▾] │
│  │                                                              │
│  │  ○ John Smith - City Tour                                   │
│  │     Dec 30 • 2 guests • $60 • Paid ✓            [Confirm ▾] │
│  │                                                              │
│  └──────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─ READY TO GO (8) ────────────────────────────────────────────┐
│  │  ✓ All confirmed and paid - no action needed                │
│  │  [Show 8 bookings ▾]                                        │
│  └──────────────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Smart Grouping Backend (Service Layer)

**File: `packages/services/src/booking-service.ts`**

Add new methods:

```typescript
interface BookingsByUrgency {
  critical: BookingWithRelations[];    // Today/tomorrow + unconfirmed OR unpaid
  needsAction: BookingWithRelations[]; // Pending confirmation or unpaid (all)
  upcoming: BookingWithRelations[];    // Next 7 days, all good
  today: BookingWithRelations[];       // Today's bookings
  past: BookingWithRelations[];        // Already happened
}

async getGroupedByUrgency(): Promise<BookingsByUrgency>;

async getUpcoming(days: number = 7): Promise<{
  byDay: Map<string, BookingWithRelations[]>;
  stats: { total: number; needsAction: number; revenue: string };
}>;

async getNeedsAction(): Promise<{
  unconfirmed: BookingWithRelations[];
  unpaid: BookingWithRelations[];
  issues: BookingWithRelations[];  // cancelled but has payments, etc.
}>;
```

### Phase 2: New tRPC Endpoints

**File: `apps/crm/src/server/routers/booking.ts`**

```typescript
getGroupedByUrgency: protectedProcedure.query(/* ... */),
getNeedsAction: protectedProcedure.query(/* ... */),
getUpcoming: protectedProcedure.input(z.object({
  days: z.number().default(7)
})).query(/* ... */),
getToday: protectedProcedure.query(/* ... */),
```

### Phase 3: UI Components

#### 3.1 View Tabs Component

**File: `apps/crm/src/components/bookings/booking-view-tabs.tsx`**

```typescript
interface BookingViewTabsProps {
  activeView: 'needs-action' | 'upcoming' | 'today' | 'all';
  onViewChange: (view: string) => void;
  counts: {
    needsAction: number;
    upcoming: number;
    today: number;
  };
}
```

- Horizontal tabs with counts
- "Needs Action" shows red badge if > 0
- Keyboard navigation (1-4 to switch views)
- URL sync for deep linking (`?view=needs-action`)

#### 3.2 Urgency Section Component

**File: `apps/crm/src/components/bookings/urgency-section.tsx`**

```typescript
interface UrgencySectionProps {
  title: string;
  urgency: 'critical' | 'high' | 'medium' | 'normal' | 'muted';
  bookings: BookingWithRelations[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
}
```

- Collapsible sections with counts
- Color-coded header bars
- Bulk actions per section
- "Mark all as confirmed" type shortcuts

#### 3.3 Booking Row Component (Enhanced)

**File: `apps/crm/src/components/bookings/booking-row.tsx`**

Enhanced from current table row:
- Time urgency badge ("IN 3 HOURS", "TOMORROW", "DEC 28")
- Inline quick actions (Confirm, Send Payment Link)
- Status issues highlighted inline
- Progress indicator for partial payments

#### 3.4 Needs Action View

**File: `apps/crm/src/components/bookings/views/needs-action-view.tsx`**

Groups:
1. **Critical** - Today/tomorrow with issues
2. **Pending Confirmation** - Awaiting confirm
3. **Awaiting Payment** - Confirmed but unpaid
4. **Other Issues** - Edge cases

Each group has:
- Count badge
- Bulk action ("Confirm All", "Send All Payment Reminders")
- Expandable list

#### 3.5 Upcoming View

**File: `apps/crm/src/components/bookings/views/upcoming-view.tsx`**

Groups by day:
```
TODAY (Wed Dec 25)
├── 9:00 AM - Morning Hike (4 bookings, 12 guests)
└── 2:00 PM - Sunset Tour (6 bookings, 18 guests)

TOMORROW (Thu Dec 26)
├── 10:00 AM - City Walk (3 bookings, 8 guests)
└── ...

FRIDAY DEC 27
└── ...
```

Each day section:
- Total bookings / guests / revenue
- Warnings if any need action
- Quick link to manifest view

#### 3.6 Today View

**File: `apps/crm/src/components/bookings/views/today-view.tsx`**

Timeline format:
```
◉ 9:00 AM ─────────────────────────
  Morning Hike • 4 bookings • 12 guests
  Guide: Sarah M. ✓
  [View Manifest] [Check In]

◉ 2:00 PM ─────────────────────────
  Sunset Kayak • 6 bookings • 18 guests
  Guide: Pending ⚠️
  [View Manifest] [Assign Guide]
```

### Phase 4: Filter Improvements (All Bookings View)

Replace dropdowns with:

#### 4.1 Filter Pills/Chips

```tsx
<FilterBar>
  <FilterGroup label="Status">
    <FilterChip active={status === 'pending'}>Pending</FilterChip>
    <FilterChip active={status === 'confirmed'}>Confirmed</FilterChip>
    <FilterChip active={status === 'completed'}>Completed</FilterChip>
  </FilterGroup>

  <FilterGroup label="Payment">
    <FilterChip active={payment === 'pending'}>Unpaid</FilterChip>
    <FilterChip active={payment === 'paid'}>Paid</FilterChip>
  </FilterGroup>

  <FilterGroup label="Time">
    <FilterChip>Today</FilterChip>
    <FilterChip>This Week</FilterChip>
    <FilterChip>This Month</FilterChip>
  </FilterGroup>
</FilterBar>
```

#### 4.2 Quick Filter Presets

```tsx
<QuickFilters>
  <Preset icon="🔴" label="Needs Attention" filters={{ status: 'pending', upcoming: true }} />
  <Preset icon="💰" label="Unpaid" filters={{ paymentStatus: 'pending' }} />
  <Preset icon="📅" label="This Week" filters={{ dateRange: 'week' }} />
  <Preset icon="✅" label="Confirmed Today" filters={{ status: 'confirmed', date: 'today' }} />
</QuickFilters>
```

### Phase 5: Summary Stats Enhancement

Current stats are just numbers. Enhance to be actionable:

```tsx
<StatsBar>
  <Stat
    value={12}
    label="Need Action"
    trend="up"
    variant="warning"
    onClick={() => setView('needs-action')}
  />
  <Stat
    value={8}
    label="Today"
    variant="info"
    onClick={() => setView('today')}
  />
  <Stat
    value={34}
    label="This Week"
  />
  <Stat
    value="$4,230"
    label="Week Revenue"
    variant="success"
  />
</StatsBar>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` | Switch to Needs Action view |
| `2` | Switch to Upcoming view |
| `3` | Switch to Today view |
| `4` | Switch to All Bookings view |
| `j/k` | Navigate up/down in list |
| `c` | Confirm selected booking |
| `x` | Cancel selected booking |
| `e` | Edit selected booking |
| `Enter` | Open booking details |
| `Cmd+B` | Quick Book (existing) |

---

## Data Requirements

### New Service Methods

```typescript
// Determine urgency level for a booking
function getBookingUrgency(booking: BookingWithRelations): UrgencyLevel {
  const tourDate = booking.schedule?.startsAt;
  const hoursUntilTour = differenceInHours(tourDate, new Date());

  const hasIssue = booking.status === 'pending' || booking.paymentStatus !== 'paid';

  if (hoursUntilTour <= 24 && hasIssue) return 'critical';
  if (hoursUntilTour <= 48 && hasIssue) return 'high';
  if (hoursUntilTour <= 168 && hasIssue) return 'medium'; // 7 days
  if (hasIssue) return 'normal';
  if (tourDate < new Date()) return 'muted';
  return 'none';
}
```

### Performance Considerations

1. **Single Query Optimization**: Fetch all needed data in one query, group client-side
2. **Cache Views**: Each view is a separate query, cache independently
3. **Incremental Updates**: Use tRPC subscriptions for real-time count updates
4. **Virtual Scrolling**: For large booking lists

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/services/src/booking-service.ts` | MODIFY | Add getGroupedByUrgency, getNeedsAction, getUpcoming |
| `apps/crm/src/server/routers/booking.ts` | MODIFY | Add new endpoints |
| `apps/crm/src/components/bookings/booking-view-tabs.tsx` | CREATE | View tab navigation |
| `apps/crm/src/components/bookings/urgency-section.tsx` | CREATE | Collapsible urgency groups |
| `apps/crm/src/components/bookings/booking-row.tsx` | CREATE | Enhanced booking row |
| `apps/crm/src/components/bookings/views/needs-action-view.tsx` | CREATE | Needs action view |
| `apps/crm/src/components/bookings/views/upcoming-view.tsx` | CREATE | Upcoming view |
| `apps/crm/src/components/bookings/views/today-view.tsx` | CREATE | Today view |
| `apps/crm/src/components/bookings/filter-bar.tsx` | CREATE | Filter chips/pills |
| `apps/crm/src/app/org/[slug]/(dashboard)/bookings/page.tsx` | REWRITE | Orchestrate new views |

---

## Success Metrics

1. **Time to Zero** - How quickly can an operator clear all "needs action" items?
2. **Missed Bookings** - Reduction in unconfirmed bookings for same-day tours
3. **Payment Collection** - Increase in pre-tour payment collection rate
4. **Page Efficiency** - Fewer clicks to perform common operations

---

## Visual Reference

### Before (Current)
```
┌────────────────────────────────────────┐
│ Bookings                    [Quick Book]│
├────────────────────────────────────────┤
│ [Search...] [Status ▾] [Payment ▾]     │
├────────────────────────────────────────┤
│ ☐ | #REF | Customer | Tour | Status... │
│ ☐ | BK-1 | John     | Hike | Pending   │
│ ☐ | BK-2 | Sarah    | Tour | Confirmed │
│ ☐ | BK-3 | Mike     | Sail | Pending   │
│ ... (flat list, no hierarchy)          │
└────────────────────────────────────────┘
```

### After (Redesigned)
```
┌────────────────────────────────────────────────┐
│ Bookings                          [Quick Book] │
├────────────────────────────────────────────────┤
│ [Needs Action(12)] [Upcoming] [Today] [All]    │
├────────────────────────────────────────────────┤
│ 🔴 CRITICAL - 2 bookings need immediate action │
│ ├── Sarah J. • Kayak TODAY 2PM • Unconfirmed  │
│ └── Mike C. • Hike TOMORROW • Unpaid          │
│                                                │
│ 🟡 PENDING CONFIRMATION - 5 bookings           │
│ └── [Confirm All 5]                           │
│                                                │
│ 🟢 READY - 24 bookings (collapsed)            │
└────────────────────────────────────────────────┘
```
