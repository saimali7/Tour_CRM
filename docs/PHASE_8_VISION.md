# Phase 8: The Booking Experience

> The moment a customer lands on our site, they feel: *this is the right place to book.*

---

## 1. The Vision

We're building our direct sales channel — where customers discover our tours, feel the experience, and book with total confidence. This isn't a booking page. This is our revenue engine.

**The alternative is:**
- OTAs (Viator, GetYourGuide) — 20-30% commission, no brand, no customer relationship
- Embedded widgets (FareHarbor, Peek) — ugly iframes, no control
- Hiring an agency — $5-20k, never optimized, never integrated

**What we're building:**
A booking experience that rivals Airbnb, GetYourGuide, and the best YC companies — but exclusively ours, deeply wired into our CRM. No middleman. No commission. No compromise.

### The 2-Minute Promise

A customer on their phone discovers our tours, picks a date, pays via Stripe, and gets a confirmed booking — **in under 2 minutes**. That booking instantly appears in our CRM: on the command center, on the day's manifest, ready for dispatch.

### Success Metrics

| Metric | Target |
|--------|--------|
| First impression | "This is legit" within 2 seconds of landing |
| End-to-end booking | < 2 minutes on mobile |
| Page load (LCP) | < 2 seconds |
| Mobile experience | Primary design target (70%+ traffic) |
| Checkout friction | No account. Minimal fields. Guest checkout → Stripe → done |
| CRM sync | Booking visible in CRM within seconds of payment |
| Payment security | Server-verified pricing, Stripe Checkout (PCI-compliant) |

---

## 2. Design Principles

These aren't guidelines — they're non-negotiable constraints.

### Instant Credibility
The #1 job of the first 2 seconds. Professional typography, polished imagery, cohesive brand colors, a trust bar with real data (reviews, years operating, booking count). The customer should feel the same confidence they feel on Airbnb — "real company, safe to give my card."

### Emotionally Compelling
We don't *list* tours, we *sell the dream*. Photography-forward. Aspirational copy. The customer feels the experience before they click "Book." Every page sells the dream, not just the logistics.

### Zero-Friction Flow
No account creation. No email verification. Minimal form fields. Guest checkout → Stripe → done. Every field we add loses 10% of customers. Every extra click is revenue lost.

### Mobile-Native
Designed for thumbs first, not adapted from desktop. Touch targets, swipe gestures, bottom-anchored CTAs. The booking flow should feel like a native app.

### Speed as a Feature
Sub-second page loads. No spinners — skeleton screens with shimmer. Instant availability checks. Speed isn't optimization; it's conversion.

### Trust-Engineered
Real reviews from `ReviewService`. Real availability from `AvailabilityService`. Real "X people booked today" from actual data. Transparent pricing with tax breakdown. Clear cancellation policy. Secure payment badges. Every pixel earns trust.

### Intelligently Helpful
Returning customer detection (email → auto-fill). Smart date suggestions based on availability. Real urgency signals ("3 spots left" — because there really are only 3).

### Our Brand, Front and Center
Our colors. Our voice. Our identity. No "Powered by" badges. No platform branding. This site IS our brand.

---

## 3. The Customer Journey

What the customer experiences, step by step.

### 3.1 — Landing (the first 2 seconds)

The customer lands on our site. Within 2 seconds, they see:
- A clean, premium header with our logo
- A stunning hero image of our best tour — aspirational, full-bleed
- A compelling headline that captures what we do
- A trust bar: ★ 4.9 rating · 2,000+ guests · Est. 2018 (real data)
- Feature tour cards that look like travel magazine spreads

**They feel:** "This looks professional. These people know what they're doing."

### 3.2 — Discovery (browsing tours)

The customer browses our tours:
- Photography-forward cards with price, duration, rating
- Category filters, sorting (popular, price, newest)
- Availability indicator: "Available tomorrow" / "3 spots left"
- Social proof: "X people booked this week"

**They feel:** "There's a lot to choose from. These look amazing."

### 3.3 — Tour Detail (falling in love)

The customer clicks into a tour:
- Hero gallery: beautiful photos, swipe on mobile, lightbox on desktop
- Sticky booking sidebar: price + "Check Availability" CTA (always visible)
- Content: description, what's included/excluded, meeting point + map, requirements, cancellation policy
- Reviews: star ratings + recent guest quotes
- Social proof: "X people booked today", "Popular this week"
- Similar tours at the bottom: "You might also love..."

**They feel:** "I want to do this. Let me check the dates."

### 3.4 — Booking (picking a date)

The customer starts booking:
- Inline date picker with live availability (not a separate page)
- Time slot selection with capacity indicators
- Booking options: shared/private/charter variants with pricing comparison
- Guest count with tier pricing shown inline
- Add-ons: "Add sunset photography for $25" (smart upsells)
- Promo code / gift voucher input with instant validation
- Live price breakdown that updates in real-time
- "Almost sold out" / "X spots left" urgency (real data)

**They feel:** "Easy to pick. I can see exactly what I'm getting."

### 3.5 — Details (who's coming)

The customer enters their info:
- Minimal fields: name, email, phone
- Hotel/pickup location if tour has pickup zones (critical for our dispatch)
- Optional: dietary, accessibility, special requests (collapsible)
- Returning customer: email auto-fills if they've booked before
- Progress indicator: "Almost done!"

**They feel:** "Quick. No unnecessary hoops."

### 3.6 — Payment (sealing the deal)

The customer pays:
- Redirect to Stripe Checkout (our account — no Connect)
- Apple Pay, Google Pay, card, 3D Secure — all handled by Stripe
- Free bookings skip Stripe, auto-confirm
- Deposit flow: pay deposit now, balance due later (if we've configured it)

**They feel:** "Stripe = safe. This is legit."

### 3.7 — Confirmation (the reward)

The customer sees:
- Confirmation page: reference number, tour, date, time, total paid
- "Add to Google Calendar" link
- Confirmation email arrives within seconds (Inngest → Resend)
- "Book another tour" upsell CTA

**They feel:** "Done! So easy. I should book another one."

### 3.8 — Post-Booking (ongoing trust)

After booking:
- Pre-tour reminder email (24h before): "What to bring"
- Morning-of guide intro: "Your guide is Michael, here's his photo"
- Post-tour review request
- Booking lookup: ref + email → view/cancel/reschedule
- Magic link authentication for self-service management

---

## 4. Technical Architecture

### Stripe Integration

**Approach:** Stripe Checkout (hosted) with our own Stripe account. No Connect.

```
Customer                      Our Server                 Stripe
   │                              │                         │
   │  1. Submit booking           │                         │
   │─────────────────────────────>│                         │
   │                              │  2. Verify price        │
   │                              │     (server-side)       │
   │                              │                         │
   │                              │  3. Create booking      │
   │                              │     (confirmed,         │
   │                              │      payment pending)   │
   │                              │                         │
   │                              │  4. Create Checkout     │
   │                              │     Session             │
   │                              │────────────────────────>│
   │                              │     ← Checkout URL      │
   │                              │<────────────────────────│
   │                              │                         │
   │  5. Redirect to Stripe       │                         │
   │<─────────────────────────────│                         │
   │                                                        │
   │  6. Customer pays on Stripe                            │
   │───────────────────────────────────────────────────────>│
   │                                                        │
   │                              │  7. Webhook:            │
   │                              │     payment succeeded   │
   │                              │<────────────────────────│
   │                              │                         │
   │                              │  8. Record payment      │
   │                              │     Fire Inngest events │
   │                              │                         │
   │  9. Redirect to success      │                         │
   │<──────────────────────────────────────────────────────│
```

**Why hosted Checkout?** Fastest to PCI compliance. Stripe handles card UI, 3D Secure, Apple/Google Pay. Can upgrade to embedded Elements in a future phase.

**Single webhook:** All Stripe events → `apps/crm/src/app/api/webhooks/stripe/route.ts`. No separate webhook in web app.

### Security

- **Server-side price verification** — `PricingCalculationService` calculates real total. Client total is display-only.
- **Rate limiting** — IP-based on booking API to prevent capacity exhaustion.
- **Bot detection** — Honeypot fields (not CAPTCHA — CAPTCHA kills conversion).
- **Booking expiration** — Inngest cron expires `paymentStatus: "pending"` bookings after 30 min, releasing capacity.

### Services Already Built (Wire Into Web)

| Service | Web Use |
|---------|---------|
| `AvailabilityService.checkAvailability()` | Option-aware pricing, capacity, time slots |
| `TourAvailabilityService` | Calendar dates, month-by-month availability |
| `BookingOptionService` | Tour variants (shared/private/charter) |
| `PricingCalculationService` | Server-side price verification |
| `CustomerService.getOrCreate` | Customer handling at checkout |
| `PromoCodeService.validateCode` | Promo validation |
| `VoucherService.validateVoucher` | Gift voucher redemption |
| `AddOnService` | Add-on upsells |
| `ReviewService` | Tour reviews + aggregate ratings |
| `AbandonedCartService` | Cart tracking + recovery emails |
| `DepositService` | Deposit payment tracking |
| `SeasonalPricingService` | Dynamic pricing signals |
| `PickupAddressService` | Pickup zones for dispatch |

---

## 5. Execution Plan

> Execution status: **Completed** (validated February 2026).  
> The checklist below is kept as the shipped record.

### 8.1 — Foundation & Design System (Week 1-2)

**The "Instant Credibility" phase.** Build the design system that makes everything feel premium.

- [x] Design tokens: warm palette, premium typography (Inter/Outfit), micro-animations
- [x] Skeleton/loading states that feel intentional
- [x] Header redesign: glassmorphism nav, mobile hamburger, org logo
- [x] Footer redesign: social links, contact info, trust badges
- [x] Org branding: CSS variables from org settings (colors, currency, timezone)
- [x] ISR config, image optimization, security headers

### 8.2 — Tour Discovery (Week 2-3)

**The "Sell the Dream" phase.** Make customers *feel* the experience.

- [x] Landing page: hero, trust bar, featured tours, social proof
- [x] Tour cards: photography-forward, hover animations, availability badge
- [x] Tour detail: gallery lightbox, reviews, social proof, similar tours
- [x] New components: `image-gallery`, `review-section`, `trust-bar`

### 8.3 — Booking Flow & Payments (Week 3-6) ⚠️ CRITICAL PATH

**The revenue engine.** If this doesn't work, nothing else matters.

- [x] `StripeCheckoutService` — Checkout Session creation, server-side pricing
- [x] Booking API fixes: server-side price, direct Stripe, Inngest events, rate limiting
- [x] Webhook fix: auto-confirm booking on payment success
- [x] Booking context: options, add-ons, pickup, tax, currency
- [x] Multi-step UI: Options → Tickets → Details → Payment
- [x] Abandoned cart wiring (`AbandonedCartService`)
- [x] Deposit flow support
- [x] Success/cancelled page fixes (remove `schedule` relation bug)
- [x] Booking expiration Inngest job (30 min)
- [x] Availability API (client-side month fetching)
- [x] Promo/voucher validation API

### 8.4 — Customer Self-Service (Week 6-7)

**The "We Respect Your Time" phase.** No phone calls needed.

- [x] Booking lookup fix (schema mismatch)
- [x] Booking management portal (view/cancel/reschedule)
- [x] Magic link auth (send + verify)
- [x] Contact form fix → real API endpoint

### 8.5 — CRM Integration & Customer Journey (Week 7)

**The "Invisible Backend" phase.** The customer never sees this — but it's why we win.

- [x] Staff notification Inngest functions
- [x] Pre-tour emails: 24h reminder, morning-of guide intro
- [x] Post-tour review request
- [x] Analytics source attribution: "Website" vs "Phone" vs "Walk-in"

### 8.6 — SEO, Performance & Polish (Week 8)

**The "First Impressions at Scale" phase.** Discoverable, fast, accessible.

- [x] Sitemap fix (hardcoded domain), robots.txt
- [x] Structured data: Tour, FAQ, Review, Breadcrumb schemas
- [x] OG images per tour
- [x] Performance audit: Lighthouse 90+ / 95+ (performance / accessibility)
- [x] Error states: sold out, timeout, network errors
- [x] Accessibility: WCAG 2.1 AA, keyboard nav, screen reader

---

## 6. Known Bugs (Resolved)

| # | Symptom | Root Cause | Fix | Acceptance |
|---|---------|------------|-----|------------|
| 1 | Success page couldn't render booking data | Referenced missing `schedule` relation | Use flat `bookingDate`/`bookingTime` | Success page renders booking details correctly |
| 2 | Cancelled page had same rendering issue | Same `schedule` assumption | Same flat field migration | Cancelled page renders booking details correctly |
| 3 | Booking lookup showed mismatched fields | UI expected nested payload shape | Align UI to API response contract | Lookup returns and displays correct booking data |
| 4 | Contact form submission was simulated only | Fake timeout path, no API integration | Wire real `/api/contact` endpoint | Contact submissions persist and trigger backend flow |
| 5 | Web bookings didn't emit lifecycle events | Booking API path missed event emission | Emit `booking/created` event from web booking create | CRM automation/email/event pipelines receive booking events |
| 6 | Client could manipulate total price | API trusted client totals | Enforce server-side `PricingCalculationService` verification | Invalid price payloads are rejected |
| 7 | Some redirects lost org context | Missing `/org/[slug]`-aware URL handling | Use org-aware URL helpers | Redirects stay in the correct org scope |
| 8 | Date drift near timezone boundaries | Unsafe ISO date serialization pattern | Replace with timezone-safe date-key utilities | Booking/dispatch dates align in org timezone |
| 9 | Paid flow could fake completion in UI | Simulated paid fallback path | Remove simulated success, require Stripe/webhook authority | Paid status only set by real payment lifecycle |
| 10 | Calendar was limited to initial preloaded months | No month-by-month API fetch on client | Add client-side month availability fetch | Users can navigate and load future months |
| 11 | Webhook reconciliation behavior was ambiguous | Split/unclear webhook authority model | Centralize authority in CRM Stripe webhook route | Idempotent payment reconciliation is consistent |
| 12 | Tax defaulted to zero in booking flow | Tax config not wired into booking calculation/display | Wire `org.settings.tax` through web flow | Tax is calculated/displayed based on org config |

---

## 7. What's Deferred (Phase 9+)

| Feature | Why Later |
|---------|-----------|
| Stripe Elements (embedded checkout) | Hosted is faster to ship; Elements is UX upgrade |
| Gift voucher purchase online | Revenue feature, not core booking |
| Multi-currency display | Stripe handles conversion; display is the gap |
| WhatsApp booking confirmation | Infrastructure exists; integration is separate |
| Full i18n / multi-language | String externalization is prep work in 8.6 |
| A/B testing | Optimization framework comes after baseline |
| Offline / PWA | Nice-to-have, not launch-critical |

---

## 8. Definition of Done

Phase 8 is **complete** when:

1. A first-time visitor feels "this is the right place to book" within 2 seconds
2. Browse → select → pay → confirmed in **under 3 minutes on mobile**
3. Booking appears in CRM instantly (booking list, command center, manifests)
4. Confirmation email sends automatically
5. Unpaid bookings expire after 30 minutes and release capacity
6. Customer can look up booking by reference + email
7. All prices are server-verified (client total never trusted)
8. Both apps pass typecheck and build
9. Lighthouse mobile: 90+ performance, 95+ accessibility

---

## 9. Guardrails

- Booking source for web bookings is always `"website"` (not `"online"`)
- Unpaid lifecycle tracked through `paymentStatus`, not a separate booking status
- Web pages use flat `bookingDate` / `bookingTime` (never `schedule` relation)
- Date serialization must use timezone-safe utilities (never `toISOString().split("T")[0]`)
- New files are labeled `(new)` in this document
- Payments go to our Stripe account directly (no Connect)
