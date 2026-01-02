# Tour CRM

Multi-tenant tour operations SaaS. **Every query must be organization-scoped.**

## The One Rule

```typescript
// ALWAYS filter by organizationId - this is non-negotiable
eq(table.organizationId, ctx.organizationId)
```

If you write a query without `organizationId`, you've created a data leak between tenants.

## Architecture

```
apps/crm/                    → Staff dashboard (Next.js 15 App Router)
  src/
    app/org/[slug]/          → All org routes under /org/:slug
    server/routers/          → tRPC routers (thin, delegate to services)
    components/              → React components
    inngest/functions/       → Background jobs

packages/
  database/src/schema/       → Drizzle schema (23 tables)
  services/src/              → Business logic (40+ services)
  validators/src/            → Zod schemas for API validation
  ui/                        → shadcn/ui components
```

## Domain Model

```
Organization (tenant boundary)
  └── Tours (products)
        └── TourAvailability (when tours run)
              └── TourRuns (actual instances with guests)
                    └── Bookings → Customers
                          └── Participants (who's coming)
                          └── Payments
                          └── AddOns
  └── Guides
        └── GuideAssignments (guide ↔ tour run)
        └── GuideAvailability (when guides work)
```

## Code Patterns

### tRPC Router (thin layer)
```typescript
// apps/crm/src/server/routers/booking.ts
export const bookingRouter = router({
  getAll: orgProcedure.query(({ ctx }) => ctx.services.booking.getAll()),

  create: adminProcedure
    .input(createBookingSchema)
    .mutation(({ ctx, input }) => ctx.services.booking.create(input)),
});
```

### Service (where logic lives)
```typescript
// packages/services/src/booking-service.ts
export class BookingService extends BaseService {
  async getAll() {
    return this.db.query.bookings.findMany({
      where: eq(bookings.organizationId, this.organizationId), // Always!
    });
  }
}
```

### Inngest (background jobs)
```typescript
// apps/crm/src/inngest/functions/booking-emails.ts
inngest.createFunction(
  { id: 'send-confirmation' },
  { event: 'booking.created' },
  async ({ event }) => {
    const { organizationId, bookingId } = event.data;
    const services = createServices({ organizationId });
    // ... send email
  }
);
```

## Procedures

| Procedure | Auth | Use for |
|-----------|------|---------|
| `publicProcedure` | None | Public API endpoints |
| `orgProcedure` | Clerk + org member | Read operations |
| `adminProcedure` | Clerk + org admin | Write operations |

## Key Files

| What | Where |
|------|-------|
| Database schema | `packages/database/src/schema/` |
| All services | `packages/services/src/` |
| Service factory | `packages/services/src/index.ts` |
| tRPC routers | `apps/crm/src/server/routers/` |
| tRPC setup | `apps/crm/src/server/trpc.ts` |
| Inngest functions | `apps/crm/src/inngest/functions/` |
| API validators | `packages/validators/src/` |

## Commands

```bash
pnpm dev                      # Start all (CRM on :3000)
pnpm dev --filter crm         # CRM only
pnpm build && pnpm typecheck  # Before commit (required)
pnpm db:push                  # Push schema changes
pnpm db:studio                # Open Drizzle Studio
docker-compose up -d          # Start Postgres, Redis, MinIO, Mailpit
```

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| API | tRPC v11 + superjson |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk Organizations |
| Payments | Stripe Connect (per-org accounts) |
| Jobs | Inngest |
| Email | Resend + React Email |
| Storage | MinIO (S3-compatible) |
| Cache | Redis |

## Gotchas

1. **Services need context** - Always use `createServices({ organizationId })`, never instantiate directly
2. **No direct DB in routers** - Routers call services, services call DB
3. **Inngest for side effects** - Don't send emails/notifications directly, emit events
4. **Clerk org != DB org** - Clerk handles auth, we sync to `organizations` table
5. **Slug routing** - All org routes are `/org/[slug]/...`, slug comes from URL not user

## Status

**Milestone 7: Operations Excellence** — 80% complete

## Docs

| Need | Path |
|------|------|
| Current work | `docs/project/ACTIVE.md` |
| Roadmap | `docs/strategy/ROADMAP.md` |
| Architecture deep-dive | `docs/reference/ARCHITECTURE.md` |
| Design system | `docs/reference/DESIGN_SYSTEM.md` |
| All docs | `docs/README.md` |
