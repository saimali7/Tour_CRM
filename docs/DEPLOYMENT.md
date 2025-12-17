# Production Deployment Guide

This guide covers deploying Tour CRM to production using Coolify on a VPS with Supabase as the database.

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           EXTERNAL SERVICES          │
                    ├─────────────────────────────────────┤
                    │  Supabase (Database)                │
                    │  Clerk (Authentication)             │
                    │  Stripe (Payments)                  │
                    │  Resend (Email)                     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         HOSTINGER VPS + COOLIFY      │
                    ├─────────────────────────────────────┤
                    │  ┌─────────┐  ┌─────────┐           │
                    │  │   CRM   │  │   Web   │ (optional)│
                    │  │  :3000  │  │  :3001  │           │
                    │  └────┬────┘  └────┬────┘           │
                    │       │            │                │
                    │  ┌────▼────────────▼────┐           │
                    │  │   Traefik (SSL/LB)   │           │
                    │  └──────────────────────┘           │
                    │       │                             │
                    │  ┌────▼────┐                        │
                    │  │  Redis  │                        │
                    │  └─────────┘                        │
                    └─────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:

- [ ] A VPS with Coolify installed (KVM4 or better recommended)
- [ ] A domain name with DNS access
- [ ] SSH access to your server

---

## Step 1: External Services Setup

### 1.1 Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (~2 minutes)
3. Go to **Settings → Database → Connection string**
4. Copy both connection strings:

```bash
# Transaction pooler (for app queries) - use port 6543
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection (for migrations) - use port 5432
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

> **Important:** Enable "Connection Pooling" in Supabase settings for better performance.

### 1.2 Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com) and create an application
2. Select authentication methods (Email, Google, etc.)
3. Go to **API Keys** and switch to **Production** instance
4. Copy the keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

5. Go to **Webhooks** → **Add Endpoint**:
   - URL: `https://app.yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`, `organization.*`
   - Copy the signing secret:

```bash
CLERK_WEBHOOK_SECRET=whsec_...
```

### 1.3 Stripe (Payments)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Complete account verification for live payments
3. Go to **Developers → API keys** (ensure "Test mode" is OFF)
4. Copy the keys:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

5. Enable **Stripe Connect**:
   - Go to **Connect → Settings**
   - Configure your platform settings
   - Set OAuth redirect URI: `https://app.yourdomain.com/api/stripe/connect/callback`

6. Set up **Webhooks**:
   - Go to **Developers → Webhooks → Add endpoint**
   - URL: `https://app.yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `account.application.authorized`
     - `account.application.deauthorized`
   - Copy the signing secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.4 Resend (Email)

1. Go to [resend.com](https://resend.com) and create an account
2. **Add and verify your domain**:
   - Go to **Domains → Add Domain**
   - Add the DNS records they provide (SPF, DKIM, DMARC)
   - Wait for verification (~5-10 minutes)
3. Go to **API Keys → Create API Key**
4. Copy the key:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

---

## Step 2: DNS Configuration

Add these DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | `<your-vps-ip>` | 300 |
| A | book | `<your-vps-ip>` | 300 |
| CNAME | www | app.yourdomain.com | 300 |

Also add **Resend DNS records** for email verification (provided by Resend).

---

## Step 3: Coolify Setup

### 3.1 Create Redis Service

1. In Coolify, go to **Services → New Service**
2. Select **Redis** from the marketplace
3. Configure:
   - Name: `tour-redis`
   - Password: Generate a strong password
4. Deploy and note the internal URL: `redis://:password@tour-redis:6379`

### 3.2 Create CRM Application

1. Go to **Projects → New Project** → Name it "Tour CRM"
2. **Add Resource → Application**
3. Configure source:
   - Git Repository: Your repo URL
   - Branch: `main`
   - Build Pack: **Nixpacks** (recommended) or Docker

4. Configure build settings:
```bash
# Build Command
pnpm install && pnpm db:push && pnpm build --filter @tour/crm

# Start Command
pnpm start --filter @tour/crm

# Base Directory
/

# Port
3000
```

5. Configure domain:
   - Add domain: `app.yourdomain.com`
   - Enable HTTPS (Coolify handles SSL automatically)

### 3.3 Add Environment Variables

In the CRM application settings, add all environment variables:

```bash
# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# =============================================================================
# AUTHENTICATION
# =============================================================================
ENABLE_CLERK=true
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# =============================================================================
# PAYMENTS
# =============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# =============================================================================
# EMAIL
# =============================================================================
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# =============================================================================
# CACHE
# =============================================================================
REDIS_URL=redis://:yourpassword@tour-redis:6379

# =============================================================================
# SECURITY
# =============================================================================
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# =============================================================================
# APP CONFIGURATION
# =============================================================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_WEB_URL=https://book.yourdomain.com
GUIDE_PORTAL_URL=https://app.yourdomain.com/guide
```

### 3.4 Deploy

1. Click **Deploy** in Coolify
2. Watch the build logs for any errors
3. Once deployed, the app should be accessible at `https://app.yourdomain.com`

---

## Step 4: Post-Deployment Verification

### 4.1 Health Check

Visit `https://app.yourdomain.com/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "services": [
    { "name": "database", "status": "healthy", "latency": 45 },
    { "name": "clerk", "status": "healthy" },
    { "name": "stripe", "status": "healthy", "message": "Live mode" },
    { "name": "resend", "status": "healthy" }
  ]
}
```

### 4.2 Test Authentication

1. Go to `https://app.yourdomain.com`
2. Click "Sign Up" and create an account
3. Verify you can log in

### 4.3 Test Organization Creation

1. After login, you should be redirected to onboarding
2. Create a test organization
3. Verify you land on the dashboard

### 4.4 Test Stripe Connect

1. Go to **Settings → Payments**
2. Click "Connect with Stripe"
3. Complete Stripe onboarding (use test data)
4. Verify you return to settings with "Connected" status

### 4.5 Test Email

1. Create a test booking
2. Check that confirmation email is received
3. Verify email is from your domain (not resend.dev)

---

## Step 5: Optional - Web App (Booking Site)

If you want the customer-facing booking website:

### 5.1 Create Web Application in Coolify

1. **Add Resource → Application** in the same project
2. Configure:
```bash
# Build Command
pnpm install && pnpm build --filter @tour/web

# Start Command
pnpm start --filter @tour/web

# Port
3001
```

3. Add domain: `book.yourdomain.com`
4. Add the same environment variables (or reference from CRM)
5. Deploy

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection from server
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

If connection fails:
- Check Supabase is not paused (free tier pauses after inactivity)
- Verify connection string has correct password
- Ensure pooler is enabled in Supabase

### Webhook Failures

**Clerk webhooks failing:**
- Verify URL is exactly `https://app.yourdomain.com/api/webhooks/clerk`
- Check CLERK_WEBHOOK_SECRET matches
- View webhook logs in Clerk dashboard

**Stripe webhooks failing:**
- Verify URL is exactly `https://app.yourdomain.com/api/webhooks/stripe`
- Check STRIPE_WEBHOOK_SECRET matches
- Use Stripe CLI to test: `stripe listen --forward-to https://app.yourdomain.com/api/webhooks/stripe`

### Build Failures

Common issues:
- **Memory:** Increase Coolify container memory limit
- **pnpm not found:** Ensure Nixpacks or your Dockerfile installs pnpm
- **Type errors:** Run `pnpm typecheck` locally first

### SSL/HTTPS Issues

Coolify uses Traefik for SSL. If certificates aren't working:
1. Check DNS is pointing to correct IP
2. Wait 5-10 minutes for certificate provisioning
3. Check Traefik logs in Coolify

---

## Maintenance

### Updating the Application

1. Push changes to your `main` branch
2. In Coolify, click **Redeploy** or enable auto-deploy

### Database Migrations

For schema changes:
```bash
# Locally, generate migration
pnpm db:generate

# On deploy, migrations run automatically via:
pnpm db:push
```

### Monitoring

- **Application logs:** View in Coolify dashboard
- **Health check:** Monitor `/api/health` endpoint
- **Errors:** Set up Sentry (optional but recommended)

### Backups

- **Database:** Supabase has automatic daily backups (Pro plan)
- **Redis:** Volatile cache, no backup needed
- **Code:** Your Git repository

---

## Security Checklist

- [ ] All secrets stored as environment variables (never in code)
- [ ] HTTPS enabled on all domains
- [ ] Webhook signatures validated
- [ ] JWT_SECRET is unique and 32+ characters
- [ ] Production Clerk/Stripe keys (not test keys)
- [ ] Database password is strong
- [ ] Redis password is set
- [ ] CORS configured for production domains only

---

## Quick Reference

| Service | Dashboard URL |
|---------|---------------|
| Supabase | https://supabase.com/dashboard |
| Clerk | https://dashboard.clerk.com |
| Stripe | https://dashboard.stripe.com |
| Resend | https://resend.com/emails |
| Coolify | https://your-coolify-url |

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Health check |
| `/api/webhooks/clerk` | Clerk webhook |
| `/api/webhooks/stripe` | Stripe webhook |
| `/api/stripe/connect/callback` | Stripe Connect OAuth |
