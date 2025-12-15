# UI/UX Design Principles

**For Tour CRM - A Multi-Tenant Tour Operations Platform**

> *"Good design is as little design as possible."* — Dieter Rams

This document establishes the foundational design philosophy for the Tour CRM. It draws from timeless design principles and applies them to the specific context of tour operations software.

---

## Part I: Learning from the Greats

### Dieter Rams' Ten Principles Applied

Dieter Rams, the legendary industrial designer at Braun, created ten principles of good design that remain the gold standard. Here's how they translate to our CRM:

| Rams' Principle | Application to Tour CRM |
|-----------------|-------------------------|
| **Good design is innovative** | Use modern patterns (command palette, slide-overs) that solve old problems in new ways. Don't copy legacy tourism software. |
| **Good design makes a product useful** | Every feature must serve a real tour operator workflow. No feature tourism. |
| **Good design is aesthetic** | Visual harmony creates trust. Tour operators sell experiences—their tools should feel premium. |
| **Good design makes a product understandable** | A new staff member should book a tour in under 2 minutes without training. |
| **Good design is unobtrusive** | The CRM should feel invisible—it's a tool, not a destination. Get in, get out. |
| **Good design is honest** | Don't hide system state. Show loading, errors, success. Never lie about capacity or availability. |
| **Good design is long-lasting** | Avoid trendy UI. Classic patterns age better. No gradients, no shadows, no skeuomorphism. |
| **Good design is thorough** | Every state (empty, loading, error, success) should be designed. Edge cases matter. |
| **Good design is environmentally friendly** | Fast load times, minimal data transfer, efficient queries. Respect the user's time and bandwidth. |
| **Good design is as little design as possible** | Remove everything unnecessary. Every pixel must earn its place. |

### Don Norman's Design of Everyday Things

Don Norman's principles of human-centered design tell us that good interfaces communicate clearly:

**Affordances** — UI elements should suggest their function
- Buttons look pressable (subtle shadow, cursor change)
- Input fields have clear boundaries
- Draggable items have grab handles
- Links are distinguishable from plain text

**Signifiers** — Clear indicators for where actions are possible
- Hover states show interactivity
- Active navigation items are clearly marked
- Form validation shows in real-time
- Available vs unavailable options are visually distinct

**Feedback** — Every action has a visible response
- Button press shows loading state
- Form submission confirms success
- Errors explain what went wrong and how to fix
- Background processes show progress

**Conceptual Models** — Users understand how the system works
- Booking flow mirrors real-world conversation: "Who? When? What?"
- Schedule = specific tour at specific time (not abstract)
- Customer = person, not account (name, not ID)

**Constraints** — Design prevents errors
- Can't book more than capacity
- Past dates disabled in date picker
- Destructive actions require confirmation
- Unsaved changes prompt before navigation

### Jony Ive's Simplicity Hierarchy

Apple's former design chief taught us that simplicity is not the absence of complexity—it's the successful management of it:

1. **Reduction** — Remove features that don't earn their place
2. **Organization** — Group related items, hide complexity behind progressive disclosure
3. **Time** — Reduce time to complete tasks, not just clicks
4. **Learning** — Make the easy path the right path

Applied to Tour CRM:
- Dashboard shows what needs attention NOW, not everything
- Advanced settings hidden by default, revealed when needed
- Booking flow: 3 steps max, each with clear purpose
- Consistent patterns so learning transfers across pages

### Ryan Singer's Shape Up / Jobs to Be Done

Basecamp's Shape Up methodology teaches us to think in terms of what users are trying to accomplish:

> Users don't want a CRM. They want to run a successful tour business with less stress.

**Jobs Tour Operators Hire Our CRM to Do:**

| Job | Emotional Dimension | Success Criteria |
|-----|---------------------|------------------|
| "Book a walk-in customer while they wait" | Confidence, speed | < 60 seconds, no errors |
| "Know if tomorrow is under control" | Peace of mind, preparedness | Glanceable dashboard |
| "Find that customer who called last week" | Competence, professionalism | < 5 seconds search |
| "Make sure guides know their assignments" | Trust, reliability | Zero manual follow-ups needed |
| "Understand if the business is healthy" | Security, control | Clear metrics, no ambiguity |

### Modern SaaS Excellence: Linear, Stripe, Notion

The best modern B2B tools share common patterns:

**Speed as a Feature**
- Optimistic updates (UI responds before server confirms)
- Prefetching (load data before user clicks)
- Instant search (< 100ms response)
- No unnecessary spinners

**Keyboard-First**
- `Cmd+K` for everything
- Arrow keys for navigation
- Enter to confirm, Esc to cancel
- Single-letter shortcuts for power users

**Information Density**
- Show more data in less space
- Tables, not cards, for lists
- Inline editing where possible
- Reduce navigation, increase context

**Progressive Disclosure**
- Simple by default
- Power features revealed on demand
- Contextual actions (right-click, hover)
- Settings separated from daily workflow

---

## Part II: The Tour Operator's Reality

### Who Uses This CRM?

**Primary Users: Office Staff**
- Heavy daily use (4-8 hours)
- Phone in one hand, keyboard in other
- Multitasking constantly
- Need: Speed, reliability, keyboard access

**Secondary Users: Business Owners**
- Quick check-ins (dashboard)
- Weekly/monthly reports
- Occasional bookings
- Need: At-a-glance health metrics

**Tertiary Users: Tour Guides**
- Mobile-first access
- Before-tour manifest check
- Minimal interaction
- Need: Essential info, nothing else

### A Day in the Life

**7:00 AM — Owner checks dashboard**
- "Any problems I need to know about?"
- Wants: Critical alerts, today's overview
- Doesn't want: Noise, irrelevant stats

**9:00 AM — Staff starts day**
- Review today's schedules
- Check guide assignments
- Prepare manifests
- Wants: Everything for today in one view

**10:00 AM — Phone rings**
- "I'd like to book the sunset tour"
- While talking: search tours, find availability, create booking
- Wants: Flow that mirrors conversation

**10:15 AM — Walk-in customer**
- They're standing at the counter
- Every second matters
- Wants: Fastest possible booking path

**2:00 PM — Customer calls to change booking**
- "Can we move to Saturday?"
- Find booking, check availability, reschedule
- Wants: All options visible, quick action

**5:00 PM — End of day**
- Tomorrow's tours ready?
- Any issues to resolve?
- Wants: Peace of mind, nothing forgotten

### Pain Points of Legacy Systems

| Legacy Problem | Our Solution |
|----------------|--------------|
| Slow, bloated interfaces | Minimal UI, fast responses |
| Too many clicks for basic tasks | Command palette, keyboard shortcuts |
| Information scattered across pages | Related data shown in context |
| Confusing navigation | Flat structure, consistent patterns |
| No mobile support | Responsive design, guide portal |
| Manual communication | Automated emails, notifications |
| Unclear business health | Real-time analytics dashboard |

---

## Part III: Visual Design System

### Design Tokens

Our design system uses a token-based approach for consistency and maintainability.

#### Color Palette

```
Primary Actions & Branding
├── primary-600     #2563EB   Main interactive elements
├── primary-700     #1D4ED8   Hover states
├── primary-100     #DBEAFE   Light backgrounds
└── primary-50      #EFF6FF   Subtle highlights

Semantic Colors
├── success-600     #059669   Confirmations, positive status
├── warning-500     #F59E0B   Caution, needs attention
├── error-600       #DC2626   Errors, destructive actions
└── info-500        #3B82F6   Informational

Neutral Palette
├── gray-900        #111827   Primary text
├── gray-700        #374151   Secondary text
├── gray-500        #6B7280   Muted text, icons
├── gray-200        #E5E7EB   Borders, dividers
├── gray-100        #F3F4F6   Subtle backgrounds
└── gray-50         #F9FAFB   Page backgrounds
```

#### Typography Scale

```
Font Family: Inter (system-ui fallback)

Scale:
├── text-xs     12px / 1.5    Labels, badges
├── text-sm     14px / 1.5    Body text, inputs
├── text-base   16px / 1.5    Standard content
├── text-lg     18px / 1.5    Section headers
├── text-xl     20px / 1.4    Page titles
├── text-2xl    24px / 1.3    Major headings
└── text-3xl    30px / 1.2    Dashboard greeting

Weights:
├── normal      400           Body text
├── medium      500           Labels, emphasis
├── semibold    600           Headers
└── bold        700           Strong emphasis
```

#### Spacing Scale

```
Base unit: 4px

Scale:
├── 0     0px       None
├── 1     4px       Tight spacing
├── 2     8px       Default element spacing
├── 3     12px      Grouped elements
├── 4     16px      Card padding
├── 5     20px      Section gaps
├── 6     24px      Major sections
├── 8     32px      Page margins
├── 10    40px      Large gaps
└── 12    48px      Maximum spacing
```

#### Border Radius

```
├── rounded-none    0px       Square elements
├── rounded-sm      2px       Subtle rounding
├── rounded         4px       Default (buttons, inputs)
├── rounded-md      6px       Cards, modals
├── rounded-lg      8px       Large cards
├── rounded-xl      12px      Feature sections
└── rounded-full    9999px    Avatars, pills
```

#### Shadows

```
├── shadow-sm       Subtle lift (cards)
├── shadow          Standard elevation (dropdowns)
├── shadow-md       Medium elevation (modals)
├── shadow-lg       High elevation (popovers)
└── shadow-none     Flat elements
```

### Component Design Principles

#### Buttons

```
Hierarchy (in order of visual weight):
1. Primary   — Main action (Create Booking, Save)
2. Secondary — Alternative actions (Cancel, Back)
3. Ghost     — Tertiary actions (View, Edit)
4. Danger    — Destructive actions (Delete, Cancel Booking)

States:
├── Default   — Base appearance
├── Hover     — Subtle darkening
├── Active    — Pressed state
├── Disabled  — Reduced opacity, no interaction
└── Loading   — Spinner replaces text

Sizing:
├── sm    — Compact tables, inline actions
├── md    — Default for most uses
└── lg    — Primary page actions
```

#### Form Inputs

```
Structure:
┌─ Label (required/optional indicator) ─┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Input value                      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Helper text or error message          │
└────────────────────────────────────────┘

States:
├── Default   — Gray border
├── Focus     — Primary ring
├── Error     — Red border + error message
├── Disabled  — Grayed out, not interactive
└── Success   — Green checkmark (optional)

Best Practices:
- Labels always visible (no placeholder-only)
- Inline validation on blur
- Error messages specific and actionable
- Group related fields visually
```

#### Data Tables

```
Structure:
┌────────────────────────────────────────────────────┐
│ [Search] [Filters]              [Bulk Actions] [+] │
├────────────────────────────────────────────────────┤
│ □ Name ↓     │ Status  │ Date    │ Amount │ ···   │
├──────────────┼─────────┼─────────┼────────┼───────┤
│ □ Row data   │ Badge   │ Date    │ $00.00 │ ···   │
│ □ Row data   │ Badge   │ Date    │ $00.00 │ ···   │
├────────────────────────────────────────────────────┤
│ Showing 1-10 of 50    │  [<] [1] [2] [3] [>]      │
└────────────────────────────────────────────────────┘

Principles:
- Sortable columns with clear indicators
- Row hover highlights
- Inline actions (edit, view) on hover
- Checkbox selection for bulk operations
- Pagination for large datasets
- Empty state when no data
```

#### Cards

```
Use Cases:
├── Stat Cards   — Dashboard metrics, single number focus
├── Entity Cards — Preview of booking, customer, etc.
├── Action Cards — Quick action buttons, navigation
└── Info Cards   — Alerts, notifications, help

Structure:
┌──────────────────────────────────────┐
│ [Icon] Title           [Action btn] │
├──────────────────────────────────────┤
│                                      │
│    Content area                      │
│                                      │
├──────────────────────────────────────┤
│ Footer (optional)                    │
└──────────────────────────────────────┘
```

---

## Part IV: Interaction Patterns

### Navigation Model

```
Primary Navigation (Sidebar)
├── Dashboard        — Home base, today's overview
├── Bookings         — All bookings, search/filter
├── Customers        — Customer management
├── Tours            — Tour product catalog
├── Schedules        — Specific tour instances
├── Guides           — Guide management
├── Promo Codes      — Discount management
├── Reports          — Analytics & reporting
├── Communications   — Email/SMS logs
└── Settings         — Organization config

Secondary Navigation
├── Breadcrumbs      — Current location context
├── Tabs             — Sub-sections within pages
└── Quick Actions    — Contextual shortcuts

Tertiary Navigation
├── Command Palette  — Cmd+K global search
├── Slide-overs      — Quick view without navigation
└── Modals           — Focused tasks, confirmations
```

### The Three-Click Rule (Revisited)

The old "three-click rule" is outdated. What matters is:

> **Cognitive load per step, not click count.**

A 5-click journey with clear progression is better than a 2-click journey with confusing choices.

**Our Principle: Clear Progress Over Minimal Clicks**

Each interaction should:
1. Show clear feedback
2. Maintain context
3. Provide escape routes
4. Progress toward goal

### Interaction Feedback Hierarchy

```
Importance      Feedback Type            Example
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Critical        Modal + sound/shake      Delete confirmation
High            Toast notification       Booking created
Medium          Inline update            Status changed
Low             Subtle animation         Button pressed
Minimal         Cursor change            Hovering link
```

### Keyboard Shortcuts

```
Global (anywhere in app)
├── Cmd+K          Command palette
├── Cmd+/          Keyboard shortcuts help
└── Esc            Close modal/popover

Navigation
├── G then D       Go to Dashboard
├── G then B       Go to Bookings
├── G then C       Go to Customers
└── G then S       Go to Schedules

Actions
├── Cmd+N          New (context-aware)
├── Cmd+S          Save
├── Cmd+Enter      Submit form
└── Cmd+Backspace  Delete (with confirm)

In Lists/Tables
├── ↑/↓            Navigate rows
├── Enter          Open selected
├── Space          Toggle selection
└── /              Focus search
```

### Empty States

Every list needs a designed empty state:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Illustration]                     │
│                                                 │
│          No bookings yet                        │
│                                                 │
│   Bookings will appear here once customers      │
│   start booking tours.                          │
│                                                 │
│          [Create First Booking]                 │
│                                                 │
└─────────────────────────────────────────────────┘

Components:
1. Relevant illustration (simple, not cartoonish)
2. Clear headline
3. Brief explanation
4. Primary action to fix the empty state
```

### Loading States

```
Initial Load:
├── Skeleton screens    Preserve layout, show intent
├── Avoid spinners     Unless truly indeterminate
└── Load critical first  Progressive rendering

Background Operations:
├── Optimistic updates  UI changes before server
├── Background toast    "Saving..." → "Saved"
└── Non-blocking        User can continue working

Error Recovery:
├── Inline retry        Button to retry failed action
├── Preserve input      Don't lose user's data
└── Clear explanation   What happened, how to fix
```

---

## Part V: Page Architecture

### Standard Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Page Title]                    [Actions: + New / Export / ···] │
│ Description or subtitle                                          │
├──────────────────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3]    │                                    │
├────────────────────────────┴────────────────────────────────────┤
│                                                                  │
│  [Search...] [Status ▼] [Date ▼] [More Filters]   [Clear All]   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        Content Area                              │
│                    (table, cards, form)                          │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [Pagination]                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Detail Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to [List]                                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Title]                                    [Status Badge]        │
│ Subtitle / reference                                             │
│                                                                  │
│ [Edit] [Action 1] [Action 2] [··· More]                         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── Primary Info ────┐  ┌─── Secondary Info ─────────────────┐ │
│  │                     │  │                                    │ │
│  │  Key details        │  │  Related data                      │ │
│  │  most important     │  │  activity log                      │ │
│  │                     │  │  actions                           │ │
│  └─────────────────────┘  └────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Form Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Cancel                              [Discard] [Save Draft]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    [Create New Booking]                          │
│                    Step 2 of 3: Select Time                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │                     Form Fields                           │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─── Summary Sidebar ────────────────────────────────────────┐  │
│  │  Real-time summary of selections                          │  │
│  │  Pricing breakdown                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                               [← Previous]  [Next →]             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part VI: Specific Screen Guidelines

### Dashboard

**Purpose:** Answer "What needs my attention right now?"

**Information Hierarchy:**
1. **Critical Alerts** — Problems that need immediate action
2. **Today's Operations** — What's happening today
3. **Quick Stats** — Numbers that matter
4. **Recent Activity** — What just happened (collapsed by default)

**Design Decisions:**
- Greeting creates human connection, not just data dump
- Alerts are dismissible (user's choice)
- "All clear" state is celebratory, not empty
- Business tab is secondary (most users are operations-focused)

### Booking Flow

**Purpose:** Complete a booking in the shortest time with zero errors

**Design Decisions:**
- 3 steps max: Tour → When & Who → Customer & Pay
- Progress indicator always visible
- Real-time price calculation
- Inline customer creation (never leave the flow)
- Clear availability display (available vs full)
- Mobile-friendly number inputs for guest counts

**Critical UX:**
- Pre-fill from URL params when coming from schedule
- Remember last-used payment method
- Prevent overbooking in UI (disable, don't error)
- Phone number formats flexible

### Customer Detail

**Purpose:** Full context about a customer for any service need

**Layout:**
- Contact info prominent (click to call/email)
- Booking history in chronological order
- "Quick Book" button for repeat customers
- Communication history visible
- Notes section for important details

### Schedule Management

**Purpose:** Manage inventory (specific tour instances)

**Calendar View Principles:**
- Visual capacity indicators (color-coded)
- Click to drill down
- Drag-and-drop for rescheduling (future)
- Guide assignment visible at a glance
- "Create Schedule" quick action

### Reports

**Purpose:** Business health at a glance, drill-down for details

**Design Decisions:**
- Summary cards above detailed tables
- Date range selector prominent
- Export always available
- Charts for trends, tables for details
- Comparison periods (this week vs last week)

---

## Part VII: Accessibility Requirements

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | 4.5:1 minimum for text |
| Focus indicators | Visible focus ring on all interactive elements |
| Keyboard navigation | All functionality accessible via keyboard |
| Screen reader | Proper ARIA labels, semantic HTML |
| Touch targets | Minimum 44x44px on mobile |
| Error identification | Errors announced, not just color-coded |
| Form labels | All inputs have associated labels |
| Skip links | Skip to main content link |

### Radix UI Foundation

We use Radix UI primitives specifically for accessibility:
- Proper focus management
- ARIA attributes built-in
- Keyboard interactions standard
- Screen reader tested

---

## Part VIII: Performance Budget

### Core Web Vitals Targets

| Metric | Target | Critical |
|--------|--------|----------|
| LCP (Largest Contentful Paint) | < 2.5s | < 4.0s |
| FID (First Input Delay) | < 100ms | < 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 |

### JavaScript Budget

| Category | Budget |
|----------|--------|
| Total JS | < 300KB (gzipped) |
| Per-route chunk | < 50KB |
| Third-party | < 100KB |

### Image Guidelines

- Use WebP format
- Lazy load below-fold images
- Provide width/height to prevent CLS
- Responsive srcset for different screens

---

## Part IX: Design Review Checklist

Before shipping any new UI:

### Functionality
- [ ] Works with keyboard only
- [ ] Works with screen reader
- [ ] Works on mobile viewport
- [ ] Works with slow network (3G)
- [ ] Error states handled
- [ ] Empty states designed
- [ ] Loading states visible

### Visual
- [ ] Follows typography scale
- [ ] Follows spacing scale
- [ ] Color contrast passes
- [ ] Consistent with existing patterns
- [ ] No orphaned text (widow/orphan control)

### Interaction
- [ ] Hover states defined
- [ ] Focus states visible
- [ ] Feedback for all actions
- [ ] Confirmation for destructive actions
- [ ] Escape routes available

### Content
- [ ] Copy is concise
- [ ] Error messages actionable
- [ ] Labels clear
- [ ] Help text useful
- [ ] No jargon for users

---

## Part X: Design Anti-Patterns

Things we explicitly avoid:

### Visual Anti-Patterns
- **Gradients** — Date quickly, add visual noise
- **Drop shadows everywhere** — Flat design with subtle elevation only
- **Rounded everything** — Cards and buttons rounded, inputs subtle
- **Icon-only buttons** — Always include text for clarity
- **Carousel/slider** — Users miss content, frustrating on mobile

### Interaction Anti-Patterns
- **Modal on modal** — One modal at a time
- **Auto-advance forms** — User controls pace
- **Infinite scroll for tables** — Pagination preferred
- **Confirmation for non-destructive actions** — Only confirm destructive
- **Required fields marked** — Mark optional instead (most are required)

### Content Anti-Patterns
- **Lorem ipsum** — Always use realistic content
- **"Click here"** — Descriptive link text
- **"Something went wrong"** — Specific error messages
- **ALL CAPS labels** — Sentence case preferred
- **Exclamation points!!!** — Calm, professional tone

---

## Conclusion

Great design is invisible. Users shouldn't notice the interface—they should accomplish their goals. Every decision in this CRM should ask:

1. **Does this help a tour operator run their business?**
2. **Is this the simplest solution?**
3. **Would Dieter Rams remove anything?**
4. **Would Don Norman understand it without explanation?**

The best compliment for this CRM is: "It just works."

---

## Part XI: Design Patterns from Industry Examples

*Extracted from analysis of modern SaaS designs, including finance dashboards, team collaboration tools, and developer platforms.*

### Dashboard Design Patterns

#### Metric Cards with Trend Indicators
```
┌─────────────────────────────────┐
│ ● Total Balance                 │
│                                 │
│   $8,800                        │
│   +3.1% vs last month           │
│   ▁▂▃▄▅▆▇█▇▆ (sparkline)       │
└─────────────────────────────────┘

Key Principles:
├── Color-coded trends (green = positive, red = negative)
├── Comparison context ("vs last month", "vs last week")
├── Optional sparkline for trend visualization
├── Icon/dot indicator for category identification
└── Consistent card sizing for visual rhythm
```

#### Three-Column Metric Row
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Balance│ │    Income    │ │   Expense    │
│   $8,800     │ │   $12,600    │ │   $12,600    │
│   +3.1% ↑    │ │   +2.1% ↑    │ │   -3.2% ↓    │
└──────────────┘ └──────────────┘ └──────────────┘

Best Practices:
├── Limit to 3-4 metrics per row
├── Most important metric first (left)
├── Consistent number formatting
├── Use color sparingly (only for trends)
└── Equal spacing between cards
```

#### Chart with Data Overlay
```
┌─────────────────────────────────────────────┐
│ ● Usage Category            Yearly ▼  ···   │
│   $15,200 total transactions                │
│                            ┌─────┐          │
│         30k ─              │$28k │          │
│         20k ─          ▓▓  │     │          │
│         10k ─      ▓▓  ▓▓  └─────┘          │
│          0k ─  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓          │
│              Jan Feb Mar Apr May Jun        │
└─────────────────────────────────────────────┘

Principles:
├── Summary value above chart
├── Hover tooltip shows exact value
├── Subtle grid lines (not distracting)
├── Highlighted current/selected period
├── Period selector in card header
└── Overflow menu for additional options
```

### Sidebar Navigation Patterns

#### Grouped Navigation with Sections
```
┌─────────────────────────────┐
│ ■ Acme Inc.            ☐    │
│ ○ Search                XP  │
├─────────────────────────────┤
│ Main Menu               ∧   │
│   ■ Dashboard               │
│   ▢ Wallet                  │
│   ▢ Cards                   │
│   ▢ Transactions       (6)  │
│   ▢ Budget                  │
│   ▢ Goals                   │
├─────────────────────────────┤
│ Analytics               ∧   │
│   ▢ Analytics               │
│   ▢ Cash Flow          (2)  │
│   ▢ Investments             │
├─────────────────────────────┤
│ Others                  ∧   │
│   ▢ Help Center             │
│   ⚙ Settings                │
└─────────────────────────────┘

Principles:
├── Collapsible sections reduce cognitive load
├── Badge counts for items needing attention
├── Active state clearly highlighted
├── Icons provide visual anchors
├── Workspace/org switcher at top
└── Search prominently placed
```

#### Team Collaboration Sidebar
```
┌─────────────────────────────┐
│ 🗨 Chat                 ⚙   │
│ ○ Unread  DMs  Favorites    │
├─────────────────────────────┤
│ 🔔 Notifications       (12) │
│ ✓ Projects                  │
│ @ Mention                   │
│ 📅 Calendar                 │
│ ✨ Try Magic AI             │
├─────────────────────────────┤
│ Favorites               ∧   │
│   👥 All Hands              │
│   📁 Marketing              │
│      Justin                 │
│      Michael                │
│   📄 Doc 2.0                │
├─────────────────────────────┤
│ Direct Messages        ○    │
│   Sarah                     │
│   Justin                    │
│   Michael                   │
│   + New messages            │
└─────────────────────────────┘

Principles:
├── Quick filter tabs (Unread, DMs, Favorites)
├── Promote AI features subtly (not intrusive)
├── Online status indicators for people
├── Recent/frequent items in Favorites
├── Clear visual hierarchy (bold = unread)
└── Action to add new items inline
```

### Data Visualization Patterns

#### Dark Theme Analytics Dashboard
```
Best suited for:
├── Data-heavy environments
├── Financial/trading applications
├── Long-session monitoring
└── Professional/power user contexts

Color Strategy:
├── Background: #0F0F0F to #1A1A1A
├── Cards: #1F1F1F with subtle borders
├── Text: #FFFFFF (primary), #A0A0A0 (secondary)
├── Accent: Cyan (#00D4FF) for highlights
├── Chart colors: Distinct, accessible palette
└── Status: Green (#10B981), Red (#EF4444), Yellow (#F59E0B)

Key Elements:
├── AI-generated insights ("Your financial health improved 3.5%")
├── Geographic visualizations (world map heatmaps)
├── Customer segmentation donut charts
├── Multi-metric KPI grids
└── Stacked bar charts for comparisons
```

#### Metric Grid Layout
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Active Sales    │ │ Conversion Rate │ │ Customer Ret.   │
│ $24,450.00      │ │      78%        │ │      84%        │
│ +8,000 vs month │ │  New Sales ███  │ │  ▓▓▓▓▓▓▓▓░░░   │
│                 │ │  Old Sales ░░░  │ │  10,000/12,000  │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Principles:
├── 3-column grid for key metrics
├── Each card has: label, value, context
├── Mini visualizations within cards
├── Consistent height alignment
└── Secondary metrics below primary
```

### Input & Form Patterns

#### File Attachment Chips
```
Default State:
┌──────────────────────────────────────────────────────┐
│ [contract-agreement... ×] [cloud.png ×] [sheet ×]   │
├──────────────────────────────────────────────────────┤
│ Add instructions from attached images...             │
│                                                      │
│ [📎] [✂] [○] [⟳]              [🔮 GPT 5.0]    [🎤] │
└──────────────────────────────────────────────────────┘

Hovered State (shows preview):
┌────────────────────────────────────┐
│ contract-agreement brief.pdf       │
│ PDF · 2.3MB · 93 LINES            │
├────────────────────────────────────┤
│ ✨ Summary by AI                   │
│                                    │
│ Rico and Wolfgang Agreement        │
│ This Service Agreement...          │
│                                    │
│ 1. Services                        │
│ Provider agrees to perform...      │
└────────────────────────────────────┘

Principles:
├── File type icons for recognition
├── Truncate long names with ellipsis
├── Remove (×) button always visible
├── Hover reveals full details + AI summary
├── Support multiple file types visually
└── Clear affordance for adding more
```

### Conversation & Activity Patterns

#### Thread-Based Communication
```
┌─────────────────────────────────────────────────────────┐
│ Chat / 📁 Marketing / Conversation                      │
├─────────────────────────────────────────────────────────┤
│ [Conversation] [Team] [Docs] [Meetings] [Projects]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🧑 Jack Doe · Yesterday at 07:13 PM                    │
│ ● Hey team, just a reminder to prepare updates...       │
│                                                         │
│   ┌────────────────────────────────────────┐            │
│   │ 📅 Weekly team catchup                 │            │
│   │    May 23 · 12:00 PM - 01:00 PM       │            │
│   └────────────────────────────────────────┘            │
│                                                         │
│ 📞 Call started · Today at 07:45 AM                    │
│    🧑 Ramie, David Bower, Lucas joined the call        │
│                                                         │
│ Today  [💬 Ask AI to Catch Up]                         │
│                                                         │
│ 🧑 David Bower · 07:13 PM                              │
│ Here are the latest animations for review...            │
│   ┌─────────────────┐ ┌─────────────────┐              │
│   │ animation-1.json│ │ animation-2.json│              │
│   │ 1.2 MB ● Uploaded│ │ 1.2 MB ● Uploaded             │
│   └─────────────────┘ └─────────────────┘              │
│   💬 14 replies · 3 unread replies                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

Principles:
├── Breadcrumb shows context (Chat / Team / Channel)
├── Tab navigation for related views
├── Timestamps grouped by day ("Today", "Yesterday")
├── Rich embeds for meetings, files, links
├── Thread replies collapsed with count
├── AI integration for catch-up assistance
├── File attachments show upload status
├── Code blocks syntax highlighted
└── Avatar + name + time for attribution
```

### Mobile App Patterns

#### Repository/Entity List
```
┌─────────────────────────────────────┐
│ 9:41                    📶 ⚡ 🔋    │
├─────────────────────────────────────┤
│ ◀ websiteproject  [Private]    ≡    │
│ < Code  ○ Issues  ⑂ Pull requests   │
├─────────────────────────────────────┤
│ websiteproject                      │
│ vercel.com/website-project          │
│                                     │
│ 👤 heyzico design    Initial Commit │
│    @bar12n · ● 3 to commits         │
│                                     │
│ 📁 images                  2 days ago│
│ 📁 docs                    2 days ago│
│ 📄 Dockerfile              2 days ago│
│ 📄 .gitignore              2 days ago│
│ 📄 package.json            2 days ago│
│ 📄 vite.config.js          2 days ago│
│                                     │
│           Show more                 │
│                                     │
│ 📄 README.md                    ⋮ ✏ │
└─────────────────────────────────────┘

Principles:
├── Status bar integration (time, battery)
├── Navigation tabs with icons
├── Entity type icons (folder, file)
├── Relative timestamps ("2 days ago")
├── "Show more" for progressive disclosure
├── Inline actions (expand, edit)
└── Private/Public badge visibility
```

#### Promotional Modal/Card
```
┌─────────────────────────────────────┐
│                                     │
│              ✨ Speed workflows     │
│                 Suggest docs        │
│              Auto-complete code     │
│               Generate functions    │
│              Suggest algorithms     │
│                                     │
│              🤖                     │
│         I'm GitHub Copilot          │
│   Ask me about anything in your     │
│              project                │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│   Meet the new GitHub Copilot       │
│                                     │
│   GitHub Copilot is an AI-powered   │
│   coding assistant that suggests    │
│   code instantly.                   │
│                                     │
│         [     Try it     ]          │
│                                     │
│          Learn more ↗               │
│                                     │
└─────────────────────────────────────┘

Principles:
├── Feature list with subtle icons
├── Mascot/avatar for personality
├── Clear value proposition headline
├── Brief supporting description
├── Primary CTA button prominent
├── Secondary link for more info
├── Generous whitespace
└── Can be dismissed (not blocking)
```

### Design Tokens from Analysis

#### Recommended Additions to Our System

```css
/* Trend Colors */
--trend-positive: hsl(160 84% 39%);       /* Green for positive */
--trend-negative: hsl(0 72% 51%);         /* Red for negative */
--trend-neutral: hsl(220 9% 46%);         /* Gray for neutral */

/* Sparkline Colors */
--sparkline-fill: hsl(217 91% 60% / 0.2);
--sparkline-stroke: hsl(217 91% 60%);

/* Dark Theme Additions */
--dark-bg: hsl(0 0% 6%);                  /* #0F0F0F */
--dark-card: hsl(0 0% 12%);               /* #1F1F1F */
--dark-border: hsl(0 0% 20%);             /* #333333 */
--dark-text-primary: hsl(0 0% 100%);      /* #FFFFFF */
--dark-text-secondary: hsl(0 0% 63%);     /* #A0A0A0 */
--dark-accent: hsl(187 100% 42%);         /* #00D4FF */

/* AI Feature Colors */
--ai-gradient-start: hsl(280 100% 70%);   /* Purple */
--ai-gradient-end: hsl(200 100% 60%);     /* Cyan */
--ai-badge-bg: hsl(280 100% 95%);
--ai-badge-text: hsl(280 100% 30%);

/* File Type Colors */
--file-pdf: hsl(0 72% 51%);               /* Red */
--file-image: hsl(217 91% 60%);           /* Blue */
--file-spreadsheet: hsl(142 71% 45%);     /* Green */
--file-document: hsl(220 13% 46%);        /* Gray */
```

#### Component Patterns to Implement

1. **TrendBadge** - Shows percentage with arrow and color
2. **SparklineChart** - Mini inline chart for cards
3. **FileChip** - Attachment with type icon and remove
4. **FilePreviewPopover** - Hover preview with AI summary
5. **MetricCard** - Value + trend + optional sparkline
6. **ThreadMessage** - Avatar + content + replies + embeds
7. **AIAssistButton** - Gradient/special styling for AI features
8. **CollapsibleNavSection** - Sidebar nav with expand/collapse

---

## Part XII: Extended Design Pattern Analysis

*Additional patterns extracted from comprehensive design portfolio analysis.*

### Analytics & Reporting Dashboards

#### AI/SEO Analytics Dashboard
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✱ Acme, Inc                                    ▼ Filter  📅 last 30 days │
│  ┌────────────┐                                                          │
│  │ Ace Studio │  Overview                                                │
│  │ 5 members  │  acedesign.studio                                        │
│  └────────────┘                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ANALYTICS        │  ● ChatGPT  ✦ Gemini   ⬡ Copilot  ⊡ Perplexity  ⊕ Claude │
│  ■ Overview    D  │    213       92          12         38            12     │
│  ⚡ Engine     V  │   -12.5%↓   -12.5%↓     +25%↑     +25%↑         +25%↑   │
│  📝 Prompt     F  ├─────────────────────────────────────────────────────────┤
│  📊 Analytics  C  │  Unique Visitors        │  Citation Rank               │
│  📋 Report     N  │  8,451                  │  #1                          │
├───────────────────│  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁       │  ████ Ace (Owned) 9.4%       │
│  ACTIONS          │                         │  ███░ Deel 7.8%              │
│  ○ Opportunities  ├─────────────────────────┴──────────────────────────────┤
│  ○ Workflows      │  AI Visibility Score    │  AI Referral Visits          │
│  ○ Brand Hub      │  32.1%                  │  13,421                      │
└───────────────────┴─────────────────────────┴──────────────────────────────┘

First Principles:
├── Show competitive context (Citation Rank vs competitors)
├── AI model icons as recognizable brand markers
├── Keyboard shortcuts visible in nav (D, V, F, C, N)
├── "Owned" badge highlights user's position in rankings
├── Consistent trend indicators across all metrics
└── Time period selector prominent in header
```

#### Multi-Platform Ad Analytics
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Ads report                            📅 last 30 days  Daily ▼  [Export CSV] │
│  acedesign.studio                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ♪ TikTok        G Google       in LinkedIn      ∞ Meta                  │
│  $485,447        $232,312       $22,574          $1,757,221              │
│  ┌──────────┐    ┌──────────┐   ┌──────────┐     ┌──────────┐            │
│  │SPEND $2,450│  │SPEND $2,450│ │SPEND $2,450│   │SPEND $2,450│           │
│  │ROAS  4.23X │  │ROAS  4.23X │ │ROAS  4.23X │   │ROAS  4.23X │           │
│  │IMPR 103,212│  │IMPR 103,212│ │IMPR 103,212│   │IMPR 103,212│           │
│  └──────────┘    └──────────┘   └──────────┘     └──────────┘            │
├─────────────────────────────────────────────────────────────────────────┤
│  Revenue vs Spend Trend    [Download] [Detail]                           │
│  +134,321                                                                │
│  ● Revenue  ● Spend                                                      │
│  ▓▓▓░▓▓▓░▓▓▓░▓▓▓░▓▓▓░▓▓▓░  (grouped bar chart)                         │
│  JAN  FEB  MAR  APR  MAY  JUN                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  User Retention  24%        │  Total Visitors  237,456                  │
│  +12.5% last 30 days        │  +12.5% last 30 days                      │
│  ████████████░░░░ (heatmap) │  Mobile 28% Desktop 19% Tablet 13%        │
└─────────────────────────────┴───────────────────────────────────────────┘

Design Principles:
├── Platform-specific icons with brand colors
├── Revenue as hero metric per platform
├── Consistent secondary metrics (SPEND, ROAS, IMPR)
├── Grouped bar charts for comparison over time
├── Heatmap for retention visualization
├── Device breakdown for traffic analysis
└── Download/Detail actions per chart
```

### AI Agent & Automation Interfaces

#### Agent Deployment Configuration
```
┌────────────────────────────────────────┐  ┌────────────────────────────────┐
│  ♪ TikTok           G Google          │  │  Configuration                 │
│  $485,447           $232,312          │  ├────────────────────────────────┤
│                                        │  │  Triggers               + Add │
│  SPEND      $2,450   SPEND            │  │  ┌──────────────────────────┐  │
│  ROAS       4.23X    ROAS             │  │  │ 👤 "Nike Jordan 45"    ···│  │
│  IMPRESSIONS 103,212 IMPRESSIONS      │  │  │ ⬜ "Shipping Address"  ···│  │
│                                        │  │  └──────────────────────────┘  │
├────────────────────────────────────────┤  │  Tools                 + Add │
│                                        │  │  ┌─────────┐  ┌─────────┐     │
│  ● Draft    [Deploy]  [≡]  [⚙]       │  │  │ClickUp  │  │ GPT 5.1 │     │
│                                        │  │  │ 4.0     │  │         │     │
│  Choose mode                           │  │  │Agent    │  │Run auto │     │
│  ┌──────────────────────────────────┐  │  │  │managing │  │pilot    │     │
│  │ ✓ Copilot                        │  │  └──┴─────────┴──┴─────────┘────┘
│  │   You approve every response     │  │
│  ├──────────────────────────────────┤  │  ┌────────────────────────────────┐
│  │   Autopilot                      │  │  │  👤 Rico Oktananda            │
│  │   Agent answers what it can      │  │  │     rico.ok1@ace.com          │
│  └──────────────────────────────────┘  │  ├────────────────────────────────┤
│                                        │  │  👤 Profile                    │
│  [      Deploy agent      ]            │  │  ⚙ Settings                    │
│                                        │  │  🔗 Integrations               │
└────────────────────────────────────────┘  │  🔑 Password                   │
                                            │  🚪 Logout                      │
                                            └────────────────────────────────┘

First Principles:
├── Binary mode selection (Copilot vs Autopilot)
├── Clear explanation of each mode's behavior
├── Triggers as editable list items
├── Tools as visual cards with icons
├── User profile accessible from main UI
├── Draft indicator shows unsaved state
└── Deploy as primary CTA
```

#### Email Composer with Variables
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⟲ Compose email                                                    ✕   │
├─────────────────────────────────────────────────────────────────────────┤
│  FROM   ● Rico Oktananda ✓                                              │
│  TO     ⬤ Shadcn ✓  ⬤ Mehdi ✓   👤 Add people                         │
├─────────────────────────────────────────────────────────────────────────┤
│  1  Dear {prospect first name}                                          │
│  2                                                                       │
│  3  I noticed {prospect company name} doing exciting work.              │
│  4  Your progress @ type your variable                                  │
│  5                    ┌───────────────────────┐                         │
│  6                    │ 🔍 Search variable    │                         │
│  7                    ├───────────────────────┤                         │
│  8                    │ CORE                  │                         │
│                       │ ● First name          │                         │
│                       │ ● Last name           │                         │
│                       ├───────────────────────┤                         │
│                       │ COMPANY               │                         │
│                       │ ● Name                │                         │
│                       │ ● Size                │                         │
│                       └───────────────────────┘                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [+]    Opus      ● DRAFT    [   Send   ▼]                             │
└─────────────────────────────────────────────────────────────────────────┘

Design Principles:
├── Variables highlighted in magenta/pink
├── Line numbers for reference
├── @ trigger for variable insertion
├── Searchable variable picker
├── Variables grouped by category (Core, Company)
├── Recipients as removable chips with avatars
├── AI model selector (Opus) for assistance
├── Draft indicator with autosave
└── Split Send button for options (Send, Schedule, etc.)
```

#### Workflow Automation Builder
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🅰 Ace Design  /  Page 1  [Draft]                      🔍 Search...    │
├─────────────────────────────────────────────────────────────────────────┤
│  ⚙ Workflow   ⚡ Tree view   [📋] [📄] [≡]                              │
├────────────────────────────────┬────────────────────────────────────────┤
│  ⚡ startTrigger         ◇ ◇ ⧉ │  📄 getDataFromGithub          ◇ ◇ ⧉  │
│  ────────────────────────────── │  ────────────────────────────────────  │
│  Trigger                        │  ◉ Marsipulami Hero        [Logout]   │
│  📅 At 5 minutes past the hour │  ────────────────────────────────────  │
│                                 │  1  # GitHub docs here:               │
│  Test Headers                   │  2  https://docs.github.com/graphql   │
│  ┌─────────────┬──────────────┐ │  3  query GetRepositories(            │
│  │Authorization│Bearer ghp_xxx│ │  4    $owner: String!                 │
│  │Content-Type │application/json│ │ 5    $name: String!                  │
│  │User-Agent   │Webhook/1.0   │ │  6  ) {                               │
│  └─────────────┴──────────────┘ │  7    repository(                     │
│                                 │  8      owner: $owner                 │
│  Test path parameter            │  9      name: $name                   │
│  ┌─────────────┬──────────────┐ │  10   ) {                             │
│  │owner        │openai        │ │  11     id                            │
│  │repo         │openai-python │ │  12     name                          │
│  └─────────────┴──────────────┘ │                                       │
└────────────────────────────────┴────────────────────────────────────────┘

Design Principles:
├── Visual node-based workflow builder
├── Cards represent workflow steps
├── Connection indicators between nodes
├── Collapsible configuration sections
├── Code editor with syntax highlighting
├── Key-value tables for parameters
├── Test/Debug inline in the interface
├── GitHub integration shows account state
└── Draft state clearly indicated
```

### Mobile App Patterns

#### Health & Fitness Dashboard (Mobile)
```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ 9:41          📶🔋 │  │ 9:41          📶🔋 │  │ 9:41          📶🔋 │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ 📅 TODAY, 12 OCT   │  │ ← Stress Level  🔥 │  │ Overview      🔥   │
│ Welcome Back, Rico │  │ ● MANAGEABLE       │  │ ● 12h DATA         │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ Calories KCAL   ⟳ │  │ Today's Stress KCAL│  │ Sleep Overview     │
│                    │  │                    │  │ 6h 52m             │
│    ╭────────╮      │  │ ╭────────────────╮ │  │ Good ███████░░░    │
│   ╱  1232   ╲     │  │ │ ∿∿∿∿∿∿∿∿∿∿∿∿∿ │ │  ├────────────────────┤
│  │  calories │     │  │ ╰────────────────╯ │  │ Stress Score       │
│  │ remaining │     │  │ 05:48   07:24  07:48│  │ 46  Manageable    │
│   ╲         ╱      │  │ ● Metric 1 ● Metric 2│  │ ████░░░░░░        │
│    ╰────────╯      │  ├────────────────────┤  ├────────────────────┤
│ ● Consumed 2588kcal│  │ ● Stress Overview   │  │ Current   Active   │
│ ● Base 2588kcal    │  │ HIGH  ███  5% 0:05  │  │ Weight    Minutes  │
├────────────────────┤  │ MED   ███░ 36% 0:56 │  │ 200g ▼1%  294 ▲1%  │
│ Title would be here│  │ LOW   █████ 59% 0:56│  ├────────────────────┤
│ ● Macros Breakdown │  ├────────────────────┤  │ Last HR   Last HRV │
│ Carbs Protein Fat  │  │ Trends             │  │ 82 bpm    56 ms    │
│ 208g   90g    48g  │  │ ⟳ Sleep  🍽 Meditate│  │ ▲1.8%     ▲1.8%   │
│ 40%    40%    40%  │  │ ⟳ Know Scale      │  ├────────────────────┤
├────────────────────┤  ├────────────────────┤  │ TODAY'S DIGEST     │
│ 🏠 Home 🍽 Diary 👤│  │ 🏠 Home 🍽 Diary 👤│  │ Keep your next meal│
└────────────────────┘  └────────────────────┘  │ light and filling  │
                                                └────────────────────┘

First Principles:
├── Large circular progress for primary metric
├── Color-coded status indicators (Good = green)
├── Trend arrows with percentage change
├── Segmented data breakdown (HIGH/MED/LOW)
├── Quick action shortcuts in nav
├── AI-generated daily digest
├── Consistent bottom tab navigation
├── Data attribution ("12h DATA")
└── Emoji icons for quick recognition
```

#### Onboarding Flow (Social Auth)
```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│                    │  │                    │  │                    │
│   🌅 [Hero Image]  │  │   🏔 [Hero Image]  │  │   🌴 [Hero Image]  │
│                    │  │                    │  │                    │
│      ⚪ OpenAI     │  │      ⚪ OpenAI     │  │      ⚪ OpenAI     │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│                    │  │                    │  │                    │
│   Get Started      │  │   Get Started      │  │   Get Started      │
│                    │  │                    │  │                    │
│   ChatGPT helps    │  │   ChatGPT helps    │  │   ChatGPT helps    │
│   you think, write │  │   you think, write │  │   you think, write │
│   and create at    │  │   and create at    │  │   and create at    │
│   your highest     │  │   your highest     │  │   your highest     │
│   level            │  │   level            │  │   level            │
│                    │  │                    │  │                    │
│ [ 🍎 Continue with Apple   ] │ [Continue with Apple] │ [Continue with Apple] │
│ [ G  Continue with Google  ] │ [Continue with Google] │ [Continue with Google] │
│ [ ✉  Continue with Email   ] │ [Continue with Email ] │ [Continue with Email ] │
│                    │  │                    │  │                    │
│     [ Log in ]     │  │     [ Log in ]     │  │     [ Log in ]     │
└────────────────────┘  └────────────────────┘  └────────────────────┘

Design Principles:
├── Hero imagery creates emotional connection
├── Brand logo prominently displayed
├── Clear value proposition headline
├── Social auth buttons in priority order
├── Consistent button hierarchy (filled → outlined)
├── "Log in" link for returning users
├── Multiple image variants for visual interest
└── Minimal text, maximum impact
```

### CRM & Data Table Patterns

#### Company Database Table (Dark Theme)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🅰 Acme Inc                 Company                    🔍 Ask AI  👁 Share │
├─────────────────────────────────────────────────────────────────────────┤
│ ■ Dashboard         │  All Companies ▼  View Settings    📥 Import  [+ New] │
│ ─────────────────── │  ▼ Filter   ↕ Sort                                    │
│   ▼ Company         ├───────────────────────────────────────────────────────┤
│   ● All Companies   │ □  Company    Description      Domains    Location    │
│   ● Leads           ├───────────────────────────────────────────────────────┤
│   ⬚ Data Enrichment │ □  🔵 Loom   Video messaging   loom.com   San Francisco │
│ ─────────────────── │ □  🟡 Slack  Team communication slack.com  San Francisco │
│   ● Sequence        │ □  🔴 Brex   Financial platform brex.com   San Francisco │
│   ● Workflows       │ □  🟣 Canva  Graphic design     canva.com  Sydney       │
│   ● Sales Playbooks │ □  ⬜ Figma  Design tool       figma.com   San Francisco │
│   ○ Facebook        │ □  🐦 Twitter Social platform  twitter.com San Francisco│
│   ○ Twitter         │ □  🎵 Spotify Music streaming  spotify.com Stockholm    │
│   ○ Analytics       │ □  🤖 OpenAI AI research       openai.com  San Francisco│
├─────────────────────┤ □  📦 Stripe  Payments         stripe.com  San Francisco│
│ ⚙ Admin Settings    │ □  ⚡ Zapier  Automation        zapier.com  San Francisco│
│ 👤 Rico Oktananda   │ □  📊 Airtable Database        airtable.com San Francisco│
└─────────────────────┴───────────────────────────────────────────────────────┘

Dark Theme Principles:
├── Background: #0D0D0D to #1A1A1A
├── Table rows: Subtle border separation
├── Brand colors preserved for company logos
├── Yellow accent for active/selected items
├── White text on dark for high contrast
├── Muted gray for secondary information
├── Hover states slightly lighter
└── "Ask AI" prominent for assistance
```

### Integration & Connection Patterns

#### AI Chat with Service Integration
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│         M  Please connect your Gmail                                    │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Reply latest Rico email from Gmail                               │ │
│  │                                                                   │ │
│  │  [📎] [⊞] [◯] [⟲]        [🌐 Web]      [🔮 GPT 5.0]             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  📎 Add files                 👆                                  │ │
│  │  ⟲  Import code                                                   │ │
│  │  ≡  Saved prompt                                                  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Design Principles:
├── Service connection prompts inline (Gmail icon + message)
├── Input area with multiple action modes
├── Expandable menu for file/code/prompt actions
├── Web search toggle for real-time data
├── Model selector always visible
├── Gradient background suggests AI capability
└── Clean, minimal interface for focus
```

### Design System Builder Patterns

#### Theme Customization Panel
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⊞ Acme Inc   Webcore App / Home  [Draft]                  🔍 Search     │
├─────────────────────────────────────────────────────────────────────────┤
│ 📱 │  🎨     │  [Layout]  [Template]  [Style]    │  ⊞ Layout  🔗 Workflow │
│ ─── │ Theme   │                                   │                       │
│ 🎨 │  ──────  │  Popular Combination              │                       │
│ ─── │ 🎨      │  ┌─────────────────────────────┐  │                       │
│ Color│ Color  │  │ Lora for Title              │  │                       │
│ ─── │  ──────  │  │ DM Sans for Body           │  │                       │
│ 📝 │ 🔤      │  │ 🟢🟡🟤🟠⚫⬜🟢🔵        │  │                       │
│ Font│ Font   │  │          [Preview]           │  │                       │
│ ─── │  ──────  │  └─────────────────────────────┘  │                       │
│ 🎬 │ 🔗      │  ┌─────────────────────────────┐  │                       │
│ Anim│ Anim   │  │ IBM Plex Sans for Title     │  │                       │
│ ─── │  ──────  │  │ Outfit for Body            │  │                       │
│ 📊 │ ⟳      │  │ 🔵🟣🔵🟣⚫⬜🔵🟣        │  │                       │
│ Flow│ Flow   │  │          [Preview]           │  │                       │
│     │         │  └─────────────────────────────┘  │                       │
└─────┴─────────┴───────────────────────────────────┴───────────────────────┘

Design Principles:
├── Left sidebar for tool categories
├── Sub-navigation for tool options
├── Tab navigation for panel sections
├── Pre-built combinations as cards
├── Color palette preview as swatches
├── Typography pairing (title + body)
├── Preview button for each option
├── Draft indicator for unsaved changes
└── Breadcrumb for current location
```

---

## Part XIII: First Principles Design Synthesis

### Core Truths from Pattern Analysis

After analyzing 40+ screens across different domains, these first principles emerge:

#### 1. **Information Hierarchy is Everything**
```
Level 1: Hero Metrics      — Single most important number (large, bold)
Level 2: Supporting Context — Trend, comparison, time period (smaller, muted)
Level 3: Related Data      — Charts, breakdowns, lists (contained in cards)
Level 4: Actions           — Buttons, links (right-aligned or bottom)
```

#### 2. **Progressive Disclosure Reduces Overwhelm**
```
Show by Default:
├── Primary metric/content
├── Status indicators
├── Essential actions
└── Navigation

Reveal on Demand:
├── Detailed breakdowns (expand/collapse)
├── Configuration options (panels/modals)
├── Historical data (drill-down)
└── Advanced filters (dropdown/popover)
```

#### 3. **Consistency Creates Confidence**
```
Consistent Across All Screens:
├── Spacing scale (4px base unit)
├── Color meanings (green=success, red=danger, yellow=warning)
├── Icon style (outline vs filled indicates state)
├── Button hierarchy (primary > secondary > ghost > danger)
├── Card structure (header, content, footer)
└── Table patterns (checkbox, columns, actions)
```

#### 4. **Context Prevents Errors**
```
Always Show:
├── Current location (breadcrumbs)
├── Save state (Draft indicator)
├── Time context (last updated, date range)
├── User context (who's logged in)
└── Data freshness (real-time vs cached)
```

#### 5. **AI Features Require Trust Signals**
```
Trust Patterns for AI:
├── Show the model being used (GPT 5.0, Claude, Opus)
├── Indicate AI-generated content (✨ Summary by AI)
├── Allow human review (Copilot mode: approve each response)
├── Provide escape hatches (edit, regenerate, ignore)
└── Show confidence/limitations transparently
```

### Tour CRM Application of Principles

| Pattern | Application to Tour CRM |
|---------|------------------------|
| **Hero Metrics** | Today's bookings count, total revenue, capacity utilization |
| **Trend Indicators** | Bookings vs last week, revenue trend, customer growth |
| **Progressive Disclosure** | Basic booking info visible, participant details expandable |
| **AI Integration** | Smart scheduling suggestions, automated customer communications |
| **Dark/Light Themes** | Support both for different work environments |
| **Mobile-First Cards** | Guide portal designed for on-the-go checking |
| **Variable Templates** | Email templates with {customer_name}, {tour_name} variables |
| **Workflow Automation** | Booking confirmation → Guide notification → Reminder triggers |

### Component Priority for Implementation

Based on pattern frequency and Tour CRM needs:

**High Priority (Implement First):**
1. MetricCard with TrendBadge
2. DataTable with filters and sorting
3. StatusBadge (booking, payment, schedule states)
4. DateRangePicker with presets
5. CommandPalette (Cmd+K)

**Medium Priority:**
6. CollapsibleNavSection
7. EmailTemplateEditor with variables
8. CalendarView with capacity indicators
9. NotificationToast system
10. ConfirmationModal

**Lower Priority (Future Enhancement):**
11. WorkflowBuilder (automation)
12. AIAssistPanel
13. DarkModeToggle
14. SparklineChart
15. HeatmapVisualization

---

## Part XIV: SaaS Dashboard Patterns (Louis Nguyen Portfolio Analysis)

*Extracted from comprehensive analysis of 24 production-quality SaaS dashboard designs.*

### CRM & Lead Management

#### New Lead Form Modal
```
┌─────────────────────────────────────────────────────────────────┐
│  ✕  New Lead                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  ℹ Adding lead details                                          │
│    You'll create a new lead and fill in their details. You can  │
│    always add activities later in their profile.                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Lead Name                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ App Development                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Proposed Value              Current Status                     │
│  ┌───────────────────┐       ┌───────────────────────────┐     │
│  │ $  286,000        │       │ ● Active              ▼   │     │
│  └───────────────────┘       └───────────────────────────┘     │
│                                                                 │
│  Expected Close Date                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📅  20/11/2026                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Source/ID                                                      │
│  ┌───────────────────┐       ┌───────────────────────────┐     │
│  │ Twitter, DM, Linkedin ▼│  │ US                     ▼  │     │
│  └───────────────────┘       └───────────────────────────┘     │
│                                                                 │
│                              [ Cancel ]  [ Continue ]           │
└─────────────────────────────────────────────────────────────────┘

Design Principles:
├── Contextual help text explains purpose
├── Currency prefix in value input
├── Dropdown with current status indicator (colored dot)
├── Date picker with calendar icon
├── Multi-select for source attribution
├── Two-column layout for related fields
├── Clear action buttons right-aligned
└── Modal can be dismissed (✕ in corner)
```

#### Lead Table with Status Pipeline
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  + New Lead                                                    🔍 Search    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Company           Status          Stage      Owner       Created   Updated │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔵 E-commerce S.  [● Qualified]   Demo       👤 Sarah    Jan 24   Jan 27  │
│  🟣 Company AB     [● Active]      Proposal   👤 Mike     Jan 21   Jan 26  │
│  🟡 Tech Startup   [● Pending]     Discovery  👤 Sarah    Jan 20   Jan 25  │
│  🔴 Enterprise Co  [○ Cold]        Initial    👤 John     Jan 18   Jan 22  │
│  🟢 SaaS Platform  [● Won]         Closed     👤 Mike     Jan 15   Jan 28  │
└─────────────────────────────────────────────────────────────────────────────┘

Status Badge Colors:
├── Qualified: Blue background, blue text
├── Active: Green background, green text
├── Pending: Yellow background, yellow text
├── Cold: Gray background, gray text
├── Won: Green with checkmark
└── Lost: Red with X mark

Key Patterns:
├── Company logo/color indicator for quick recognition
├── Status as colored badge (not just text)
├── Stage shows pipeline position
├── Owner with avatar for accountability
├── Relative dates ("Jan 24") not full timestamps
└── Row hover reveals quick actions
```

### Empty States & Onboarding

#### Suggestive Empty State
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 📝          │ │ 📄          │ │ 🎨          │ │ 📊        │ │
│  │ New quick   │ │ New         │ │ New         │ │ New       │ │
│  │ note        │ │ document    │ │ whiteboard  │ │ present.  │ │
│  │             │ │             │ │             │ │           │ │
│  │ Create a    │ │ Create a    │ │ Create a    │ │ Create a  │ │
│  │ quick note  │ │ project     │ │ sharing     │ │ report    │ │
│  │ for you     │ │ document    │ │ whiteboard  │ │ present.  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                 │
│                    ┌─────────────────────┐                     │
│                    │   📁               │                     │
│                    │                     │                     │
│                    │ There's nothing     │                     │
│                    │ here...             │                     │
│                    │                     │                     │
│                    │ There is nothing    │                     │
│                    │ here to view right  │                     │
│                    │ now, please create  │                     │
│                    │ a new document to   │                     │
│                    │ get started.        │                     │
│                    │                     │                     │
│                    │ [+ New document]    │                     │
│                    └─────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Empty State Principles:
├── Suggestion cards ABOVE empty state (not hidden)
├── Cards show document type icon
├── Each card has title + brief description
├── Main empty message is friendly, not error-like
├── Clear CTA button to create first item
├── Illustration/icon adds visual interest
└── Explain what will appear once items exist
```

### Feature Paywalls & Upsells

#### Contextual Feature Gate
```
┌─────────────────────────────────────────────────────────────────┐
│                     (Blurred table in background)               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │         ✨ Get Business+ to access reports              │   │
│  │                                                          │   │
│  │    You can start by adding new company list or          │   │
│  │    connecting to your tools. To access our company      │   │
│  │    report features, upgrade to the Business Plan.       │   │
│  │                                                          │   │
│  │    [ Upgrade Plan ]     Watch Demo                      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔵 Niantic Tech     dribbble.com                              │
│  🟣 Quantum Innov.   quantum.ai         (visible but blurred)  │
│  🟢 Pixel Tech       apps.tech                                  │
└─────────────────────────────────────────────────────────────────┘

Paywall Principles:
├── Show blurred preview of gated content
├── Let users see what they're missing
├── Clear value proposition in modal
├── Primary CTA: Upgrade action
├── Secondary: Demo/Learn more link
├── Icon (✨) signals premium feature
├── Don't completely block the interface
└── Position over the exact feature being gated
```

### Settings & Profile Pages

#### Profile Settings (Dark Theme)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Kentucky LLC                    ⚙ Settings                   🔍 Search     │
├────────────────────┬────────────────────────────────────────────────────────┤
│  🔍 Search anything│  [Profile] Company  Teams  Security  Integrations     │
│  ──────────────────│  Billing  Communications  🌙 Appearance                │
│  📊 Dashboard      ├────────────────────────────────────────────────────────┤
│  📋 Tasks       7  │  Profile                                               │
│  👥 Customers      │  Manage your information, preferences, and connected   │
│  📁 Projects       │  data.                                                 │
│  📄 Invoices       │  ────────────────────────────────────────────────────  │
│  📈 Reports     12 │  Profile photo                                         │
│  ──────────────────│  PNG, JPEG, SVG, 5,000 max (2MB)                       │
│  WORKSPACE         │  ┌──────┐                                              │
│  ⚙ Settings       │  │  👤  │  [ Upload ]                                  │
│  📊 Workflows      │  └──────┘                                              │
│  👥 Invite users   │                                                        │
│  ──────────────────│  First Name              Last Name                     │
│  CONNECTED         │  ┌─────────────────┐     ┌─────────────────┐          │
│  ○ Nextgen.ai      │  │ John            │     │ Baker           │          │
│  ○ Stacks.com      │  └─────────────────┘     └─────────────────┘          │
│  ○ Aether.ai       │                                                        │
│  ○ Cloudchat.com   │  Email                                                 │
│  ○ Console.org     │  ┌─────────────────────────────────────────┐          │
│  ──────────────────│  │ johnbaker@kentucky.ai                   │          │
│  👤 John Baker PRO │  └─────────────────────────────────────────┘          │
│                    │                                                        │
│                    │  Website                                               │
│                    │  ┌─────────────────────────────────────────┐          │
│                    │  │ https://  johnbaker.co/home             │          │
│                    │  └─────────────────────────────────────────┘          │
│                    │                                                        │
│                    │  Preferences                                           │
│                    │  Manage your application preferences                   │
│                    │                                                        │
│                    │  Timezone            Language                          │
│                    │  ┌──────────────┐    ┌──────────────┐                 │
│                    │  │ EST (GMT-5) ▼│    │ English    ▼ │                 │
│                    │  └──────────────┘    └──────────────┘                 │
│                    │                                                        │
│                    │  ⚠ Your changes haven't been saved                    │
│                    │                              [ Cancel ] [ Save changes]│
└────────────────────┴────────────────────────────────────────────────────────┘

Dark Theme Settings Patterns:
├── Background: #0D0D0D to #1A1A1A
├── Cards/inputs: Slightly lighter (#252525)
├── Borders: Very subtle (#333)
├── Text: White primary, gray-400 secondary
├── Connected accounts as status indicators
├── Tab navigation for settings sections
├── Unsaved changes warning bar
├── Photo upload with size/format hints
├── Inline URL prefix (https://)
└── Two-column layout for related fields
```

### Team & Member Management

#### Team Members Table
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Team Members                                                               │
│  Manage your members and edit their roles and permissions.                  │
│                                                                             │
│  [ 🔍 Search members... ]              [ Sort & Filter ] [ 👥 Invite ]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Team member ↕        Date added      Status      Role          │
├─────────────────────────────────────────────────────────────────────────────┤
│  👤 Jessica Wang      Fri, 24 Jan 2025   ● Online   Admin       [ Manage ] │
│     jessica@company.com                                                     │
│  👤 Julian Nguyen     Fri, 19 Feb 2026   ● Online   Admin       [ Manage ] │
│     julian@company.com                                                      │
│  👤 Sophia Lee        Mon, 16 Nov 2024   ● Online   Marketing   [ Manage ] │
│     sophia@company.com                                                      │
│  👤 Marcus Chen       Wed, 03 Oct 2025   ● Online   Sales       [ Manage ] │
│     marcus@company.com                                                      │
│  👤 Luna Kato         Mon, 08 Feb 2026   ● Online   Manager     [ Manage ] │
│     luna@company.com                                                        │
│  👤 Maya Smith        Sun, 27 Jan 2023   ○ Idle     Sales       [ Manage ] │
│     maya@company.com                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

Team Table Patterns:
├── Avatar + Name + Email in single column
├── Email as secondary text (muted)
├── Status with colored dot (Online=green, Idle=gray)
├── Role as text badge
├── "Manage" button reveals dropdown actions
├── Sortable columns (↕ indicator)
├── Search + Filter + Invite actions in header
└── Description text explains the section
```

#### Member Invite Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  Add new team                                                   │
│  Share this link with other users that you want to join         │
│  your workspace. Learn more.                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://paper.so/join/PRA4AsbJb0I297wL6Ss1...          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               [ 📋 Copy link ] [ ✉ Send invite ]│
│                                                                 │
│  ── OR ──                                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✉ Enter email to send invite...                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Invite Patterns:
├── Shareable link as primary method
├── Copy link button for quick sharing
├── Email invite as alternative
├── "OR" divider separates methods
├── Learn more link for help
└── Link is truncated with ellipsis
```

### Order & Invoice Management

#### Order Detail Page
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Order   0061-C                                                           │
│                                                                             │
│  Order ID: 0D1261-C     [Shipping]  [No action needed]     [ Manage details]│
├────────────────────────────────────┬────────────────────────────────────────┤
│  Order Information                 │  Delivery Tracking                     │
│  All information about your        │  [In Delivery]                         │
│  current order and delivery.       │                                        │
│  ─────────────────────────────     │  Live track your delivery or contact   │
│  👤 Username    @Emily35          │  your couriers.                        │
│  📝 Full Name   Emily Johnson     │  ┌────────────────────────────────┐   │
│  ✉ Email       emily@example.com │  │       📍 ──────── 📦          │   │
│  💰 Total      $1299 ($25 for    │  │        (Map with route)         │   │
│     Payment    transportation)    │  └────────────────────────────────┘   │
│  📅 Order Date Mon, 23 Dec 2024   │                      [ Contact courier ]│
│  🚚 Delivery   Wed, 25 Dec 2024   │                                        │
│  📍 Location   Kreutzstrabe 5,    │                                        │
│                Friedrichshain     │                                        │
│  🚛 Courier    FedEx Corporation  │                                        │
├────────────────────────────────────┴────────────────────────────────────────┤
│  What's Included?                                                           │
│  Manage details of your order's packages and IDs.            🔍 Search...   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Product Name ↕    Details              Serial ID   Products#  Category     │
│  ────────────────────────────────────────────────────────────────────────── │
│  [🖼] Hardware Product #1   Blue aluminum   OD1261-C   Satelita   Hardware  │
│       Price: premium ($...)                            & Computer            │
│  [🖼] Software Product #2   Thick game took  AR123-B   Sloris Inc Software  │
└─────────────────────────────────────────────────────────────────────────────┘

Order Detail Patterns:
├── Breadcrumb with back arrow
├── Status badges (Shipping, No action needed)
├── Two-column info layout
├── Map integration for tracking
├── Icon prefixes for field labels
├── Line items with product images
├── Sortable product table
└── Contact action for courier
```

#### Order Detail Modal with Timeline
```
┌─────────────────────────────────────────────────────────────────┐
│  Order: OD120-DE   [Prepare]                                 ✕  │
│  ───────────────────────────────────────────────────────────────│
│  Extra Delivery Date: Mon, 23 Dec 2024     Find Order Details   │
│  ───────────────────────────────────────────────────────────────│
│                                                                 │
│  [🖼] Hardware Product #1     $200                              │
│       Price: premium (+)      Quantity: 1        $19,066        │
│  [🖼] Book Product #2         $200                              │
│       Price: premium          Quantity: 1        $2,072         │
│  [🖼] Software Product #3     $200                              │
│       Price: base             Quantity: 1        $100           │
│  ───────────────────────────────────────────────────────────────│
│  [Order History] [Courier Details] [Receiver Details] [Tracking]│
│  ───────────────────────────────────────────────────────────────│
│                                                                 │
│  ● Product Ordered                     Subtotal     $1,000      │
│  │ Mon, 23 Dec, 2024 · 03:07PM                                  │
│  │ 👤 Emily Johnson · emily@example.com                        │
│  │                                                              │
│  ● Courier Accepted                    Shipping       $50       │
│  │ Mon, 23 Dec, 2024 · 04:55PM                                  │
│  │                                                              │
│  ○ Product Packaging                   ─────────────────────    │
│  │ Thu, 26 Dec, 2024 · (pending)       Total       $1,050      │
│  │                                                              │
│  ○ Product Delivering                                           │
│    (pending)                           Paid via     Amex •••11  │
│                                                                 │
│                              [ Previous ]    [ Next ]           │
└─────────────────────────────────────────────────────────────────┘

Timeline Modal Patterns:
├── Tabs for different detail views
├── Product list with thumbnails
├── Order timeline with status dots
├── Completed steps: filled dots (●)
├── Pending steps: empty dots (○)
├── Timestamp for each step
├── Person attribution (who did what)
├── Price summary sidebar
├── Payment method at bottom
└── Navigation between orders
```

### Invoice Tables

#### Invoice List with Filters
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Invoices                                    🔍 Search invoices...          │
│  ──────────────────────────────────────────────────────────────────────────│
│  [≡ List] [⊞ Board] [◇ Simple] [◉ Overview]              [+ View] [▼ Filter]│
├─────────────────────────────────────────────────────────────────────────────┤
│  Due date ↕         Invoice # ⓘ    Status        Description ⓘ    Client   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Sun, 28 May 2026   #INV-S0076     [Pending]     Consultation fee  👤 J.Doe │
│  Wed, 24 May 2026   #INV-S0872     [Pending]     Development work  👤 D.Kim │
│  Sun, 28 May 2026   #INV-S0879     [Pending]     SEO services      👤 J.Bla │
│  Wed, 31 May 2026   #INV-S0876     [Pending]     Graphic design    👤 L.Mar │
│  Wed, 4 June 2026   #INV-S0883     [Pending]     Data analysis     👤 N.Tay │
│  Wed, 7 June 2026   #INV-S0866     [Pending]     Photography       👤 A.Cla │
│  Thu, 18 May 2026   #INV-S0804     [Pending]     Add description   👤 K.Mil │
│  Mon, 22 May 2026   #INV-S0877     [Overdue]     Marketing strategy👤 E.Bro │
│  Thu, 25 May 2026   #INV-S0873     [Overdue]     Monthly retainer  👤 M.Smi │
│  Tue, 6 June 2026   #INV-S0885     [Overdue]     Technical support 👤 L.Har │
│  Fri, 26 May 2026   #INV-S0874     [Cancelled]   UX audit          👤 T.Whi │
│  Fri, 2 June 2026   #INV-S0881     [Paid]        App development   👤 E.Tho │
│  Tue, 23 May 2026   #INV-S0871     [Paid]        Design revisions  👤 A.Joh │
└─────────────────────────────────────────────────────────────────────────────┘

Invoice Table Patterns:
├── View switcher (List/Board/Simple/Overview)
├── Sortable columns with arrows
├── Info icons for column explanations
├── Status badges with semantic colors
├── Client with avatar thumbnail
├── Overdue items highlighted
├── Cancelled items in muted style
├── Bulk actions when rows selected
└── Add view button for custom views
```

### Collapsible Sidebar Navigation

#### Three-State Sidebar
```
EXPANDED (240px)              COLLAPSED (64px)           HOVER STATE
┌──────────────────────┐     ┌────────────────┐     ┌────────────────────┐
│ Kentucky LLC     ≡   │     │    K    ≡      │     │    K    ≡          │
│ ─────────────────────│     │ ──────────────│     │ ────────────────── │
│ 🔍 Search anything   │     │      🔍        │     │      🔍            │
│ ─────────────────────│     │ ──────────────│     │ ────────────────── │
│ 📊 Dashboard         │     │      📊        │     │      📊 ┌─────────┐│
│ 📋 Tasks          ▶  │     │      📋     ▶  │     │      📋 │Dashboard││
│ 👥 Customers         │     │      👥        │     │      👥 └─────────┘│
│ 📄 Invoices      ●   │     │      📄     ●  │     │      📄            │
│ 📈 Reports           │     │      📈        │     │      📈            │
│ ─────────────────────│     │ ──────────────│     │ ────────────────── │
│ SETTINGS             │     │ ──────────────│     │ ────────────────── │
│ ⚙ Settings          │     │      ⚙        │     │      ⚙             │
│ 👥 Invite users      │     │      👥        │     │      👥            │
│ ─────────────────────│     │ ──────────────│     │ ────────────────── │
│ FAVORITES            │     │ FAVORITES     │     │                    │
│ ○ Nextgen.ai         │     │      ○        │     │                    │
│ ○ Stacks.com         │     │      ○        │     │                    │
│ ─────────────────────│     │ ──────────────│     │ ────────────────── │
│ 👤 Lily Senate  PRO  │     │ 👤 LS    PRO  │     │ 👤 LS    PRO       │
└──────────────────────┘     └────────────────┘     └────────────────────┘

Collapsible Sidebar Principles:
├── Smooth transition animation
├── Icons remain visible in all states
├── Text labels hidden when collapsed
├── Hover tooltip shows full label
├── Section headers collapse to dividers
├── Badge counts remain visible
├── User profile adapts to width
├── Expand button in header
└── Keyboard shortcut to toggle (Cmd+B)
```

### Integrations & Add-ons

#### Integration Card Grid
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔌 Your add-ons                    🔍 Search          [ New ]             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │ 📊 TrendMonitor   │  │ 📈 AnalyticsHub   │  │ 📉 MetricSync     │       │
│  │                   │  │                   │  │                   │       │
│  │ Connect TrendMon. │  │ Add AnalyticsHub  │  │ Incorporate Metr. │       │
│  │ with your AI Chat │  │ to your AI Chatbot│  │ into your AI Chat │       │
│  │ to accept reserv. │  │ for streamlined   │  │ to handle bookings│       │
│  │ instantly in chat │  │ booking processes │  │ seamlessly        │       │
│  │                   │  │                   │  │                   │       │
│  │ [+ Add to project]│  │ [+ Add to project]│  │ [+ Add to project]│       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │ 📊 DataPulse      │  │ 📈 MetricFlow     │  │ 📊 DataNavigator  │       │
│  │            [Added]│  │            [Added]│  │            [Added]│       │
│  │                   │  │                   │  │                   │       │
│  │ Utilize DataPulse │  │ Incorporate Metr. │  │ Integrate DataNav │       │
│  │ in your AI Chat   │  │ into your AI Chat │  │ into your AI Chat │       │
│  │ to streamline     │  │ for quick booking │  │ for quick booking │       │
│  │ booking processes │  │ confirmations     │  │ confirmations     │       │
│  │                   │  │                   │  │                   │       │
│  │ [Configuration]   │  │ [Configuration]   │  │ [Configuration]   │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘

Integration Card Patterns:
├── Icon + Name header
├── Brief description of capability
├── "Added" badge for installed
├── Primary action: Add to project
├── After install: Configuration button
├── Consistent card sizing
├── Grid layout (3-4 columns)
└── Search and filter by category
```

#### AI Integrations Page
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI integrations  [New AI]                    [ Watch demo ]  [ Learn more ]│
│  Streamline deployment and scale your software seamlessly                   │
│  with AI integration. Learn more.                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Cutting-edge AI models                                                     │
│  Connect your software with the cutting-edge technology. Learn more.        │
│                                                                [< >]        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 🔵 Anthropic    │  │ 🟣 Meta Llama 3 │  │ 🟢 Perplexity   │             │
│  │ Claude Sonnet 4 │  │ Llama through   │  │ Efficient through│             │
│  │                 │  │ access          │  │ access           │             │
│  │ [Browse Integ.] │  │ [ Learn more ]  │  │ [ Learn more ]   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Available integrations                                         [< >]       │
│  Seamlessly connect your software with the cutting-edge technology.         │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Google AI│  │ OpenAI   │  │ Replicate│  │ Pinecone │                    │
│  │ Build    │  │ Innovate │  │ Deploy   │  │ ...      │                    │
│  │ with AI  │  │ through  │  │ custom   │  │          │                    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Current Integrations                                                       │
│  Manage your ready-to-use integration solutions.              [ Learn more ]│
│                                                                             │
│  Integration        Type                              Updated      │       │
│  ──────────────────────────────────────────────────────────────────────────│
│  🟢 Perplexity     [Copy] [Images] [Video] [Code] [Audio]  Updated 1h ago  │
│  🔵 ChatGPT        [Copy] [Code]                            Updated 1h ago  │
│  🟣 Fal.ai         [Images]                                 Updated 4h ago  │
│  🟠 Cohere         [Code]                                   Updated 4h ago  │
└─────────────────────────────────────────────────────────────────────────────┘

AI Integration Page Patterns:
├── Hero section with main value prop
├── Featured/cutting-edge models highlighted
├── Carousel navigation for categories
├── Grid of available integrations
├── Active integrations as table
├── Capability badges (Copy, Images, Video, Code, Audio)
├── Last updated timestamp
├── Edit/manage buttons per integration
└── Clear separation between available and installed
```

### Transaction & Financial Tables

#### All Transactions View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transactions                          [ Edit view ] [ Export data ] [+ Add]│
│  ───────────────────────────────────────────────────────────────────────────│
│  All Transactions                                      🔍 Search...         │
│  Manage all of your invoices in one view.                  [ Default Filter]│
├─────────────────────────────────────────────────────────────────────────────┤
│  Customer ↕            Amount         Status        Invoice ID    Created   │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔵 Nexis Tech        +$2,000 USD    [● Pending]   INV-T02034558  Mon, 13.. │
│  🟣 Cloud Nova        +$2,400 USD    [● Pending]   INV-T02034559  Wed, 08.. │
│  🔴 Sync Fusion       +$3,700 USD    [● Pending]   INV-T02034560  Mon, 15.. │
│  🟢 Quantum Leap      +$2,600 USD    [● Pending]   INV-T02034568  Mon, 09.. │
│  🔵 Quantum Innov.    +$7,500 USD    [● Pending]   INV-S00285477  Thu, 16.. │
│  🟡 Bloomberry Labs   +$2,400 USD    [● Pending]   INV-SXXB97110  Sat, 08.. │
│  🔵 Eco Solutions     +$4,000 USD    [● Pending]   INV-S00739727  Sat, 30.. │
│  🟢 Vertex Dynamics   +$4,120 USD    [● Pending]   INV-S00773727  Thu, 06.. │
│  🔴 Byte Wave         +$3,500 USD    [● Completed] INV-T20384968  Thu, 06.. │
│  🟣 Next Zeta         +$2,600 USD    [● Completed] INV-S00281938  Thu, 06.. │
│  🔵 Zen Data          +$2,240 USD    [● Completed] INV-T03548898  Fri, 09.. │
│  🟠 Stellar Tech      +$4,400 USD    [● Completed] INV-T03548898  Thu, 06.. │
│  🟣 Opti Code         +$2,240 USD    [● Completed] INV-T03548898  Thu, 06.. │
│  🔴 Fusion Core       +$1,900 USD    [● Declined]  INV-T03548898  Thu, 31.. │
│  🔵 Apex65 Systems    +$3,000 USD    [● Declined]  INV-T20XXXX98  Mon, 30.. │
└─────────────────────────────────────────────────────────────────────────────┘

Transaction Table Patterns:
├── Company logo/color for quick ID
├── Positive amounts in green (+$)
├── Status badges: Pending (yellow), Completed (green), Declined (red)
├── Invoice ID as monospace text
├── Truncated dates with hover for full
├── Export data button for reports
├── Default filter dropdown
├── Bulk selection checkbox
└── Infinite scroll or pagination
```

### Notification Settings

#### Notification Preferences
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Notifications                                                              │
│  Where you want to be notified. Learn more.                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📥 Inbox                                                                   │
│  You'll consistently get notifications for your subscriptions              │
│  within your TeamTask Inbox.                                               │
│                                                                             │
│  ✉ Email                                                                   │
│  Get an email summary for unread notifications grouped and sent            │
│  according to their urgency.                                               │
│     ├─ Receive an immediate email alert whenever a task assigned          │
│     │  to a high-priority project with a short deadline.                  │
│     └─ Get notifications integrated for messaging apps like Slack         │
│        or Discord.                                                         │
│                                                                             │
│  🔗 Integrations                                                           │
│  Get notifications integrated for messaging apps like Slack or             │
│  Discord.  [Set up]                                                        │
│                                                                             │
│  📱 Mobile                                                                 │
│  You'll get notifications for your subscriptions directly to your          │
│  mobile app inbox.                                                         │
│                                                                             │
│  🖥 Desktop                                                                │
│  You'll receive notifications for your subscriptions directly on           │
│  either the desktop app or via web notifications.                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Project notifications                                                      │
│                                                                             │
│  ☐ Comments for your tasks                                                 │
│  ☐ New tasks assigned to you                                               │
│  ☑ Tasks completed (for tasks you created or assigned to)                  │
│  ☐ Tasks unassigned (for tasks assigned to you)                            │
│  ☐ You are mentioned in a task                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Notification Settings Patterns:
├── Category headers with icons
├── Description explains what happens
├── Nested options for granular control
├── "Set up" link for integrations
├── Checkbox list for specific events
├── Consistent terminology
├── "Learn more" links for help
└── Platform-specific sections
```

---

## Part XV: Key Takeaways for Tour CRM

### Direct Applications

| Dribbble Pattern | Tour CRM Implementation |
|------------------|------------------------|
| **Lead Form Modal** | Booking creation modal with customer, tour, date, participants |
| **Status Pipeline** | Booking status badges (Pending → Confirmed → Completed → Cancelled) |
| **Empty States** | No bookings today? Show suggestion cards for common actions |
| **Feature Paywall** | Upsell analytics/reports to premium tier |
| **Team Management** | Guide management with status, availability, role |
| **Order Details** | Booking detail page with customer info, tour details, payment |
| **Order Timeline** | Booking history (created, confirmed, modified, completed) |
| **Invoice Table** | Payment/transaction history for customers |
| **Collapsible Sidebar** | Admin navigation with collapse for more workspace |
| **Integration Cards** | Connect Stripe, Resend, Twilio as add-on cards |
| **Notification Prefs** | Email/SMS notification settings per event type |

### Design Quality Checklist

Based on Louis Nguyen's work, high-quality SaaS dashboards:

- [ ] Every table has search, sort, and filter options
- [ ] Status uses colored badges (not plain text)
- [ ] Forms have contextual help text
- [ ] Empty states suggest actions
- [ ] Modals can be dismissed without action
- [ ] Settings pages have unsaved changes warning
- [ ] Tables show avatar + name + email together
- [ ] Actions are right-aligned in tables
- [ ] Dark theme is fully supported
- [ ] Sidebar collapses gracefully
- [ ] Integration status is clearly indicated

---

*This document is a living guide. Update it as design decisions evolve and new patterns emerge.*

**Version:** 1.3.0
**Last Updated:** December 2025
**Maintainers:** Product & Design Team
