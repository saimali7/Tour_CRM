# Booking Detail Page - Design Specifications

A comprehensive design specification for the zone-based booking detail page redesign.
This document serves as the authoritative reference for implementation.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Zone Architecture](#zone-architecture)
3. [Typography Scale](#typography-scale)
4. [Spacing System](#spacing-system)
5. [Color Tokens](#color-tokens)
6. [Component Specifications](#component-specifications)
7. [Animation Specifications](#animation-specifications)
8. [Responsive Breakpoints](#responsive-breakpoints)
9. [Accessibility Requirements](#accessibility-requirements)
10. [Implementation Checklist](#implementation-checklist)

---

## Design Philosophy

### Core Principle: Surgical Precision

Every element must earn its place. Tour operators use this page 50+ times daily.
The interface should feel like a surgical instrument - precise, purposeful, elegant.

### Information Hierarchy

| Tier | Recognition Time | Information |
|------|-----------------|-------------|
| **Tier 1** | < 0.5s | WHO (customer name), WHAT action needed, HOW MUCH owed |
| **Tier 2** | 1-2s | WHEN (date/time + urgency), WHAT tour, special requirements |
| **Tier 3** | On demand | Guest breakdown, payment history, activity log |

### Operator Intent Mapping

| Intent | Frequency | Time Pressure | Optimization |
|--------|-----------|---------------|--------------|
| Take Action | 60% | High | Primary action button prominent |
| Answer Question | 25% | Immediate | Contact info 1-click accessible |
| Prepare for Tour | 10% | Medium | Special requirements impossible to miss |
| Audit/Review | 5% | Low | Collapsible detail sections |

---

## Zone Architecture

```
+----------------------------------------------------------------+
|  ZONE 1: HEADER (Customer + Primary Action)                    |
|  Height: auto | Sticky: no | Priority: Tier 1                  |
+----------------------------------------------------------------+
|  ZONE 2: CONTEXT BAR (Tour + Date + Time + Urgency)            |
|  Height: 48px | Sticky: no | Priority: Tier 2                  |
+----------------------------------------------------------------+
|  ZONE 3: ALERT ZONE (Conditional - Special Requirements)       |
|  Height: auto (0 if empty) | Sticky: no | Priority: Tier 2     |
+----------------------------------------------------------------+
|  ZONE 4: STATUS ZONE (Twin Cards)                              |
|  Height: auto | Sticky: no | Priority: Tier 1                  |
+----------------------------------------------------------------+
|  ZONE 5: CONTENT ZONE (Scrollable, Collapsible)                |
|  Height: flex | Sticky: no | Priority: Tier 3                  |
+----------------------------------------------------------------+
|  ZONE 6: ACTION ZONE (Floating on scroll)                      |
|  Height: 72px | Sticky: yes (bottom) | Priority: Tier 1        |
+----------------------------------------------------------------+
```

### Zone Spacing

| Between Zones | Value | Tailwind |
|---------------|-------|----------|
| Header -> Context | 16px | `gap-4` |
| Context -> Alert | 16px | `gap-4` |
| Alert -> Status | 16px | `gap-4` |
| Status -> Content | 24px | `gap-6` |
| Content sections | 24px | `space-y-6` |

---

## Typography Scale

### Zone 1: Header

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Customer Name | 30px | 700 | 1.2 | -0.025em | `text-3xl font-bold tracking-tight` |
| Customer Name (mobile) | 24px | 700 | 1.2 | -0.025em | `text-2xl font-bold tracking-tight` |
| Phone Number | 14px | 500 | 1.5 | 0 | `text-sm font-medium` |
| Email | 14px | 400 | 1.5 | 0 | `text-sm` |
| Reference Number | 12px | 400 | 1.5 | 0 | `text-xs font-mono` |

### Zone 2: Context Bar

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Tour Name | 14px | 500 | 1.5 | 0 | `text-sm font-medium` |
| Date/Time | 14px | 400 | 1.5 | 0 | `text-sm` |
| Urgency Badge | 12px | 700 | 1.5 | 0.05em | `text-xs font-bold uppercase tracking-wider` |

### Zone 3: Alert Zone

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Alert Title | 12px | 700 | 1.5 | 0.05em | `text-xs font-bold uppercase tracking-wider` |
| Alert Content | 14px | 500 | 1.5 | 0 | `text-sm font-medium` |
| Alert Detail | 14px | 400 | 1.5 | 0 | `text-sm` |

### Zone 4: Status Cards

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Card Label | 12px | 500 | 1.5 | 0.05em | `text-xs font-medium uppercase tracking-wider` |
| Status Text | 16px | 600 | 1.5 | 0 | `text-base font-semibold` |
| Balance Amount (large) | 24px | 700 | 1.2 | -0.01em | `text-2xl font-bold tracking-tight tabular-nums` |
| Balance Amount (paid) | 20px | 700 | 1.2 | 0 | `text-xl font-bold tabular-nums` |
| Sub-detail | 10px | 400 | 1.5 | 0 | `text-[10px]` |

### Zone 5: Content Cards

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Section Title | 14px | 600 | 1.5 | 0.05em | `text-sm font-semibold uppercase tracking-wide` |
| Card Title | 14px | 500 | 1.5 | 0 | `text-sm font-medium` |
| Body Text | 14px | 400 | 1.5 | 0 | `text-sm` |
| Meta Text | 12px | 400 | 1.5 | 0 | `text-xs` |
| Monospace Values | 14px | 400 | 1.5 | 0 | `text-sm font-mono tabular-nums` |

### Zone 6: Floating Action Bar

| Element | Size | Weight | Line Height | Tracking | Tailwind Class |
|---------|------|--------|-------------|----------|----------------|
| Customer Name | 16px | 600 | 1.5 | 0 | `text-base font-semibold` |
| Balance Display | 14px | 700 | 1.5 | 0 | `text-sm font-bold tabular-nums` |
| Button Text | 14px | 500 | 1.5 | 0 | `text-sm font-medium` |

---

## Spacing System

### Base Unit: 4px

All spacing derives from a 4px base unit for mathematical harmony.

### Spacing Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Icon-to-text gaps, tight groups |
| `space-1.5` | 6px | Badge padding, small gaps |
| `space-2` | 8px | Inline elements, button padding |
| `space-3` | 12px | Component internal padding |
| `space-4` | 16px | Card padding, section gaps |
| `space-5` | 20px | Card padding (comfortable) |
| `space-6` | 24px | Major section gaps |
| `space-8` | 32px | Page-level spacing |

### Card Padding by Device

| Device | Horizontal | Vertical | Tailwind |
|--------|------------|----------|----------|
| Mobile (<640px) | 16px | 16px | `p-4` |
| Tablet (640px+) | 20px | 20px | `sm:p-5` |
| Desktop (1024px+) | 20px | 20px | `p-5` |

### Inter-Element Spacing

| Context | Gap | Tailwind |
|---------|-----|----------|
| Icon + Label | 6px | `gap-1.5` |
| Icon + Text (inline) | 8px | `gap-2` |
| Button groups | 8px | `gap-2` |
| Card sections | 16px | `space-y-4` |
| Form fields | 16px | `space-y-4` |
| List items | 8px | `space-y-2` |

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Cards | 12px | `rounded-xl` |
| Buttons | 8px | `rounded-lg` |
| Badges | 9999px | `rounded-full` |
| Progress bars | 9999px | `rounded-full` |
| Inputs | 8px | `rounded-lg` |
| Avatars | 9999px | `rounded-full` |

---

## Color Tokens

### Booking Status Colors

| Status | Background (Light) | Text (Light) | Background (Dark) | Text (Dark) |
|--------|-------------------|--------------|-------------------|-------------|
| **Confirmed** | `hsl(160 84% 95%)` | `hsl(160 84% 25%)` | `hsl(160 45% 12%)` | `hsl(160 55% 55%)` |
| **Pending** | `hsl(38 92% 95%)` | `hsl(38 92% 30%)` | `hsl(38 50% 12%)` | `hsl(38 70% 65%)` |
| **Cancelled** | `hsl(0 72% 95%)` | `hsl(0 72% 30%)` | `hsl(0 45% 14%)` | `hsl(0 60% 60%)` |
| **Completed** | `hsl(217 91% 95%)` | `hsl(217 91% 30%)` | `hsl(217 50% 14%)` | `hsl(217 70% 65%)` |
| **No Show** | `hsl(220 14% 95%)` | `hsl(220 13% 30%)` | `hsl(0 0% 14%)` | `hsl(0 0% 60%)` |

### Payment Status Colors

| Status | Background (Light) | Text (Light) | Background (Dark) | Text (Dark) |
|--------|-------------------|--------------|-------------------|-------------|
| **Paid** | `hsl(160 84% 95%)` | `hsl(160 84% 25%)` | `hsl(160 45% 12%)` | `hsl(160 55% 55%)` |
| **Partial** | `hsl(280 60% 95%)` | `hsl(280 70% 35%)` | `hsl(280 40% 14%)` | `hsl(280 55% 70%)` |
| **Pending** | `hsl(45 93% 94%)` | `hsl(45 90% 28%)` | `hsl(45 50% 12%)` | `hsl(45 70% 70%)` |
| **Refunded** | `hsl(270 67% 95%)` | `hsl(270 67% 30%)` | `hsl(270 40% 15%)` | `hsl(270 55% 65%)` |

### Urgency Badge Colors

| Urgency | Background | Text | Border | Animation |
|---------|------------|------|--------|-----------|
| **Today** | `bg-red-500` | `text-white` | none | `animate-pulse` |
| **Tomorrow** | `bg-amber-500` | `text-white` | none | none |
| **Soon (2-3 days)** | `bg-blue-500` | `text-white` | none | none |
| **Normal (4+ days)** | `bg-slate-200` | `text-slate-700` | none | none |
| **Past** | `bg-slate-400` | `text-white` | none | none |

### Alert Zone Colors

| Priority | Background (Light) | Border (Light) | Background (Dark) | Border (Dark) |
|----------|-------------------|----------------|-------------------|---------------|
| **High** (Dietary/Access) | `bg-amber-50` | `border-amber-400` | `bg-amber-950/50` | `border-amber-500` |
| **Medium** (Requests) | `bg-blue-50` | `border-blue-300` | `bg-blue-950/50` | `border-blue-500` |

### Action Button Colors

| Action | Background | Hover | Text | Shadow |
|--------|------------|-------|------|--------|
| **Confirm** | `bg-emerald-600` | `bg-emerald-700` | `text-white` | `shadow-emerald-500/25` |
| **Complete** | `bg-blue-600` | `bg-blue-700` | `text-white` | `shadow-blue-500/25` |
| **Collect Payment** | `bg-amber-600` | `bg-amber-700` | `text-white` | `shadow-amber-500/25` |
| **Refund** | `bg-amber-600` | `bg-amber-700` | `text-white` | `shadow-amber-500/25` |
| **Cancel** | `bg-red-600` | `bg-red-700` | `text-white` | `shadow-red-500/25` |

### Balance Display Colors

| State | Text Color (Light) | Text Color (Dark) |
|-------|-------------------|-------------------|
| **Balance Due > 0** | `text-amber-600` | `text-amber-400` |
| **Fully Paid** | `text-emerald-600` | `text-emerald-400` |

---

## Component Specifications

### Zone 1: BookingHeader

**File:** `/apps/crm/src/components/bookings/booking-detail/booking-header.tsx`

**Structure:**
```tsx
<header>
  <div className="flex items-start justify-between gap-4">
    {/* Left: Back button + Customer info */}
    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
      <BackButton />
      <CustomerInfo>
        <CustomerName />      {/* 30px bold */}
        <ContactInfo />       {/* Phone + Email, clickable */}
        <ReferenceNumber />   {/* Monospace, copy-on-click */}
      </CustomerInfo>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <UrgencyBadge />        {/* Hidden on mobile in header */}
      <PrimaryActionButton />
      <QuickContactMenu />
      <EditButton />
    </div>
  </div>

  {/* Context Row */}
  <ContextBar />
</header>
```

**Component Props:**
```typescript
interface BookingHeaderProps {
  booking: BookingData;
  orgSlug: string;
  urgency: UrgencyLevel | null;
  primaryAction: PrimaryAction | null;
  onBack: () => void;
  className?: string;
}
```

**shadcn Components Used:**
- `Button` (back, edit, primary action)
- `DropdownMenu` (quick contact menu)

---

### Zone 2: ContextBar (Embedded in Header)

**Structure:**
```tsx
<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
  <UrgencyBadge />           {/* Mobile only */}
  <TourName />               {/* MapPin icon + name */}
  <DateDisplay />            {/* Calendar icon + date */}
  <TimeDisplay />            {/* Clock icon + time */}
  <GuestCount />             {/* Users icon + count */}
  <CustomerProfileLink />    {/* Right-aligned link */}
</div>
```

**Icon Specifications:**
- All icons: 16px (`h-4 w-4`)
- Icon color: `text-muted-foreground`
- Gap icon-to-text: 6px (`gap-1.5`)

---

### Zone 3: OperationsAlertBar

**File:** `/apps/crm/src/components/bookings/booking-detail/operations-alert-bar.tsx`

**Conditional Rendering:** Only renders if booking has:
- `dietaryRequirements` (booking or any participant)
- `accessibilityNeeds` (booking or any participant)
- `specialRequests`

**Structure:**
```tsx
<div className="relative overflow-hidden rounded-lg border-2 {priorityColors}">
  {/* Attention pulse overlay for high priority */}
  {hasHighPriority && (
    <div className="absolute inset-0 bg-amber-400/10 animate-pulse" />
  )}

  <div className="relative flex items-start gap-3 p-3 sm:p-4">
    <AlertIcon />             {/* Circular background, white icon */}
    <AlertContent>
      <AlertTitle />          {/* "Operations Alert" */}
      <AlertItems />          {/* Dietary, Accessibility, Request */}
    </AlertContent>
  </div>
</div>
```

**Alert Item Structure:**
```tsx
<div className="flex items-center gap-2 text-sm">
  <Icon className="h-4 w-4 flex-shrink-0" />
  <span className="font-semibold">{label}:</span>
  <span className="truncate">{detail}</span>
</div>
```

---

### Zone 4: StatusCards

**File:** `/apps/crm/src/components/bookings/booking-detail/status-cards.tsx`

**Structure:**
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Booking Status Card */}
  <div className="rounded-lg border border-border bg-card p-3">
    <Label />                 {/* "Status" */}
    <StatusDisplay>
      <StatusIcon />          {/* 24px circular bg with 14px icon */}
      <StatusText />          {/* 16px semibold, colored */}
    </StatusDisplay>
  </div>

  {/* Balance Card */}
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="flex items-start justify-between">
      <BalanceInfo>
        <Label />             {/* "Balance" */}
        <BalanceAmount />     {/* 24px bold if due, 20px if paid */}
        <TotalHint />         {/* "of $X.XX" if balance due */}
      </BalanceInfo>
      <CollectButton />       {/* Only if balance > 0 */}
      {/* OR */}
      <PaidBadge />           {/* If balance = 0 */}
    </div>
    <ProgressBar />           {/* Only if balance due */}
  </div>
</div>
```

**Progress Bar Specification:**
- Height: 4px (`h-1`)
- Background: `bg-muted`
- Fill: `bg-emerald-500`
- Radius: `rounded-full`
- Animation: `transition-all duration-500`

---

### Zone 5: Content Cards

#### GuestSummaryCard

**File:** `/apps/crm/src/components/bookings/booking-detail/guest-summary-card.tsx`

**Auto-expand Rule:** If any participant has special needs, card starts expanded.

**Structure:**
```tsx
<div className="rounded-xl border bg-card overflow-hidden {borderHighlight}">
  {/* Header - Always Visible */}
  <div className="p-4 sm:p-5">
    <GuestCountSection>
      <Icon />                {/* Users icon in primary bg */}
      <Title />               {/* "Guests" + count */}
      <Breakdown />           {/* Adults, Children, Infants */}
    </GuestCountSection>

    <SpecialNeedsBadge />     {/* If applicable */}

    <ExpandButton />          {/* Show/hide details */}
  </div>

  {/* Expanded Content */}
  {isExpanded && (
    <ParticipantList />
  )}
</div>
```

**Participant Row Structure:**
```tsx
<div className="px-4 sm:px-5 py-3 {highlightIfNeeds}">
  <div className="flex items-start justify-between gap-3">
    <ParticipantInfo>
      <Name />                {/* First Last */}
      <TypeBadge />           {/* adult/child/infant */}
      <Email />               {/* Optional */}
    </ParticipantInfo>

    <NeedsIndicators />       {/* Dietary, Accessibility icons + text */}
    {/* OR */}
    <NoNeedsBadge />          {/* Green checkmark */}
  </div>
</div>
```

#### Guide Assignment Card

**Compact design for empty state:** Single line with action button.

**Structure (with assignment):**
```tsx
<div className="rounded-xl border bg-card overflow-hidden">
  <CardHeader>
    <Title />                 {/* "Guide Assignment" */}
    <AssignButton />
  </CardHeader>

  <div className="divide-y divide-border">
    {assignments.map(a => (
      <AssignmentRow>
        <Avatar />            {/* Initials in primary/10 bg */}
        <GuideInfo>
          <Name />
          <Email />
          <StatusBadge />
        </GuideInfo>
        <RemoveButton />
      </AssignmentRow>
    ))}
  </div>
</div>
```

**Structure (empty):**
```tsx
<div className="p-8 text-center">
  <Icon />                    {/* UserPlus, muted */}
  <Text />                    {/* "No guide assigned" */}
</div>
```

---

### Zone 6: FloatingActionBar

**File:** `/apps/crm/src/components/bookings/booking-detail/floating-action-bar.tsx`

**Visibility Logic:** Uses IntersectionObserver on header ref.
Shows when header scrolls out of view (with -100px margin for anticipation).

**Structure:**
```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 {visibility}">
  <div className="pb-safe">
    <div className="mx-auto max-w-4xl px-4 pb-4">
      <div className="flex items-center justify-between gap-3 sm:gap-4
                      px-4 py-3 sm:px-5 sm:py-4
                      bg-card/95 backdrop-blur-lg
                      border border-border/50 rounded-2xl
                      shadow-xl shadow-black/10 dark:shadow-black/30">

        <CustomerContext>
          <Name />            {/* Font-semibold */}
          <Balance />         {/* Colored, with "due" or "paid" suffix */}
        </CustomerContext>

        <Actions>
          <CollectButton />   {/* If balance due */}
          <PrimaryAction />
          <ContactButton />   {/* Optional */}
        </Actions>
      </div>
    </div>
  </div>
</div>
```

**Visibility Animation:**
```css
/* Hidden state */
transform: translateY(100%);
opacity: 0;

/* Visible state */
transform: translateY(0);
opacity: 1;

/* Transition */
transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
```

---

## Animation Specifications

### Urgency Pulse (Today's Tours)

```css
@keyframes urgency-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.02);
  }
}

.urgency-today {
  animation: urgency-pulse 2s ease-in-out infinite;
}
```

**Tailwind:** Use `animate-pulse` (built-in) or custom animation.

### Alert Zone Attention Pulse

```css
@keyframes alert-attention {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 0.1;
  }
}

.alert-pulse-overlay {
  animation: alert-attention 2s ease-in-out infinite;
}
```

**Implementation:** Overlay div with `bg-amber-400/10 animate-pulse`

### Collapsible Section Expand/Collapse

```css
/* Using Radix/shadcn Collapsible */
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
```

**Duration:** 200ms
**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out)

### Floating Bar Slide

```css
.floating-bar-enter {
  transform: translateY(100%);
  opacity: 0;
}

.floating-bar-enter-active {
  transform: translateY(0);
  opacity: 1;
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-bar-exit {
  transform: translateY(0);
  opacity: 1;
}

.floating-bar-exit-active {
  transform: translateY(100%);
  opacity: 0;
  transition: all 200ms cubic-bezier(0.7, 0, 0.84, 0);
}
```

### Progress Bar Fill

```css
.progress-fill {
  transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Tailwind:** `transition-all duration-500`

### Button Press Feedback

```css
button:active {
  transform: scale(0.98);
  transition: transform 75ms ease-out;
}
```

**Tailwind:** `active:scale-[0.98] transition-transform duration-75`

### Copy Reference Feedback

```css
/* Icon swap from Copy to Check */
.copy-success {
  color: hsl(160 84% 39%); /* emerald-600 */
  transition: color 150ms ease;
}
```

**Duration:** Show check for 2000ms, then revert.

---

## Responsive Breakpoints

### Breakpoint Definitions

| Name | Min-width | CSS Variable |
|------|-----------|--------------|
| **Mobile** | 0px | default |
| **sm** | 640px | `@media (min-width: 640px)` |
| **md** | 768px | `@media (min-width: 768px)` |
| **lg** | 1024px | `@media (min-width: 1024px)` |
| **xl** | 1280px | `@media (min-width: 1280px)` |

### Layout Changes by Breakpoint

#### Mobile (< 640px)

- **Header:** Single column, stacked
- **Customer Name:** 24px (`text-2xl`)
- **Primary Action:** Icon only on mobile
- **Urgency Badge:** Shown in context bar (below header)
- **Status Cards:** 2-column grid maintained
- **Content Grid:** Single column
- **Floating Bar:** Full width, smaller padding
- **Keyboard Shortcuts:** Hidden

#### Tablet (640px - 1023px)

- **Header:** Two columns
- **Customer Name:** 30px (`text-3xl`)
- **Primary Action:** Icon + text
- **Urgency Badge:** Desktop position (header right)
- **Status Cards:** 2-column grid
- **Content Grid:** Single column
- **Card Padding:** 20px (`sm:p-5`)

#### Desktop (1024px+)

- **Header:** Full layout
- **Content Grid:** 2/3 + 1/3 columns (`lg:grid-cols-3`)
- **Left Column:** Operations info (`lg:col-span-2`)
- **Right Column:** Financial + Meta
- **Keyboard Shortcuts:** Visible

### Component-Specific Responsive Rules

#### BookingHeader

```tsx
// Customer name
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">

// Primary action button label
<span className="hidden sm:inline">{primaryAction.label}</span>

// Urgency badge positions
<span className="hidden lg:inline-flex ..."> {/* Desktop */}
<span className="lg:hidden inline-flex ...">  {/* Mobile */}

// Contact info line length
<a className="truncate max-w-[220px]">
```

#### StatusCards

```tsx
// Always 2 columns on all devices
<div className="grid grid-cols-2 gap-3">
```

#### FloatingActionBar

```tsx
// Container padding
<div className="px-4 py-3 sm:px-5 sm:py-4">

// Button label visibility
<span className="hidden sm:inline">Collect</span>
```

#### Content Grid

```tsx
// Main content area
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
    {/* Operations content */}
  </div>
  <div className="space-y-6">
    {/* Financial + Meta */}
  </div>
</div>
```

### Touch Target Requirements

| Element | Minimum Size | Tailwind |
|---------|--------------|----------|
| Buttons | 44x44px | `min-h-[44px] min-w-[44px]` |
| Icon Buttons | 44x44px | `h-11 w-11` or `size-icon` |
| Tap areas | 44x44px | `.touch-target` utility class |
| Form inputs | 44px height | `h-11` or `py-3` |

### Safe Area Handling (iOS)

```css
/* For floating bar */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* For page content */
.mobile-content-padding {
  padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0));
}
```

---

## Accessibility Requirements

### Focus Management

- All interactive elements must have visible focus rings
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Tab order follows visual order (top-to-bottom, left-to-right)
- Floating bar receives focus when it appears

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate forward |
| `Shift+Tab` | Navigate backward |
| `Enter/Space` | Activate buttons/links |
| `Escape` | Close modals, go back |
| `P` | Open payment modal (if balance due) |
| `E` | Edit booking |

### Color Contrast

All text must meet WCAG AA standards:
- Normal text: 4.5:1 ratio minimum
- Large text (18px+): 3:1 ratio minimum

Status colors have been validated for contrast in both light and dark modes.

### ARIA Labels

```tsx
// Back button
<button aria-label="Go back">

// Reference number copy
<button title="Click to copy">

// Urgency badge
<span role="status" aria-label={`Tour is ${urgency.label}`}>

// Floating bar
<div role="complementary" aria-label="Quick actions">

// Loading states
<button aria-busy="true" aria-disabled="true">
```

### Screen Reader Considerations

- Customer name announced as heading level 1
- Status changes announced via `aria-live="polite"`
- Alert zone announced via `role="alert"`
- Balance due clearly labeled with "due" or "paid" suffix

---

## Implementation Checklist

### Phase 1: Critical Fixes (Current State)

- [x] Operations alert bar for special requirements
- [x] Twin status cards (booking status + balance)
- [x] Customer-first header design
- [x] Floating action bar with IntersectionObserver
- [x] Guest summary card with expand/collapse
- [x] Urgency badge system

### Phase 2: Polish & Refinement

- [ ] Add urgency pulse animation for today's tours
- [ ] Implement proper collapsible animations (Radix)
- [ ] Add copy-to-clipboard feedback animation
- [ ] Refine progress bar animation
- [ ] Add skeleton loading states
- [ ] Implement error boundary

### Phase 3: Mobile Optimization

- [ ] Test all touch targets (44px minimum)
- [ ] Verify safe area handling
- [ ] Test floating bar on various devices
- [ ] Optimize for landscape orientation
- [ ] Test with screen readers

### Phase 4: Performance

- [ ] Lazy load activity log
- [ ] Optimize re-renders in status cards
- [ ] Add proper memo() to stable components
- [ ] Prefetch adjacent bookings

### Component Files Reference

```
/apps/crm/src/components/bookings/booking-detail/
  index.ts                    # Exports
  types.ts                    # TypeScript interfaces
  booking-header.tsx          # Zone 1+2
  operations-alert-bar.tsx    # Zone 3
  status-cards.tsx            # Zone 4
  guest-summary-card.tsx      # Zone 5 - Guests
  floating-action-bar.tsx     # Zone 6
  quick-contact-menu.tsx      # Contact dropdown
```

---

## Appendix: CSS Custom Properties

For custom animations not covered by Tailwind:

```css
:root {
  /* Easing curves */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Durations */
  --duration-fast: 75ms;
  --duration-normal: 150ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
}
```

---

*Document Version: 1.0*
*Last Updated: 2025-12-28*
*Author: Design System Team*
