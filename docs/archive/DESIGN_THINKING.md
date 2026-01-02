# Design Thinking: Tour CRM Interface Design

## Philosophy

**Core Principle**: Design for operator workflows, not data categories.

The difference between good and great software UI is whether it was designed around *what users do* versus *what data exists*. Most enterprise software makes the mistake of organizing screens by database tables. Great software organizes screens by user intent.

---

## The Design Process

### Step 1: Identify User Intents

Before touching any UI, ask: **"Why does the user open this screen?"**

Users don't open screens to "view data." They open screens to accomplish something. Map the intents:

| Intent | Frequency | Time Pressure | Implication |
|--------|-----------|---------------|-------------|
| Take Action | High | High | Actions must be 1-click away |
| Answer Question | Medium | Immediate | Information must be scannable |
| Prepare for Task | Medium | Low | Details must be accessible |
| Audit/Review | Low | None | History must be available |

**Design for the highest-frequency, highest-pressure intent first.**

### Step 2: Define Information Hierarchy

Not all information is equal. Create tiers based on how quickly users need to recognize each piece:

| Tier | Recognition Time | Content Type |
|------|------------------|--------------|
| **Tier 1** | < 0.5 seconds | Identity (WHO), Primary Action (WHAT to do) |
| **Tier 2** | 1-2 seconds | Context (WHEN, WHERE), Alerts (WARNINGS) |
| **Tier 3** | On demand | Supporting details, history, metadata |

**Rule**: Tier 1 information should be visible without any interaction. Tier 3 information can be collapsed or paginated.

### Step 3: Eliminate Redundancy

Every piece of information should appear **exactly once** in its most useful context.

**Anti-pattern**: Showing "Balance: $222.50" in a status card AND in a payment details section.

**Correct pattern**: Show balance once in the status area. Payment section shows history, not summary.

### Step 4: Compress Empty States

Empty states should not occupy prime real estate. They represent *absence* of information—don't let absence dominate presence.

| Bad | Good |
|-----|------|
| Large card with icon: "No guide assigned" | Single line: "No guide" + [Assign] button |
| Full section: "No activity recorded yet" | Collapsed: "Activity (0)" or hidden entirely |

### Step 5: Surface Action Items

If something needs attention, make it **impossible to miss**. Don't rely on users to interpret status badges—tell them explicitly what needs to happen.

**Anti-pattern**: Yellow "Pending" badge that user must interpret.

**Correct pattern**: Explicit "3 actions needed" with clickable items: Confirm, Collect $223, Assign guide.

---

## Case Study: Booking Detail Page

### Before: Data-Centric Design

The original page was organized by data category:
- Status section (booking status)
- Payment section (payment details)
- Guest section (participant list)
- Guide section (assignments)
- Activity section (timeline)

**Problems**:
1. Operator had to mentally synthesize "what needs to happen"
2. Balance shown twice (status card + payment section)
3. Empty states dominated the page
4. Actions buried in sidebar requiring scroll
5. No clear visual hierarchy—everything looked equally important

### After: Intent-Centric Design

Reorganized by operator workflow:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: WHO is this? + Primary Action                       │
│ Test Customer | 555-5555 | [Confirm Booking]                │
├─────────────────────────────────────────────────────────────┤
│ CONTEXT: WHAT tour? WHEN?                                   │
│ Alcatraz Night Tour | Sat, Dec 27 | 6:30 PM | 3 guests      │
├─────────────────────────────────────────────────────────────┤
│ STATUS BAR: Key metrics in one scannable row                │
│ [●] Pending                              Balance: $222.50   │
├─────────────────────────────────────────────────────────────┤
│ ACTION ITEMS: What needs to happen? (disappears when done)  │
│ [3 actions] [Confirm →] [$223 due →] [No guide →]           │
├─────────────────────────────────────────────────────────────┤
│ DETAILS: Collapsible sections for supporting info           │
│ Guests (3) | Guide | Activity | Payments                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. Customer Name as Primary Element
**Why**: Operators answer phone calls. First question: "Who is this booking for?"
**How**: 28px bold heading, larger than anything else on page.

#### 2. Single-Row Status Bar
**Why**: Status and balance are the two most critical metrics. Both should be visible in one glance.
**How**: Flexbox row with status left, balance right. No cards, no vertical stacking.

#### 3. Action Items as Chips
**Why**: Actions should be explicit, not inferred from status badges.
**How**: Horizontal chips that are directly clickable. Color-coded by type. Disappear when resolved.

#### 4. Collapsible Sections
**Why**: Details are Tier 3—needed occasionally, not always.
**How**: Sections start collapsed (except guests with special needs). Expand on click.

#### 5. No Redundant Information
**Why**: Showing balance in two places creates visual noise and cognitive overhead.
**How**: Balance appears in status bar only. Payment section shows history, not summary.

---

## Design Tokens

### Visual Hierarchy

```
Tier 1 (Instant Recognition):
- Font: 24-28px, bold, text-foreground
- Spacing: Generous padding, visual separation

Tier 2 (Quick Context):
- Font: 14px, medium weight, text-foreground
- Spacing: Compact, inline elements

Tier 3 (On Demand):
- Font: 12-14px, normal weight, text-muted-foreground
- Spacing: Collapsed by default
```

### Status Colors

```
Action Required (Pending):   Amber  - bg-amber-50, text-amber-700
Success (Confirmed/Paid):    Green  - bg-emerald-50, text-emerald-700
Neutral (Completed):         Slate  - bg-slate-50, text-slate-600
Destructive (Cancelled):     Red    - bg-red-50, text-red-700
Informational (Guide):       Blue   - bg-blue-50, text-blue-700
```

### Spacing Scale

```
Tight:    gap-2, space-y-2   (8px)  - Within components
Normal:   gap-3, space-y-3   (12px) - Between related items
Relaxed:  gap-4, space-y-4   (16px) - Between sections
Generous: gap-6, space-y-6   (24px) - Major section breaks
```

---

## Checklist for New Screens

Before designing any new screen, answer:

### 1. Intent Analysis
- [ ] What are the 3-4 reasons a user opens this screen?
- [ ] Which intent is highest frequency?
- [ ] Which intent has highest time pressure?

### 2. Information Hierarchy
- [ ] What information needs instant recognition (< 0.5s)?
- [ ] What information provides context (1-2s)?
- [ ] What information is supporting detail (on demand)?

### 3. Action Audit
- [ ] What actions can users take from this screen?
- [ ] Are high-frequency actions 1 click away?
- [ ] Are dangerous actions appropriately guarded?

### 4. Redundancy Check
- [ ] Is any information shown more than once?
- [ ] If yes, can it be consolidated?

### 5. Empty State Review
- [ ] How does each section look when empty?
- [ ] Do empty states occupy too much space?
- [ ] Can empty sections be collapsed or hidden?

### 6. Mobile Consideration
- [ ] Does the layout work on 375px width?
- [ ] Are touch targets at least 44px?
- [ ] Is critical info visible without scroll?

---

## Case Study: Dashboard Redesign

Following the same principles applied to the booking detail page, the dashboard was redesigned to prioritize action over data display.

### User Intents for Dashboard
1. **See what needs attention TODAY** (highest frequency, highest pressure)
2. **Get quick overview of business health** (daily ritual)
3. **Navigate to specific booking/tour** (medium frequency)
4. **Review performance metrics** (weekly/monthly)

### Implemented Dashboard Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Good morning | Dec 28            [Quick Book]       │
├─────────────────────────────────────────────────────────────┤
│ METRICS BAR: Single-row business health (Tier 2)            │
│ $1.2k today (+5%) | $8.5k week | 4 bookings · 12 guests     │
├─────────────────────────────────────────────────────────────┤
│ ACTION BAR: Horizontal chips (Tier 1 - Actions)             │
│ [⚠ 3 actions] [Confirm 5 →] [$2,500 due →] [Assign 2 →]     │
├─────────────────────────────────────────────────────────────┤
│ TODAY'S TOURS: Compact section header                       │
│ 2 tours                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 9:00 AM | Alcatraz Tour                    [Manifest]   │ │
│ │ 12/15 guests ████████████░░░ ✓ Guide assigned           │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ ● John Smith #ABC123 | 3 guests | 555-1234    $125 Ready│ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ TOMORROW: 3 bookings · 8 guests           [Calendar →]      │
│ $450 expected | 2 tours                                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Components Created

| Component | Purpose | Design Pattern |
|-----------|---------|----------------|
| `MetricsBar` | Single-row business health | Tier 2: Context at a glance |
| `ActionBar` | Horizontal action chips | Tier 1: Actions not data |
| `TodaysFocus` | Grouped tours with bookings | Tier 3: Details on demand |
| `TomorrowPreview` | Compressed preview section | Tier 3: Planning ahead |

### Design Decisions Applied

1. **Eliminated Redundancy**: Removed duplicate action bars from sub-components since dashboard now has a unified `ActionBar`
2. **Compressed Empty States**: Empty sections now use single-line messages instead of large cards
3. **Single-Row Metrics**: Business health displayed in one scannable row, not a 4-column grid
4. **Consistent Section Headers**: All sections use the same `text-xs font-semibold text-muted-foreground uppercase tracking-wider` pattern

---

## Summary

**The fundamental shift**: From "here's your data, organized by type" to "here's what you need to know and do, organized by urgency."

This creates interfaces that feel like they understand the user's job, not just their data model.
