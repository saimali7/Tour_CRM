# Tour CRM - Production Deployment Guide

This guide covers deploying Tour CRM to production using Coolify on a VPS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOSTINGER VPS + COOLIFY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │    Tour CRM     │  │      Redis      │                       │
│  │   (Next.js)     │  │    (Cache)      │                       │
│  │   Port 3000     │  │   Port 6379     │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
│           │                    │                                 │
│           └────────────────────┘                                 │
│                    │                                             │
│  ┌─────────────────┴─────────────────────────────────────────┐  │
│  │                 Traefik (Reverse Proxy)                    │  │
│  │              Auto SSL via Let's Encrypt                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Cloud)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │   Storage   │  │  Realtime   │             │
│  │  Database   │  │  (Images)   │  │  (Future)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **VPS Server** (Hostinger, DigitalOcean, etc.)
   - Minimum: 2 CPU, 4GB RAM, 40GB SSD
   - Recommended: 4 CPU, 8GB RAM, 80GB SSD
   - Ubuntu 22.04 LTS

2. **Domain Name** with DNS access

3. **External Services** (already configured):
   - Supabase (database)
   - Clerk (authentication)
   - Stripe (payments)
   - Resend (email)
   - Inngest (background jobs)

---

## Step 1: Install Coolify

SSH into your VPS and run:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Access Coolify at `http://YOUR_VPS_IP:8000` and complete the setup wizard.

---

## Step 2: Add Your Repository

1. Go to **Sources** in Coolify
2. Click **Add New Source**
3. Select **GitHub** (or your git provider)
4. Authenticate and select your repository: `saimali7/Tour_CRM`

---

## Step 3: Create the Application

1. Go to **Projects** → **Create New Project**
2. Name it: `Tour CRM Production`
3. Click **Add New Resource** → **Application**
4. Select your GitHub source and repository
5. Configure:
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Location**: `apps/crm/Dockerfile`
   - **Build Context**: `.` (root of repo)

---

## Step 4: Configure Environment Variables

In the application settings, add these environment variables:

### Required Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Background Jobs (Inngest)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crm.yourdomain.com

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Guide Portal
GUIDE_PORTAL_URL=https://crm.yourdomain.com/guide
```

### Optional Variables

```env
# Redis (if using external Redis)
REDIS_URL=redis://:password@redis:6379

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org
SENTRY_PROJECT=tour-crm

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Step 5: Configure Domain & SSL

1. In Coolify, go to your application → **Settings**
2. Under **Domains**, add: `crm.yourdomain.com`
3. Enable **HTTPS** (Coolify handles Let's Encrypt automatically)
4. Point your DNS A record to your VPS IP:
   ```
   Type: A
   Name: crm
   Value: YOUR_VPS_IP
   TTL: 3600
   ```

---

## Step 6: Deploy

1. Click **Deploy** in Coolify
2. Watch the build logs for any errors
3. Once deployed, visit `https://crm.yourdomain.com`

---

## Step 7: Configure Webhooks

### Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Add endpoint: `https://crm.yourdomain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `organization.*`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET`

### Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks
2. Add endpoint: `https://crm.yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.*`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Inngest

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Add app URL: `https://crm.yourdomain.com/api/inngest`
3. The signing key should already be configured

---

## Step 8: Database Migration

After first deployment, run migrations:

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Access the container
docker exec -it tour_crm sh

# Run migrations (if needed)
npx drizzle-kit push
```

Or use Coolify's **Execute Command** feature.

---

## Monitoring & Maintenance

### Health Check

The app exposes a health endpoint:
```
GET https://crm.yourdomain.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-13T10:00:00Z",
  "checks": {
    "database": { "status": "up", "latency": 5 }
  }
}
```

### Viewing Logs

In Coolify:
1. Go to your application
2. Click **Logs** tab
3. View real-time logs

Or via SSH:
```bash
docker logs -f tour_crm
```

### Redeploying

Coolify supports automatic deployments on push:
1. Go to application → **Settings**
2. Enable **Auto Deploy**
3. Every push to `main` triggers a deployment

---

## Rollback

If a deployment fails:
1. Go to application → **Deployments**
2. Find the last working deployment
3. Click **Rollback**

---

## Scaling (Future)

For horizontal scaling:
1. Add more VPS instances
2. Use Coolify's built-in load balancer
3. Consider external Redis (Upstash) for session sharing

---

## Troubleshooting

### Build Fails

1. Check build logs in Coolify
2. Ensure all env variables are set
3. Try rebuilding: **Restart** → **Rebuild**

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check Supabase dashboard for connection limits
3. Ensure VPS IP is not blocked

### Slow Performance

1. Check container resources in Coolify
2. Monitor with: `docker stats tour_crm`
3. Consider upgrading VPS or adding Redis cache

### SSL Issues

1. Verify DNS is pointing to VPS
2. Check Traefik logs: `docker logs coolify-proxy`
3. Wait 5-10 minutes for cert propagation

---

## Security Checklist

- [ ] All secrets are in environment variables (not in code)
- [ ] HTTPS is enabled
- [ ] Clerk is using production keys
- [ ] Stripe is using live keys
- [ ] Database has strong password
- [ ] JWT_SECRET is randomly generated
- [ ] Firewall allows only ports 80, 443, 22
- [ ] SSH uses key authentication (not password)
- [ ] Regular backups configured in Supabase

---

## Environment Variable Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase connection string (pooled) |
| `DIRECT_URL` | Yes | Supabase direct connection |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | Clerk webhook signing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe public key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `INNGEST_EVENT_KEY` | Yes | Inngest event key |
| `INNGEST_SIGNING_KEY` | Yes | Inngest signing key |
| `NEXT_PUBLIC_APP_URL` | Yes | Production URL |
| `JWT_SECRET` | Yes | Guide portal JWT secret |
| `REDIS_URL` | No | Redis connection string |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking |
