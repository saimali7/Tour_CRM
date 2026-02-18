# Infrastructure Master Plan

**Version:** 1.0
**Created:** December 2024
**Status:** Reference Plan (refresh before execution)
**Timeline:** Phased rollout; not the active execution stream

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Design Decisions](#design-decisions)
4. [Component Specifications](#component-specifications)
5. [Implementation Phases](#implementation-phases)
6. [Configuration Reference](#configuration-reference)
7. [Backup & Recovery](#backup--recovery)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Security Hardening](#security-hardening)
10. [Scaling Roadmap](#scaling-roadmap)
11. [Cost Analysis](#cost-analysis)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

### The Goal

Transform our infrastructure into a **fully self-hosted, production-grade platform** that:
- Runs everything on a single VPS ($20/month)
- Handles 10,000+ bookings/month
- Requires minimal maintenance
- Has clear upgrade paths for growth

### Current State → Target State

```
CURRENT                              TARGET
─────────────────────────────────    ─────────────────────────────────
Supabase PostgreSQL ($25/mo)    →    Self-hosted PostgreSQL ($0)
Supabase Storage (Free 1GB)     →    Self-hosted MinIO (200GB)
No connection pooling           →    PgBouncer (100+ connections)
No caching strategy             →    Redis (sessions + cache)
No monitoring                   →    Uptime Kuma + alerts
No backup strategy              →    Automated daily backups
~$45-70/month                   →    ~$21-25/month
```

### Key Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Monthly cost | $45-70 | $21-25 |
| Database latency | 20-80ms | <1ms |
| Storage limit | 1GB | 200GB |
| Connection limit | ~20 | 100+ |
| Backup frequency | Daily (Supabase) | Hourly/Daily |
| Single point of failure | Multiple external | Single VPS |

---

## Architecture Overview

### High-Level Architecture

```
                                    INTERNET
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE (FREE)                                │
│                                                                               │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│    │     DNS     │    │     CDN     │    │    WAF      │                    │
│    │  Routing    │    │   Caching   │    │  Security   │                    │
│    └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                               │
│    Features: DDoS protection, SSL termination, static caching, analytics    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       │ HTTPS (443)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     HOSTINGER KVM 4 VPS ($20/month)                           │
│                     16GB RAM • 4 vCPU • 200GB NVMe                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         COOLIFY (PaaS Layer)                             │ │
│  │                                                                          │ │
│  │  • Git push deployments          • Zero-downtime deploys                │ │
│  │  • Docker container management   • Environment variables                 │ │
│  │  • SSL certificate management    • Resource monitoring                   │ │
│  │  • Log aggregation               • Health checks                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      TRAEFIK (Reverse Proxy)                             │ │
│  │                                                                          │ │
│  │  crm.domain.com    ──→  CRM App Container                               │ │
│  │  book.domain.com   ──→  Web App Container                               │ │
│  │  files.domain.com  ──→  MinIO Container                                 │ │
│  │  status.domain.com ──→  Uptime Kuma Container                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                       │
│       ┌───────────────────────────────┴───────────────────────────────┐      │
│       │                                                               │      │
│       ▼                                                               ▼      │
│  ┌─────────────────── APPLICATION LAYER ───────────────────────────────────┐ │
│  │                                                                          │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │ │
│  │  │   CRM APP    │   │   WEB APP    │   │   WORKER     │                │ │
│  │  │              │   │              │   │              │                │ │
│  │  │  Next.js 15  │   │  Next.js 15  │   │   Inngest    │                │ │
│  │  │  Staff UI    │   │  Public UI   │   │  Functions   │                │ │
│  │  │              │   │              │   │              │                │ │
│  │  │  Port 3000   │   │  Port 3001   │   │  Port 3002   │                │ │
│  │  │  ~500 MB     │   │  ~500 MB     │   │  ~200 MB     │                │ │
│  │  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │ │
│  │         │                  │                  │                         │ │
│  └─────────┼──────────────────┼──────────────────┼─────────────────────────┘ │
│            │                  │                  │                            │
│            └──────────────────┼──────────────────┘                            │
│                               │                                               │
│                               ▼                                               │
│  ┌─────────────────── DATA LAYER ──────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  ┌──────────────┐   ┌──────────────┐                                    │ │
│  │  │  PGBOUNCER   │   │    REDIS     │                                    │ │
│  │  │              │   │              │                                    │ │
│  │  │  Connection  │   │   Caching    │                                    │ │
│  │  │   Pooling    │   │  Sessions    │                                    │ │
│  │  │              │   │   Queues     │                                    │ │
│  │  │  Port 6432   │   │              │                                    │ │
│  │  │  ~50 MB      │   │  Port 6379   │                                    │ │
│  │  └──────┬───────┘   │  ~500 MB     │                                    │ │
│  │         │           └──────────────┘                                    │ │
│  │         ▼                                                                │ │
│  │  ┌──────────────┐   ┌──────────────┐                                    │ │
│  │  │ POSTGRESQL   │   │    MINIO     │                                    │ │
│  │  │              │   │              │                                    │ │
│  │  │  Version 16  │   │  S3-Compat   │                                    │ │
│  │  │  All Data    │   │   Storage    │                                    │ │
│  │  │              │   │              │                                    │ │
│  │  │  Port 5432   │   │  Port 9000   │                                    │ │
│  │  │  ~3.5 GB     │   │  Console     │                                    │ │
│  │  │              │   │  Port 9001   │                                    │ │
│  │  │              │   │  ~500 MB     │                                    │ │
│  │  └──────────────┘   └──────────────┘                                    │ │
│  │                                                                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────── MONITORING LAYER ────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │ │
│  │  │ UPTIME KUMA  │   │   COOLIFY    │   │   BACKUPS    │                │ │
│  │  │              │   │    LOGS      │   │              │                │ │
│  │  │  Health      │   │              │   │  Scheduled   │                │ │
│  │  │  Checks      │   │  Aggregated  │   │  pg_dump     │                │ │
│  │  │  Alerts      │   │  Container   │   │  → Cloud     │                │ │
│  │  │              │   │  Logs        │   │              │                │ │
│  │  │  Port 3003   │   │              │   │  Daily +     │                │ │
│  │  │  ~100 MB     │   │              │   │  Hourly      │                │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘                │ │
│  │                                                                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  RESOURCE SUMMARY                                                            │
│                                                                               │
│  RAM:  Used ~7.5 GB  │  Free ~8.5 GB  │  Utilization: 47%                  │
│  Disk: Used ~80 GB   │  Free ~120 GB  │  Utilization: 40%                  │
│  CPU:  Avg ~20%      │  Peak ~60%     │  Headroom: Good                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES (Cannot Self-Host)                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   CLERK     │  │   STRIPE    │  │   RESEND    │  │  INNGEST    │        │
│  │             │  │             │  │             │  │   CLOUD     │        │
│  │  Auth/SSO   │  │  Payments   │  │   Email     │  │             │        │
│  │  Teams      │  │  Billing    │  │  Delivery   │  │  Job Queue  │        │
│  │             │  │             │  │             │  │  Scheduling │        │
│  │  $0-25/mo   │  │  % of txn   │  │  $0-20/mo   │  │  $0/mo      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │   SENTRY    │  │ BACKBLAZE   │   Why keep these external:               │
│  │             │  │     B2      │   • Clerk: Auth is complex, security     │
│  │   Error     │  │             │   • Stripe: Payment processing           │
│  │  Tracking   │  │   Backup    │   • Resend: Email deliverability         │
│  │             │  │   Storage   │   • Inngest: Managed job infrastructure  │
│  │  $0/mo      │  │   ~$1/mo    │   • Sentry: Global error aggregation     │
│  └─────────────┘  └─────────────┘   • Backblaze: Off-site backup storage   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  Customer/Staff Browser
          │
          │ HTTPS Request
          ▼
  ┌───────────────┐
  │  Cloudflare   │ ─── Cached? ─── YES ──→ Return cached response
  │     CDN       │
  └───────┬───────┘
          │ NO (cache miss)
          ▼
  ┌───────────────┐
  │    Traefik    │ ─── Route based on domain
  │  (Coolify)    │
  └───────┬───────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
┌───────┐  ┌───────┐    ┌───────────┐
│  CRM  │  │  Web  │    │  MinIO    │
│  App  │  │  App  │    │ (files)   │
└───┬───┘  └───┬───┘    └───────────┘
    │          │
    └────┬─────┘
         │
         ▼
  ┌───────────────┐
  │    Redis      │ ─── Cached? ─── YES ──→ Return from cache
  │   (Cache)     │
  └───────┬───────┘
          │ NO
          ▼
  ┌───────────────┐
  │  PgBouncer    │ ─── Connection pool
  │   (Pooler)    │
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  PostgreSQL   │ ─── Query database
  │   (Data)      │
  └───────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND JOB FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  App Event (booking created, etc.)
          │
          │ HTTP Event
          ▼
  ┌───────────────┐
  │   Inngest     │ ─── Queued + Scheduled
  │    Cloud      │
  └───────┬───────┘
          │ Webhook
          ▼
  ┌───────────────┐
  │   Worker      │ ─── Execute function
  │  (Next.js)    │
  └───────┬───────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
┌───────┐  ┌───────┐    ┌───────────┐
│ Email │  │  DB   │    │   SMS     │
│Resend │  │Update │    │  Twilio   │
└───────┘  └───────┘    └───────────┘
```

---

## Design Decisions

### Decision 1: Self-Host PostgreSQL

| Factor | Supabase | Self-Hosted | Winner |
|--------|----------|-------------|--------|
| Cost | $25/mo | $0 | Self-Hosted |
| Latency | 20-80ms | <1ms | Self-Hosted |
| Control | Limited | Full | Self-Hosted |
| Backups | Automatic | Manual setup | Supabase |
| Effort | Zero | Initial setup | Supabase |

**Decision:** Self-host. The $300/year savings and latency improvement outweigh the one-time setup effort.

**Mitigations:**
- Automated backup script (set up once)
- PgBouncer for connection pooling
- Monitoring for early warning

---

### Decision 2: Self-Host Storage (MinIO)

| Factor | Supabase Storage | MinIO | Winner |
|--------|------------------|-------|--------|
| Cost | $0 (1GB) / $25 (more) | $0 | MinIO |
| Limit | 1GB free | 200GB (disk) | MinIO |
| CDN | Built-in | Via Cloudflare | Tie |
| Code changes | None | ~1 hour | Supabase |
| Latency | Network | Local | MinIO |

**Decision:** Self-host with MinIO. We need more than 1GB, and self-hosting avoids the $25/mo jump.

**Mitigations:**
- Cloudflare caching for CDN functionality
- Backup to Backblaze B2

---

### Decision 3: Connection Pooling with PgBouncer

**Why needed:**
- Next.js serverless creates many short-lived connections
- PostgreSQL has connection overhead (~10MB per connection)
- Without pooling: 50 concurrent requests = 50 connections = 500MB wasted

**Configuration:**
```
Apps → PgBouncer (Port 6432) → PostgreSQL (Port 5432)

Pool Mode: Transaction (best for serverless)
Max Connections: 100 (PgBouncer)
PostgreSQL Connections: 20 (actual DB connections)
```

**Result:** 100 app connections share 20 database connections efficiently.

---

### Decision 4: Redis for Caching

**Use cases:**
1. **Session storage** - User sessions across requests
2. **Query caching** - Hot data (tour availability, pricing)
3. **Rate limiting** - API protection
4. **Job queues** - Background task coordination

**Why not in-memory (Next.js)?**
- Serverless functions are stateless
- Memory not shared across instances
- Redis persists across deployments

---

### Decision 5: Keep External Services

| Service | Why Not Self-Host |
|---------|-------------------|
| **Clerk** | Auth security is critical, MFA, SSO complexity |
| **Stripe** | PCI compliance, payment processing |
| **Resend** | Email deliverability requires reputation |
| **Inngest** | Job orchestration, retries, monitoring |
| **Sentry** | Global error aggregation, alerting |
| **Backblaze** | Off-site backups (defeats purpose if on same VPS) |

---

## Component Specifications

### PostgreSQL 16

```yaml
# Coolify Database Configuration
image: postgres:16-alpine
port: 5432
volumes:
  - postgres_data:/var/lib/postgresql/data

environment:
  POSTGRES_USER: tour_crm
  POSTGRES_PASSWORD: <generated-secure-password>
  POSTGRES_DB: tour_crm

# Performance tuning for 16GB VPS (allocate ~4GB to Postgres)
  POSTGRES_SHARED_BUFFERS: 1GB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 3GB
  POSTGRES_WORK_MEM: 32MB
  POSTGRES_MAINTENANCE_WORK_MEM: 256MB
  POSTGRES_MAX_CONNECTIONS: 100
  POSTGRES_WAL_BUFFERS: 32MB
```

**Resource allocation:**
- Shared buffers: 1GB (caches frequently accessed data)
- Effective cache size: 3GB (tells planner about OS cache)
- Work mem: 32MB (per-operation sorting/hashing)
- Max connections: 100 (managed by PgBouncer)

---

### PgBouncer

```yaml
# Coolify Service Configuration
image: edoburu/pgbouncer:latest
port: 6432

environment:
  DATABASE_URL: postgres://tour_crm:<password>@postgresql:5432/tour_crm
  POOL_MODE: transaction
  MAX_CLIENT_CONN: 100
  DEFAULT_POOL_SIZE: 20
  MIN_POOL_SIZE: 5
  RESERVE_POOL_SIZE: 5
  RESERVE_POOL_TIMEOUT: 3
  SERVER_LIFETIME: 3600
  SERVER_IDLE_TIMEOUT: 600

depends_on:
  - postgresql
```

**Connection math:**
- Apps can open 100 connections to PgBouncer
- PgBouncer maintains 20-25 actual PostgreSQL connections
- Transaction mode: Connection returned to pool after each transaction

---

### Redis

```yaml
# Coolify Service Configuration
image: redis:7-alpine
port: 6379
command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

volumes:
  - redis_data:/data

healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 3
```

**Configuration:**
- `appendonly yes`: Persist data to disk
- `maxmemory 512mb`: Limit RAM usage
- `allkeys-lru`: Evict least recently used keys when full

---

### MinIO (S3-Compatible Storage)

```yaml
# Coolify Service Configuration
image: minio/minio:latest
ports:
  - 9000:9000  # API
  - 9001:9001  # Console

command: server /data --console-address ":9001"

environment:
  MINIO_ROOT_USER: minioadmin
  MINIO_ROOT_PASSWORD: <generated-secure-password>
  MINIO_BROWSER_REDIRECT_URL: https://files.yourdomain.com

volumes:
  - minio_data:/data

healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  interval: 30s
  timeout: 10s
  retries: 3
```

**Buckets to create:**
- `tour-images` - Tour photos, guide photos
- `documents` - Waivers, invoices, receipts
- `backups` - Database backup files (optional, prefer Backblaze)

---

### Uptime Kuma

```yaml
# Coolify Service Configuration
image: louislam/uptime-kuma:latest
port: 3001

volumes:
  - uptime_kuma_data:/app/data

environment:
  PUID: 1000
  PGID: 1000
```

**Monitors to configure:**
- CRM App: `https://crm.yourdomain.com/api/health`
- Web App: `https://book.yourdomain.com/api/health`
- PostgreSQL: TCP check on port 5432
- Redis: TCP check on port 6379
- MinIO: `http://minio:9000/minio/health/live`

---

## Implementation Phases

### Phase 0: Preparation (Day 1)

```
┌─────────────────────────────────────────────────────────────────┐
│ CHECKLIST                                                        │
├─────────────────────────────────────────────────────────────────┤
│ □ Access to Coolify dashboard                                   │
│ □ SSH access to VPS                                             │
│ □ Supabase dashboard access (for data export)                   │
│ □ Backblaze B2 account created                                  │
│ □ Domain DNS managed in Cloudflare                              │
│ □ Backup of current .env files                                  │
│ □ List of all current environment variables                     │
│ □ Maintenance window communicated (if live)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Database Layer (Days 1-2)

#### Step 1.1: Deploy PostgreSQL

```bash
# In Coolify:
# 1. Go to Projects → Your Project → Add Resource
# 2. Select "PostgreSQL" from databases
# 3. Configure:
#    - Name: tour-crm-postgres
#    - Version: 16
#    - Generate secure password
#    - Add environment variables for tuning
```

#### Step 1.2: Deploy PgBouncer

```bash
# In Coolify:
# 1. Add Resource → Docker Compose
# 2. Use the PgBouncer configuration above
# 3. Connect to PostgreSQL internal network
```

#### Step 1.3: Export Data from Supabase

```bash
# On your local machine:
pg_dump "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=supabase_backup.dump
```

#### Step 1.4: Import Data to Self-Hosted PostgreSQL

```bash
# Connect to Coolify VPS:
ssh root@your-vps-ip

# Copy backup to VPS:
scp supabase_backup.dump root@your-vps-ip:/tmp/

# Import (find PostgreSQL container):
docker exec -i <postgres-container> pg_restore \
  -U tour_crm \
  -d tour_crm \
  --no-owner \
  --no-acl \
  /tmp/supabase_backup.dump
```

#### Step 1.5: Update Application Environment

```bash
# Old (Supabase):
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# New (Self-hosted via PgBouncer):
DATABASE_URL=postgresql://tour_crm:[password]@pgbouncer:6432/tour_crm

# Direct connection (for migrations only):
DIRECT_URL=postgresql://tour_crm:[password]@postgresql:5432/tour_crm
```

#### Step 1.6: Verify Database

```bash
# Test connection from app container:
docker exec -it <crm-app-container> sh
npx drizzle-kit studio

# Run a test query:
pnpm db:push --dry-run
```

---

### Phase 2: Storage Layer (Days 2-3)

#### Step 2.1: Deploy MinIO

```bash
# In Coolify:
# 1. Add Resource → Docker Image
# 2. Image: minio/minio:latest
# 3. Configure ports, volumes, environment
# 4. Set up domain: files.yourdomain.com
```

#### Step 2.2: Configure MinIO Buckets

```bash
# Access MinIO Console at https://files.yourdomain.com:9001
# Or use mc CLI:

# Install MinIO Client
brew install minio/stable/mc

# Configure connection
mc alias set tour http://localhost:9000 minioadmin <password>

# Create buckets
mc mb tour/tour-images
mc mb tour/documents

# Set public read policy for tour-images
mc anonymous set download tour/tour-images
```

#### Step 2.3: Update Storage Service

```typescript
// packages/services/src/storage-service.ts

// Before (Supabase):
import { createClient } from "@supabase/supabase-js";

// After (S3/MinIO):
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // http://minio:9000
  region: "us-east-1", // MinIO ignores this but SDK requires it
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});
```

#### Step 2.4: Migrate Existing Files

```bash
# Export from Supabase Storage (if any files exist):
# Use Supabase dashboard to download files manually
# Or use their CLI

# Upload to MinIO:
mc cp --recursive ./downloaded-files/ tour/tour-images/
```

#### Step 2.5: Configure Cloudflare CDN

```
# In Cloudflare Dashboard:
# 1. Add CNAME: files.yourdomain.com → your-vps-ip
# 2. Enable proxy (orange cloud)
# 3. Caching Rules:
#    - Cache everything under /tour-images/*
#    - TTL: 1 month for images
```

---

### Phase 3: Caching Layer (Day 3)

#### Step 3.1: Deploy Redis

```bash
# In Coolify:
# 1. Add Resource → Redis
# 2. Configure with persistence enabled
# 3. Set memory limit to 512MB
```

#### Step 3.2: Add Redis Environment Variables

```bash
# In Coolify app environment:
REDIS_URL=redis://redis:6379
```

#### Step 3.3: Implement Session Caching

```typescript
// Example: Cache tour availability
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

async function getTourAvailability(tourId: string, date: string) {
  const cacheKey = `availability:${tourId}:${date}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from database
  const availability = await db.query.schedules.findMany({...});

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(availability), "EX", 300);

  return availability;
}
```

---

### Phase 4: Backup System (Day 4)

#### Step 4.1: Create Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/tmp/backups"
S3_BUCKET="s3://your-backblaze-bucket/postgres-backups"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="tour_crm_${DATE}.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database (find container dynamically)
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
docker exec $POSTGRES_CONTAINER pg_dump -U tour_crm tour_crm | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Upload to Backblaze B2
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "$S3_BUCKET/$BACKUP_FILE" --endpoint-url https://s3.us-west-000.backblazeb2.com

# Clean up local file
rm "$BACKUP_DIR/$BACKUP_FILE"

# Delete old backups from B2 (older than retention)
aws s3 ls "$S3_BUCKET/" --endpoint-url https://s3.us-west-000.backblazeb2.com | \
  awk '{print $4}' | \
  while read file; do
    file_date=$(echo $file | grep -oP '\d{4}-\d{2}-\d{2}')
    if [[ $(date -d "$file_date" +%s) -lt $(date -d "-$RETENTION_DAYS days" +%s) ]]; then
      aws s3 rm "$S3_BUCKET/$file" --endpoint-url https://s3.us-west-000.backblazeb2.com
    fi
  done

echo "Backup completed: $BACKUP_FILE"
```

#### Step 4.2: Set Up Cron Jobs

```bash
# SSH into VPS
ssh root@your-vps-ip

# Edit crontab
crontab -e

# Add backup schedules:
# Daily full backup at 3 AM
0 3 * * * /opt/scripts/backup-database.sh >> /var/log/backup.log 2>&1

# Hourly backup during business hours (optional)
0 9-18 * * 1-5 /opt/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

#### Step 4.3: Configure Backblaze B2

```bash
# Install AWS CLI (works with B2)
apt install awscli

# Configure credentials
aws configure
# Access Key: your-backblaze-keyID
# Secret Key: your-backblaze-applicationKey
# Region: us-west-000
```

---

### Phase 5: Monitoring (Day 5)

#### Step 5.1: Deploy Uptime Kuma

```bash
# In Coolify:
# 1. Add Resource → Docker Image
# 2. Image: louislam/uptime-kuma:latest
# 3. Configure volume for persistence
# 4. Set up domain: status.yourdomain.com
```

#### Step 5.2: Configure Monitors

| Monitor | Type | URL/Host | Interval |
|---------|------|----------|----------|
| CRM App | HTTP | https://crm.domain.com/api/health | 60s |
| Web App | HTTP | https://book.domain.com/api/health | 60s |
| PostgreSQL | TCP | postgresql:5432 | 60s |
| Redis | TCP | redis:6379 | 60s |
| MinIO | HTTP | http://minio:9000/minio/health/live | 60s |
| PgBouncer | TCP | pgbouncer:6432 | 60s |

#### Step 5.3: Add Health Check Endpoints

```typescript
// apps/crm/src/app/api/health/route.ts
import { db, sql } from "@tour/database";
import Redis from "ioredis";

export async function GET() {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {} as Record<string, string>,
  };

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    checks.services.database = "healthy";
  } catch {
    checks.services.database = "unhealthy";
    checks.status = "degraded";
  }

  // Redis check
  try {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    await redis.quit();
    checks.services.redis = "healthy";
  } catch {
    checks.services.redis = "unhealthy";
    checks.status = "degraded";
  }

  return Response.json(checks, {
    status: checks.status === "healthy" ? 200 : 503,
  });
}
```

#### Step 5.4: Configure Alerts

```
# In Uptime Kuma:
# 1. Settings → Notifications
# 2. Add notification methods:
#    - Email (via SMTP or Resend)
#    - SMS (via Twilio - for critical alerts)
#    - Slack/Discord webhook (optional)
```

---

### Phase 6: Verification & Cutover (Days 5-7)

#### Step 6.1: Pre-Cutover Checklist

```
□ All services running in Coolify
□ Database migrated and verified
□ Storage working with test uploads
□ Redis caching functional
□ Backups running and verified
□ Monitoring showing all green
□ DNS TTL lowered to 300s (for quick rollback)
□ Team notified of maintenance window
```

#### Step 6.2: Cutover Steps

```bash
# 1. Put site in maintenance mode (optional)
# 2. Final data sync from Supabase
# 3. Update environment variables in Coolify
# 4. Redeploy applications
# 5. Verify all functionality
# 6. Monitor for 24 hours
# 7. Disable Supabase (don't delete yet - keep as backup)
```

#### Step 6.3: Rollback Plan

```bash
# If issues occur:
# 1. Revert DATABASE_URL to Supabase
# 2. Revert storage URLs
# 3. Redeploy
# 4. Investigate issues with self-hosted setup
```

---

## Configuration Reference

### Environment Variables (Complete)

```bash
# =============================================================================
# APPLICATION
# =============================================================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crm.yourdomain.com
NEXT_PUBLIC_WEB_URL=https://book.yourdomain.com

# =============================================================================
# DATABASE (Self-Hosted PostgreSQL via PgBouncer)
# =============================================================================
DATABASE_URL=postgresql://tour_crm:<password>@pgbouncer:6432/tour_crm
DIRECT_URL=postgresql://tour_crm:<password>@postgresql:5432/tour_crm

# =============================================================================
# CACHE (Self-Hosted Redis)
# =============================================================================
REDIS_URL=redis://redis:6379

# =============================================================================
# STORAGE (Self-Hosted MinIO)
# =============================================================================
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=<your-minio-password>
S3_BUCKET=tour-images
S3_PUBLIC_URL=https://files.yourdomain.com

# =============================================================================
# AUTHENTICATION (Clerk - External)
# =============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# =============================================================================
# PAYMENTS (Stripe - External)
# =============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# =============================================================================
# EMAIL (Resend - External)
# =============================================================================
RESEND_API_KEY=re_xxx

# =============================================================================
# BACKGROUND JOBS (Inngest - External)
# =============================================================================
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# =============================================================================
# MONITORING (Sentry - External)
# =============================================================================
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# =============================================================================
# SMS (Twilio - External)
# =============================================================================
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

---

## Backup & Recovery

### Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| PostgreSQL Full | Daily 3 AM | 30 days | Backblaze B2 |
| PostgreSQL (business hours) | Hourly | 24 hours | Local |
| Redis RDB | Every 15 min | 24 hours | Local volume |
| MinIO files | Daily 4 AM | 30 days | Backblaze B2 |

### Recovery Procedures

#### Database Recovery

```bash
# 1. List available backups
aws s3 ls s3://your-bucket/postgres-backups/ --endpoint-url https://s3.us-west-000.backblazeb2.com

# 2. Download desired backup
aws s3 cp s3://your-bucket/postgres-backups/tour_crm_2024-01-15.sql.gz /tmp/ --endpoint-url ...

# 3. Stop application (prevent writes)
# In Coolify: Stop CRM and Web apps

# 4. Restore database
gunzip /tmp/tour_crm_2024-01-15.sql.gz
docker exec -i <postgres-container> psql -U tour_crm tour_crm < /tmp/tour_crm_2024-01-15.sql

# 5. Restart applications
# In Coolify: Start CRM and Web apps

# 6. Verify data integrity
```

#### Point-in-Time Recovery

```
Note: Full point-in-time recovery requires WAL archiving.
For most use cases, daily backups + hourly business-hours backups
provide sufficient recovery points.

If true PITR is needed, configure:
- archive_mode = on
- archive_command = 'aws s3 cp %p s3://bucket/wal/%f'
- Restore with pg_basebackup + WAL replay
```

---

## Monitoring & Alerts

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | >70% 5min | >90% 5min | Scale up |
| RAM Usage | >80% | >90% | Investigate leaks |
| Disk Usage | >70% | >85% | Clean up / expand |
| DB Connections | >80 | >95 | Check for leaks |
| Response Time | >500ms | >2000ms | Investigate |
| Error Rate | >1% | >5% | Investigate |

### Uptime Kuma Configuration

```yaml
# Export of monitor configuration
monitors:
  - name: "CRM App"
    type: http
    url: https://crm.yourdomain.com/api/health
    interval: 60
    retryInterval: 30
    maxretries: 3

  - name: "PostgreSQL"
    type: tcp
    hostname: postgresql
    port: 5432
    interval: 60

  - name: "Redis"
    type: tcp
    hostname: redis
    port: 6379
    interval: 60
```

---

## Security Hardening

### Firewall Rules (UFW)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Reset and configure UFW
ufw reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (change port if using non-standard)
ufw allow 22/tcp

# Allow HTTP/HTTPS (Cloudflare proxy)
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Verify
ufw status verbose
```

### Internal Services

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK ISOLATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PUBLIC (via Cloudflare only):                                  │
│    • Port 443 → Traefik → Apps                                 │
│                                                                  │
│  INTERNAL ONLY (Docker network):                                │
│    • PostgreSQL (5432) - Never exposed                         │
│    • PgBouncer (6432) - Never exposed                          │
│    • Redis (6379) - Never exposed                              │
│    • MinIO API (9000) - Via Traefik only                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Secret Management

```
✅ All secrets in Coolify environment variables
✅ Never commit secrets to git
✅ Rotate database passwords quarterly
✅ Use separate credentials per service
✅ Audit access logs monthly
```

---

## Scaling Roadmap

### Current Capacity (KVM 4)

```
Estimated capacity with current setup:
• Concurrent users: ~500
• Requests/second: ~100
• Bookings/month: ~10,000-20,000
• Database size: ~50GB comfortable
• File storage: ~100GB comfortable
```

### Scaling Triggers & Actions

| Trigger | Metric | Action | Cost Impact |
|---------|--------|--------|-------------|
| **Stage 1** | RAM >80% sustained | Upgrade to KVM 8 (32GB) | +$20/mo |
| **Stage 2** | CPU >70% sustained | Upgrade VPS tier | +$20/mo |
| **Stage 3** | DB >100GB | Dedicated database VPS | +$20/mo |
| **Stage 4** | >1000 concurrent | Add second app server + load balancer | +$50/mo |
| **Stage 5** | Enterprise scale | Migrate to Kubernetes | Different game |

### Horizontal Scaling Path

```
STAGE 1-2: Vertical (Current)
┌─────────────────┐
│    Single VPS   │
│   Everything    │
└─────────────────┘

STAGE 3: Split Database
┌─────────────────┐     ┌─────────────────┐
│   App Server    │────▶│  Database VPS   │
│   (Apps+Redis)  │     │  (PG+PgBouncer) │
└─────────────────┘     └─────────────────┘

STAGE 4: Load Balanced
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐     ┌─────────────────┐
│ App 1 │ │ App 2 │────▶│  Database VPS   │
└───────┘ └───────┘     └─────────────────┘
```

---

## Cost Analysis

### Monthly Costs (After Migration)

| Service | Cost | Notes |
|---------|------|-------|
| Hostinger KVM 4 | $20 | All self-hosted services |
| Backblaze B2 | ~$1 | Backup storage |
| Cloudflare | $0 | Free tier |
| Clerk | $0-25 | Free up to 10K MAU |
| Stripe | 2.9% + 30¢ | Per transaction |
| Resend | $0-20 | Free 3K/mo |
| Inngest | $0 | Free tier |
| Sentry | $0 | Free tier |
| **TOTAL** | **$21-46** | |

### Comparison

| Configuration | Monthly | Annual |
|---------------|---------|--------|
| Before (Supabase Pro) | $45-70 | $540-840 |
| After (Self-hosted) | $21-46 | $252-552 |
| **Savings** | **$24-49** | **$288-588** |

---

## Troubleshooting Guide

### Common Issues

#### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PgBouncer logs
docker logs <pgbouncer-container> --tail 100

# Test direct connection
docker exec -it <postgres-container> psql -U tour_crm -d tour_crm -c "SELECT 1"

# Check connection count
docker exec -it <postgres-container> psql -U tour_crm -d tour_crm -c "SELECT count(*) FROM pg_stat_activity"
```

#### High Memory Usage

```bash
# Check what's using memory
docker stats

# PostgreSQL memory
docker exec -it <postgres-container> psql -U tour_crm -c "SHOW shared_buffers"

# Clear Redis cache if needed
docker exec -it <redis-container> redis-cli FLUSHDB
```

#### Slow Queries

```bash
# Enable query logging temporarily
docker exec -it <postgres-container> psql -U tour_crm -c "ALTER SYSTEM SET log_min_duration_statement = 1000"
docker exec -it <postgres-container> psql -U tour_crm -c "SELECT pg_reload_conf()"

# Check slow query log
docker logs <postgres-container> | grep duration
```

#### Backup Failures

```bash
# Check backup script manually
/opt/scripts/backup-database.sh

# Check cron logs
grep backup /var/log/syslog

# Verify Backblaze credentials
aws s3 ls s3://your-bucket/ --endpoint-url https://s3.us-west-000.backblazeb2.com
```

---

## Known Issues & TODO

### PgBouncer (Not Yet Working)

PgBouncer is deployed in Coolify but not wired up to CRM. Currently using direct PostgreSQL connection.

**Issues encountered (Dec 2024):**

1. **Docker Networking**: Services deployed separately in Coolify are on different Docker networks by default. CRM couldn't resolve PgBouncer container name (`EAI_AGAIN` DNS error).

2. **Authentication Mismatch**: PostgreSQL uses `scram-sha-256` by default. PgBouncer needs matching auth config:
   ```
   server login failed: wrong password type
   ```

**To fix later:**

1. Enable "Connect To Predefined Network" on ALL services (PostgreSQL, PgBouncer, CRM, Redis, MinIO)

2. Update PgBouncer compose with correct auth:
   ```yaml
   services:
     pgbouncer:
       image: edoburu/pgbouncer:v1.24.1-p1
       environment:
         - DATABASE_URL=postgresql://USER:PASS@POSTGRES_CONTAINER:5432/DB
         - POOL_MODE=transaction
         - MAX_CLIENT_CONN=100
         - DEFAULT_POOL_SIZE=20
         - AUTH_TYPE=scram-sha-256
   ```

3. Update CRM `DATABASE_URL` to point to PgBouncer:
   ```
   DATABASE_URL=postgresql://USER:PASS@pgbouncer-container:5432/DB
   ```

**When to prioritize**: When you have 50+ concurrent users or see PostgreSQL connection exhaustion errors.

---

## Next Steps

After reviewing this plan:

1. **Approve the approach** - Any changes to the architecture?
2. **Schedule implementation** - Pick a low-traffic window
3. **Start Phase 1** - Database migration first
4. **Iterate** - Each phase builds on the previous

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial plan |

---

*This document is the source of truth for infrastructure decisions. Update it as the system evolves.*
