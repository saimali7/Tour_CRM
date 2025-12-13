# Tour Operations Platform - Progress Tracker

**Last Updated:** December 13, 2025
**Status:** Parallel Development Mode
**Main Branch:** `main`

> This document is the single source of truth for implementation progress. It supports **parallel development** across multiple workstreams using git worktrees.

---

## Parallel Development Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL WORKSTREAMS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FOUNDATION (Phase 0+1) ✅ COMPLETE - All workstreams can start            │
│   ════════════════════════════════════════════════════════════              │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │ WORKSTREAM A │  │ WORKSTREAM B │  │ WORKSTREAM C │  │ WORKSTREAM D │   │
│   │   Web App    │  │  Customers   │  │    Guides    │  │   Pricing    │   │
│   │  (Phase 7-9) │  │  (Phase 2)   │  │  (Phase 3)   │  │  (Phase 4)   │   │
│   │              │  │              │  │              │  │              │   │
│   │ apps/web     │  │ CRM features │  │ CRM features │  │ CRM features │   │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│          │                 │                 │                 │            │
│          └─────────────────┴─────────────────┴─────────────────┘            │
│                                      │                                       │
│                              ┌───────▼───────┐                              │
│                              │ WORKSTREAM E  │                              │
│                              │   Reporting   │                              │
│                              │  (Phase 5)    │                              │
│                              └───────┬───────┘                              │
│                                      │                                       │
│                              ┌───────▼───────┐                              │
│                              │ WORKSTREAM F  │                              │
│                              │    Polish     │                              │
│                              │  (Phase 6)    │                              │
│                              └───────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Status Dashboard

| Workstream | Phase(s) | Status | Branch | Owner | Completion |
|------------|----------|--------|--------|-------|------------|
| **Foundation** | 0, 1 | ✅ COMPLETE | `main` | - | 97% |
| **A: Web App** | 7, 8, 9 | 🔄 IN PROGRESS | `feature/web-app` | Active | 85% |
| **B: Customers & Comms** | 2 | 🟡 READY | `feature/phase-2-customers` | *Unassigned* | 0% |
| **C: Guide Operations** | 3 | 🟡 READY | `feature/phase-3-guides` | *Unassigned* | 0% |
| **D: Pricing & Promos** | 4 | 🟡 READY | `feature/phase-4-pricing` | *Unassigned* | 0% |
| **E: Reporting** | 5 | 🟡 READY | `feature/phase-5-reporting` | *Unassigned* | 0% |
| **F: Polish** | 6 | ⏳ BLOCKED | `feature/phase-6-polish` | *Unassigned* | 0% |
| **G: SaaS Platform** | 10, 11 | 🟡 READY | `feature/saas-platform` | *Unassigned* | 0% |

**Legend:** ✅ Complete | 🔄 In Progress | 🟡 Ready to Start | ⏳ Blocked

---

## Git Worktree Strategy

### Setup Instructions

Each workstream operates in its own git worktree for true parallel development:

```bash
# From the main repository root, create worktrees for each workstream:

# Workstream A: Web App
git worktree add ../tour-web-app -b feature/web-app

# Workstream B: Customers & Communications
git worktree add ../tour-customers -b feature/phase-2-customers

# Workstream C: Guide Operations
git worktree add ../tour-guides -b feature/phase-3-guides

# Workstream D: Pricing & Promotions
git worktree add ../tour-pricing -b feature/phase-4-pricing

# Workstream E: Reporting
git worktree add ../tour-reporting -b feature/phase-5-reporting

# Workstream G: SaaS Platform
git worktree add ../tour-saas -b feature/saas-platform
```

### Worktree Rules

1. **Each worktree = one workstream** - No cross-workstream changes
2. **Sync with main regularly** - `git pull origin main` before starting work
3. **Small, focused PRs** - Easier to review and merge
4. **Database migrations** - Coordinate via Slack/Discord before creating migrations
5. **Shared packages** - Changes to `@tour/*` packages need team review

### Merge Strategy

```
feature/web-app ────────┐
feature/phase-2 ────────┼──► main (via PR review)
feature/phase-3 ────────┤
feature/phase-4 ────────┘
```

- All PRs require review before merging to `main`
- Run `pnpm typecheck && pnpm lint && pnpm build` before PR
- Resolve conflicts with `main` before requesting review

---

## Workstream Dependencies

```
Phase 0 (Foundation) ✅
    │
    └──► Phase 1 (Core Booking) ✅
            │
            ├──► Workstream A: Web App (Phase 7-9) 🟡
            │
            ├──► Workstream B: Customers (Phase 2) 🟡
            │
            ├──► Workstream C: Guides (Phase 3) 🟡
            │
            ├──► Workstream D: Pricing (Phase 4) 🟡
            │
            └──► Workstream E: Reporting (Phase 5) 🟡
                    │
                    └──► Workstream F: Polish (Phase 6) ⏳
                            │
                            └──► Workstream G: SaaS (Phase 10-11) 🟡*

* SaaS can start basic infrastructure now, but full features need CRM complete
```

---

## Foundation (Phase 0 + 1) ✅ COMPLETE

**This is the shared foundation all workstreams depend on.**

### What's Available for All Workstreams

| Component | Location | Status |
|-----------|----------|--------|
| **Database Schema** | `packages/database/src/schema/` | ✅ |
| Organizations | `organizations.ts` | ✅ |
| Users | `users.ts` | ✅ |
| Tours | `tours.ts` | ✅ |
| Schedules | `schedules.ts` | ✅ |
| Bookings | `bookings.ts` | ✅ |
| Customers | `customers.ts` | ✅ |
| Guides | `guides.ts` | ✅ |
| Activity Logs | `activity-logs.ts` | ✅ |
| Refunds | `refunds.ts` | ✅ |
| **Services** | `packages/services/src/` | ✅ |
| TourService | `tour-service.ts` | ✅ |
| ScheduleService | `schedule-service.ts` | ✅ |
| BookingService | `booking-service.ts` | ✅ |
| CustomerService | `customer-service.ts` | ✅ |
| GuideService | `guide-service.ts` | ✅ |
| OrganizationService | `organization-service.ts` | ✅ |
| ActivityLogService | `activity-log-service.ts` | ✅ |
| RefundService | `refund-service.ts` | ✅ |
| StorageService | `storage-service.ts` | ✅ |
| **Infrastructure** | | ✅ |
| Clerk Auth | Multi-tenant with orgs | ✅ |
| tRPC | Type-safe API | ✅ |
| Inngest | Background jobs | ✅ |
| Resend | Email service | ✅ |
| Stripe | Payments & Connect | ✅ |
| Supabase Storage | File uploads | ✅ |

### Phase 1 Minor Gaps (Non-Blocking)

These can be completed by any workstream or deferred:

- [ ] Rich text editor for tour descriptions
- [ ] Tour preview (customer view)
- [ ] Drag-and-drop calendar editing
- [ ] Guide conflict warnings
- [ ] Auto-reopen schedule when cancellation frees space

---

## Workstream A: Web App (Phase 7-9)

**Branch:** `feature/web-app`
**App:** `apps/web`
**Owner:** Active
**Status:** 🔄 IN PROGRESS (85%)

### Prerequisites ✅
- [x] Tours service available
- [x] Schedules service available
- [x] Bookings service available
- [x] Stripe payment integration
- [x] Organization multi-tenancy

### Phase 7: Web App Foundation (100%) ✅

| Task | Status | Notes |
|------|--------|-------|
| Subdomain routing middleware | ✅ | `{slug}.localhost:3001` & `{slug}.book.platform.com` |
| Organization context from subdomain | ✅ | `apps/web/src/lib/organization.ts` |
| Basic layout (header, footer) | ✅ | `apps/web/src/components/header.tsx`, `footer.tsx` |
| Organization branding (logo, colors) | ✅ | Primary color CSS custom properties |
| SEO foundation (meta, sitemap, robots) | ✅ | `generateMetadata()`, dynamic sitemap |
| Structured data (Schema.org) | ✅ | TouristAttraction + Product schemas |
| Tour listing page | ✅ | With filtering, sorting, pagination |
| Tour detail page | ✅ | Full info display with gallery |
| Availability display | ✅ | Interactive calendar with color-coded status |
| About page | ✅ | Organization info and values |
| Contact page | ✅ | Contact form with FAQ |
| Terms & Privacy pages | ✅ | Legal pages |
| Loading states | ✅ | Skeleton loading for all pages |

**Files Created:**
- `apps/web/src/middleware.ts` - Subdomain routing
- `apps/web/src/lib/organization.ts` - Org context helpers
- `apps/web/src/app/org/[slug]/layout.tsx` - Org-scoped layout
- `apps/web/src/app/org/[slug]/page.tsx` - Tour listing
- `apps/web/src/app/org/[slug]/loading.tsx` - Tour listing skeleton
- `apps/web/src/app/org/[slug]/tours/[tourSlug]/page.tsx` - Tour detail
- `apps/web/src/app/org/[slug]/tours/[tourSlug]/loading.tsx` - Tour detail skeleton
- `apps/web/src/app/org/[slug]/about/page.tsx` - About page
- `apps/web/src/app/org/[slug]/about/loading.tsx` - About skeleton
- `apps/web/src/app/org/[slug]/contact/page.tsx` - Contact page
- `apps/web/src/app/org/[slug]/contact/loading.tsx` - Contact skeleton
- `apps/web/src/app/org/[slug]/terms/page.tsx` - Terms of Service
- `apps/web/src/app/org/[slug]/privacy/page.tsx` - Privacy Policy
- `apps/web/src/app/org/[slug]/sitemap.ts` - Dynamic sitemap
- `apps/web/src/app/robots.ts` - Robots.txt
- `apps/web/src/components/header.tsx` - Header
- `apps/web/src/components/footer.tsx` - Footer
- `apps/web/src/components/tour-card.tsx` - Tour card
- `apps/web/src/components/tour-filters.tsx` - Filters
- `apps/web/src/components/availability-calendar.tsx` - Availability calendar
- `apps/web/src/components/structured-data.tsx` - Schema.org
- `apps/web/src/components/contact-form.tsx` - Contact form

### Phase 8: Booking Flow (70%) 🔄

| Task | Status | Notes |
|------|--------|-------|
| Booking form (multi-step) | ✅ | `apps/web/src/components/booking-flow.tsx` |
| Ticket selection | ✅ | `apps/web/src/components/ticket-selection.tsx` |
| Customer details form | ✅ | `apps/web/src/components/customer-details-form.tsx` |
| Payment step UI | ✅ | `apps/web/src/components/payment-step.tsx` |
| Booking confirmation page | ✅ | `apps/web/src/components/booking-confirmation.tsx` |
| Booking API endpoint | ✅ | `apps/web/src/app/api/bookings/route.ts` |
| Customer booking lookup | ✅ | `apps/web/src/app/org/[slug]/booking/page.tsx` |
| Booking state management | ✅ | `apps/web/src/lib/booking-context.tsx` |
| Stripe checkout integration | ⬜ | Payment flow ready, needs Stripe Connect setup |
| Confirmation email trigger | ⬜ | Inngest event ready |
| Self-service cancellation | ⬜ | |
| Reviews display | ⬜ | |
| Social proof elements | ⬜ | |

**Phase 8 Files Created:**
- `apps/web/src/lib/booking-context.tsx` - Booking state management
- `apps/web/src/app/org/[slug]/tours/[tourSlug]/book/page.tsx` - Booking page
- `apps/web/src/components/booking-flow.tsx` - Multi-step booking wrapper
- `apps/web/src/components/ticket-selection.tsx` - Ticket/participant selection
- `apps/web/src/components/customer-details-form.tsx` - Customer form
- `apps/web/src/components/payment-step.tsx` - Payment step UI
- `apps/web/src/components/booking-confirmation.tsx` - Confirmation display
- `apps/web/src/app/api/bookings/route.ts` - Create booking API
- `apps/web/src/app/api/bookings/lookup/route.ts` - Lookup booking API
- `apps/web/src/app/org/[slug]/booking/page.tsx` - Booking lookup page
- `apps/web/src/components/booking-lookup.tsx` - Booking lookup form

### Phase 9: Optimization (0%)

| Task | Status | Notes |
|------|--------|-------|
| Core Web Vitals optimization | ⬜ | |
| Image optimization | ⬜ | |
| Edge caching | ⬜ | |
| A/B testing framework | ⬜ | |
| Conversion funnel tracking | ⬜ | |

---

## Workstream B: Customers & Communications (Phase 2)

**Branch:** `feature/phase-2-customers`
**App:** `apps/crm`
**Owner:** *Unassigned*
**Status:** 🟡 READY TO START

### Prerequisites ✅
- [x] Customers table exists
- [x] CustomerService exists
- [x] Email templates package exists (`@tour/emails`)
- [x] Inngest configured

### New Database Tables Needed

```typescript
// packages/database/src/schema/communications.ts
- communication_logs (email/SMS history)
- email_templates (custom templates)
- abandoned_carts (cart recovery)
- wishlists (save for later)
- notification_preferences
```

### Phase 2 Tasks (0%)

| Task | Status | Notes |
|------|--------|-------|
| **Customer Management** | | |
| Customer list UI (search, filter, sort) | ⬜ | |
| Customer profile page | ⬜ | |
| Customer edit form | ⬜ | |
| Customer notes system | ⬜ | |
| Customer tags | ⬜ | |
| Customer data export (GDPR) | ⬜ | |
| **Email Communications** | | |
| Email template management UI | ⬜ | |
| Template variable system | ⬜ | |
| Manual email composer | ⬜ | |
| Email automation settings | ⬜ | |
| Communication history view | ⬜ | |
| **SMS Communications** | | |
| Twilio integration | ⬜ | |
| SMS templates | ⬜ | |
| SMS automation | ⬜ | |
| **Conversion Recovery** | | |
| Abandoned cart tracking | ⬜ | |
| Cart recovery emails (Inngest) | ⬜ | |
| Wishlist functionality | ⬜ | |
| Price drop alerts | ⬜ | |
| Availability alerts | ⬜ | |

---

## Workstream C: Guide Operations (Phase 3)

**Branch:** `feature/phase-3-guides`
**App:** `apps/crm`
**Owner:** *Unassigned*
**Status:** 🟡 READY TO START

### Prerequisites ✅
- [x] Guides table exists
- [x] GuideService exists
- [x] Schedules service available

### New Database Tables Needed

```typescript
// packages/database/src/schema/guide-operations.ts
- guide_availability (weekly patterns, overrides)
- guide_qualifications (tour-guide assignments)
- guide_assignments (schedule-guide with status)
```

### Phase 3 Tasks (0%)

| Task | Status | Notes |
|------|--------|-------|
| **Guide Management** | | |
| Guide profile CRUD | ⬜ | |
| Guide photo upload | ⬜ | |
| Languages & certifications | ⬜ | |
| Guide-tour qualifications | ⬜ | |
| **Availability** | | |
| Weekly availability pattern UI | ⬜ | |
| Date-specific overrides | ⬜ | |
| Vacation/leave blocking | ⬜ | |
| Availability calendar view | ⬜ | |
| **Assignments** | | |
| Assign guide to schedule | ⬜ | |
| Conflict detection | ⬜ | |
| Assignment notifications | ⬜ | |
| Guide calendar (admin view) | ⬜ | |
| **Guide Portal** | | |
| Magic link login | ⬜ | |
| Guide dashboard | ⬜ | |
| Tour manifest view | ⬜ | |
| Confirm/decline assignments | ⬜ | |
| Mark tour complete | ⬜ | |
| **Manifests** | | |
| Daily manifest generation | ⬜ | |
| PDF export | ⬜ | |
| Email manifests to guides | ⬜ | |

---

## Workstream D: Pricing & Promotions (Phase 4)

**Branch:** `feature/phase-4-pricing`
**App:** `apps/crm`
**Owner:** *Unassigned*
**Status:** 🟡 READY TO START

### Prerequisites ✅
- [x] Tour pricing tiers exist
- [x] Booking pricing calculation exists

### New Database Tables Needed

```typescript
// packages/database/src/schema/pricing.ts
- seasonal_pricing (date ranges, adjustments)
- promo_codes (codes, discounts, limits)
- promo_code_usage (tracking)
- group_discounts (thresholds)
```

### Phase 4 Tasks (0%)

| Task | Status | Notes |
|------|--------|-------|
| **Seasonal Pricing** | | |
| Season definition UI | ⬜ | |
| Percentage/fixed adjustments | ⬜ | |
| Tour-specific seasons | ⬜ | |
| Price preview calendar | ⬜ | |
| **Group Discounts** | | |
| Threshold configuration | ⬜ | |
| Auto-apply in booking | ⬜ | |
| **Early Bird Pricing** | | |
| Advance booking discounts | ⬜ | |
| **Promo Codes** | | |
| Promo code CRUD | ⬜ | |
| Code generator | ⬜ | |
| Usage limits (total, per customer) | ⬜ | |
| Date validity | ⬜ | |
| Tour restrictions | ⬜ | |
| Promo code reporting | ⬜ | |
| Apply code in booking flow | ⬜ | |

---

## Workstream E: Reporting & Analytics (Phase 5)

**Branch:** `feature/phase-5-reporting`
**App:** `apps/crm`
**Owner:** *Unassigned*
**Status:** 🟡 READY TO START

### Prerequisites ✅
- [x] Bookings data available
- [x] Tours data available
- [x] Customers data available

### Phase 5 Tasks (0%)

| Task | Status | Notes |
|------|--------|-------|
| **Dashboards** | | |
| Operations dashboard | ⬜ | Today's tours, activity |
| Business dashboard | ⬜ | Revenue, trends |
| **Reports** | | |
| Revenue report | ⬜ | By period, tour, source |
| Booking report | ⬜ | Counts, patterns |
| Capacity utilization report | ⬜ | |
| Customer report | ⬜ | Acquisition, CLV |
| Guide report | ⬜ | Performance |
| **Analytics** | | |
| Booking trends visualization | ⬜ | |
| Source attribution | ⬜ | UTM tracking |
| **CRM Intelligence** | | |
| Customer scoring | ⬜ | |
| Customer segmentation | ⬜ | |
| CLV prediction | ⬜ | |
| No-show risk detection | ⬜ | |
| Re-engagement campaigns | ⬜ | |
| Revenue attribution dashboard | ⬜ | |

---

## Workstream F: Polish & Optimization (Phase 6)

**Branch:** `feature/phase-6-polish`
**App:** `apps/crm`
**Owner:** *Unassigned*
**Status:** ⏳ BLOCKED (Wait for Workstreams B-E)

### Phase 6 Tasks (0%)

| Task | Status | Notes |
|------|--------|-------|
| **Performance** | | |
| Query optimization | ⬜ | |
| Frontend bundle optimization | ⬜ | |
| Redis caching | ⬜ | |
| **UX** | | |
| Loading states (skeletons) | ⬜ | |
| Error boundaries | ⬜ | |
| Mobile optimization | ⬜ | |
| Accessibility audit (WCAG 2.1) | ⬜ | |
| **Testing** | | |
| Unit tests (critical paths) | ⬜ | |
| Integration tests | ⬜ | |
| E2E tests (Playwright) | ⬜ | |
| Load testing | ⬜ | |
| **Features** | | |
| Global search (Cmd+K) | ⬜ | |
| Notification center | ⬜ | |

---

## Workstream G: SaaS Platform (Phase 10-11)

**Branch:** `feature/saas-platform`
**App:** `apps/crm` (platform admin routes)
**Owner:** *Unassigned*
**Status:** 🟡 READY TO START (basic infrastructure)

### Prerequisites ✅
- [x] Organizations table exists
- [x] Multi-tenant architecture in place

### Phase 10: Platform Infrastructure (0%)

| Task | Status | Notes |
|------|--------|-------|
| Self-service org signup | ⬜ | |
| Organization onboarding wizard | ⬜ | |
| Stripe subscription billing | ⬜ | |
| Plan limits & feature flags | ⬜ | |
| Platform admin dashboard | ⬜ | `/platform/` routes |
| Organization impersonation | ⬜ | |
| Usage tracking | ⬜ | |

### Phase 11: Public API (0%)

| Task | Status | Notes |
|------|--------|-------|
| REST API routes | ⬜ | |
| API key management | ⬜ | |
| Rate limiting | ⬜ | |
| OpenAPI documentation | ⬜ | |
| Webhook system | ⬜ | |
| OTA integrations | ⬜ | Viator, GetYourGuide |

---

## Coordination Guidelines

### Database Migrations

```bash
# Before creating a migration, check for conflicts:
git pull origin main
pnpm db:generate  # See what would be generated

# Announce in team chat before running:
pnpm db:push

# Migration naming convention:
# YYYYMMDD_HHMM_workstream_description.sql
# Example: 20251213_1430_phase2_add_communication_logs.sql
```

### Shared Package Changes

Changes to these packages affect all workstreams - coordinate before modifying:

| Package | Impact | Coordination |
|---------|--------|--------------|
| `@tour/database` | All apps | Announce migrations |
| `@tour/services` | All apps | PR review required |
| `@tour/ui` | All apps | PR review required |
| `@tour/validators` | All apps | PR review required |
| `@tour/emails` | CRM, background jobs | Low impact |

### Daily Sync Checklist

```bash
# Start of day:
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main  # or rebase

# Before PR:
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

---

## File Reference Index

### Core Configuration
- `turbo.json` - Turborepo config
- `pnpm-workspace.yaml` - Workspace packages
- `.github/workflows/ci.yml` - CI pipeline

### Database
- `packages/database/src/schema/` - All table definitions
- `packages/database/drizzle.config.ts` - Drizzle config
- `packages/database/src/seed/` - Seed scripts

### Services
- `packages/services/src/` - All business logic services

### CRM App
- `apps/crm/src/app/org/[slug]/` - Organization-scoped routes
- `apps/crm/src/server/routers/` - tRPC routers
- `apps/crm/src/components/` - React components
- `apps/crm/src/inngest/` - Background job functions

### Web App
- `apps/web/` - Public booking website (to be built)

### Emails
- `packages/emails/src/templates/` - Email templates
- `packages/emails/src/email-service.ts` - Resend integration

---

## Changelog

### December 13, 2025 - Parallel Development Setup
- Restructured PROGRESS.md for parallel workstreams
- Added git worktree strategy
- Defined 7 independent workstreams (A-G)
- All workstreams except Phase 6 are ready to start
- Phase 0+1 foundation marked complete (97%)

### December 12, 2025 (Session 4)
- Phase 1: 92% → 97%
- Added tour form enhancements (category, tags, images, SEO)
- Added booking reschedule functionality
- Added refund UI modal
- Merged to main

### December 12, 2025 (Session 3)
- Phase 1: 88% → 92%
- Added Inngest integration for background jobs
- Added Supabase Storage for image uploads
- Added booking window settings UI

### December 12, 2025 (Session 2)
- Phase 1: 70% → 88%
- Added calendar view with react-big-calendar
- Added auto-schedule generation
- Added activity log system
- Added refund processing with Stripe

---

*Document maintained by development team. Update after each feature completion.*
