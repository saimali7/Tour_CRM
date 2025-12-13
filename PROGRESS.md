# Tour Operations Platform - Progress Tracker

**Last Updated:** December 12, 2025
**Current Focus:** Phase 1 CRM Core Completion
**Overall Status:** Phase 0 Complete, Phase 1 In Progress (~92%)

> This document is the single source of truth for implementation progress. Keep it updated as features are completed.

---

## Quick Status Overview

| Phase | Name | Status | Completion | Notes |
|-------|------|--------|------------|-------|
| **0** | Foundation | ✅ COMPLETE | 98% | Monorepo, DB, Auth, CI/CD, Sentry |
| **1** | Core Booking Engine | 🔄 IN PROGRESS | 92% | Tours, Schedules, Bookings, Settings, Inngest |
| **2** | Customer & Communications | ⏳ NOT STARTED | 0% | CRM features, email/SMS automation |
| **3** | Guide Operations | ⏳ NOT STARTED | 0% | Guide management, manifests |
| **4** | Pricing & Promotions | ⏳ NOT STARTED | 0% | Seasonal pricing, promo codes |
| **5** | Reporting & Analytics | ⏳ NOT STARTED | 0% | Dashboards, reports |
| **6** | Polish & Optimization | ⏳ NOT STARTED | 0% | Performance, UX, testing |
| **7-11** | Web App & SaaS | ⏳ FUTURE | 0% | After CRM complete |

---

## Phase 0: Foundation ✅ COMPLETE (98%)

**Duration:** Completed
**Goal:** Deployable skeleton with multi-tenant infrastructure

### 0.1 Monorepo Setup ✅ COMPLETE (100%)

| Item | Status | Evidence |
|------|--------|----------|
| Turborepo + pnpm workspaces | ✅ | `turbo.json`, `pnpm-workspace.yaml` |
| Next.js 15 apps (CRM + Web) | ✅ | `apps/crm`, `apps/web` |
| @tour/database package | ✅ | Drizzle ORM, all schemas |
| @tour/services package | ✅ | Business logic layer |
| @tour/ui package | ✅ | Shared components |
| @tour/validators package | ✅ | Zod schemas |
| @tour/config package | ✅ | Tailwind config |
| TypeScript strict mode | ✅ | `packages/typescript-config/base.json` |
| Tailwind CSS + shadcn/ui | ✅ | Configured in all apps |
| ESLint + Prettier | ✅ | Shared configs in `packages/eslint-config` |
| tRPC setup | ✅ | 8 routers, multiple procedure types |

### 0.2 Database Setup ✅ COMPLETE (100%)

| Item | Status | Evidence |
|------|--------|----------|
| Drizzle ORM configuration | ✅ | `packages/database/drizzle.config.ts` |
| Organizations table (tenant root) | ✅ | Full schema with all fields |
| All tables have organization_id | ✅ | tours, bookings, customers, schedules, guides |
| Unique constraints per org | ✅ | slug, email unique within org |
| Seed data scripts | ✅ | `packages/database/src/seed/` |
| RLS policies | ⚠️ | Optional - not implemented (defense-in-depth) |

**Tables Implemented:**
- `organizations` - Tenant root with settings, Stripe, plans
- `users` - Platform users (Clerk sync)
- `organization_members` - User-org relationships with roles
- `tours` - Tour products
- `tour_pricing_tiers` - Pricing tiers (Adult, Child, etc.)
- `tour_variants` - Tour variants (Morning, Private, etc.)
- `schedules` - Specific tour instances
- `bookings` - Customer reservations
- `booking_participants` - Individual participant details
- `customers` - Customer records per org
- `guides` - Tour guide profiles

### 0.3 Authentication & Multi-Tenancy ✅ COMPLETE (100%)

| Item | Status | Evidence |
|------|--------|----------|
| Clerk integration | ✅ | `@clerk/nextjs` v6.36.2 |
| Organization context URL | ✅ | `/org/[slug]/...` pattern |
| Sign in / Sign up flows | ✅ | Clerk-hosted pages |
| Protected route middleware | ✅ | `apps/crm/src/middleware.ts` |
| Role-based access (RBAC) | ✅ | Owner, Admin, Manager, Support, Guide |
| Permission system | ✅ | `apps/crm/src/lib/auth.ts` with wildcards |
| Clerk webhooks (user sync) | ✅ | `apps/crm/src/app/api/webhooks/clerk/` |
| Organization onboarding flow | ✅ | First-time setup wizard |
| Team management UI | ✅ | Invite, roles, remove members |

**Roles Implemented:**
- **Owner** - Full access including billing (`["*"]`)
- **Admin** - Full operational access
- **Manager** - Bookings, schedules, customers, guides
- **Support** - View/modify bookings and customers
- **Guide** - Own schedules and assigned bookings only

### 0.4 CI/CD Pipeline ✅ COMPLETE (95%)

| Item | Status | Evidence |
|------|--------|----------|
| GitHub Actions workflow | ✅ | `.github/workflows/ci.yml` |
| Lint job | ✅ | ESLint runs on all packages |
| Type check job | ✅ | TypeScript checking |
| Test job | ✅ | Vitest configured |
| Build job | ✅ | Full build with env vars |
| Preview deployments | ⚠️ | Not configured (optional) |

### 0.5 Monitoring & Error Tracking ✅ COMPLETE (95%)

| Item | Status | Evidence |
|------|--------|----------|
| Sentry integration | ✅ | Server, client, edge configs |
| Error tracking | ✅ | Auto-capture in instrumentation |
| Performance monitoring | ✅ | Trace sampling configured |
| Source maps | ✅ | Uploaded, deleted after |
| Basic logging | ✅ | Console logging throughout |

---

## Phase 1: Core Booking Engine 🔄 IN PROGRESS (97%)

**Duration:** In Progress
**Goal:** End-to-end booking flow with CRM operations

### 1.1 Tour Management ✅ COMPLETE (98%)

| Feature | Schema | Service | Router | UI | Overall |
|---------|--------|---------|--------|-----|---------|
| Tour CRUD | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Tour status (draft/active/archived) | ✅ | ✅ | ✅ | ✅ | 100% |
| Tour duplication | ✅ | ✅ | ✅ | ✅ | 100% |
| Tour Variants | ✅ 100% | ✅ 100% | ✅ 100% | ⚠️ 90% | 97% |
| Pricing Tiers | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% | 100% |
| Media Management | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |

**Completed:**
- [x] `tours` table with all required fields
- [x] Tour CRUD operations in service layer
- [x] tRPC endpoints for all tour operations
- [x] Tour list page with filters, search, pagination
- [x] Tour create/edit forms (basic fields)
- [x] Tour variants table, service, router, UI
- [x] Pricing tiers table, service, router, UI
- [x] Publish/unpublish/archive workflows

**Completed (Session 3):**
- [x] Storage service for Supabase Storage uploads
- [x] Upload API route with file validation
- [x] Image uploader components (single & multi)

**Completed (Session 4):**
- [x] Tour form: category selector with presets + custom option
- [x] Tour form: tags input with add/remove
- [x] Tour form: cover image upload integration
- [x] Tour form: gallery images upload integration
- [x] Tour form: requirements field
- [x] Tour form: SEO meta fields (title, description)
- [x] Tour duplication button in list UI

**Gaps (Lower Priority):**
- [ ] Tour preview (customer view)
- [ ] Rich text editor for descriptions
- [ ] Full availability pattern for variants (recurring/specific dates)

### 1.2 Schedule Management ✅ MOSTLY COMPLETE (90%)

| Feature | Schema | Service | Router | UI | Overall |
|---------|--------|---------|--------|-----|---------|
| Manual Schedule Creation | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 90% | 95% |
| Automatic Generation | ✅ 100% | ✅ 100% | ✅ 100% | ⚠️ 80% | 90% |
| Calendar View | - | - | - | ✅ 90% | 90% |
| Status Management | ✅ 100% | ✅ 90% | ✅ 90% | ✅ 85% | 90% |
| Capacity Management | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |

**Completed:**
- [x] `schedules` table with all required fields
- [x] Schedule CRUD operations
- [x] Bulk create for multiple dates
- [x] Schedule list view with filters
- [x] Schedule form (create/edit)
- [x] Capacity tracking (bookedCount, maxParticipants)
- [x] `checkAvailability()` service method
- [x] Cancel schedule functionality
- [x] **Calendar view component** (month/week/day/agenda) with react-big-calendar
- [x] **Auto-generate schedules** from recurring patterns (days of week, times, date range)
- [x] **Preview auto-generate** before creating
- [x] **Auto-close when full** (`checkAndUpdateCapacityStatus()` method)
- [x] **Booking window validation** (minimum notice, maximum advance, same-day cutoff)
- [x] Status-based color coding in calendar view
- [x] View toggle (List/Calendar) with URL persistence

**Completed (Session 3):**
- [x] Visual capacity progress bars in schedule list view
- [x] Visual capacity progress bars in calendar view
- [x] Color-coded capacity status (green/yellow/red)

**Gaps (Lower Priority):**
- [ ] Auto-reopen when cancellation frees space (service method exists)
- [ ] Guide conflict warnings
- [ ] Drag-and-drop schedule editing in calendar

### 1.3 Public Booking Flow ⏳ DEFERRED (0%)

> Deferred to Phase 7 (Web App). CRM handles admin bookings only.

### 1.4 Admin Booking Management ✅ COMPLETE (98%)

| Feature | Schema | Service | Router | UI | Overall |
|---------|--------|---------|--------|-----|---------|
| Booking List | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Booking Detail View | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Manual Booking Creation | ✅ 100% | ✅ 100% | ✅ 100% | ⚠️ 90% | 95% |
| Booking Modification | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Booking Cancellation | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Activity Log / Audit Trail | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 98% | 99% |
| Refund Processing | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Email Notifications | ✅ 100% | ✅ 100% | ✅ 100% | - | 95% |

**Completed:**
- [x] `bookings` table with full schema
- [x] `booking_participants` table
- [x] Booking list with search, filters, pagination
- [x] Booking detail view with all info
- [x] Manual booking creation form
- [x] Status management (confirm, cancel, complete, no_show)
- [x] Capacity updates on booking changes
- [x] Source tracking (manual, website, api)
- [x] **Activity Log / Audit Trail** - `activity_logs` table, service, router, UI component
- [x] **Stripe Refund Processing** - `refunds` table, service, router with Stripe API integration
- [x] **Email Templates** - @tour/emails package with React Email templates
- [x] **Email Service** - Resend integration for transactional emails
- [x] Booking confirmation email template
- [x] Booking cancellation email template
- [x] Booking reminder email template

**Completed (Session 3):**
- [x] Inngest client and event system setup
- [x] Inngest background job functions for email notifications
- [x] Inngest API route handler
- [x] Event triggers in booking router (confirm/cancel emit events)
- [x] Activity log component integrated in booking detail page

**Completed (Session 4):**
- [x] Booking reschedule functionality with availability check
- [x] Reschedule service method with capacity management
- [x] Reschedule router endpoint with activity logging
- [x] Reschedule UI modal in booking detail page
- [x] Refund UI modal in booking detail page
- [x] Refunds list display for cancelled bookings

**Gaps (Lower Priority):**
- [ ] Payment handling options in create form

### 1.5 Customer Self-Service ⏳ DEFERRED (0%)

> Deferred to Phase 7 (Web App). Customers use CRM admin interface.

### 1.6 Settings ✅ MOSTLY COMPLETE (95%)

| Feature | Schema | Service | Router | UI | Overall |
|---------|--------|---------|--------|-----|---------|
| Business Settings | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% | 100% |
| Booking Settings | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 98% |
| Payment Settings | ✅ 100% | ✅ 100% | ✅ 100% | ⚠️ 85% | 90% |
| Tax Configuration | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% | 100% |
| Team Management | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 95% |
| Notification Settings | ⚠️ 70% | ⚠️ 70% | ⚠️ 70% | ⚠️ 60% | 65% |
| Branding Settings | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 95% | 95% |

**Completed:**
- [x] Business profile (name, contact, address, timezone)
- [x] Stripe Connect onboarding flow
- [x] Stripe Connect status display
- [x] Stripe Dashboard link
- [x] Disconnect Stripe option
- [x] Tax configuration with preview
- [x] Team invite, roles, remove
- [x] Branding (logo URL, primary color)
- [x] Basic notification toggles
- [x] **Booking Window Settings** - Schema with `BookingWindowSettings` interface
- [x] **Minimum notice hours** - Service method validates booking times
- [x] **Maximum advance days** - Configurable per organization
- [x] **Same-day booking** - Toggle with cutoff time support

**Completed (Session 3):**
- [x] Booking window settings UI form (min notice hours, max advance days, same-day toggle, cutoff time)

**Gaps (Lower Priority):**
- [ ] Terms URL field
- [ ] Apple Pay / Google Pay toggles
- [ ] Email/SMS template management UI

---

## Phase 1 Critical Path to Completion

### P0 - Critical ✅ ALL COMPLETE

| Task | Current | Target | Status |
|------|---------|--------|--------|
| Schedule Calendar View | 90% | 80% | ✅ COMPLETE |
| Activity Log / Audit Trail | 95% | 80% | ✅ COMPLETE |
| Stripe Refund Processing | 90% | 80% | ✅ COMPLETE |
| Email Notifications (confirm/cancel) | 85% | 80% | ✅ COMPLETE |

### P1 - High ✅ ALL COMPLETE

| Task | Current | Target | Status |
|------|---------|--------|--------|
| Auto-Schedule Generation | 90% | 80% | ✅ COMPLETE |
| Tour Media Upload | 90% | 80% | ✅ COMPLETE |
| Booking Date/Time Modification | 85% | 90% | ⚠️ IN PROGRESS |
| Status Auto-Close When Full | 90% | 100% | ✅ COMPLETE |
| Inngest Email Integration | 95% | 80% | ✅ COMPLETE |

### P2 - Medium ✅ MOSTLY COMPLETE

| Task | Current | Target | Status |
|------|---------|--------|--------|
| Tour Form Completeness | 60% | 90% | ⏳ PENDING |
| Booking Settings UI (window, notice) | 95% | 90% | ✅ COMPLETE |
| Visual Capacity Indicators | 95% | 90% | ✅ COMPLETE |
| Activity Log in Booking Page | 95% | 90% | ✅ COMPLETE |

---

## Phase 2-6 Preview (CRM Features)

### Phase 2: Customer & Communications
- Customer profiles and history
- Email templates and automation
- SMS integration (Twilio)
- Abandoned cart recovery
- Communication history

### Phase 3: Guide Operations
- Guide profiles and qualifications
- Guide availability management
- Schedule assignments
- Guide portal / manifests

### Phase 4: Pricing & Promotions
- Seasonal pricing rules
- Group discounts
- Early bird pricing
- Promotional codes

### Phase 5: Reporting & Analytics
- Operations dashboard
- Business dashboard
- Revenue reports
- Booking reports
- Customer insights

### Phase 6: Polish & Optimization
- Performance optimization
- Query optimization
- UX improvements
- Accessibility audit
- E2E testing

---

## Phase 7-11 Preview (Web App & SaaS)

| Phase | Name | Prerequisite |
|-------|------|--------------|
| 7 | Web App Foundation | CRM Complete |
| 8 | Web App Booking Flow | Phase 7 |
| 9 | Web App Optimization | Phase 8 |
| 10 | SaaS Platform | Web App Complete |
| 11 | Public API | Phase 10 |

---

## Technical Debt & Known Issues

### High Priority
- [x] ~~No image upload (using URL strings)~~ ✅ RESOLVED - Supabase Storage service + upload API
- [x] ~~No email service integration (Resend)~~ ✅ RESOLVED - @tour/emails package with Resend
- [x] ~~No background job processing (Inngest)~~ ✅ RESOLVED - Inngest client + booking email functions
- [x] ~~No refund processing~~ ✅ RESOLVED - Stripe refund integration complete

### Medium Priority
- [ ] No RLS policies (relying on service-layer isolation)
- [ ] Limited test coverage
- [ ] No error boundaries in React
- [ ] Console-only logging

### Low Priority
- [ ] No OpenAPI documentation
- [ ] No environment variable validation
- [ ] No rate limiting

---

## File Reference Index

### Core Configuration
- `turbo.json` - Turborepo config
- `pnpm-workspace.yaml` - Workspace packages
- `.github/workflows/ci.yml` - CI pipeline

### Database
- `packages/database/src/schema/` - All table definitions
- `packages/database/src/schema/activity-logs.ts` - Activity log schema (NEW)
- `packages/database/src/schema/refunds.ts` - Refunds schema (NEW)
- `packages/database/drizzle.config.ts` - Drizzle config
- `packages/database/src/seed/` - Seed scripts

### Services
- `packages/services/src/tour-service.ts` - Tour business logic
- `packages/services/src/schedule-service.ts` - Schedule business logic (enhanced with auto-generate)
- `packages/services/src/booking-service.ts` - Booking business logic
- `packages/services/src/customer-service.ts` - Customer business logic
- `packages/services/src/organization-service.ts` - Org settings
- `packages/services/src/activity-log-service.ts` - Activity logging (NEW)
- `packages/services/src/refund-service.ts` - Refund processing (NEW)

### Emails Package (NEW)
- `packages/emails/src/email-service.ts` - Resend email service
- `packages/emails/src/templates/booking-confirmation.tsx` - Confirmation email
- `packages/emails/src/templates/booking-cancellation.tsx` - Cancellation email
- `packages/emails/src/templates/booking-reminder.tsx` - Reminder email

### API Routers
- `apps/crm/src/server/routers/` - All tRPC routers
- `apps/crm/src/server/routers/activity-log.ts` - Activity log router (NEW)
- `apps/crm/src/server/routers/refund.ts` - Refund router with Stripe (NEW)
- `apps/crm/src/server/trpc.ts` - tRPC initialization

### UI Components
- `apps/crm/src/components/schedules/schedule-calendar.tsx` - Calendar view with capacity bars
- `apps/crm/src/components/activity-log/activity-log-list.tsx` - Activity log UI
- `apps/crm/src/components/uploads/image-uploader.tsx` - Image upload components (NEW)

### Inngest (Background Jobs)
- `apps/crm/src/inngest/client.ts` - Inngest client with event types (NEW)
- `apps/crm/src/inngest/functions/booking-emails.ts` - Email notification functions (NEW)
- `apps/crm/src/inngest/index.ts` - Function exports (NEW)
- `apps/crm/src/app/api/inngest/route.ts` - Inngest API handler (NEW)

### Storage Service
- `packages/services/src/storage-service.ts` - Supabase Storage service (NEW)
- `apps/crm/src/app/api/upload/route.ts` - File upload API (NEW)

### UI Pages
- `apps/crm/src/app/org/[slug]/(dashboard)/tours/` - Tour pages
- `apps/crm/src/app/org/[slug]/(dashboard)/schedules/` - Schedule pages (with calendar view)
- `apps/crm/src/app/org/[slug]/(dashboard)/bookings/` - Booking pages
- `apps/crm/src/app/org/[slug]/(dashboard)/customers/` - Customer pages
- `apps/crm/src/app/org/[slug]/(dashboard)/settings/` - Settings pages

### Authentication
- `apps/crm/src/middleware.ts` - Route protection
- `apps/crm/src/lib/auth.ts` - Auth utilities & permissions
- `apps/crm/src/app/api/webhooks/clerk/` - Clerk webhooks

---

## Changelog

### December 12, 2025 (Session 3) - Phase 1 Near Completion
**Phase 1 progress: 88% → 92%**

**Inngest Integration (Background Jobs):**
- ✅ Added `inngest` package to CRM app
- ✅ Created Inngest client with typed booking events
- ✅ Implemented email notification functions (confirmation, cancellation, reminder)
- ✅ Created API route handler (`/api/inngest`)
- ✅ Added event triggers to booking router mutations (confirm/cancel)
- ✅ Added `booking.email_sent` to ActivityAction type

**Tour Media Upload (Supabase Storage):**
- ✅ Created `StorageService` in @tour/services
- ✅ Organization-scoped file paths for tenant isolation
- ✅ Upload API route with validation (size, type)
- ✅ `ImageUploader` component (multi-file with drag-drop)
- ✅ `SingleImageUploader` component (for cover images)
- ✅ Added @tour/emails dependency to CRM

**Booking Settings UI:**
- ✅ Added booking window settings form to Settings page
- ✅ Minimum notice hours input
- ✅ Maximum advance days input
- ✅ Same-day booking toggle
- ✅ Cutoff time selector

**Activity Log Integration:**
- ✅ Added ActivityLogCard to booking detail page

**Visual Capacity Indicators:**
- ✅ Progress bars in schedule list view
- ✅ Progress bars in calendar events
- ✅ Color-coded status (green/yellow/red)

**Technical Improvements:**
- Fixed TypeScript errors in storage service
- All typechecks passing

### December 12, 2025 (Session 2) - Major Phase 1 Completion
**Phase 1 progress: 70% → 88%**

**Schedule Management (1.2) - NEW FEATURES:**
- ✅ Implemented Schedule Calendar View with react-big-calendar
  - Month/week/day/agenda views
  - Status-based color coding (scheduled=blue, in_progress=yellow, completed=green, cancelled=red)
  - Click-to-navigate to schedule details
  - View toggle (List/Calendar) with URL persistence
- ✅ Implemented Auto-Schedule Generation
  - Recurring pattern support (days of week, times, date range)
  - Preview before creation
  - Skip existing schedules option
  - `autoGenerate()` and `previewAutoGenerate()` service methods
- ✅ Implemented Capacity Auto-Close
  - `checkAndUpdateCapacityStatus()` method
- ✅ Booking Window Validation
  - `BookingWindowSettings` interface (minimumNoticeHours, maximumAdvanceDays, allowSameDayBooking, sameDayCutoffTime)
  - `checkAvailabilityWithSettings()` method validates booking times

**Admin Booking Management (1.4) - NEW FEATURES:**
- ✅ Activity Log / Audit Trail
  - `activity_logs` table with comprehensive schema
  - `ActivityLogService` with convenience methods for booking/schedule/tour/customer actions
  - `activity-log` tRPC router with list, getById, getByEntity, getStats
  - `ActivityLogList` UI component with filters
- ✅ Stripe Refund Processing
  - `refunds` table with status tracking
  - `RefundService` with full workflow (create, markProcessing, markSucceeded, markFailed)
  - `refund` tRPC router with Stripe API integration
  - Automatic booking paymentStatus updates
- ✅ Email Notifications
  - New `@tour/emails` package
  - `EmailService` with Resend integration
  - React Email templates: booking-confirmation, booking-cancellation, booking-reminder
  - Organization branding support in templates

**Settings (1.6) - NEW FEATURES:**
- ✅ Booking Window Settings schema added to OrganizationSettings

**Technical Improvements:**
- Fixed multiple TypeScript errors
- Database schema pushed to Supabase
- All typechecks passing

### December 12, 2025 (Session 1)
- Created PROGRESS.md as project management tool
- Completed comprehensive audit of Phase 0 and Phase 1
- Phase 0 marked as complete (98%)
- Phase 1.1 Tour Management at 90%
- Phase 1.6 Settings at 85%
- Identified critical gaps: Calendar view, Activity log, Refunds

### Previous Sessions
- Completed Stripe Connect payment settings
- Completed Tax configuration
- Completed Tour pricing tiers
- Completed Tour variants
- Fixed drizzle-orm type issues

---

## Next Steps for Phase 1 Completion (to 95%+)

**Remaining P2 Tasks:**
1. **Tour Form Completeness** - Add category selector, tags, meta fields
2. **Image Uploader Integration** - Connect uploader components to tour edit form
3. **Booking Date/Time Modification UI** - Add reschedule option with availability check

**Optional Improvements:**
- Email/SMS template management UI
- Guide conflict warnings in schedule creation
- Drag-and-drop schedule editing in calendar

**Phase 1 is at ~92% completion and ready for Phase 2 features.**

---

*Document maintained by development team. Update after each feature completion.*
