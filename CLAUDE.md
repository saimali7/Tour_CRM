# Tour CRM

Multi-tenant tour operations SaaS. Organization-scoped everything.

## Architecture

```
apps/crm     → Staff dashboard (Next.js 15, tRPC, Clerk)
apps/web     → Public booking (optional per org)
packages/
  database   → Drizzle schema, every table has organizationId
  services   → Business logic, always org-scoped
  ui         → shadcn/ui components
  validators → Zod schemas
```

## Core Constraints

```typescript
// EVERY query, mutation, event MUST include organizationId
eq(bookings.organizationId, ctx.organizationId)  // Always

// Services are org-scoped by construction
const services = createServices({ organizationId });
await services.booking.getAll();  // Auto-filtered

// Events trigger Inngest, never call services directly for side effects
await inngest.send({ name: 'booking.created', data: { organizationId, bookingId } });
```

## Commands

```bash
pnpm dev                  # All apps
pnpm dev --filter crm     # CRM only
pnpm build && pnpm typecheck  # Before commit
pnpm db:push              # Push schema
pnpm db:studio            # Drizzle Studio
```

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| API | tRPC (internal), REST (external) |
| DB | Self-hosted PostgreSQL 16 + PgBouncer + Drizzle |
| Cache | Self-hosted Redis |
| Storage | Self-hosted MinIO (S3-compatible) |
| Auth | Clerk Organizations |
| Payments | Stripe Connect |
| Jobs | Inngest |
| Email | Resend + React Email |
| Hosting | Hostinger VPS + Coolify |

## Code Patterns

### tRPC Router
```typescript
export const bookingRouter = router({
  getAll: orgProcedure.query(async ({ ctx }) => {
    return ctx.services.booking.getAll();
  }),
  create: adminProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.booking.create(input);
    }),
});
```

### Service Method
```typescript
async getById(id: string) {
  return db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, id),
      eq(bookings.organizationId, this.ctx.organizationId)
    ),
  });
}
```

### Inngest Event
```typescript
inngest.createFunction(
  { id: 'booking-confirmation' },
  { event: 'booking.created' },
  async ({ event }) => {
    const { organizationId, bookingId } = event.data;
    // Send confirmation email using org's branding
  }
);
```

## Design System

### Layout
```
┌─────┬────────────────────────────┬─────────┐
│ 60px│      Fluid Content         │  280px  │
│ Nav │   Tables/Forms/Calendar    │ Context │
└─────┴────────────────────────────┴─────────┘
```

### Tokens
```tsx
// Backgrounds
bg-background  bg-card  bg-muted  bg-accent

// Text
text-foreground  text-muted-foreground

// Interactive
bg-primary text-primary-foreground
border-border  ring-ring

// Status
status-confirmed  status-pending  status-cancelled  status-completed
payment-paid  payment-partial  payment-pending
```

### Typography
```tsx
text-xl font-semibold tracking-tight    // Page title
text-sm font-medium uppercase tracking-wide text-muted-foreground  // Section
text-sm text-foreground                 // Body
text-xs text-muted-foreground           // Meta
font-mono tabular-nums                  // Numbers
```

### Motion
```tsx
transition-colors                       // Color changes
transition-all duration-150             // General
hover:scale-[1.02] active:scale-[0.98]  // Buttons
```

## Keyboard

`Cmd+K` Command palette | `Cmd+1-7` Navigate | `Cmd+B` Quick book | `Esc` Close

## Status

Phases 0-6 complete. Next: Phase 7 Operations Excellence.

## Docs

| Doc | Purpose |
|-----|---------|
| `docs/PROGRESS.md` | Implementation tracker (source of truth) |
| `docs/DESIGN_SYSTEM_V2.md` | Full design system |
| `docs/ARCHITECTURE.md` | Domain model, schema |
| `docs/DEPLOYMENT.md` | Production setup |
