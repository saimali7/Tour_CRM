# Tour CRM

> **The operations platform tour companies actually want to use.**

A world-class, multi-tenant tour operations CRM built for how operators actually work: morning briefings, 60-second phone bookings, intelligent guide dispatch, and seamless day-of operations.

## Why This Exists

Tour operators are stuck with either generic CRMs that don't understand tours, or legacy software that feels like it's from 2005. We're building what a modern tour company deserves — purpose-built software that makes running tours effortless.

**Key Differentiators:**
- ⚡ **60-second phone bookings** — Staff can book while on a call
- 🧠 **Intelligent dispatch** — Algorithm assigns guides, humans review and send
- 📱 **Operations-first** — Built around morning briefings and day-of workflows
- 🏢 **True multi-tenant** — Every organization is completely isolated

## Architecture

```
├── apps/
│   ├── crm/                 # Staff dashboard (Next.js 15)
│   └── web/                 # Customer booking site (planned)
│
├── packages/
│   ├── database/            # Drizzle schema (23 tables)
│   ├── services/            # Business logic (32+ services)
│   ├── validators/          # Zod schemas
│   ├── ui/                  # shadcn/ui components
│   ├── emails/              # React Email templates
│   └── config/              # Shared configuration
│
└── docs/
    ├── PROGRESS.md
    ├── ARCHITECTURE.md
    ├── SYSTEM_DESIGN.md
    ├── DESIGN_SYSTEM.md
    ├── COMMAND_CENTER_SPEC.md
    └── project/features/COMMAND_CENTER_SHIP_PLAN.md
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **API** | tRPC v11 + React Query |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **Auth** | Clerk Organizations |
| **Payments** | Stripe Connect |
| **Background Jobs** | Inngest |
| **Email** | Resend + React Email |
| **Storage** | MinIO (S3-compatible) |
| **Cache** | Redis |
| **Monorepo** | Turborepo + pnpm |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local infrastructure)

### Setup

```bash
# Install dependencies
pnpm install

# Start local infrastructure (Postgres, Redis, MinIO, Mailpit)
docker-compose up -d

# Copy environment variables
cp .env.example .env.local

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

### Commands

```bash
pnpm dev                  # Start all apps
pnpm dev --filter crm     # CRM only (port 3000)
pnpm build                # Production build
pnpm typecheck            # TypeScript validation
pnpm lint                 # ESLint
pnpm db:push              # Push schema changes
pnpm db:migrate           # Apply versioned SQL migrations
pnpm db:studio            # Drizzle Studio GUI
```

## Apps

### CRM (`apps/crm`)

Staff dashboard for tour operations management.

- **URL:** `localhost:3000` (dev)
- **Auth:** Clerk Organizations
- **Features:** Bookings, customers, tours, guides, dispatch, reports

### Web (`apps/web`) — *Planned*

Customer-facing booking website.

- **URL:** `localhost:3001` (dev)
- **Features:** Tour catalog, booking flow, Stripe checkout

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Engineering reference & code patterns |
| [docs/PROGRESS.md](./docs/PROGRESS.md) | Current delivery status |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical architecture |
| [docs/SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md) | System-level architecture |
| [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | UI patterns and tokens |
| [docs/COMMAND_CENTER_SPEC.md](./docs/COMMAND_CENTER_SPEC.md) | Dispatch behavior contract |
| [docs/project/features/COMMAND_CENTER_SHIP_PLAN.md](./docs/project/features/COMMAND_CENTER_SHIP_PLAN.md) | Command center ship checklist |

## Status

**Milestone 7: Operations Excellence** — Active hardening and production readiness

See [docs/PROGRESS.md](./docs/PROGRESS.md) for current work and latest updates.

## License

Private — All rights reserved
