# =============================================================================
# Tour CRM - Production Dockerfile
# =============================================================================
# Multi-stage build optimized for pnpm monorepo with Next.js standalone output
#
# Build: docker build -t tour-crm .
# Run:   docker run -p 3000:3000 --env-file .env.production tour-crm

FROM node:20-alpine AS base

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY turbo.json ./

# Copy all package.json files for workspace packages
COPY apps/crm/package.json ./apps/crm/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/emails/package.json ./packages/emails/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/services/package.json ./packages/services/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
COPY packages/validators/package.json ./packages/validators/

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder stage - Build the application
# =============================================================================
FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/crm/node_modules ./apps/crm/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/emails/node_modules ./packages/emails/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/validators/node_modules ./packages/validators/node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Skip env validation during build (will validate at runtime)
ENV SKIP_ENV_VALIDATION=true
# Dummy DATABASE_URL for build - actual URL provided at runtime
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Build the CRM app
RUN pnpm --filter @tour/crm build

# =============================================================================
# Runner stage - Production runtime
# =============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm for running db commands
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/crm/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/static ./apps/crm/.next/static

# Copy database package for migrations (drizzle-kit)
COPY --from=builder --chown=nextjs:nodejs /app/packages/database ./packages/database
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "apps/crm/server.js"]
