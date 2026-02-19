# Phase 9: Storefront Design Overhaul & Feature Integration

## Context

Phase 8 shipped a **functionally complete** booking storefront — customers can browse tours, select dates, pay via Stripe, and get confirmed bookings. But the visual design is basic: hardcoded hex colors, no shared layout primitives, generic boilerplate copy, minimal animations, and inconsistent patterns across pages. Phase 9 transforms this into a world-class storefront at the quality level of Airbnb Experiences, Linear, or Vercel — where every pixel builds trust and drives conversion.

**The gap:** The storefront works, but it doesn't *sell*. The design doesn't match the quality of the CRM we built in Phases 0-7. Phase 9 closes that gap.

---

## Current State Audit

### Design Issues
- **18 hardcoded hex colors** across 8 files (`#1f130b`, `#2d1f16`, `#ead9cd`, `#fffaf7`, etc.) instead of design tokens
- **No shared layout primitives** — every page uses `<div className="container px-4 py-8">` independently
- **Generic boilerplate** — About page has placeholder text, Privacy/Terms have hardcoded "January 1, 2025" dates
- **Inconsistent breadcrumbs** — some use `<a>`, others use `<Link>`, different patterns
- **No animations** — only basic CSS hover transitions, no page entrances, no micro-interactions
- **No mobile booking bar** — on phones, the booking sidebar falls below content and is hard to find
- **Basic loading states** — `animate-pulse` divs, no shimmer effects
- **No lightbox** — image gallery has thumbnails but no full-screen viewer
- **Services not wired** — WaiverService (signature capture), AddOnService (upsells) not connected to web

### Files to Transform
```
apps/web/src/
├── components/
│   ├── header.tsx ............... 3 hardcoded colors, no mobile animation
│   ├── footer.tsx ............... 3 hardcoded colors, visual clutter
│   ├── tour-card.tsx ............ 2 hardcoded colors, basic hover
│   ├── trust-bar.tsx ............ basic flat grid
│   ├── image-gallery.tsx ........ no lightbox, no swipe
│   ├── review-section.tsx ....... 3 hardcoded colors, no distribution chart
│   ├── booking-flow.tsx ......... basic stepper, no transitions
│   ├── availability-calendar.tsx  no month-swipe animation
│   └── booking-confirmation.tsx . no celebration animation
├── app/org/[slug]/
│   ├── page.tsx ................. landing page (280 lines, inline hero)
│   ├── tours/[tourSlug]/page.tsx  tour detail (423 lines, no mobile bar)
│   ├── about/page.tsx ........... pure boilerplate (187 lines)
│   ├── contact/page.tsx ......... decent but needs primitives (211 lines)
│   ├── terms/page.tsx ........... hardcoded date, no TOC
│   ├── privacy/page.tsx ......... hardcoded date, no TOC
│   ├── booking/success/page.tsx . no celebration
│   └── booking/cancelled/page.tsx basic
```

---

## Sub-Phases

### 9.1 — Design Foundation Layer (Days 1-3)

**Goal:** Build the shared primitives everything else uses. Nothing ships without this.

#### 9.1.1 Token Cleanup
Replace all 18 hardcoded hex values with semantic tokens. Add 3-4 web-specific tokens to `globals.css`:

| Hardcoded | Replacement |
|-----------|-------------|
| `bg-[#1f130b]`, `bg-[#2d1f16]` | `bg-foreground` or new `bg-surface-dark` |
| `border-[#ead9cd]`, `border-[#f4e7df]`, `border-[#f1e1d6]`, `border-[#e8d7cb]` | `border-border` |
| `bg-[#fffaf7]` | `bg-background` |
| `bg-[#fcf8f5]` | `bg-secondary` |

**Files:** `packages/ui/src/globals.css` + all 8 component files with hardcoded colors

#### 9.1.2 Layout Primitives
Create `apps/web/src/components/layout/`:

| Component | Purpose | Replaces |
|-----------|---------|----------|
| `PageShell` | Standard page wrapper with padding, max-width, entrance animation | Every `<div className="container px-4 py-8">` |
| `Section` | Semantic section with consistent vertical rhythm (py-12/py-16) | Ad-hoc spacing between content blocks |
| `SectionHeader` | Title + subtitle + optional action | Repeated `<h2>` + `<p className="text-xs text-muted-foreground">` |
| `Breadcrumb` | Unified Next.js Link breadcrumb | 6 different breadcrumb patterns |
| `HeroSection` | Image backdrop + gradient + content slot | Inline hero markup on landing page |
| `CardSurface` | Consistent card container (p-6 rounded-lg border bg-card) | ~15 instances of same pattern |

#### 9.1.3 Animation Utilities
Create `apps/web/src/components/layout/animate.tsx`:

- `FadeIn` — fade + slide-up on mount (CSS `@starting-style` or IntersectionObserver)
- `StaggerChildren` — incremental delay on child elements
- Shimmer keyframe for skeleton screens (gradient sweep, not basic pulse)

**Files to create:**
- `apps/web/src/components/layout/page-shell.tsx`
- `apps/web/src/components/layout/section.tsx`
- `apps/web/src/components/layout/section-header.tsx`
- `apps/web/src/components/layout/breadcrumb.tsx`
- `apps/web/src/components/layout/hero-section.tsx`
- `apps/web/src/components/layout/card-surface.tsx`
- `apps/web/src/components/layout/animate.tsx`
- `apps/web/src/components/layout/skeleton.tsx`
- `apps/web/src/components/layout/index.ts`

---

### 9.2 — Header, Footer & Navigation (Days 3-5)

**Goal:** These appear on every page — fixing them upgrades the entire site instantly.

#### Header (`apps/web/src/components/header.tsx`)
- Replace hardcoded colors with tokens
- Smooth slide-down mobile menu animation (CSS `grid-template-rows: 0fr → 1fr`)
- Active link highlighting based on current route
- Scroll-triggered shadow (transparent at top → `shadow-sm` when scrolled)
- More prominent "Book Now" CTA

#### Footer (`apps/web/src/components/footer.tsx`)
- Replace hardcoded colors with tokens
- Add a "Book your next adventure" CTA banner above footer columns
- Reduce clutter (currency/timezone pills are odd for single-business site)
- More impactful trust badges

**Depends on:** 9.1

---

### 9.3 — Page-by-Page Redesign (Days 5-10)

#### 9.3.1 Landing Page (`apps/web/src/app/org/[slug]/page.tsx`)
- **Hero:** Use `HeroSection` primitive, full-width with scroll indicator
- **Trust Bar:** Larger numbers, animated count-up on scroll, background pattern
- **Tour Cards:** Gradient overlay on hover, staggered entrance animation, "View Details" on hover
- **Section rhythm:** Wrap in `Section` + `SectionHeader`, add "Why Book With Us" section
- **Featured tours:** Horizontal scroll on mobile instead of vertical stack
- **Pagination:** Load More button for mobile instead of page numbers

#### 9.3.2 Tour Detail Page (`apps/web/src/app/org/[slug]/tours/[tourSlug]/page.tsx`)
- **Image Gallery:** Lightbox modal with full-screen view, mobile swipe (`scroll-snap`), image count badge
- **Mobile Booking Bar:** Fixed bottom bar with price + "Check Availability" on phones (new component)
- **Sticky Sidebar:** Urgency indicator ("X people booked this week"), "Select a date" CTA state
- **Content Sections:** Wrap in `CardSurface`, visual icons per section
- **Reviews:** Star distribution bars, avatar initials
- **Similar Tours:** Horizontal scroll on mobile

**New files:**
- `apps/web/src/components/lightbox.tsx`
- `apps/web/src/components/mobile-booking-bar.tsx`

#### 9.3.3 Booking Flow (`apps/web/src/components/booking-flow.tsx`)
- **Progress Stepper:** Connected line between steps, compact mobile bar ("Step 2 of 4")
- **Step Transitions:** Slide animation between steps
- **Summary Sidebar:** Mini tour image, animated price total, trust badges
- **Confirmation:** Checkmark/confetti animation, clear next-steps CTAs

#### 9.3.4 About Page (`apps/web/src/app/org/[slug]/about/page.tsx`)
- Replace generic boilerplate with data-driven content
- "By The Numbers" stats section: tours count, guests served, years operating (from analytics + org data)
- "What Makes Us Different" with tour-business differentiators
- Team/guides section (if guide data available from `GuideService`)
- Use all layout primitives

#### 9.3.5 Contact Page (`apps/web/src/app/org/[slug]/contact/page.tsx`)
- Use layout primitives throughout
- FAQ accordion (CSS-only, using existing accordion keyframes)
- Map preview if address available

#### 9.3.6 Terms & Privacy Pages
- Replace hardcoded "January 1, 2025" with dynamic date
- `PageShell` with narrow mode for reading width
- Unified `Breadcrumb` component
- Sticky table-of-contents sidebar on desktop

#### 9.3.7 Booking Management Pages (lookup, success, cancelled)
- Lookup: illustration above form, `CardSurface`
- Success: celebration animation, "Add to Calendar", "Share", "View Details" CTAs
- Cancelled: sympathetic design with easy re-booking CTA

#### 9.3.8 Not Found & Loading States
- Not Found: icon composition instead of emoji, popular tours links
- Loading: shimmer skeleton matching actual page layouts per route

**Depends on:** 9.1, 9.2

---

### 9.4 — Core Experience Features (Days 10-14)

#### 9.4.1 Digital Waiver Integration
Wire `WaiverService.signWaiver()` into the customer journey:
- Post-booking waiver step (after payment confirmation, before final done state)
- Scrollable waiver text display
- Signature pad (canvas-based, touch-friendly)
- Agreement checkbox + submit
- API route: `apps/web/src/app/api/waivers/sign/route.ts`
- Component: `apps/web/src/components/waiver-step.tsx`
- Modify `booking-flow.tsx` and `booking-context.tsx` for conditional waiver step

#### 9.4.2 Add-On Upsell Selection
Wire `AddOnService` as a booking flow step:
- Attractive upsell cards between ticket selection and customer details
- Each card: name, price, image/icon, toggle
- Running total in sidebar updates on toggle
- Component: `apps/web/src/components/addon-selection.tsx`
- Modify `booking-flow.tsx` for add-ons step

#### 9.4.3 Enhanced Availability Calendar
- Swipe gesture for month navigation on mobile
- Animate month transitions (slide left/right)
- More visually prominent time slot selection
- "Popular" or "Best Price" badges on specific slots

#### 9.4.4 Mobile Booking Experience
- Fixed bottom booking bar on tour detail (price + CTA)
- Collapsible booking summary drawer on mobile booking flow
- One-tap-call phone button on contact page
- Full-screen mobile menu overlay with 48px touch targets

**Depends on:** 9.3

---

### 9.5 — Performance & Polish (Days 14-17)

#### 9.5.1 Skeleton Screens
Replace all `animate-pulse` with shimmer skeletons matching actual layouts:
- Skeleton primitives: `SkeletonText`, `SkeletonImage`, `SkeletonCard`
- Route-specific loading.tsx for about, contact, booking pages
- `apps/web/src/components/layout/skeleton.tsx`

#### 9.5.2 Image Optimization
- Verify all `<Image>` components have proper `sizes` attributes
- Add blur placeholders for tour images
- Ensure non-hero images don't use `priority`

#### 9.5.3 SEO Enhancement
- Add structured data to pages that lack it (about, terms, privacy)
- Verify OG images generated per tour
- Ensure all pages have proper metadata

#### 9.5.4 Accessibility Audit
- Keyboard navigation through entire booking flow
- Focus management on step transitions
- `aria-live` regions for price updates
- Minimum 44px touch targets verified

**Depends on:** 9.3, 9.4

---

## Dependency Graph

```
9.1 Foundation ──► 9.2 Header/Footer ──► 9.3 Page Redesigns ──┬── 9.4 Features
                                                                └── 9.5 Polish
```

9.1 must complete first. 9.4 and 9.5 can run in parallel after 9.3.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `apps/web/src/components/layout/page-shell.tsx` | Standard page wrapper |
| `apps/web/src/components/layout/section.tsx` | Section with vertical rhythm |
| `apps/web/src/components/layout/section-header.tsx` | Title + subtitle pair |
| `apps/web/src/components/layout/breadcrumb.tsx` | Unified breadcrumb |
| `apps/web/src/components/layout/hero-section.tsx` | Hero with image backdrop |
| `apps/web/src/components/layout/card-surface.tsx` | Consistent card container |
| `apps/web/src/components/layout/animate.tsx` | FadeIn, StaggerChildren |
| `apps/web/src/components/layout/skeleton.tsx` | Shimmer skeleton primitives |
| `apps/web/src/components/layout/index.ts` | Barrel exports |
| `apps/web/src/components/lightbox.tsx` | Full-screen image viewer |
| `apps/web/src/components/mobile-booking-bar.tsx` | Fixed bottom CTA on mobile |
| `apps/web/src/components/waiver-step.tsx` | Digital waiver with signature |
| `apps/web/src/components/addon-selection.tsx` | Add-on upsell cards |
| `apps/web/src/app/api/waivers/sign/route.ts` | Waiver signing API |

## Modified Files Summary

| File | Changes |
|------|---------|
| `packages/ui/src/globals.css` | Web tokens, shimmer keyframes |
| `apps/web/src/components/header.tsx` | Token cleanup, mobile animation, scroll shadow |
| `apps/web/src/components/footer.tsx` | Token cleanup, CTA banner |
| `apps/web/src/components/tour-card.tsx` | Token cleanup, hover effects, stagger |
| `apps/web/src/components/trust-bar.tsx` | Token cleanup, animated numbers |
| `apps/web/src/components/image-gallery.tsx` | Token cleanup, lightbox, swipe |
| `apps/web/src/components/review-section.tsx` | Token cleanup, distribution chart |
| `apps/web/src/components/availability-calendar.tsx` | Month transitions, swipe |
| `apps/web/src/components/booking-flow.tsx` | Stepper redesign, transitions, waiver/addon steps |
| `apps/web/src/components/booking-confirmation.tsx` | Celebration animation, CTAs |
| `apps/web/src/components/ticket-selection.tsx` | Visual refinement |
| `apps/web/src/components/customer-details-form.tsx` | Visual refinement |
| `apps/web/src/components/payment-step.tsx` | Visual refinement, trust badges |
| `apps/web/src/app/org/[slug]/page.tsx` | Full landing page redesign |
| `apps/web/src/app/org/[slug]/tours/[tourSlug]/page.tsx` | Gallery overhaul, mobile bar |
| `apps/web/src/app/org/[slug]/about/page.tsx` | Data-driven redesign |
| `apps/web/src/app/org/[slug]/contact/page.tsx` | Layout primitives, FAQ accordion |
| `apps/web/src/app/org/[slug]/terms/page.tsx` | Dynamic date, TOC, primitives |
| `apps/web/src/app/org/[slug]/privacy/page.tsx` | Dynamic date, TOC, primitives |
| `apps/web/src/app/org/[slug]/booking/success/page.tsx` | Celebration, next-steps |
| `apps/web/src/app/org/[slug]/booking/cancelled/page.tsx` | Sympathetic redesign |
| `apps/web/src/app/org/[slug]/not-found.tsx` | Icon, popular tours links |
| `apps/web/src/app/org/[slug]/loading.tsx` | Shimmer skeletons |
| `apps/web/src/lib/booking-context.tsx` | Waiver + addon state |

---

## Verification

### Build Check
```bash
pnpm --filter @tour/web typecheck
pnpm --filter @tour/web lint
pnpm --filter @tour/web build
```

### Visual QA (per sub-phase)
1. Navigate to `demo-tours.localhost:3001` (or configured subdomain)
2. Landing page: hero renders, trust bar shows real stats, tour cards have hover animations
3. Tour detail: gallery lightbox works, mobile booking bar appears on phones, reviews show distribution
4. Booking flow: stepper transitions smoothly, add-ons selectable, waiver step shows when applicable
5. All pages: no hardcoded hex colors in DevTools, consistent breadcrumbs, layout primitives used
6. Mobile: booking bar fixed at bottom, swipe gestures work on gallery/calendar, touch targets ≥ 44px
7. Loading states: shimmer skeletons match page layouts
8. Lighthouse: target 90+ performance, 95+ accessibility
