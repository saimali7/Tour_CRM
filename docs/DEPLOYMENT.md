# Production Deployment & DevOps Guide

> **YC-Level Development Pipeline**: From code change to production in minutes, with confidence.

This guide establishes a world-class development workflow with automated CI/CD, staging environments, zero-downtime deployments, and comprehensive monitoring.

---

## Table of Contents

1. [Philosophy & Principles](#1-philosophy--principles)
2. [Architecture Overview](#2-architecture-overview)
3. [Local Development Setup](#3-local-development-setup)
4. [Git Workflow & Branch Strategy](#4-git-workflow--branch-strategy)
5. [Code Quality Gates](#5-code-quality-gates)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [External Services Setup](#7-external-services-setup)
8. [Coolify Configuration](#8-coolify-configuration)
9. [Environment Management](#9-environment-management)
10. [Database Management](#10-database-management)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Incident Response & Rollbacks](#12-incident-response--rollbacks)
13. [Security Checklist](#13-security-checklist)
14. [Runbooks](#14-runbooks)

---

## 1. Philosophy & Principles

### The Golden Rules

1. **Ship Fast, Ship Safe**: Automated pipelines catch bugs before users do
2. **Everything is Code**: Infrastructure, config, and deployments are version controlled
3. **Fail Fast, Recover Faster**: Detect issues in seconds, rollback in one click
4. **Zero Manual Steps**: If you're SSH-ing to fix something, automate it next time
5. **Observability by Default**: If it's not monitored, it doesn't exist

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   LOCAL DEV              GITHUB                          PRODUCTION          │
│   ─────────              ──────                          ──────────          │
│                                                                              │
│   ┌─────────┐       ┌─────────┐        ┌─────────┐      ┌─────────┐         │
│   │  Code   │──────▶│   PR    │───────▶│   Dev   │─────▶│  Main   │         │
│   │ Change  │       │ Created │        │ Branch  │      │ Branch  │         │
│   └─────────┘       └────┬────┘        └────┬────┘      └────┬────┘         │
│        │                 │                  │                 │              │
│        ▼                 ▼                  │                 ▼              │
│   ┌─────────┐       ┌─────────┐             │           ┌─────────┐         │
│   │Pre-commit│      │CI Checks│             │           │ Auto    │         │
│   │  Hooks  │       │ ✓ Lint  │        Local Dev        │ Deploy  │         │
│   │ ✓ Lint  │       │ ✓ Types │        & Testing        │   to    │         │
│   │ ✓ Types │       │ ✓ Build │             │           │  Prod   │         │
│   │ ✓ Format│       └─────────┘             │           └────┬────┘         │
│   └─────────┘                               │                │              │
│                                             │                ▼              │
│                                             │           ┌─────────┐         │
│                                             │           │ Health  │         │
│                                             │           │ Check   │         │
│                                             │           │ + Alert │         │
│                                             │           └─────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                  │                                           │
│                    ┌─────────────┴─────────────┐                            │
│                    │      CLOUDFLARE (DNS)      │                            │
│                    │   *.yourdomain.com → VPS   │                            │
│                    └─────────────┬─────────────┘                            │
│                                  │                                           │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                    HOSTINGER VPS │ + COOLIFY                                 │
│                    ┌─────────────┴─────────────┐                            │
│                    │     TRAEFIK (Reverse Proxy)│                            │
│                    │  • Auto SSL (Let's Encrypt)│                            │
│                    │  • Load Balancing          │                            │
│                    │  • Rate Limiting           │                            │
│                    └──────┬──────────────┬─────┘                            │
│                           │              │                                   │
│                    ┌──────▼──────┐  ┌────▼─────┐                            │
│                    │ PRODUCTION  │  │  REDIS   │                            │
│                    │   (main)    │  │ Cache +  │                            │
│                    │             │  │ Sessions │                            │
│                    │  CRM:3000   │  └──────────┘                            │
│                    │  Web:3001   │                                           │
│                    └─────────────┘                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      EXTERNAL SERVICES     │
                    ├────────────────────────────┤
                    │  Supabase    → Database    │
                    │  Clerk       → Auth        │
                    │  Stripe      → Payments    │
                    │  Resend      → Email       │
                    │  Inngest     → Background  │
                    │  Sentry      → Errors      │
                    │  BetterStack → Monitoring  │
                    └────────────────────────────┘
```

### Environments

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| **Local** | `dev` | `localhost:3000` | Development & Testing |
| **Production** | `main` | `app.yourdomain.com` | Live Users |

---

## 3. Local Development Setup

### One-Command Setup

```bash
# Clone and setup (first time only)
git clone https://github.com/your-org/tour-crm.git
cd tour-crm
make setup  # or: ./scripts/setup.sh

# Daily development
make dev    # or: pnpm dev
```

### Prerequisites

- **Node.js 20+**: `nvm install 20 && nvm use 20`
- **pnpm 9+**: `npm install -g pnpm`
- **Docker Desktop**: For local Postgres/Redis (optional)

### Setup Script (`scripts/setup.sh`)

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Tour CRM development environment..."

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "📦 Installing pnpm..."; npm install -g pnpm; }

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 3. Setup environment
if [ ! -f .env.local ]; then
    echo "⚙️  Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please update .env.local with your credentials"
fi

# 4. Setup git hooks
echo "🪝 Setting up git hooks..."
pnpm exec husky install

# 5. Setup database (if using local Docker)
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Starting local services..."
    docker compose up -d postgres redis
    sleep 3
fi

# 6. Push database schema
echo "🗄️  Pushing database schema..."
pnpm db:push

# 7. Seed database (optional)
read -p "Seed database with sample data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm db:seed
fi

echo "✅ Setup complete! Run 'pnpm dev' to start developing."
```

### Makefile (Developer Convenience)

```makefile
.PHONY: dev setup test lint build deploy-staging deploy-prod

# Development
dev:
	pnpm dev

setup:
	./scripts/setup.sh

# Quality
lint:
	pnpm lint && pnpm typecheck

test:
	pnpm test

test-e2e:
	pnpm test:e2e

# Build
build:
	pnpm build

# Database
db-push:
	pnpm db:push

db-studio:
	pnpm db:studio

db-migrate:
	pnpm db:generate && pnpm db:push

# Deployment (manual triggers)
deploy-staging:
	git push origin dev

deploy-prod:
	@echo "⚠️  Deploying to production..."
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ]
	git checkout main && git merge dev && git push origin main
	git checkout dev

# Utilities
clean:
	rm -rf node_modules .next .turbo
	pnpm install

logs-staging:
	ssh coolify 'docker logs tour-crm-staging --tail 100 -f'

logs-prod:
	ssh coolify 'docker logs tour-crm-prod --tail 100 -f'
```

### Local Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tour_crm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## 4. Git Workflow & Branch Strategy

### Branch Structure

```
main (production) ← auto-deploys to Coolify
 │
 └── dev (development) ← work happens here
      │
      ├── feature/add-booking-export
      ├── fix/payment-webhook-retry
      └── chore/update-dependencies
```

### Branch Rules

| Branch | Protection | Deploy To | Merge Strategy |
|--------|------------|-----------|----------------|
| `main` | Protected, requires PR + approval | Production | Squash & Merge |
| `dev` | Protected, requires CI pass | Local only | Squash & Merge |
| `feature/*` | None | — | — |
| `fix/*` | None | — | — |
| `hotfix/*` | Can merge direct to main | Production | — |

### Commit Convention (Conventional Commits)

```bash
# Format: <type>(<scope>): <description>

feat(booking): add CSV export functionality
fix(payments): handle webhook retry correctly
docs(readme): update setup instructions
chore(deps): upgrade Next.js to 15.1
refactor(api): simplify tour pricing logic
test(booking): add unit tests for cancellation
perf(queries): optimize tour list query
```

**Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`

### Pull Request Template (`.github/pull_request_template.md`)

```markdown
## Summary
<!-- What does this PR do? -->

## Type of Change
- [ ] 🚀 Feature (new functionality)
- [ ] 🐛 Bug Fix (non-breaking fix)
- [ ] 💥 Breaking Change (fix/feature causing existing functionality to change)
- [ ] 📝 Documentation
- [ ] 🧹 Chore (refactoring, dependencies, etc.)

## Testing
- [ ] Unit tests added/updated
- [ ] Manually tested locally
- [ ] Tested on staging (if applicable)

## Checklist
- [ ] Code follows project conventions
- [ ] Self-reviewed my code
- [ ] No console.logs or debug code
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations are backwards compatible

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Closes #123 -->
```

---

## 5. Code Quality Gates

### Pre-commit Hooks (Husky + lint-staged)

Install hooks:
```bash
pnpm add -D husky lint-staged
pnpm exec husky install
```

`.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm exec lint-staged
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Pre-push Hook (Type Check)

`.husky/pre-push`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running type check before push..."
pnpm typecheck || {
    echo "❌ Type check failed. Push aborted."
    exit 1
}
```

### ESLint Configuration

Ensure strict rules in `.eslintrc.js`:
```javascript
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-hooks/exhaustive-deps': 'error',
  },
};
```

### TypeScript Strict Mode

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 6. CI/CD Pipeline

### GitHub Actions Workflows

#### Main CI Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ============================================
  # QUALITY CHECKS
  # ============================================
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type Check
        run: pnpm typecheck

      - name: Check formatting
        run: pnpm exec prettier --check .

  # ============================================
  # BUILD
  # ============================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            apps/crm/.next
            apps/web/.next
          retention-days: 1

  # ============================================
  # TESTS
  # ============================================
  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: tour_crm_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/tour_crm_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ============================================
  # DEPLOY TO STAGING (dev branch only)
  # ============================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, test]
    if: github.ref == 'refs/heads/dev' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.yourdomain.com
    steps:
      - name: Trigger Coolify Deployment
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_STAGING }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"

      - name: Wait for deployment
        run: sleep 60

      - name: Health check
        run: |
          for i in {1..10}; do
            status=$(curl -s -o /dev/null -w "%{http_code}" https://staging.yourdomain.com/api/health)
            if [ "$status" = "200" ]; then
              echo "✅ Staging is healthy"
              exit 0
            fi
            echo "Waiting for staging... (attempt $i)"
            sleep 10
          done
          echo "❌ Staging health check failed"
          exit 1

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} Staging deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment ${{ job.status }}*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View workflow>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # ============================================
  # DEPLOY TO PRODUCTION (main branch only)
  # ============================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://app.yourdomain.com
    steps:
      - name: Trigger Coolify Deployment
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_PROD }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"

      - name: Wait for deployment
        run: sleep 90

      - name: Health check
        run: |
          for i in {1..10}; do
            status=$(curl -s -o /dev/null -w "%{http_code}" https://app.yourdomain.com/api/health)
            if [ "$status" = "200" ]; then
              echo "✅ Production is healthy"
              exit 0
            fi
            echo "Waiting for production... (attempt $i)"
            sleep 10
          done
          echo "❌ Production health check failed"
          exit 1

      - name: Smoke tests
        run: |
          # Basic API smoke tests
          curl -sf https://app.yourdomain.com/api/health | jq .
          echo "✅ Smoke tests passed"

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '🚀' || '🚨' }} Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment ${{ job.status }}*\nCommit: `${{ github.sha }}`\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View workflow>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Create Sentry release
        if: success()
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: tour-crm
        with:
          environment: production
          version: ${{ github.sha }}
```

#### Dependency Updates (`.github/workflows/dependencies.yml`)

```yaml
name: Dependencies

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Update dependencies
        run: pnpm update --latest

      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet pnpm-lock.yaml; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.changes.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'chore(deps): update dependencies'
          title: 'chore(deps): Weekly dependency updates'
          body: |
            Automated dependency updates from `pnpm update --latest`.

            Please review changes and ensure all tests pass.
          branch: chore/update-dependencies
          delete-branch: true
```

---

## 7. External Services Setup

### 7.1 Supabase (Database)

1. Create project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Copy connection strings:

```bash
# Pooled connection (for app - port 6543)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection (for migrations - port 5432)
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Important Settings:**
- Enable connection pooling (Settings → Database → Connection Pooling)
- Upgrade to Pro plan for production (automatic backups, no pausing)

### 7.2 Clerk (Authentication)

1. Create application at [clerk.com](https://clerk.com)
2. Configure sign-in methods (Email, Google, etc.)
3. Get API keys from **API Keys** page
4. **Create Production Instance** (separate from development)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

5. Configure webhook at **Webhooks → Add Endpoint**:
   - URL: `https://app.yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`, `organization.*`

```bash
CLERK_WEBHOOK_SECRET=whsec_...
```

### 7.3 Stripe (Payments)

1. Complete account verification at [stripe.com](https://stripe.com)
2. Get live API keys from **Developers → API keys**

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

3. Enable **Stripe Connect** at **Connect → Settings**
4. Set up webhook at **Developers → Webhooks**:
   - URL: `https://app.yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.*`, `account.*`

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 7.4 Resend (Email)

1. Create account at [resend.com](https://resend.com)
2. **Verify your domain** at **Domains → Add Domain**
3. Add DNS records (SPF, DKIM, DMARC)
4. Create API key

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

### 7.5 Sentry (Error Tracking)

1. Create project at [sentry.io](https://sentry.io)
2. Get DSN from **Settings → Client Keys**

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org
SENTRY_PROJECT=tour-crm
```

### 7.6 BetterStack (Uptime Monitoring)

1. Create account at [betterstack.com](https://betterstack.com)
2. Create monitor for `https://app.yourdomain.com/api/health`
3. Configure alerting (Slack, Email, PagerDuty)

---

## 8. Coolify Configuration

### 8.1 Initial Server Setup

```bash
# SSH to your VPS
ssh root@your-vps-ip

# Install Coolify (if not already installed)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify at https://your-vps-ip:8000
```

### 8.2 Project Structure in Coolify

```
Tour CRM (Project)
├── Resources
│   ├── tour-crm (Application)
│   │   └── Source: GitHub → main branch
│   ├── tour-redis (Service)
│   │   └── Redis 7 Alpine
│   └── tour-web (Application) [optional]
│       └── Source: GitHub → main branch
```

### 8.3 Application Configuration

**General Settings:**
```
Build Pack: Nixpacks
Base Directory: /
Watch Paths: (empty - use webhook)
```

**Build Configuration:**
```bash
# Build Command
pnpm install --frozen-lockfile && pnpm db:push && pnpm build --filter @tour/crm

# Start Command
pnpm start --filter @tour/crm

# Port
3000
```

**Domain Configuration:**
- CRM: `app.yourdomain.com`
- Web (optional): `book.yourdomain.com`
- Enable HTTPS (automatic via Traefik)

### 8.4 Webhook Configuration

1. In Coolify, go to the application → **Webhooks**
2. Enable webhook and copy the URL
3. Add to GitHub repository **Settings → Variables → Actions**:
   - `COOLIFY_WEBHOOK_PROD`: Production webhook URL
   - `PRODUCTION_URL`: `https://app.yourdomain.com`
4. Add to GitHub repository **Settings → Secrets → Actions**:
   - `COOLIFY_API_TOKEN`: Your Coolify API token (if using bearer auth)

### 8.5 Health Check Configuration

In Coolify application settings:
```
Health Check Path: /api/health
Health Check Port: 3000
Health Check Interval: 30s
Health Check Timeout: 10s
Health Check Retries: 3
```

### 8.6 Resource Limits

**Production:**
```
CPU Limit: 2 cores
Memory Limit: 2GB
```

### 8.7 Zero-Downtime Deployments

Coolify uses rolling deployments by default. Ensure your app:
1. Has a health check endpoint
2. Handles graceful shutdown (SIGTERM)
3. Doesn't rely on local file storage

Add to your Next.js app (`next.config.js`):
```javascript
module.exports = {
  // Enable standalone output for better container performance
  output: 'standalone',
};
```

---

## 9. Environment Management

### Environment Variables by Environment

#### Local Development (`.env.local`)

```bash
# =============================================================================
# DATABASE (local Docker or Supabase dev project)
# =============================================================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tour_crm"

# =============================================================================
# AUTHENTICATION (disabled for local dev)
# =============================================================================
ENABLE_CLERK="false"

# =============================================================================
# APP URLs
# =============================================================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEB_URL="http://localhost:3001"

# =============================================================================
# OPTIONAL - Enable as needed for testing
# =============================================================================
# STRIPE_SECRET_KEY="sk_test_..."
# RESEND_API_KEY="re_..."
```

#### Production (Coolify Environment Variables)

```bash
# Database - Production Supabase
DATABASE_URL="postgresql://postgres.[ref]:[password]@...production..."
DIRECT_URL="postgresql://postgres.[ref]:[password]@...production..."

# Auth - Clerk production instance
ENABLE_CLERK="true"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Payments - Stripe live mode
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Cache
REDIS_URL="redis://:password@tour-redis:6379"

# Security
JWT_SECRET="<generate: openssl rand -base64 32>"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="..."

# URLs
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://app.yourdomain.com"
NEXT_PUBLIC_WEB_URL="https://book.yourdomain.com"
```

### Secret Management Best Practices

1. **Never commit secrets** - Use `.env.local` (gitignored)
2. **Rotate secrets regularly** - Especially after team changes
3. **Use different secrets per environment** - Never share between local/prod
4. **Audit access** - Track who has access to production secrets

---

## 10. Database Management

### Migration Strategy

```bash
# Development: Quick iteration
pnpm db:push          # Push schema changes directly

# Production: Safe migrations
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Apply migrations
```

### Migration Best Practices

1. **Always backwards compatible** - Old code should work with new schema
2. **Small, incremental changes** - One logical change per migration
3. **Test migrations locally first** - Never run untested migrations on prod
4. **Have a rollback plan** - Know how to undo each migration

### Backup Strategy

**Supabase Pro Plan:**
- Automatic daily backups (7-day retention)
- Point-in-time recovery (up to 7 days)

**Manual Backup:**
```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20240101.sql
```

### Connection Pooling

Always use pooled connections in production:
```bash
# App queries (pooled - port 6543)
DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations (direct - port 5432)
DIRECT_URL="...pooler.supabase.com:5432/postgres"
```

---

## 11. Monitoring & Observability

### Health Check Endpoint

Your `/api/health` should return:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.2.3",
  "environment": "production",
  "services": [
    { "name": "database", "status": "healthy", "latency": 45 },
    { "name": "redis", "status": "healthy", "latency": 2 },
    { "name": "clerk", "status": "healthy" },
    { "name": "stripe", "status": "healthy" }
  ]
}
```

### Monitoring Stack

| Tool | Purpose | Setup |
|------|---------|-------|
| **Sentry** | Error tracking | SDK integration |
| **BetterStack** | Uptime monitoring | External monitor |
| **Coolify Logs** | Application logs | Built-in |
| **Supabase Dashboard** | Database metrics | Built-in |

### Alerting Rules

Configure alerts for:

1. **Uptime**: Site down for > 1 minute
2. **Error Rate**: > 1% error rate in 5 minutes
3. **Response Time**: P95 > 2 seconds
4. **Database**: Connection pool exhausted
5. **Disk Space**: VPS disk > 80% full

### Log Levels

```typescript
// Use structured logging
import { logger } from '@/lib/logger';

logger.info('Booking created', { bookingId, customerId, tourId });
logger.warn('Payment retry', { bookingId, attempt: 3 });
logger.error('Payment failed', { bookingId, error: error.message });
```

---

## 12. Incident Response & Rollbacks

### Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P1** | Complete outage | < 15 min | Site down, payments broken |
| **P2** | Major feature broken | < 1 hour | Booking creation failing |
| **P3** | Minor issue | < 4 hours | UI bug, slow queries |
| **P4** | Cosmetic/low impact | Next sprint | Typo, minor UI issue |

### Rollback Procedures

#### Quick Rollback (Coolify)

1. Go to Coolify → Application → **Deployments**
2. Find the last working deployment
3. Click **Rollback** on that deployment
4. Verify health check passes

#### Git Rollback

```bash
# Identify the bad commit
git log --oneline -10

# Revert the bad commit
git revert <bad-commit-sha>
git push origin main

# Or reset to previous known-good state (destructive)
git reset --hard <good-commit-sha>
git push origin main --force  # ⚠️ Requires admin
```

#### Database Rollback

```bash
# If you have migration rollback
pnpm db:rollback

# If you need point-in-time recovery
# → Use Supabase dashboard → Backups → Restore
```

### Post-Incident Process

1. **Mitigate**: Stop the bleeding
2. **Communicate**: Update status page, notify users
3. **Investigate**: Find root cause
4. **Document**: Write incident report
5. **Prevent**: Implement fixes to prevent recurrence

---

## 13. Security Checklist

### Pre-Launch Security Review

- [ ] **Secrets Management**
  - [ ] All secrets in environment variables (not code)
  - [ ] Different secrets for staging vs production
  - [ ] Secrets rotated after any team departure

- [ ] **Authentication & Authorization**
  - [ ] Clerk production instance configured
  - [ ] Webhook signatures validated
  - [ ] RBAC properly implemented
  - [ ] Session timeout configured

- [ ] **Data Protection**
  - [ ] HTTPS enforced on all domains
  - [ ] Database connections use SSL
  - [ ] Sensitive data encrypted at rest
  - [ ] PII handling compliant with regulations

- [ ] **API Security**
  - [ ] Rate limiting configured
  - [ ] Input validation on all endpoints
  - [ ] CORS properly configured
  - [ ] No sensitive data in URLs

- [ ] **Infrastructure**
  - [ ] SSH key authentication (no passwords)
  - [ ] Firewall configured (only necessary ports)
  - [ ] Automatic security updates enabled
  - [ ] Regular dependency updates

- [ ] **Monitoring**
  - [ ] Error tracking active (Sentry)
  - [ ] Uptime monitoring active
  - [ ] Alerting configured
  - [ ] Audit logging for sensitive actions

### Security Headers

Add to `next.config.js`:
```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

---

## 14. Runbooks

### Runbook: Deploy to Production

```bash
# 1. Ensure all checks pass on dev
git checkout dev
make pre-deploy  # or: pnpm lint && pnpm typecheck && pnpm build

# 2. Deploy (merge dev to main)
make deploy
# or manually:
# git checkout main && git merge dev && git push origin main && git checkout dev

# 3. Monitor deployment
# → Watch GitHub Actions: https://github.com/your-repo/actions
# → Check Coolify deployment logs
# → Verify health check: https://app.yourdomain.com/api/health

# 4. Smoke test
curl -s https://app.yourdomain.com/api/health | jq .

# 5. Monitor for 15 minutes
# → Check Sentry for new errors
# → Check BetterStack for latency spikes
```

### Runbook: Database Migration

```bash
# 1. Generate migration locally
pnpm db:generate

# 2. Review generated SQL
cat packages/database/drizzle/*.sql

# 3. Test locally
pnpm db:push  # Apply to local database
pnpm dev      # Test the app

# 4. Deploy to production
make deploy   # Merge to main, triggers auto-deploy with db:push

# 5. Verify migration
pnpm db:studio  # Check schema
```

### Runbook: Rollback Deployment

```bash
# 1. Identify issue
# → Check Sentry for errors
# → Check health endpoint

# 2. Quick rollback via Coolify
# → Coolify Dashboard → Application → Deployments
# → Click "Rollback" on last working deployment

# 3. Verify rollback
curl -s https://app.yourdomain.com/api/health | jq .

# 4. Investigate and fix
git log --oneline -10  # Find bad commit
# → Fix issue on dev branch
# → Test locally first
# → Then deploy again
```

### Runbook: Respond to P1 Incident

```
1. ACKNOWLEDGE (< 5 min)
   □ Acknowledge alert
   □ Join incident channel
   □ Assign incident commander

2. ASSESS (< 10 min)
   □ Check health endpoint
   □ Check Sentry for errors
   □ Check Coolify logs
   □ Identify affected systems

3. MITIGATE (< 15 min)
   □ If bad deploy: Rollback
   □ If database: Check Supabase status
   □ If external service: Check status pages
   □ If traffic spike: Enable rate limiting

4. COMMUNICATE (ongoing)
   □ Update status page
   □ Notify affected users
   □ Regular updates every 15 min

5. RESOLVE
   □ Verify systems healthy
   □ Update status page: Resolved
   □ Schedule post-mortem

6. POST-MORTEM (< 48 hours)
   □ Write incident report
   □ Identify root cause
   □ Create action items
   □ Share learnings with team
```

---

## Quick Reference

### URLs

| Environment | App | URL |
|-------------|-----|-----|
| Local | CRM | http://localhost:3000 |
| Local | Web | http://localhost:3001 |
| Production | CRM | https://app.yourdomain.com |
| Production | Web | https://book.yourdomain.com |

### Important Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Health check (monitoring) |
| `/api/webhooks/clerk` | Clerk webhook receiver |
| `/api/webhooks/stripe` | Stripe webhook receiver |
| `/api/stripe/connect/callback` | Stripe Connect OAuth |

### Service Dashboards

| Service | URL |
|---------|-----|
| Coolify | https://your-coolify-url |
| Supabase | https://supabase.com/dashboard |
| Clerk | https://dashboard.clerk.com |
| Stripe | https://dashboard.stripe.com |
| Resend | https://resend.com/emails |
| Sentry | https://sentry.io |
| BetterStack | https://betterstack.com |

### Emergency Contacts

```
On-Call Engineer: [Your rotation system]
Supabase Support: support@supabase.io
Stripe Support: https://support.stripe.com
Clerk Support: support@clerk.dev
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-15 | Initial comprehensive guide | Team |
| 2024-XX-XX | Added CI/CD pipeline | — |
| 2024-XX-XX | Added monitoring section | — |
