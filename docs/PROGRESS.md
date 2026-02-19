# Tour Operations Platform - Progress Tracker

**Last Updated:** February 19, 2026
**Status:** Phase 9 implementation in progress, core storefront overhaul merged
**Current Phase:** Phase 9 - Web-App Storefront Design & Feature Integration (Execution)
**Main Branch:** `main`

> This document is the single source of truth for implementation progress. We follow a **sequential phase-by-phase** development strategy - completing each phase fully before moving to the next.

---

## Development Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT ROADMAP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ═══════════════════════ CRM APPLICATION ═══════════════════════           │
│                                                                              │
│   Phase 0-6: Core CRM ──────────────────────────────► ✅ COMPLETE           │
│   (Foundation, Booking, Customers, Guides, Pricing, Reports, UX)            │
│                                                                              │
│   Phase 7: Operations Excellence ───────────────────► ✅ COMPLETE           │
│   (Production Wiring, Speed, Intelligence, Waivers, Check-In, Vouchers)     │
│                                                                              │
│   ═══════════════════ WEB APPLICATION ═══════════════════════               │
│                                                                              │
│   Phase 8: Web App & Booking ───────────────────────► ✅ COMPLETE           │
│   Phase 9: Storefront Design & Integration ─────────► 🔄 IN PROGRESS        │
│                                                                              │
│   ═══════════════════ PLATFORM (FUTURE) ═══════════════════════             │
│                                                                              │
│   Phase 10+: SaaS & Public API ─────────────────────► ⏳ FUTURE             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Status Dashboard

### CRM Application (Staff Portal)

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| **0** | Foundation | ✅ COMPLETE | 100% |
| **1** | Core Booking Engine | ✅ COMPLETE | 100% |
| **2** | Customer & Communications | ✅ COMPLETE | 100% |
| **3** | Guide Operations | ✅ COMPLETE | 100% |
| **4** | Pricing & Promotions | ✅ COMPLETE | 100% |
| **5** | Reporting & Analytics | ✅ COMPLETE | 100% |
| **6** | UX Overhaul | ✅ COMPLETE | 100% |
| **7** | **Operations Excellence** | ✅ COMPLETE | 100% |

### Web Application (Customer Portal)

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| **8** | Web App & Booking Flow | ✅ COMPLETE | 100% |
| **9** | Web-App Storefront Design & Feature Integration | 🔄 IN PROGRESS | 80% |

### Platform (SaaS & API)

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| **10+** | SaaS Platform & Public API | ⏳ FUTURE | 0% |

**Legend:** ✅ Complete | 🔄 In Progress | ⏳ Pending

---

## Recent Updates

### Platform Hardening Pass (February 19, 2026)

- Next.js 16 proxy migration completed in active apps:
  - `apps/crm/src/middleware.ts` -> `apps/crm/src/proxy.ts`
  - `apps/web/src/middleware.ts` -> `apps/web/src/proxy.ts`
- Dispatch temp-guide day-scope logic hardened at root:
  - temp guides now persist canonical day-scope marker in `guides.availabilityNotes` (`TEMP_DAY_SCOPE:YYYY-MM-DD`),
  - availability and batch assignment guards now read canonical marker first, with legacy note/email fallback for backwards compatibility.
- Removed stale guide manifest links from notification functions (`/guide/schedules/...`) to prevent dead navigation paths.
- Documentation sync completed for runtime reality:
  - Next.js 16 references updated in architecture/infrastructure/system design docs,
  - roadmap/progress consistency corrected where Phase 9 status drifted.
- Dependency/runtime stability fix:
  - moved `tailwindcss` into `packages/ui` runtime dependencies to avoid workspace CSS import resolution issues in local dev toolchains.

### Phase 9 Execution Sprint (February 19, 2026)

- Phase 9.1 foundation layer completed:
  - storefront hardcoded hex palette removed in app/org and storefront component surfaces,
  - semantic surface tokens (`surface-dark`, `surface-soft`) fully wired in storefront usage,
  - layout primitives created and actively adopted across rebuilt pages (`PageShell`, `Section`, `SectionHeader`, `Breadcrumb`, `HeroSection`, `CardSurface`, animation and skeleton primitives).
- Phase 9.2 navigation shell redesign completed:
  - header now has route-aware active link highlighting, scroll-state elevation, stronger Book Now CTA, and animated mobile menu surface with touch-friendly targets,
  - footer redesigned with conversion CTA band, trust indicators, and reduced clutter.
- Phase 9.3 page redesign rollout completed for core storefront routes:
  - landing page rebuilt with shared primitives, hero treatment, featured horizontal-mobile rail, improved section rhythm, and mobile load-more pattern,
  - tour detail page rebuilt with card surfaces, improved urgency/sidebar experience, image gallery overhaul integration, and mobile fixed booking bar,
  - about/contact/terms/privacy pages rebuilt with clear IA, dynamic dates, consistent breadcrumb pattern, and legal TOC side rails,
  - booking lookup/success/cancelled pages upgraded for clarity and actionability,
  - not-found + loading states modernized using skeleton primitives.
- Phase 9.4 core feature integration completed:
  - add-on selection step integrated into booking flow with dynamic pricing rollups and API persistence to booking add-ons,
  - waiver APIs added (`/api/waivers/required`, `/api/waivers/sign`, `/api/waivers/status`) and waiver UX integrated in flow + post-payment success context,
  - availability calendar upgraded with mobile swipe month navigation and slot-level prominence labels.
- Phase 9.5 polish baseline completed:
  - shimmer skeleton primitives adopted across route loading states,
  - keyboard/focus and `aria-live` pricing updates improved in booking flow sidebar and transitions,
  - storefront lint/type gates passing after refactor.
- Validation status:
  - `pnpm --filter @tour/web typecheck` ✅
  - `pnpm --filter @tour/web lint` ✅
  - Playwright UI validation currently blocked in this environment due MCP Playwright tool timeout despite running local web server; manual code-level QA and compile/lint verification performed while this blocker is investigated.

### Phase 8 Rollup (February 18, 2026)

### Phase 8 Kickoff (February 18, 2026)

- Phase 8.1 foundation pass completed for web storefront baseline:
  - typography updated to Inter + Outfit for customer-facing tone,
  - warm brand palette and display-font utility wired in shared UI CSS tokens,
  - redesigned header with trust strip and org currency/timezone indicators,
  - redesigned footer with trust badges and no platform branding callout,
  - organization branding projection extended with `currency`, `timezone`, and optional social link metadata,
  - web layout now exposes org branding CSS variables for storefront theming.
- Web hardening updates applied:
  - `apps/web/next.config.ts` now sets security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`),
  - image output formats set to AVIF/WebP.
- Validation gate passed for Phase 8.1:
  - `pnpm --filter @tour/web typecheck` ✅
  - `pnpm --filter @tour/web lint` ✅
  - `pnpm --filter @tour/web build` ✅
  - Playwright UI smoke on `demo-tours.localhost:3002` confirmed updated header/footer rendering and navigation.

### Phase 8.2 Discovery Build (February 18, 2026)

- Landing/discovery redesign implemented:
  - hero section rebuilt with imagery-forward treatment and direct-booking positioning,
  - reusable `TrustBar` component added and wired with live stats signals,
  - featured tours strip introduced at top of storefront for immediate conversion paths.
- Tour discovery cards upgraded:
  - `TourCard` now includes availability labels and social-proof labels,
  - listing now computes per-tour availability labels from `TourAvailabilityService` and weekly booking proof from analytics stats.
- Tour detail UX upgraded:
  - new `ImageGallery` component integrated for hero + thumbnails,
  - new `ReviewSection` component integrated with `ReviewService` stats/recent reviews,
  - similar-tour recommendation section added with reusable card rendering.
- Validation gate passed for Phase 8.2:
  - `pnpm --filter @tour/web typecheck` ✅
  - `pnpm --filter @tour/web lint` ✅
  - `pnpm --filter @tour/web build` ✅
  - Playwright UI smoke validated updated landing and tour-detail rendering on `demo-tours.localhost:3002`.

### Phase 8.3 Booking Flow + Payments (February 18, 2026)

- Booking and payment architecture shipped:
  - `/api/bookings` now enforces IP rate limiting, server-side pricing validation, direct Stripe Checkout session creation, and booking-created Inngest dispatch.
  - created bookings are confirmed on create with `paymentStatus="pending"` until Stripe/webhook reconciliation.
  - deposit-aware payment metadata (`paymentAmount`, `remainingBalance`, `paymentMode`) returned from booking create.
- Abandoned cart + timeout safeguards shipped:
  - `/api/abandoned-carts` endpoint integrated from payment step.
  - cart-abandon event path wired via web Inngest helper.
  - CRM Inngest function added: `apps/crm/src/inngest/functions/pending-booking-expiration.ts` (30-minute expiry for unpaid website bookings).
- Booking flow UX shipped:
  - step order now supports `Options -> Tickets -> Details -> Payment -> Confirmed` with fallback to legacy steps when no active options exist.
  - booking option selection is persisted and submitted as `bookingOptionId`.
  - payment step now supports promo/voucher apply and removal UX with clear error/success messaging.

### Phase 8.4 Customer Self-Service (February 18, 2026)

- Booking lookup + management shipped:
  - lookup schema normalized to flat `bookingDate`/`bookingTime`.
  - self-service endpoints added for cancel and reschedule:
    - `apps/web/src/app/api/bookings/manage/cancel/route.ts`
    - `apps/web/src/app/api/bookings/manage/reschedule/route.ts`
- Magic link auth shipped:
  - request/verify endpoints added under `/api/bookings/magic-link/*`.
  - lookup page supports token bootstrap and secure management actions.
- Contact form production wiring shipped:
  - replaced simulated submit with `/api/contact` backend integration.
  - successful submit now creates real communication logs.

### Phase 8.5 CRM Integration + Lifecycle (February 18, 2026)

- Unified Stripe webhook authority confirmed in CRM:
  - `apps/crm/src/app/api/webhooks/stripe/route.ts` handles payment succeeded/failed reconciliation.
- Website booking lifecycle events now wired into CRM automations:
  - `booking/created` emits from web booking API.
  - `payment/succeeded` and `payment/failed` continue from Stripe webhook path.
  - pending booking expiration function registered in Inngest index.
- Source attribution aligned:
  - web bookings and customer creation use persisted `source: "website"`.

### Phase 8.6 SEO + Reliability + Polish (February 18, 2026)

- SEO and discovery surfaces shipped:
  - org-aware sitemap generation + dynamic robots output.
  - structured data coverage for Tour/Product/Organization/Breadcrumb/FAQ.
  - per-tour OpenGraph metadata generation.
- Reliability hardening shipped:
  - root-cause middleware fix for subdomain API calls (`/api/*` no longer rewritten to `/org/[slug]/api/*` while preserving `x-org-slug` header).
  - removed booking-page render loop by stabilizing booking context callbacks (`Maximum update depth exceeded` fix).
  - promo/voucher server-side verification added to booking create; discounts without valid code are now rejected.
- Phase 8 validation gate passed:
  - `pnpm --filter @tour/web typecheck` ✅
  - `pnpm --filter @tour/web lint` ✅
  - `pnpm --filter @tour/web build` ✅
  - `pnpm --filter @tour/crm typecheck` ✅
  - `pnpm --filter @tour/crm lint` ✅ (warning baseline retained)
  - `pnpm --filter @tour/crm build` ✅
  - Playwright UAT smoke passed for landing, tour detail, booking flow steps, promo/voucher UX errors, booking lookup, and contact submission.

- Completed big-bang guide assignment cutover: Command Center is now the single write surface.
- Blocked legacy guide-assignment write endpoints and moved all assignment CTAs to Command Center deep links.
- Removed qualification-gating semantics from dispatch flows and guide UI.
- Fixed command center date-switch performance by deduplicating dispatch reads and prefetching adjacent days.
- Fixed command center future-date race condition (`dispatch_status` concurrent insert) via atomic upsert.
- Fixed root-cause temp guide day-scope leak:
  - day-scope filter in available guide lanes,
  - day-scope guard in assignment writes,
  - day-scope enforcement in run assignment projection.
- Retired guide availability router/service from runtime assignment flow (active guides are dispatch-available).
- Updated docs index and removed stale/finished docs from active documentation set.

### Release Gate + Stabilization (February 18, 2026)

- Release gate checks completed:
  - `pnpm --filter @tour/crm typecheck` ✅
  - `pnpm --filter @tour/crm lint` ✅ (0 errors; warning baseline currently above ideal target)
  - `pnpm --filter @tour/crm build` ✅
- Fixed blocking lint issues found during release gate:
  - `no-case-declarations` in resend webhook event switch handling.
  - `prefer-const` in add-customer sheet progress calculation.
- Playwright UAT completed on desktop and mobile:
  - dashboard load and headings,
  - booking detail to command-center assignment CTA flow,
  - command-center date navigation and deep-link behavior,
  - temp guide day-scope behavior across day changes.
- Legacy assignment write path check completed:
  - write mutations in `guide-assignment` router are blocked with deterministic `FORBIDDEN` migration response.
- Published operator release notes:
  - `docs/RELEASE_NOTES_2026-02-18_PHASE7_STABILIZATION.md`
- Stabilization window declared:
  - bugfix-only changes until Phase 8 kickoff.

### Previous Update (February 5, 2026)

- Rebuilt `Tour Command Center` dispatch surface around a new canvas + view-model pipeline.
- Added operation-based assignment workflow with server-backed undo/redo (`batchApplyChanges`).
- Added drag and explicit non-drag assignment flows in hopper for accessibility and speed.
- Added live current-time marker, drop capacity preview, and escape-to-cancel drag behavior.
- Added same-lane drag-to-reschedule for assigned tour runs (time-shift, 15-minute snap).
- Added keyboard run time nudging (`Alt + Left/Right`) with undo/redo support.
- Fixed command-center type issues (`Link` typing, guide capacity access, guest detail `total/currency` mapping).
- Removed legacy/orphaned command-center modules to reduce dead code and maintenance overhead.

---

## Workflow

### Development Process

1. **One phase at a time** - Complete current phase before starting next
2. **All work on `main`** - No feature branches needed
3. **Subagents for efficiency** - Use parallel subagents within a phase for independent tasks
4. **Commit frequently** - Small, focused commits after each feature
5. **Test before moving on** - Ensure `pnpm typecheck && pnpm build` passes

### Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps
pnpm dev --filter crm     # Run CRM only
pnpm dev --filter web     # Run Web only
pnpm build                # Build everything
pnpm db:generate          # Generate Drizzle migrations
pnpm db:push              # Push schema to database
pnpm db:studio            # Open Drizzle Studio
pnpm lint                 # ESLint
pnpm typecheck            # TypeScript checks
pnpm test                 # Run tests
```

---

## Phase 0: Foundation ✅ COMPLETE (100%)

### Infrastructure Setup
| Component | Status | Location |
|-----------|--------|----------|
| Turborepo monorepo | ✅ | `turbo.json`, `pnpm-workspace.yaml` |
| Next.js 16 (CRM) | ✅ | `apps/crm` |
| Next.js 16 (Web) | ✅ | `apps/web` |
| Drizzle ORM | ✅ | `packages/database` |
| tRPC | ✅ | `apps/crm/src/server` |
| Clerk Auth | ✅ | Multi-tenant with organizations |
| Stripe | ✅ | Payments & Connect ready |
| Inngest | ✅ | Background jobs |
| Resend | ✅ | Email service |
| Supabase Storage | ✅ | File uploads |

### Database Schema
| Table | Status | File |
|-------|--------|------|
| organizations | ✅ | `organizations.ts` |
| users | ✅ | `users.ts` |
| customers | ✅ | `customers.ts` |
| tours | ✅ | `tours.ts` |
| schedules | ✅ | `schedules.ts` |
| bookings | ✅ | `bookings.ts` |
| guides | ✅ | `guides.ts` |
| activity_logs | ✅ | `activity-logs.ts` |
| refunds | ✅ | `refunds.ts` |

---

## Phase 1: Core Booking Engine ✅ COMPLETE (97%)

### Tour Management
| Task | Status | Notes |
|------|--------|-------|
| Tour CRUD | ✅ | Full create/read/update/delete |
| Tour form (all fields) | ✅ | Name, description, duration, price, images, SEO |
| Pricing tiers | ✅ | Adult, child, senior, etc. |
| Tour categories & tags | ✅ | Filterable |
| Cover image upload | ✅ | Supabase Storage |
| Tour gallery | ✅ | Multiple images |

### Schedule Management
| Task | Status | Notes |
|------|--------|-------|
| Schedule CRUD | ✅ | Individual schedules |
| Auto-schedule generation | ✅ | Daily/weekly patterns |
| Calendar view | ✅ | react-big-calendar |
| Capacity management | ✅ | Max participants tracking |
| Schedule status | ✅ | Active/cancelled/completed |

### Booking Management
| Task | Status | Notes |
|------|--------|-------|
| Booking creation | ✅ | With participant details |
| Booking list & filters | ✅ | By status, date, tour |
| Booking details view | ✅ | Full information |
| Status management | ✅ | Confirmed/cancelled/completed |
| Reschedule booking | ✅ | Move to different schedule |
| Cancel with refund | ✅ | Stripe refund integration |
| Activity logging | ✅ | All booking actions tracked |

### Minor Gaps (Non-blocking)
- [ ] Rich text editor for tour descriptions
- [ ] Tour preview (customer view)
- [ ] Drag-and-drop calendar editing

---

## Phase 2: Customer & Communications ✅ COMPLETE (95%)

### Database Tables Added
```typescript
// packages/database/src/schema/communications.ts
- communication_logs ✅
- email_templates ✅
- sms_templates ✅
- abandoned_carts ✅
- wishlists ✅
- availability_alerts ✅
- customer_notes ✅
- notification_preferences ✅
- communication_automations ✅
```

### Services Added
| Service | File | Status |
|---------|------|--------|
| CommunicationService | `communication-service.ts` | ✅ |
| CustomerNoteService | `customer-note-service.ts` | ✅ |
| WishlistService | `wishlist-service.ts` | ✅ |
| AbandonedCartService | `abandoned-cart-service.ts` | ✅ |
| AvailabilityAlertService | `availability-alert-service.ts` | ✅ |

### Customer Management
| Task | Status | Notes |
|------|--------|-------|
| Customer list UI | ✅ | Search, filter, sort |
| Customer profile page | ✅ | Tabbed interface |
| Customer edit form | ✅ | Modal with all fields |
| Customer notes | ✅ | Add, pin, delete notes |
| Customer tags | ✅ | Tagging system |
| GDPR data export | ✅ | `exportGdprData()` |
| GDPR anonymization | ✅ | `anonymizeForGdpr()` |

### Email Communications
| Task | Status | Notes |
|------|--------|-------|
| Email template CRUD | ✅ | In Communications page |
| Template variables | ✅ | `substituteVariables()` |
| Communication history | ✅ | Filterable log view |
| Automation settings | ✅ | Toggle automations |

### Conversion Recovery (Inngest)
| Task | Status | Notes |
|------|--------|-------|
| Abandoned cart tracking | ✅ | Full schema and service |
| Cart recovery emails | ✅ | 3-email sequence |
| Wishlist functionality | ✅ | Schema and service |
| Price drop alerts | ✅ | `checkPriceDrops` function |
| Availability alerts | ✅ | `checkAvailabilityAlerts` function |

---

## Phase 3: Guide Operations ✅ COMPLETE (95%)

### Database Tables Added
```typescript
// packages/database/src/schema/guide-operations.ts
- guide_availability ✅ (weekly patterns)
- guide_availability_overrides ✅ (date-specific)
- tour_guide_qualifications ✅ (which guides lead which tours)
- guide_assignments ✅ (schedule-guide with status)
- guide_tokens ✅ (magic link authentication)
```

> Note (February 2026): qualification and availability gating were later retired from dispatch runtime. Command Center now treats active guides as dispatch-available and enforces only operational constraints (time overlap, run window, and capacity).

### Services Added
| Service | File | Status |
|---------|------|--------|
| GuideAvailabilityService | `guide-availability-service.ts` | ✅ (legacy phase artifact, retired from dispatch runtime) |
| TourGuideQualificationService | `tour-guide-qualification-service.ts` | ✅ (legacy phase artifact, qualification gating removed) |
| GuideAssignmentService | `guide-assignment-service.ts` | ✅ |
| ManifestService | `manifest-service.ts` | ✅ |

### Guide Management
| Task | Status | Notes |
|------|--------|-------|
| Guide list page | ✅ | Search, filter, stats |
| Guide create form | ✅ | All fields with languages |
| Guide detail page | ✅ | Profile with tabs |
| Guide edit form | ✅ | Pre-populated fields |
| Guide photo upload | ✅ | Avatar support |
| Languages & certifications | ✅ | Multi-select with badges |

### Availability System
| Task | Status | Notes |
|------|--------|-------|
| Weekly availability pattern | ✅ | Day-by-day time slots |
| Date-specific overrides | ✅ | Vacation, sick days |
| Availability calendar view | ✅ | In guide detail page |
| Availability checking | ✅ | Service methods |

### Tour-Guide Qualifications
| Task | Status | Notes |
|------|--------|-------|
| Qualifications UI | ✅ | In tour detail page |
| Add/remove guides | ✅ | With dropdown |
| Set primary guide | ✅ | Per tour |
| Filter available guides | ✅ | For scheduling |

### Assignments
| Task | Status | Notes |
|------|--------|-------|
| Assign guide to schedule | ✅ | With conflict detection |
| Assignment status workflow | ✅ | Pending → Confirmed/Declined |
| Conflict detection | ✅ | Time overlap checking |
| Assignment UI component | ✅ | In schedule detail |

### Guide Portal
| Task | Status | Notes |
|------|--------|-------|
| Magic link authentication | ✅ | JWT-based |
| Guide dashboard | ✅ | Upcoming tours |
| Assignments list | ✅ | With status filters |
| Confirm/decline assignments | ✅ | With reasons |
| Schedule manifest view | ✅ | Participant list |
| Login page | ✅ | Token validation |

### Manifests
| Task | Status | Notes |
|------|--------|-------|
| Manifest service | ✅ | Full participant data |
| Manifest UI component | ✅ | In schedule detail |
| Print support | ✅ | Browser print dialog |
| Email to guide button | ✅ | Pre-filled mailto |

### Guide Notifications (Inngest)
| Task | Status | Notes |
|------|--------|-------|
| Assignment created email | ✅ | With confirm/decline links |
| Pending assignment reminder | ✅ | 24-hour follow-up |
| Tour reminder (24h before) | ✅ | With manifest link |
| Daily manifest email | ✅ | 6 AM cron job |

### Minor Gaps (Non-blocking)
- [ ] PDF manifest export
- [ ] Mark tour complete from portal
- [ ] Guide performance tracking

---

## Phase 4: Pricing & Promotions ✅ COMPLETE (95%)

### Database Tables Added
```typescript
// packages/database/src/schema/pricing.ts
- seasonal_pricing ✅ (date ranges, percentage/fixed adjustments)
- promo_codes ✅ (codes, discounts, usage limits)
- promo_code_usage ✅ (usage tracking per booking/customer)
- group_discounts ✅ (threshold-based discounts)
```

### Services Added
| Service | File | Status |
|---------|------|--------|
| SeasonalPricingService | `seasonal-pricing-service.ts` | ✅ |
| PromoCodeService | `promo-code-service.ts` | ✅ |
| GroupDiscountService | `group-discount-service.ts` | ✅ |
| PricingCalculationService | `pricing-calculation-service.ts` | ✅ |

### Seasonal Pricing
| Task | Status | Notes |
|------|--------|-------|
| Season definition UI | ✅ | Date ranges in Settings |
| Percentage/fixed adjustments | ✅ | Both supported |
| Tour-specific seasons | ✅ | appliesTo: all/specific |
| Price calculation | ✅ | Priority-based application |

### Group Discounts
| Task | Status | Notes |
|------|--------|-------|
| Threshold configuration | ✅ | Min/max participants |
| Discount tiers UI | ✅ | In Settings |
| Auto-apply in booking | ✅ | Via PricingCalculationService |

### Promo Codes
| Task | Status | Notes |
|------|--------|-------|
| Promo code CRUD | ✅ | Full management page |
| Code generator | ✅ | Random unique codes |
| Usage limits | ✅ | Total + per customer |
| Date validity | ✅ | validFrom/validUntil |
| Tour restrictions | ✅ | appliesTo: all/specific |
| Promo code detail page | ✅ | Usage stats view |
| Apply in booking flow | ✅ | PricingCalculationService |

### Pricing Integration
| Task | Status | Notes |
|------|--------|-------|
| PricingCalculationService | ✅ | Combines all pricing logic |
| Discount stacking | ✅ | Seasonal → Group → Promo |
| Price breakdown API | ✅ | Returns full breakdown |
| Promo validation | ✅ | Real-time validation |

### Minor Gaps (Non-blocking)
- [ ] Price preview calendar (visual future pricing)
- [ ] Early bird discounts (advance booking discount)

---

## Phase 5: Reporting & Analytics ✅ COMPLETE (95%)

### Services Added
| Service | File | Status |
|---------|------|--------|
| AnalyticsService | `analytics-service.ts` | ✅ Revenue, booking, capacity metrics |
| DashboardService | `dashboard-service.ts` | ✅ Aggregated dashboard data |
| CustomerIntelligenceService | `customer-intelligence-service.ts` | ✅ Scoring, segmentation, CLV |

### Dashboards
| Task | Status | Notes |
|------|--------|-------|
| Operations dashboard | ✅ | Today's tours, participants, guides, activity feed |
| Business dashboard | ✅ | Revenue cards, trends, capacity metrics |
| Dashboard components | ✅ | StatCard, ActivityFeed, TodaySchedule, SimpleChart |

### Reports
| Task | Status | Notes |
|------|--------|-------|
| Reports hub page | ✅ | Navigation to all reports |
| Revenue report | ✅ | By period, tour, payment method |
| Booking report | ✅ | Counts, patterns, sources |
| Capacity utilization | ✅ | Fill rates, underperforming schedules |
| Customer report | ✅ | Segments, CLV, acquisition sources |
| Guide report | ✅ | Performance metrics (basic) |
| CSV export | ✅ | Export button on all reports |

### Customer Intelligence
| Task | Status | Notes |
|------|--------|-------|
| Customer scoring | ✅ | 0-100 weighted score calculation |
| Customer segments | ✅ | VIP, Loyal, Promising, At Risk, Dormant |
| CLV calculation | ✅ | Historical and predicted CLV |
| Re-engagement triggers | ✅ | At-risk and dormant customer detection |

### tRPC Routers Added
| Router | Endpoints |
|--------|-----------|
| analytics | Revenue, booking, capacity stats |
| dashboard | Operations and business dashboards |
| customerIntelligence | Scoring, segments, CLV |
| reports | Report generation and export |

### Minor Gaps (Non-blocking)
- [ ] Real-time dashboard updates (currently manual refresh)
- [ ] Inngest jobs for nightly customer scoring
- [ ] Revenue attribution by marketing channel

---

## Phase 6: UX Overhaul ✅ COMPLETE (100%)

> **Goal:** Transform CRM from isolated feature modules into a unified, connected system where every workflow feels natural and efficient.

**Completed:** December 13, 2025

### Design Principles Implemented

1. ✅ **Everything Connected** - All entities link to related data via quick views
2. ✅ **Search Everywhere** - `Cmd+K` accesses any entity from anywhere
3. ✅ **Create Inline** - CustomerQuickCreate in booking flow
4. ✅ **Actions in Context** - Buttons appear where needed
5. ✅ **Consistent Patterns** - Same interaction model on every page

### Foundation Components ✅ COMPLETE
| Component | File | Notes |
|-----------|------|-------|
| Combobox | `components/ui/combobox.tsx` | Searchable select with async + create option |
| SlideOver | `components/ui/slide-over.tsx` | Quick view panel with provider |
| Dialog | `components/ui/dialog.tsx` | Radix Dialog base |
| ConfirmModal | `components/ui/confirm-modal.tsx` | Confirmation with hook API |
| Toast | `components/ui/sonner.tsx` | Action feedback |
| Command | `components/ui/command.tsx` | cmdk base component |
| CommandPalette | `components/command-palette.tsx` | Global Cmd+K with search API |
| Skeleton | `components/ui/skeleton.tsx` | Loading skeletons |
| EmptyState | `components/ui/empty-state.tsx` | Empty states with CTAs |

### Quick View Components ✅ COMPLETE
| Component | Shows |
|-----------|-------|
| BookingQuickView | Customer, schedule, status, payment, participants |
| CustomerQuickView | Contact, stats, quick book button, booking history |
| ScheduleQuickView | Tour, time, guide, capacity, bookings list |
| TourQuickView | Details, pricing, tags, stats |
| GuideQuickView | Contact, languages, certifications, stats |

### Inline Creation ✅ COMPLETE
| Component | Fields |
|-----------|--------|
| CustomerQuickCreate | Name, email, phone with validation |

### Booking Form Overhaul ✅ COMPLETE
| Task | Notes |
|------|-------|
| Customer Combobox | Searchable with 500+ item support |
| Inline customer creation | "Create New" triggers CustomerQuickCreate |
| Schedule Combobox | Shows availability, disabled when full |
| Pricing calculation | Adults + children (50%) + infants (free) |
| Overbooking validation | Prevents booking more than available spots |

### Page Updates ✅ COMPLETE
| Page | Updates |
|------|---------|
| Dashboard | ActionableAlerts with inline actions (assign guide, cancel) |
| All List Pages | TableSkeleton loading states |
| All List Pages | Context-aware empty states with CTAs |
| Customer Detail | Quick Book button, Rebook action |
| Schedule Detail | Bookings panel |
| Tour Detail | Schedules panel |

### Browser Dialog Replacement ✅ COMPLETE (23+ instances)
All browser `confirm()`, `prompt()`, `alert()` replaced with ConfirmModal:
- bookings/page.tsx, bookings/[id]/page.tsx
- schedules/page.tsx, schedules/[id]/page.tsx
- guides/page.tsx, guide-availability.tsx
- tours/page.tsx, customers/page.tsx
- promo-codes/page.tsx, promo-codes/[id]/page.tsx
- settings/page.tsx, settings/pricing/page.tsx
- communications/page.tsx
- schedule-guide-assignment.tsx

### Global Features ✅ COMPLETE
| Feature | Notes |
|---------|-------|
| Global search tRPC | `search.global` + `search.recent` queries |
| CommandPalette | In layout, searches all entities |
| Keyboard shortcuts | Cmd+K (search), Cmd+B (new booking) |
| Loading skeletons | All list pages |
| Empty states | Contextual messages with action buttons |

### Bug Fixes Applied
- CommandDialog accessibility (missing DialogTitle)
- Combobox memory leaks and race conditions
- ConfirmModal stale closures
- SlideOver memory leak and race condition
- Quick view error handling
- Booking form overbooking validation
- Pricing calculation for children/infants
- Division by zero in schedules page
- Unsafe array access (firstName[0])
- Missing toast notifications across all mutations
- Accessibility (aria-labels on all icon buttons)

### Success Metrics Achieved
| Workflow | Before | After |
|----------|--------|-------|
| Walk-in booking | 12+ clicks | ~6-8 clicks |
| Repeat customer | 10+ clicks | ~4 clicks |
| Find any record | 5+ clicks | 1-2 clicks (Cmd+K) |
| Customer service inquiry | Navigate + search | Slide-over quick view |
| Morning ops check | View only | Inline dashboard actions |

---

## Phase 7: Operations Excellence ✅ COMPLETE

> **Goal:** Transform from feature-complete to operations-first world-class CRM.
> **Execution tracking:** Captured in this document and release updates.

### Overview

| Sub-Phase | Focus | Duration | Status |
|-----------|-------|----------|--------|
| **7.1** | Production Completion | 1 week | ✅ COMPLETE |
| **7.2** | Operational Speed | 2 weeks | ✅ COMPLETE |
| **7.3** | Intelligence Surface | 1 week | ✅ COMPLETE |
| **7.4** | High-Impact Features | 3 weeks | ✅ COMPLETE |
| **7.6** | **Guide Dispatch System** | 2 weeks | ✅ COMPLETE |

### 7.1 Production Completion ✅ COMPLETE

Wire existing infrastructure so operators can run end-to-end:

| Task | What Exists | What's Missing | Status |
|------|-------------|----------------|--------|
| **Payment Recording UI** | Schema, service, router | UI components | ✅ Already built on booking detail |
| **Email Automation Wiring** | Templates, handlers | `booking/created` trigger | ✅ Inngest job wired |
| **Pricing Tier Integration** | Tiers table, service | Booking form fetch | ✅ Integrated |
| **Refund Flow Completion** | Refund table, service | Balance update, email | ✅ Complete with email |

### 7.2 Operational Speed ✅ COMPLETE

Every common operation under 60 seconds:

| Task | Current State | Target | Status |
|------|---------------|--------|--------|
| **Quick Booking Flow** | 12+ clicks, 4-5 min | < 60 seconds | ✅ Phone Booking Sheet (⌘P) |
| **Customer 360 View** | Navigate 3+ pages | Single page | ✅ Customer 360 Sheet |
| **Morning Briefing** | Open 5 tabs | One-click view | ✅ Dashboard + Print Manifests |
| **Batch Operations** | One at a time | Multi-select + bulk | ✅ Bulk reschedule/email |

**Phone Booking Features:**
- Visual tour card selection
- Horizontal 14-day date scroller
- Time slots with capacity indicators (green/orange/red)
- Inline customer search + quick create
- Live price calculation
- ⌘+Enter to submit
- Accessible via ⌘P or command palette

### 7.3 Intelligence Surface ✅ COMPLETE

Surface existing intelligence proactively:

| Task | What Exists | What's Missing | Status |
|------|-------------|----------------|--------|
| **Customer Intelligence UI** | Scoring service | UI display | ✅ Customer 360 Sheet |
| **Forecasting Dashboard** | Historical data | Projection logic | ✅ Analytics service |
| **Goal Tracking** | N/A | Schema + UI | ✅ Goals schema, service, UI |
| **Proactive Alerts** | Some alerts | Alert system | ✅ 9 insight types |

### 7.4 High-Impact Features ✅ COMPLETE

Features operators can't run business without:

| Feature | Why Critical | Status |
|---------|--------------|--------|
| **Digital Waivers** | Insurance requires signed waivers | ✅ WaiverService + Settings UI |
| **Deposits & Payment Plans** | Can't sell $500+ tours without deposits | ✅ DepositService + PaymentService |
| **Check-In & Attendance** | Verify who showed, track no-shows | ✅ CheckInService + Manifest UI |
| **Booking Add-Ons** | Direct revenue increase | ✅ AddOnService + schema |
| **Gift Vouchers** | B2B revenue, pre-paid cash | ✅ VoucherService + Settings UI |

### 7.6 Tour Command Center ✅ COMPLETE (Core Dispatch System Shipped)

> **Primary references:**  
> `apps/crm/src/components/command-center/*`  
> `packages/services/src/command-center-service.ts`  
> `docs/RELEASE_NOTES_2026-02-18_PHASE7_STABILIZATION.md`

The command center is now the operational source of truth for dispatch execution.

**Delivered capabilities:**
- Single command surface for assignment/reassignment/unassignment writes.
- Timeline-based run dispatch with overlap checks, private/charter exclusivity, and per-run capacity logic.
- Read-only lock behavior after dispatch.
- Deep-linking from dashboard and booking detail directly into actionable context.
- Day-level date-key/timezone hardening across command center reads and writes.
- Temp guide day-scoping enforced in lane rendering, assignment writes, and run projection.

**Status summary:**

| Area | Status |
|------|--------|
| Dispatch timeline & run model | ✅ Shipped |
| Assignment centralization | ✅ Shipped |
| Legacy write path blockade | ✅ Shipped |
| Date/time resilience | ✅ Shipped |
| Temp guide day scope correctness | ✅ Shipped |

### Previously Completed (Review System)

✅ **Review & Feedback System** - Complete
- Database: `reviews` table with ratings, comments, testimonials
- Service: Full CRUD, stats, guide/tour ratings
- API: tRPC router with all endpoints
- Automation: Inngest jobs for review requests
- UI: Reviews management page with analytics

### Deferred to Future Phases

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| Resource Management | Guide-only sufficient for now | Phase 8+ |
| Multi-Day Tours | Day tours for launch | Phase 8+ |
| Dynamic Pricing | Manual pricing sufficient | Phase 8+ |
| Affiliate Network | No partners yet | Phase 10+ |

---

# WEB APPLICATION

> Historical planning block removed. See the live status dashboard and Phase 8 update entries above for current state.

---

## Production Readiness ✅

> **Status:** CRM Core (Phases 0-5) is production-ready after comprehensive audit and fixes.

### Security Audit - PASSED
| Issue | Fix Applied | Status |
|-------|-------------|--------|
| JWT secret hardcoded fallback | Lazy initialization, runtime-only validation | ✅ Fixed |
| Magic link not sending emails | Implemented actual Resend API email sending | ✅ Fixed |
| Environment variable validation | Throws at function call time, not build time | ✅ Fixed |

### Multi-Tenant Isolation - PASSED
| Service | Issue | Fix | Status |
|---------|-------|-----|--------|
| PromoCodeService | Usage check missing org filter | Added `eq(promoCodeUsage.organizationId, this.organizationId)` | ✅ Fixed |
| RefundService | Booking query missing org filter | Added org filter to booking lookup | ✅ Fixed |
| BookingService | Schedule bookedCount updates (5+ locations) | Added org filters to all schedule updates | ✅ Fixed |
| GuideAssignmentService | Conflict check could match other orgs | Added guide ownership verification | ✅ Fixed |
| CommunicationService | Template queries missing org filter | Added org filters | ✅ Fixed |
| WishlistService | Missing org filter on some queries | Added org filters | ✅ Fixed |

### Database Schema - PASSED
| Fix | Description | Status |
|-----|-------------|--------|
| booking_participants.organizationId | Added missing organization_id column | ✅ Fixed |
| Unique constraints | Fixed to include organizationId for per-org uniqueness | ✅ Fixed |
| Composite indexes | Added for common query patterns | ✅ Fixed |

New indexes added:
- `schedules_org_starts_at_idx` - Schedule queries by date
- `bookings_org_status_created_idx` - Booking list queries
- `promo_codes_org_validity_idx` - Active promo code lookups

### Authorization - PASSED
| Router | Mutations Changed to adminProcedure | Status |
|--------|-------------------------------------|--------|
| schedule.ts | create, update, delete, cancel | ✅ Fixed |
| booking.ts | create, update, cancel, updateStatus | ✅ Fixed |
| guide-assignment.ts | create, update, delete, bulkAssign | ✅ Fixed |
| guide-availability.ts | setWeekly, addOverride, deleteOverride | ✅ Fixed |

### Bug Fixes - PASSED
| Bug | Location | Fix | Status |
|-----|----------|-----|--------|
| Currency ternary logic broken | manifest-service.ts | Fixed to `currency ?? "USD"` | ✅ Fixed |
| Date handling with unsafe fallbacks | seasonal-pricing-service.ts | Removed `|| ''` fallbacks | ✅ Fixed |
| Guide report returning empty | reports.ts router | Implemented actual guide performance query | ✅ Fixed |
| Guide portal URLs incorrect | guide-notifications.ts | Fixed URL construction | ✅ Fixed |

### Build Verification
```
pnpm typecheck ✅ (0 errors)
pnpm build ✅ (both CRM and Web apps)
```

---

## Changelog

### February 3, 2026 - Command Center Shipping Plan Started

Kickstarted production hardening for the Tour Command Center:

**Execution Plan:**
- Added `docs/project/features/COMMAND_CENTER_SHIP_PLAN.md` with milestones, DoD, QA checklist.

**Dispatch Status Persistence (Milestone 1):**
- Replaced in-memory dispatch status cache with DB-backed `dispatch_status`.
- `CommandCenterService` now upserts status on optimize/dispatch/resolve flows.
- Router now passes `userId` so `dispatchedBy` is recorded.

Next up: Pickup assignments + real timeline segments (drive/pickup/tour).

**Milestone 2 Complete (Pickup Assignments + Real Timeline):**
- Optimization now syncs pickup assignments and returns persisted pickup order/time/drive minutes.
- Pickup assignment sync updates guide assignments with pickup order, calculated pickup time, and drive minutes.

**Milestone 1 Complete (Source of Truth):**
- Documented `guide_assignments` as canonical for dispatch; `bookings.assignedGuideId` marked deprecated for Command Center.

**Cleanup:**
- Removed unused Command Center optimizer fields (`currentLocation`, `tourRunService`) and stale service index comments.
- Removed schedule-based booking option endpoints and legacy availability fallbacks; booking flow now requires configured options.
- Dropped legacy schedule availability + waitlist tables from schema and added migration to remove them.

**Milestone 3 Complete (Optimization + Travel Matrix):**
- Wired dispatch optimizer into Command Center and mapped warnings to UI.
- Travel matrix now loads from `zone_travel_times`.

---

### December 16, 2025 - Phase 7.2 Complete (60-Second Phone Booking)

Completed the remaining 25% of Phase 7.2:

**Quick Booking Enhancements:**
- Added `⌘+Enter` keyboard shortcut to submit booking form
- Form targeting via `data-quick-booking-form` attribute

**Command Palette Updates:**
- Added "Phone Booking" as top quick action (`⌘P`)
- Phone icon with blue styling
- Renamed "New Booking" to "New Booking (Full Form)" for clarity

**Bookings Page Integration:**
- Global `⌘P` shortcut opens phone booking
- URL query param support (`?phone=1`) for deep linking
- Auto-opens when accessed from command palette

**Phone Booking Flow (already existed, now fully integrated):**
- Visual tour cards selection
- Horizontal 14-day date scroller
- Time slots with color-coded capacity
- Inline customer search + quick create
- Live price calculation
- `⌘+Enter` to submit

**Phase 7 Status: 100% complete**

---

### December 16, 2025 - Phase 7.1 + 7.4 Implementation Complete

Implemented backend services and UI for high-impact features:

**Backend Services (all complete):**
- `CheckInService`: Participant check-in, no-show, undo, bulk check-in
- `VoucherService`: Gift vouchers with amounts, codes, expiration, redemption
- `WaiverService`: Digital waiver templates, signing, PDF generation
- `DepositService`: Configurable deposits with balance tracking
- `AddOnService`: Optional extras for tours with inventory

**Database Schema:**
- `add-ons.ts`: Tour add-ons with pricing and inventory
- `waivers.ts`: Waiver templates and signed waivers

**tRPC Routers:**
- `check-in.ts`: Schedule/booking check-in endpoints
- `voucher.ts`: Voucher CRUD, redemption, balance
- `waiver.ts`: Template management, signing
- `deposit.ts`: Deposit collection, balance updates
- `add-on.ts`: Add-on management for tours

**UI Features:**
- Voucher management page (`/settings/vouchers`)
- Waiver management page (`/settings/waivers`)
- Check-in functionality on schedule manifest with progress bar
- Customer 360 Sheet integration on customers page

**Sprint 1-2 Features (previously completed):**
- Goal tracking system (schema, service, UI)
- Phone booking flow (quick booking modal)
- Customer 360 View
- Batch operations (bulk reschedule/email)
- Morning briefing + print manifests

---

### December 16, 2025 - Phase 7: Operations Excellence Planning

Created comprehensive implementation plan for Phase 7 transformation:

**Strategic Analysis:**
- Created first-principles CRM evaluation artifacts
- Analyzed 4 user personas (Operations Manager, Customer Service, Business Owner, Guide)
- Mapped daily/weekly/monthly/annual operations gaps
- Identified transformation path: Work → Fast → Smart → Unique

**Phase 7 Implementation Plan (tracked in this document and `docs/project/features/COMMAND_CENTER_SHIP_PLAN.md`):**

| Sub-Phase | Focus | Key Deliverables |
|-----------|-------|------------------|
| 7.1 | Production Completion | Payment UI, email triggers, pricing tiers |
| 7.2 | Operational Speed | Quick booking (<60s), Customer 360, batch ops |
| 7.3 | Intelligence Surface | Forecasting, goal tracking, proactive alerts |
| 7.4 | High-Impact Features | Waivers, deposits, check-in, add-ons, vouchers |
| 7.6 | Guide Dispatch System | Command center dispatch workflow and controls |

**Key Insights:**
- Architecture is production-grade (multi-tenant, services, schema)
- Gap is workflow efficiency + proactive intelligence
- Payment infrastructure exists but no UI
- Email services work but not all triggers wired
- Customer intelligence calculated but never displayed

**Phase Renumbering:**
- Phase 7: Operations Excellence (NEW - 8 weeks)
- Phase 8: Web App & Booking (was 7)
- Phase 9: Web-App Storefront Design & Feature Integration (was 8)
- Phase 10+: SaaS & API (was 9+)

---

### December 13, 2025 - Phase 6 UX Overhaul Started
- Created comprehensive UX Overhaul plan
- Updated UX standards and sprint planning artifacts
- Updated PROGRESS.md with detailed Phase 6 tracking
- Identified 6 system-wide interaction patterns:
  1. Entity Card (consistent card representation)
  2. Slide-Over Panel (quick view without navigation)
  3. Inline Creation (create entities during selection)
  4. Command Palette (Cmd+K universal access)
  5. Contextual Actions (actions appear where needed)
  6. Related Data Panels (connected data inline)
- Key files to modify: booking-form.tsx, layout.tsx, detail pages
- Target: Reduce walk-in booking from 12+ clicks to <8 clicks

### December 13, 2025 - Production Readiness Fixes
- Comprehensive production audit completed
- Fixed 6+ security issues (JWT, magic links, env vars)
- Fixed 20+ multi-tenant isolation gaps across services
- Fixed database schema (booking_participants org_id, indexes)
- Changed 15+ mutations to adminProcedure authorization
- Fixed various bugs (currency logic, date handling, URLs)
- All fixes verified with typecheck and build

### December 13, 2025 - Phase 5 Complete
- Phase 5 Reporting & Analytics: 0% → 95%
- Created 3 new services (Analytics, Dashboard, CustomerIntelligence)
- Built Operations Dashboard with today's tours, activity feed, alerts
- Built Business Dashboard with revenue trends, booking metrics
- Built Reports hub with 5 report types (Revenue, Booking, Capacity, Customer, Guide)
- Created 4 new tRPC routers (analytics, dashboard, customerIntelligence, reports)
- Added customer scoring (0-100) and segment assignment
- Added CLV calculation (historical and predicted)
- Added CSV export for all reports

### December 13, 2025 - Phase 4 Complete
- Phase 4 Pricing & Promotions: 0% → 95%
- Added 4 new database tables (pricing.ts schema)
- Created 4 new services (SeasonalPricing, PromoCode, GroupDiscount, PricingCalculation)
- Built Pricing Settings page with Seasonal Pricing and Group Discounts tabs
- Built Promo Codes management page with full CRUD
- Built Promo Code detail page with usage stats
- Implemented PricingCalculationService for unified pricing logic
- Discount stacking: Seasonal → Group → Promo codes

### December 13, 2025 - Phase 3 Complete
- Phase 3 Guide Operations: 0% → 95%
- Added 5 new database tables (guide-operations schema + guide_tokens)
- Created 4 new services (GuideAvailability, TourGuideQualification, GuideAssignment, Manifest)
- Built complete Guide Management UI (list, create, edit, detail pages)
- Implemented Guide Availability system with weekly patterns and overrides
- Added Tour-Guide Qualifications management in tour detail page
- Built Schedule Guide Assignment component with conflict detection
- Created Guide Portal with magic link authentication
- Implemented Manifest system with print support
- Created 4 Inngest functions for guide notifications

### December 13, 2025 - Strategy Change
- Switched from parallel workstreams to sequential phase development
- Consolidated all work on `main` branch
- Removed git worktree strategy

### December 13, 2025 - Phase 2 Complete
- Phase 2 Customers & Communications: 0% → 95%
- Added 9 new database tables (communications schema)
- Created 5 new services
- Built Communications page with 4 tabs
- Enhanced Customer profile with Notes tab
- GDPR data export and anonymization
- Inngest automation functions

### December 12, 2025
- Phase 1 completed at 97%
- Tour form enhancements
- Booking reschedule and refund
- Calendar view with react-big-calendar
- Activity logging system

### February 3, 2026 - Command Center Milestone 4
- Dispatch day lock enforced (server guard + read-only UI on dispatched days)
- Dispatch warnings persisted and used for gating (cannot dispatch with unresolved warnings)
- Warning actions improved with actionable suggestions and “Mark Reviewed” fallback
- Added Ready-to-Dispatch and Dispatched banners in the Command Center header
- Read-only timeline behavior aligned with dispatched state
- `pnpm typecheck` passed

---

*Document maintained by Claude. Update after each feature completion.*
