# Tour Operations Platform — Feature Planning Document

**Version:** 2.1
**Last Updated:** December 2025
**Status:** Multi-Tenant Platform Features
**Related Documents:** [ARCHITECTURE.md](./ARCHITECTURE.md), [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Application Ownership](#application-ownership)
3. [User Personas](#user-personas)
4. [Phase 0: Foundation](#phase-0-foundation)
5. [Phase 1: Core Booking Engine](#phase-1-core-booking-engine)
6. [Phase 2: Customer & Communications](#phase-2-customer--communications)
7. [Phase 3: Guide Operations](#phase-3-guide-operations)
8. [Phase 4: Pricing & Promotions](#phase-4-pricing--promotions)
9. [Phase 5: Reporting & Analytics](#phase-5-reporting--analytics)
10. [Phase 6: Polish & Optimization](#phase-6-polish--optimization)
11. [Phase 7+: Future Expansion](#phase-7-future-expansion)
12. [Feature Index](#feature-index)
13. [Non-Functional Requirements](#non-functional-requirements)

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

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **0** | Foundation | 2 weeks | Infrastructure, auth, scaffolding |
| **1** | Core Booking Engine | 3 weeks | Tours, schedules, bookings, payments |
| **2** | Customer & Communications | 2 weeks | CRM, email, SMS automation |
| **3** | Guide Operations | 2 weeks | Guides, assignments, manifests |
| **4** | Pricing & Promotions | 2 weeks | Advanced pricing, promo codes |
| **5** | Reporting & Analytics | 2 weeks | Dashboard, reports, insights |
| **6** | Polish & Optimization | 2 weeks | Performance, UX, testing |
| **7+** | Future Expansion | Ongoing | API, integrations, mobile |

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Booking completion rate | > 70% | Completed / Started |
| Admin task time | < 2 min | Average for common tasks |
| System uptime | 99.9% | Monthly availability |
| Page load (p95) | < 2s | Core Web Vitals |
| Customer satisfaction | > 4.5/5 | Post-tour surveys |

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
- Supabase project creation
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
**Goal:** End-to-end booking flow working

This is the heart of the system. A customer can browse tours, select a time, and complete a booking with payment.

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
- Store in Supabase Storage with CDN

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
- [ ] Filter by category
- [ ] Sort by: price, duration, popularity
- [ ] Responsive (mobile-first)
- [ ] Loading states
- [ ] Empty state if no tours

---

#### 1.3.2 Tour Detail Page

**Priority:** P0 - Critical

**User Story:**
> As a Customer, I want to see full tour details so I can decide if it's right for me.

**Acceptance Criteria:**
- [ ] Full description with rich formatting
- [ ] Image gallery with lightbox
- [ ] Meeting point with map
- [ ] Duration and what's included
- [ ] Price breakdown by tier
- [ ] Availability calendar
- [ ] Select date and book CTA
- [ ] Social sharing (future)
- [ ] Related tours (future)

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
- [ ] Show price per slot
- [ ] Variant selector if multiple exist
- [ ] Real-time updates (poll or websocket)

**Display Format:**
```
January 2025

Morning (09:00)              Afternoon (14:00)
───────────────────────────────────────────
Mon 6   ✓ 8 spots  $45      ✓ 12 spots  $45
Tue 7   ✓ 5 spots  $45      ✓ 10 spots  $45
Wed 8   ✓ 12 spots $45      ✗ Sold Out
Thu 9   ✓ 3 spots  $45      ✓ 7 spots   $45
Fri 10  ✗ Sold Out          ✓ 2 spots   $45
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

**Acceptance Criteria:**
- [ ] Stripe Elements integration
- [ ] PCI compliant (no card data on server)
- [ ] Clear error messages
- [ ] Loading state during processing
- [ ] Handle payment failures gracefully
- [ ] Timeout handling

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
- [ ] Meeting point with clear instructions
- [ ] Add to Calendar (Google, Apple, Outlook)
- [ ] Print-friendly version
- [ ] Link to manage booking

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
**Goal:** CRM functionality and automated communications

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

## Phase 7+: Future Expansion

Features for post-MVP development based on business needs.

---

### 7.1 Public API

**Priority:** P2 - Medium

**User Story:**
> As a Partner, I want API access to integrate with my systems.

**Endpoints:**
- Query tour availability
- Create bookings
- Manage bookings
- Receive webhooks

**Features:**
- API key management
- Rate limiting
- Documentation (OpenAPI)
- Sandbox environment

---

### 7.2 OTA Integrations

**Priority:** P2 - Medium

**Platforms:**
- Viator
- GetYourGuide
- TripAdvisor Experiences
- Booking.com Experiences

**Features:**
- Sync availability
- Import bookings
- Manage listings
- Rate parity

---

### 7.3 Partner/Reseller Management

**Priority:** P2 - Medium

**User Story:**
> As a Business Owner, I want to work with travel agents and resellers.

**Features:**
- Partner accounts
- Commission tracking
- Partner portal
- Invoicing
- Performance reports

---

### 7.4 Waitlist

**Priority:** P2 - Medium

**User Story:**
> As a Customer, I want to join a waitlist for sold-out tours.

**Features:**
- Join waitlist when sold out
- Automatic notification when spot opens
- Time-limited hold
- Position in queue

---

### 7.5 Reviews & Feedback

**Priority:** P2 - Medium

**User Story:**
> As a Business Owner, I want to collect and display customer reviews.

**Features:**
- Post-tour rating request
- Star rating + text review
- Moderation workflow
- Display on tour page
- Aggregate ratings

---

### 7.6 Add-ons & Extras

**Priority:** P2 - Medium

**User Story:**
> As a Customer, I want to add extras like lunch or photos to my booking.

**Features:**
- Define add-ons per tour
- Pricing per add-on
- Select at checkout
- Track on manifest

---

### 7.7 Pickup/Transportation

**Priority:** P2 - Medium

**User Story:**
> As a Customer, I want hotel pickup included with my tour.

**Features:**
- Define pickup zones
- Pickup pricing
- Customer enters hotel
- Pickup schedule for driver
- Pickup time calculation

---

### 7.8 Custom/Private Tour Requests

**Priority:** P2 - Medium

**User Story:**
> As a Customer, I want to request a custom tour experience.

**Features:**
- Inquiry form
- Request details
- Quote workflow
- Convert to booking

---

### 7.9 Mobile App

**Priority:** P3 - Low

**Guide App:**
- View schedule
- View manifests
- Offline access
- GPS check-in
- Push notifications

**Customer App:**
- Browse and book
- Mobile tickets
- In-tour navigation
- Push notifications

---

### 7.10 Advanced Features (Backlog)

- Multi-currency support
- Multi-language UI
- Multi-language tour content
- Dynamic pricing (demand-based)
- Loyalty program
- Affiliate tracking
- Multi-location support
- Franchise model
- Resource management (vehicles, equipment)
- Weather-based operations

---

## Feature Index

### By Module

| Module | Phase | Features |
|--------|-------|----------|
| **Tour Management** | 1 | Tour CRUD, Variants, Media, Pricing Tiers |
| **Schedule Management** | 1 | Creation, Calendar, Status, Capacity |
| **Booking Engine** | 1 | Public flow, Admin management, Self-service |
| **Customer Management** | 2 | Profiles, History, Tags, Notes, Export |
| **Communications** | 2 | Email, SMS, Templates, Automation, History |
| **Guide Operations** | 3 | Profiles, Availability, Portal, Manifests |
| **Pricing** | 4 | Seasonal, Group, Early Bird, Promo Codes |
| **Reporting** | 5 | Dashboard, Revenue, Bookings, Capacity |
| **Settings** | 1-2 | Business, Booking, Payment, Tax, Users |

### By Priority

**P0 - Critical (MVP Blockers):**
- Tour CRUD (1.1.1)
- Tour Variants (1.1.2)
- Pricing Tiers (1.1.4)
- Schedule Creation (1.2.1)
- Schedule Status (1.2.4)
- Capacity Management (1.2.5)
- Availability Display (1.3.3)
- Booking Form (1.3.4)
- Payment Processing (1.3.6)
- Booking Confirmation (1.3.7)
- Booking List (1.4.1)
- Booking Cancellation (1.4.5)
- Self-Service Cancellation (1.5.2)
- Payment Settings (1.6.3)

**P1 - High (MVP Required):**
- Tour Media (1.1.3)
- Auto Schedule Generation (1.2.2)
- Schedule Calendar (1.2.3)
- Tour Listing Page (1.3.1)
- Tour Detail Page (1.3.2)
- Booking Detail View (1.4.2)
- Manual Booking (1.4.3)
- Booking Modification (1.4.4)
- Customer List (2.1.1)
- Customer Profile (2.1.2)
- Customer Export (2.1.6)
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
- Audit Trail (6.4.2)

**P2 - Medium (Post-MVP):**
- Customer Notes (2.1.4)
- Customer Tags (2.1.5)
- Manual Email (2.2.3)
- Guide Portal (3.3.1-3.3.5)
- Seasonal Pricing (4.1.1)
- Group Discounts (4.1.2)
- Capacity Report (5.2.3)
- Customer Report (5.2.4)
- Global Search (6.4.1)
- Notification Center (6.4.3)
- Public API (7.1)
- OTA Integration (7.2)
- Waitlist (7.4)
- Reviews (7.5)

**P3 - Low (Backlog):**
- Early Bird Pricing (4.1.3)
- Deposit Payments (4.3.1)
- Gift Cards (4.3.2)
- Guide Report (5.2.5)
- Mobile App (7.9)

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
