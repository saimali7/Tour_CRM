# Phase 6: UX Overhaul

**Status:** ✅ COMPLETE
**Started:** December 13, 2025
**Completed:** December 13, 2025
**Goal:** Transform the CRM from isolated feature modules into a unified, connected system

---

## Executive Summary

The Tour CRM has all core features built (Phases 0-5: bookings, customers, guides, pricing, reporting). However, these features operate as **isolated modules** rather than a **cohesive system**. This phase addresses fundamental UX issues that prevent the CRM from being production-ready for real tour operators.

### The Core Problem

The CRM was built feature-by-feature without a unified interaction model. Each page works in isolation, but tour operators don't think in "pages" - they think in **tasks** that span multiple entities.

**Example: Walk-in customer calls to book a tour**

| Current Flow | Ideal Flow |
|--------------|------------|
| 1. Navigate to Customers | 1. Press `Cmd+K` → "New Booking" |
| 2. Click "Add Customer" | 2. Search customer → "Not found" |
| 3. Fill form, submit | 3. Click "Create New" (inline modal) |
| 4. Navigate to Bookings | 4. Enter: Name, Email, Phone |
| 5. Click "New Booking" | 5. Select tour/time |
| 6. Scroll dropdown for customer | 6. Complete booking |
| 7. Scroll dropdown for schedule | |
| 8. Submit | |
| **12+ clicks, 3-5 minutes** | **6-8 clicks, 45 seconds** |

---

## Why This Refactor

### 1. Booking Flow Assumes Existing Customers

**Problem:** The booking form requires selecting a customer from a dropdown. For walk-in or phone bookings, the operator must:
- Leave the booking form
- Create the customer separately
- Return to booking form
- Find the customer in a dropdown (limited to 100 items, no search)

**Impact:** Walk-in bookings take 3x longer than necessary. Staff frustration. Lost sales during busy periods.

### 2. No Global Search

**Problem:** To find any record (booking, customer, tour), users must:
- Know which section it's in
- Navigate to that section
- Use the local search

**Impact:** Customer service inquiries take longer. Context switching breaks workflow.

### 3. Related Data Not Visible

**Problem:** Pages don't show related entities:
- Customer profile doesn't show their bookings inline
- Schedule detail doesn't show its bookings
- Tour detail doesn't show its schedules

**Impact:** Staff must navigate multiple pages to get full context. Information scattered across the system.

### 4. Browser Dialogs Instead of Proper Modals

**Problem:** The CRM uses browser `confirm()` and `prompt()` for actions like:
- Cancel booking confirmation
- Reschedule reason input
- Delete confirmations

**Impact:** Unprofessional appearance. No consistent styling. Poor mobile experience.

### 5. Basic Dropdowns Don't Scale

**Problem:** Entity selectors use plain `<select>` elements:
- Limited to 100 items
- No search/filter capability
- No "create new" option

**Impact:** Unusable once organization has 100+ customers. Breaks core workflows.

---

## Design Philosophy

### The Connected CRM

Instead of isolated pages, every piece of the CRM connects to every other piece:

```
                    ┌─────────────────────┐
                    │   Command Palette   │  ← Universal access (Cmd+K)
                    │   Global Search     │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │ Booking │◄─────────►│Customer │◄─────────►│Schedule │
   │         │  Related  │         │  Related  │         │
   └────┬────┘   Data    └────┬────┘   Data    └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Slide-Over Panel │ ← Quick view anywhere
                    │  Inline Actions   │ ← Act without navigating
                    │  Toast Feedback   │ ← Confirm actions
                    └───────────────────┘
```

### Five Design Principles

1. **Everything Connected** - No isolated pages; all entities link to related data
2. **Search Everywhere** - `Cmd+K` accesses any entity from anywhere
3. **Create Inline** - Never navigate away to create a related entity
4. **Actions in Context** - Buttons appear where you need them
5. **Consistent Patterns** - Same interaction model on every page

---

## Feature List

### Foundation Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **Combobox** | Searchable select with "Create New" option | Radix Popover + cmdk |
| **SlideOver** | Side panel for quick view/edit without navigation | Radix Dialog (Sheet) |
| **ConfirmModal** | Replace browser `confirm()` with styled dialogs | Radix Dialog |
| **Toast** | Action feedback (success, error, info) | Sonner |
| **CommandPalette** | Global `Cmd+K` search and quick actions | cmdk |

### Quick View Components

Each entity gets a slide-over view showing key information and actions:

| Component | Shows | Actions |
|-----------|-------|---------|
| **BookingQuickView** | Customer, schedule, status, payment, participants | View full, reschedule, cancel |
| **CustomerQuickView** | Contact info, stats, booking history summary | Quick book, view full |
| **ScheduleQuickView** | Tour, time, guide, capacity, bookings | Add booking, view full |
| **TourQuickView** | Details, pricing, upcoming schedules | Create schedule, view full |
| **GuideQuickView** | Contact, availability, assignments | Assign to schedule, view full |

### Inline Creation

Create related entities without leaving current context:

| Component | Fields | Trigger |
|-----------|--------|---------|
| **CustomerQuickCreate** | Name, email, phone | "Create New" in customer Combobox |
| **ScheduleQuickCreate** | Tour, date, time, capacity | "Create New" in schedule Combobox |

### Page Enhancements

| Page | Enhancement | Benefit |
|------|-------------|---------|
| **Dashboard** | Actionable alerts with inline buttons | Fix issues without navigating |
| **Booking Form** | Customer Combobox with inline create | Complete bookings in one flow |
| **Booking Form** | Schedule Combobox with date filter | Find available times quickly |
| **Booking Form** | Promo code field | Apply discounts during booking |
| **Customer Detail** | "Quick Book" button | Start booking pre-filled |
| **Customer Detail** | Booking history with "Rebook" | Clone past bookings |
| **Schedule Detail** | Bookings panel | See who's booked |
| **Tour Detail** | Schedules panel | See upcoming instances |

### Global Features

| Feature | Description |
|---------|-------------|
| **Command Palette** | `Cmd+K` opens search from anywhere |
| **Global Search** | Search bookings, customers, tours, schedules, guides simultaneously |
| **Keyboard Shortcuts** | `Cmd+B` new booking, `Cmd+N` new customer |
| **Toast Notifications** | All mutations show success/error feedback |
| **Loading Skeletons** | Consistent loading states across all pages |

---

## Technical Approach

### Package Additions

```json
{
  "cmdk": "^1.0.0",           // Command palette
  "sonner": "^1.0.0",         // Toast notifications
  "@radix-ui/react-dialog": "^1.0.0",   // Modal and Sheet
  "@radix-ui/react-popover": "^1.0.0",  // Combobox dropdown
  "class-variance-authority": "^0.7.0", // Component variants
  "clsx": "^2.0.0",           // Class merging
  "tailwind-merge": "^2.0.0", // Tailwind class merging
  "tailwindcss-animate": "^1.0.0"       // Animation utilities
}
```

### Component Architecture

All new components follow shadcn/ui patterns:
- Radix primitives for accessibility
- Tailwind for styling
- `cn()` utility for class merging
- Forwarded refs for composition

### File Structure

```
apps/crm/src/
├── components/
│   ├── ui/                    # Foundation components
│   │   ├── dialog.tsx         # Modal base
│   │   ├── sheet.tsx          # SlideOver base
│   │   ├── command.tsx        # Command palette base
│   │   ├── combobox.tsx       # Searchable select
│   │   ├── popover.tsx        # Dropdown container
│   │   ├── sonner.tsx         # Toast provider
│   │   ├── confirm-modal.tsx  # Confirmation dialogs
│   │   └── slide-over.tsx     # SlideOver wrapper
│   ├── command-palette.tsx    # Global Cmd+K
│   ├── bookings/
│   │   ├── booking-quick-view.tsx
│   │   └── booking-form.tsx   # (to be overhauled)
│   └── customers/
│       ├── customer-quick-view.tsx
│       └── customer-quick-create.tsx
├── lib/
│   └── utils.ts               # cn() helper
└── app/org/[slug]/(dashboard)/
    ├── layout.tsx             # CommandPalette added
    └── providers.tsx          # Toaster, SlideOverProvider
```

### State Management

- **Server State:** tRPC queries with React Query (existing)
- **UI State:** React useState for modals, slide-overs
- **Global UI:** React Context for SlideOverProvider

### Migration Strategy

1. **Non-breaking additions first** - Add new components without changing existing ones
2. **Parallel implementations** - New Combobox alongside old select
3. **Page-by-page migration** - Update one page at a time
4. **Feature flag ready** - Can roll back if issues arise

---

## Success Metrics

| Workflow | Current | Target | Measurement |
|----------|---------|--------|-------------|
| Walk-in booking | 12+ clicks | <8 clicks | Click count in user testing |
| Repeat customer booking | 10+ clicks | 3-4 clicks | Click count |
| Find any record | 5+ clicks | 1-2 clicks | Time to locate |
| Customer service inquiry | 8+ clicks | 3-4 clicks | Resolution time |
| Morning ops check | View only | Inline actions | Tasks completed from dashboard |

---

## Implementation Progress

### Completed

- [x] Documentation (FEATURES.md, SPRINT.md, PROGRESS.md)
- [x] `cn()` utility function
- [x] Dialog component (Radix)
- [x] Sheet component (Radix)
- [x] Popover component (Radix)
- [x] Command component (cmdk)
- [x] Combobox component with "Create New"
- [x] Sonner toast component
- [x] ConfirmModal component
- [x] SlideOver wrapper + Provider
- [x] CommandPalette with quick actions
- [x] Toaster integration in layout
- [x] BookingQuickView component
- [x] CustomerQuickView component

### In Progress

- [x] ScheduleQuickView component ✅
- [x] TourQuickView component ✅
- [x] GuideQuickView component ✅
- [x] CustomerQuickCreate modal ✅
- [x] Booking form with Combobox + inline customer creation ✅
- [x] Global search tRPC router ✅
- [x] CommandPalette wired to search API ✅
- [x] Customer detail Quick Book button ✅
- [x] Booking rebook UI (navigation-based) ✅
- [x] Schedule detail bookings panel ✅
- [x] Tour detail schedules panel ✅
- [x] ConfirmModal usage in customer/tour pages ✅
- [x] useDebounce hook ✅

### Pending

- [x] Dashboard actionable alerts ✅
- [x] Replace remaining browser dialogs (bookings/[id], schedules, guides) ✅
- [x] Loading skeletons ✅
- [x] Empty states ✅

### Bug Fixes Applied (Dec 13, 2025)

| Component | Issue | Fix |
|-----------|-------|-----|
| `command.tsx` | Missing DialogTitle (accessibility error) | Added visually hidden `<DialogTitle className="sr-only">` |
| `combobox.tsx` | Memory leak in AsyncCombobox async operations | Added `isMounted` flag and AbortController for cleanup |
| `combobox.tsx` | Race condition in debounced search | Added AbortController to cancel stale requests |
| `confirm-modal.tsx` | Missing DialogDescription (accessibility) | Added `{description || " "}` fallback |
| `confirm-modal.tsx` | Stale closure in useConfirmModal hook | Fixed with functional state updates |
| `slide-over.tsx` | Missing SheetTitle (accessibility) | Added `<SheetTitle>{title || " "}</SheetTitle>` |
| `slide-over.tsx` | Memory leak with timeout on unmount | Added cleanup function for timeoutRef |
| `schedule-quick-view.tsx` | Missing error handling for tRPC query | Added error destructuring and error message display |
| `tour-quick-view.tsx` | Missing error handling + key collision | Added error handling, fixed `key={\`${tag}-${index}\`}` |
| `guide-quick-view.tsx` | Missing error handling + key collisions | Added error handling, fixed keys for languages/certs |
| `booking-form.tsx` | No overbooking validation | Added check: totalParticipants vs availableSpots |
| `booking-form.tsx` | Invalid discount/tax not caught | Added validation for positive numbers |
| `booking-form.tsx` | Pricing ignores children/infants | Fixed: children at 50% price, infants free |

---

## Files Modified/Created

### New Files

| File | Purpose |
|------|---------|
| `lib/utils.ts` | cn() class merging utility |
| `hooks/use-debounce.ts` | Debounce hook for search |
| `components/ui/dialog.tsx` | Modal base component |
| `components/ui/sheet.tsx` | Sheet/SlideOver base |
| `components/ui/popover.tsx` | Popover base |
| `components/ui/command.tsx` | Command palette base |
| `components/ui/combobox.tsx` | Searchable select |
| `components/ui/sonner.tsx` | Toast provider |
| `components/ui/confirm-modal.tsx` | Confirmation modals |
| `components/ui/slide-over.tsx` | SlideOver wrapper |
| `components/command-palette.tsx` | Global Cmd+K |
| `components/bookings/booking-quick-view.tsx` | Booking slide-over |
| `components/customers/customer-quick-view.tsx` | Customer slide-over |
| `components/customers/customer-quick-create.tsx` | Inline customer creation |
| `components/schedules/schedule-quick-view.tsx` | Schedule slide-over |
| `components/tours/tour-quick-view.tsx` | Tour slide-over |
| `components/guides/guide-quick-view.tsx` | Guide slide-over |
| `server/routers/search.ts` | Global search tRPC router |

### Modified Files

| File | Change |
|------|--------|
| `packages/config/tailwind.config.ts` | Added tailwindcss-animate plugin |
| `app/org/[slug]/(dashboard)/layout.tsx` | Added CommandPalette |
| `app/org/[slug]/(dashboard)/providers.tsx` | Added Toaster, SlideOverProvider |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Non-breaking additions first, parallel implementations |
| Performance regression | Lazy loading for slide-over content, virtualization for long lists |
| Learning curve for users | Consistent patterns, keyboard shortcuts visible in UI |
| Accessibility issues | Using Radix primitives which are ARIA-compliant |

---

## Timeline

This refactor is structured as **Sprint 7** with work organized by dependency:

**Week 1:** Foundation components (DONE)
**Week 2:** Quick view components + inline creation
**Week 3:** Booking form overhaul
**Week 4:** Page updates + cross-entity connections
**Week 5:** Global search + polish

---

*Document maintained as part of Phase 6 UX Overhaul. Update as implementation progresses.*
