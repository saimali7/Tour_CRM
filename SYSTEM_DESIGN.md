# Tour Operations Platform — System Design Document

**Version:** 2.0
**Last Updated:** December 2025
**Status:** Multi-Tenant Platform Architecture
**Related Documents:** ARCHITECTURE.md, FEATURES.md

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Architecture](#platform-architecture)
3. [Organization Model](#organization-model)
4. [Application Architecture](#application-architecture)
5. [Monorepo Structure](#monorepo-structure)
6. [Shared Packages](#shared-packages)
7. [Multi-Tenant Data Architecture](#multi-tenant-data-architecture)
8. [API Strategy](#api-strategy)
9. [Authentication & Authorization](#authentication--authorization)
10. [Integration Patterns](#integration-patterns)
11. [Infrastructure & Deployment](#infrastructure--deployment)
12. [Design Principles](#design-principles)
13. [Build Roadmap](#build-roadmap)

---

## Executive Summary

### The Vision

Build a **tour operations platform** that:
1. Powers your own tour business (Organization #1)
2. Can be sold as SaaS to other tour operators
3. Supports optional customer-facing booking websites per organization
4. Maintains complete data isolation between organizations

### The Problem (Expanded)

Building a tour operations platform requires solving two levels of complexity:

**Level 1: Two User Types (Customers vs Staff)**
- Customers need a fast, beautiful booking website
- Staff need a powerful CRM for operations

**Level 2: Multiple Businesses (Multi-Tenancy)**
- Each business needs isolated data
- Each business needs their own settings, branding, staff
- Each business may or may not want a booking website
- The platform owner needs oversight of all organizations

### The Solution

A **multi-tenant platform** with three layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TOUR OPERATIONS PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      PLATFORM LAYER (Super Admin)                      │  │
│  │                                                                        │  │
│  │  • Organization management (create, suspend, delete)                  │  │
│  │  • Platform-wide analytics & reporting                                │  │
│  │  • Subscription & billing management                                  │  │
│  │  • Feature flag control per organization                              │  │
│  │  • System health monitoring                                           │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      ORGANIZATION LAYER (Tenants)                      │  │
│  │                                                                        │  │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │  │
│  │   │  Organization A │  │  Organization B │  │  Organization C │      │  │
│  │   │   (Your Biz)    │  │   (Client 1)    │  │   (Client 2)    │      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  ┌───┐  ┌───┐   │  │  ┌───┐  ┌───┐   │  │  ┌───┐          │      │  │
│  │   │  │CRM│  │Web│   │  │  │CRM│  │Web│   │  │  │CRM│ (no web) │      │  │
│  │   │  └───┘  └───┘   │  │  └───┘  └───┘   │  │  └───┘          │      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  Staff: 5       │  │  Staff: 3       │  │  Staff: 2       │      │  │
│  │   │  Tours: 12      │  │  Tours: 8       │  │  Tours: 20      │      │  │
│  │   │  Plan: Pro      │  │  Plan: Starter  │  │  Plan: Pro      │      │  │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘      │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      SHARED INFRASTRUCTURE                             │  │
│  │                                                                        │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │  │
│  │   │  Database   │  │  Services   │  │  Background │  │  External   │ │  │
│  │   │ (Postgres)  │  │  (Shared)   │  │    Jobs     │  │   APIs      │ │  │
│  │   │             │  │             │  │  (Inngest)  │  │             │ │  │
│  │   │ All tables  │  │ All calls   │  │             │  │ Stripe      │ │  │
│  │   │ have org_id │  │ org-scoped  │  │ org-aware   │  │ Resend      │ │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  │ Twilio      │ │  │
│  │                                                       └─────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Multi-Tenancy** | Shared database, org_id isolation | Simpler ops, cost-effective, sufficient isolation |
| **Monorepo** | Turborepo | Shared code, atomic changes, single CI |
| **Apps** | 2 Next.js apps (CRM + Web) | Independent optimization per audience |
| **Packages** | Shared internal packages | DRY code, consistent types, org-scoped |
| **Database** | Single PostgreSQL, RLS enabled | One source of truth, row-level security |
| **Auth** | Clerk with Organizations | Built-in multi-tenant auth, RBAC |
| **Payments** | Stripe Connect | Per-organization payment processing |
| **Web App** | Optional per organization | Some orgs use API only, others want full booking site |

---

## Platform Architecture

### Three-Layer Model

The platform operates at three distinct levels:

#### Layer 1: Platform (Super Admin)

**Purpose:** Manage the platform itself, not individual organizations.

**Users:** Platform owners/operators (you and your team)

**Capabilities:**
- Create and manage organizations
- View platform-wide metrics
- Manage subscriptions and billing
- Control feature access per organization
- Handle support escalations
- System configuration

**Implementation:** Part of CRM app with super-admin routes, or separate admin app.

#### Layer 2: Organization (Tenant)

**Purpose:** A single business using the platform.

**Users:** Organization owners, admins, staff, guides

**Capabilities:**
- Full CRM functionality (scoped to their data)
- Optional booking website
- Their own customers, tours, bookings
- Their own settings and branding
- Their own staff and roles

**Implementation:** CRM app + optional Web app, both org-scoped.

#### Layer 3: Infrastructure (Shared)

**Purpose:** Common resources all organizations share.

**Components:**
- PostgreSQL database (with org isolation)
- Redis cache
- Background job processing
- Email/SMS delivery
- File storage

**Implementation:** Shared services, always org-aware.

---

### Organization Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORGANIZATION LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐          │
│   │  CREATE  │────▶│  SETUP   │────▶│  ACTIVE  │────▶│ SUSPENDED│          │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘          │
│        │                │                │                │                 │
│        │                │                │                │                 │
│        ▼                ▼                ▼                ▼                 │
│   • Org record     • Stripe        • Full           • Read-only            │
│   • Owner user       Connect         access         • No new bookings      │
│   • Default        • Branding      • All features   • Data preserved       │
│     settings       • First tour      per plan                              │
│                    • Staff invite                         │                 │
│                                                           ▼                 │
│                                                    ┌──────────┐            │
│                                                    │ DELETED  │            │
│                                                    └──────────┘            │
│                                                    • Data exported         │
│                                                    • Records purged        │
│                                                    • Stripe disconnected   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Organization Model

### Organization Entity

The Organization is the **root of all data**. Every piece of data belongs to exactly one organization.

```typescript
interface Organization {
  id: string;                        // CUID2
  
  // ─────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────
  name: string;                      // "Amazing Tours Co"
  slug: string;                      // "amazing-tours" (unique, URL-safe)
  
  // ─────────────────────────────────────────────────────────────
  // DOMAINS & URLS
  // ─────────────────────────────────────────────────────────────
  // CRM always accessible at: app.platform.com/org/{slug}
  // Or with custom domain:
  customCrmDomain?: string;          // "admin.amazingtours.com"
  
  // Booking site (if enabled):
  // Default: {slug}.book.platform.com
  // Or custom:
  customBookingDomain?: string;      // "book.amazingtours.com"
  
  // ─────────────────────────────────────────────────────────────
  // BRANDING
  // ─────────────────────────────────────────────────────────────
  logo?: string;                     // Logo URL
  logoMark?: string;                 // Square icon version
  primaryColor: string;              // Hex color
  accentColor?: string;              // Secondary color
  
  // ─────────────────────────────────────────────────────────────
  // BUSINESS INFO
  // ─────────────────────────────────────────────────────────────
  businessName: string;              // Legal name
  businessEmail: string;             // Primary contact
  businessPhone?: string;
  businessAddress?: Address;
  timezone: string;                  // IANA timezone
  defaultCurrency: string;           // ISO 4217
  defaultLanguage: string;           // ISO 639-1
  
  // ─────────────────────────────────────────────────────────────
  // SUBSCRIPTION & BILLING (Platform Level)
  // ─────────────────────────────────────────────────────────────
  plan: OrganizationPlan;
  planStartedAt: Date;
  planExpiresAt?: Date;              // For annual plans
  
  // Platform's Stripe customer (for subscription billing)
  platformStripeCustomerId: string;
  platformStripeSubscriptionId?: string;
  
  // ─────────────────────────────────────────────────────────────
  // PAYMENT PROCESSING (Organization's Own Payments)
  // ─────────────────────────────────────────────────────────────
  // Stripe Connect account for receiving booking payments
  stripeConnectAccountId?: string;
  stripeConnectStatus: 'not_started' | 'pending' | 'active' | 'restricted';
  stripeConnectOnboardingComplete: boolean;
  
  // ─────────────────────────────────────────────────────────────
  // FEATURE FLAGS
  // ─────────────────────────────────────────────────────────────
  features: OrganizationFeatures;
  
  // ─────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────
  status: 'setup' | 'active' | 'suspended' | 'deleted';
  suspendedAt?: Date;
  suspendedReason?: string;
  
  // ─────────────────────────────────────────────────────────────
  // METADATA
  // ─────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
  onboardingCompletedAt?: Date;
}

type OrganizationPlan = 
  | 'free'        // Limited features, trial
  | 'starter'     // Small operations
  | 'pro'         // Full features
  | 'enterprise'; // Custom, API access, etc.

interface OrganizationFeatures {
  // Core features (always on)
  crmAccess: true;
  
  // Optional features (plan-dependent or add-on)
  webAppEnabled: boolean;            // Booking website
  apiAccessEnabled: boolean;         // Public API
  smsEnabled: boolean;               // SMS communications
  whatsappEnabled: boolean;          // WhatsApp integration
  customDomainEnabled: boolean;      // Custom domains
  advancedReportingEnabled: boolean; // Analytics dashboard
  multiCurrencyEnabled: boolean;     // Accept multiple currencies
  
  // Limits
  maxStaffUsers: number;             // e.g., 3 for starter, unlimited for pro
  maxToursActive: number;            // e.g., 5 for starter, unlimited for pro
  maxBookingsPerMonth: number;       // e.g., 100 for starter, unlimited for pro
}
```

### Organization Settings

Each organization has configurable settings (stored in a separate table or JSON column):

```typescript
interface OrganizationSettings {
  // ─────────────────────────────────────────────────────────────
  // BOOKING SETTINGS
  // ─────────────────────────────────────────────────────────────
  booking: {
    // Booking window
    defaultBookingWindowDays: number;     // How far ahead customers can book
    minNoticeHours: number;               // Minimum hours before tour
    
    // Capacity
    maxParticipantsPerBooking: number;    // Single booking limit
    allowOverbooking: boolean;            // For waitlist
    overbookingBuffer: number;            // Extra % allowed
    
    // Checkout
    requirePhoneNumber: boolean;
    requireParticipantDetails: boolean;
    collectDietaryRestrictions: boolean;
    customCheckoutFields: CustomField[];
    
    // Terms
    termsAndConditionsUrl?: string;
    cancellationPolicyText: string;
  };
  
  // ─────────────────────────────────────────────────────────────
  // PAYMENT SETTINGS
  // ─────────────────────────────────────────────────────────────
  payments: {
    acceptedCurrencies: string[];
    acceptedPaymentMethods: PaymentMethod[];
    
    // Deposits
    allowDeposits: boolean;
    depositType: 'percentage' | 'fixed';
    depositValue: number;
    depositDueDate: 'booking' | 'days_before';
    depositDueDays?: number;
    
    // Refunds
    refundPolicy: RefundPolicy[];
  };
  
  // ─────────────────────────────────────────────────────────────
  // COMMUNICATION SETTINGS
  // ─────────────────────────────────────────────────────────────
  communications: {
    // Email
    fromName: string;                     // "Amazing Tours"
    replyToEmail: string;
    
    // Notifications
    sendBookingConfirmation: boolean;
    sendBookingReminder: boolean;
    reminderHoursBefore: number[];        // [24, 2] = 24h and 2h before
    sendPostTourFollowUp: boolean;
    followUpDelayHours: number;
    
    // SMS (if enabled)
    sendSmsReminder: boolean;
    smsReminderHoursBefore: number;
  };
  
  // ─────────────────────────────────────────────────────────────
  // TAX SETTINGS
  // ─────────────────────────────────────────────────────────────
  tax: {
    taxEnabled: boolean;
    taxRate: number;                      // Percentage
    taxLabel: string;                     // "VAT", "GST", "Sales Tax"
    taxIncludedInPrice: boolean;          // Display price includes tax?
    taxId?: string;                       // VAT number, etc.
  };
}
```

---

## Application Architecture

### Application Overview

| Application | Domain Pattern | Purpose | Users | Optional? |
|-------------|----------------|---------|-------|-----------|
| **CRM App** | `app.platform.com` | Staff administration | Organization staff | No (core) |
| **Web App** | `{slug}.book.platform.com` | Public booking | Customers | Yes (per org) |
| **Platform Admin** | `admin.platform.com` | Super admin | Platform owners | No (internal) |

### CRM App (Core Product)

**Purpose:** The primary product—staff manage all tour operations here.

**Multi-Tenant Routing:**

```
app.platform.com/
├── /                              # Redirect to org selection or last org
├── /select-org                    # Org picker (if user has multiple)
│
├── /org/[orgSlug]/                # Organization-scoped routes
│   ├── /                          # Dashboard
│   ├── /bookings                  # Booking list
│   ├── /bookings/[id]             # Booking detail
│   ├── /bookings/new              # Create booking
│   ├── /customers                 # Customer list
│   ├── /customers/[id]            # Customer profile
│   ├── /tours                     # Tour management
│   ├── /tours/[id]                # Tour editor
│   ├── /schedules                 # Schedule calendar
│   ├── /schedules/[id]            # Schedule detail
│   ├── /guides                    # Guide management
│   ├── /guides/[id]               # Guide profile
│   ├── /reports                   # Reporting
│   ├── /settings                  # Org settings
│   │   ├── /general               # Business info, branding
│   │   ├── /booking               # Booking rules
│   │   ├── /payments              # Payment config
│   │   ├── /communications        # Email/SMS settings
│   │   ├── /team                  # Staff management
│   │   ├── /integrations          # API keys, webhooks
│   │   └── /billing               # Subscription (redirects to platform)
│   │
│   └── /guide/                    # Guide portal (limited view)
│       ├── /                      # Guide dashboard
│       ├── /schedule              # My schedule
│       └── /schedule/[id]         # Tour manifest
│
└── /platform/                     # Super admin only
    ├── /organizations             # All organizations
    ├── /organizations/[id]        # Org details
    ├── /analytics                 # Platform metrics
    ├── /billing                   # Revenue, subscriptions
    └── /settings                  # Platform config
```

**Key Characteristics:**
- Always knows which organization context (`orgSlug` in URL)
- All data queries scoped to organization
- Role-based access within organization
- Real-time updates for operational data

---

### Web App (Optional Booking Site)

**Purpose:** Public booking website for organizations that want one.

**Multi-Tenant Routing:**

```
{orgSlug}.book.platform.com/       # Subdomain per org
├── /                              # Homepage with featured tours
├── /tours                         # Tour listing
├── /tours/[tourSlug]              # Tour detail page
├── /book/[scheduleId]             # Booking flow
├── /book/[scheduleId]/confirm     # Post-payment confirmation
├── /booking/[reference]           # Booking lookup
└── /booking/[reference]/manage    # Modify/cancel

OR with custom domain:

book.amazingtours.com/             # Custom domain
├── /                              # Same routes as above
└── ...
```

**Organization Resolution:**
```typescript
// middleware.ts - Resolve organization from domain/subdomain
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host');
  
  // Check for custom domain first
  let organization = await getOrgByCustomDomain(host);
  
  // Fall back to subdomain
  if (!organization) {
    const subdomain = host?.split('.')[0];
    organization = await getOrgBySlug(subdomain);
  }
  
  if (!organization) {
    return NextResponse.redirect('/not-found');
  }
  
  if (!organization.features.webAppEnabled) {
    return NextResponse.redirect('/not-available');
  }
  
  // Inject org context for all routes
  const response = NextResponse.next();
  response.headers.set('x-organization-id', organization.id);
  return response;
}
```

**Key Characteristics:**
- Organization determined by domain/subdomain
- Branding loaded from organization settings
- Only enabled if `features.webAppEnabled = true`
- Cached heavily, edge-optimized
- SEO-friendly

---

### How CRM Works Without Web App

An organization can operate fully without the Web App:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ORGANIZATION WITHOUT WEB APP                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Booking Channels:                                                         │
│   ─────────────────                                                         │
│                                                                              │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │   Phone Call    │     │   Walk-in       │     │   OTA/Partner   │      │
│   │                 │     │                 │     │                 │      │
│   │   Staff takes   │     │   Staff enters  │     │   API/webhook   │      │
│   │   booking in    │     │   booking in    │     │   creates       │      │
│   │   CRM           │     │   CRM           │     │   booking       │      │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│            │                       │                       │                │
│            └───────────────────────┼───────────────────────┘                │
│                                    │                                        │
│                                    ▼                                        │
│                          ┌─────────────────┐                               │
│                          │     CRM App     │                               │
│                          │                 │                               │
│                          │  • All bookings │                               │
│                          │  • All customers│                               │
│                          │  • All operations                               │
│                          └─────────────────┘                               │
│                                                                              │
│   The CRM is 100% functional without a booking website.                    │
│   Organizations can use their own website + API, or manual entry only.     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**CRM-Only Use Cases:**
1. **Phone/walk-in only business** — Staff manually enter all bookings
2. **Existing website** — Organization has their own site, uses API to create bookings
3. **OTA-focused** — Bookings come from Viator, GetYourGuide, etc. via API
4. **B2B operations** — Bookings come from travel agents, not end consumers

---

## Monorepo Structure

### Directory Layout

```
tour-platform/
├── apps/
│   ├── web/                        # Public booking website
│   │   ├── app/
│   │   │   ├── (marketing)/        # Homepage, about (org-branded)
│   │   │   ├── tours/              # Tour browsing
│   │   │   ├── book/               # Booking flow
│   │   │   ├── booking/            # Booking management
│   │   │   └── api/
│   │   │       └── webhooks/       # Stripe webhooks
│   │   ├── components/             # App-specific components
│   │   ├── lib/
│   │   │   ├── org-context.ts      # Organization resolution
│   │   │   └── theme.ts            # Dynamic org theming
│   │   ├── middleware.ts           # Org resolution middleware
│   │   └── package.json
│   │
│   └── crm/                        # Staff CRM + Platform Admin
│       ├── app/
│       │   ├── (auth)/             # Sign in/up
│       │   │   ├── sign-in/
│       │   │   └── sign-up/
│       │   │
│       │   ├── org/
│       │   │   └── [orgSlug]/      # Organization-scoped routes
│       │   │       ├── (dashboard)/
│       │   │       │   ├── page.tsx              # Dashboard
│       │   │       │   ├── bookings/
│       │   │       │   ├── customers/
│       │   │       │   ├── tours/
│       │   │       │   ├── schedules/
│       │   │       │   ├── guides/
│       │   │       │   ├── reports/
│       │   │       │   └── settings/
│       │   │       │       ├── general/
│       │   │       │       ├── booking/
│       │   │       │       ├── payments/
│       │   │       │       ├── communications/
│       │   │       │       ├── team/
│       │   │       │       └── integrations/
│       │   │       │
│       │   │       └── (guide)/    # Guide portal
│       │   │           └── guide/
│       │   │
│       │   ├── platform/           # Super admin (platform owners)
│       │   │   ├── layout.tsx      # Super admin check
│       │   │   ├── organizations/
│       │   │   ├── analytics/
│       │   │   ├── billing/
│       │   │   └── settings/
│       │   │
│       │   ├── select-org/         # Org picker
│       │   │
│       │   └── api/
│       │       ├── trpc/           # tRPC handler
│       │       └── webhooks/
│       │
│       ├── components/
│       ├── lib/
│       │   ├── org-context.ts      # Org from URL
│       │   └── permissions.ts      # RBAC
│       ├── middleware.ts
│       └── package.json
│
├── packages/
│   ├── database/                   # Database schema & client
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── organization.ts # Organization table
│   │   │   │   ├── customers.ts    # Has organizationId
│   │   │   │   ├── tours.ts        # Has organizationId
│   │   │   │   ├── bookings.ts     # Has organizationId
│   │   │   │   ├── schedules.ts    # Has organizationId
│   │   │   │   ├── guides.ts       # Has organizationId
│   │   │   │   └── ...             # Everything has organizationId
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── services/                   # Business logic (org-scoped)
│   │   ├── src/
│   │   │   ├── context.ts          # OrgContext type
│   │   │   ├── organization/       # Org management
│   │   │   ├── booking/            # Booking service (org-scoped)
│   │   │   ├── customer/           # Customer service (org-scoped)
│   │   │   ├── tour/               # Tour service (org-scoped)
│   │   │   ├── schedule/           # Schedule service (org-scoped)
│   │   │   ├── guide/              # Guide service (org-scoped)
│   │   │   ├── pricing/            # Pricing service (org-scoped)
│   │   │   ├── payment/            # Stripe Connect integration
│   │   │   ├── email/              # Email service (org-branded)
│   │   │   └── platform/           # Platform-level services
│   │   └── package.json
│   │
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   ├── primitives/
│   │   │   ├── forms/
│   │   │   ├── data-display/
│   │   │   └── theming/            # Org theme provider
│   │   └── package.json
│   │
│   ├── validators/                 # Zod schemas
│   │   ├── src/
│   │   │   ├── organization.ts     # Org validation
│   │   │   ├── booking.ts
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── emails/                     # React Email templates
│   │   ├── src/
│   │   │   ├── templates/
│   │   │   └── components/         # Org-branded components
│   │   └── package.json
│   │
│   └── config/                     # Shared configuration
│       ├── src/
│       │   ├── env.ts
│       │   ├── constants.ts
│       │   └── plans.ts            # Plan definitions
│       └── package.json
│
├── infrastructure/
│   ├── inngest/                    # Background jobs
│   │   └── src/
│   │       └── functions/
│   │           ├── booking/        # Org-aware jobs
│   │           ├── communications/
│   │           └── platform/       # Platform-level jobs
│   └── scripts/
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Shared Packages

### @tour/database (Multi-Tenant Schema)

Every table includes `organizationId`:

```typescript
// packages/database/src/schema/organization.ts
import { pgTable, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const organizationStatusEnum = pgEnum('organization_status', [
  'setup', 'active', 'suspended', 'deleted'
]);

export const organizationPlanEnum = pgEnum('organization_plan', [
  'free', 'starter', 'pro', 'enterprise'
]);

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  // Identity
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  
  // Domains
  customCrmDomain: text('custom_crm_domain').unique(),
  customBookingDomain: text('custom_booking_domain').unique(),
  
  // Branding
  logo: text('logo'),
  primaryColor: text('primary_color').default('#000000'),
  
  // Business info
  businessName: text('business_name').notNull(),
  businessEmail: text('business_email').notNull(),
  timezone: text('timezone').default('UTC'),
  defaultCurrency: text('default_currency').default('USD'),
  
  // Subscription
  plan: organizationPlanEnum('plan').default('free'),
  platformStripeCustomerId: text('platform_stripe_customer_id'),
  platformStripeSubscriptionId: text('platform_stripe_subscription_id'),
  
  // Stripe Connect
  stripeConnectAccountId: text('stripe_connect_account_id'),
  stripeConnectStatus: text('stripe_connect_status').default('not_started'),
  
  // Features (JSON for flexibility)
  features: jsonb('features').$type<OrganizationFeatures>().default({
    crmAccess: true,
    webAppEnabled: false,
    apiAccessEnabled: false,
    smsEnabled: false,
    whatsappEnabled: false,
    customDomainEnabled: false,
    advancedReportingEnabled: false,
    multiCurrencyEnabled: false,
    maxStaffUsers: 3,
    maxToursActive: 5,
    maxBookingsPerMonth: 100,
  }),
  
  // Settings (JSON)
  settings: jsonb('settings').$type<OrganizationSettings>(),
  
  // Status
  status: organizationStatusEnum('status').default('setup'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

```typescript
// packages/database/src/schema/customers.ts
export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  // ⬇️ EVERY TABLE HAS THIS
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Customer fields
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  // ...
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Unique email PER ORGANIZATION (same person can be customer of multiple orgs)
  uniqueEmailPerOrg: unique().on(table.organizationId, table.email),
  // Index for fast org-scoped queries
  orgIndex: index('customers_org_idx').on(table.organizationId),
}));
```

```typescript
// packages/database/src/schema/bookings.ts
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  // ⬇️ EVERY TABLE HAS THIS
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Booking fields
  referenceNumber: text('reference_number').notNull(),
  customerId: text('customer_id').references(() => customers.id),
  scheduleId: text('schedule_id').references(() => schedules.id),
  status: bookingStatusEnum('status').default('pending'),
  // ...
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Unique reference PER ORGANIZATION
  uniqueRefPerOrg: unique().on(table.organizationId, table.referenceNumber),
  orgIndex: index('bookings_org_idx').on(table.organizationId),
}));
```

---

### @tour/services (Organization-Scoped)

All services require organization context:

```typescript
// packages/services/src/context.ts
export interface OrgContext {
  organizationId: string;
  organization?: Organization;  // Populated when needed
}

// Factory function to create org-scoped services
export function createServices(ctx: OrgContext) {
  return {
    booking: new BookingService(ctx),
    customer: new CustomerService(ctx),
    tour: new TourService(ctx),
    schedule: new ScheduleService(ctx),
    guide: new GuideService(ctx),
    pricing: new PricingService(ctx),
  };
}
```

```typescript
// packages/services/src/booking/booking.service.ts
import { db } from '@tour/database';
import { bookings, customers } from '@tour/database/schema';
import { eq, and } from 'drizzle-orm';
import type { OrgContext } from '../context';

export class BookingService {
  constructor(private ctx: OrgContext) {}
  
  // All queries automatically scoped to organization
  async getById(id: string) {
    return await db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, id),
        eq(bookings.organizationId, this.ctx.organizationId)  // ⬅️ Always scoped
      ),
      with: {
        customer: true,
        schedule: { with: { tour: true } },
        lineItems: true,
      },
    });
  }
  
  async getAll(filters?: BookingFilters) {
    return await db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, this.ctx.organizationId),  // ⬅️ Always scoped
        // ... other filters
      ),
      orderBy: desc(bookings.createdAt),
    });
  }
  
  async create(input: CreateBookingInput) {
    return await db.transaction(async (tx) => {
      // Validate schedule belongs to this org
      const schedule = await tx.query.schedules.findFirst({
        where: and(
          eq(schedules.id, input.scheduleId),
          eq(schedules.organizationId, this.ctx.organizationId)  // ⬅️ Validate
        ),
      });
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      
      // Create booking with org ID
      const [booking] = await tx.insert(bookings).values({
        organizationId: this.ctx.organizationId,  // ⬅️ Set org
        scheduleId: input.scheduleId,
        customerId: input.customerId,
        referenceNumber: await this.generateReference(),
        // ...
      }).returning();
      
      return booking;
    });
  }
  
  private async generateReference(): Promise<string> {
    // Generate unique reference within this organization
    const prefix = 'BK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
```

---

### Usage in Apps

```typescript
// apps/crm/app/org/[orgSlug]/(dashboard)/bookings/page.tsx
import { createServices } from '@tour/services';
import { getOrgContext } from '@/lib/org-context';

export default async function BookingsPage({ params }: { params: { orgSlug: string } }) {
  const ctx = await getOrgContext(params.orgSlug);
  const services = createServices(ctx);
  
  const bookings = await services.booking.getAll();
  
  return <BookingList bookings={bookings} />;
}
```

```typescript
// apps/crm/lib/org-context.ts
import { auth } from '@clerk/nextjs';
import { db } from '@tour/database';
import { organizations, organizationMembers } from '@tour/database/schema';

export async function getOrgContext(orgSlug: string): Promise<OrgContext> {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Get organization
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  // Verify user has access to this org
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.userId, userId),
    ),
  });
  
  if (!membership) {
    throw new Error('Access denied');
  }
  
  return {
    organizationId: org.id,
    organization: org,
    membership,
  };
}
```

---

## Multi-Tenant Data Architecture

### Data Isolation Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA ISOLATION MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Strategy: Shared Database, Logical Isolation                              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        PostgreSQL Database                           │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │   organizations                                                      │  │
│   │   ├── id: "org_abc123"  (Org A)                                     │  │
│   │   ├── id: "org_def456"  (Org B)                                     │  │
│   │   └── id: "org_ghi789"  (Org C)                                     │  │
│   │                                                                      │  │
│   │   customers                                                          │  │
│   │   ├── id: "cust_1", organization_id: "org_abc123"  ─┐               │  │
│   │   ├── id: "cust_2", organization_id: "org_abc123"   │ Org A's data  │  │
│   │   ├── id: "cust_3", organization_id: "org_abc123"  ─┘               │  │
│   │   ├── id: "cust_4", organization_id: "org_def456"  ─┐               │  │
│   │   ├── id: "cust_5", organization_id: "org_def456"  ─┘ Org B's data  │  │
│   │   └── ...                                                            │  │
│   │                                                                      │  │
│   │   bookings                                                           │  │
│   │   ├── organization_id: "org_abc123"  ─── Org A can only see these   │  │
│   │   ├── organization_id: "org_def456"  ─── Org B can only see these   │  │
│   │   └── ...                                                            │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Isolation enforced at:                                                    │
│   1. Application layer (services always filter by org_id)                   │
│   2. Database layer (RLS policies as defense in depth)                      │
│   3. API layer (org context validated before any operation)                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Row-Level Security (Defense in Depth)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Policy: Users can only see their organization's data
-- (org_id passed via app.current_organization_id setting)
CREATE POLICY org_isolation ON customers
  USING (organization_id = current_setting('app.current_organization_id'));

CREATE POLICY org_isolation ON tours
  USING (organization_id = current_setting('app.current_organization_id'));

CREATE POLICY org_isolation ON bookings
  USING (organization_id = current_setting('app.current_organization_id'));
```

```typescript
// Set org context before queries (in services)
async function withOrgContext<T>(
  organizationId: string,
  fn: () => Promise<T>
): Promise<T> {
  await db.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, true)`);
  return await fn();
}
```

### Cross-Organization Data (Platform Level)

Some data spans organizations (platform-level):

```typescript
// Platform-level tables (NO organizationId)
export const platformUsers = pgTable('platform_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  isSuperAdmin: boolean('is_super_admin').default(false),
  // Platform-level user (can be member of multiple orgs)
});

export const organizationMembers = pgTable('organization_members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id),
  userId: text('user_id').references(() => platformUsers.id),
  role: memberRoleEnum('role'),
  // Links users to organizations
});

export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id'), // Optional - null for platform actions
  actorId: text('actor_id'),
  action: text('action'),
  // Platform-wide audit trail
});
```

---

## API Strategy

### Internal API (tRPC) — Organization-Scoped

```typescript
// apps/crm/server/trpc/routers/booking.ts
import { router, orgProcedure } from '../trpc';
import { createServices } from '@tour/services';

export const bookingRouter = router({
  list: orgProcedure
    .input(bookingFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      // ctx.orgContext is guaranteed by orgProcedure
      const services = createServices(ctx.orgContext);
      return services.booking.getAll(input);
    }),
  
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const services = createServices(ctx.orgContext);
      return services.booking.getById(input.id);
    }),
  
  create: orgProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices(ctx.orgContext);
      return services.booking.create(input);
    }),
});
```

```typescript
// apps/crm/server/trpc/trpc.ts
import { initTRPC } from '@trpc/server';
import { getOrgContext } from '@/lib/org-context';

const t = initTRPC.context<Context>().create();

// Procedure that requires organization context
export const orgProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.orgSlug) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization required' });
  }
  
  const orgContext = await getOrgContext(ctx.orgSlug);
  
  return next({
    ctx: {
      ...ctx,
      orgContext,
    },
  });
});

// Procedure for platform-level operations (super admin)
export const platformProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.isSuperAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Public API (REST) — For External Integrations

Organizations with `apiAccessEnabled` can use the public API:

```typescript
// apps/crm/app/api/v1/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createServices } from '@tour/services';

export async function GET(req: NextRequest) {
  // Authenticate via API key
  const auth = await validateApiKey(req);
  
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // API key is scoped to organization
  const services = createServices({ organizationId: auth.organizationId });
  
  // Route handling...
}
```

```typescript
// API keys are organization-scoped
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),           // "Production", "Viator Integration"
  keyHash: text('key_hash').notNull(),    // Hashed API key
  permissions: jsonb('permissions'),       // What this key can do
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Authentication & Authorization

### Multi-Tenant Auth with Clerk

```typescript
// Clerk Organizations map to our Organizations
// Users can be members of multiple organizations

// apps/crm/middleware.ts
import { authMiddleware, clerkClient } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/sign-in', '/sign-up', '/api/webhooks(.*)'],
  
  afterAuth: async (auth, req) => {
    if (!auth.userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
    
    const path = req.nextUrl.pathname;
    
    // Platform routes require super admin
    if (path.startsWith('/platform')) {
      const user = await clerkClient.users.getUser(auth.userId);
      if (!user.publicMetadata.isSuperAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
    
    // Org routes require membership
    const orgMatch = path.match(/^\/org\/([^\/]+)/);
    if (orgMatch) {
      const orgSlug = orgMatch[1];
      const hasAccess = await verifyOrgMembership(auth.userId, orgSlug);
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/select-org', req.url));
      }
    }
  },
});
```

### Role-Based Access Control (Per Organization)

```typescript
// packages/services/src/permissions.ts

export type OrgRole = 'owner' | 'admin' | 'manager' | 'support' | 'guide';

export const ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  owner: ['*'],  // Everything
  
  admin: [
    'bookings:*',
    'customers:*',
    'tours:*',
    'schedules:*',
    'guides:*',
    'reports:*',
    'settings:read',
    'settings:booking',
    'settings:communications',
    'team:read',
    'team:invite',
  ],
  
  manager: [
    'bookings:*',
    'customers:read',
    'customers:update',
    'tours:read',
    'schedules:*',
    'guides:read',
    'guides:assign',
    'reports:read',
  ],
  
  support: [
    'bookings:read',
    'bookings:update',
    'customers:read',
    'customers:update',
    'schedules:read',
  ],
  
  guide: [
    'schedules:read:assigned',   // Only their assigned schedules
    'bookings:read:assigned',    // Only bookings on their schedules
  ],
};

export function hasPermission(
  role: OrgRole,
  permission: string
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  
  // Check wildcard patterns (e.g., 'bookings:*' matches 'bookings:read')
  const [resource, action] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  
  return false;
}
```

### Platform Super Admin

```typescript
// Super admins can access any organization (for support)
interface PlatformUser {
  id: string;
  email: string;
  isSuperAdmin: boolean;
}

// In middleware, super admins bypass org membership check
if (user.isSuperAdmin) {
  // Can access any org for support/debugging
  // Actions are logged to platform audit log
}
```

---

## Integration Patterns

### Event-Driven Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION-SCOPED EVENTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Event Payload Always Includes:                                            │
│   {                                                                          │
│     organizationId: "org_abc123",   // ⬅️ Every event is org-scoped        │
│     eventType: "booking.created",                                           │
│     data: { ... }                                                           │
│   }                                                                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         Inngest                                      │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │   booking.created ────────┬────▶ Send confirmation email            │  │
│   │   (org_abc123)            │      (uses org's email settings)        │  │
│   │                           │                                          │  │
│   │                           ├────▶ Schedule reminder                   │  │
│   │                           │      (uses org's reminder settings)      │  │
│   │                           │                                          │  │
│   │                           └────▶ Update org's analytics              │  │
│   │                                                                      │  │
│   │   booking.created ────────┬────▶ Send confirmation email            │  │
│   │   (org_def456)            │      (different org, different settings) │  │
│   │                           │                                          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// infrastructure/inngest/src/functions/booking-confirmation.ts
import { inngest } from '../client';
import { createServices } from '@tour/services';
import { db } from '@tour/database';

export const sendBookingConfirmation = inngest.createFunction(
  { id: 'send-booking-confirmation' },
  { event: 'booking.created' },
  async ({ event }) => {
    const { organizationId, bookingId } = event.data;
    
    // Load organization for settings/branding
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    
    // Create org-scoped services
    const services = createServices({ organizationId, organization: org });
    
    // Get booking details
    const booking = await services.booking.getById(bookingId);
    
    // Send email using org's settings
    await services.email.sendBookingConfirmation({
      to: booking.customer.email,
      booking,
      // Email uses org's branding, from address, etc.
    });
  }
);
```

### Stripe Connect (Per-Organization Payments)

```typescript
// packages/services/src/payment/stripe-connect.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class PaymentService {
  constructor(private ctx: OrgContext) {}
  
  // Create payment intent on organization's connected account
  async createPaymentIntent(amount: number, currency: string) {
    const org = this.ctx.organization!;
    
    if (!org.stripeConnectAccountId) {
      throw new Error('Organization has not completed Stripe setup');
    }
    
    // Calculate platform fee (your revenue)
    const platformFee = Math.round(amount * 0.02);  // 2% platform fee
    
    return await stripe.paymentIntents.create({
      amount,
      currency,
      // Payment goes to connected account
      transfer_data: {
        destination: org.stripeConnectAccountId,
      },
      // Platform takes a fee
      application_fee_amount: platformFee,
      metadata: {
        organizationId: org.id,
      },
    });
  }
  
  // Onboard organization to Stripe Connect
  async createConnectOnboardingLink(returnUrl: string) {
    const org = this.ctx.organization!;
    
    // Create connected account if doesn't exist
    if (!org.stripeConnectAccountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: org.businessEmail,
        metadata: {
          organizationId: org.id,
        },
      });
      
      // Save account ID
      await db.update(organizations)
        .set({ stripeConnectAccountId: account.id })
        .where(eq(organizations.id, org.id));
      
      org.stripeConnectAccountId = account.id;
    }
    
    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: org.stripeConnectAccountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return accountLink.url;
  }
}
```

---

## Infrastructure & Deployment

### Multi-Tenant Domain Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PLATFORM DOMAINS (Fixed)                                                  │
│   ────────────────────────                                                  │
│   app.tourplatform.com        → CRM App (all organizations)                │
│   admin.tourplatform.com      → Platform Admin (super admin only)          │
│                                                                              │
│   ORGANIZATION BOOKING SITES (Dynamic)                                      │
│   ────────────────────────────────────                                      │
│   {slug}.book.tourplatform.com  → Web App (per org subdomain)              │
│   │                                                                         │
│   ├── amazingtours.book.tourplatform.com  (Org A)                          │
│   ├── cityadventures.book.tourplatform.com (Org B)                         │
│   └── foodietours.book.tourplatform.com   (Org C)                          │
│                                                                              │
│   CUSTOM DOMAINS (Premium Feature)                                          │
│   ────────────────────────────────                                          │
│   book.amazingtours.com       → Web App (custom domain for Org A)          │
│   reservations.cityadv.com    → Web App (custom domain for Org B)          │
│                                                                              │
│   API ENDPOINTS                                                             │
│   ─────────────                                                             │
│   api.tourplatform.com/v1/    → Public API (org determined by API key)     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                          CLOUDFLARE                                  │  │
│   │                                                                      │  │
│   │   • DNS for all domains                                             │  │
│   │   • SSL termination                                                 │  │
│   │   • DDoS protection                                                 │  │
│   │   • Wildcard subdomain routing (*.book.tourplatform.com)           │  │
│   │   • Custom domain SSL provisioning                                  │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                           VERCEL                                     │  │
│   │                                                                      │  │
│   │   ┌─────────────────────┐    ┌─────────────────────┐               │  │
│   │   │      CRM App        │    │      Web App        │               │  │
│   │   │                     │    │                     │               │  │
│   │   │  app.platform.com   │    │  *.book.platform.com│               │  │
│   │   │                     │    │  + custom domains   │               │  │
│   │   │  • Org routing      │    │                     │               │  │
│   │   │  • Platform admin   │    │  • Subdomain routing│               │  │
│   │   │  • API endpoints    │    │  • Org theming      │               │  │
│   │   │                     │    │  • Edge caching     │               │  │
│   │   └─────────────────────┘    └─────────────────────┘               │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      SHARED INFRASTRUCTURE                           │  │
│   │                                                                      │  │
│   │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │  │
│   │   │   Supabase    │  │    Upstash    │  │    Inngest    │          │  │
│   │   │               │  │               │  │               │          │  │
│   │   │  PostgreSQL   │  │    Redis      │  │  Background   │          │  │
│   │   │  (multi-      │  │    (cache)    │  │    Jobs       │          │  │
│   │   │   tenant)     │  │               │  │               │          │  │
│   │   │               │  │  org-prefixed │  │  org-aware    │          │  │
│   │   │  Storage      │  │    keys       │  │  functions    │          │  │
│   │   │  (org folders)│  │               │  │               │          │  │
│   │   └───────────────┘  └───────────────┘  └───────────────┘          │  │
│   │                                                                      │  │
│   │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │  │
│   │   │    Clerk      │  │ Stripe Connect│  │    Resend     │          │  │
│   │   │               │  │               │  │               │          │  │
│   │   │  Multi-org    │  │  Per-org      │  │  Per-org      │          │  │
│   │   │    auth       │  │   payments    │  │   sending     │          │  │
│   │   │               │  │               │  │               │          │  │
│   │   └───────────────┘  └───────────────┘  └───────────────┘          │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```bash
# ─────────────────────────────────────────────────────────────
# PLATFORM (Your Infrastructure)
# ─────────────────────────────────────────────────────────────
DATABASE_URL=                        # Supabase PostgreSQL
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ─────────────────────────────────────────────────────────────
# PLATFORM STRIPE (Your Billing)
# ─────────────────────────────────────────────────────────────
# For billing organizations for their subscriptions
STRIPE_SECRET_KEY=                   # Platform's Stripe account
STRIPE_WEBHOOK_SECRET=

# ─────────────────────────────────────────────────────────────
# STRIPE CONNECT (Organization Payments)
# ─────────────────────────────────────────────────────────────
# Same keys - Connect uses your platform account
STRIPE_CONNECT_CLIENT_ID=            # For OAuth onboarding

# ─────────────────────────────────────────────────────────────
# AUTH (Clerk)
# ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# ─────────────────────────────────────────────────────────────
# COMMUNICATIONS
# ─────────────────────────────────────────────────────────────
RESEND_API_KEY=                      # Platform sends on behalf of orgs
TWILIO_ACCOUNT_SID=                  # Optional
TWILIO_AUTH_TOKEN=

# ─────────────────────────────────────────────────────────────
# APP URLS
# ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_CRM_URL=https://app.tourplatform.com
NEXT_PUBLIC_BOOKING_BASE_URL=https://book.tourplatform.com
NEXT_PUBLIC_PLATFORM_ADMIN_URL=https://admin.tourplatform.com
```

---

## Design Principles

### 1. Organization as Root

Every piece of business data belongs to exactly one organization. There are no orphan records.

```typescript
// ✅ Good - Organization is always present
const booking = {
  id: 'bk_123',
  organizationId: 'org_abc',  // Always required
  customerId: 'cust_456',
  // ...
};

// ❌ Bad - Missing organization context
const booking = {
  id: 'bk_123',
  customerId: 'cust_456',
  // Missing organizationId
};
```

### 2. Defense in Depth

Isolation is enforced at multiple layers:

```
Request → Auth (Clerk) → Middleware (org access) → Services (org filter) → DB (RLS)
          └── Who is user?  └── Can access org?    └── Filter queries    └── Final check
```

### 3. Shared Infrastructure, Isolated Data

Infrastructure is shared for cost efficiency; data is strictly isolated.

```typescript
// Same Redis instance, different key prefixes
const cacheKey = `org:${organizationId}:tours:${tourId}`;

// Same database, always filtered
WHERE organization_id = $orgId

// Same Inngest, events carry org context
{ organizationId, eventType, data }
```

### 4. Optional Features, Not Optional Architecture

The Web App is optional per organization, but the architecture always supports it.

```typescript
// Organization might not have Web App enabled
if (!org.features.webAppEnabled) {
  // CRM still fully functional
  // API still works
  // Just no public booking site
}
```

### 5. Platform Revenue Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REVENUE STREAMS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. SUBSCRIPTION FEES                                                      │
│      Organizations pay monthly/annual for platform access                   │
│      └── Starter: $X/mo, Pro: $Y/mo, Enterprise: Custom                    │
│                                                                              │
│   2. TRANSACTION FEES (Optional)                                            │
│      Platform takes % of each booking via Stripe Connect                    │
│      └── application_fee_amount on payment intents                         │
│                                                                              │
│   3. ADD-ON FEATURES                                                        │
│      SMS packs, additional users, custom domains, etc.                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Build Roadmap

### Phase 1: Foundation (Multi-Tenant Core)

**Goal:** CRM works for one organization (yours) with multi-tenant architecture in place.

```
Week 1-2: Infrastructure
├── Monorepo setup (Turborepo, pnpm)
├── Database schema with organizationId on all tables
├── Clerk integration with organizations
├── Basic org context in services
└── Deploy to Vercel

Week 3-4: Core CRM Features
├── Organization dashboard
├── Tour management (CRUD)
├── Schedule management
├── Basic booking creation (manual)
└── Customer management

Week 5-6: Booking & Payments
├── Stripe Connect onboarding
├── Payment processing
├── Booking flow (CRM-side)
└── Basic email notifications
```

### Phase 2: Operational Features

**Goal:** CRM is fully functional for day-to-day operations.

```
Week 7-8: Operations
├── Guide management
├── Schedule calendar
├── Booking modifications/cancellations
├── Refund processing
└── Communication templates

Week 9-10: Reporting & Settings
├── Basic reports (revenue, bookings)
├── Organization settings
├── Team management (invite, roles)
└── Notification preferences
```

### Phase 3: Web App (Optional Booking Site)

**Goal:** Organizations can enable a booking website.

```
Week 11-12: Web App
├── Subdomain routing
├── Organization theming
├── Tour browsing
├── Booking checkout
├── Customer self-service (view/modify booking)
└── Integration with CRM
```

### Phase 4: Platform Scale

**Goal:** Ready to onboard other organizations.

```
Week 13-14: Platform Features
├── Organization onboarding flow
├── Subscription billing (Stripe)
├── Platform admin dashboard
├── Feature flag management
└── Usage tracking & limits

Week 15+: Growth Features
├── Custom domains
├── Public API
├── Advanced reporting
├── Integrations (OTAs, etc.)
└── Mobile apps (future)
```

---

## Summary

### What Changed (Single-Tenant → Multi-Tenant)

| Aspect | Before | After |
|--------|--------|-------|
| **Data Model** | No org concept | `organizationId` on every table |
| **Services** | Global access | Organization-scoped |
| **Auth** | Single business | Clerk Organizations |
| **Payments** | Single Stripe account | Stripe Connect per org |
| **Web App** | Assumed always present | Optional per organization |
| **Platform** | N/A | Super admin layer added |

### The Three Products

1. **CRM** — Core product, always available, powers all operations
2. **Web App** — Optional booking site per organization
3. **Platform** — Your admin layer for managing organizations

### Key Architectural Wins

1. **Your business is Organization #1** — Use the platform yourself
2. **Sell to others** — Onboard new organizations anytime
3. **Web App optional** — Some orgs only need CRM + API
4. **Single codebase** — Monorepo keeps everything together
5. **Scalable** — Shared infrastructure, isolated data

---

*Document Version: 2.0 | Last Updated: December 2025 | Architecture: Multi-Tenant Platform*
