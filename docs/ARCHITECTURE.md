# Tour Operations Platform — Technical Architecture

**Version:** 2.1
**Last Updated:** February 2026
**Status:** Multi-Tenant Platform Architecture (Production CRM + Command Center)
**Related Documents:** [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md), [PROGRESS.md](./PROGRESS.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Domain Model](#domain-model)
3. [Technical Architecture](#technical-architecture)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Key Workflows](#key-workflows)
7. [Infrastructure & Deployment](#infrastructure--deployment)
8. [Build Roadmap](#build-roadmap)
9. [Appendices](#appendices)

---

## Executive Summary

### What We're Building

A comprehensive tour operations platform consisting of **two applications** sharing common infrastructure:

1. **Web App** (`book.tourco.com`) — Public booking website for customers
2. **CRM App** (`app.tourco.com`) — Staff administration and operations

This is not a generic CRM with tour features bolted on, but a system designed from first principles around how tour companies actually operate. The core insight: tour operations are fundamentally about **time-bound inventory** (tours on specific dates with limited capacity) and **customer relationships** that span booking, fulfillment, and follow-up.

> **📖 See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for detailed multi-app architecture, monorepo structure, and application boundaries.**

### Key Architectural Decisions

| Decision | Choice | Primary Rationale |
|----------|--------|-------------------|
| **Repository Structure** | Turborepo monorepo | Shared code, atomic changes, single CI pipeline |
| **Applications** | 2 Next.js 15 apps | Independent deployment, optimized bundles per audience |
| **Frontend Framework** | Next.js 15 (App Router) | React ecosystem maturity, server components for speed |
| **Backend/API** | tRPC (internal) + REST (external) | End-to-end type safety internally, standards for partners |
| **Database** | Supabase (PostgreSQL) | Managed DB, real-time, RLS, storage included |
| **Deployment** | Hostinger VPS + Coolify | Self-hosted apps, cost-effective, git-push deploys |
| **Background Jobs** | Inngest | Event-driven workflows, retries, observability without infrastructure |
| **Communications** | Resend (email) + Twilio (SMS/WhatsApp) | Modern APIs, reliable delivery, good DX |
| **Payments** | Stripe | Industry standard, handles complexity of refunds/disputes |
| **CRM Auth** | Clerk | Handles MFA, SSO, team management, RBAC |
| **Customer Auth** | Lightweight (magic link) | Customers don't need full accounts |

### Architecture Philosophy

1. **Two apps, shared core**: Customer-facing booking and staff CRM have different needs—separate them to optimize each, but share business logic through packages. See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for details.

2. **Monorepo with boundaries**: A Turborepo monorepo keeps code together while maintaining clear boundaries. Shared packages (`@tour/database`, `@tour/services`, `@tour/ui`) provide the single source of truth.

3. **Type safety everywhere**: TypeScript end-to-end with tRPC means the compiler catches integration bugs before runtime. This reduces testing burden and enables fearless refactoring.

4. **Event-driven where it matters**: Core operations (bookings, payments) emit events that trigger downstream workflows (confirmations, reminders, analytics). This keeps the booking path fast while enabling rich automation.

5. **Optimistic UI with server authority**: The UI feels instant through optimistic updates, but the server is always the source of truth for critical data like availability and payments.

6. **Different auth for different trust levels**: Staff use Clerk with full RBAC; customers use lightweight magic link auth. Each application handles authentication appropriate to its users.

---

## Domain Model

### Multi-Tenant Foundation

> **📖 See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md#organization-model) for complete Organization entity definition and multi-tenant patterns.**

Every entity in the system belongs to an **Organization**. This enables:
1. Running your own tour business as Organization #1
2. Selling the platform as SaaS to other tour operators
3. Complete data isolation between organizations

### Core Entities

The domain is organized around seven aggregate roots, each with clear boundaries and responsibilities. **All entities (except Organization itself) include an `organizationId` field.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TOUR OPERATIONS DOMAIN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌───────────────┐                                 │
│                           │ ORGANIZATION  │  ◀── Root of all data          │
│                           │   (Tenant)    │                                 │
│                           └───────┬───────┘                                 │
│                                   │ owns                                    │
│       ┌───────────────────────────┼───────────────────────────┐             │
│       │                           │                           │             │
│       ▼                           ▼                           ▼             │
│  ┌─────────────┐    books     ┌─────────────┐    fulfills   ┌───────────┐ │
│  │  CUSTOMER   │─────────────▶│   BOOKING   │◀──────────────│ SCHEDULE  │ │
│  │             │              │             │               │           │ │
│  └─────────────┘              └─────────────┘               └───────────┘ │
│        │                            │                             │       │
│        │ receives                   │ for                         │ of    │
│        ▼                            ▼                             ▼       │
│  ┌─────────────┐              ┌─────────────┐               ┌───────────┐ │
│  │COMMUNICATION│              │    TOUR     │               │   GUIDE   │ │
│  │             │              │  (Product)  │               │           │ │
│  └─────────────┘              └─────────────┘               └───────────┘ │
│                                     │                                      │
│                                     │ has                                  │
│                                     ▼                                      │
│                               ┌─────────────┐                              │
│                               │   PRICING   │                              │
│                               │             │                              │
│                               └─────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Entity Definitions

#### 1. Customer (Aggregate Root)

The person or entity who books tours. Customers accumulate history over time. **Note:** The same email can exist across different organizations (a person can be a customer of multiple tour companies).

```typescript
interface Customer {
  id: string;                    // CUID2 - collision-resistant unique ID
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  // Identity
  email: string;                 // Unique within organization, not globally
  phone?: string;                // E.164 format, for SMS/WhatsApp
  firstName: string;
  lastName: string;

  // Source tracking
  source: CustomerSource;        // How they found us
  sourceDetail?: string;         // e.g., specific referral partner

  // Preferences
  preferredLanguage: string;     // ISO 639-1 (en, es, fr, etc.)
  preferredCurrency: string;     // ISO 4217 (USD, EUR, etc.)
  marketingConsent: boolean;     // GDPR compliance
  marketingConsentDate?: Date;

  // Metadata
  notes?: string;                // Staff notes
  tags: string[];                // Flexible categorization

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;          // Last booking, inquiry, etc.
}

type CustomerSource =
  | 'direct'           // Typed in URL
  | 'organic_search'   // Google, etc.
  | 'paid_search'      // Google Ads, etc.
  | 'social'           // Facebook, Instagram, etc.
  | 'referral'         // Partner or customer referral
  | 'ota'              // Online Travel Agency (Viator, GetYourGuide)
  | 'repeat'           // Returning customer
  | 'walk_in'          // In-person
  | 'phone'            // Called in
  | 'other';
```

**Relationships:**
- Has many `Bookings`
- Has many `Communications`
- Has many `CustomerNotes` (for detailed interaction history)

---

#### 2. Tour (Aggregate Root)

The product being sold. Tours are templates—they define what can be booked, not specific instances.

```typescript
interface Tour {
  id: string;
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  // Core info
  name: string;                  // "Downtown Walking Tour"
  slug: string;                  // URL-friendly, unique within organization
  shortDescription: string;      // One-liner for listings
  fullDescription: string;       // Rich text / Markdown

  // Operational details
  defaultDuration: number;       // Minutes
  defaultCapacity: number;       // Max participants
  minParticipants: number;       // Minimum to run (for viability)

  // Location
  meetingPoint: Location;        // Where tour starts
  endPoint?: Location;           // Where tour ends (if different)

  // Categorization
  category: TourCategory;
  tags: string[];

  // Media
  coverImage: string;            // Primary image URL
  gallery: string[];             // Additional images

  // Status
  status: 'draft' | 'active' | 'archived';

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface Location {
  name: string;                  // "Central Plaza Fountain"
  address: string;
  latitude: number;
  longitude: number;
  instructions?: string;         // "Look for guide with yellow umbrella"
}

type TourCategory =
  | 'walking'
  | 'food'
  | 'cultural'
  | 'adventure'
  | 'nature'
  | 'photography'
  | 'private'
  | 'custom';
```

**Relationships:**
- Has many `TourVariants` (private vs group, morning vs afternoon)
- Has many `PricingRules`
- Has many `Schedules` (instances of the tour)
- Has many `TourGuideAssignments` (which guides can lead this tour)

---

#### 3. TourVariant (Entity, belongs to Tour)

A specific version of a tour with its own characteristics.

```typescript
interface TourVariant {
  id: string;
  tourId: string;

  name: string;                  // "Private Tour" or "Morning Departure"

  // Overrides from parent Tour (null = use Tour default)
  duration?: number;
  capacity?: number;
  minParticipants?: number;

  // Pricing reference
  defaultPriceId?: string;       // Link to PricingTier

  // Availability pattern
  availabilityPattern: AvailabilityPattern;

  status: 'active' | 'inactive';
  sortOrder: number;             // Display order
}

interface AvailabilityPattern {
  type: 'recurring' | 'specific_dates' | 'on_request';

  // For recurring
  daysOfWeek?: number[];         // 0=Sunday, 6=Saturday
  startTimes?: string[];         // ["09:00", "14:00"]

  // Date boundaries
  validFrom?: Date;
  validUntil?: Date;

  // Blackout dates
  excludedDates?: Date[];
}
```

---

#### 4. Pricing (Value Objects)

Pricing is complex in tour operations: seasonal rates, early bird discounts, group rates, child prices. We model this with composable rules.

```typescript
interface PricingTier {
  id: string;
  tourId: string;
  variantId?: string;            // Specific to variant, or null for tour-wide

  name: string;                  // "Adult", "Child (5-12)", "Senior"

  basePrice: Money;

  // Who this applies to
  ageRange?: { min: number; max: number };

  // Validity
  validFrom?: Date;
  validUntil?: Date;

  sortOrder: number;
  isDefault: boolean;            // Pre-selected in UI
}

interface SeasonalPricing {
  id: string;
  tourId: string;

  name: string;                  // "Summer Peak", "Holiday Season"

  // When active
  startDate: Date;               // Inclusive
  endDate: Date;                 // Inclusive

  // Adjustment
  adjustmentType: 'percentage' | 'fixed';
  adjustmentValue: number;       // +20 for 20% or +20.00

  priority: number;              // Higher priority wins conflicts
}

interface PromotionalCode {
  id: string;

  code: string;                  // "SUMMER2025"

  // Discount
  discountType: 'percentage' | 'fixed';
  discountValue: number;

  // Constraints
  minBookingValue?: Money;
  maxUses?: number;
  maxUsesPerCustomer?: number;

  // Validity
  validFrom: Date;
  validUntil: Date;

  // Targeting
  applicableTourIds?: string[];  // Empty = all tours
  applicableVariantIds?: string[];

  // Tracking
  currentUses: number;

  status: 'active' | 'inactive' | 'expired';
}

// Value object for money - always store cents/minor units
interface Money {
  amount: number;                // In minor units (cents)
  currency: string;              // ISO 4217
}
```

---

#### 5. Schedule (Aggregate Root)

A specific instance of a tour on a specific date and time. This is what gets booked.

```typescript
interface Schedule {
  id: string;
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  tourId: string;
  variantId: string;

  // When
  date: Date;                    // The calendar date (YYYY-MM-DD)
  startTime: string;             // "09:00" in local timezone
  timezone: string;              // IANA timezone "America/New_York"

  // Calculated end time
  endTime: string;               // Based on duration

  // Capacity management
  capacity: number;              // Max for this specific schedule
  bookedCount: number;           // Current bookings (denormalized for perf)

  // Operations
  assignedGuideId?: string;
  status: ScheduleStatus;

  // Overrides
  notes?: string;                // Internal notes
  specialInstructions?: string;  // Shown to customers

  // For recurring generation
  generatedFromPattern: boolean;

  createdAt: Date;
  updatedAt: Date;
}

type ScheduleStatus =
  | 'open'           // Accepting bookings
  | 'full'           // At capacity
  | 'closed'         // Manually closed to bookings
  | 'cancelled'      // Won't happen, need to handle existing bookings
  | 'completed';     // Tour happened
```

**Key Invariants:**
- `bookedCount <= capacity`
- Status transitions are controlled (can't go from `completed` to `open`)
- Cancelled schedules trigger booking notifications

---

#### 6. Booking (Aggregate Root)

The core transaction. A booking represents a customer's reservation for a specific schedule.

```typescript
interface Booking {
  id: string;
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  // Reference number (human-readable, unique within organization)
  referenceNumber: string;       // "BK-2025-ABC123"

  // Parties
  customerId: string;
  scheduleId: string;

  // What was booked
  lineItems: BookingLineItem[];

  // Pricing snapshot (captured at booking time)
  subtotal: Money;
  discounts: AppliedDiscount[];
  taxes: AppliedTax[];
  total: Money;

  // Payment
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;      // Stripe reference
  paidAmount: Money;
  refundedAmount: Money;

  // Booking lifecycle
  status: BookingStatus;

  // Source
  source: BookingSource;
  promotionalCodeId?: string;

  // Customer-provided info
  specialRequests?: string;
  dietaryRestrictions?: string;

  // Internal
  notes?: string;                // Staff notes

  // Timestamps
  createdAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

interface BookingLineItem {
  id: string;

  pricingTierId: string;
  tierName: string;              // Snapshot: "Adult"
  quantity: number;
  unitPrice: Money;              // Snapshot at booking time
  totalPrice: Money;

  // Participant details (optional, for manifests)
  participants?: ParticipantInfo[];
}

interface ParticipantInfo {
  firstName: string;
  lastName: string;
  age?: number;
}

interface AppliedDiscount {
  type: 'promotional_code' | 'early_bird' | 'group' | 'manual';
  description: string;
  amount: Money;
  codeId?: string;
}

interface AppliedTax {
  name: string;                  // "VAT", "Tourism Tax"
  rate: number;                  // 0.20 for 20%
  amount: Money;
}

type BookingStatus =
  | 'pending'        // Created, awaiting payment
  | 'confirmed'      // Paid and confirmed
  | 'modified'       // Changed after confirmation
  | 'cancelled'      // Cancelled (could be customer or operator)
  | 'no_show'        // Customer didn't show up
  | 'completed';     // Tour happened, customer attended

type PaymentStatus =
  | 'unpaid'
  | 'partial'        // Deposit paid
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

type BookingSource =
  | 'website'        // Our booking engine
  | 'admin'          // Staff created
  | 'phone'          // Phone booking
  | 'partner'        // API partner
  | 'ota';           // OTA integration
```

**Key Invariants:**
- Can only book schedules with `status = 'open'`
- `bookedCount` on Schedule must stay in sync
- Cancellation within policy = automatic refund
- Payment must be captured before `status = 'confirmed'`

---

#### 7. Guide (Aggregate Root)

The people who lead tours.

```typescript
interface Guide {
  id: string;
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  // Identity
  userId?: string;               // Link to auth user (if they have login)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Professional info
  bio?: string;
  photo?: string;
  languages: string[];           // ISO 639-1 codes

  // Certifications/qualifications
  certifications: Certification[];

  // Availability
  defaultAvailability: WeeklyAvailability;

  // Status
  status: 'active' | 'inactive' | 'on_leave';

  // Performance
  rating?: number;               // Calculated from feedback
  totalToursLed: number;

  createdAt: Date;
  updatedAt: Date;
}

interface Certification {
  name: string;
  issuingBody?: string;
  expiresAt?: Date;
}

interface WeeklyAvailability {
  // Each day: array of available time ranges
  [day: number]: TimeRange[];    // 0=Sunday
}

interface TimeRange {
  start: string;                 // "09:00"
  end: string;                   // "17:00"
}

interface GuideAssignment {
  id: string;
  guideId: string;
  scheduleId: string;

  status: 'pending' | 'confirmed' | 'declined';
  assignedAt: Date;
  confirmedAt?: Date;

  notes?: string;
}
```

---

#### 8. Communication (Aggregate Root)

All customer communications for audit trail and analytics.

```typescript
interface Communication {
  id: string;
  organizationId: string;        // ⬅️ Every entity belongs to an organization

  customerId: string;
  bookingId?: string;            // If related to specific booking

  // Channel
  channel: 'email' | 'sms' | 'whatsapp' | 'phone' | 'in_app';
  direction: 'outbound' | 'inbound';

  // Content
  type: CommunicationType;
  subject?: string;              // For email
  content: string;               // Body or transcript

  // Delivery
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;

  // External references
  externalId?: string;           // Resend/Twilio message ID

  // Engagement
  openedAt?: Date;
  clickedAt?: Date;

  createdAt: Date;
}

type CommunicationType =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_modification'
  | 'booking_cancellation'
  | 'payment_receipt'
  | 'review_request'
  | 'marketing'
  | 'custom';
```

---

### Domain Events

Events are first-class citizens. They enable loose coupling and trigger workflows. **All events include `organizationId`** to ensure org-scoped processing.

```typescript
// Base event structure - all events extend this
interface BaseEvent {
  organizationId: string;        // ⬅️ Every event is org-scoped
  timestamp: Date;
}

// Booking events
interface BookingCreated extends BaseEvent {
  type: 'booking.created';
  bookingId: string;
  customerId: string;
  scheduleId: string;
}

interface BookingConfirmed extends BaseEvent {
  type: 'booking.confirmed';
  bookingId: string;
  paymentIntentId: string;
}

interface BookingCancelled extends BaseEvent {
  type: 'booking.cancelled';
  bookingId: string;
  reason: string;
  cancelledBy: 'customer' | 'operator' | 'system';
  refundAmount?: Money;
}

// Schedule events
interface ScheduleCancelled extends BaseEvent {
  type: 'schedule.cancelled';
  scheduleId: string;
  reason: string;
  affectedBookingIds: string[];
}

interface ScheduleGuideAssigned extends BaseEvent {
  type: 'schedule.guide_assigned';
  scheduleId: string;
  guideId: string;
}

// Payment events
interface PaymentReceived extends BaseEvent {
  type: 'payment.received';
  bookingId: string;
  amount: Money;
  paymentIntentId: string;
}

interface RefundProcessed extends BaseEvent {
  type: 'refund.processed';
  bookingId: string;
  amount: Money;
  reason: string;
}
```

---

## Technical Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │  Admin SPA  │    │ Public Site │    │ Mobile App  │                    │
│   │  (React)    │    │  (Next.js)  │    │  (Future)   │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                            │
└──────────┼──────────────────┼──────────────────┼────────────────────────────┘
           │                  │                  │
           └────────────┬─────┴──────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                         Next.js Application                          │ │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│   │  │   Pages/Routes  │  │  Server Actions │  │  API Routes     │      │ │
│   │  │   (App Router)  │  │                 │  │  (REST/Webhooks)│      │ │
│   │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘      │ │
│   │           │                    │                    │                │ │
│   │           └────────────┬───────┴────────────────────┘                │ │
│   │                        │                                              │ │
│   │                        ▼                                              │ │
│   │  ┌──────────────────────────────────────────────────────────────┐   │ │
│   │  │                      tRPC Router                              │   │ │
│   │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │ │
│   │  │  │ Booking  │ │ Customer │ │ Schedule │ │ Reports  │  ...   │   │ │
│   │  │  │ Router   │ │ Router   │ │ Router   │ │ Router   │        │   │ │
│   │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │ │
│   │  └──────────────────────────────────────────────────────────────┘   │ │
│   │                        │                                              │ │
│   │                        ▼                                              │ │
│   │  ┌──────────────────────────────────────────────────────────────┐   │ │
│   │  │                    Service Layer                              │   │ │
│   │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │   │ │
│   │  │  │BookingService│ │PricingService│ │ EventService │   ...    │   │ │
│   │  │  └──────────────┘ └──────────────┘ └──────────────┘          │   │ │
│   │  └──────────────────────────────────────────────────────────────┘   │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            DATA & SERVICES                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │  Supabase   │    │   Inngest   │    │    Redis    │                    │
│   │ (DB+Storage)│    │   (Jobs)    │    │   (Cache)   │                    │
│   └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │   Stripe    │    │   Resend    │    │   Twilio    │                    │
│   │ (Payments)  │    │   (Email)   │    │ (SMS/Voice) │                    │
│   └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Decisions

#### Frontend: Next.js 15 with App Router

**Why Next.js over alternatives:**

| Factor | Next.js | Remix | SvelteKit |
|--------|---------|-------|-----------|
| **Ecosystem** | Massive (React) | Good (React) | Growing |
| **Hiring** | Easiest | Moderate | Harder |
| **Server Components** | Yes (mature) | No | No |
| **Deployment** | Coolify (self-hosted) | Flexible | Flexible |
| **Learning resources** | Abundant | Good | Good |

For a small team building a business-critical tool, the React ecosystem's maturity is decisive. When you need a complex data table, date picker, or chart library, there are battle-tested React options. The hiring pool matters too—React developers are plentiful.

**Key Next.js patterns we'll use:**
- **Server Components** for data-heavy pages (dashboards, reports)
- **Client Components** for interactive elements (booking forms, real-time updates)
- **Server Actions** for mutations (simpler than REST endpoints for internal use)
- **Route Handlers** for webhooks and external integrations

#### Backend: tRPC

**Why tRPC over GraphQL or REST:**

tRPC eliminates the API layer as a source of bugs. In a TypeScript monorepo, changing a procedure's return type immediately shows all call sites that need updating. This is transformative for a small team moving fast.

```typescript
// Server: Define the procedure
export const bookingRouter = router({
  create: protectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ input, ctx }) => {
      return bookingService.create(input, ctx.user);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return bookingService.getById(input.id);
    }),
});

// Client: Full type inference
const booking = await trpc.booking.getById.query({ id: 'abc' });
// booking is fully typed, IDE autocomplete works
```

**When we'd still use REST:**
- Webhook endpoints (Stripe, Twilio callbacks)
- Public API for partners (future phase)
- External integrations that expect REST

#### Database: Supabase (PostgreSQL)

**Why Supabase:**

1. **PostgreSQL**: The right choice for transactional, relational data. Bookings need ACID guarantees, foreign keys, and complex queries.

2. **Managed Service**: Automatic backups, point-in-time recovery, connection pooling handled.

3. **Real-time**: Built-in real-time subscriptions for live dashboards without additional infrastructure.

4. **Row Level Security**: First-class RLS support makes multi-tenant isolation easier.

5. **Storage Included**: S3-compatible storage with CDN for tour images.

6. **Free Tier**: Generous free plan for development and initial launch (500MB DB, 1GB storage).

**Considered alternatives:**
- **Self-hosted PostgreSQL**: More control but adds operational burden.
- **PlanetScale**: MySQL-based, no foreign keys is a dealbreaker for booking integrity.
- **Neon**: Strong PostgreSQL option, but Supabase's additional features (storage, real-time) provide more value.

#### ORM: Drizzle

**Why Drizzle over Prisma:**

| Factor | Drizzle | Prisma |
|--------|---------|--------|
| **SQL closeness** | Very close | Abstracted |
| **Bundle size** | Small | Large runtime |
| **Edge compatibility** | Native | Requires adapter |
| **Type inference** | Excellent | Excellent |
| **Raw SQL** | Easy | Awkward |

Drizzle feels like writing SQL with TypeScript guardrails. For a team that knows SQL, this is more productive than learning Prisma's query API.

```typescript
// Drizzle - SQL-like, fully typed
const bookings = await db
  .select()
  .from(bookingsTable)
  .where(eq(bookingsTable.customerId, customerId))
  .orderBy(desc(bookingsTable.createdAt));
```

#### Background Jobs: Inngest

**Why Inngest:**

Tour operations require complex async workflows:
- Send confirmation email after payment
- Send reminder 24 hours before tour
- Retry failed payment capture
- Generate reports nightly

Inngest provides:
- **Event-driven**: Jobs trigger from events, not cron (though cron is supported)
- **Retries with backoff**: Built-in failure handling
- **Step functions**: Multi-step workflows with durability
- **Observability**: See what's running, what failed, and why
- **Local development**: Works locally without additional infrastructure

```typescript
export const sendBookingConfirmation = inngest.createFunction(
  { id: 'send-booking-confirmation' },
  { event: 'booking.confirmed' },
  async ({ event, step }) => {
    const booking = await step.run('fetch-booking', () =>
      bookingService.getById(event.data.bookingId)
    );

    await step.run('send-email', () =>
      emailService.sendBookingConfirmation(booking)
    );

    await step.run('send-sms', () =>
      smsService.sendBookingConfirmation(booking)
    );
  }
);
```

**Alternatives considered:**
- **BullMQ + Redis**: More setup, less observability
- **AWS SQS/Lambda**: Overkill complexity for our scale
- **Temporal**: Powerful but complex for this use case

#### Caching: Redis (Self-Hosted via Coolify)

For session storage, rate limiting, and caching frequently-accessed data (tour availability, pricing).

Self-hosted Redis via Coolify provides the same capabilities with full control and no external dependencies. Configured with persistence for session durability.

#### Payments: Stripe

Industry standard. Handles:
- Payment intents (authorization, capture)
- Refunds (full and partial)
- Disputes
- Multiple payment methods
- Multiple currencies
- PCI compliance

#### Communications: Resend + Twilio

**Email (Resend):**
- Modern API, great DX
- React Email for templates (type-safe, componentized)
- Deliverability built-in
- Reasonable pricing

**SMS/WhatsApp (Twilio):**
- Dominant player, reliable
- WhatsApp Business API support
- Global coverage

### Project Structure (Monorepo)

> **📖 For complete monorepo structure, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md#monorepo-structure)**

The platform uses a Turborepo monorepo with two Next.js applications sharing common packages:

```
tour-platform/
├── apps/
│   ├── web/                      # Public booking website (book.tourco.com)
│   │   └── app/                  # Next.js App Router
│   │       ├── (marketing)/      # Homepage, about
│   │       ├── tours/            # Tour browsing
│   │       ├── book/             # Booking flow
│   │       ├── booking/          # Booking management
│   │       └── api/              # Webhooks only
│   │
│   └── crm/                      # Staff CRM application (app.tourco.com)
│       └── app/                  # Next.js App Router
│           ├── (auth)/           # Auth routes (login, signup)
│           ├── (dashboard)/      # Protected admin routes
│           │   ├── bookings/
│           │   ├── customers/
│           │   ├── tours/
│           │   ├── schedules/
│           │   ├── guides/
│           │   └── reports/
│           ├── (guide)/          # Guide portal
│           └── api/
│               ├── trpc/         # tRPC handler
│               └── webhooks/     # Stripe, Twilio webhooks
│
├── packages/
│   ├── database/                 # @tour/database - Drizzle schema & client
│   │   ├── src/
│   │   │   ├── schema/           # All table definitions
│   │   │   ├── client.ts         # Database connection
│   │   │   └── types.ts          # Generated types
│   │   └── drizzle.config.ts
│   │
│   ├── services/                 # @tour/services - Shared business logic
│   │   └── src/
│   │       ├── booking/          # Booking service
│   │       ├── customer/         # Customer service
│   │       ├── tour/             # Tour service
│   │       ├── schedule/         # Schedule service
│   │       ├── pricing/          # Pricing calculations
│   │       ├── payment/          # Stripe integration
│   │       ├── email/            # Email (Resend)
│   │       ├── sms/              # SMS (Twilio)
│   │       └── events/           # Domain events
│   │
│   ├── ui/                       # @tour/ui - Shared UI components
│   │   └── src/
│   │       ├── primitives/       # Base shadcn/ui components
│   │       ├── forms/            # Form components
│   │       └── data-display/     # Tables, cards
│   │
│   ├── validators/               # @tour/validators - Zod schemas
│   │
│   ├── emails/                   # @tour/emails - React Email templates
│   │   └── src/
│   │       ├── booking-confirmation.tsx
│   │       └── booking-reminder.tsx
│   │
│   └── config/                   # @tour/config - Shared configuration
│
├── infrastructure/
│   └── inngest/                  # Background job definitions
│
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # pnpm workspaces
└── package.json                  # Root package.json
```

### Authentication & Authorization

**Auth Provider: Clerk + Custom Lightweight Auth**

Using **Clerk** for the admin side, **custom lightweight auth** (magic links) for customer-facing booking.

**Why Clerk for admin:**
- Handles MFA, SSO, team invitations
- Beautiful pre-built components
- Audit logs
- Role management

**Why custom for customers:**
- Customers don't need "accounts" in the traditional sense
- Magic link / OTP flow for accessing their bookings
- Lighter weight than full auth system

**Role-Based Access Control (RBAC):**

```typescript
type Role = 'owner' | 'admin' | 'manager' | 'guide';

const permissions = {
  owner: ['*'],  // Everything
  admin: [
    'bookings:*',
    'customers:*',
    'tours:*',
    'schedules:*',
    'guides:*',
    'reports:read',
  ],
  manager: [
    'bookings:read', 'bookings:create', 'bookings:update',
    'customers:read',
    'schedules:read', 'schedules:update',
    'guides:read',
  ],
  guide: [
    'schedules:read:own',  // Only their assigned schedules
    'bookings:read:own',   // Only bookings for their tours
  ],
};
```

---

## Database Design

### Multi-Tenant Schema Design

> **📖 See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md#multi-tenant-data-architecture) for complete multi-tenant data architecture and Row-Level Security (RLS) policies.**

**Key Principles:**
1. **Every tenant table has `organization_id`** — Data isolation at the schema level
2. **Unique constraints are per-organization** — e.g., customer email unique within org, not globally
3. **All indexes include `organization_id`** — Efficient queries when filtering by org
4. **RLS as defense in depth** — Application filters + database policies

### Schema Overview

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE customer_source AS ENUM (
  'direct', 'organic_search', 'paid_search', 'social',
  'referral', 'ota', 'repeat', 'walk_in', 'phone', 'other'
);

CREATE TYPE tour_category AS ENUM (
  'walking', 'food', 'cultural', 'adventure',
  'nature', 'photography', 'private', 'custom'
);

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'modified', 'cancelled', 'no_show', 'completed'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid', 'partial', 'paid', 'refunded', 'partially_refunded', 'disputed'
);

CREATE TYPE schedule_status AS ENUM (
  'open', 'full', 'closed', 'cancelled', 'completed'
);

CREATE TYPE guide_status AS ENUM ('active', 'inactive', 'on_leave');

CREATE TYPE communication_channel AS ENUM (
  'email', 'sms', 'whatsapp', 'phone', 'in_app'
);

CREATE TYPE communication_status AS ENUM (
  'pending', 'sent', 'delivered', 'failed', 'bounced'
);
```

### Core Tables

#### Organizations (Platform Root)

> **📖 See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md#organization-model) for full Organization entity definition.**

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  -- Domains
  custom_crm_domain TEXT UNIQUE,
  custom_booking_domain TEXT UNIQUE,

  -- Branding
  logo TEXT,
  primary_color TEXT DEFAULT '#000000',

  -- Business info
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  default_currency TEXT DEFAULT 'USD',

  -- Subscription (platform billing)
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  platform_stripe_customer_id TEXT,
  platform_stripe_subscription_id TEXT,

  -- Stripe Connect (org's payment processing)
  stripe_connect_account_id TEXT,
  stripe_connect_status TEXT DEFAULT 'not_started',

  -- Features (JSON for flexibility)
  features JSONB DEFAULT '{"crmAccess": true, "webAppEnabled": false}',

  -- Settings (JSON for flexibility)
  settings JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'suspended', 'deleted')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organizations_slug_idx ON organizations (slug);
CREATE INDEX organizations_status_idx ON organizations (status);
```

#### Customers

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identity
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,

  -- Source tracking
  source customer_source NOT NULL DEFAULT 'direct',
  source_detail TEXT,

  -- Preferences
  preferred_language TEXT NOT NULL DEFAULT 'en',
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_date TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique email PER ORGANIZATION (same person can be customer of multiple orgs)
  CONSTRAINT customers_email_org_unique UNIQUE (organization_id, email)
);

-- Indexes include organization_id for efficient tenant-scoped queries
CREATE INDEX customers_org_idx ON customers (organization_id);
CREATE INDEX customers_org_email_idx ON customers (organization_id, email);
CREATE INDEX customers_org_last_activity_idx ON customers (organization_id, last_activity_at DESC);
CREATE INDEX customers_source_idx ON customers (organization_id, source);
CREATE INDEX customers_tags_idx ON customers USING GIN (tags);

-- Full text search on customer names
CREATE INDEX customers_name_search_idx ON customers
  USING GIN (to_tsvector('english', first_name || ' ' || last_name));
```

#### Tours

```sql
CREATE TABLE tours (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Core info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,

  -- Operational defaults
  default_duration INTEGER NOT NULL,  -- minutes
  default_capacity INTEGER NOT NULL,
  min_participants INTEGER NOT NULL DEFAULT 1,

  -- Location (meeting point)
  meeting_point_name TEXT NOT NULL,
  meeting_point_address TEXT NOT NULL,
  meeting_point_lat DOUBLE PRECISION NOT NULL,
  meeting_point_lng DOUBLE PRECISION NOT NULL,
  meeting_point_instructions TEXT,

  -- End point (optional, if different from meeting point)
  end_point_name TEXT,
  end_point_address TEXT,
  end_point_lat DOUBLE PRECISION,
  end_point_lng DOUBLE PRECISION,

  -- Categorization
  category tour_category NOT NULL,
  tags TEXT[] DEFAULT '{}',

  -- Media
  cover_image TEXT,
  gallery TEXT[] DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Slug unique within organization
  CONSTRAINT tours_slug_org_unique UNIQUE (organization_id, slug)
);

CREATE INDEX tours_org_idx ON tours (organization_id);
CREATE INDEX tours_org_slug_idx ON tours (organization_id, slug);
CREATE INDEX tours_org_status_idx ON tours (organization_id, status);
CREATE INDEX tours_category_idx ON tours (organization_id, category);
```

#### Tour Variants

```sql
CREATE TABLE tour_variants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  name TEXT NOT NULL,

  -- Overrides (NULL = use tour default)
  duration INTEGER,
  capacity INTEGER,
  min_participants INTEGER,

  -- Default pricing tier
  default_pricing_tier_id TEXT,  -- FK added later

  -- Availability pattern (JSONB for flexibility)
  availability_pattern JSONB NOT NULL DEFAULT '{"type": "recurring"}',

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tour_variants_tour_id_idx ON tour_variants (tour_id);
```

#### Pricing Tiers

```sql
CREATE TABLE pricing_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES tour_variants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,  -- "Adult", "Child", "Senior"

  -- Price in minor units (cents)
  base_price_amount INTEGER NOT NULL,
  base_price_currency TEXT NOT NULL DEFAULT 'USD',

  -- Age range (optional)
  age_min INTEGER,
  age_max INTEGER,

  -- Validity
  valid_from DATE,
  valid_until DATE,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pricing_tiers_tour_id_idx ON pricing_tiers (tour_id);
CREATE INDEX pricing_tiers_variant_id_idx ON pricing_tiers (variant_id);

-- Add FK now that pricing_tiers exists
ALTER TABLE tour_variants
  ADD CONSTRAINT tour_variants_default_pricing_tier_fk
  FOREIGN KEY (default_pricing_tier_id) REFERENCES pricing_tiers(id);
```

#### Seasonal Pricing

```sql
CREATE TABLE seasonal_pricing (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  name TEXT NOT NULL,  -- "Summer Peak", "Holiday Season"

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value DECIMAL(10, 2) NOT NULL,  -- percentage or fixed amount

  priority INTEGER NOT NULL DEFAULT 0,  -- higher wins

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seasonal_pricing_date_range CHECK (end_date >= start_date)
);

CREATE INDEX seasonal_pricing_tour_dates_idx
  ON seasonal_pricing (tour_id, start_date, end_date);
```

#### Promotional Codes

```sql
CREATE TABLE promotional_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,

  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,

  -- Constraints
  min_booking_amount INTEGER,  -- in minor units
  min_booking_currency TEXT DEFAULT 'USD',
  max_uses INTEGER,
  max_uses_per_customer INTEGER,

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,

  -- Targeting (NULL = all tours in this org)
  applicable_tour_ids TEXT[],
  applicable_variant_ids TEXT[],

  -- Tracking
  current_uses INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Code unique within organization
  CONSTRAINT promotional_codes_code_org_unique UNIQUE (organization_id, code),
  CONSTRAINT promotional_codes_validity CHECK (valid_until > valid_from)
);

CREATE INDEX promotional_codes_org_idx ON promotional_codes (organization_id);
CREATE INDEX promotional_codes_org_code_idx ON promotional_codes (organization_id, code);
CREATE INDEX promotional_codes_org_status_validity_idx
  ON promotional_codes (organization_id, status, valid_from, valid_until);
```

#### Guides

```sql
CREATE TABLE guides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  user_id TEXT,  -- FK to auth users (optional)

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  bio TEXT,
  photo TEXT,
  languages TEXT[] NOT NULL DEFAULT '{"en"}',

  certifications JSONB DEFAULT '[]',
  default_availability JSONB DEFAULT '{}',

  status guide_status NOT NULL DEFAULT 'active',

  rating DECIMAL(3, 2),
  total_tours_led INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Email unique within organization
  CONSTRAINT guides_email_org_unique UNIQUE (organization_id, email)
);

CREATE INDEX guides_org_idx ON guides (organization_id);
CREATE INDEX guides_org_status_idx ON guides (organization_id, status);
```

#### Tour Guide Assignments (which guides can lead which tours)

```sql
CREATE TABLE tour_guide_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,

  is_primary BOOLEAN NOT NULL DEFAULT false,  -- Primary guide for this tour

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tour_guide_assignments_unique UNIQUE (tour_id, guide_id)
);
```

#### Schedules

```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE RESTRICT,
  variant_id TEXT NOT NULL REFERENCES tour_variants(id) ON DELETE RESTRICT,

  -- When
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Capacity
  capacity INTEGER NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,

  -- Assignment
  assigned_guide_id TEXT REFERENCES guides(id) ON DELETE SET NULL,

  status schedule_status NOT NULL DEFAULT 'open',

  notes TEXT,
  special_instructions TEXT,

  generated_from_pattern BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedules_capacity CHECK (booked_count <= capacity),
  CONSTRAINT schedules_time CHECK (end_time > start_time)
);

-- Critical indexes for availability queries (all include organization_id)
CREATE INDEX schedules_org_idx ON schedules (organization_id);
CREATE INDEX schedules_org_tour_date_idx ON schedules (organization_id, tour_id, date);
CREATE INDEX schedules_org_date_status_idx ON schedules (organization_id, date, status);
CREATE INDEX schedules_org_guide_date_idx ON schedules (organization_id, assigned_guide_id, date);

-- For finding open schedules with availability
CREATE INDEX schedules_availability_idx
  ON schedules (organization_id, tour_id, date, status)
  WHERE status = 'open';
```

#### Bookings

```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ⬇️ EVERY TENANT TABLE HAS THIS
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  reference_number TEXT NOT NULL,

  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT,

  -- Pricing snapshot
  subtotal_amount INTEGER NOT NULL,
  subtotal_currency TEXT NOT NULL DEFAULT 'USD',
  discounts JSONB DEFAULT '[]',
  taxes JSONB DEFAULT '[]',
  total_amount INTEGER NOT NULL,
  total_currency TEXT NOT NULL DEFAULT 'USD',

  -- Payment
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_intent_id TEXT,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  paid_currency TEXT NOT NULL DEFAULT 'USD',
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  refunded_currency TEXT NOT NULL DEFAULT 'USD',

  -- Status
  status booking_status NOT NULL DEFAULT 'pending',

  -- Source
  source TEXT NOT NULL DEFAULT 'website'
    CHECK (source IN ('website', 'admin', 'phone', 'partner', 'ota')),
  promotional_code_id TEXT REFERENCES promotional_codes(id),

  -- Customer notes
  special_requests TEXT,
  dietary_restrictions TEXT,

  -- Staff notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Reference number unique within organization
  CONSTRAINT bookings_reference_org_unique UNIQUE (organization_id, reference_number)
);

-- Indexes (all include organization_id for tenant-scoped queries)
CREATE INDEX bookings_org_idx ON bookings (organization_id);
CREATE INDEX bookings_org_reference_idx ON bookings (organization_id, reference_number);
CREATE INDEX bookings_org_customer_idx ON bookings (organization_id, customer_id);
CREATE INDEX bookings_org_schedule_idx ON bookings (organization_id, schedule_id);
CREATE INDEX bookings_org_status_idx ON bookings (organization_id, status);
CREATE INDEX bookings_org_created_idx ON bookings (organization_id, created_at DESC);
CREATE INDEX bookings_payment_intent_idx ON bookings (payment_intent_id);
```

#### Booking Line Items

```sql
CREATE TABLE booking_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  pricing_tier_id TEXT NOT NULL REFERENCES pricing_tiers(id),
  tier_name TEXT NOT NULL,  -- Snapshot

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_amount INTEGER NOT NULL,
  unit_price_currency TEXT NOT NULL DEFAULT 'USD',
  total_price_amount INTEGER NOT NULL,
  total_price_currency TEXT NOT NULL DEFAULT 'USD',

  participants JSONB DEFAULT '[]',  -- Array of {firstName, lastName, age?}

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX booking_line_items_booking_idx ON booking_line_items (booking_id);
```

#### Schedule Guide Assignments (for specific schedule assignments)

```sql
CREATE TABLE schedule_guide_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined')),

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,

  notes TEXT,

  CONSTRAINT schedule_guide_assignments_unique UNIQUE (schedule_id, guide_id)
);

CREATE INDEX schedule_guide_assignments_guide_idx
  ON schedule_guide_assignments (guide_id, status);
```

#### Communications

```sql
CREATE TABLE communications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,

  channel communication_channel NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),

  type TEXT NOT NULL,  -- 'booking_confirmation', 'reminder', etc.
  subject TEXT,
  content TEXT NOT NULL,

  status communication_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,

  external_id TEXT,  -- Resend/Twilio message ID

  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX communications_customer_idx ON communications (customer_id);
CREATE INDEX communications_booking_idx ON communications (booking_id);
CREATE INDEX communications_status_idx ON communications (status);
CREATE INDEX communications_type_idx ON communications (type);
```

#### Audit Log

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Who
  actor_id TEXT,  -- User ID, or NULL for system
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'webhook')),

  -- What
  action TEXT NOT NULL,  -- 'booking.created', 'schedule.cancelled', etc.
  entity_type TEXT NOT NULL,  -- 'booking', 'schedule', 'customer', etc.
  entity_id TEXT NOT NULL,

  -- Details
  changes JSONB,  -- {before: {...}, after: {...}}
  metadata JSONB,  -- Additional context

  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);

-- Partition by month for better performance on large datasets
-- (implement when data volume warrants it)
```

### Database Functions & Triggers

#### Update booked_count on booking changes

```sql
CREATE OR REPLACE FUNCTION update_schedule_booked_count()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Calculate total participants from line items
    SELECT COALESCE(SUM(quantity), 0) INTO participant_count
    FROM booking_line_items
    WHERE booking_id = NEW.id;

    UPDATE schedules
    SET booked_count = booked_count + participant_count,
        updated_at = now()
    WHERE id = NEW.schedule_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes (e.g., cancellation)
    IF OLD.status IN ('pending', 'confirmed', 'modified')
       AND NEW.status IN ('cancelled', 'no_show') THEN
      SELECT COALESCE(SUM(quantity), 0) INTO participant_count
      FROM booking_line_items
      WHERE booking_id = NEW.id;

      UPDATE schedules
      SET booked_count = booked_count - participant_count,
          updated_at = now()
      WHERE id = NEW.schedule_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('pending', 'confirmed', 'modified') THEN
      SELECT COALESCE(SUM(quantity), 0) INTO participant_count
      FROM booking_line_items
      WHERE booking_id = OLD.id;

      UPDATE schedules
      SET booked_count = booked_count - participant_count,
          updated_at = now()
      WHERE id = OLD.schedule_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_schedule_booked_count();
```

#### Auto-update schedule status when full

```sql
CREATE OR REPLACE FUNCTION check_schedule_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booked_count >= NEW.capacity AND NEW.status = 'open' THEN
    NEW.status := 'full';
  ELSIF NEW.booked_count < NEW.capacity AND NEW.status = 'full' THEN
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_capacity_trigger
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION check_schedule_capacity();
```

#### Generate reference numbers

```sql
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  random_suffix TEXT;
BEGIN
  year_prefix := to_char(now(), 'YYYY');
  random_suffix := upper(substring(md5(random()::text) from 1 for 6));
  NEW.reference_number := 'BK-' || year_prefix || '-' || random_suffix;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_reference_trigger
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN (NEW.reference_number IS NULL)
EXECUTE FUNCTION generate_booking_reference();
```

### Key Queries

#### Check availability for a tour on a date range

```sql
-- Find available schedules for a tour in a date range
SELECT
  s.id,
  s.date,
  s.start_time,
  s.end_time,
  s.capacity,
  s.booked_count,
  s.capacity - s.booked_count as available_spots,
  t.name as tour_name,
  tv.name as variant_name,
  g.first_name || ' ' || g.last_name as guide_name
FROM schedules s
JOIN tours t ON t.id = s.tour_id
JOIN tour_variants tv ON tv.id = s.variant_id
LEFT JOIN guides g ON g.id = s.assigned_guide_id
WHERE s.tour_id = $1
  AND s.date BETWEEN $2 AND $3
  AND s.status = 'open'
  AND s.booked_count < s.capacity
ORDER BY s.date, s.start_time;
```

#### Get customer booking history with tour details

```sql
SELECT
  b.id,
  b.reference_number,
  b.status,
  b.payment_status,
  b.total_amount,
  b.total_currency,
  b.created_at,
  s.date as tour_date,
  s.start_time,
  t.name as tour_name,
  tv.name as variant_name,
  COALESCE(SUM(bli.quantity), 0) as total_participants
FROM bookings b
JOIN schedules s ON s.id = b.schedule_id
JOIN tours t ON t.id = s.tour_id
JOIN tour_variants tv ON tv.id = s.variant_id
LEFT JOIN booking_line_items bli ON bli.booking_id = b.id
WHERE b.customer_id = $1
GROUP BY b.id, s.id, t.id, tv.id
ORDER BY s.date DESC, s.start_time DESC;
```

#### Daily manifest for guides

```sql
SELECT
  s.id as schedule_id,
  s.date,
  s.start_time,
  s.end_time,
  t.name as tour_name,
  t.meeting_point_name,
  t.meeting_point_address,
  s.booked_count as total_participants,
  s.special_instructions,
  json_agg(
    json_build_object(
      'booking_reference', b.reference_number,
      'customer_name', c.first_name || ' ' || c.last_name,
      'customer_phone', c.phone,
      'participant_count', (
        SELECT SUM(quantity) FROM booking_line_items WHERE booking_id = b.id
      ),
      'special_requests', b.special_requests,
      'dietary_restrictions', b.dietary_restrictions
    )
  ) as bookings
FROM schedules s
JOIN tours t ON t.id = s.tour_id
LEFT JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
LEFT JOIN customers c ON c.id = b.customer_id
WHERE s.assigned_guide_id = $1
  AND s.date = $2
  AND s.status IN ('open', 'full')
GROUP BY s.id, t.id
ORDER BY s.start_time;
```

#### Revenue report by period

```sql
SELECT
  date_trunc('day', s.date) as period,
  t.id as tour_id,
  t.name as tour_name,
  COUNT(DISTINCT b.id) as booking_count,
  SUM(b.total_amount) as gross_revenue,
  SUM(b.refunded_amount) as refunded_amount,
  SUM(b.total_amount - b.refunded_amount) as net_revenue,
  SUM(
    (SELECT SUM(quantity) FROM booking_line_items WHERE booking_id = b.id)
  ) as total_participants
FROM bookings b
JOIN schedules s ON s.id = b.schedule_id
JOIN tours t ON t.id = s.tour_id
WHERE b.status IN ('confirmed', 'completed')
  AND b.payment_status IN ('paid', 'partially_refunded')
  AND s.date BETWEEN $1 AND $2
GROUP BY date_trunc('day', s.date), t.id
ORDER BY period DESC, net_revenue DESC;
```

---

## API Design

### tRPC Router Structure

```typescript
// src/server/routers/index.ts
import { router } from '../trpc';
import { bookingRouter } from './booking';
import { customerRouter } from './customer';
import { tourRouter } from './tour';
import { scheduleRouter } from './schedule';
import { guideRouter } from './guide';
import { reportRouter } from './report';
import { communicationRouter } from './communication';

export const appRouter = router({
  booking: bookingRouter,
  customer: customerRouter,
  tour: tourRouter,
  schedule: scheduleRouter,
  guide: guideRouter,
  report: reportRouter,
  communication: communicationRouter,
});

export type AppRouter = typeof appRouter;
```

### Booking Router (Core Example)

```typescript
// src/server/routers/booking.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { bookingService } from '../services/booking.service';
import { TRPCError } from '@trpc/server';

const createBookingSchema = z.object({
  scheduleId: z.string(),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
  }),
  lineItems: z.array(z.object({
    pricingTierId: z.string(),
    quantity: z.number().int().positive(),
    participants: z.array(z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number().int().optional(),
    })).optional(),
  })),
  promotionalCode: z.string().optional(),
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
});

const updateBookingSchema = z.object({
  id: z.string(),
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

export const bookingRouter = router({
  // Public: Create a new booking (returns payment intent)
  create: publicProcedure
    .input(createBookingSchema)
    .mutation(async ({ input }) => {
      return bookingService.create(input);
    }),

  // Public: Get booking by reference (for customer lookup)
  getByReference: publicProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ input }) => {
      const booking = await bookingService.getByReference(input.reference);
      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return booking;
    }),

  // Protected: Get booking by ID (admin)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return bookingService.getById(input.id);
    }),

  // Protected: List bookings with filters
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
      scheduleId: z.string().optional(),
      customerId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      search: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return bookingService.list(input);
    }),

  // Protected: Update booking
  update: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ input, ctx }) => {
      return bookingService.update(input, ctx.user);
    }),

  // Public: Cancel booking (customer self-service)
  cancel: publicProcedure
    .input(z.object({
      reference: z.string(),
      email: z.string().email(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return bookingService.cancelByCustomer(input);
    }),

  // Protected: Admin cancel with refund control
  adminCancel: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string(),
      refundAmount: z.number().optional(), // Specific amount, or full refund if omitted
    }))
    .mutation(async ({ input, ctx }) => {
      return bookingService.adminCancel(input, ctx.user);
    }),

  // Protected: Confirm payment (webhook usually handles this)
  confirmPayment: protectedProcedure
    .input(z.object({
      id: z.string(),
      paymentIntentId: z.string(),
    }))
    .mutation(async ({ input }) => {
      return bookingService.confirmPayment(input);
    }),

  // Protected: Get booking statistics
  stats: protectedProcedure
    .input(z.object({
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .query(async ({ input }) => {
      return bookingService.getStats(input);
    }),
});
```

### Schedule Router

```typescript
// src/server/routers/schedule.ts
export const scheduleRouter = router({
  // Public: Get available schedules for booking
  getAvailability: publicProcedure
    .input(z.object({
      tourId: z.string(),
      variantId: z.string().optional(),
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .query(async ({ input }) => {
      return scheduleService.getAvailability(input);
    }),

  // Protected: Create schedule (single or bulk)
  create: protectedProcedure
    .input(z.object({
      tourId: z.string(),
      variantId: z.string(),
      dates: z.array(z.date()),
      startTime: z.string(),
      capacity: z.number().int().positive().optional(),
      guideId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return scheduleService.createBulk(input, ctx.user);
    }),

  // Protected: Generate schedules from pattern
  generateFromPattern: protectedProcedure
    .input(z.object({
      variantId: z.string(),
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      return scheduleService.generateFromPattern(input, ctx.user);
    }),

  // Protected: Update schedule
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      capacity: z.number().int().positive().optional(),
      guideId: z.string().nullable().optional(),
      status: z.enum(['open', 'closed']).optional(),
      specialInstructions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return scheduleService.update(input, ctx.user);
    }),

  // Protected: Cancel schedule (with booking handling)
  cancel: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string(),
      notifyCustomers: z.boolean().default(true),
      offerReschedule: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      return scheduleService.cancel(input, ctx.user);
    }),

  // Protected: Get schedule manifest (for guides)
  getManifest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return scheduleService.getManifest(input.id);
    }),

  // Protected: List schedules with filters
  list: protectedProcedure
    .input(z.object({
      tourId: z.string().optional(),
      guideId: z.string().optional(),
      status: z.enum(['open', 'full', 'closed', 'cancelled', 'completed']).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return scheduleService.list(input);
    }),
});
```

### REST Endpoints (Webhooks & External)

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService } from '@/server/services/payment.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await paymentService.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await paymentService.handlePaymentFailure(event.data.object);
        break;

      case 'charge.refunded':
        await paymentService.handleRefund(event.data.object);
        break;

      case 'charge.dispute.created':
        await paymentService.handleDispute(event.data.object);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### API Response Patterns

```typescript
// Paginated list response
interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
}

// Booking creation response
interface BookingCreationResponse {
  booking: {
    id: string;
    referenceNumber: string;
    status: BookingStatus;
    total: Money;
  };
  payment: {
    clientSecret: string;  // Stripe PaymentIntent client secret
    publishableKey: string;
  };
}

// Availability response
interface AvailabilityResponse {
  schedules: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    availableSpots: number;
    pricing: Array<{
      tierId: string;
      name: string;
      price: Money;
    }>;
  }>;
}
```

---

## Key Workflows

### 1. Booking Flow (Happy Path)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOOKING FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Customer                    Frontend                    Backend                  External
   │                           │                           │                        │
   │  1. Select tour/date      │                           │                        │
   │ ─────────────────────────▶│                           │                        │
   │                           │  2. Fetch availability    │                        │
   │                           │ ─────────────────────────▶│                        │
   │                           │                           │                        │
   │                           │  3. Return schedules      │                        │
   │                           │ ◀─────────────────────────│                        │
   │  4. Display options       │                           │                        │
   │ ◀─────────────────────────│                           │                        │
   │                           │                           │                        │
   │  5. Select schedule       │                           │                        │
   │     + quantities          │                           │                        │
   │ ─────────────────────────▶│                           │                        │
   │                           │  6. Calculate price       │                        │
   │                           │ ─────────────────────────▶│                        │
   │                           │     (with promo code)     │                        │
   │                           │                           │                        │
   │                           │  7. Return pricing        │                        │
   │                           │ ◀─────────────────────────│                        │
   │  8. Show total            │                           │                        │
   │ ◀─────────────────────────│                           │                        │
   │                           │                           │                        │
   │  9. Enter details         │                           │                        │
   │     + submit              │                           │                        │
   │ ─────────────────────────▶│                           │                        │
   │                           │  10. Create booking       │                        │
   │                           │ ─────────────────────────▶│                        │
   │                           │                           │                        │
   │                           │      ┌─────────────────────────────────────┐       │
   │                           │      │ 11. In transaction:                 │       │
   │                           │      │   - Create/find customer            │       │
   │                           │      │   - Check availability (FOR UPDATE) │       │
   │                           │      │   - Create booking (status=pending) │       │
   │                           │      │   - Reserve capacity                │       │
   │                           │      │   - Create PaymentIntent ──────────────────▶│ Stripe
   │                           │      │   - Emit booking.created event      │       │
   │                           │      └─────────────────────────────────────┘       │
   │                           │                           │                        │
   │                           │  12. Return booking +     │                        │
   │                           │      payment client secret│                        │
   │                           │ ◀─────────────────────────│                        │
   │                           │                           │                        │
   │  13. Show Stripe Elements │                           │                        │
   │ ◀─────────────────────────│                           │                        │
   │                           │                           │                        │
   │  14. Enter payment        │                           │                        │
   │ ─────────────────────────▶│                           │                        │
   │                           │  15. Confirm payment ────────────────────────────▶│ Stripe
   │                           │                           │                        │
   │                           │                           │  16. Webhook:          │
   │                           │                           │ ◀─────────────────────│ payment_intent
   │                           │                           │      .succeeded        │
   │                           │      ┌─────────────────────────────────────┐       │
   │                           │      │ 17. Handle payment success:         │       │
   │                           │      │   - Update booking (status=confirmed)│      │
   │                           │      │   - Emit booking.confirmed event    │       │
   │                           │      └─────────────────────────────────────┘       │
   │                           │                           │                        │
   │                           │                           │  18. Inngest triggers: │
   │                           │                           │   - Send confirmation  │
   │                           │                           │     email              │
   │                           │                           │   - Send SMS           │
   │                           │                           │   - Schedule reminder  │
   │                           │                           │                        │
   │  19. Redirect to          │                           │                        │
   │      confirmation page    │                           │                        │
   │ ◀─────────────────────────│                           │                        │
   │                           │                           │                        │
```

### 2. Booking Creation Service (Implementation Detail)

```typescript
// src/server/services/booking.service.ts

interface CreateBookingInput {
  scheduleId: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  lineItems: Array<{
    pricingTierId: string;
    quantity: number;
    participants?: Array<{
      firstName: string;
      lastName: string;
      age?: number;
    }>;
  }>;
  promotionalCode?: string;
  specialRequests?: string;
  dietaryRestrictions?: string;
}

export async function create(input: CreateBookingInput) {
  return await db.transaction(async (tx) => {
    // 1. Get schedule with lock to prevent race conditions
    const schedule = await tx
      .select()
      .from(schedules)
      .where(eq(schedules.id, input.scheduleId))
      .for('update')
      .get();

    if (!schedule) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
    }

    if (schedule.status !== 'open') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Schedule is not available for booking'
      });
    }

    // 2. Calculate total participants
    const totalParticipants = input.lineItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // 3. Check capacity
    const availableSpots = schedule.capacity - schedule.bookedCount;
    if (totalParticipants > availableSpots) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Only ${availableSpots} spots available`,
      });
    }

    // 4. Find or create customer
    let customer = await tx
      .select()
      .from(customers)
      .where(eq(customers.email, input.customer.email.toLowerCase()))
      .get();

    if (!customer) {
      [customer] = await tx
        .insert(customers)
        .values({
          email: input.customer.email.toLowerCase(),
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone,
          source: 'website',
        })
        .returning();
    }

    // 5. Calculate pricing
    const pricing = await calculatePricing(tx, {
      scheduleId: schedule.id,
      tourId: schedule.tourId,
      date: schedule.date,
      lineItems: input.lineItems,
      promotionalCode: input.promotionalCode,
    });

    // 6. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.total.amount,
      currency: pricing.total.currency.toLowerCase(),
      metadata: {
        bookingId: 'pending', // Will update after booking created
        customerId: customer.id,
        scheduleId: schedule.id,
      },
    });

    // 7. Create booking
    const [booking] = await tx
      .insert(bookings)
      .values({
        customerId: customer.id,
        scheduleId: schedule.id,
        subtotalAmount: pricing.subtotal.amount,
        subtotalCurrency: pricing.subtotal.currency,
        discounts: pricing.discounts,
        taxes: pricing.taxes,
        totalAmount: pricing.total.amount,
        totalCurrency: pricing.total.currency,
        paymentIntentId: paymentIntent.id,
        specialRequests: input.specialRequests,
        dietaryRestrictions: input.dietaryRestrictions,
        source: 'website',
        promotionalCodeId: pricing.appliedPromoCodeId,
      })
      .returning();

    // 8. Create line items
    for (const item of input.lineItems) {
      const tier = pricing.lineItemPricing.find(
        (p) => p.tierId === item.pricingTierId
      )!;

      await tx.insert(bookingLineItems).values({
        bookingId: booking.id,
        pricingTierId: item.pricingTierId,
        tierName: tier.tierName,
        quantity: item.quantity,
        unitPriceAmount: tier.unitPrice.amount,
        unitPriceCurrency: tier.unitPrice.currency,
        totalPriceAmount: tier.totalPrice.amount,
        totalPriceCurrency: tier.totalPrice.currency,
        participants: item.participants || [],
      });
    }

    // 9. Update PaymentIntent with booking ID
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: { bookingId: booking.id },
    });

    // 10. Emit event (processed after transaction commits)
    await eventEmitter.emit('booking.created', {
      bookingId: booking.id,
      customerId: customer.id,
      scheduleId: schedule.id,
    });

    return {
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        total: {
          amount: booking.totalAmount,
          currency: booking.totalCurrency,
        },
      },
      payment: {
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      },
    };
  });
}
```

### 3. Schedule Cancellation Flow

When a schedule is cancelled, all associated bookings need to be handled:

```typescript
// src/server/services/schedule.service.ts

interface CancelScheduleInput {
  id: string;
  reason: string;
  notifyCustomers: boolean;
  offerReschedule: boolean;
}

export async function cancel(input: CancelScheduleInput, user: User) {
  return await db.transaction(async (tx) => {
    // 1. Get schedule with bookings
    const schedule = await tx
      .select()
      .from(schedules)
      .where(eq(schedules.id, input.id))
      .get();

    if (!schedule) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (schedule.status === 'cancelled' || schedule.status === 'completed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Schedule cannot be cancelled',
      });
    }

    // 2. Get all active bookings
    const activeBookings = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.scheduleId, schedule.id),
          inArray(bookings.status, ['pending', 'confirmed'])
        )
      );

    // 3. Update schedule status
    await tx
      .update(schedules)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schedules.id, schedule.id));

    // 4. Process each booking
    const refundPromises = activeBookings.map(async (booking) => {
      // Cancel booking
      await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          notes: `Cancelled due to schedule cancellation: ${input.reason}`,
        })
        .where(eq(bookings.id, booking.id));

      // Process refund if paid
      if (booking.paymentStatus === 'paid' && booking.paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: booking.paymentIntentId,
          reason: 'requested_by_customer',
        });
      }

      return booking;
    });

    const cancelledBookings = await Promise.all(refundPromises);

    // 5. Emit event for notifications
    await eventEmitter.emit('schedule.cancelled', {
      scheduleId: schedule.id,
      reason: input.reason,
      affectedBookingIds: cancelledBookings.map((b) => b.id),
      notifyCustomers: input.notifyCustomers,
      offerReschedule: input.offerReschedule,
    });

    // 6. Log audit entry
    await tx.insert(auditLogs).values({
      actorId: user.id,
      actorType: 'user',
      action: 'schedule.cancelled',
      entityType: 'schedule',
      entityId: schedule.id,
      changes: {
        reason: input.reason,
        affectedBookings: cancelledBookings.length,
      },
    });

    return {
      schedule,
      cancelledBookings: cancelledBookings.length,
      refundedAmount: cancelledBookings.reduce(
        (sum, b) => sum + (b.paymentStatus === 'paid' ? b.totalAmount : 0),
        0
      ),
    };
  });
}
```

### 4. Communication Workflow (Inngest)

```typescript
// src/inngest/functions/booking-confirmation.ts

export const sendBookingConfirmation = inngest.createFunction(
  {
    id: 'send-booking-confirmation',
    retries: 3,
  },
  { event: 'booking.confirmed' },
  async ({ event, step }) => {
    const bookingId = event.data.bookingId;

    // Step 1: Fetch all required data
    const data = await step.run('fetch-booking-data', async () => {
      const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .get();

      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, booking.customerId))
        .get();

      const schedule = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, booking.scheduleId))
        .get();

      const tour = await db
        .select()
        .from(tours)
        .where(eq(tours.id, schedule.tourId))
        .get();

      const lineItems = await db
        .select()
        .from(bookingLineItems)
        .where(eq(bookingLineItems.bookingId, bookingId));

      return { booking, customer, schedule, tour, lineItems };
    });

    // Step 2: Send confirmation email
    const emailResult = await step.run('send-email', async () => {
      const { booking, customer, schedule, tour, lineItems } = data;

      const html = await render(
        BookingConfirmationEmail({
          customerName: `${customer.firstName} ${customer.lastName}`,
          bookingReference: booking.referenceNumber,
          tourName: tour.name,
          date: format(schedule.date, 'EEEE, MMMM d, yyyy'),
          time: schedule.startTime,
          meetingPoint: tour.meetingPointName,
          meetingAddress: tour.meetingPointAddress,
          meetingInstructions: tour.meetingPointInstructions,
          participants: lineItems.reduce((sum, li) => sum + li.quantity, 0),
          total: formatMoney({
            amount: booking.totalAmount,
            currency: booking.totalCurrency,
          }),
          specialInstructions: schedule.specialInstructions,
        })
      );

      const result = await resend.emails.send({
        from: 'bookings@tourcompany.com',
        to: customer.email,
        subject: `Booking Confirmed: ${tour.name} on ${format(schedule.date, 'MMM d')}`,
        html,
      });

      return result;
    });

    // Step 3: Record communication
    await step.run('record-email-communication', async () => {
      await db.insert(communications).values({
        customerId: data.customer.id,
        bookingId: data.booking.id,
        channel: 'email',
        direction: 'outbound',
        type: 'booking_confirmation',
        subject: `Booking Confirmed: ${data.tour.name}`,
        content: 'Confirmation email sent',
        status: emailResult.error ? 'failed' : 'sent',
        sentAt: new Date(),
        externalId: emailResult.data?.id,
        failureReason: emailResult.error?.message,
      });
    });

    // Step 4: Send SMS if phone number exists
    if (data.customer.phone) {
      await step.run('send-sms', async () => {
        const message = `Your booking ${data.booking.referenceNumber} is confirmed! ${data.tour.name} on ${format(data.schedule.date, 'MMM d')} at ${data.schedule.startTime}. See email for details.`;

        await twilio.messages.create({
          to: data.customer.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message,
        });
      });
    }

    // Step 5: Schedule reminder (24 hours before)
    const reminderTime = subHours(
      new Date(`${data.schedule.date}T${data.schedule.startTime}`),
      24
    );

    if (reminderTime > new Date()) {
      await step.sleepUntil('wait-for-reminder', reminderTime);

      await step.run('send-reminder', async () => {
        // Re-fetch booking to check it's still confirmed
        const currentBooking = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, bookingId))
          .get();

        if (currentBooking.status !== 'confirmed') {
          return { skipped: true, reason: 'Booking no longer confirmed' };
        }

        // Send reminder email
        await resend.emails.send({
          from: 'bookings@tourcompany.com',
          to: data.customer.email,
          subject: `Reminder: ${data.tour.name} tomorrow!`,
          html: await render(
            BookingReminderEmail({
              customerName: data.customer.firstName,
              tourName: data.tour.name,
              time: data.schedule.startTime,
              meetingPoint: data.tour.meetingPointName,
              meetingAddress: data.tour.meetingPointAddress,
            })
          ),
        });

        return { sent: true };
      });
    }

    return { success: true, emailId: emailResult.data?.id };
  }
);
```

### 5. Availability Check Flow

Real-time availability with caching for performance:

```typescript
// src/server/services/availability.service.ts

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const AVAILABILITY_CACHE_TTL = 60; // 1 minute

interface GetAvailabilityInput {
  tourId: string;
  variantId?: string;
  dateFrom: Date;
  dateTo: Date;
}

export async function getAvailability(input: GetAvailabilityInput) {
  const cacheKey = `availability:${input.tourId}:${input.variantId || 'all'}:${input.dateFrom.toISOString()}:${input.dateTo.toISOString()}`;

  // Try cache first
  const cached = await redis.get<AvailabilityResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const schedulesQuery = db
    .select({
      id: schedules.id,
      date: schedules.date,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      capacity: schedules.capacity,
      bookedCount: schedules.bookedCount,
      variantId: schedules.variantId,
      variantName: tourVariants.name,
      specialInstructions: schedules.specialInstructions,
    })
    .from(schedules)
    .innerJoin(tourVariants, eq(tourVariants.id, schedules.variantId))
    .where(
      and(
        eq(schedules.tourId, input.tourId),
        eq(schedules.status, 'open'),
        gte(schedules.date, input.dateFrom),
        lte(schedules.date, input.dateTo),
        sql`${schedules.bookedCount} < ${schedules.capacity}`
      )
    )
    .orderBy(schedules.date, schedules.startTime);

  if (input.variantId) {
    schedulesQuery.where(eq(schedules.variantId, input.variantId));
  }

  const availableSchedules = await schedulesQuery;

  // Get pricing for each schedule
  const result = await Promise.all(
    availableSchedules.map(async (schedule) => {
      const pricing = await getPricingForSchedule(
        input.tourId,
        schedule.variantId,
        new Date(schedule.date)
      );

      return {
        id: schedule.id,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        variantId: schedule.variantId,
        variantName: schedule.variantName,
        availableSpots: schedule.capacity - schedule.bookedCount,
        specialInstructions: schedule.specialInstructions,
        pricing: pricing.map((p) => ({
          tierId: p.id,
          name: p.name,
          price: {
            amount: p.adjustedPrice,
            currency: p.currency,
          },
          isDefault: p.isDefault,
        })),
      };
    })
  );

  // Cache result
  await redis.setex(cacheKey, AVAILABILITY_CACHE_TTL, result);

  return { schedules: result };
}

// Invalidate cache when bookings change
export async function invalidateAvailabilityCache(scheduleId: string) {
  const schedule = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();

  if (schedule) {
    // Invalidate all cache keys for this tour (pattern matching)
    const keys = await redis.keys(`availability:${schedule.tourId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

---

## Infrastructure & Deployment

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │      DNS        │  │      CDN        │  │   DDoS Protection│             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       HOSTINGER VPS + COOLIFY                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          COOLIFY (PaaS Layer)                           │  │
│  │                     Git Push → Auto Deploy Pipeline                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     TRAEFIK (Reverse Proxy)                             │  │
│  │            Auto SSL via Let's Encrypt • Subdomain Routing              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                            │
│       ┌──────────────────────────┼──────────────────────────┐                │
│       │                          │                          │                │
│       ▼                          ▼                          ▼                │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │   CRM APP    │         │   WEB APP    │         │   WORKER     │         │
│  │  (Next.js)   │         │  (Next.js)   │         │  (Inngest)   │         │
│  └──────────────┘         └──────────────┘         └──────────────┘         │
│                                  │                                            │
│  ┌───────────────────────────────┴────────────────────────────────────────┐  │
│  │                        SELF-HOSTED (COOLIFY)                            │  │
│  │                                                                          │  │
│  │                        ┌─────────────┐                                  │  │
│  │                        │    Redis    │                                  │  │
│  │                        │    Cache    │                                  │  │
│  │                        └─────────────┘                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────────┐
        │                 EXTERNAL SERVICES                  │
        │                                                    │
        │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
        │  │ STRIPE  │  │ RESEND  │  │ TWILIO  │           │
        │  │Payments │  │ Email   │  │SMS/Voice│           │
        │  └─────────┘  └─────────┘  └─────────┘           │
        │                                                    │
        │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
        │  │ CLERK   │  │ SENTRY  │  │ INNGEST │           │
        │  │  Auth   │  │ Errors  │  │ (Cloud) │           │
        │  └─────────┘  └─────────┘  └─────────┘           │
        │                                                    │
        │  ┌─────────────────────────────────────────┐     │
        │  │               SUPABASE                   │     │
        │  │  PostgreSQL │ Storage │ Realtime         │     │
        │  └─────────────────────────────────────────┘     │
        └────────────────────────────────────────────────────┘
```

### Why Hybrid Architecture (Coolify + Supabase)?

| Component | Where | Why |
|-----------|-------|-----|
| **Apps (CRM, Web)** | Hostinger VPS + Coolify | Cost-effective, git-push deploys |
| **Redis** | Self-hosted (Coolify) | Session storage, caching, no egress costs |
| **PostgreSQL** | Supabase | Managed backups, RLS, connection pooling |
| **Storage** | Supabase | CDN included, no setup required |
| **Realtime** | Supabase | Built-in WebSocket for live updates |

**Benefits:**
- **Low starting cost**: Supabase free tier + ~$15-40/mo VPS
- **Less ops burden**: Database managed, apps self-hosted
- **Best of both worlds**: Control over compute, managed data layer

### Coolify Services Configuration

```yaml
# Managed via Coolify UI - shown here for reference
# Note: Database & Storage on Supabase (external)

# Redis Cache (self-hosted for sessions & caching)
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data

# CRM App (Next.js) - deployed via git push
# Web App (Next.js) - deployed via git push
# Inngest Worker - deployed via git push
```

### Environment Configuration

```bash
# .env.local (development)
# .env.production (set in Coolify dashboard)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001
NODE_ENV=development

# Supabase (Database + Storage)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Redis (self-hosted via Coolify)
REDIS_URL=redis://localhost:6379

# Auth (Clerk - external service)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Payments (Stripe - external service)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend - external service)
RESEND_API_KEY=re_xxx
EMAIL_FROM=bookings@tourcompany.com

# SMS (Twilio - external service)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Background Jobs (Inngest - cloud service)
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
INNGEST_DEV=true  # For local development

# Monitoring (Sentry - external service)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### Recommended Hostinger VPS Specs

| Environment | Plan | Specs | Monthly Cost |
|-------------|------|-------|--------------|
| **Development** | KVM 1 | 4GB RAM, 2 vCPU, 100GB SSD | ~$10 |
| **Staging** | KVM 2 | 8GB RAM, 4 vCPU, 200GB SSD | ~$20 |
| **Production** | KVM 4 | 16GB RAM, 8 vCPU, 400GB SSD | ~$40 |
| **Production+** | KVM 8 | 32GB RAM, 8 vCPU, 400GB SSD | ~$80 |

### Backup Strategy

**Supabase Backups (Automatic):**
- Free tier: Daily backups, 7-day retention
- Pro tier: Point-in-time recovery (PITR)
- Pro tier: Can download manual backups from dashboard

**Redis Backups (Self-hosted - if needed):**
```bash
# Redis RDB snapshot (via Coolify scheduled task)
redis-cli BGSAVE
cp /data/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb

# Upload to external storage (optional - Redis data is cache/sessions)
rclone copy /backups/redis b2:tourcrm-backups/redis/
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Database Migrations

```bash
# Using Drizzle Kit

# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Push schema directly (development)
pnpm drizzle-kit push:pg

# Apply migrations (production)
pnpm drizzle-kit migrate
```

### Monitoring & Observability

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

// Initialize in instrumentation.ts
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

// Custom error boundary for booking flow
export function captureBookingError(
  error: Error,
  context: { bookingId?: string; customerId?: string; step: string }
) {
  Sentry.captureException(error, {
    tags: {
      domain: 'booking',
      step: context.step,
    },
    extra: context,
  });
}
```

### Cost Estimation (Monthly)

| Service | Tier | Estimated Cost | Notes |
|---------|------|----------------|-------|
| **Hostinger VPS** | KVM 2-4 | $15-40 | Apps + Redis (4-8 vCPU, 8-16GB RAM) |
| **Coolify** | Self-hosted | $0 | Open-source PaaS |
| **Supabase** | Free → Pro | $0-25 | Free: 500MB DB, 1GB storage |
| **Redis** | Self-hosted | $0 | Included in VPS |
| **Clerk** | Free → Pro | $0-25 | Free up to 10k MAU |
| **Inngest** | Free → Pro | $0-50 | Free tier generous |
| **Resend** | Free → Pro | $0-20 | Free tier: 3k/month |
| **Twilio** | Pay-as-you-go | ~$50 | Depends on SMS volume |
| **Stripe** | 2.9% + 30¢ | Variable | Per transaction |
| **Sentry** | Team | $26 | Error tracking |
| **Cloudflare** | Free | $0 | DNS + basic protection |
| **Total (Start)** | | **~$15-40** | Free tiers for most services |
| **Total (Scale)** | | **~$150-250** | After upgrading to paid tiers |

---

## Build Roadmap

### Phase 0: Foundation (Week 1-2)

**Goal:** Deployable skeleton with core infrastructure

```
Priority: CRITICAL
Dependency: None

Deliverables:
├── Project scaffolding
│   ├── Next.js 15 with App Router
│   ├── TypeScript strict mode
│   ├── ESLint + Prettier config
│   ├── Tailwind CSS + shadcn/ui
│   └── tRPC setup
│
├── Database setup
│   ├── Supabase project creation
│   ├── Drizzle schema (core tables)
│   ├── Migration workflow
│   └── Seed data scripts
│
├── Authentication
│   ├── Clerk integration
│   ├── Protected routes
│   └── Role-based middleware
│
├── CI/CD
│   ├── GitHub Actions workflow
│   ├── Coolify deployment
│   └── Preview deployments
│
└── Monitoring
    ├── Sentry integration
    └── Basic logging
```

### Phase 1: Core Booking Engine (Week 3-5)

**Goal:** End-to-end booking flow working

```
Priority: CRITICAL
Dependency: Phase 0

Deliverables:
├── Tour Management (Admin)
│   ├── Tour CRUD
│   ├── Variant management
│   ├── Pricing tier setup
│   └── Image upload (Supabase Storage)
│
├── Schedule Management (Admin)
│   ├── Manual schedule creation
│   ├── Bulk schedule generation
│   ├── Calendar view
│   └── Capacity management
│
├── Public Booking Flow
│   ├── Tour listing page
│   ├── Tour detail page
│   ├── Availability display
│   ├── Booking form
│   └── Checkout (Stripe Elements)
│
├── Payment Processing
│   ├── Stripe integration
│   ├── Payment intent creation
│   ├── Webhook handling
│   └── Receipt generation
│
└── Booking Management (Admin)
    ├── Booking list view
    ├── Booking detail view
    ├── Manual booking creation
    └── Cancellation with refund
```

### Phase 2: Customer & Communications (Week 6-7)

**Goal:** Customer relationship management and automated communications

```
Priority: HIGH
Dependency: Phase 1

Deliverables:
├── Customer Management
│   ├── Customer list with search
│   ├── Customer detail view
│   ├── Booking history
│   ├── Notes & tags
│   └── Merge duplicates
│
├── Email Communications
│   ├── Resend integration
│   ├── React Email templates
│   │   ├── Booking confirmation
│   │   ├── Booking reminder (24h)
│   │   ├── Cancellation notice
│   │   └── Review request
│   └── Communication log
│
├── SMS Communications
│   ├── Twilio integration
│   ├── Confirmation SMS
│   ├── Reminder SMS
│   └── Opt-out handling
│
└── Background Jobs (Inngest)
    ├── Confirmation workflow
    ├── Reminder scheduling
    └── Failed payment retry
```

### Phase 3: Guide Operations (Week 8-9)

**Goal:** Guide management and operational tools

```
Priority: HIGH
Dependency: Phase 1

Deliverables:
├── Guide Management
│   ├── Guide profiles
│   ├── Availability settings
│   ├── Tour qualifications
│   └── Performance tracking
│
├── Schedule Assignments
│   ├── Assign guides to schedules
│   ├── Guide calendar view
│   ├── Conflict detection
│   └── Assignment notifications
│
├── Guide Portal
│   ├── Guide login (simplified)
│   ├── Upcoming schedules
│   ├── Tour manifests
│   └── Customer contact info
│
└── Manifests & Rosters
    ├── Daily manifest generation
    ├── Print-friendly format
    └── PDF export
```

### Phase 4: Advanced Pricing & Promotions (Week 10-11)

**Goal:** Flexible pricing and promotional capabilities

```
Priority: MEDIUM
Dependency: Phase 1

Deliverables:
├── Seasonal Pricing
│   ├── Season definition
│   ├── Price adjustments
│   └── Date range management
│
├── Promotional Codes
│   ├── Code creation
│   ├── Usage limits
│   ├── Tour targeting
│   └── Analytics
│
├── Group Discounts
│   ├── Quantity-based pricing
│   └── Automatic application
│
└── Early Bird Pricing
    ├── Advance booking discounts
    └── Time-based rules
```

### Phase 5: Reporting & Analytics (Week 12-13)

**Goal:** Business intelligence and operational insights

```
Priority: MEDIUM
Dependency: Phase 1-3

Deliverables:
├── Dashboard
│   ├── Today's overview
│   ├── Upcoming bookings
│   ├── Revenue summary
│   └── Capacity utilization
│
├── Reports
│   ├── Revenue by tour/period
│   ├── Customer acquisition
│   ├── Guide performance
│   ├── Cancellation analysis
│   └── Export to CSV
│
├── Real-time Updates
│   ├── Supabase Realtime
│   ├── Live booking notifications
│   └── Capacity changes
│
└── Audit Log
    ├── Action tracking
    ├── Change history
    └── Compliance support
```

### Phase 6: Polish & Optimization (Week 14-15)

**Goal:** Production-ready quality

```
Priority: MEDIUM
Dependency: Phase 1-5

Deliverables:
├── Performance
│   ├── Query optimization
│   ├── Caching strategy
│   ├── Image optimization
│   └── Bundle analysis
│
├── UX Improvements
│   ├── Loading states
│   ├── Error handling
│   ├── Mobile responsiveness
│   └── Accessibility audit
│
├── Testing
│   ├── Unit tests (critical paths)
│   ├── Integration tests
│   ├── E2E tests (Playwright)
│   └── Load testing
│
└── Documentation
    ├── API documentation
    ├── Admin user guide
    └── Deployment runbook
```

### Future Phases (Backlog)

```
Phase 7: Public API
├── RESTful API for partners
├── API key management
├── Rate limiting
├── Documentation (OpenAPI)
└── Sandbox environment

Phase 8: OTA Integration
├── Viator integration
├── GetYourGuide integration
├── Availability sync
└── Booking import

Phase 9: Mobile App
├── React Native app
├── Guide-focused features
├── Offline manifest access
└── Push notifications

Phase 10: Advanced Features
├── Multi-currency support
├── Multi-language UI
├── Waitlist management
├── Gift cards
├── Loyalty program
└── AI-powered recommendations
```

### Milestone Summary

| Phase | Duration | Key Deliverable | Success Criteria |
|-------|----------|-----------------|------------------|
| 0 | 2 weeks | Deployable skeleton | CI/CD working, can deploy |
| 1 | 3 weeks | Booking engine | Can take and process a booking |
| 2 | 2 weeks | Communications | Automated confirmations sent |
| 3 | 2 weeks | Guide operations | Guides can see manifests |
| 4 | 2 weeks | Advanced pricing | Promo codes working |
| 5 | 2 weeks | Reporting | Dashboard with key metrics |
| 6 | 2 weeks | Polish | Ready for real users |

**Total: ~15 weeks to CRM MVP, ~22 weeks to Web App, ~27 weeks to SaaS**

---

## Analytics Architecture

### Analytics Strategy

For a cutting-edge platform, analytics must be first-class—not an afterthought. We implement a three-tier approach:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ANALYTICS ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │  First-Party    │   │  Product        │   │  Business       │           │
│  │  Event Store    │   │  Analytics      │   │  Intelligence   │           │
│  │  (PostgreSQL)   │   │  (PostHog)      │   │  (Metabase)     │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           │  Critical events    │  User behavior      │  Reports &          │
│           │  for attribution    │  & funnels          │  dashboards         │
│           │                     │                     │                     │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────┘
            │                     │                     │
            └──────────┬──────────┴──────────┬──────────┘
                       │                     │
                       ▼                     ▼
              Revenue Attribution    Conversion Optimization
```

### Event Taxonomy

All analytics events follow a consistent structure:

```typescript
interface AnalyticsEvent {
  // Identity
  eventId: string;              // Unique event ID (CUID2)
  eventName: string;            // e.g., 'tour.viewed', 'booking.started'

  // Context
  organizationId: string;       // Multi-tenant scoping
  sessionId: string;            // Browser session
  userId?: string;              // If authenticated
  customerId?: string;          // If identified customer

  // Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;

  // Device
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;

  // Event-specific
  properties: Record<string, unknown>;

  // Timing
  timestamp: Date;
  clientTimestamp: Date;
}
```

### Critical Events (First-Party Storage)

These events are stored in PostgreSQL for attribution and revenue analysis:

```typescript
// Booking funnel events
type FunnelEvent =
  | 'page.viewed'           // Any page view
  | 'tour.viewed'           // Tour detail page
  | 'tour.availability_checked' // Checked dates
  | 'booking.started'       // Started checkout
  | 'booking.contact_entered'   // Entered contact info
  | 'booking.payment_initiated' // Started payment
  | 'booking.completed'     // Payment successful
  | 'booking.abandoned';    // Left without completing

// Engagement events
type EngagementEvent =
  | 'tour.wishlisted'
  | 'tour.shared'
  | 'review.viewed'
  | 'email.opened'
  | 'email.clicked';
```

### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id),

  -- Event identity
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  customer_id TEXT REFERENCES customers(id),

  -- Attribution (captured on first event of session)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  landing_page TEXT,

  -- Device
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_hash TEXT,  -- Hashed for privacy

  -- Event data
  properties JSONB DEFAULT '{}',

  -- Related entities
  tour_id TEXT,
  schedule_id TEXT,
  booking_id TEXT,

  -- Timing
  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX analytics_events_org_name_idx
  ON analytics_events (organization_id, event_name, created_at DESC);
CREATE INDEX analytics_events_session_idx
  ON analytics_events (session_id, created_at);
CREATE INDEX analytics_events_customer_idx
  ON analytics_events (customer_id, created_at DESC);
CREATE INDEX analytics_events_booking_funnel_idx
  ON analytics_events (organization_id, created_at DESC)
  WHERE event_name IN ('tour.viewed', 'booking.started', 'booking.completed');

-- Partition by month for performance (implement when data volume warrants)
```

### Conversion Funnel Queries

```sql
-- Conversion funnel for a period
WITH funnel AS (
  SELECT
    session_id,
    MAX(CASE WHEN event_name = 'tour.viewed' THEN 1 ELSE 0 END) as viewed,
    MAX(CASE WHEN event_name = 'booking.started' THEN 1 ELSE 0 END) as started,
    MAX(CASE WHEN event_name = 'booking.contact_entered' THEN 1 ELSE 0 END) as contact,
    MAX(CASE WHEN event_name = 'booking.payment_initiated' THEN 1 ELSE 0 END) as payment,
    MAX(CASE WHEN event_name = 'booking.completed' THEN 1 ELSE 0 END) as completed
  FROM analytics_events
  WHERE organization_id = $1
    AND created_at BETWEEN $2 AND $3
  GROUP BY session_id
)
SELECT
  COUNT(*) as total_sessions,
  SUM(viewed) as viewed_tour,
  SUM(started) as started_checkout,
  SUM(contact) as entered_contact,
  SUM(payment) as initiated_payment,
  SUM(completed) as completed_booking,
  ROUND(100.0 * SUM(started) / NULLIF(SUM(viewed), 0), 2) as view_to_start_rate,
  ROUND(100.0 * SUM(completed) / NULLIF(SUM(started), 0), 2) as start_to_complete_rate
FROM funnel;
```

### Attribution Queries

```sql
-- Revenue attribution by source
SELECT
  COALESCE(ae.utm_source, 'direct') as source,
  COALESCE(ae.utm_medium, 'none') as medium,
  COUNT(DISTINCT b.id) as bookings,
  SUM(b.total_amount) as revenue,
  AVG(b.total_amount) as avg_order_value,
  COUNT(DISTINCT ae.session_id) as sessions,
  ROUND(100.0 * COUNT(DISTINCT b.id) / NULLIF(COUNT(DISTINCT ae.session_id), 0), 2) as conversion_rate
FROM analytics_events ae
LEFT JOIN bookings b ON b.id = ae.booking_id AND b.status = 'confirmed'
WHERE ae.organization_id = $1
  AND ae.created_at BETWEEN $2 AND $3
  AND ae.event_name = 'booking.started'  -- First touch of booking funnel
GROUP BY ae.utm_source, ae.utm_medium
ORDER BY revenue DESC;
```

### Third-Party Analytics Integration

```typescript
// lib/analytics.ts
import posthog from 'posthog-js';

export const analytics = {
  // Initialize on client
  init(organizationId: string) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://app.posthog.com',
      loaded: (posthog) => {
        posthog.register({ organization_id: organizationId });
      },
    });
  },

  // Track event (sends to PostHog + our backend)
  async track(eventName: string, properties: Record<string, unknown> = {}) {
    // PostHog for user behavior
    posthog.capture(eventName, properties);

    // Our backend for attribution (critical events only)
    if (CRITICAL_EVENTS.includes(eventName)) {
      await fetch('/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ eventName, properties }),
      });
    }
  },

  // Identify user
  identify(customerId: string, traits: Record<string, unknown> = {}) {
    posthog.identify(customerId, traits);
  },
};

const CRITICAL_EVENTS = [
  'tour.viewed',
  'booking.started',
  'booking.contact_entered',
  'booking.payment_initiated',
  'booking.completed',
  'booking.abandoned',
];
```

---

## SEO Architecture

### SEO Strategy for Web App

The Web App must be SEO-optimized from day one. Tour operators depend on organic search traffic.

### Technical SEO Implementation

```typescript
// app/web/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://book.tourcompany.com'),
  title: {
    template: '%s | Tour Company',
    default: 'Tour Company - Amazing Tours',
  },
  description: 'Book incredible tours with Tour Company',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Tour Company',
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### Dynamic Metadata per Page

```typescript
// app/web/tours/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const tour = await getTourBySlug(params.slug);

  return {
    title: tour.metaTitle || tour.name,
    description: tour.metaDescription || tour.shortDescription,
    openGraph: {
      title: tour.name,
      description: tour.shortDescription,
      images: [{ url: tour.coverImage, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: tour.name,
      description: tour.shortDescription,
      images: [tour.coverImage],
    },
  };
}
```

### Structured Data (Schema.org)

```typescript
// components/TourStructuredData.tsx
export function TourStructuredData({ tour, schedules }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: tour.name,
    description: tour.fullDescription,
    image: tour.gallery,
    address: {
      '@type': 'PostalAddress',
      streetAddress: tour.meetingPointAddress,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: tour.meetingPointLat,
      longitude: tour.meetingPointLng,
    },
    aggregateRating: tour.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: tour.averageRating,
      reviewCount: tour.reviewCount,
    } : undefined,
    offers: schedules.map(schedule => ({
      '@type': 'Offer',
      url: `https://book.tourcompany.com/tours/${tour.slug}?date=${schedule.date}`,
      price: schedule.lowestPrice,
      priceCurrency: 'USD',
      availability: schedule.availableSpots > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      validFrom: new Date().toISOString(),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### Sitemap Generation

```typescript
// app/web/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tours = await getActiveTours();
  const categories = await getCategories();

  const tourUrls = tours.map((tour) => ({
    url: `https://book.tourcompany.com/tours/${tour.slug}`,
    lastModified: tour.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((cat) => ({
    url: `https://book.tourcompany.com/tours/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: 'https://book.tourcompany.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://book.tourcompany.com/tours',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...tourUrls,
    ...categoryUrls,
  ];
}
```

### Robots.txt

```typescript
// app/web/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/booking/payment/', '/admin/'],
    },
    sitemap: 'https://book.tourcompany.com/sitemap.xml',
  };
}
```

---

## Performance Architecture

### Performance Targets

| Metric | Target | Critical Path |
|--------|--------|---------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Tour images, page content |
| **FID** (First Input Delay) | < 100ms | JavaScript hydration |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Image dimensions, fonts |
| **TTFB** (Time to First Byte) | < 500ms | Server response |
| **FCP** (First Contentful Paint) | < 1.5s | Initial render |

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CACHING LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Browser          CDN (Cloudflare)       Redis (Self-hosted)  Database      │
│  ────────         ────────────────       ──────────────────   ────────      │
│                                                                              │
│  • Static assets  • Static pages         • Availability       • Source of   │
│    (immutable)    • Cached pages           (60s TTL)           truth        │
│  • API responses  • Tour detail          • Pricing            • Queries     │
│    (stale-while-    pages                  (5 min TTL)                       │
│     revalidate)   • Tour listings        • Session data                     │
│                                          • Rate limits                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Caching Implementation

```typescript
// Availability caching with stale-while-revalidate
const AVAILABILITY_CACHE_TTL = 60; // 1 minute
const AVAILABILITY_STALE_TTL = 300; // 5 minutes stale allowed

export async function getAvailability(tourId: string, dateRange: DateRange) {
  const cacheKey = `availability:${tourId}:${dateRange.start}:${dateRange.end}`;

  // Try cache
  const cached = await redis.get<CachedAvailability>(cacheKey);

  if (cached) {
    const age = Date.now() - cached.timestamp;

    // Fresh data
    if (age < AVAILABILITY_CACHE_TTL * 1000) {
      return cached.data;
    }

    // Stale but usable - return stale, revalidate in background
    if (age < AVAILABILITY_STALE_TTL * 1000) {
      // Don't await - fire and forget
      revalidateAvailability(tourId, dateRange, cacheKey);
      return cached.data;
    }
  }

  // No cache or too stale - fetch fresh
  return fetchAndCacheAvailability(tourId, dateRange, cacheKey);
}

// Invalidate on booking
export async function invalidateAvailabilityCache(scheduleId: string) {
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, scheduleId),
  });

  if (schedule) {
    // Pattern-based invalidation
    const pattern = `availability:${schedule.tourId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Image Optimization

```typescript
// next.config.ts
const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

// Component usage
<Image
  src={tour.coverImage}
  alt={tour.name}
  width={800}
  height={600}
  priority={isAboveFold}
  placeholder="blur"
  blurDataURL={tour.coverImageBlur}
/>
```

### Database Performance

```typescript
// Connection pooling for serverless
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Query optimization patterns
// Use select() for specific columns instead of findFirst/findMany
const bookings = await db
  .select({
    id: bookingsTable.id,
    reference: bookingsTable.referenceNumber,
    status: bookingsTable.status,
    total: bookingsTable.totalAmount,
  })
  .from(bookingsTable)
  .where(eq(bookingsTable.customerId, customerId))
  .orderBy(desc(bookingsTable.createdAt))
  .limit(10);
```

### Bundle Optimization

```typescript
// Lazy load heavy components
const CalendarView = dynamic(() => import('@/components/CalendarView'), {
  loading: () => <CalendarSkeleton />,
  ssr: false, // Client-only for performance
});

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```

---

## Additional Database Tables

### Tables Missing from Core Schema

#### Reviews Table

```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,

  -- Media
  photos TEXT[] DEFAULT '{}',

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_at TIMESTAMPTZ,
  moderated_by TEXT,
  rejection_reason TEXT,

  -- Response
  response TEXT,
  response_at TIMESTAMPTZ,
  response_by TEXT,

  -- Verification
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,

  -- Display
  is_featured BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reviews_one_per_booking UNIQUE (booking_id)
);

CREATE INDEX reviews_org_tour_idx ON reviews (organization_id, tour_id, status);
CREATE INDEX reviews_org_status_idx ON reviews (organization_id, status);
CREATE INDEX reviews_tour_rating_idx ON reviews (tour_id, rating) WHERE status = 'approved';
```

#### Abandoned Carts Table

```sql
CREATE TABLE abandoned_carts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Customer (may not exist yet)
  email TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),

  -- Session
  session_id TEXT NOT NULL,

  -- Cart contents
  tour_id TEXT NOT NULL REFERENCES tours(id),
  schedule_id TEXT REFERENCES schedules(id),
  variant_id TEXT REFERENCES tour_variants(id),

  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal_amount INTEGER NOT NULL,
  subtotal_currency TEXT NOT NULL DEFAULT 'USD',

  -- Checkout progress
  last_step TEXT NOT NULL DEFAULT 'cart',  -- cart, contact, payment
  contact_info JSONB,

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Recovery
  recovery_token TEXT UNIQUE,
  recovery_emails_sent INTEGER NOT NULL DEFAULT 0,
  last_recovery_email_at TIMESTAMPTZ,

  -- Outcome
  recovered_at TIMESTAMPTZ,
  recovered_booking_id TEXT REFERENCES bookings(id),
  expired_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX abandoned_carts_org_email_idx ON abandoned_carts (organization_id, email);
CREATE INDEX abandoned_carts_recovery_idx ON abandoned_carts (organization_id, recovered_at)
  WHERE recovered_at IS NULL AND expired_at IS NULL;
CREATE INDEX abandoned_carts_token_idx ON abandoned_carts (recovery_token);
```

#### Wishlists Table

```sql
CREATE TABLE wishlists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Owner (customer or anonymous)
  customer_id TEXT REFERENCES customers(id),
  session_id TEXT,
  email TEXT,  -- For anonymous with email provided

  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  -- Notifications
  notify_price_drop BOOLEAN NOT NULL DEFAULT true,
  notify_availability BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wishlists_unique_customer_tour UNIQUE (customer_id, tour_id),
  CONSTRAINT wishlists_unique_session_tour UNIQUE (session_id, tour_id)
);

CREATE INDEX wishlists_customer_idx ON wishlists (customer_id);
CREATE INDEX wishlists_tour_idx ON wishlists (tour_id);
```

#### Availability Alerts Table

```sql
CREATE TABLE availability_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),

  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  schedule_id TEXT REFERENCES schedules(id) ON DELETE CASCADE,  -- Specific date

  -- Notification status
  notified_at TIMESTAMPTZ,
  booking_id TEXT REFERENCES bookings(id),  -- If they booked

  expires_at TIMESTAMPTZ NOT NULL,  -- Auto-expire after date passes

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX availability_alerts_schedule_idx
  ON availability_alerts (schedule_id) WHERE notified_at IS NULL;
```

#### Tour FAQs Table

```sql
CREATE TABLE tour_faqs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tour_faqs_tour_idx ON tour_faqs (tour_id, sort_order);
```

#### Tour Inclusions/Exclusions Table

```sql
CREATE TABLE tour_inclusions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('inclusion', 'exclusion')),
  text TEXT NOT NULL,
  icon TEXT,  -- Optional icon identifier

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tour_inclusions_tour_idx ON tour_inclusions (tour_id, type, sort_order);
```

#### Cancellation Policies Table

```sql
CREATE TABLE cancellation_policies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Rules as JSON array
  -- [{hoursBeforeTour: 168, refundPercentage: 100}, {hoursBeforeTour: 72, refundPercentage: 50}, ...]
  rules JSONB NOT NULL DEFAULT '[]',

  is_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK to tours
ALTER TABLE tours
  ADD COLUMN cancellation_policy_id TEXT REFERENCES cancellation_policies(id);
```

#### Notification Preferences Table

```sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Can be for staff or customer
  user_id TEXT,  -- Clerk user ID for staff
  customer_id TEXT REFERENCES customers(id),

  -- Channels
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Email preferences (for customers)
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  booking_emails BOOLEAN NOT NULL DEFAULT true,
  reminder_emails BOOLEAN NOT NULL DEFAULT true,
  review_requests BOOLEAN NOT NULL DEFAULT true,

  -- Staff notification preferences
  new_booking_notify BOOLEAN NOT NULL DEFAULT true,
  cancellation_notify BOOLEAN NOT NULL DEFAULT true,
  low_availability_notify BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notification_prefs_owner CHECK (
    (user_id IS NOT NULL AND customer_id IS NULL) OR
    (user_id IS NULL AND customer_id IS NOT NULL)
  )
);
```

### Additional Fields for Existing Tables

```sql
-- Add attribution fields to customers
ALTER TABLE customers ADD COLUMN country TEXT;
ALTER TABLE customers ADD COLUMN acquisition_channel TEXT;
ALTER TABLE customers ADD COLUMN acquisition_campaign TEXT;
ALTER TABLE customers ADD COLUMN lifetime_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN booking_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_booking_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN risk_score INTEGER;  -- No-show prediction

-- Add attribution fields to bookings
ALTER TABLE bookings ADD COLUMN utm_source TEXT;
ALTER TABLE bookings ADD COLUMN utm_medium TEXT;
ALTER TABLE bookings ADD COLUMN utm_campaign TEXT;
ALTER TABLE bookings ADD COLUMN device_type TEXT;
ALTER TABLE bookings ADD COLUMN browser TEXT;
ALTER TABLE bookings ADD COLUMN checkout_started_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN checkout_completed_at TIMESTAMPTZ;

-- Add review aggregates to tours
ALTER TABLE tours ADD COLUMN average_rating DECIMAL(3,2);
ALTER TABLE tours ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tours ADD COLUMN popularity_score INTEGER NOT NULL DEFAULT 0;

-- Add more tour fields
ALTER TABLE tours ADD COLUMN highlights TEXT[] DEFAULT '{}';
ALTER TABLE tours ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging'));
ALTER TABLE tours ADD COLUMN accessibility_info TEXT;
ALTER TABLE tours ADD COLUMN languages TEXT[] DEFAULT '{"en"}';
```

---

## Appendices

### A. Glossary

| Term | Definition |
|------|------------|
| **Tour** | A product/experience being sold (template) |
| **Schedule** | A specific instance of a tour on a date/time |
| **Variant** | A version of a tour (private, group, morning, etc.) |
| **Booking** | A customer's reservation for a schedule |
| **Manifest** | List of customers for a specific tour departure |
| **OTA** | Online Travel Agency (Viator, GetYourGuide, etc.) |

### B. Key Technical Decisions Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Framework | Next.js, Remix, SvelteKit | Next.js | React ecosystem, excellent DX, hiring |
| API | REST, GraphQL, tRPC | tRPC | Type safety, small team, internal use |
| Database | Supabase, PlanetScale, Neon | Supabase | Managed PostgreSQL, real-time, storage |
| Hosting | Vercel, Railway, Self-hosted | Hostinger VPS + Coolify | Cost-effective for apps |
| Storage | S3, Cloudinary, Supabase | Supabase Storage | Included with DB, CDN |
| Jobs | BullMQ, Inngest, Temporal | Inngest | Observability, no infra, step functions |
| Auth | Clerk, Auth.js, Lucia | Clerk | Admin features, team management |
| ORM | Prisma, Drizzle, Kysely | Drizzle | SQL-like, works everywhere, light |
| Cache | Upstash, Redis self-hosted | Redis (self-hosted) | Full control, session storage |

### C. Security Considerations

1. **Payment Security**
   - PCI compliance via Stripe (never touch card data)
   - Webhook signature verification
   - Idempotency keys for mutations

2. **Data Protection**
   - Row Level Security in Supabase
   - Server-side validation with Zod
   - Parameterized queries (Drizzle handles this)

3. **Authentication**
   - MFA available via Clerk
   - Session timeout configuration
   - Role-based access control

4. **GDPR Compliance**
   - Marketing consent tracking
   - Data export capability
   - Deletion workflow (soft delete with hard delete after retention)

### D. References

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Supabase Documentation](https://supabase.com/docs)
- [Coolify Documentation](https://coolify.io/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Clerk Documentation](https://clerk.com/docs)

---

*This document is a living artifact. Update it as decisions are made and the system evolves.*
