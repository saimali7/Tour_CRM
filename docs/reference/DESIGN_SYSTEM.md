# Design System

Dense, fast, accessible. Every pixel earns its place.

---

## Philosophy

1. **Density** — Operations software, not a marketing site
2. **Speed** — <100ms perceived, skeletons over spinners, optimistic updates
3. **Disclosure** — Show now, reveal on demand
4. **Consistency** — Same pattern everywhere
5. **Accessible** — WCAG AA, keyboard-first

---

## Layout

```
┌─────┬────────────────────────────────────┬──────────┐
│ NAV │           MAIN CONTENT             │ CONTEXT  │
│ 60px│         Fluid Width                │  280px   │
└─────┴────────────────────────────────────┴──────────┘
```

**Nav Rail (60px)** — Icons + labels, org avatar top, settings bottom
**Main Content** — Full-width tables, max-w-2xl forms
**Context Panel (280px)** — Stats, details, quick actions. Hidden <1280px

```tsx
// Root structure
<div className="flex h-screen bg-background">
  <aside className="w-[60px] flex-shrink-0 border-r border-border" />
  <main className="flex-1 overflow-auto" />
  <aside className="hidden xl:block w-[280px] border-l border-border" />
</div>
```

---

## Typography

| Scale | Size | Usage |
|-------|------|-------|
| `text-2xs` | 10px | Badges |
| `text-xs` | 12px | Meta, timestamps |
| `text-sm` | 14px | Body, labels, nav |
| `text-base` | 16px | Inputs |
| `text-lg` | 18px | Card titles |
| `text-xl` | 20px | Page titles |
| `text-2xl` | 24px | Headlines |
| `text-3xl` | 30px | KPIs |

```tsx
// Patterns
<h1 className="text-xl font-semibold tracking-tight">Page Title</h1>
<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Section</h2>
<p className="text-sm text-foreground">Body</p>
<span className="text-xs text-muted-foreground">Meta</span>
<span className="font-mono text-sm tabular-nums">$1,234.00</span>
```

**Weights:** 400 body, 500 labels, 600 headings, 700 KPIs only

---

## Colors

### Semantic Tokens

```tsx
// Backgrounds
bg-background    // Page
bg-card          // Elevated surfaces
bg-muted         // Subtle, disabled
bg-accent        // Hover states

// Foregrounds
text-foreground         // Primary
text-muted-foreground   // Secondary

// Interactive
bg-primary text-primary-foreground
bg-secondary text-secondary-foreground
bg-destructive text-destructive-foreground

// Borders
border-border    // Default
border-input     // Form inputs
ring-ring        // Focus
```

### Status Classes

```tsx
// Booking
<Badge className="status-confirmed">Confirmed</Badge>
<Badge className="status-pending">Pending</Badge>
<Badge className="status-cancelled">Cancelled</Badge>
<Badge className="status-completed">Completed</Badge>
<Badge className="status-no-show">No Show</Badge>

// Payment
<Badge className="payment-paid">Paid</Badge>
<Badge className="payment-partial">Partial</Badge>
<Badge className="payment-pending">Pending</Badge>
<Badge className="payment-refunded">Refunded</Badge>
```

---

## Spacing

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight |
| `space-2` | 8px | Elements |
| `space-3` | 12px | Components |
| `space-4` | 16px | Cards, padding |
| `space-6` | 24px | Sections |
| `space-8` | 32px | Page sections |

```tsx
// Patterns
<div className="p-4">              // Card
<div className="px-6 py-6">        // Page
<div className="space-y-6">        // Sections
<div className="space-y-2">        // Elements
<div className="gap-2">            // Inline
```

---

## Components

### Buttons

```tsx
<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button size="sm">Small</Button>
<Button size="icon"><X /></Button>
```

### Cards

```tsx
// Static
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Interactive
<Link
  href="/path"
  className="block rounded-lg border border-border bg-card p-4
             hover:bg-muted/50 hover:border-muted-foreground/20 transition-all"
/>
```

### Tables

```tsx
<div className="rounded-lg border overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead>Column</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/50">
        <TableCell>Data</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>

// Row status tinting
<TableRow className="row-confirmed">  // Green tint
<TableRow className="row-pending">    // Yellow tint
<TableRow className="row-cancelled">  // Opacity 0.6
```

### Empty State

```tsx
<div className="empty-state">
  <div className="empty-state-icon"><Calendar /></div>
  <h3 className="empty-state-title">No tours scheduled</h3>
  <p className="empty-state-description">Create your first tour</p>
  <Button>Add Tour</Button>
</div>
```

### Skeleton

```tsx
<div className="skeleton skeleton-text" />
<div className="skeleton skeleton-text-sm" />
<div className="skeleton skeleton-avatar" />
<div className="skeleton skeleton-button" />
```

---

## Motion

| Duration | Usage |
|----------|-------|
| 75ms | Press feedback |
| 150ms | Hover, focus |
| 200ms | Dropdowns |
| 300ms | Modals |

```tsx
transition-colors                       // Color only
transition-all duration-150             // General
hover:scale-[1.02] active:scale-[0.98]  // Interactive
animate-pulse                           // Loading
animate-spin                            // Spinner
```

**Easing:**
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);
```

---

## Accessibility

```tsx
// Focus ring
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Live regions
<div role="status" aria-live="polite">Success message</div>
<div role="alert" aria-live="assertive">Error message</div>

// Loading
<button aria-busy="true" aria-disabled="true">Loading...</button>
```

**Keyboard:**
- `Tab` / `Shift+Tab` — Navigate
- `Enter` / `Space` — Activate
- `Escape` — Close
- `Arrow keys` — Within components
- `Cmd+K` — Command palette
- `Cmd+1-7` — Section nav

---

## File Structure

```
components/
  ui/           # Primitives (Button, Input, Card...)
  layout/       # NavRail, ContextPanel, PageHeader
  data-display/ # DataTable, StatCard, StatusBadge
  forms/        # FormField, SearchInput, DatePicker
```

---

## Checklist

**Component:**
- [ ] Semantic tokens only
- [ ] Focus states
- [ ] Keyboard accessible
- [ ] Loading state
- [ ] Error state
- [ ] Dark mode

**Page:**
- [ ] Page title
- [ ] Empty state
- [ ] Loading skeleton
- [ ] Error boundary
- [ ] Responsive
