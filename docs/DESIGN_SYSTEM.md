# Tour Design System (Single Source of Truth)

**Last Updated:** February 2026
**Status:** Active UI Standard

Clean, clear, and focused. The UI should feel like a sharp operations console that just works: fast, intuitive, and quietly branded. This is the only authoritative design guide for the CRM and Web apps.

---

## Design Personality

We are not generic SaaS. Our personality is clean, clear, focused, and sharp — with enough color and branding to give it a soul.

Core traits:
- Clean and legible (no clutter, no noise)
- Focused and decisive (clear hierarchy and single primary action)
- Sharp with color (purposeful, confident accents)
- Intuitive to move around (navigation feels obvious and frictionless)
- Quietly branded (recognizable without being loud)

Visual signature:
- Strong information hierarchy with crisp spacing
- Calm surfaces, decisive actions
- Color used for meaning and emphasis, never decoration
- Micro-interactions that confirm progress and reduce doubt

---

## Design Architecture (Layers)

1. Foundations
   - Typography, color, spacing, motion, elevation
2. Tokens
   - Semantic CSS variables in `packages/ui/src/globals.css`
3. Primitives
   - Buttons, inputs, cards, badges, etc.
4. Components
   - Tables, calendars, charts, dialogs, panels
5. Patterns
   - Filters, bulk actions, side panels, command palette
6. Pages
   - CRM dashboards, booking flows, web booking

Rule: New UI starts at the lowest layer possible. Do not skip layers.

---

## Typography

Fonts:
- UI: Instrument Sans
- Mono: JetBrains Mono (numbers, IDs, timestamps, code)

Usage rules:
- Default body uses `font-sans`
- Numeric data uses `tabular-nums` and `font-mono` when precision matters
- Headings use tighter tracking

Type scale:
- text-2xs 10px badges
- text-xs 12px meta, timestamps
- text-sm 14px body, labels, nav
- text-base 16px inputs
- text-lg 18px card titles
- text-xl 20px page titles
- text-2xl 24px headlines
- text-3xl 30px KPIs

Weights:
- 400 body
- 500 labels
- 600 headings
- 700 KPIs only

---

## Color System (Semantic First)

Never hardcode color values. Only use semantic tokens.

Backgrounds:
- bg-background (page)
- bg-card (elevated surfaces)
- bg-muted (subtle)
- bg-accent (hover)
- bg-popover (menus)

Text:
- text-foreground
- text-muted-foreground
- text-primary-foreground
- text-destructive-foreground

Borders:
- border-border
- border-input

Interactive:
- bg-primary text-primary-foreground
- bg-secondary text-secondary-foreground
- bg-destructive text-destructive-foreground

Status classes:
- status-pending, status-confirmed, status-completed, status-cancelled, status-no-show
- payment-pending, payment-partial, payment-paid, payment-refunded, payment-failed

---

## Spacing + Layout

Base spacing unit: 4px

Layout rules:
- CRM uses nav rail (60px) + main content + context panel (280px)
- Context panel hidden under 1280px
- Forms max width around `max-w-2xl`
- Tables full width, dense by default

Spacing rules:
- Inline gaps use `gap-2`
- Section gaps use `space-y-6`
- Card padding is `p-4`

---

## Elevation + Surfaces

Light mode:
- Use subtle shadow + border for cards

Dark mode:
- Use thin outline, minimal glow

Rule: elevation is for hierarchy, not decoration.

---

## Motion

Motion is confirmation, not decoration.

Durations:
- 75ms press feedback
- 150ms hover, focus
- 200ms dropdowns
- 300ms modals

Easing:
- --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
- --ease-in: cubic-bezier(0.7, 0, 0.84, 0)

Always respect prefers-reduced-motion.

---

## Iconography

- Use Lucide icons only
- 16px for dense UI, 20px for primary actions
- Avoid stroke weight changes

---

## Components and Patterns

Tables:
- Sticky header
- Row hover
- Status tinting
- Bulk actions
- Pagination or virtualization for large datasets

Forms:
- Clear label, hint, error
- Inline validation, never blocking
- Disabled states must still be readable

Dialogs and panels:
- Trap focus
- Close on Esc
- Return focus to trigger

Notifications:
- Success and error must be specific
- Avoid generic toasts like "Success"

---

## Content and Copy

Voice:
- Clear, short, action-oriented
- Avoid fluff
- Always tell the user what changed

Microcopy rules:
- Prefer verbs ("Assign guide" not "Guide assignment")
- Use consistent tense
- Errors should state cause and recovery

---

## Accessibility Standards

Required:
- Focus ring on all interactive elements
- Keyboard navigation for all controls
- Skip link at app root
- Minimum touch target 44px
- Use aria-live for success and error messaging

---

## Performance and Perception

- Skeletons over spinners
- Optimistic updates when safe
- Navigation progress for slow routes
- Avoid layout shift in data tables and calendars

---

## Code Review Checklist (UI/UX Standards)

Use this checklist in PR reviews to enforce the design system and avoid drift.

Personality + Clarity
- UI feels clean, clear, focused, and sharp with color
- Primary action is obvious and singular per section
- Navigation and flows are intuitive without needing explanation
- Branding is present but restrained (soul without noise)

Typography + Hierarchy
- Instrument Sans for UI, JetBrains Mono for numbers/IDs/timestamps
- Type scale matches the system (no random sizes)
- Numeric data uses `tabular-nums` and `font-mono` where precision matters
- Headings use tighter tracking; KPIs only use 700 weight

Spacing + Layout
- Spacing follows 4px system (no arbitrary values)
- Section stacks use `space-y-6`
- Card padding is `p-4` (or `p-5` only for hero/spotlight)
- Forms use clear vertical rhythm (label → input → hint/error)

Color + Tokens
- Tokens only (no hardcoded hex or Tailwind colors outside semantic tokens)
- Status colors used semantically (success/warning/info/destructive/muted)
- Accent color used only for emphasis/primary actions
- Gradients are subtle and only for branded moments

Components + States
- Buttons follow primary/secondary hierarchy, no competing primaries
- Tables are dense with sticky header, hover, and bulk actions where needed
- Every screen has loading (skeleton), empty (CTA), error (recovery)
- Disabled states remain readable

Motion + Feedback
- Motion confirms actions, never distracts
- Uses standard durations (75/150/200/300ms)
- Respects prefers-reduced-motion

Accessibility
- Focus ring on all interactive elements
- Minimum 44px touch targets
- Full keyboard navigation
- `aria-live` for success/error messaging

Performance + Perception
- Skeletons over spinners for data-heavy areas
- Optimistic updates where safe
- Avoid layout shift in tables/calendars

---

## Implementation Rules

- Tokens defined in `packages/ui/src/globals.css` are mandatory
- New UI primitives belong in `apps/crm/src/components/ui/` or `packages/ui/src/`
- No third-party UI dependency without approval
- Use CVA for variants and `forwardRef` for interactive components
