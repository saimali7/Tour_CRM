# First-Principles CRM Design

## Core Truth: What Is a Tour CRM?

A tour CRM is **not** a database viewer. It's an **operations cockpit** that answers:
1. What needs my attention RIGHT NOW?
2. What's happening TODAY?
3. How do I complete this task in < 60 seconds?

## User Personas & Time Allocation

| Persona | Primary Tasks | Time % |
|---------|--------------|--------|
| **Booking Agent** | Create bookings, answer phones, modify reservations | 60% |
| **Ops Manager** | Assign guides, check capacity, handle issues | 25% |
| **Owner/Admin** | Review metrics, make decisions, configure | 15% |

## The 60-Second Rule

Every common operation must complete in under 60 seconds:
- Phone booking: Customer calls → booking confirmed → 60 seconds
- Availability check: Question → answer → 10 seconds
- Guide assignment: View schedule → assign guide → 15 seconds

## Information Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│  ATTENTION LAYER (Header)                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Logo]  [⌘K Search]          [🔔 Notifications] [👤 User]  ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  NAVIGATION (Sidebar - 8 items max)                              │
│  ┌──────────┐                                                    │
│  │ PRIMARY  │ ← 80% of daily use                                │
│  │ ──────── │                                                    │
│  │ Today    │ Operations dashboard                               │
│  │ Calendar │ Unified schedule view                              │
│  │ Bookings │ Reservation management                             │
│  │          │                                                    │
│  │ MANAGE   │ ← Weekly/setup tasks                              │
│  │ ──────── │                                                    │
│  │ Tours    │ Product catalog                                    │
│  │ Customers│ Customer database                                  │
│  │ Guides   │ Staff management                                   │
│  │          │                                                    │
│  │ INSIGHTS │ ← Analysis/review                                 │
│  │ ──────── │                                                    │
│  │ Analytics│ All metrics & reports                              │
│  │          │                                                    │
│  │ ──────── │                                                    │
│  │ Settings │ Configuration                                      │
│  └──────────┘                                                    │
├─────────────────────────────────────────────────────────────────┤
│  CONTENT AREA                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Page content with density-aware spacing                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Visual Hierarchy Principles

### 1. Attention Gradient
```
CRITICAL (Red)     → Requires immediate action (unassigned guide TODAY)
WARNING (Amber)    → Needs attention soon (low bookings in 3 days)
INFO (Blue)        → Informational (tour starting soon)
SUCCESS (Green)    → Positive confirmation (all clear)
MUTED (Grey)       → Secondary information
```

### 2. Density Modes
```
┌─────────────────────────────────────────────────────────────────┐
│ COMFORTABLE (Default)                                            │
│ - Page padding: 24px                                             │
│ - Section gaps: 24px                                             │
│ - Table rows: 56px                                               │
│ - Best for: New users, large screens                             │
├─────────────────────────────────────────────────────────────────┤
│ COMPACT                                                          │
│ - Page padding: 16px                                             │
│ - Section gaps: 16px                                             │
│ - Table rows: 44px                                               │
│ - Best for: Daily operations, medium screens                     │
├─────────────────────────────────────────────────────────────────┤
│ DENSE                                                            │
│ - Page padding: 12px                                             │
│ - Section gaps: 12px                                             │
│ - Table rows: 36px                                               │
│ - Best for: Power users, data-heavy views                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Component Patterns

**Stats Display (NOT cards, inline bar):**
```
Before: [📊 Card] [📊 Card] [📊 Card] [📊 Card]  ← 120px height
After:  Total: 156 · Pending: 23 · Revenue: $12.4K · Guests: 89  ← 32px height
```

**Filters (Collapsible, single row):**
```
Before: [Search bar on row 1]
        [Status chips on row 2]
        [Payment chips on row 3]  ← 120px+ height

After:  [🔍 Search...] [Status ▾] [Payment ▾] [More ▾]  ← 40px height
```

**Actions (Contextual, not cluttered):**
```
Before: [View] [Edit] [Confirm] [Cancel] [Email]  ← Always visible
After:  [Primary Action] [...More]  ← Primary visible, rest in menu
```

## Page-Specific Design

### Today (Dashboard)
- **Purpose**: Answer "What do I need to do RIGHT NOW?"
- **NO business metrics** (that's Analytics)
- **Content**:
  1. Alert banner (if anything critical)
  2. Today's schedule timeline
  3. Quick actions panel
  4. Recent activity (collapsed by default)

### Calendar
- **Purpose**: Visual schedule management
- **Default view**: Month calendar with all tours
- **Secondary**: Heatmap for capacity analysis
- **Interaction**: Click date → see schedules → click schedule → side panel

### Bookings
- **Purpose**: Fast booking management
- **Single "Book" button** → Opens Quick Book sheet
- **Compact table** with inline status changes
- **Bulk actions** via selection

### Analytics
- **Purpose**: All business intelligence in one place
- **Tabs**: Overview, Revenue, Bookings, Customers, Guides
- **Replaces**: Dashboard Business tab + Reports page

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ K` | Global search / command palette |
| `⌘ B` | Quick Book (new booking) |
| `⌘ /` | Keyboard shortcuts help |
| `⌘ \` | Toggle sidebar |
| `G T` | Go to Today |
| `G C` | Go to Calendar |
| `G B` | Go to Bookings |
| `?` | Context help |

## Booking Reference Format

```
Format: [TOUR][MMDD][SEQ]
Example: SAF-1218-001

Components:
- TOUR: 3-letter tour code (auto-generated from name)
- MMDD: Month and day
- SEQ: Daily sequence (001-999)

Benefits:
- Phonetically clear
- 11 characters max
- Contains date context
- Easy to dictate
```

## Customer Data Priority

For tour operations, contact priority is:
1. **Phone** (primary - for day-of coordination)
2. **First Name** (required - for personal service)
3. **Email** (optional - for confirmations)
4. **Last Name** (optional - often unknown for phone bookings)

## Mobile-First Considerations

- All tables must have mobile card view alternative
- Slide-over panels instead of full-page navigation
- Touch targets: minimum 44px
- Swipe actions for common operations
