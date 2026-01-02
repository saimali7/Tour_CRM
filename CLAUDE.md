# Tour CRM

Multi-tenant tour operations platform. **Every database query MUST include organizationId.**

## The Iron Rule

```typescript
// This is non-negotiable. Violating this leaks data between tenants.
where: and(
  eq(table.organizationId, this.organizationId),
  // ... other conditions
)
```

Services enforce this automatically via `BaseService`. Never bypass services with raw queries in routers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/crm (Next.js 15)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ App Router   │  │ tRPC Routers │  │ Inngest Functions    │  │
│  │ /org/[slug]/ │→ │ (41 routers) │→ │ (23 background jobs) │  │
│  └──────────────┘  └──────┬───────┘  └──────────┬───────────┘  │
└────────────────────────────┼────────────────────┼───────────────┘
                             │                    │
┌────────────────────────────┼────────────────────┼───────────────┐
│                    packages/services                            │
│  ┌─────────────────────────┴────────────────────┴────────────┐ │
│  │ createServices({ organizationId }) → 32+ org-scoped services│ │
│  │ BookingService, CustomerService, TourService, GuideService  │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    packages/database (Drizzle)                  │
│  23 tables, all with organizationId FK + cascade delete         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Domain Model

```
Organization (tenant root)
├── Tours
│   ├── TourPricingTiers (adult/child/senior prices)
│   ├── TourVariants (morning/evening/private)
│   ├── TourAvailabilityWindows (seasonal schedules)
│   ├── TourDepartureTimes (09:00, 14:00, etc.)
│   └── TourBlackoutDates (closures)
│
├── Bookings ←────────────────── Customers
│   ├── BookingParticipants     (email unique per org)
│   ├── Payments
│   └── AddOns
│
├── Guides
│   ├── GuideAssignments (guide ↔ tour run)
│   └── GuideAvailability
│
└── PickupZones
    └── ZoneTravelTimes (for dispatch routing)
```

**Key Relationships:**
- `Booking` → `Tour` + `Customer` (required)
- `Booking` → `BookingOption` (pricing configuration)
- `GuideAssignment` → `Guide` + booking date/time
- All FKs use `onDelete: "cascade"` except historical data (restrict)

---

## Code Patterns

### 1. tRPC Router (thin delegation layer)

```typescript
// apps/crm/src/server/routers/booking.ts
export const bookingRouter = createRouter({
  list: protectedProcedure
    .input(listBookingsSchema)
    .query(({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      return services.booking.getAll(input.filters, input.pagination, input.sort);
    }),

  create: adminProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const services = createServices({ organizationId: ctx.orgContext.organizationId });
      const booking = await services.booking.create(input);

      // Fire-and-forget event for side effects
      await inngest.send({
        name: "booking/created",
        data: { organizationId: ctx.orgContext.organizationId, bookingId: booking.id },
      });

      return booking;
    }),
});
```

### 2. Service (where business logic lives)

```typescript
// packages/services/src/booking-service.ts
export class BookingService extends BaseService {
  async getAll(filters: BookingFilters, pagination: PaginationOptions, sort: SortOptions) {
    const conditions = [eq(bookings.organizationId, this.organizationId)]; // ALWAYS

    if (filters.status) conditions.push(eq(bookings.status, filters.status));
    if (filters.customerId) conditions.push(eq(bookings.customerId, filters.customerId));

    const [data, countResult] = await Promise.all([
      this.db.select().from(bookings).where(and(...conditions)).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(bookings).where(and(...conditions)),
    ]);

    return { data, ...this.paginationMeta(countResult[0].total, page, limit) };
  }

  async create(input: CreateBookingInput) {
    // Validate tour exists and belongs to org
    const tour = await requireEntity(
      () => this.db.query.tours.findFirst({
        where: and(eq(tours.id, input.tourId), eq(tours.organizationId, this.organizationId)),
      }),
      "Tour",
      input.tourId
    );

    const [booking] = await this.db.insert(bookings).values({
      organizationId: this.organizationId, // ALWAYS
      referenceNumber: this.generateReferenceNumber("BK"),
      ...input,
    }).returning();

    return booking;
  }
}
```

### 3. Inngest Function (background job)

```typescript
// apps/crm/src/inngest/functions/booking-emails.ts
export const sendBookingConfirmation = inngest.createFunction(
  { id: "send-booking-confirmation", retries: 3 },
  { event: "booking/created" },
  async ({ event, step }) => {
    const { organizationId, bookingId } = event.data;

    const booking = await step.run("get-booking", async () => {
      const services = createServices({ organizationId });
      return services.booking.getById(bookingId);
    });

    const org = await step.run("get-org", async () => {
      const services = createServices({ organizationId });
      return services.organization.get();
    });

    await step.run("send-email", async () => {
      const emailService = createEmailService(org);
      return emailService.sendBookingConfirmation({ booking, org });
    });
  }
);
```

---

## Procedures (Authorization)

| Procedure | Requirements | Use For |
|-----------|--------------|---------|
| `publicProcedure` | None | Public API, health checks |
| `protectedProcedure` | Clerk auth + org membership | Read operations |
| `adminProcedure` | + owner/admin role | Write operations |
| `bulkProcedure` | + rate limit (5/min) | Bulk operations |
| `sensitiveProcedure` | + rate limit (10/min) | Payment operations |

---

## Key Locations

| What | Where |
|------|-------|
| **Database schema** | `packages/database/src/schema/` (23 tables) |
| **All services** | `packages/services/src/` (32+ services) |
| **Service factory** | `packages/services/src/index.ts` → `createServices()` |
| **tRPC routers** | `apps/crm/src/server/routers/` (41 routers) |
| **tRPC setup** | `apps/crm/src/server/trpc.ts` |
| **Inngest functions** | `apps/crm/src/inngest/functions/` (23 functions) |
| **Inngest events** | `apps/crm/src/inngest/client.ts` (event types) |
| **React components** | `apps/crm/src/components/` (22 feature folders) |
| **API validators** | `packages/validators/src/` |
| **Shared UI** | `packages/ui/src/components/` (shadcn/ui) |

---

## Commands

```bash
pnpm dev                      # Start all apps
pnpm dev --filter crm         # CRM only (port 3000)
pnpm build && pnpm typecheck  # REQUIRED before commit
pnpm db:push                  # Push schema changes
pnpm db:studio                # Drizzle Studio GUI
docker-compose up -d          # Postgres, Redis, MinIO, Mailpit
```

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| API | tRPC v11 + React Query |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk Organizations |
| Payments | Stripe Connect (per-org accounts) |
| Jobs | Inngest (event-driven) |
| Email | Resend + React Email |
| Storage | MinIO (S3-compatible) |
| Cache | Redis |
| Monitoring | Sentry + Pino logging |

---

## Critical Rules

### DO:
- Always use `createServices({ organizationId })` - never instantiate services directly
- Always include `organizationId` in every database condition
- Use `adminProcedure` for mutations, `protectedProcedure` for queries
- Fire Inngest events for side effects (emails, notifications) - don't block the request
- Use `step.run()` in Inngest for idempotent operations
- Wrap entity lookups with `requireEntity()` for consistent 404 handling

### DON'T:
- Never write raw DB queries in routers - delegate to services
- Never hardcode organization IDs
- Never send emails/notifications synchronously in mutations
- Never use `eq(table.id, id)` without also filtering by `organizationId`
- Never trust client-provided `organizationId` - always use `ctx.orgContext.organizationId`

---

## Error Handling

```typescript
// Service errors (packages/services/src/types.ts)
throw new NotFoundError("Booking", id);        // 404
throw new ValidationError("Invalid date");     // 400
throw new ForbiddenError("Not allowed");       // 403
throw new ConflictError("Already exists");     // 409

// In routers, these auto-convert to TRPCError with correct codes
```

---

## Frontend Patterns

```typescript
// Query with React Query (via tRPC)
const { data, isLoading } = trpc.booking.list.useQuery({
  filters: { status: "confirmed" },
  pagination: { page: 1, limit: 20 },
});

// Mutation with cache invalidation
const utils = trpc.useUtils();
const createMutation = trpc.booking.create.useMutation({
  onSuccess: () => {
    utils.booking.list.invalidate();
    toast.success("Booking created");
  },
});

// Context panel (right sidebar)
const { openPanel } = useContextPanel();
openPanel({ type: "booking", bookingId: "..." });
```

---

## Docs

| Need | Path |
|------|------|
| Current work | `docs/project/ACTIVE.md` |
| Product vision | `docs/strategy/VISION.md` |
| Full roadmap | `docs/strategy/ROADMAP.md` |
| Architecture deep-dive | `docs/reference/ARCHITECTURE.md` |
| Design system | `docs/reference/DESIGN_SYSTEM.md` |
| All docs index | `docs/README.md` |
