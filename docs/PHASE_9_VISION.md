# Phase 9: Storefront Overhaul — Design, SEO & Experience

## Context

Phase 8 shipped a functionally complete storefront. Phase 9 makes it exceptional on three pillars:

1. **Design Architecture** — shared layout primitives, token cleanup, consistent patterns
2. **SEO** — category hub pages that rank, structured data, link architecture
3. **Experience** — every page delights, every interaction builds trust, every click drives conversion

**Current navigation state:** The mega menu in `apps/web/src/components/header.tsx` (774 lines) is fully built with Framer Motion, 4 category tabs, and mobile drawer. But all links point to `/?category=Desert+Tours` (query params). These don't get indexed or ranked by Google. The fix is dedicated category hub pages that the mega menu links into.

**The SEO opportunity:** A Dubai tour operator targeting "Dubai desert safari", "Dubai city tours", "Dubai water activities" needs indexable, content-rich category pages — not just filtered query strings. Category hub pages are the SEO backbone. Tour detail pages handle long-tail. Together they dominate the search funnel.

---

## The Page Architecture

### URL Structure

```
/ ................................ Discovery hub (hero, categories, featured tours)
/experiences/[category] .......... Category hub pages — THE SEO backbone (NEW)
/tours/[tourSlug] ................ Tour detail — conversion page
/tours/[tourSlug]/book ........... Booking flow
/about ........................... Trust + brand story
/contact ......................... Contact + FAQ
/booking ......................... Manage booking (lookup/magic link)
/booking/success ................. Post-payment confirmation
/booking/cancelled ............... Cancellation handling
/privacy ......................... Privacy policy
/terms ........................... Terms & conditions
```

### The SEO Funnel

```
Google search: "Dubai desert safari"
        ↓
  /experiences/desert-safaris    ← Category hub ranks here
  (rich content + FAQ + tour grid)
        ↓
  /tours/desert-sunset-safari    ← Tour detail ranks for specific names
  (gallery + reviews + book)
        ↓
  /tours/[slug]/book             ← Booking flow (no SEO needed, just conversion)
```

### Mega Menu Connection

```
Current:  mega menu tabs → /?category=Desert+Tours  (unindexable)
Phase 9:  mega menu tabs → /experiences/desert-safaris  (indexable, content-rich)
```

---

## Sub-Phases

### 9.1 — Design Foundation Layer (Days 1-3)

**Goal:** Shared primitives everything else builds on. Nothing else ships without this.

#### Token Cleanup
Replace 18+ hardcoded hex values across 8 component files with semantic tokens:

| Hardcoded | Semantic Replacement |
|-----------|---------------------|
| `bg-[#1f130b]`, `bg-[#2d1f16]` | `bg-foreground` (or new `--web-surface-dark` token) |
| `border-[#ead9cd]`, `border-[#f4e7df]`, `border-[#f1e1d6]`, `border-[#e8d7cb]` | `border-border` |
| `bg-[#fffaf7]` | `bg-background` |
| `bg-[#fcf8f5]` | `bg-secondary` |

Add to `packages/ui/src/globals.css`:
- `--web-surface-dark` — dark overlay for hero sections
- `--web-border-warm` — the warm border tint used throughout
- `@keyframes shimmer` — gradient sweep for skeleton screens
- `@keyframes fade-in-up` — page entrance animation

#### Layout Primitives
Create `apps/web/src/components/layout/`:

| Component | Props | Replaces |
|-----------|-------|---------|
| `PageShell` | `children, narrow?, className?` | Every `<div className="container px-4 py-8">` |
| `Section` | `children, id?, separator?` | Ad-hoc section spacing |
| `SectionHeader` | `title, subtitle?, align?, action?` | Repeated h2 + muted p pattern |
| `Breadcrumb` | `items: [{label, href?}]` | 6 inconsistent breadcrumb implementations |
| `HeroSection` | `imageUrl?, title, subtitle?, badge?, height?` | Inline hero markup |
| `CardSurface` | `children, padded?, elevated?` | 15+ instances of `p-6 rounded-lg border bg-card` |

#### Animation Utilities (`apps/web/src/components/layout/animate.tsx`)
- `FadeIn` — opacity + translateY on mount (IntersectionObserver for scroll-triggered)
- `StaggerChildren` — incremental `animation-delay` on direct children
- `SlideIn` — directional slide for step transitions

#### Skeleton Primitives (`apps/web/src/components/layout/skeleton.tsx`)
- `SkeletonText` — configurable width/lines with shimmer
- `SkeletonImage` — configurable aspect ratio
- `SkeletonCard` — tour card shape skeleton

**Files to create:** `page-shell.tsx`, `section.tsx`, `section-header.tsx`, `breadcrumb.tsx`, `hero-section.tsx`, `card-surface.tsx`, `animate.tsx`, `skeleton.tsx`, `index.ts`

---

### 9.2 — Header, Footer & Navigation (Days 3-5)

**Goal:** Global elements that appear on every page — fix once, upgrade everywhere.

#### Header (`apps/web/src/components/header.tsx`)
- **Replace hardcoded colors** with tokens (trust strip, borders)
- **Dynamic mega menu data** — currently hardcoded tour names. Connect to real data:
  - Pass top 3 tours per category as props from layout
  - `org/[slug]/layout.tsx` fetches featured tours per category via `services.tour.getAll()`
  - Mega menu tab links update from `/?category=X` → `/experiences/[category-slug]`
- **Scroll behavior** — transparent at top → `shadow-sm bg-background/95 backdrop-blur` when scrolled
- **Active route highlighting** — currently all nav links look identical
- **Mobile menu** — ensure 48px touch targets, overlay backdrop

#### Footer (`apps/web/src/components/footer.tsx`)
- **Replace hardcoded colors** with tokens
- **Pre-footer CTA band** — full-width warm band above columns: "Ready for your Dubai adventure?" + "Browse Tours" button
- **Streamline trust badges** — redesign as icon + title + short text
- **Remove redundant currency/timezone pills** (not useful for single-business customers)
- **Category quick links** — add an "Experiences" column linking to each category hub page

**Depends on:** 9.1

---

### 9.3 — Category Hub Pages (Days 5-9) — THE SEO CORE

**Goal:** Indexable, content-rich pages that rank for category-level searches AND serve as the exploration surface the mega menu points to.

#### Route
`apps/web/src/app/org/[slug]/experiences/[category]/page.tsx`

Generated statically with ISR from 4 fixed category slugs:
- `desert-safaris` → "Desert Safaris & Dune Experiences"
- `city-tours` → "Dubai City Tours & Cultural Experiences"
- `water-activities` → "Dubai Water Sports & Marina Experiences"
- `private-tours` → "Private & Luxury Tour Experiences"

#### Page Structure (per category)

```
[HERO]
Full-width category hero image + gradient overlay
"Desert Safaris in Dubai" headline
"From golden dunes at sunrise to..." sub-headline
[Check availability] CTA

[TRUST STRIP]
"★ 4.9 · 2,400+ guests · Specialists since 2018"

[INTRO CONTENT]
2-3 paragraphs about this experience type in Dubai
"What to expect", "Best time to go", "Who it's for"
(This is the SEO content Google needs to rank the page)

[TOUR GRID]
Filtered tours for this category, sorted by popularity
TourCard components in 2-col grid (larger than 4-col listing)
"X experiences available"

[WHY CHOOSE US]
3-column: Expert local guides / Instant booking / Free cancellation

[FAQ SECTION]
4-6 questions specific to this category
Desert: "What to wear?", "Morning vs evening?", "Is it family-friendly?"
FAQ accordion + FAQPage schema markup

[RELATED CATEGORIES]
"You might also love..." → links to other category hub pages
(Critical for SEO internal linking + user exploration)
```

#### SEO Per Category Hub Page
- `generateMetadata()` with category-specific title (`"Desert Safaris Dubai | Book Online | [Org Name]"`), description, OG image
- `TourCategoryStructuredData` (new component) with `ItemList` + `TouristAttraction` schema
- `FAQStructuredData` with category-specific questions
- `BreadcrumbStructuredData`: Home → Experiences → Desert Safaris
- ISR revalidation: 3600s (tour data changes infrequently)

#### Files to Create
- `apps/web/src/app/org/[slug]/experiences/[category]/page.tsx`
- `apps/web/src/app/org/[slug]/experiences/[category]/loading.tsx`
- `apps/web/src/components/category-hero.tsx`
- `apps/web/src/components/category-faq.tsx`
- `apps/web/src/lib/category-config.ts` — slug → title/description/FAQ/hero image mapping

#### Update Mega Menu Links
In `header.tsx`, update all `href: "/?category=Desert+Tours"` → `href: "/experiences/desert-safaris"` (and equivalents)

**Depends on:** 9.1, 9.2

---

### 9.4 — Landing & Tour Pages Redesign (Days 8-13)

**Goal:** Full visual redesign of every page. The landing page becomes a discovery hub, not a tour listing.

#### 9.4.1 Landing Page (`apps/web/src/app/org/[slug]/page.tsx`)
The landing page is a pure discovery hub — not a paginated tour listing.

**Hero** — full-bleed, immersive:
- Full-width image with `HeroSection` primitive
- Headline: aspirational Dubai experience positioning
- Two CTAs: "Browse Experiences" (scrolls to categories) + search anchor
- Animated scroll chevron

**Category Grid** — the primary exploration entry:
- 4 large cards: full-bleed category image, name, "X experiences", arrow
- Desktop: 2×2 grid. Mobile: horizontal scroll rail
- Hover: scale + subtitle reveal
- Each links to `/experiences/[category]`

**Trust Bar** — animated count-up on scroll

**Featured This Week** — 3 tour cards with real booking data

**"Why Book Direct"** — 3-column: No middleman / Instant confirmation / Local experts

**Recent Reviews** — 3 quote cards with rating, quote, reviewer

**Final CTA band** — warm full-width call to action

#### 9.4.2 Tour Detail Page (`apps/web/src/app/org/[slug]/tours/[tourSlug]/page.tsx`)
- **Image Gallery** — mobile swipe (`scroll-snap`), lightbox modal, count badge "1/5"
- **Mobile Booking Bar** — fixed bottom: price + "Check Availability" (visible on phones when sidebar is off-screen)
- **Sidebar urgency** — "X booked this week", "Select a date to continue" idle state
- **Content sections** — `CardSurface` wrapper, icon per section
- **Reviews** — star distribution bars, avatar initials
- **Similar tours** — horizontal scroll on mobile
- **Breadcrumb** — Home / [Category] / [Tour Name] — category links to `/experiences/[category]` (SEO internal link)

**New files:**
- `apps/web/src/components/lightbox.tsx`
- `apps/web/src/components/mobile-booking-bar.tsx`

#### 9.4.3 Booking Flow (`apps/web/src/components/booking-flow.tsx`)
- **Progress stepper** — connected line, "Step 2 of 4" compact bar on mobile
- **Step transitions** — `SlideIn` animation between steps
- **Summary sidebar** — mini tour image, animated total, trust badges
- **Confirmation** — checkmark animation, "Add to Calendar" + "View Booking" + "Share" CTAs

#### 9.4.4 About Page (`apps/web/src/app/org/[slug]/about/page.tsx`)
Replace generic boilerplate with data-driven trust content:
- Stats: tours count, guests, years operating (from analytics service)
- Guide profiles from `GuideService` (name, photo, bio)
- "Our Expertise" → links to each category hub (internal linking)

#### 9.4.5 Contact, Terms, Privacy Pages
- Contact: layout primitives, FAQ accordion (CSS-only, existing keyframes)
- Terms/Privacy: remove hardcoded "January 1, 2025", narrow reading width, desktop TOC sidebar

#### 9.4.6 Booking Management + Error Pages
- Success: celebration animation, next-steps CTAs
- Cancelled: sympathetic tone, easy re-booking CTA
- Not Found: icon composition, links to category hubs
- All loading.tsx: shimmer skeletons matching page layouts

**Depends on:** 9.1, 9.2, 9.3

---

### 9.5 — Core Experience Features (Days 12-16)

**Goal:** Wire backend services for an exceptional customer journey.

#### 9.5.1 Digital Waiver Integration
Wire `WaiverService.signWaiver()` (already in `packages/services/`):
- Post-booking waiver step (after payment, before "Done") — conditional on tour config
- Scrollable text, signature pad (canvas, touch-friendly), agreement checkbox
- API: `apps/web/src/app/api/waivers/sign/route.ts`
- Component: `apps/web/src/components/waiver-step.tsx`
- Modify `booking-flow.tsx` + `booking-context.tsx`

#### 9.5.2 Add-On Upsell Selection
Wire `AddOnService` (already in `packages/services/`) as booking flow step:
- Between ticket selection and customer details
- Cards: name, price, icon/image, toggle
- Sidebar total updates on toggle
- Component: `apps/web/src/components/addon-selection.tsx`

#### 9.5.3 Enhanced Availability Calendar
`apps/web/src/components/availability-calendar.tsx`:
- Swipe gesture for month navigation on mobile
- Slide animation for month transitions
- Radio-card style time slot selection (not plain text)
- "Popular" badge on high-demand slots

#### 9.5.4 Mobile Booking Experience
- Fixed bottom booking bar on tour detail
- Collapsible summary drawer on mobile booking flow (replaces off-screen sidebar)

**Depends on:** 9.4

---

### 9.6 — SEO Architecture (Days 13-16, parallel with 9.5)

**Goal:** Every page is a search asset. Maximum crawlability and rich result eligibility.

#### Internal Linking Map

| Page | Links Out To |
|------|-------------|
| Landing page | All 4 category hub pages (category grid) |
| Category hub | Tour detail pages in that category + 3 other category hubs ("Related") |
| Tour detail | Its category hub (breadcrumb + "More [Category] Tours") |
| About page | Category hub pages ("Our Expertise" section) |
| Footer | All 4 category hub pages (new "Experiences" column) |

#### Structured Data Coverage (complete)

| Page | Schema Types |
|------|-------------|
| Landing | `TravelAgency` / `LocalBusiness` + `WebSite` with `SearchAction` |
| Category hub | `ItemList` + `TouristAttraction` + `FAQPage` + `BreadcrumbList` |
| Tour detail | `TouristAttraction` + `Product` + `AggregateRating` + `BreadcrumbList` ✅ (exists, verify) |
| About | `Organization` with `sameAs` social links |
| Contact | `ContactPage` |
| All pages | `BreadcrumbList` |

#### Sitemap Enhancement
`apps/web/src/app/org/[slug]/sitemap.ts` — add:
- All 4 `/experiences/[category]` pages with `changeFrequency: "weekly"`, `priority: 0.9`
- Currently only tour pages included

#### Canonical URL Strategy
- `/?category=Desert+Tours` → canonical to `/experiences/desert-safaris` (or 301 redirect)
- Prevents duplicate content indexing between filtered landing page and category hub

**Depends on:** 9.3

---

### 9.7 — Performance & Polish (Days 16-18)

#### Skeleton Screens
All `loading.tsx` files: shimmer skeletons matching actual page layouts. Missing: about, contact, experiences/[category]

#### Image Optimization
- All `<Image>` components have proper `sizes` hints
- `placeholder="blur"` + `blurDataURL` for above-fold images
- Non-hero images: remove accidental `priority` props

#### Accessibility Audit
- Keyboard navigation through full booking flow
- Focus management on step transitions
- `aria-live` regions for price updates
- WCAG contrast check after token changes

#### Lighthouse Targets
- Performance: 90+
- Accessibility: 95+
- SEO: 100
- Best Practices: 95+

---

## Dependency Graph

```
9.1 Foundation
    │
    ▼
9.2 Header/Footer/Nav ──────────────────────┐
    │                                        │
    ▼                                        │
9.3 Category Hub Pages (SEO Core)            │
    │                                        │
    ▼                                        ▼
9.4 Page Redesigns ──────────────────► 9.5 Features
    │                                   9.6 SEO Architecture (parallel)
    ▼
9.7 Polish & Lighthouse
```

---

## Complete File Inventory

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/org/[slug]/experiences/[category]/page.tsx` | Category hub page (SEO core) |
| `apps/web/src/app/org/[slug]/experiences/[category]/loading.tsx` | Category hub skeleton |
| `apps/web/src/components/category-hero.tsx` | Full-bleed category hero |
| `apps/web/src/components/category-faq.tsx` | Category-specific FAQ accordion |
| `apps/web/src/lib/category-config.ts` | Category slug → metadata/FAQ/hero config |
| `apps/web/src/components/layout/page-shell.tsx` | Standard page wrapper |
| `apps/web/src/components/layout/section.tsx` | Section with vertical rhythm |
| `apps/web/src/components/layout/section-header.tsx` | Title + subtitle pair |
| `apps/web/src/components/layout/breadcrumb.tsx` | Unified breadcrumb |
| `apps/web/src/components/layout/hero-section.tsx` | Hero with image backdrop |
| `apps/web/src/components/layout/card-surface.tsx` | Consistent card container |
| `apps/web/src/components/layout/animate.tsx` | FadeIn, StaggerChildren, SlideIn |
| `apps/web/src/components/layout/skeleton.tsx` | Shimmer skeleton primitives |
| `apps/web/src/components/layout/index.ts` | Barrel exports |
| `apps/web/src/components/lightbox.tsx` | Full-screen image viewer |
| `apps/web/src/components/mobile-booking-bar.tsx` | Fixed bottom CTA on mobile |
| `apps/web/src/components/waiver-step.tsx` | Digital waiver + signature pad |
| `apps/web/src/components/addon-selection.tsx` | Add-on upsell cards |
| `apps/web/src/app/api/waivers/sign/route.ts` | Waiver signing API |

### Modified Files

| File | Key Changes |
|------|------------|
| `packages/ui/src/globals.css` | Web tokens, shimmer + fade-in-up keyframes |
| `apps/web/src/components/header.tsx` | Token cleanup, mega menu → `/experiences/[category]`, dynamic data |
| `apps/web/src/components/footer.tsx` | Token cleanup, pre-footer CTA, category links column |
| `apps/web/src/app/org/[slug]/layout.tsx` | Fetch featured tours per category, pass to Header |
| `apps/web/src/components/tour-card.tsx` | Token cleanup, hover gradient, stagger animation |
| `apps/web/src/components/trust-bar.tsx` | Token cleanup, animated count-up |
| `apps/web/src/components/image-gallery.tsx` | Token cleanup, lightbox, mobile swipe |
| `apps/web/src/components/review-section.tsx` | Token cleanup, distribution bars, avatar initials |
| `apps/web/src/components/availability-calendar.tsx` | Month swipe, slide transitions |
| `apps/web/src/components/booking-flow.tsx` | Stepper redesign, step transitions, waiver + addon steps |
| `apps/web/src/components/booking-confirmation.tsx` | Celebration animation, CTAs |
| `apps/web/src/components/structured-data.tsx` | TourCategory, LocalBusiness, Organization schemas |
| `apps/web/src/app/org/[slug]/page.tsx` | Redesign: discovery hub with category grid (not listing) |
| `apps/web/src/app/org/[slug]/tours/[tourSlug]/page.tsx` | Gallery, mobile bar, category breadcrumb |
| `apps/web/src/app/org/[slug]/about/page.tsx` | Data-driven: stats, guides, category links |
| `apps/web/src/app/org/[slug]/contact/page.tsx` | Layout primitives, FAQ accordion |
| `apps/web/src/app/org/[slug]/terms/page.tsx` | Dynamic date, narrow mode, TOC sidebar |
| `apps/web/src/app/org/[slug]/privacy/page.tsx` | Dynamic date, narrow mode, TOC sidebar |
| `apps/web/src/app/org/[slug]/booking/success/page.tsx` | Celebration, next-steps CTAs |
| `apps/web/src/app/org/[slug]/booking/cancelled/page.tsx` | Sympathetic design, re-booking CTA |
| `apps/web/src/app/org/[slug]/not-found.tsx` | Category hub links, icon composition |
| `apps/web/src/app/org/[slug]/sitemap.ts` | Add category hub pages |
| `apps/web/src/lib/booking-context.tsx` | Waiver + addon state |

---

## Verification

### Build Check
```bash
pnpm --filter @tour/web typecheck
pnpm --filter @tour/web lint
pnpm --filter @tour/web build
```

### SEO Verification
1. `/experiences/desert-safaris` renders with unique title, description, OG image
2. Google Rich Results Test passes on category hub (FAQ schema, breadcrumb, ItemList)
3. Sitemap includes all 4 category hub pages
4. Tour detail breadcrumb links to correct category hub
5. `/?category=Desert+Tours` → 301 redirects to `/experiences/desert-safaris`
6. No duplicate canonical URLs

### UX Verification
1. Landing page: category grid cards → `/experiences/[category]` (not query params)
2. Mega menu tabs: all links updated to `/experiences/[category]`
3. Tour detail: mobile booking bar visible on phone viewports
4. Booking flow: add-on step shows, waiver step conditional
5. Image gallery: swipe on mobile, lightbox on tap
6. All pages: consistent `Breadcrumb` component, no raw `<a href>` breadcrumbs
7. Zero hardcoded hex colors in browser DevTools
8. Lighthouse: 90+ performance, 95+ accessibility, 100 SEO
