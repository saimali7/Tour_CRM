# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

A **multi-tenant tour operations platform** designed to:
1. Power the owner's tour business (Organization #1)
2. Be sold as SaaS to other tour operators
3. Support optional customer-facing booking websites per organization
4. Maintain complete data isolation between organizations

## Architecture Documents

| Document | Purpose |
|----------|---------|
| `SYSTEM_DESIGN.md` | Multi-tenant architecture, organization model, three-layer platform design, monorepo structure |
| `ARCHITECTURE.md` | Domain model, database schema, API design, tech stack decisions with rationale |
| `FEATURES.md` | Feature specifications by phase, app ownership (CRM vs Web), acceptance criteria |

**Always consult these documents before making architectural decisions.**

## Three-Layer Platform Model

```
Platform Layer (Super Admin)     → Manages all organizations, billing, feature flags
         ↓
Organization Layer (Tenants)     → Individual businesses with isolated data
         ↓
Shared Infrastructure            → Database, cache, jobs, external APIs (all org-aware)
```

## Two Applications, Shared Core

| App | Domain | Users | Required? |
|-----|--------|-------|-----------|
| **CRM** | `app.platform.com/org/{slug}` | Staff | Yes (core product) |
| **Web** | `{slug}.book.platform.com` | Customers | Optional per org |

**Critical:** The CRM is 100% functional without the Web App. Organizations may use:
- CRM-only with manual bookings (phone, walk-in)
- CRM + API for their own website
- CRM + OTA integrations (Viator, GetYourGuide)
- CRM + Web App for full booking site

## Tech Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Monorepo** | Turborepo + pnpm | Shared code, atomic changes, single CI |
| **Framework** | Next.js 15 (App Router) | React ecosystem maturity, Server Components, Vercel deployment |
| **Internal API** | tRPC | End-to-end type safety, compiler catches integration bugs |
| **External API** | REST | Standards for partners, webhooks |
| **Database** | PostgreSQL via Supabase | Relational integrity for bookings, RLS, real-time |
| **ORM** | Drizzle | SQL-like syntax, small bundle, edge-compatible |
| **Auth (Staff)** | Clerk with Organizations | Multi-tenant auth, RBAC, team management |
| **Auth (Customers)** | Magic link | Lightweight, customers don't need full accounts |
| **Payments** | Stripe Connect | Per-organization payment processing, platform fees |
| **Background Jobs** | Inngest | Event-driven workflows, retries, observability |
| **Email** | Resend | Modern API, React Email templates |
| **SMS** | Twilio | WhatsApp Business API support |
| **Cache** | Upstash Redis | Serverless, edge-compatible |

## Multi-Tenant Data Model

### The Golden Rule
**Every entity belongs to exactly one Organization. Every table has `organization_id`.**

```typescript
// ✅ Correct - Always include organizationId
const booking = {
  id: 'bk_123',
  organizationId: 'org_abc',  // Required on ALL entities
  customerId: 'cust_456',
};

// ❌ Wrong - Never create orphan records
const booking = {
  id: 'bk_123',
  customerId: 'cust_456',
  // Missing organizationId
};
```

### Unique Constraints Are Per-Organization
- Customer email: unique within org (same person can be customer of multiple tour companies)
- Tour slug: unique within org
- Booking reference: unique within org
- Promo code: unique within org

### Defense in Depth
```
Request → Auth (Clerk) → Middleware (org access) → Services (org filter) → DB (RLS)
```

## Domain Model

```
Organization (Tenant Root)
    ↓ owns
┌───────────────────────────────────────────────────┐
│  Customer ──books──→ Booking ←──fulfills── Schedule │
│      ↓                  ↓                     ↓     │
│  Communication         Tour                 Guide   │
│                         ↓                           │
│                      Pricing                        │
└───────────────────────────────────────────────────┘
```

**Core Entities:**
- **Organization** - Tenant root, owns all data, has subscription/billing
- **Customer** - Person who books tours (org-scoped)
- **Tour** - Product template defining what can be booked
- **Schedule** - Specific tour instance on date/time (the inventory)
- **Booking** - Customer reservation for a schedule
- **Guide** - Staff member who leads tours

## Monorepo Structure

```
tour-platform/
├── apps/
│   ├── crm/                    # Staff CRM + Platform Admin
│   │   └── app/
│   │       ├── org/[orgSlug]/  # Organization-scoped routes
│   │       └── platform/       # Super admin routes
│   └── web/                    # Public booking (optional per org)
│       └── middleware.ts       # Resolves org from subdomain
├── packages/
│   ├── database/               # @tour/database - Drizzle schema, all tables have org_id
│   ├── services/               # @tour/services - Business logic, always org-scoped
│   ├── ui/                     # @tour/ui - Shared components
│   ├── validators/             # @tour/validators - Zod schemas
│   ├── emails/                 # @tour/emails - React Email templates
│   └── config/                 # @tour/config - Shared configuration
└── infrastructure/
    └── inngest/                # Background jobs (org-aware)
```

## Services Pattern

All services require organization context:

```typescript
// Creating org-scoped services
const services = createServices({ organizationId: 'org_abc' });
const bookings = await services.booking.getAll(); // Automatically filtered

// Every query includes org filter
async getById(id: string) {
  return db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, id),
      eq(bookings.organizationId, this.ctx.organizationId)  // Always
    ),
  });
}
```

## Event-Driven Architecture

All domain events include `organizationId`:

```typescript
interface BookingCreated {
  organizationId: string;  // Always present
  type: 'booking.created';
  bookingId: string;
  customerId: string;
  timestamp: Date;
}
```

Events trigger Inngest workflows that are org-aware (use org settings for email templates, branding, etc.).

## Stripe Connect Pattern

```typescript
// Platform Stripe account bills organizations for subscriptions
// Organization's Stripe Connect account receives booking payments
// Platform takes application_fee_amount as transaction fee

const paymentIntent = await stripe.paymentIntents.create({
  amount,
  currency,
  transfer_data: {
    destination: org.stripeConnectAccountId,  // Org receives payment
  },
  application_fee_amount: platformFee,  // Platform takes cut
});
```

## Role-Based Access Control

Per-organization roles:
- **Owner** - Full access, billing
- **Admin** - Everything except billing/deletion
- **Manager** - Bookings, schedules, guides
- **Support** - Customer service, booking modifications
- **Guide** - Own schedule and assigned bookings only

## Key Architectural Principles

1. **Organization as Root** - Every piece of data belongs to exactly one organization
2. **Defense in Depth** - Auth → Middleware → Services → RLS
3. **Shared Infrastructure, Isolated Data** - Same DB/cache, strict org filtering
4. **Optional Features, Not Optional Architecture** - Web App optional, but architecture supports it
5. **Type Safety Everywhere** - TypeScript + tRPC + Zod = compiler catches bugs

## Build Phases

1. **Foundation** - Monorepo, multi-tenant DB, Clerk orgs, basic CRM
2. **Operations** - Guides, calendar, modifications, communications
3. **Web App** - Subdomain routing, theming, booking checkout
4. **Platform Scale** - Onboarding, subscription billing, feature flags

## Commands (When Code Exists)

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

## Decision-Making Guidelines

When implementing features:
1. **Check which app owns the feature** - See FEATURES.md Application Ownership section
2. **Always scope to organization** - Every query, every mutation, every event
3. **Use shared services** - Business logic in `@tour/services`, not in app code
4. **Emit events for side effects** - Don't call email service directly; emit event, let Inngest handle
5. **Validate at boundaries** - Use `@tour/validators` schemas for all inputs
