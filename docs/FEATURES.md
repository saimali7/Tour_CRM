# Tour Operations Platform — Feature Planning Document

**Version:** 2.1
**Last Updated:** December 2025
**Status:** Multi-Tenant Platform Features
**Related Documents:** [ARCHITECTURE.md](./ARCHITECTURE.md), [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

---

## Table of Contents

1. [Overview](#overview)
2. [UX Standards & Interaction Patterns](#ux-standards--interaction-patterns)
4. [Application Ownership](#application-ownership)
5. [User Personas](#user-personas)
6. [Phase 0: Foundation](#phase-0-foundation)
7. [Phase 1: Core Booking Engine](#phase-1-core-booking-engine)
8. [Phase 2: Customer & Communications](#phase-2-customer--communications)
9. [Phase 3: Guide Operations](#phase-3-guide-operations)
10. [Phase 4: Pricing & Promotions](#phase-4-pricing--promotions)
11. [Phase 5: Reporting & Analytics](#phase-5-reporting--analytics)
12. [Phase 6: UX Overhaul](#phase-6-ux-overhaul)
13. [Phase 7+: Future Expansion](#phase-7-future-expansion)
14. [Feature Index](#feature-index)
15. [Non-Functional Requirements](#non-functional-requirements)

---

## Overview

### Document Purpose

This document provides comprehensive feature specifications for the Tour Operations Platform, organized by development phase. Each feature includes user stories, acceptance criteria, and implementation details.

> **📖 See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for complete multi-tenant architecture and application boundaries.**

### Multi-Tenant, Multi-App Platform

The platform consists of **two applications** serving different audiences:

| Application | Domain Pattern | Users | Purpose |
|-------------|----------------|-------|---------|
| **CRM App** | `app.platform.com/org/{slug}` | Staff | Tour management, operations, reporting |
| **Web App** | `{slug}.book.platform.com` | Customers | Public booking website (optional per org) |

**Key architectural points:**
- Each organization is a **tenant** with isolated data
- CRM is **always available** to all organizations
- Web App is **optional** — organizations can use CRM-only with API, phone bookings, or OTA integrations
- Both apps share the same business logic through `@tour/services`

### Phase Timeline

**Strategy: CRM First, Web App Second, SaaS Last**

The CRM is the core product that runs your tour business. The Web App is a customer acquisition channel. SaaS/API features enable selling to other operators. We build in this order to:
1. Validate core operations work perfectly before adding customer-facing complexity
2. Run your business on the CRM while Web App is being built
3. Prove product-market fit before investing in multi-tenant SaaS infrastructure

| Phase | Name | Duration | Focus | App |
|-------|------|----------|-------|-----|
| **0** | Foundation | 2 weeks | Infrastructure, auth, scaffolding | Core |
| **1** | Core CRM & Booking | 3 weeks | Tours, schedules, bookings, payments | 🖥️ CRM |
| **2** | Customer & Communications | 2 weeks | CRM features, email, SMS automation | 🖥️ CRM |
| **3** | Guide Operations | 2 weeks | Guides, assignments, manifests | 🖥️ CRM |
| **4** | Pricing & Promotions | 2 weeks | Advanced pricing, promo codes | 🖥️ CRM |
| **5** | Reporting & Analytics | 2 weeks | Dashboard, reports, CRM intelligence | 🖥️ CRM |
| **6** | CRM Polish | 2 weeks | Performance, UX, testing | 🖥️ CRM |
| — | **CRM COMPLETE** | — | *Your business can run fully on CRM* | — |
| **7** | Web App Foundation | 2 weeks | Public site scaffolding, SEO | 🌐 Web |
| **8** | Web App Booking Flow | 3 weeks | High-conversion booking experience | 🌐 Web |
| **9** | Web App Optimization | 2 weeks | Conversion features, A/B testing | 🌐 Web |
| — | **WEB APP COMPLETE** | — | *Full customer acquisition channel* | — |
| **10** | SaaS Platform | 3 weeks | Multi-tenant onboarding, billing | 🔧 Platform |
| **11** | Public API | 2 weeks | REST API for partners, OTA integrations | 🔧 Platform |
| **12+** | Expansion | Ongoing | Mobile app, advanced integrations | All |

### Development Priority Order

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0-6: CRM (Your Business Operations)                      │
│  ═══════════════════════════════════════════                    │
│  • Run your tour business end-to-end                            │
│  • Manual bookings (phone, walk-in, admin)                      │
│  • Full operations: guides, schedules, payments                 │
│  • Complete reporting and analytics                             │
│  • Can operate WITHOUT Web App                                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 7-9: Web App (Customer Acquisition)                      │
│  ═══════════════════════════════════════════                    │
│  • Public booking website                                       │
│  • High-conversion checkout                                     │
│  • SEO, social proof, reviews                                   │
│  • Abandoned cart recovery                                      │
│  • OPTIONAL per organization                                    │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 10-11: SaaS Platform (Scale to Other Operators)          │
│  ═══════════════════════════════════════════════════            │
│  • Multi-tenant onboarding                                      │
│  • Subscription billing (Stripe)                                │
│  • Public REST API                                              │
│  • OTA integrations (Viator, GetYourGuide)                      │
│  • White-label capabilities                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Booking completion rate | > 70% | Completed / Started |
| Admin task time | < 2 min | Average for common tasks |
| System uptime | 99.9% | Monthly availability |
| Page load (p95) | < 2s | Core Web Vitals |
| Customer satisfaction | > 4.5/5 | Post-tour surveys |

---

## UX Standards & Interaction Patterns

> **Philosophy:** The CRM is a unified system, not a collection of isolated pages. Every entity connects to related data, actions appear in context, and users never navigate away for simple operations.

### Design Principles

1. **Everything Connected** - No isolated pages; all entities link to related data
2. **Search Everywhere** - `Cmd+K` accesses any entity from anywhere
3. **Create Inline** - Never navigate away to create a related entity
4. **Actions in Context** - Buttons appear where you need them
5. **Consistent Patterns** - Same interaction model on every page

### Required Interaction Patterns

#### Pattern: Entity Selection
- MUST use searchable Combobox (not plain `<select>`)
- MUST include "Create New" option at bottom
- MUST support keyboard navigation
- MUST show recent selections

#### Pattern: Entity Display
- Clickable items MUST open slide-over (not navigate) for quick view
- Related entities MUST be shown as clickable chips
- Status MUST be shown with color-coded badges
- Actions MUST appear on hover/focus

#### Pattern: Confirmations
- MUST use styled Modal component (not browser `confirm()`)
- Destructive actions MUST require explicit confirmation
- MUST explain consequences of action
- MUST provide cancel option

#### Pattern: Feedback
- All mutations MUST show toast on success/error
- Loading states MUST show skeleton/spinner
- Empty states MUST show helpful message + action

### User Stories by Workflow

#### US-1: Walk-in/Phone Booking
**As a** tour operator staff member
**I want to** create a booking while on the phone with a customer
**So that** I can complete the transaction without making them wait

**Acceptance Criteria:**
- [ ] Can search for existing customer by name/email/phone
- [ ] Can create new customer inline without navigating away
- [ ] Can search schedules by date and tour name
- [ ] Can apply promo code with instant validation
- [ ] Can complete booking in under 8 clicks
- [ ] Confirmation shown immediately with option to book another

#### US-2: Repeat Customer Booking
**As a** tour operator staff member
**I want to** quickly rebook a returning customer from their profile
**So that** I can leverage their existing information

**Acceptance Criteria:**
- [ ] Customer profile shows "Quick Book" button
- [ ] Past bookings show "Rebook" action
- [ ] Rebook pre-fills: customer, tour, participant count, preferences
- [ ] Only need to select new date/time
- [ ] Can complete in 3-4 clicks

#### US-3: Morning Operations Check
**As an** operations manager
**I want to** see and resolve today's issues at a glance
**So that** I can ensure smooth tour operations

**Acceptance Criteria:**
- [ ] Dashboard shows critical alerts with severity
- [ ] Each alert has inline action button (e.g., "Assign Guide")
- [ ] Can assign guide without leaving dashboard
- [ ] Can view manifest preview on hover
- [ ] Can print all manifests with one click

#### US-4: Customer Service Inquiry
**As a** customer service representative
**I want to** quickly find and modify a booking
**So that** I can resolve customer inquiries efficiently

**Acceptance Criteria:**
- [ ] Can search bookings globally via `Cmd+K`
- [ ] Search results show in slide-over (no navigation)
- [ ] Can reschedule from slide-over
- [ ] Can cancel with reason from slide-over
- [ ] All changes show toast confirmation
- [ ] Customer notified automatically

#### US-5: Guide Assignment
**As an** operations manager
**I want to** assign guides to multiple schedules efficiently
**So that** I can complete weekly planning quickly

**Acceptance Criteria:**
- [ ] Can view all unassigned schedules
- [ ] Can see guide availability at a glance
- [ ] Conflicts detected before assignment
- [ ] Can assign via drag-drop or modal
- [ ] Bulk assignment supported

#### US-6: Quick Entity Lookup
**As any** CRM user
**I want to** find any record from anywhere
**So that** I don't waste time navigating

**Acceptance Criteria:**
- [ ] `Cmd+K` available on every page
- [ ] Searches bookings, customers, tours, schedules, guides
- [ ] Results grouped by type
- [ ] Recent items shown by default
- [ ] Keyboard navigable

### Success Metrics

| Workflow | Before | Target |
|----------|--------|--------|
| Walk-in booking | 12+ clicks, 3-5 min | <8 clicks, 45 sec |
| Repeat customer booking | 10+ clicks | 3-4 clicks |
| Morning ops check | View only | Inline actions |
| Guide assignment (per schedule) | 6 clicks | 1 drag-drop |
| Customer service inquiry | 8+ clicks | 3-4 clicks |
| Find any record | Navigate + search | `Cmd+K` instant |

---

## Application Ownership

### Feature Distribution by App

Features are assigned to one of three categories:

| Icon | App | Description |
|------|-----|-------------|
| 🖥️ | **CRM** | Staff-only features in the admin app |
| 🌐 | **Web** | Customer-facing features on booking site |
| 🔄 | **Shared** | Features used by both apps (via shared services) |
| 🔧 | **Platform** | Super admin features for managing organizations |

### Quick Reference

| Feature Area | CRM | Web | Platform |
|--------------|-----|-----|----------|
| **Tours** | Create, edit, manage | Browse, view | — |
| **Schedules** | Full CRUD, calendar | View availability | — |
| **Bookings** | All operations | Create, view own, modify | — |
| **Customers** | Full management | Self-service profile | — |
| **Guides** | Assignment, management | — | — |
| **Pricing** | Configure all pricing | View prices | — |
| **Reports** | Full analytics | — | Platform metrics |
| **Payments** | Refunds, disputes | Checkout | Revenue tracking |
| **Communications** | Templates, history | Receive only | — |
| **Settings** | Organization config | — | Platform config |
| **Organizations** | — | — | Full management |

### Organization-Scoped Features

All features operate within the context of an **organization**. This means:

1. **Staff see only their organization's data** — A manager at Organization A cannot see Organization B's bookings
2. **Customers book from one organization** — The Web App always operates in a single org context based on domain
3. **Super admins can access any organization** — For support and debugging purposes

---

## User Personas

### Operations Manager (Sarah)
- **Role:** Day-to-day system administrator
- **Goals:** Efficient operations, quick issue resolution, informed decisions
- **Pain Points:** Double-bookings, manual data entry, chasing guides
- **Key Tasks:** Process bookings, assign guides, generate manifests, handle modifications

### Business Owner (Michael)
- **Role:** Strategic decision maker
- **Goals:** Understand performance, optimize revenue, grow business
- **Pain Points:** Lack of visibility, gut-feel pricing, scattered data
- **Key Tasks:** Review dashboards, adjust pricing, monitor trends

### Tour Guide (Maria)
- **Role:** Frontline tour delivery
- **Goals:** Know schedule, have customer info, focus on tours
- **Pain Points:** Last-minute changes, missing info, paper manifests
- **Key Tasks:** Check assignments, view manifests, confirm availability

### Customer (Tourist)
- **Role:** End user booking and attending tours
- **Goals:** Easy booking, clear expectations, smooth experience
- **Pain Points:** Confusing checkout, hidden fees, poor communication
- **Key Tasks:** Browse, book, pay, manage booking, attend tour

### Customer Service Rep (Alex)
- **Role:** Handles inquiries and issues
- **Goals:** Quick resolution, complete context, efficient processes
- **Pain Points:** System switching, incomplete history, slow refunds
- **Key Tasks:** Lookup bookings, process changes, handle complaints

---

## Phase 0: Foundation

**Duration:** 2 weeks
**Goal:** Deployable skeleton with multi-tenant infrastructure
**Apps:** 🖥️ CRM (primary), 🔧 Platform

This phase establishes the technical foundation for a multi-tenant platform. No user-facing features, but critical for everything that follows.

### 0.1 Monorepo Setup 🖥️ 🌐

**What:** Initialize Turborepo monorepo with both apps and shared packages.

**Includes:**
- Turborepo configuration with pnpm workspaces
- Two Next.js 15 apps (`apps/crm`, `apps/web`)
- Shared packages (`@tour/database`, `@tour/services`, `@tour/ui`, `@tour/validators`, `@tour/config`)
- TypeScript in strict mode with project references
- Tailwind CSS + shadcn/ui component library
- ESLint + Prettier configuration
- tRPC setup with type inference

**Done When:**
- [ ] `pnpm dev` runs both apps without errors
- [ ] Type checking passes across all packages
- [ ] Shared packages can be imported by both apps
- [ ] Basic layout renders in both apps

---

### 0.2 Database Setup 🔄

**What:** Supabase project with multi-tenant schema.

**Includes:**
- Supabase project creation (free tier to start)
- Drizzle ORM configuration in `@tour/database`
- **Organizations table** (the tenant root)
- Core table migrations with `organization_id` on all tenant tables
- Row-Level Security (RLS) policies for tenant isolation
- Seed data scripts for development (test organization)
- Database connection pooling

**Done When:**
- [ ] Can connect to database locally
- [ ] Organizations table exists and works
- [ ] Migrations run successfully with RLS enabled
- [ ] Seed data creates test organization with sample data

---

### 0.3 Authentication & Multi-Tenancy 🖥️

**What:** Secure user authentication with organization-scoped access.

**Includes:**
- Clerk integration with Organizations
- Organization context in URL (`/org/{slug}/...`)
- Sign in / Sign up flows with org selection
- Protected route middleware
- Role-based access control per organization (Owner, Admin, Manager, Support, Guide)
- Session management with org context

**Roles & Permissions:**

| Role | Access Level |
|------|--------------|
| Owner | Full access including billing |
| Admin | Full operational access |
| Manager | Bookings, schedules, customers, guides |
| Support | View and modify bookings/customers |
| Guide | Own schedules and manifests only |

**Done When:**
- [ ] Users can sign up and sign in
- [ ] Protected routes redirect unauthenticated users
- [ ] Roles are enforced on API routes
- [ ] Session persists across page reloads

---

### 0.4 CI/CD Pipeline

**What:** Automated testing and deployment.

**Includes:**
- GitHub Actions workflow
- Linting and type checking
- Unit test runner
- Preview deployments on PRs
- Production deployment on main

**Done When:**
- [ ] PRs trigger checks automatically
- [ ] Preview URLs generated for PRs
- [ ] Main branch deploys to production

---

### 0.5 Monitoring & Error Tracking

**What:** Observability from day one.

**Includes:**
- Sentry integration for error tracking
- Basic logging infrastructure
- Performance monitoring setup

**Done When:**
- [ ] Errors captured and reported in Sentry
- [ ] Can view error details and stack traces

---

## Phase 1: Core Booking Engine

**Duration:** 3 weeks
**Goal:** End-to-end booking flow working with high-conversion foundation

This is the heart of the system. A customer can browse tours, select a time, and complete a booking with payment. **Critical:** Even in Phase 1, we build conversion optimization into the foundation—not as an afterthought.

### Conversion Foundation (Built Into Phase 1)

Every feature in Phase 1 includes conversion-optimized implementation:

| Feature | Conversion Element |
|---------|-------------------|
| Tour Listing | Urgency indicators, social proof badges |
| Tour Detail | Trust signals, scarcity messaging |
| Availability | Real-time spots remaining |
| Checkout | Progress indicator, express payment |
| Confirmation | Share buttons, referral hooks |

---

### 1.1 Tour Management

#### 1.1.1 Tour CRUD

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to create and manage tours so that customers can book our experiences.

**Acceptance Criteria:**
- [ ] Create new tour with all required fields
- [ ] Save as draft before publishing
- [ ] Edit existing tours
- [ ] Duplicate tour as template
- [ ] Preview tour as customer sees it
- [ ] Archive tours (hide but preserve data)
- [ ] Delete tours (only if no bookings exist)

**Tour Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Name | Text | Yes | 3-100 chars |
| Slug | Text | Auto | URL-safe, unique |
| Short Description | Text | Yes | 10-200 chars |
| Full Description | Rich Text | Yes | Min 100 chars |
| Category | Select | Yes | Predefined list |
| Default Duration | Minutes | Yes | 15-720 |
| Default Capacity | Number | Yes | 1-100 |
| Min Participants | Number | Yes | 1 to capacity |
| Meeting Point Name | Text | Yes | Location name |
| Meeting Point Address | Text | Yes | Full address |
| Meeting Point Coords | Lat/Lng | Yes | Map picker |
| Meeting Instructions | Text | No | Max 500 chars |
| End Point | Location | No | If different from start |
| Cover Image | Image | Yes | Primary display image |
| Gallery | Images | No | Up to 10 images |
| Tags | Multi-select | No | Freeform |
| Status | Select | Yes | Draft/Active/Archived |
| Meta Title | Text | No | SEO, max 60 chars |
| Meta Description | Text | No | SEO, max 160 chars |
| **Inclusions** | List | Yes | What's included |
| **Exclusions** | List | No | What's not included |
| **Highlights** | List | Yes | Key selling points (3-5) |
| **Requirements** | Text | No | Physical requirements, age limits |
| **Accessibility Info** | Text | No | Wheelchair access, etc. |
| **Difficulty Level** | Select | No | Easy/Moderate/Challenging |
| **Languages Offered** | Multi-select | Yes | Tour languages |
| **Cancellation Policy** | Select | Yes | Link to policy |

**Categories:**
- Walking
- Food & Culinary
- Cultural & History
- Adventure
- Nature & Wildlife
- Photography
- Private/Exclusive
- Custom/Bespoke

---

#### 1.1.2 Tour Variants

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to create variants of tours (private vs group, morning vs afternoon) so that I can offer different options.

**Acceptance Criteria:**
- [ ] Add multiple variants per tour
- [ ] Override duration, capacity, min participants per variant
- [ ] Set availability pattern per variant
- [ ] Set default pricing tier per variant
- [ ] Reorder variants (display order)
- [ ] Activate/deactivate variants
- [ ] At least one active variant required for tour to be bookable

**Variant Fields:**

| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Duration Override | Minutes | No |
| Capacity Override | Number | No |
| Min Participants Override | Number | No |
| Availability Pattern | Complex | Yes |
| Default Pricing Tier | Select | No |
| Status | Active/Inactive | Yes |
| Sort Order | Number | Yes |

**Availability Pattern Types:**

**Recurring:**
```json
{
  "type": "recurring",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "startTimes": ["09:00", "14:00"],
  "validFrom": "2025-01-01",
  "validUntil": "2025-12-31",
  "excludedDates": ["2025-12-25"]
}
```

**Specific Dates:**
```json
{
  "type": "specific_dates",
  "dates": ["2025-06-15", "2025-06-22"],
  "startTimes": ["10:00"]
}
```

**On Request:**
```json
{
  "type": "on_request"
}
```

---

#### 1.1.3 Tour Media Management

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to upload and manage tour images so customers can see what to expect.

**Acceptance Criteria:**
- [ ] Drag-and-drop image upload
- [ ] Automatic optimization and resizing
- [ ] Set cover image
- [ ] Reorder gallery images
- [ ] Add alt text for accessibility
- [ ] Delete with confirmation
- [ ] Progress indicator during upload

**Image Processing:**
- Auto-convert to WebP
- Generate sizes: 400px, 800px, 1200px
- Strip EXIF data
- Max upload: 5MB per image
- Store in Supabase Storage with built-in CDN

---

#### 1.1.4 Pricing Tiers

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to set different prices for different customer types (adult, child, senior).

**Acceptance Criteria:**
- [ ] Create multiple tiers per tour/variant
- [ ] Set base price per tier
- [ ] Define age ranges (optional)
- [ ] Set validity dates (optional)
- [ ] Mark one tier as default
- [ ] Reorder tiers
- [ ] Activate/deactivate tiers

**Common Tiers:**

| Tier | Age Range | Notes |
|------|-----------|-------|
| Adult | 13+ | Base price |
| Child | 5-12 | Typically 30-50% off |
| Infant | 0-4 | Often free |
| Senior | 65+ | Typically 10-15% off |
| Student | Any | With valid ID |

---

### 1.2 Schedule Management

#### 1.2.1 Manual Schedule Creation

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to create specific tour schedules so customers can book them.

**Acceptance Criteria:**
- [ ] Select tour and variant
- [ ] Pick date(s) - single or multiple
- [ ] Set start time
- [ ] End time auto-calculated from duration
- [ ] Override capacity if needed
- [ ] Optionally assign guide
- [ ] Add internal notes
- [ ] Add customer-facing special instructions
- [ ] Bulk create for multiple dates

**Business Rules:**
- Cannot create in the past
- Cannot create duplicate (same tour/variant/date/time)
- Capacity must be >= minimum participants
- Guide must be qualified for the tour (if assigning)
- Warning shown if guide has scheduling conflict

---

#### 1.2.2 Automatic Schedule Generation

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to auto-generate schedules from patterns so I don't create each manually.

**Acceptance Criteria:**
- [ ] Select variant with recurring pattern
- [ ] Set date range for generation
- [ ] Preview schedules to be created
- [ ] Skip dates that already have schedules
- [ ] Skip blackout dates automatically
- [ ] Confirm before creating
- [ ] Show summary of created schedules

---

#### 1.2.3 Schedule Calendar View

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to see schedules on a calendar so I can visualize operations.

**Acceptance Criteria:**
- [ ] Month view with schedule indicators
- [ ] Week view with time slots
- [ ] Day view with full details
- [ ] Filter by tour, variant, guide, status
- [ ] Color-coding by status
- [ ] Click schedule to view/edit
- [ ] Quick add from calendar
- [ ] Navigate between periods

**Color Codes:**
- 🟢 Green: Open, has availability
- 🟡 Yellow: Almost full (>80%)
- 🔴 Red: Full
- ⚫ Gray: Closed/Cancelled
- 🔵 Blue: Completed

---

#### 1.2.4 Schedule Status Management

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to control schedule availability and handle cancellations.

**Statuses:**

| Status | Bookable | Description |
|--------|----------|-------------|
| Open | Yes | Accepting bookings |
| Full | No | At capacity (auto-set) |
| Closed | No | Manually closed |
| Cancelled | No | Won't run |
| Completed | No | Tour finished |

**Cancellation Workflow:**
1. Show count of affected bookings
2. Options: notify customers, offer reschedule, process refunds
3. Require cancellation reason
4. Execute: update status, cancel bookings, process refunds, send emails

**Acceptance Criteria:**
- [ ] Open/close schedule manually
- [ ] Auto-close when full
- [ ] Auto-reopen when cancellation frees space
- [ ] Cancel with affected booking handling
- [ ] Mark completed after tour runs
- [ ] Audit trail of status changes

---

#### 1.2.5 Capacity Management

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to manage schedule capacity to control bookings.

**Acceptance Criteria:**
- [ ] View booked vs available
- [ ] Visual capacity indicator (progress bar)
- [ ] Increase capacity (always allowed)
- [ ] Decrease capacity (validate against current bookings)
- [ ] See list of bookings for schedule

---

### 1.3 Public Booking Flow

#### 1.3.1 Tour Listing Page

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to browse available tours so I can find one that interests me.

**Acceptance Criteria:**
- [ ] Grid view of active tours
- [ ] Tour card: image, name, short description, starting price, duration
- [ ] Filter by category, duration, price range, date availability
- [ ] Sort by: price, duration, popularity, rating
- [ ] Responsive (mobile-first)
- [ ] Loading states with skeleton UI
- [ ] Empty state if no tours
- [ ] **Infinite scroll or pagination**
- [ ] **"Flexible dates" search option**

**Conversion Elements (Required):**
- [ ] **Rating badge** on each card (★ 4.8)
- [ ] **Review count** ("124 reviews")
- [ ] **"Popular" or "Bestseller" badge** for top tours
- [ ] **"X spots left today"** urgency indicator
- [ ] **"Free cancellation"** badge where applicable
- [ ] **Starting price** with "from" prefix
- [ ] **Quick view** on hover (desktop)

---

#### 1.3.2 Tour Detail Page

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to see full tour details so I can decide if it's right for me.

**Acceptance Criteria:**
- [ ] Full description with rich formatting
- [ ] Image gallery with lightbox
- [ ] Meeting point with interactive map
- [ ] Duration and what's included/excluded
- [ ] Price breakdown by tier
- [ ] Availability calendar (inline)
- [ ] Select date and book CTA (sticky on mobile)
- [ ] Social sharing buttons
- [ ] Related/similar tours section

**Trust & Conversion Elements (Required):**
- [ ] **Aggregate rating** prominently displayed (★ 4.8 from 124 reviews)
- [ ] **Recent reviews section** (3-5 featured reviews)
- [ ] **"Booked X times in last 24 hours"** social proof
- [ ] **"X people viewing now"** live indicator
- [ ] **Highlights section** with icons (key selling points)
- [ ] **What's included** checklist with ✓ icons
- [ ] **What's not included** with clear messaging
- [ ] **Cancellation policy** clearly stated
- [ ] **"Questions? Contact us"** chat/contact link
- [ ] **Trust badges** (secure payment, verified business)
- [ ] **Photo reviews** from customers
- [ ] **FAQ accordion** for common questions
- [ ] **Sticky booking bar** on scroll (price + CTA)

**SEO Elements:**
- [ ] Structured data (Tour, Event, Offer schemas)
- [ ] Breadcrumb navigation
- [ ] Canonical URL
- [ ] Open Graph tags for social sharing

---

#### 1.3.3 Availability Display

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to see available times so I can find one that fits my schedule.

**Acceptance Criteria:**
- [ ] Calendar showing available dates
- [ ] Clear indication of sold-out dates
- [ ] Select date to see time slots
- [ ] Show remaining spots per slot
- [ ] Show price per slot (with seasonal adjustments)
- [ ] Variant selector if multiple exist
- [ ] Real-time updates (WebSocket preferred)
- [ ] **"I'm flexible" date search** (±3 days)
- [ ] **Best price indicator** across dates

**Conversion Elements (Required):**
- [ ] **Low availability warning** ("Only 2 spots left!" in red/orange)
- [ ] **Selling fast indicator** ("🔥 Selling fast")
- [ ] **Price comparison** when seasonal pricing differs
- [ ] **"Most popular time"** badge on high-demand slots
- [ ] **Instant confirmation** badge

**Display Format:**
```
January 2025

Morning (09:00)              Afternoon (14:00)
───────────────────────────────────────────
Mon 6   ✓ 8 spots  $45      ✓ 12 spots  $45
Tue 7   ✓ 5 spots  $45      ✓ 10 spots  $45  ⭐ Most Popular
Wed 8   ✓ 12 spots $45      ✗ Sold Out
Thu 9   🔥 3 spots $45      ✓ 7 spots   $45
Fri 10  ✗ Sold Out          ⚠️ 2 spots  $45  Last chance!
```

---

#### 1.3.4 Booking Form

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to enter my details and select tickets to complete my booking.

**Form Steps:**

**Step 1: Select Tickets**
- Quantity selector per pricing tier
- Running subtotal
- Validate against remaining capacity

**Step 2: Your Details**
| Field | Required | Validation |
|-------|----------|------------|
| Email | Yes | Valid email |
| First Name | Yes | 2-50 chars |
| Last Name | Yes | 2-50 chars |
| Phone | Configurable | E.164 format |

**Step 3: Additional Info**
- Special requests (textarea)
- Dietary restrictions (textarea)
- Participant names (optional toggle)

**Step 4: Promo Code**
- Enter code field
- Apply button
- Show discount if valid
- Error message if invalid

**Step 5: Review & Pay**
- Full order summary
- Terms acceptance checkbox
- Pay button

**Acceptance Criteria:**
- [ ] Step-by-step progress indicator
- [ ] Form validation with clear errors
- [ ] Maintain state if navigating back
- [ ] Mobile-optimized layout
- [ ] Accessibility compliant
- [ ] **Guest checkout** (no account required)
- [ ] **Auto-save progress** (localStorage)
- [ ] **Express checkout** (Apple Pay, Google Pay)

**Conversion Optimization (Required):**
- [ ] **Order summary sidebar** (sticky on desktop)
- [ ] **Trust badges** near payment button
- [ ] **Secure payment** messaging
- [ ] **Money-back guarantee** if applicable
- [ ] **"Free cancellation until X"** reminder
- [ ] **Estimated confirmation time** ("Instant confirmation")
- [ ] **Exit intent detection** (show offer or save cart)

---

#### 1.3.5 Pricing Calculation

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to see exactly what I'm paying with no surprises.

**Calculation Order:**
1. Base prices × quantities = Subtotal
2. Subtotal + Seasonal adjustment (if applicable)
3. Total - Promotional discount (if applicable)
4. Discounted total + Taxes
5. = Final total

**Display:**
```
Order Summary
─────────────────────────────────
2 × Adult                  $90.00
1 × Child (5-12)           $30.00
                          ────────
Subtotal                  $120.00
Peak Season (+15%)         $18.00
Promo: SUMMER20 (-20%)    -$27.60
                          ────────
Subtotal                  $110.40
Tourism Tax (5%)            $5.52
                          ────────
Total                     $115.92 USD
```

**Acceptance Criteria:**
- [ ] Real-time calculation as quantities change
- [ ] Clear line items
- [ ] Show savings from discounts
- [ ] Tax displayed separately
- [ ] Currency clearly shown

---

#### 1.3.6 Payment Processing

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to pay securely to confirm my booking.

**Payment Flow:**
1. Customer submits booking form
2. Backend validates availability (with row lock)
3. Backend creates booking (status: pending)
4. Backend creates Stripe PaymentIntent
5. Frontend renders Stripe Elements
6. Customer enters payment details
7. Stripe processes payment
8. Webhook confirms payment
9. Backend updates booking (status: confirmed)
10. Customer redirected to confirmation

**Supported Methods:**
- Credit/Debit cards
- Apple Pay
- Google Pay
- **Buy Now Pay Later** (Klarna, Affirm - Phase 2)

**Acceptance Criteria:**
- [ ] Stripe Elements integration
- [ ] PCI compliant (no card data on server)
- [ ] Clear error messages
- [ ] Loading state during processing
- [ ] Handle payment failures gracefully
- [ ] Timeout handling
- [ ] **Payment method icons** displayed
- [ ] **"Secure checkout"** badge
- [ ] **3D Secure support** for fraud prevention

**Conversion Tracking (Required):**
- [ ] Track `checkout.started` event
- [ ] Track `payment.attempted` event
- [ ] Track `payment.failed` with reason
- [ ] Track `payment.succeeded` event
- [ ] **Capture UTM parameters** for attribution
- [ ] **Device/browser info** for debugging

---

#### 1.3.7 Booking Confirmation

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want confirmation of my booking with all the details I need.

**Confirmation Page:**
```
✓ Booking Confirmed!

Reference: BK-2025-ABC123

─────────────────────────────────
Downtown Walking Tour
Saturday, January 15, 2025

Time: 09:00 AM (approx. 2 hours)

Meeting Point:
Central Plaza Fountain
123 Main Street
Look for guide with yellow umbrella

Participants: 3 (2 adults, 1 child)
─────────────────────────────────

Total Paid: $115.92 USD

Confirmation sent to john@example.com

[Add to Calendar]  [Print]  [Manage Booking]
```

**Acceptance Criteria:**
- [ ] Reference number prominently displayed
- [ ] All booking details shown
- [ ] Meeting point with clear instructions + Google Maps link
- [ ] Add to Calendar (Google, Apple, Outlook, .ics download)
- [ ] Print-friendly version
- [ ] Link to manage booking
- [ ] **Mobile ticket with QR code** for check-in
- [ ] **Share booking** buttons (WhatsApp, Email, Copy link)
- [ ] **What to bring** section
- [ ] **Weather forecast** for tour day

**Post-Booking Engagement (Required):**
- [ ] **"Book another tour"** or browse similar CTA
- [ ] **Referral program prompt** ("Share with friends, get $10 off")
- [ ] **Social share buttons** ("Share your upcoming adventure!")
- [ ] **Newsletter signup** (if not already subscribed)

**Confirmation Email Must Include:**
- [ ] QR code/mobile ticket
- [ ] Meeting point with Google Maps link
- [ ] What to bring/wear recommendations
- [ ] Cancellation policy reminder
- [ ] Contact information for questions
- [ ] Calendar attachment (.ics file)

---

### 1.4 Admin Booking Management

#### 1.4.1 Booking List

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to see all bookings so I can manage operations.

**Acceptance Criteria:**
- [ ] Paginated list of all bookings
- [ ] Search by reference, customer name, email
- [ ] Filter by: status, payment status, tour, date range
- [ ] Sort by: date, created, customer name
- [ ] Quick view key info in list
- [ ] Click to view full details
- [ ] Bulk actions (future)

**List Columns:**
- Reference
- Customer
- Tour
- Date/Time
- Participants
- Total
- Status
- Payment Status

---

#### 1.4.2 Booking Detail View

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to see full booking details so I can assist customers.

**Sections:**
- **Header:** Reference, status badges
- **Customer:** Name, email, phone, link to profile
- **Tour:** Name, date, time, variant, guide
- **Participants:** Line items with quantities
- **Pricing:** Itemized breakdown
- **Payment:** Stripe reference, payment history
- **Notes:** Special requests, dietary, internal notes
- **Activity Log:** All events chronologically

**Actions:**
- Edit booking
- Cancel booking
- Process refund
- Resend confirmation
- Add note

---

#### 1.4.3 Manual Booking Creation

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to create bookings manually for phone/walk-in customers.

**Acceptance Criteria:**
- [ ] Search existing customer or create new
- [ ] Select tour, date, time
- [ ] Select quantities per tier
- [ ] Apply manual discount if needed
- [ ] Choose payment handling:
  - Collect payment now (card)
  - Mark as paid (cash/transfer)
  - Leave unpaid (pay later)
- [ ] Send confirmation (checkbox)
- [ ] Set booking source (phone, walk-in, admin)

---

#### 1.4.4 Booking Modification

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to modify bookings to handle customer requests.

**Modifiable:**
- Date/time (if new slot available)
- Participant quantities
- Contact information
- Special requests
- Internal notes

**Price Adjustments:**
- New price > Original: Customer pays difference or record as owed
- New price < Original: Issue refund

**Acceptance Criteria:**
- [ ] Edit form with current values
- [ ] Validate availability for date changes
- [ ] Calculate price difference
- [ ] Option to collect/refund difference
- [ ] Send modification confirmation
- [ ] Audit trail of changes

---

#### 1.4.5 Booking Cancellation (Admin)

**Priority:** P0 - Critical

**User Story:**
> As an Operations Manager, I want to cancel bookings with control over refunds.

**Acceptance Criteria:**
- [ ] Cancel with reason
- [ ] Choose refund amount (full, partial, none)
- [ ] Process refund through Stripe
- [ ] Send cancellation email
- [ ] Release capacity back to schedule
- [ ] Audit trail

---

### 1.5 Customer Self-Service

#### 1.5.1 Booking Lookup

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to look up my booking to see details or make changes.

**Acceptance Criteria:**
- [ ] Enter reference number + email
- [ ] Display booking details
- [ ] Options to modify or cancel
- [ ] No account required

---

#### 1.5.2 Self-Service Cancellation

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to cancel my booking and get a refund per the policy.

**Cancellation Policy (Configurable):**

| Timing | Refund |
|--------|--------|
| 7+ days before | 100% |
| 3-7 days before | 50% |
| 24-72 hours before | 25% |
| Less than 24 hours | 0% |

**Flow:**
1. Look up booking
2. Click cancel
3. Show policy and refund amount
4. Confirm cancellation
5. Process refund
6. Show confirmation
7. Send email

**Acceptance Criteria:**
- [ ] Clear policy explanation
- [ ] Show calculated refund
- [ ] Require confirmation
- [ ] Process refund automatically
- [ ] Email confirmation

---

### 1.6 Settings (Phase 1)

#### 1.6.1 Business Settings

**Priority:** P1 - High

| Setting | Description |
|---------|-------------|
| Business Name | Displayed in emails, UI |
| Contact Email | Support email |
| Contact Phone | Support phone |
| Address | Business address |
| Logo | Brand logo for emails |
| Timezone | Default timezone |
| Currency | Default currency |

---

#### 1.6.2 Booking Settings

**Priority:** P1 - High

| Setting | Default | Description |
|---------|---------|-------------|
| Booking Window | 90 days | How far ahead can book |
| Minimum Notice | 2 hours | Minimum time before tour |
| Cancellation Policy | Tiered | Refund rules |
| Require Phone | No | Phone required at checkout |
| Terms URL | Required | Link to T&C |

---

#### 1.6.3 Payment Settings

**Priority:** P0 - Critical

| Setting | Description |
|---------|-------------|
| Stripe Account | Connect Stripe |
| Currency | Payment currency |
| Apple Pay | Enable/disable |
| Google Pay | Enable/disable |

---

#### 1.6.4 Tax Configuration

**Priority:** P1 - High

**Acceptance Criteria:**
- [ ] Add tax rates (name, percentage)
- [ ] Set which tours are taxable
- [ ] Configure tax-inclusive or tax-exclusive display

---

## Phase 2: Customer & Communications

**Duration:** 2 weeks
**Goal:** CRM functionality, automated communications, and conversion recovery

---

### 2.0 Conversion Recovery & Re-engagement (Critical)

These features are **essential for high conversion** and should be built early in Phase 2.

#### 2.0.1 Abandoned Cart Recovery

**Priority:** P0 - Critical

**User Story:**
> As a Business Owner, I want to automatically recover customers who started but didn't complete bookings.

**Tracking Requirements:**
- [ ] Capture checkout start (email collected)
- [ ] Store cart state (tour, date, participants, price)
- [ ] Track last step reached
- [ ] Calculate cart value

**Automated Recovery Sequence:**

| Timing | Channel | Content |
|--------|---------|---------|
| 15 minutes | Email | "You left something behind" + cart contents |
| 24 hours | Email | "Still interested?" + limited-time offer (optional) |
| 72 hours | Email | "Last chance" + urgency messaging |
| 15 minutes | SMS (if opted in) | "Complete your booking" + link |

**Email #1 Content (15 min):**
- Tour name and image
- Selected date/time
- Total price
- "Complete your booking" CTA
- Meeting point preview

**Email #2 Content (24h):**
- Above + "spots are filling up" (if true)
- Optional discount code (configurable)
- Customer support contact

**Email #3 Content (72h):**
- Final reminder
- Show what they'll miss (highlights)
- Alternative dates if original sold out

**Acceptance Criteria:**
- [ ] Abandoned carts tracked in database
- [ ] Inngest workflows for timed emails
- [ ] Unique recovery links (one-click resume)
- [ ] Stop sequence if booking completed
- [ ] Track recovery conversions
- [ ] A/B test email subject lines
- [ ] Dashboard showing recovery rate

**Metrics to Track:**
- Cart abandonment rate
- Recovery email open rate
- Recovery conversion rate
- Revenue recovered

---

#### 2.0.2 Browse Abandonment

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want to re-engage visitors who viewed tours but didn't book.

**Trigger:** Identified visitor (has email from previous booking) views tour but leaves.

**Sequence:**
| Timing | Content |
|--------|---------|
| 4 hours | "Still thinking about [Tour Name]?" |
| 3 days | "Tours filling up for [dates they viewed]" |

**Acceptance Criteria:**
- [ ] Track page views for identified users
- [ ] Trigger browse abandonment for tours viewed 2+ times
- [ ] Personalize with viewed tour content
- [ ] Respect email frequency limits

---

#### 2.0.3 Wishlist / Save for Later

**Priority:** P1 - High

**User Story:**
> As a Customer, I want to save tours I'm interested in so I can book later.

**Acceptance Criteria:**
- [ ] "Save" button on tour cards and detail pages
- [ ] Heart icon toggle (visual feedback)
- [ ] Works without account (cookie/localStorage)
- [ ] Prompts for email to save across devices
- [ ] Wishlist page to view saved tours
- [ ] **Price drop alerts** for wishlisted tours
- [ ] **Availability alerts** when dates open up
- [ ] Weekly digest of wishlisted tours

---

#### 2.0.4 Price Drop Alerts

**Priority:** P2 - Medium

**User Story:**
> As a Customer, I want to be notified when a tour I'm interested in goes on sale.

**Acceptance Criteria:**
- [ ] Track tours customers are interested in
- [ ] Detect promotional pricing or seasonal drops
- [ ] Send immediate email when price drops
- [ ] Include new price vs old price
- [ ] Direct link to book

---

#### 2.0.5 Back-in-Stock / Availability Alerts

**Priority:** P1 - High

**User Story:**
> As a Customer, I want to be notified when a sold-out tour has availability.

**Trigger Points:**
- Customer tried to book sold-out date
- Customer explicitly requested notification

**Acceptance Criteria:**
- [ ] "Notify me" button on sold-out dates
- [ ] Collect email (or use existing)
- [ ] Immediate notification when spots open
- [ ] First-come-first-served priority booking link
- [ ] Auto-expire notification requests after date passes

---

### 2.1 Customer Management

#### 2.1.1 Customer List

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to search and browse customers to find and manage records.

**Acceptance Criteria:**
- [ ] Paginated list
- [ ] Search by name, email, phone
- [ ] Filter by source, tags, last activity
- [ ] Sort by name, bookings, spend, activity
- [ ] Quick stats (total customers, new this month)
- [ ] Export to CSV

**List Columns:**
- Name
- Email
- Phone
- Bookings (count)
- Total Spent
- Last Activity
- Source

---

#### 2.1.2 Customer Profile

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to see complete customer history to provide personalized service.

**Profile Sections:**

**Overview:**
- Contact info
- Customer since date
- Total bookings
- Total spent
- Source
- Tags

**Booking History:**
- All bookings (with status, dates, amounts)
- Link to each booking detail

**Communication History:**
- All emails/SMS sent
- Delivery status
- Opens/clicks

**Notes:**
- Timestamped notes by staff
- Pin important notes

**Preferences:**
- Language
- Currency
- Marketing consent

**Actions:**
- Edit profile
- Send email
- Add note
- Add tag

---

#### 2.1.3 Customer Edit

**Priority:** P1 - High

**Acceptance Criteria:**
- [ ] Edit contact information
- [ ] Update preferences
- [ ] Manage tags
- [ ] Update marketing consent
- [ ] View/edit notes

---

#### 2.1.4 Customer Notes

**Priority:** P2 - Medium

**Acceptance Criteria:**
- [ ] Add timestamped notes
- [ ] Notes attributed to staff member
- [ ] Edit own notes
- [ ] Delete notes (with permission)
- [ ] Pin important notes

---

#### 2.1.5 Customer Tags

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to tag customers for segmentation.

**Default Tags:**
- VIP
- Repeat Customer
- Travel Agent
- Corporate
- Requires Assistance

**Acceptance Criteria:**
- [ ] Create custom tags
- [ ] Apply multiple tags
- [ ] Filter by tags
- [ ] Bulk tag operations
- [ ] Tag colors

---

#### 2.1.6 Customer Data Export (GDPR)

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to export customer data for GDPR compliance.

**Acceptance Criteria:**
- [ ] Export single customer's complete data
- [ ] JSON format (machine-readable)
- [ ] PDF format (human-readable)
- [ ] Include: profile, bookings, communications
- [ ] Audit log of exports

---

### 2.2 Email Communications

#### 2.2.1 Email Templates

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want email templates for consistent communication.

**System Templates:**

| Template | Trigger |
|----------|---------|
| Booking Confirmation | After payment |
| Booking Reminder | 24h before tour |
| Booking Modification | After changes |
| Booking Cancellation | After cancellation |
| Review Request | 24h after tour |
| Schedule Cancellation | When tour cancelled |

**Template Variables:**
```
{{customer.firstName}}
{{customer.lastName}}
{{booking.reference}}
{{booking.total}}
{{tour.name}}
{{schedule.date}}
{{schedule.time}}
{{schedule.meetingPoint}}
{{links.manageBooking}}
{{links.addToCalendar}}
```

**Acceptance Criteria:**
- [ ] View all templates
- [ ] Edit template content
- [ ] Preview with sample data
- [ ] Reset to default
- [ ] HTML and plain text

---

#### 2.2.2 Automated Emails

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want automatic emails so customers receive timely info.

**Automations:**

| Automation | Default | Timing |
|------------|---------|--------|
| Booking Confirmation | On | Immediate |
| Booking Reminder | On | 24h before |
| Review Request | On | 24h after |
| Second Reminder | Off | 2h before |

**Acceptance Criteria:**
- [ ] Configure which automations are active
- [ ] Set timing for each
- [ ] Preview what will be sent
- [ ] Disable for specific bookings
- [ ] View send history

---

#### 2.2.3 Manual Email

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to send custom emails to customers.

**Acceptance Criteria:**
- [ ] Compose from customer profile or booking
- [ ] Use template as starting point
- [ ] Rich text editor
- [ ] Preview before send
- [ ] Track in communication history

---

### 2.3 SMS Communications

#### 2.3.1 SMS Setup

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to send SMS confirmations and reminders.

**Acceptance Criteria:**
- [ ] Twilio integration
- [ ] Configure sender number
- [ ] SMS templates (shorter versions)
- [ ] Opt-out handling

---

#### 2.3.2 Automated SMS

**Priority:** P1 - High

**Automations:**

| Automation | Default | Timing |
|------------|---------|--------|
| Booking Confirmation | On | Immediate |
| Booking Reminder | On | 24h before |

**Acceptance Criteria:**
- [ ] Only send if phone provided
- [ ] Respect opt-out
- [ ] Track delivery status

---

### 2.4 Communication History

#### 2.4.1 Communication Log

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to see all communications with a customer.

**Display on:**
- Customer profile
- Booking detail

**Information:**
- Channel (email/SMS)
- Type (confirmation, reminder, etc.)
- Status (sent, delivered, opened, failed)
- Timestamp
- Preview of content

**Status Icons:**
- ⏳ Pending
- ✓ Sent
- ✓✓ Delivered
- 👁️ Opened
- 🔗 Clicked
- ❌ Failed
- ↩️ Bounced

---

## Phase 3: Guide Operations

**Duration:** 2 weeks
**Goal:** Guide management, scheduling, and operational tools

---

### 3.1 Guide Management

#### 3.1.1 Guide Profiles

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to manage guide profiles so I know who can lead which tours.

**Profile Fields:**

| Field | Type | Required |
|-------|------|----------|
| First Name | Text | Yes |
| Last Name | Text | Yes |
| Email | Email | Yes |
| Phone | Phone | Yes |
| Photo | Image | No |
| Bio | Text | No |
| Languages | Multi-select | Yes |
| Certifications | List | No |
| Status | Active/Inactive/On Leave | Yes |

**Acceptance Criteria:**
- [ ] Create guide profile
- [ ] Upload photo
- [ ] Set languages spoken
- [ ] Add certifications with expiry dates
- [ ] Link to user account (optional)
- [ ] Set status
- [ ] View assigned tours

---

#### 3.1.2 Guide-Tour Qualifications

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to specify which guides can lead which tours.

**Acceptance Criteria:**
- [ ] Assign guides to tours they can lead
- [ ] Mark primary guide per tour
- [ ] Only qualified guides shown when assigning to schedules
- [ ] Bulk assignment

---

#### 3.1.3 Guide Availability

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to manage guide availability to know who's free.

**Acceptance Criteria:**
- [ ] Set default weekly availability
- [ ] Override for specific dates
- [ ] Block out vacation/leave periods
- [ ] View availability calendar
- [ ] Availability shown when assigning to schedules

**Weekly Availability:**
```
         Mon  Tue  Wed  Thu  Fri  Sat  Sun
06:00    ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░
09:00    ███  ███  ███  ███  ███  ███  ░░░
12:00    ███  ███  ███  ███  ███  ███  ░░░
15:00    ███  ░░░  ███  ░░░  ███  ░░░  ░░░
18:00    ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░

█ Available  ░ Unavailable
```

---

### 3.2 Schedule Assignment

#### 3.2.1 Assign Guide to Schedule

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to assign guides to schedules so I know who's leading each tour.

**Acceptance Criteria:**
- [ ] Assign from qualified guides
- [ ] See guide availability when assigning
- [ ] Warning if schedule conflict
- [ ] Notify guide when assigned
- [ ] Unassign if needed

**Assignment States:**
- Unassigned
- Pending (awaiting guide confirmation)
- Confirmed
- Declined (needs reassignment)

---

#### 3.2.2 Guide Notifications

**Priority:** P1 - High

**User Story:**
> As a Guide, I want to be notified when assigned to a tour.

**Acceptance Criteria:**
- [ ] Email notification on assignment
- [ ] Include tour details and date
- [ ] Link to confirm/decline
- [ ] Reminder if pending too long

---

#### 3.2.3 Guide Calendar (Admin View)

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to see all guide schedules on a calendar.

**Acceptance Criteria:**
- [ ] View all guides' assignments
- [ ] Filter by specific guide
- [ ] Color-code by guide
- [ ] See assignment status
- [ ] Click to view/edit
- [ ] Identify conflicts

---

### 3.3 Guide Portal

#### 3.3.1 Guide Login

**Priority:** P2 - Medium

**User Story:**
> As a Guide, I want simple access to my schedule without complex login.

**Acceptance Criteria:**
- [ ] Magic link login (email)
- [ ] Or link to full account if they have one
- [ ] Session persists for convenience
- [ ] Only see own data

---

#### 3.3.2 Guide Dashboard

**Priority:** P2 - Medium

**User Story:**
> As a Guide, I want to see my upcoming tours at a glance.

**Display:**
```
Welcome, Maria!

Today's Tours
─────────────────────────────
09:00  Downtown Walking Tour
       12 participants | Central Plaza
       [View Manifest]

14:00  Food Tour
       8 participants | Market Square
       [View Manifest]

This Week
─────────────────────────────
Tomorrow: Photography Tour (6 pax)
Friday: 2 tours scheduled
```

---

#### 3.3.3 Tour Manifest

**Priority:** P1 - High

**User Story:**
> As a Guide, I want to see who's on my tour with their details.

**Manifest Contents:**
- Tour name and details
- Date and time
- Meeting point with address
- Duration
- Special instructions
- Participant list:
  - Name
  - Email
  - Phone
  - Party size
  - Special requests
  - Dietary restrictions

**Acceptance Criteria:**
- [ ] View manifest for any assigned tour
- [ ] Print-friendly version
- [ ] PDF download
- [ ] Contact info visible
- [ ] Special needs highlighted

---

#### 3.3.4 Confirm/Decline Assignment

**Priority:** P2 - Medium

**User Story:**
> As a Guide, I want to confirm or decline tour assignments.

**Acceptance Criteria:**
- [ ] View pending assignments
- [ ] Confirm availability
- [ ] Decline with reason
- [ ] Decline triggers notification to admin

---

#### 3.3.5 Mark Tour Complete

**Priority:** P2 - Medium

**User Story:**
> As a Guide, I want to mark tours as completed.

**Acceptance Criteria:**
- [ ] Mark tour complete from manifest
- [ ] Note any no-shows
- [ ] Add tour notes (optional)
- [ ] Triggers review request to customers

---

### 3.4 Manifests & Rosters

#### 3.4.1 Daily Manifest (Admin)

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to generate daily manifests for all tours.

**Acceptance Criteria:**
- [ ] View all tours for a date
- [ ] Print all manifests
- [ ] PDF download
- [ ] Email to guides

---

#### 3.4.2 Manifest PDF Export

**Priority:** P1 - High

**Acceptance Criteria:**
- [ ] Clean, professional layout
- [ ] Company branding
- [ ] QR code linking to digital version
- [ ] Print-optimized

---

## Phase 4: Pricing & Promotions

**Duration:** 2 weeks
**Goal:** Advanced pricing, promotions, and discounts

---

### 4.1 Advanced Pricing

#### 4.1.1 Seasonal Pricing

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to adjust prices for peak seasons.

**Configuration:**
```
Peak Summer
───────────────────────
Dates: June 15 - Aug 31
Adjustment: +20%
Applies to: All tours
Priority: 1

Holiday Week
───────────────────────
Dates: Dec 20 - Jan 2
Adjustment: +$10 fixed
Applies to: All tours
Priority: 2
```

**Acceptance Criteria:**
- [ ] Define seasons with date ranges
- [ ] Set percentage or fixed adjustment
- [ ] Apply to all or specific tours
- [ ] Handle overlapping seasons (priority)
- [ ] Preview affected prices

---

#### 4.1.2 Group Discounts

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want automatic discounts for larger groups.

**Configuration:**

| Group Size | Discount |
|------------|----------|
| 5-9 | 5% |
| 10-14 | 10% |
| 15+ | 15% |

**Acceptance Criteria:**
- [ ] Configure thresholds and discounts
- [ ] Auto-apply at checkout
- [ ] Show savings to customer
- [ ] Works with other discounts (configurable stacking)

---

#### 4.1.3 Early Bird Discounts

**Priority:** P3 - Low

**User Story:**
> As an Operations Manager, I want to offer discounts for advance bookings.

**Configuration:**

| Advance Booking | Discount |
|-----------------|----------|
| 30+ days | 15% |
| 14-29 days | 10% |
| 7-13 days | 5% |

**Acceptance Criteria:**
- [ ] Configure advance periods
- [ ] Auto-apply at checkout
- [ ] Show deadline to customer

---

### 4.2 Promotional Codes

#### 4.2.1 Create Promo Code

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want to create promo codes for marketing campaigns.

**Code Fields:**

| Field | Description |
|-------|-------------|
| Code | Unique identifier (SUMMER25) |
| Discount Type | Percentage or fixed |
| Discount Value | Amount (25% or $10) |
| Valid From | Start date |
| Valid Until | End date |
| Max Uses | Total limit |
| Max Per Customer | Per customer limit |
| Min Booking | Minimum spend |
| Applicable Tours | All or specific |

**Acceptance Criteria:**
- [ ] Create codes with all options
- [ ] Generate random codes
- [ ] Copy code for sharing
- [ ] Preview discount

---

#### 4.2.2 Promo Code Management

**Priority:** P1 - High

**Acceptance Criteria:**
- [ ] List all codes
- [ ] Filter by status (active/expired/inactive)
- [ ] Edit existing codes
- [ ] Deactivate codes
- [ ] View usage statistics

---

#### 4.2.3 Promo Code Reporting

**Priority:** P2 - Medium

**Metrics:**
- Usage count
- Revenue generated
- Total discount given
- Average discount per booking
- Top tours using code

---

### 4.3 Future Pricing Features

#### 4.3.1 Deposit/Partial Payment

**Priority:** P3 - Low

**User Story:**
> As a Customer, I want to pay a deposit now and the rest later.

**Acceptance Criteria:**
- [ ] Configure deposit percentage/amount per tour
- [ ] Collect deposit at checkout
- [ ] Schedule balance collection
- [ ] Send balance due reminder
- [ ] Handle balance payment

---

#### 4.3.2 Gift Cards/Vouchers

**Priority:** P3 - Low

**User Story:**
> As a Customer, I want to buy gift cards for others.

**Acceptance Criteria:**
- [ ] Purchase gift card
- [ ] Email delivery to recipient
- [ ] Redeem at checkout
- [ ] Track balance
- [ ] Expiration handling

---

## Phase 5: Reporting & Analytics

**Duration:** 2 weeks
**Goal:** Dashboard, reports, and business insights

---

### 5.1 Dashboard

#### 5.1.1 Operations Dashboard

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want a dashboard showing today's operations.

**Widgets:**

**Today's Tours:**
- Tours scheduled
- Total participants
- Guides working
- List of upcoming with status

**Recent Activity:**
- New bookings
- Cancellations
- Payments received
- Guide confirmations

**Acceptance Criteria:**
- [ ] Real-time or near-real-time updates
- [ ] Click through to details
- [ ] Quick actions (view manifest, etc.)

---

#### 5.1.2 Business Dashboard

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want a dashboard showing business health.

**Widgets:**

**Revenue:**
- Today's revenue
- This week/month
- Comparison to previous period
- Trend chart

**Bookings:**
- New bookings today
- This week/month
- Conversion funnel (future)

**Capacity:**
- Utilization this week
- Sell-through rate

**Acceptance Criteria:**
- [ ] Key metrics at a glance
- [ ] Trend indicators (up/down)
- [ ] Date range selector
- [ ] Export data

---

### 5.2 Reports

#### 5.2.1 Revenue Report

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want revenue reports to understand financial performance.

**Dimensions:**
- By period (day/week/month/year)
- By tour
- By source
- By payment method

**Metrics:**
- Gross revenue
- Refunds
- Net revenue
- Average booking value
- Comparison to previous period

**Acceptance Criteria:**
- [ ] Date range selector
- [ ] Multiple dimensions
- [ ] Chart visualization
- [ ] Table with details
- [ ] Export CSV/PDF

---

#### 5.2.2 Booking Report

**Priority:** P1 - High

**User Story:**
> As an Operations Manager, I want booking reports to understand patterns.

**Metrics:**
- Booking count
- Participant count
- Average party size
- Average lead time (booking to tour)
- Cancellation rate
- No-show rate

**Dimensions:**
- By tour
- By source
- By date

---

#### 5.2.3 Capacity Utilization Report

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to see capacity utilization to optimize scheduling.

**Metrics:**
- Utilization % by tour
- Utilization by day of week
- Utilization by time of day

**Recommendations:**
- Identify underperforming schedules
- Suggest capacity adjustments

---

#### 5.2.4 Customer Report

**Priority:** P2 - Medium

**Metrics:**
- New customers
- Repeat customer rate
- Customer acquisition by source
- Customer lifetime value (CLV)
- Geographic distribution

---

#### 5.2.5 Guide Report

**Priority:** P3 - Low

**Metrics:**
- Tours led
- Participants served
- Reliability (no cancellations)
- Customer ratings (if collected)

---

### 5.3 Analytics & Insights

#### 5.3.1 Booking Trends

**Priority:** P2 - Medium

**Visualizations:**
- Bookings over time
- Revenue over time
- Seasonality patterns
- Day-of-week patterns

---

#### 5.3.2 Source Attribution

**Priority:** P2 - Medium

**User Story:**
> As a Business Owner, I want to know which channels drive bookings.

**Tracking:**
- UTM parameters
- Referrer
- Direct vs organic vs paid
- Promo code attribution

---

### 5.4 CRM Intelligence & Automation (Cutting-Edge)

These features differentiate from basic CRMs and enable data-driven operations.

#### 5.4.1 Customer Scoring & Segmentation

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want customers automatically scored and segmented to prioritize high-value relationships.

**Customer Score Components:**

| Factor | Weight | Criteria |
|--------|--------|----------|
| Lifetime Value | 30% | Total spend to date |
| Booking Frequency | 25% | Bookings per year |
| Recency | 20% | Days since last booking |
| Engagement | 15% | Email opens, site visits |
| Referrals | 10% | Friends referred |

**Automatic Segments:**
- **VIP** (Score 80+): High value, frequent booker
- **Loyal** (Score 60-79): Regular customer, good value
- **Promising** (Score 40-59): Growing relationship
- **At Risk** (Score 20-39): Was active, declining engagement
- **Dormant** (Score <20): No recent activity

**Acceptance Criteria:**
- [ ] Automatic score calculation (nightly job)
- [ ] Segment assignment based on score
- [ ] Segment history tracking
- [ ] Custom segment rules
- [ ] Segment-based email targeting
- [ ] Dashboard widget showing segment distribution

---

#### 5.4.2 Customer Lifetime Value (CLV) Prediction

**Priority:** P2 - Medium

**User Story:**
> As a Business Owner, I want to predict customer lifetime value to inform acquisition spending.

**CLV Model Inputs:**
- Historical booking patterns
- Average order value
- Booking frequency
- Customer acquisition source
- Engagement metrics

**Display:**
- Predicted 12-month CLV
- Historical CLV
- CLV by acquisition channel
- CLV trends over time

**Acceptance Criteria:**
- [ ] Calculate historical CLV per customer
- [ ] Simple predictive model (based on similar customer behavior)
- [ ] CLV displayed on customer profile
- [ ] CLV in customer list (sortable)
- [ ] CLV by source in reports

---

#### 5.4.3 Predictive No-Show Detection

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to identify high-risk bookings so I can proactively confirm attendance.

**Risk Factors:**
- Previous no-shows
- Last-minute booking
- No email opens/confirmations
- Payment status
- Party size
- Lead time (very long or very short)

**Risk Actions:**
- [ ] Flag high-risk bookings in list
- [ ] Trigger extra confirmation SMS/call
- [ ] Suggest overbooking for high-risk schedules

**Acceptance Criteria:**
- [ ] Risk score per booking (Low/Medium/High)
- [ ] Visual indicator on booking list
- [ ] Automated outreach workflow for high risk
- [ ] Track actual no-show rate vs predicted

---

#### 5.4.4 Demand Forecasting

**Priority:** P3 - Low (Phase 7+)

**User Story:**
> As an Operations Manager, I want to predict demand to optimize scheduling and pricing.

**Forecast Based On:**
- Historical booking patterns
- Seasonality
- Day of week
- Local events (manual input)
- Weather (API integration)

**Outputs:**
- Predicted bookings by tour/date
- Suggested capacity adjustments
- Dynamic pricing recommendations
- Guide staffing suggestions

---

#### 5.4.5 Automated Re-engagement Campaigns

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want automatic campaigns to re-engage lapsed customers.

**Trigger Campaigns:**

| Segment | Trigger | Action |
|---------|---------|--------|
| At Risk | 60 days since booking | "We miss you" email |
| Dormant | 120 days since booking | Win-back offer |
| Post-Tour | 1 day after | Review request |
| Post-Tour | 14 days after | "Book again" with similar tours |
| Birthday | On birthday (if known) | Birthday discount |
| Anniversary | 1 year since first booking | Loyalty thank you |

**Acceptance Criteria:**
- [ ] Configurable trigger conditions
- [ ] Email template per campaign
- [ ] A/B testing for subject lines
- [ ] Campaign performance tracking
- [ ] Suppression rules (frequency limits)
- [ ] Opt-out handling

---

#### 5.4.6 Revenue Attribution Dashboard

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want to understand which marketing channels actually drive revenue, not just traffic.

**Attribution Models:**
- First touch (acquisition source)
- Last touch (booking source)
- Linear (equal credit across touchpoints)

**Tracked Channels:**
- Organic Search
- Paid Search (Google Ads)
- Social (Facebook, Instagram)
- Email Marketing
- Referral/Affiliate
- OTA (Viator, GetYourGuide)
- Direct

**Dashboard Metrics:**
- Revenue by channel
- ROI by channel (if spend data provided)
- Conversion rate by channel
- Average order value by channel
- Customer quality by channel (repeat rate, CLV)

**Acceptance Criteria:**
- [ ] UTM parameter capture on all bookings
- [ ] Attribution model selection
- [ ] Revenue attribution dashboard
- [ ] Channel comparison charts
- [ ] Export data for external analysis

---

#### 5.4.7 Operational Efficiency Metrics

**Priority:** P2 - Medium

**User Story:**
> As a Business Owner, I want to understand operational efficiency to optimize resources.

**Metrics:**
- **Tour Profitability**: Revenue - (Guide cost + overhead) per tour
- **Guide Utilization**: Hours worked vs hours available
- **Capacity Utilization**: Booked spots vs available spots
- **Schedule Efficiency**: Tours at optimal capacity vs undersold
- **Cancellation Cost**: Lost revenue from cancellations
- **No-Show Rate**: By tour, day of week, booking source

**Recommendations:**
- Tours to discontinue (consistently undersold)
- Time slots to adjust (low utilization patterns)
- Guides to prioritize (high performer identification)
- Capacity adjustments (increase/decrease based on demand)

---

### 5.5 Conversion Analytics (Web App)

#### 5.5.1 Conversion Funnel Dashboard

**Priority:** P0 - Critical

**User Story:**
> As a Business Owner, I want to see where customers drop off in the booking flow.

**Funnel Stages:**
1. Site Visit
2. Tour View
3. Availability Check
4. Add to Cart / Start Checkout
5. Contact Info Entered
6. Payment Initiated
7. Payment Completed

**Metrics Per Stage:**
- Visitor count
- Drop-off rate
- Conversion to next stage
- Time spent at stage
- Segment by device/source

**Acceptance Criteria:**
- [ ] Visual funnel chart
- [ ] Click to drill into drop-off details
- [ ] Compare periods
- [ ] Segment by traffic source
- [ ] Segment by device type
- [ ] Alerts for unusual drop-off spikes

---

#### 5.5.2 A/B Testing Framework

**Priority:** P2 - Medium (Phase 7+)

**User Story:**
> As a Business Owner, I want to test different experiences to optimize conversion.

**Test Types:**
- Pricing display
- CTA button text/color
- Page layouts
- Email subject lines
- Checkout flow variants

**Acceptance Criteria:**
- [ ] Create experiment with variants
- [ ] Traffic allocation
- [ ] Statistical significance calculation
- [ ] Auto-winner declaration
- [ ] Integration with analytics

---

## Phase 6: Polish & Optimization

**Duration:** 2 weeks
**Goal:** Production-ready quality, performance, and UX

---

### 6.1 Performance

#### 6.1.1 Query Optimization

- Analyze slow queries
- Add necessary indexes
- Implement query caching
- Optimize N+1 queries

#### 6.1.2 Frontend Performance

- Bundle size analysis
- Code splitting
- Image optimization
- Core Web Vitals optimization

#### 6.1.3 Caching

- Redis for availability caching
- API response caching
- Static page caching

---

### 6.2 UX Improvements

#### 6.2.1 Loading States

- Skeleton loaders
- Progress indicators
- Optimistic updates

#### 6.2.2 Error Handling

- User-friendly error messages
- Retry mechanisms
- Fallback UI

#### 6.2.3 Mobile Optimization

- Responsive design audit
- Touch interactions
- Mobile-specific UX

#### 6.2.4 Accessibility

- WCAG 2.1 AA audit
- Keyboard navigation
- Screen reader testing
- Color contrast

---

### 6.3 Testing

#### 6.3.1 Unit Tests

- Critical business logic
- Price calculations
- Availability checks

#### 6.3.2 Integration Tests

- API endpoints
- Database operations
- External service mocks

#### 6.3.3 E2E Tests (Playwright)

- Booking flow
- Admin workflows
- Payment flow (Stripe test mode)

#### 6.3.4 Load Testing

- Concurrent bookings
- API throughput
- Database performance

---

### 6.4 Additional Features

#### 6.4.1 Global Search

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want to quickly find anything in the system.

**Search Scope:**
- Bookings (by reference, customer)
- Customers (by name, email, phone)
- Tours (by name)
- Schedules (by date)

**Acceptance Criteria:**
- [ ] Command palette (Cmd+K)
- [ ] Instant results
- [ ] Keyboard navigation
- [ ] Recent searches

---

#### 6.4.2 Activity Log / Audit Trail

**Priority:** P1 - High

**User Story:**
> As a Business Owner, I want to see who did what and when.

**Track:**
- Booking created/modified/cancelled
- Customer changes
- Schedule changes
- Settings changes
- User logins

**Display:**
- Timeline view
- Filter by entity, user, action
- Export for compliance

---

#### 6.4.3 Notification Center

**Priority:** P2 - Medium

**User Story:**
> As an Operations Manager, I want in-app notifications for important events.

**Notifications:**
- New booking
- Booking cancelled
- Guide declined assignment
- Schedule approaching capacity
- Payment failed

**Acceptance Criteria:**
- [ ] Bell icon with badge
- [ ] Notification list
- [ ] Mark as read
- [ ] Click to navigate
- [ ] Notification preferences

---

## CRM High-Impact Features (Pre-Web App)

**Duration:** 4-6 weeks
**Goal:** Features that tour operators can't run their business without
**Priority:** Complete before starting Web App

> These features were identified through industry analysis. They address critical gaps that competitors (FareHarbor, Peek, Bokun) solve and that real tour operators require for daily operations.

---

### HI-1 Digital Waivers & Liability Forms

**Priority:** P0 - CRITICAL
**Complexity:** Medium

**Why Critical:**
- **Legally required** for liability protection
- Insurance companies mandate signed waivers for adventure activities
- Tour operators cannot operate without waivers for activities like kayaking, hiking, ATV tours
- Waivers must be signed BEFORE tour day (verification at check-in)

**User Story:**
> As an Operations Manager, I want customers to sign liability waivers digitally so I'm legally protected and can verify signatures at check-in.

**Database Schema:**
```typescript
// waiver_templates table
- id, organizationId
- name: string ("Standard Liability Waiver")
- content: text (rich text with legal language)
- isDefault: boolean
- tourIds: string[] (null = all tours)
- createdAt, updatedAt

// waiver_signatures table
- id, organizationId
- waiverTemplateId: string
- bookingId: string
- participantId: string
- signedAt: timestamp
- signatureImageUrl: string (Supabase Storage)
- ipAddress: string
- userAgent: string
- signerName: string
- signerEmail: string
```

**Acceptance Criteria:**
- [ ] Rich text waiver editor with legal template library
- [ ] Link waiver templates to specific tours or all tours
- [ ] Auto-send waiver email after booking confirmation
- [ ] Customer portal to sign waivers online (draw signature or type name)
- [ ] Track signature with timestamp, IP, and browser info
- [ ] Dashboard alert: "X bookings with unsigned waivers"
- [ ] Guide portal: show waiver status per participant
- [ ] Block check-in if waiver not signed (configurable per tour)
- [ ] Kiosk mode for on-site tablet signing

---

### HI-2 Deposit & Payment Plans

**Priority:** P0 - CRITICAL
**Complexity:** Medium

**Why Critical:**
- Tour operators RARELY receive full payment upfront for tours over $500
- Industry standard: 20-50% deposit at booking, balance due 7-30 days before
- Without this, operators lose high-value bookings customers can't pay in full today
- Cash flow management: predictable deposit schedules

**User Story:**
> As an Operations Manager, I want to require deposits for expensive tours and automatically collect the balance before the tour date.

**Database Schema:**
```typescript
// Add to tours table
- depositType: 'none' | 'percentage' | 'fixed'
- depositAmount: number (percentage or fixed amount)
- balanceDueDays: number (days before tour start)
- allowInstallments: boolean

// payment_schedules table
- id, organizationId, bookingId
- dueDate: timestamp
- amount: number
- status: 'pending' | 'paid' | 'overdue' | 'failed'
- stripePaymentIntentId: string
- paidAt: timestamp
- remindersSent: number

// payment_transactions table (history)
- id, organizationId, bookingId
- type: 'deposit' | 'balance' | 'installment' | 'refund'
- amount: number
- stripePaymentId: string
- status: string
- createdAt: timestamp
```

**Acceptance Criteria:**
- [ ] Configure deposit requirements per tour (none, percentage, fixed)
- [ ] Set balance due days (e.g., "Balance due 7 days before tour")
- [ ] Booking flow collects deposit only, creates payment schedule
- [ ] Automated balance reminder emails (7 days, 3 days, 1 day before due)
- [ ] Customer portal to pay outstanding balance
- [ ] Dashboard alert: "X bookings with overdue balances"
- [ ] Auto-cancel option if balance not paid by due date
- [ ] Installment plans for high-value tours (optional)
- [ ] Payment history timeline in booking detail

**Inngest Jobs:**
- `payment/balance-reminder` - Send reminders for upcoming due dates
- `payment/overdue-check` - Daily check for overdue payments
- `payment/auto-cancel` - Cancel bookings with overdue balances (if configured)

---

### HI-3 Resource & Equipment Management

**Priority:** P0 - CRITICAL
**Complexity:** Medium

**Why Critical:**
- Tours require physical resources: boats, bikes, helmets, wetsuits, vehicles
- Resource availability limits capacity (even if guide is available)
- "I have 2 boats, 12 person capacity each" - this is REAL inventory
- Overbooking equipment = operational nightmare

**User Story:**
> As an Operations Manager, I want to track equipment and vehicles so I don't overbook tours that require specific resources.

**Database Schema:**
```typescript
// resources table
- id, organizationId
- name: string ("Boat #1", "Mountain Bike - Medium")
- type: 'vehicle' | 'equipment' | 'facility'
- category: string ("boat", "bike", "helmet", "van")
- quantity: number (for non-unique items like helmets)
- isUnique: boolean (true for specific vehicles/boats)
- status: 'available' | 'maintenance' | 'retired'
- notes: text

// tour_resource_requirements table
- tourId: string
- resourceCategory: string ("boat", "van")
- quantityRequired: number (per schedule)
- isRequired: boolean (true = can't run without)

// resource_assignments table
- id, organizationId
- resourceId: string
- scheduleId: string
- quantity: number (for non-unique items)
- assignedAt: timestamp
- assignedBy: string

// resource_maintenance table
- id, resourceId
- scheduledDate: date
- type: 'routine' | 'repair'
- notes: text
- status: 'scheduled' | 'in_progress' | 'completed'
```

**Acceptance Criteria:**
- [ ] Resource CRUD (create vehicles, equipment, facilities)
- [ ] Define resource requirements per tour
- [ ] Resource calendar view (see what's assigned when)
- [ ] Auto-check resource availability when scheduling
- [ ] Conflict detection: "Can't schedule - Boat #1 already assigned"
- [ ] Assign resources to schedules manually or auto-assign
- [ ] Maintenance scheduling and tracking
- [ ] Dashboard alert: "Resource due for maintenance"
- [ ] Resource utilization report

---

### HI-4 Booking Add-Ons & Upsells

**Priority:** P1 - HIGH
**Complexity:** Medium

**Why Important:**
- Direct revenue increase (15-30% boost is common)
- Photo packages, meal upgrades, equipment rental, transport
- Customers expect to customize their experience
- Easy win: infrastructure exists, just needs add-on layer

**User Story:**
> As an Operations Manager, I want to offer add-ons like lunch upgrades and photo packages to increase booking value.

**Database Schema:**
```typescript
// tour_add_ons table
- id, organizationId
- tourId: string (null = available for all tours)
- name: string ("Lunch Upgrade", "GoPro Rental")
- description: text
- price: number
- pricingType: 'per_person' | 'per_booking' | 'per_day'
- maxQuantity: number (null = unlimited)
- requiresInventory: boolean
- inventoryResourceId: string (link to resources if tracked)
- status: 'active' | 'inactive'
- sortOrder: number

// booking_add_ons table
- id, organizationId, bookingId
- addOnId: string
- quantity: number
- unitPrice: number (at time of booking)
- totalPrice: number
```

**Acceptance Criteria:**
- [ ] Add-on CRUD per tour or global
- [ ] Pricing types: per person, per booking, per day (multi-day tours)
- [ ] Display add-ons in booking flow (CRM manual booking)
- [ ] Staff can add/remove add-ons from existing bookings
- [ ] Price recalculation includes add-ons
- [ ] Add-ons shown in booking confirmation and manifest
- [ ] Inventory tracking for limited items (link to resources)
- [ ] Add-on revenue report

---

### HI-5 Check-In & Attendance Tracking

**Priority:** P1 - HIGH
**Complexity:** Low

**Why Important:**
- Guides need to verify who showed up vs. who's a no-show
- Waiver verification at check-in
- No-show rate tracking for capacity planning
- Required for any operational tour business

**User Story:**
> As a Guide, I want to check in participants so I know who's present and can verify their waiver status.

**Database Schema:**
```typescript
// Add to booking_participants table
- checkedInAt: timestamp
- checkedInBy: string (guide/staff ID)
- noShowRecorded: boolean
- noShowRecordedAt: timestamp
- checkInNotes: text
```

**Acceptance Criteria:**
- [ ] Guide portal: participant list with check-in buttons
- [ ] Visual indicator: waiver signed ✓ / waiver missing ✗
- [ ] Bulk check-in option ("Check in all present")
- [ ] Mark no-show with timestamp
- [ ] No-show tracking in customer profile
- [ ] Dashboard: no-show rate by tour, customer
- [ ] Automated no-show policy (configurable): notify customer, apply fee

---

### HI-6 Gift Vouchers & Prepaid Credits

**Priority:** P1 - HIGH
**Complexity:** Low

**Why Important:**
- B2B revenue: hotels, concierges buy voucher packs at discount
- Gift market: holiday/birthday gifts
- Pre-paid = cash in hand before service delivered
- Different from promo codes (these have monetary value)

**User Story:**
> As a Business Owner, I want to sell gift vouchers that customers or partners can redeem for tours.

**Database Schema:**
```typescript
// vouchers table
- id, organizationId
- code: string (unique, redeemable code)
- type: 'gift' | 'prepaid' | 'corporate'
- purchasedAmount: number
- remainingBalance: number
- currency: string
- purchasedBy: string (customer name or B2B partner)
- purchasedAt: timestamp
- expiresAt: timestamp
- recipientEmail: string (for gift vouchers)
- recipientName: string
- personalMessage: text (gift message)
- status: 'active' | 'redeemed' | 'expired' | 'cancelled'
- stripePaymentId: string

// voucher_redemptions table
- id, voucherId, bookingId
- amountRedeemed: number
- redeemedAt: timestamp
```

**Acceptance Criteria:**
- [ ] Create voucher with amount (fixed or custom)
- [ ] Generate unique redemption code
- [ ] Email voucher to recipient with gift message
- [ ] Voucher lookup page (enter code to check balance)
- [ ] Apply voucher in booking flow (like promo code but deducts balance)
- [ ] Partial redemption (use $50 of $100 voucher)
- [ ] B2B bulk voucher creation (10 x $100 vouchers for hotel partner)
- [ ] Voucher balance tracking and history
- [ ] Expiration handling and reminders

---

### HI-7 Affiliate & Reseller Network

**Priority:** P1 - HIGH
**Complexity:** Medium

**Why Important:**
- Hotels, travel agents, influencers drive 30-50% of bookings
- Commission tracking (typically 10-20% per booking)
- Unique booking links per affiliate for attribution
- Essential for B2B distribution channel

**User Story:**
> As a Business Owner, I want to track bookings from hotel partners and pay them commission.

**Database Schema:**
```typescript
// affiliates table
- id, organizationId
- name: string ("Grand Hotel Concierge")
- type: 'hotel' | 'agent' | 'influencer' | 'ota'
- contactEmail: string
- commissionType: 'percentage' | 'fixed'
- commissionRate: number
- uniqueCode: string (for tracking: ?ref=GRANDHOTEL)
- status: 'active' | 'inactive'
- payoutMethod: string (bank transfer, PayPal)
- payoutDetails: jsonb
- createdAt: timestamp

// Add to bookings table
- affiliateId: string
- affiliateCommission: number (calculated at booking time)

// affiliate_payouts table
- id, organizationId, affiliateId
- periodStart: date
- periodEnd: date
- totalBookings: number
- totalRevenue: number
- commissionAmount: number
- status: 'pending' | 'paid'
- paidAt: timestamp
- paymentReference: string
```

**Acceptance Criteria:**
- [ ] Affiliate CRUD with commission rates
- [ ] Generate unique tracking codes/links per affiliate
- [ ] Track affiliate attribution on bookings (via URL param or manual)
- [ ] Commission calculation at booking time
- [ ] Affiliate dashboard: view their bookings and commissions (readonly)
- [ ] Monthly commission report per affiliate
- [ ] Mark commissions as paid with reference
- [ ] Affiliate performance report (top performers, conversion rates)

---

### HI-8 Review & Feedback System

**Priority:** P2 - MEDIUM
**Complexity:** Low

**Why Important:**
- Post-tour reviews drive TripAdvisor/Google reviews
- Internal guide ratings for performance management
- Testimonials for marketing
- Identify service quality issues

**User Story:**
> As a Business Owner, I want to collect reviews after tours to improve service and gather testimonials.

**Database Schema:**
```typescript
// reviews table
- id, organizationId, bookingId, customerId
- tourId: string
- guideId: string
- overallRating: integer (1-5)
- tourRating: integer (1-5)
- guideRating: integer (1-5)
- valueRating: integer (1-5)
- comment: text
- isPublic: boolean (can be used as testimonial)
- platform: 'internal' | 'tripadvisor' | 'google' | 'facebook'
- externalReviewUrl: string
- respondedAt: timestamp
- responseText: text
- createdAt: timestamp
```

**Acceptance Criteria:**
- [ ] Auto-send review request email 24h after tour completion
- [ ] Simple review form: overall rating + optional comment
- [ ] Optional guide-specific rating
- [ ] Mark reviews as testimonials (public display)
- [ ] Response to reviews (shown alongside)
- [ ] Prompt to leave TripAdvisor/Google review after internal review
- [ ] Guide performance: average rating display
- [ ] Review report: trends, flagged issues

**Inngest Jobs:**
- `review/request-send` - Send review request 24h after tour
- `review/reminder` - Reminder if no review after 72h

---

## Phase 7: Web App Foundation

**Duration:** 2 weeks
**Goal:** Public booking website scaffolding with SEO foundation
**Prerequisite:** CRM Phases 0-6 + High-Impact Features complete

> **Note:** Your tour business is fully operational on CRM before this phase begins. The Web App adds a customer acquisition channel.

---

### 7.1 Web App Scaffolding

**Priority:** P0 - Critical

**Acceptance Criteria:**
- [ ] Next.js app at `apps/web`
- [ ] Subdomain routing middleware (`{org}.book.platform.com`)
- [ ] Organization context from subdomain
- [ ] Shared UI components from `@tour/ui`
- [ ] Shared services from `@tour/services`
- [ ] Basic layout (header, footer, nav)
- [ ] Organization branding (logo, colors)

---

### 7.2 SEO Foundation

**Priority:** P0 - Critical

**Acceptance Criteria:**
- [ ] Dynamic sitemap generation (`/sitemap.xml`)
- [ ] Robots.txt configuration
- [ ] Meta tag management (title, description per page)
- [ ] Open Graph tags for social sharing
- [ ] Structured data (Schema.org) for tours
- [ ] Canonical URLs
- [ ] Breadcrumb navigation

**Structured Data Types:**
- `TouristAttraction` for tours
- `Event` for scheduled tours
- `Offer` for pricing
- `AggregateRating` for reviews
- `Organization` for business info

---

### 7.3 Tour Listing Page (Web)

**Priority:** P0 - Critical

All conversion elements defined in Phase 1.3.1 apply here.

**Additional Web-Specific:**
- [ ] Server-side rendering for SEO
- [ ] Category landing pages (`/tours/food`, `/tours/walking`)
- [ ] Search functionality
- [ ] Filter URL persistence (shareable filtered views)

---

### 7.4 Tour Detail Page (Web)

**Priority:** P0 - Critical

All conversion elements defined in Phase 1.3.2 apply here.

**Additional Web-Specific:**
- [ ] Schema.org markup for tour
- [ ] Social share buttons
- [ ] Related tours section
- [ ] FAQ schema markup
- [ ] Review schema markup

---

## Phase 8: Web App Booking Flow

**Duration:** 3 weeks
**Goal:** High-conversion booking experience

---

### 8.1 Public Booking Flow

All features from Phase 1.3 (Availability, Booking Form, Pricing, Payment, Confirmation) apply here, implemented for the public web.

**Additional Conversion Features:**
- [ ] Exit intent detection
- [ ] Progress auto-save (localStorage)
- [ ] One-click resume from abandoned cart emails
- [ ] Express checkout (Apple Pay, Google Pay)
- [ ] Trust badges throughout checkout
- [ ] Urgency messaging ("2 other people viewing")

---

### 8.2 Customer Account (Optional)

**Priority:** P1 - High

**User Story:**
> As a returning customer, I want to save my info for faster checkout.

**Features:**
- [ ] Magic link login (no password)
- [ ] Saved payment methods (Stripe)
- [ ] Booking history
- [ ] Upcoming tours
- [ ] Wishlist / saved tours
- [ ] Communication preferences

**Note:** Guest checkout always available. Accounts are optional convenience.

---

### 8.3 Reviews & Ratings (Web Display)

**Priority:** P0 - Critical (for conversion)

**User Story:**
> As a customer, I want to see reviews to trust the tour quality.

**Display Features:**
- [ ] Aggregate rating on tour cards
- [ ] Review section on tour detail page
- [ ] Filter reviews by rating
- [ ] Sort by recency, helpfulness
- [ ] Photo reviews
- [ ] Verified purchase badge
- [ ] Response from operator

**Collection (CRM-side, Phase 5):**
- Post-tour email requesting review
- Rating + text + optional photos
- Moderation workflow in CRM
- Reply to reviews from CRM

---

### 8.4 Social Proof Features

**Priority:** P0 - Critical

**Acceptance Criteria:**
- [ ] "X people booked today" counter
- [ ] "Y people viewing now" (real-time or simulated)
- [ ] Recent booking notifications ("John from NYC just booked")
- [ ] Trust badges (secure payment, verified business)
- [ ] Media mentions / awards if applicable

---

## Phase 9: Web App Optimization

**Duration:** 2 weeks
**Goal:** Conversion optimization and recovery

---

### 9.1 Abandoned Cart Recovery

All features from Phase 2.0.1 implemented:
- Timed email sequences
- One-click cart resume
- Recovery tracking dashboard

---

### 9.2 Conversion Analytics

All features from Phase 5.5 implemented:
- Funnel visualization
- Drop-off analysis
- Source attribution

---

### 9.3 A/B Testing

**Priority:** P2 - Medium

**Acceptance Criteria:**
- [ ] Feature flag system (PostHog or custom)
- [ ] Experiment creation UI
- [ ] Traffic splitting
- [ ] Statistical significance tracking
- [ ] Winner selection

**Initial Tests:**
- CTA button colors/text
- Price display formats
- Social proof placement
- Checkout flow variations

---

### 9.4 Performance Optimization (Web)

**Priority:** P0 - Critical

**Core Web Vitals Targets:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Acceptance Criteria:**
- [ ] Image optimization (next/image, WebP)
- [ ] Code splitting
- [ ] Edge caching for tour pages
- [ ] Prefetching for likely navigation
- [ ] Bundle size monitoring

---

## Phase 10: SaaS Platform

**Duration:** 3 weeks
**Goal:** Multi-tenant onboarding and billing infrastructure
**Prerequisite:** Your business running successfully on CRM + Web App

> **Note:** This phase enables selling the platform to other tour operators.

---

### 10.1 Organization Onboarding

**Priority:** P0 - Critical

**User Story:**
> As a new tour operator, I want to sign up and start using the platform quickly.

**Onboarding Flow:**
1. Sign up (email + password via Clerk)
2. Create organization (business name, slug)
3. Verify email
4. Connect Stripe (for receiving payments)
5. Basic settings (timezone, currency)
6. Create first tour
7. Dashboard

**Acceptance Criteria:**
- [ ] Self-service signup
- [ ] Organization creation wizard
- [ ] Stripe Connect onboarding
- [ ] Welcome email sequence
- [ ] Getting started checklist
- [ ] Sample data option (demo tours)

---

### 10.2 Subscription Billing

**Priority:** P0 - Critical

**Billing Model:**

| Plan | Price | Limits |
|------|-------|--------|
| **Free** | $0/mo | 50 bookings/mo, 1 user |
| **Starter** | $49/mo | 200 bookings/mo, 3 users |
| **Pro** | $149/mo | Unlimited bookings, 10 users |
| **Enterprise** | Custom | Custom limits, SLA, support |

**Platform Revenue Streams:**
1. Monthly subscription (above)
2. Transaction fee: 1-2% per booking (in addition to Stripe fees)
3. Premium features (add-ons)

**Acceptance Criteria:**
- [ ] Stripe subscription integration
- [ ] Plan selection during onboarding
- [ ] Upgrade/downgrade flows
- [ ] Usage tracking (bookings, users)
- [ ] Overage handling or soft limits
- [ ] Invoice generation
- [ ] Payment failure handling
- [ ] Dunning emails

---

### 10.3 Platform Admin (Super Admin)

**Priority:** P0 - Critical

**User Story:**
> As a platform operator, I want to manage all organizations and monitor platform health.

**Features:**
- [ ] Organization list with search
- [ ] Organization detail view
- [ ] Impersonate organization (support)
- [ ] Subscription management
- [ ] Feature flags per organization
- [ ] Platform-wide analytics
- [ ] Revenue dashboard
- [ ] Health monitoring

---

### 10.4 Feature Flags & Plan Limits

**Priority:** P1 - High

**Per-Plan Features:**

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Web App | No | Yes | Yes | Yes |
| Custom Domain | No | No | Yes | Yes |
| API Access | No | No | Yes | Yes |
| White Label | No | No | No | Yes |
| Priority Support | No | No | No | Yes |
| SSO | No | No | No | Yes |

**Acceptance Criteria:**
- [ ] Feature flag service
- [ ] Plan-based feature gating
- [ ] Upgrade prompts when hitting limits
- [ ] Grace periods for overages

---

## Phase 11: Public API & Integrations

**Duration:** 2 weeks
**Goal:** Enable external integrations and partner ecosystem

---

### 11.1 Public REST API

**Priority:** P1 - High

**Endpoints:**

| Resource | Methods | Description |
|----------|---------|-------------|
| `/tours` | GET | List tours |
| `/tours/{id}` | GET | Tour details |
| `/tours/{id}/availability` | GET | Available dates/times |
| `/bookings` | POST | Create booking |
| `/bookings/{id}` | GET, PATCH, DELETE | Manage booking |
| `/webhooks` | — | Event notifications |

**Features:**
- [ ] API key management (CRM settings)
- [ ] Rate limiting (per API key)
- [ ] Request logging
- [ ] OpenAPI documentation
- [ ] Sandbox environment
- [ ] SDK generation (TypeScript, Python)

---

### 11.2 Webhook System

**Priority:** P1 - High

**Events:**
- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.modified`
- `payment.received`
- `schedule.cancelled`

**Features:**
- [ ] Webhook endpoint configuration (CRM)
- [ ] Event selection
- [ ] Retry logic (exponential backoff)
- [ ] Delivery logs
- [ ] Signature verification

---

### 11.3 OTA Integrations

**Priority:** P2 - Medium

**Platforms:**
- Viator
- GetYourGuide
- TripAdvisor Experiences
- Booking.com Experiences

**Features:**
- [ ] Availability sync (outbound)
- [ ] Booking import (inbound)
- [ ] Rate management
- [ ] Listing management
- [ ] Channel-specific pricing

---

### 11.4 Partner/Reseller Management

**Priority:** P2 - Medium

**User Story:**
> As a tour operator, I want to work with travel agents who sell my tours.

**Features:**
- [ ] Partner accounts
- [ ] Partner-specific pricing/commission
- [ ] Partner booking portal
- [ ] Commission tracking
- [ ] Partner performance reports
- [ ] Invoice generation

---

## Phase 12+: Future Expansion

Features for long-term development based on market needs.

---

### 12.1 Mobile Applications

**Guide App (React Native):**
- View schedule
- View manifests
- Offline access
- GPS check-in
- Push notifications
- Chat with operations

**Customer App:**
- Browse and book
- Mobile tickets
- Push notifications
- In-tour features (GPS, audio guides)

---

### 12.2 Advanced Features (Backlog)

| Feature | Description |
|---------|-------------|
| **Multi-currency** | Price tours in multiple currencies |
| **Multi-language** | UI and tour content translation |
| **Dynamic pricing** | Demand-based price adjustments |
| **Loyalty program** | Points, rewards, tiers |
| **Affiliate tracking** | Track referral sources |
| **Gift cards** | Purchase and redeem |
| **Waitlist** | Join queue for sold-out tours |
| **Add-ons/Extras** | Lunch, photos, upgrades |
| **Pickup/Transport** | Hotel pickup coordination |
| **Custom tour requests** | Quote and booking workflow |
| **Resource management** | Vehicles, equipment tracking |
| **Weather integration** | Auto-alerts for outdoor tours |
| **AI recommendations** | Personalized tour suggestions |
| **Voice booking** | Alexa/Google Assistant |

---

## Feature Index

### By Application & Phase

**🖥️ CRM Application (Phases 0-6)**

| Module | Phase | Features |
|--------|-------|----------|
| **Foundation** | 0 | Auth, DB, Infrastructure |
| **Tour Management** | 1 | Tour CRUD, Variants, Media, Pricing Tiers |
| **Schedule Management** | 1 | Creation, Calendar, Status, Capacity |
| **Admin Booking** | 1 | Admin booking management, Manual creation |
| **Customer Management** | 2 | Profiles, History, Tags, Notes, Export |
| **Communications** | 2 | Email, SMS, Templates, Automation |
| **Conversion Recovery** | 2 | Abandoned cart, Wishlist, Alerts |
| **Guide Operations** | 3 | Profiles, Availability, Portal, Manifests |
| **Pricing** | 4 | Seasonal, Group, Early Bird, Promo Codes |
| **Reporting** | 5 | Dashboard, Revenue, Bookings, Capacity |
| **CRM Intelligence** | 5 | Scoring, CLV, Predictions, Attribution |
| **Settings** | 1-6 | Business, Booking, Payment, Tax, Users |

**🌐 Web Application (Phases 7-9)**

| Module | Phase | Features |
|--------|-------|----------|
| **Web Foundation** | 7 | Scaffolding, SEO, Structured Data |
| **Tour Pages** | 7 | Listing, Detail, Social Proof |
| **Booking Flow** | 8 | Checkout, Payment, Confirmation |
| **Customer Accounts** | 8 | Magic link, History, Wishlist |
| **Reviews** | 8 | Display, Collection, Moderation |
| **Optimization** | 9 | A/B Testing, Performance, Analytics |

**🔧 SaaS Platform (Phases 10-11)**

| Module | Phase | Features |
|--------|-------|----------|
| **Onboarding** | 10 | Signup, Org creation, Stripe Connect |
| **Billing** | 10 | Subscriptions, Plans, Usage |
| **Platform Admin** | 10 | Super admin, Monitoring |
| **Public API** | 11 | REST API, Documentation, SDKs |
| **Webhooks** | 11 | Event system, Delivery |
| **Integrations** | 11 | OTA, Partners, Resellers |

### By Priority

**P0 - Critical (CRM MVP):**
- Tour CRUD (1.1.1)
- Tour Variants (1.1.2)
- Pricing Tiers (1.1.4)
- Schedule Creation (1.2.1)
- Schedule Status (1.2.4)
- Capacity Management (1.2.5)
- Booking List (1.4.1)
- Booking Cancellation (1.4.5)
- Manual Booking Creation (1.4.3)
- Payment Settings (1.6.3)
- Conversion Funnel Dashboard (5.5.1)

**P1 - High (CRM Required):**
- Tour Media (1.1.3)
- Auto Schedule Generation (1.2.2)
- Schedule Calendar (1.2.3)
- Booking Detail View (1.4.2)
- Booking Modification (1.4.4)
- Customer List (2.1.1)
- Customer Profile (2.1.2)
- Customer Export (2.1.6)
- Abandoned Cart Recovery (2.0.1)
- Email Templates (2.2.1)
- Automated Emails (2.2.2)
- SMS Setup (2.3.1)
- Communication History (2.4.1)
- Guide Profiles (3.1.1)
- Guide Qualifications (3.1.2)
- Guide Availability (3.1.3)
- Assign Guides (3.2.1)
- Manifests (3.3.3)
- Promo Codes (4.2.1)
- Dashboard (5.1.1, 5.1.2)
- Revenue Report (5.2.1)
- Booking Report (5.2.2)
- Customer Scoring (5.4.1)
- Re-engagement Campaigns (5.4.5)
- Revenue Attribution (5.4.6)
- Audit Trail (6.4.2)

**P0 - Critical (Web App):**
- Web Scaffolding (7.1)
- SEO Foundation (7.2)
- Tour Listing (7.3)
- Tour Detail (7.4)
- Public Booking Flow (8.1)
- Reviews Display (8.3)
- Social Proof (8.4)
- Performance Optimization (9.4)

**P0 - Critical (SaaS):**
- Organization Onboarding (10.1)
- Subscription Billing (10.2)
- Platform Admin (10.3)

**P1 - High (SaaS):**
- Feature Flags (10.4)
- Public REST API (11.1)
- Webhook System (11.2)

**P2 - Medium (Enhancements):**
- Customer Notes (2.1.4)
- Customer Tags (2.1.5)
- Browse Abandonment (2.0.2)
- Wishlist (2.0.3)
- Price Drop Alerts (2.0.4)
- Availability Alerts (2.0.5)
- Guide Portal (3.3.1-3.3.5)
- Seasonal Pricing (4.1.1)
- Group Discounts (4.1.2)
- Capacity Report (5.2.3)
- Customer Report (5.2.4)
- CLV Prediction (5.4.2)
- No-Show Detection (5.4.3)
- Operational Efficiency (5.4.7)
- Global Search (6.4.1)
- Notification Center (6.4.3)
- Customer Accounts (8.2)
- A/B Testing (9.3)
- OTA Integration (11.3)
- Partner Management (11.4)

**P3 - Low (Backlog):**
- Early Bird Pricing (4.1.3)
- Deposit Payments (4.3.1)
- Gift Cards (4.3.2)
- Demand Forecasting (5.4.4)
- Guide Report (5.2.5)
- Mobile App (12.1)
- Advanced Features (12.2)

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Page Load (p95) | < 2s |
| API Response (p95) | < 500ms |
| Availability Check | < 200ms |
| Time to Interactive | < 3s |

### Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Booking Success | 99.95% |
| Payment Success | 99.9% |
| Data Durability | 99.999999999% |

### Security

| Requirement | Implementation |
|-------------|----------------|
| PCI Compliance | Stripe handles card data |
| Data Encryption | TLS 1.3, AES-256 at rest |
| Authentication | Clerk with MFA option |
| Authorization | Role-based access control |
| Audit Trail | All changes logged |
| GDPR | Data export, deletion support |

### Scalability

| Dimension | Initial Target |
|-----------|----------------|
| Concurrent Users | 1,000 |
| Bookings/Day | 500 |
| Tours | 100 |
| Schedules | 10,000/month |
| Customers | 100,000 |

### Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- Form error handling

---

*Document Version: 2.0 | Last Updated: December 2025*
