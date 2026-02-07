# Codebase Organization Guide

> For new developers joining Tour CRM

## Quick Assessment

| Category | Score | Status |
|----------|-------|--------|
| Code Structure | 9/10 | Excellent |
| Architectural Consistency | 9.4/10 | Excellent |
| Documentation | 4.4/10 | Needs Work |
| Onboarding Experience | 6/10 | Acceptable |
| Build Configuration | 8.5/10 | Good |
| Dead Code | 9/10 | Clean |

**Overall: 7.7/10** - Solid foundation with documentation gaps

---

## Repository Structure

```
Tour_CRM/
├── apps/
│   ├── crm/                 # Staff dashboard (Next.js 15 + tRPC)
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utilities (auth, trpc client)
│   │   │   ├── server/      # tRPC routers
│   │   │   └── inngest/     # Background jobs
│   │   └── public/
│   └── web/                 # Public booking site (optional)
│
├── packages/
│   ├── database/            # Drizzle schema + migrations
│   │   ├── src/schema/      # Table definitions
│   │   └── drizzle/         # SQL migrations
│   ├── services/            # Business logic (org-scoped)
│   │   ├── src/             # Service classes
│   │   └── src/lib/         # Logger, sanitization
│   ├── validators/          # Zod schemas (shared)
│   ├── ui/                  # shadcn/ui components
│   ├── emails/              # React Email templates
│   ├── config/              # Shared configs
│   ├── eslint-config/       # ESLint presets
│   └── typescript-config/   # TSConfig presets
│
├── docs/                    # Documentation
├── scripts/                 # Deployment/backup scripts
└── docker-compose.yml       # Local dev infrastructure
```

## Architecture Patterns

### Service Pattern (94% Consistency)

All business logic lives in `packages/services/`. Every service extends `BaseService`:

```typescript
// packages/services/src/booking-service.ts
export class BookingService extends BaseService {
  constructor(ctx: ServiceContext) {
    super(ctx);  // Inherits organizationId, db, redis
  }

  async getAll() {
    // Automatically scoped to organization
    return this.db.query.bookings.findMany({
      where: eq(bookings.organizationId, this.organizationId)
    });
  }
}
```

**Key insight:** Services never accept `organizationId` as a parameter - it's always from context.

### tRPC Router Pattern

```typescript
// apps/crm/src/server/routers/booking.ts
export const bookingRouter = createRouter({
  // Read operations - any logged-in user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.booking.getAll();
  }),

  // Write operations - admin only
  create: adminProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.booking.create(input);
    }),
});
```

### Event-Driven Side Effects

Never call external services directly from mutations. Use Inngest:

```typescript
// In mutation
await inngest.send({
  name: 'booking.created',
  data: { organizationId, bookingId }
});

// In apps/crm/src/inngest/functions/
export const sendBookingConfirmation = inngest.createFunction(
  { id: 'booking-confirmation' },
  { event: 'booking.created' },
  async ({ event }) => {
    // Send email, update analytics, etc.
  }
);
```

---

## Getting Started (7 Steps)

### 1. Prerequisites

```bash
node --version  # v20+
pnpm --version  # v9+
docker --version
```

### 2. Clone and Install

```bash
git clone <repo>
cd Tour_CRM
pnpm install
```

### 3. Start Infrastructure

```bash
docker-compose up -d
# Starts: PostgreSQL (5432), Redis (6379), MinIO (9000), Mailpit (8025)
```

### 4. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local - see Environment Variables section below
```

### 5. Push Database Schema

```bash
pnpm db:push
```

### 6. Seed Data (Optional)

```bash
pnpm db:seed
```

### 7. Run Development Server

```bash
pnpm dev              # All apps
pnpm dev --filter crm # CRM only
```

Access at:
- CRM: http://localhost:3000/org/demo
- Web: http://localhost:3001
- Mailpit: http://localhost:8025

---

## Environment Variables

### Required for Local Development

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tour_platform"

# Auth (set false for local dev)
ENABLE_CLERK="false"

# Dev bypass (creates mock org context)
DEV_AUTH_BYPASS="true"
```

### Required for Production

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # Bypasses PgBouncer for migrations

# Auth
ENABLE_CLERK="true"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Storage
S3_ENDPOINT="https://..."
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET="tour-images"

# Email
RESEND_API_KEY="re_..."

# Payments
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Key Files Reference

| What | Where |
|------|-------|
| Database schema | `packages/database/src/schema/` |
| Service business logic | `packages/services/src/*.ts` |
| tRPC routers | `apps/crm/src/server/routers/` |
| React components | `apps/crm/src/components/` |
| Inngest functions | `apps/crm/src/inngest/functions/` |
| Email templates | `packages/emails/src/` |
| Validation schemas | `packages/validators/src/` |
| UI components | `packages/ui/src/components/` |

---

## Common Tasks

### Add a Database Table

1. Create schema in `packages/database/src/schema/new-table.ts`
2. Export from `packages/database/src/schema/index.ts`
3. Run `pnpm db:push`

### Add a Service Method

1. Add method to appropriate service in `packages/services/src/`
2. Ensure org-scoping: `eq(table.organizationId, this.organizationId)`

### Add an API Endpoint

1. Add to router in `apps/crm/src/server/routers/`
2. Use `protectedProcedure` (read) or `adminProcedure` (write)
3. Call service method via `ctx.services`

### Add a Background Job

1. Create function in `apps/crm/src/inngest/functions/`
2. Export from `apps/crm/src/inngest/functions/index.ts`
3. Trigger with `inngest.send({ name: 'event.name', data: { organizationId, ... } })`

### Add a UI Component

1. For reusable: `packages/ui/src/components/`
2. For app-specific: `apps/crm/src/components/`

---

## Code Quality Standards

### Logging

Use structured pino logger, never `console.log`:

```typescript
import { logger } from "@tour/services";

// With context
logger.info({ bookingId, customerId }, "Booking created");

// Service-specific
const myLogger = logger.child({ service: "my-service" });
```

### Error Handling

Never silent catches. Always log with context:

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error({ err: error, bookingId }, "Failed to process booking");
  throw error; // or handle gracefully
}
```

### Type Safety

Never use `any`. Use proper types from `@tour/database`:

```typescript
import type { Booking, Customer, Schedule } from "@tour/database";
```

### HTML Sanitization

For user-provided HTML (emails):

```typescript
import { sanitizeEmailHtml } from "@tour/services";
const safe = sanitizeEmailHtml(userInput);
```

---

## Testing

```bash
pnpm test              # All tests
pnpm typecheck         # Type checking
pnpm lint              # ESLint
pnpm build             # Production build
```

---

## Known Issues & Tech Debt

### Priority 1: Documentation Gaps

- [ ] Package-level READMEs missing
- [ ] JSDoc comments sparse on services
- [ ] API endpoint documentation

### Priority 2: Minor Code Issues

- [ ] Duplicate pricing services (`pricing-calculation-service.ts` vs `pricing-calculator-service.ts`)
- [ ] 3 unused exports in `travel-matrix-service.ts`
- [ ] Large barrel file in services (498 lines)

### Priority 3: Configuration

- [ ] CI uses `tour_crm` db name, dev/prod use `tour_platform`
- [ ] Lint warning threshold differs (CRM: 200, Web: 50)

See `docs/TECHNICAL_DEBT.md` for full tracking.

---

## Help & Resources

| Resource | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Domain model, entity relationships |
| `docs/PROGRESS.md` | Implementation status by phase |
| `docs/DESIGN_SYSTEM.md` | UI patterns and tokens |
| `docs/DEPLOYMENT.md` | Production setup guide |
| `docs/INFRASTRUCTURE_PLAN.md` | Self-hosted stack details |
| `CLAUDE.md` | AI assistant context |

---

## FAQ

**Q: How do I test without Clerk auth?**
Set `DEV_AUTH_BYPASS="true"` and `ENABLE_CLERK="false"` in `.env.local`

**Q: Why isn't my service method org-scoped?**
Ensure your service extends `BaseService` and queries include `eq(table.organizationId, this.organizationId)`

**Q: How do I add a new organization?**
1. Run `pnpm db:add-member` with organization slug
2. Or create via Clerk Organizations in production

**Q: Where do emails actually get sent?**
- Local: Captured in Mailpit (http://localhost:8025)
- Production: Sent via Resend API
