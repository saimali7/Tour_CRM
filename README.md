# Tour Platform

A multi-tenant tour operations platform with CRM and booking capabilities.

## Project Structure

```
tour-platform/
├── apps/
│   ├── crm/          # Staff CRM (Next.js 15) - Port 3000
│   └── web/          # Public booking site (Next.js 15) - Port 3001
├── packages/
│   ├── database/     # @tour/database - Drizzle schema & queries
│   ├── ui/           # @tour/ui - Shared React components
│   ├── validators/   # @tour/validators - Zod schemas
│   ├── config/       # @tour/config - Shared configuration
│   ├── typescript-config/  # Shared TypeScript configs
│   └── eslint-config/      # Shared ESLint configs
└── docs/
    ├── ARCHITECTURE.md
    ├── SYSTEM_DESIGN.md
    └── FEATURES.md
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle
- **Auth**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui
- **Monorepo**: Turborepo + pnpm
- **Hosting**: Hostinger VPS + Coolify

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# Run development servers
pnpm dev
```

### Commands

```bash
pnpm dev              # Run all apps in development
pnpm build            # Build all apps
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript checks
pnpm format           # Format code with Prettier
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
```

## Apps

### CRM (`apps/crm`)

Staff-facing application for managing tours, bookings, and customers.

- URL: `http://localhost:3000` (dev) / `app.yourdomain.com` (prod)
- Authentication: Clerk

### Web (`apps/web`)

Customer-facing booking website.

- URL: `http://localhost:3001` (dev) / `book.yourdomain.com` (prod)
- Authentication: Magic link (lightweight)

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and decisions
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Multi-tenant system design
- [FEATURES.md](./FEATURES.md) - Feature specifications by phase
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines

## License

Private - All rights reserved
