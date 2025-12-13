# Sprint Planning

**Sprint Start:** December 14, 2025
**Last Updated:** December 13, 2025
**Status:** Active

---

## Current Sprint: Sprint 7 - UX Overhaul (Unified System)

### Sprint Goal
Transform the CRM from isolated feature modules into a unified, connected system where every workflow feels natural and efficient.

### Why This Sprint
The CRM has all features built (Phases 0-5) but they don't work together as a system:
- Booking requires navigating away to create customer
- Related data not visible on detail pages
- No global search
- Browser dialogs instead of proper modals
- Too many clicks for common operations

### Prerequisites Complete
- [x] Phase 0-5 implementation (Core CRM functionality)
- [x] Production readiness audit
- [x] Security fixes (JWT, magic links, env validation)
- [x] Multi-tenant isolation fixes (20+ org filter fixes)
- [x] Database schema fixes (indexes, constraints)
- [x] Authorization fixes (adminProcedure)
- [x] Bug fixes (currency, dates, URLs)
- [x] Build verification (typecheck + build passing)

---

## Sprint Backlog

### Week 1: Foundation Components
| Component | Status | Notes |
|-----------|--------|-------|
| Combobox (searchable select with create) | ⬜ | Use shadcn/ui Command |
| SlideOver (side panel) | ⬜ | Use shadcn/ui Sheet |
| Modal (confirmations) | ⬜ | Use shadcn/ui Dialog |
| Toast (feedback) | ⬜ | Use shadcn/ui Sonner |
| EntityCard (consistent cards) | ⬜ | Custom component |
| CommandPalette (Cmd+K) | ⬜ | Use cmdk library |

### Week 2: Entity Quick Views
| Component | Status | Notes |
|-----------|--------|-------|
| BookingQuickView | ⬜ | Customer, schedule, status, actions |
| CustomerQuickView | ⬜ | Contact, stats, recent bookings |
| ScheduleQuickView | ⬜ | Tour, time, guide, bookings |
| TourQuickView | ⬜ | Details, upcoming schedules |
| GuideQuickView | ⬜ | Contact, availability |

### Week 3: Inline Creation & Booking Flow
| Task | Status | Notes |
|------|--------|-------|
| CustomerQuickCreate modal | ⬜ | Name, email, phone minimal form |
| Booking form - Customer Combobox | ⬜ | Replace `<select>` |
| Booking form - Schedule Combobox | ⬜ | With date filtering |
| Booking form - Promo code field | ⬜ | Connect to pricing service |
| Booking form - Participant details | ⬜ | Inline name entry |

### Week 4: Page Updates & Connections
| Task | Status | Notes |
|------|--------|-------|
| Dashboard - actionable alerts | ⬜ | Inline action buttons |
| Dashboard - guide quick-assign | ⬜ | Modal, no navigation |
| Customer detail - Quick Book button | ⬜ | In header |
| Customer detail - Rebook actions | ⬜ | On booking history |
| Schedule detail - Bookings panel | ⬜ | Currently missing |
| Tour detail - Schedules panel | ⬜ | Currently missing |

### Week 5: Global Integration & Polish
| Task | Status | Notes |
|------|--------|-------|
| Global search tRPC router | ⬜ | Search all entities |
| CommandPalette integration | ⬜ | In layout |
| Keyboard shortcuts | ⬜ | Cmd+B, Cmd+K, etc. |
| Replace all confirm() calls | ⬜ | Custom modals |
| Replace all prompt() calls | ⬜ | Custom modals |
| Loading skeletons | ⬜ | All list pages |
| Empty states | ⬜ | Helpful messages |

---

### Success Metrics

| Workflow | Before | Target |
|----------|--------|--------|
| Walk-in booking | 12+ clicks, 3-5 min | <8 clicks, 45 sec |
| Repeat customer | 10+ clicks | 3-4 clicks |
| Find any record | 5+ clicks | 1-2 clicks (Cmd+K) |
| Customer service | 8+ clicks | 3-4 clicks |

---

## Phase Completion Summary

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation | ✅ 100% | Monorepo, auth, database, infra |
| 1 | Core Booking | ✅ 97% | Tours, schedules, bookings |
| 2 | Customer & Comms | ✅ 95% | Customers, email, automations |
| 3 | Guide Operations | ✅ 95% | Guides, availability, assignments |
| 4 | Pricing & Promotions | ✅ 95% | Seasonal, promo codes, groups |
| 5 | Reporting & Analytics | ✅ 95% | Dashboards, reports, intelligence |
| 6 | Polish & Optimization | 🔄 In Progress | This sprint |

---

## Upcoming Sprints (Backlog)

### Sprint 8: Web App Foundation (Phase 7)
- Subdomain routing for customer-facing sites
- Tour listing pages
- Tour detail pages with availability calendar
- Organization theming/branding

### Sprint 9: Booking Flow (Phase 8)
- Multi-step booking form
- Stripe checkout integration
- Booking confirmation emails
- Customer booking lookup

### Sprint 10: Web Optimization (Phase 9)
- Core Web Vitals optimization
- SEO meta tags
- Open Graph images
- Sitemap generation

### Sprint 11+: SaaS Platform (Phases 10-11)
- Self-service organization signup
- Subscription billing (Stripe)
- Feature flags per plan
- Public REST API
- API key management

---

## Definition of Done

A task is complete when:
1. Code is written and working
2. TypeScript passes (`pnpm typecheck`)
3. Build passes (`pnpm build`)
4. Tested manually in dev environment
5. Committed to main branch

---

## Notes

### Environment Variables Required for Production

```bash
# Database
DATABASE_URL=

# Clerk (Staff Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Guide Portal
GUIDE_JWT_SECRET=

# Email
RESEND_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Known Issues to Address
1. No PDF export for manifests (future enhancement)
2. No real-time dashboard updates (manual refresh required)
3. Guide portal mark complete not implemented
4. Rich text editor for tour descriptions not added

---

*Document maintained by Claude. Update daily during sprint.*
