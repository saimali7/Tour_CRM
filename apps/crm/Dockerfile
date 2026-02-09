# =============================================================================
# Tour CRM - Production Dockerfile
# =============================================================================
# Uses BuildKit cache mounts for faster builds
# Migrations run automatically at container startup
#
# Build: docker build -t tour-crm -f apps/crm/Dockerfile .
# Run:   docker run -p 3000:3000 --env-file .env.production tour-crm

FROM node:20-alpine AS base

# =============================================================================
# Dependencies stage
# =============================================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
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

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Builder stage
# =============================================================================
FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/crm/node_modules ./apps/crm/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/emails/node_modules ./packages/emails/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/validators/node_modules ./packages/validators/node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

RUN --mount=type=cache,id=turbo,target=/app/.turbo \
    --mount=type=cache,id=next,target=/app/apps/crm/.next/cache \
    pnpm --filter @tour/crm build

# =============================================================================
# Runner stage - Production image with migrations
# =============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone build
COPY --from=builder /app/apps/crm/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/static ./apps/crm/.next/static

# Copy database package for migrations
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/node_modules ./node_modules

# Create startup script that runs migrations then starts app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "=== Running database migrations ==="' >> /app/start.sh && \
    echo 'cd /app/packages/database' >> /app/start.sh && \
    echo 'if [ -n "$DIRECT_URL" ]; then export DATABASE_URL="$DIRECT_URL"; fi' >> /app/start.sh && \
    echo 'echo "Using migration connection: $(test -n \"$DIRECT_URL\" && echo DIRECT_URL || echo DATABASE_URL)"' >> /app/start.sh && \
    echo 'node ./scripts/baseline-migrations.mjs' >> /app/start.sh && \
    echo 'npx drizzle-kit migrate 2>&1 && echo "=== Migrations complete ===" || { echo "=== Migration FAILED ==="; exit 1; }' >> /app/start.sh && \
    echo 'cd /app' >> /app/start.sh && \
    echo 'echo "=== Starting application ==="' >> /app/start.sh && \
    echo 'exec node apps/crm/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
