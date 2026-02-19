# Storefront UX Spec

**Scope:** Public booking website (`apps/web`)
**Updated:** February 20, 2026

---

## 1. Product Intent

The storefront does three jobs:

1. Help a visitor quickly decide if a tour is right for them.
2. Convert interest into a confirmed booking with minimal friction.
3. Provide confidence and control after booking (manage, reschedule, cancel).

If a design element does not improve one of these jobs, it should not ship.

---

## 2. First Principles

1. **Decision latency is the enemy.** Every screen must shorten time-to-decision.
2. **Uncertainty kills conversion.** Show availability, pricing, pickup policy, and cancellation terms early.
3. **Progress must always be visible.** User always knows current step, what remains, and total cost.
4. **Trust is built through consistency.** UI state, email state, and CRM state must match exactly.
5. **Recovery beats perfection.** Error paths must provide next action, not dead ends.
6. **Mobile is primary.** Thumb reach, sticky actions, and 44px targets are required.
7. **Performance is UX.** Prefer skeletons and stable layout over spinners and jumps.

---

## 3. Routes

### Core Journey

1. Discovery: `/org/[slug]`
2. Evaluation: `/org/[slug]/tours/[tourSlug]`
3. Purchase: `/org/[slug]/booking`
4. Outcome: `/org/[slug]/booking/success` or `/org/[slug]/booking/cancelled`
5. Self-service: `/org/[slug]/booking` (lookup/manage flows)

### Supporting Pages

| Route | Purpose |
|-------|---------|
| `/org/[slug]/about` | Operator credibility |
| `/org/[slug]/contact` | Fast contact channels + form |
| `/org/[slug]/private-tours` | High-intent private/VIP inquiry |
| `/org/[slug]/terms` | Terms of service |
| `/org/[slug]/privacy` | Privacy policy |
| `/no-org` | Fallback when org not found |

---

## 4. Information Hierarchy

Every booking-driven page follows this order:

1. **What this is** — tour identity
2. **Why trust it** — reviews, safety, policy, operator credibility
3. **What it costs** — price, inclusions, billing unit
4. **When available** — slots and real-time capacity
5. **What to do now** — single primary CTA

**CTA density rule:** One dominant primary action per viewport. Secondary actions never visually compete with primary.

---

## 5. Global Layout

### Header

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Trust Strip: Secure checkout · Currency · Timezone                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Logo + Brand      All Tours │ Private Tours │ About │ Contact    [Book] │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:** Sticky. Scroll-triggered shadow. "Book Now" CTA always reachable. Mobile: animated hamburger with 48px touch targets.

### Footer

```
┌──────────────────────────────────────────────────────────────────────────┐
│ CTA band: "Ready to book?" [Book Now]                                  │
│ Columns: Contact │ Policies │ Social │ Support                         │
│ Trust: Licensed · Insured · Secure checkout                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specs

### 6.1 Discovery (`/org/[slug]`)

**Layout:**
- Hero with value proposition + trust signals
- Curated rails: Desert Essentials, Private Experiences, Family Picks, Luxury Moments, Abu Dhabi Day Trips (4–8 items per rail, `View all` path)
- Filter chips + sort in sticky control row (`Date`, `Guests`, `Filters`, `Sort`)
- Tour card grid with `Load More` on mobile

**Tour card metadata contract — every card must show:**

| Field | Example |
|-------|---------|
| Image | Cover photo with gradient overlay on hover |
| Duration | "4 hours" |
| Tour type | Private / Shared badge |
| Pickup indicator | "Hotel pickup" or "Meeting point" |
| Rating + review count | ★ 4.9 (127) |
| Starting price | "From AED 249 / person" |
| Next available slot | "Available tomorrow" or "Next: Mar 5" |
| Availability signal | "3 spots left" or "Sold out this month" |

**Merchandising badges** (max one per card):
- Best Seller
- Limited Availability
- Special Offer
- New

**Filter chip set:**
- Desert · City · Water/Yacht · Family · Private · Luxury · Abu Dhabi

**Contracts:**
1. Cards answer booking viability without clicking.
2. Empty state offers alternative (contact or broaden date).
3. Filters feel immediate (<100ms with skeleton).

---

### 6.2 Tour Detail (`/org/[slug]/tours/[tourSlug]`)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb                                                              │
├──────────────────────────────────────┬───────────────────────────────────┤
│ Gallery (lightbox, mobile swipeable) │ Sticky booking panel             │
│                                      │ ├ Price + cancellation badge     │
│                                      │ ├ Slot selector + guest count    │
│                                      │ ├ Policy snippet                 │
│                                      │ └ [Check Availability]           │
├──────────────────────────────────────┴───────────────────────────────────┤
│ Trust stack: rating · reviews · cancellation · payment flexibility      │
├──────────────────────────────────────────────────────────────────────────┤
│ Key logistics: duration · guide language · pickup coverage · meeting pt │
├──────────────────────────────────────────────────────────────────────────┤
│ Operator block: guide/company name · years of experience · certs        │
├──────────────────────────────────────────────────────────────────────────┤
│ Itinerary (compact sequential steps with Read More)                     │
│  ├ Pickup → Key stops → Add-ons → Return                               │
├──────────────────────────────────────────────────────────────────────────┤
│ Package options: name · differentiator · duration · inclusions · price  │
│  └ [Select] CTA per row                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Things to Know: requirements · activity level · what to bring ·        │
│                  accessibility · cancellation                           │
├──────────────────────────────────────────────────────────────────────────┤
│ Reviews section                                                        │
│  ├ Average + count + distribution bars                                 │
│  ├ Intent facet chips: Family · Couple · Value · Scenic · Smooth pickup│
│  ├ Verified badge + reviewer context + recency                         │
│  └ Representative quote cards + See All                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Similar tours (horizontal scroll on mobile)                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Mobile: fixed bottom bar (price + [Book])                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Contracts:**
1. Trust stack + key logistics + booking CTA appear in the same viewport (above fold).
2. Pickup policy is explicit before checkout: mode, city coverage, airport rule, meeting instructions, map link.
3. Cancellation window and payment flexibility appear above fold.
4. Desktop: sticky booking rail. Mobile: fixed bottom CTA bar. Cancellation reassurance is colocated with booking action.
5. Itinerary and reviews use progressive disclosure (collapsed by default, `Read More`).

---

### 6.3 Booking Flow (`/org/[slug]/booking`)

**Step order (fixed):**

1. Tour / Option
2. Date & Time
3. Guests
4. Customer Details
5. Review (mandatory)
6. Payment

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Stepper: 1 → 2 → 3 → 4 → 5 → 6                                       │
│ Mobile: "Step 2 of 6" compact bar                                      │
├──────────────────────────────────────┬───────────────────────────────────┤
│ Step content                         │ Sticky summary rail              │
│                                      │ ├ Tour + image                   │
│                                      │ ├ Date/time + guests             │
│                                      │ ├ Add-ons                        │
│                                      │ ├ Running total (animated)       │
│                                      │ └ Trust badges + policy          │
├──────────────────────────────────────┴───────────────────────────────────┤
│ [← Back]                                                    [Continue →]│
└──────────────────────────────────────────────────────────────────────────┘
```

**Slot display contract:**
- Start–end time
- Availability state: sold out / limited / available
- Max guests where relevant

**Pricing display contract:**
- Amount + currency + billing unit (person / group / vehicle)
- If discount: old price struck through + new price in same cluster

**Contracts:**
1. Total price is always visible and stable.
2. Validation messages explain recovery action.
3. Review step is mandatory before payment.
4. Cash flow uses "Cash collection" semantics.
5. Step transitions use slide animation.

---

### 6.4 Booking Success (`/org/[slug]/booking/success`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✅ Booking confirmed (celebration animation)                            │
│ Ref · Tour · Date/time · Guests · Pickup · Payment status              │
│ Next steps timeline                                                    │
│ [Manage Booking]   [Add to Calendar]   [Contact Support]               │
└──────────────────────────────────────────────────────────────────────────┘
```

**Contracts:**
1. Confirmation content matches email payload.
2. If payment pending, explain exactly what happens next.

---

### 6.5 Booking Cancelled (`/org/[slug]/booking/cancelled`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Payment not completed / booking cancelled                               │
│ No-blame explanation + clear next action                               │
│ [Retry Booking]   [Contact Support]                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Contract:** Recoverability in one click. No blame language.

---

### 6.6 Manage Booking (`/org/[slug]/booking`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Lookup: ref + email/phone + [Find Booking]                             │
│ [Send Magic Link]                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Result: status · payment · date/time · actions                         │
│ [Reschedule]   [Cancel]   [Update Details]                             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Contracts:**
1. Manual lookup and magic-link auth both supported.
2. Policy effects shown before reschedule/cancel confirmation.

---

### 6.7 About (`/org/[slug]/about`)

1. Why trust this operator — real credentials, not boilerplate.
2. "By The Numbers" stats: tours, guests served, years operating.
3. Guide/team section (if data available).
4. Soft CTA to browse tours.

### 6.8 Contact (`/org/[slug]/contact`)

1. Fast channels first (WhatsApp, phone, email).
2. Form secondary.
3. SLA expectation shown ("We reply within 2 hours").

### 6.9 Private Tours (`/org/[slug]/private-tours`)

High-intent private/VIP inquiry page.

**Primary CTA:** Request Private Itinerary
**Secondary CTA:** WhatsApp/call for urgent same-day requests

**Form fields:**
Name · Email · Phone/WhatsApp · Preferred date/range · Group size · Pickup city/hotel/airport · Budget range · Interests/occasion · Notes

**CRM integration:** Submit creates tracked inquiry with `source=website`, `channel=private_inquiry`. Ops alert triggered. Customer receives acknowledgment with response SLA.

### 6.10 Terms & Privacy

- Readable widths (narrow `PageShell`).
- Updated date visible (not hardcoded).
- Table of contents sidebar on desktop.

---

## 7. Component Rules

**Core components:** `header`, `footer`, `tour-card`, `booking-flow`, `availability-calendar`, `payment-step`, `booking-lookup`, `mobile-booking-bar`, `image-gallery`, `review-section`

**Rules:**
1. No hardcoded colors — semantic tokens only.
2. All interactive controls keyboard-reachable.
3. Every data component has loading, empty, and error variants.
4. Price/capacity/policy data is server-authoritative.
5. Trust statements where concrete: licensed guides, insured operations, verified standards.

---

## 8. States Matrix

Every critical page (discovery, detail, booking, manage) must implement:

| State | Requirement |
|-------|-------------|
| Loading | Shimmer skeleton matching page layout |
| Empty | Actionable suggestion (contact or broaden search) |
| Error | Recovery action, not dead end |
| Success | Confirmation with next steps |
| Partial | Limited availability messaging |

No route ships without all five states defined.

---

## 9. Copy System

1. **Action-first labels:** "Check availability", "Confirm reschedule" — never vague.
2. **Zero jargon:** No internal terms surface to customers.
3. **State transparency:** "Payment pending", "Cash collection pending".
4. **Constraints upfront:** Show policy/pickup limits before commit.

---

## 10. Accessibility & Performance

### Accessibility (WCAG AA)

- Contrast ratios meet AA.
- Touch targets ≥ 44px.
- `focus-visible` on all actionable elements.
- `aria-live` for booking and payment status updates.

### Performance

| Metric | Target |
|--------|--------|
| LCP | < 2.5s on key routes |
| CLS | < 0.1 across discovery/detail/booking |
| Loading pattern | Shimmer skeletons, never spinner-only |

---

## 11. Analytics

**Track per org and globally:**

| Metric | What it tells us |
|--------|-----------------|
| Discovery → Detail CTR | Card quality |
| Detail → Booking start rate | Trust stack effectiveness |
| Step-by-step booking drop-off | Flow friction points |
| Payment success rate | Checkout confidence |
| Manage-booking self-service rate | Support reduction |
| Time-to-book | Overall flow efficiency |
| Support contact rate post-booking | Clarity gaps |

**Quarterly targets:**
1. Reduce booking drop-off (detail → payment) by 20%.
2. Reduce failed-recovery abandonment by 30%.

---

## 12. Release Checklist

Before any storefront release:

- [ ] Desktop + mobile visual QA on all critical routes
- [ ] Keyboard-only flow through booking
- [ ] Empty/error/recovery states reviewed
- [ ] Price, availability, payment verified against backend
- [ ] Lighthouse: 90+ performance, 95+ accessibility

---

## 13. Anti-Patterns (Do Not Ship)

These are the failure modes this storefront must avoid:

1. **Marketplace complexity** — no supplier-style UI, heavy cross-sell carousels, or affiliate surfaces. We are a single operator, not a marketplace.
2. **Hidden controls** — do not bury date/guest controls behind multi-click modals.
3. **Narrative before decision** — long storytelling copy must never appear above trust, price, and availability.
4. **Icon-only critical actions** — booking-critical buttons require text labels.
5. **Category sprawl** — keep a tight curated filter set. No deep taxonomy trees.
6. **Generic brand positioning** — every page reinforces operator identity, not platform language.
7. **SEO above commerce** — FAQ/SEO modules go below transactional content, never above.
8. **Fake signals** — urgency badges and social proof must come from real data, never fabricated.

---

## 14. Execution Priority

This order maximizes conversion impact first, then retention and support reduction.

### P0 — Conversion Critical

1. Harden discovery cards to full metadata contract (§6.1).
2. Finalize trust stack + sticky/fixed booking CTA on detail page (§6.2).
3. Pickup/cancellation visible above fold and in checkout review.

### P1 — Decision Quality

1. Review intent facets on tour detail (Family, Value, Scenic, Smooth pickup).
2. Controlled merchandising badges (max one per card, strict taxonomy).
3. Compact itinerary steps with progressive disclosure.

### P2 — Depth & Scale

1. Post-listing SEO/FAQ modules below transactional content.
2. Transparent disclosure if promoted placements are introduced.
3. UAE-specific category rails tuned for intent.

### Validation

Success = reduced decision friction + increased operational clarity, without marketplace complexity.
