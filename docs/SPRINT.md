# Sprint Planning

**Sprint Start:** December 14, 2025
**Last Updated:** December 13, 2025
**Status:** Planning

---

## Current Sprint: Sprint 7 - Production Deployment & Polish

### Sprint Goal
Deploy the CRM to production and implement essential polish features for a smooth launch.

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

### Priority 1: Production Deployment
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Set up production environment variables | ⬜ | | GUIDE_JWT_SECRET, RESEND_API_KEY, etc. |
| Configure Coolify deployment | ⬜ | | CRM + Web apps |
| Set up production database (Supabase) | ⬜ | | Run db:push |
| Configure production Clerk | ⬜ | | Organizations enabled |
| Configure production Stripe | ⬜ | | Connect accounts |
| Configure production Inngest | ⬜ | | Event-driven jobs |
| DNS configuration | ⬜ | | app.domain.com, *.book.domain.com |
| SSL certificates | ⬜ | | Via Traefik/Coolify |

### Priority 2: Essential Polish
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Loading states | ⬜ | | Skeleton loaders for lists |
| Error boundaries | ⬜ | | Graceful error handling |
| Empty states | ⬜ | | "No data" illustrations |
| Form validation feedback | ⬜ | | Inline validation messages |
| Toast notifications | ⬜ | | Success/error toasts |
| Responsive design fixes | ⬜ | | Mobile-friendly tables |

### Priority 3: Performance Quick Wins
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Add database indexes for slow queries | ⬜ | | Profile first |
| Implement React.memo for heavy components | ⬜ | | Calendar, lists |
| Add Suspense boundaries | ⬜ | | Route-level loading |
| Image optimization | ⬜ | | next/image usage |

### Priority 4: Documentation
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Environment variables documentation | ⬜ | | .env.example |
| Deployment guide | ⬜ | | Step-by-step |
| User guide (basic) | ⬜ | | Getting started |

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
