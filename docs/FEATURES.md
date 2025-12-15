# Tour Operations Platform — Production Roadmap

**Version:** 3.0
**Last Updated:** December 15, 2025
**Status:** Production Readiness Focus
**Goal:** A flowing CRM where every workflow works end-to-end

---

## Executive Summary

### Where We Are

The CRM has **solid bones** — the UI is polished, the multi-tenant architecture is sound, and most CRUD operations work. But it's a **skeleton**, not a living system:

- Bookings can be created but **payments can't be collected**
- Emails are implemented but **only trigger on manual confirmation**
- Guide assignments work but **notifications are partially wired**
- Reports exist but **data isn't always flowing to them**

### What "Production Ready" Means

A tour operator should be able to:
1. Receive a phone call → Create a booking → Collect payment → Customer gets confirmation
2. Check the morning dashboard → See issues → Resolve them without leaving the page
3. Guides receive their schedules → Confirm availability → Access manifests
4. End of day: Revenue tracked, reports accurate, no manual data reconciliation

### The Gap

| What Works | What's Broken/Missing |
|------------|----------------------|
| Booking creation wizard | No payment collection (Stripe not wired) |
| Email templates | No email on booking creation (only manual confirm) |
| Guide assignment UI | Assignment notifications partially wired |
| Promo code validation | Pricing tiers hardcoded (50% child, not from DB) |
| Activity logging | No real-time dashboard updates |
| Customer management | Placeholder emails for phone-only customers |

---

## Critical User Flows

Instead of feature checklists, we define **flows that must work end-to-end**.

---

### Flow 1: Phone/Walk-in Booking

**Persona:** Sarah (Operations Manager) receives a phone call

```
Customer calls → Staff searches/creates customer → Selects tour & date
→ Adds participants → Collects payment → Customer receives confirmation
```

#### Current State: 70% Working

| Step | Status | Issue |
|------|--------|-------|
| Search existing customer | ✅ Works | Combobox with search |
| Create new customer inline | ✅ Works | Quick create modal |
| Select tour | ✅ Works | Visual tour cards |
| Select schedule | ✅ Works | Shows availability |
| Add participants | ✅ Works | Adults/children/infants |
| Apply promo code | ⚠️ Partial | Validates but pricing uses hardcoded tiers |
| **Collect payment** | ❌ Missing | No Stripe integration for charges |
| **Record payment manually** | ⚠️ Awkward | Can mark "paid" but no amount/method |
| Customer confirmation email | ❌ Missing | Only sends on manual "Confirm" click |
| Booking reference shown | ✅ Works | Redirects to detail page |

#### What Needs to Happen

1. **Payment Recording** (no Stripe yet)
   - Add payment method selector (Cash, Card, Bank Transfer, Invoice)
   - Add amount paid field
   - Calculate balance due
   - Mark as Paid/Partial/Pending

2. **Automatic Confirmation Email**
   - Trigger `booking/created` event on booking creation
   - Send confirmation email immediately (not waiting for "Confirm" button)

3. **Pricing from Database**
   - Fetch actual pricing tiers for tour
   - Use tour-specific child/infant pricing

---

### Flow 2: Booking Modification

**Persona:** Alex (Customer Service) receives a change request

```
Customer calls → Staff finds booking → Makes changes → Customer notified
```

#### Current State: 85% Working

| Step | Status | Issue |
|------|--------|-------|
| Find booking by reference | ✅ Works | Cmd+K search or list filter |
| View booking details | ✅ Works | Full detail page |
| Reschedule to different date | ✅ Works | Modal with available schedules |
| Change participant count | ✅ Works | Edit page |
| Cancel booking | ✅ Works | With reason capture |
| **Issue refund** | ❌ Broken | Creates DB record but no Stripe refund |
| Cancellation email sent | ✅ Works | Inngest triggers on cancel |
| Reschedule email sent | ❌ Missing | No event for reschedule |

#### What Needs to Happen

1. **Refund Processing**
   - If payment was via Stripe, call `stripe.refunds.create()`
   - If manual payment, just record refund in DB
   - Show refund status (Pending → Processed)

2. **Reschedule Notification**
   - Add `booking/rescheduled` event
   - Send email with new date/time

---

### Flow 3: Daily Operations Check

**Persona:** Sarah starts her day

```
Open dashboard → See today's tours → Identify issues → Resolve inline
```

#### Current State: 80% Working

| Step | Status | Issue |
|------|--------|-------|
| Today's schedule list | ✅ Works | Shows tours, times, participants |
| Unassigned guide alerts | ✅ Works | Actionable alerts |
| Assign guide from dashboard | ✅ Works | Quick assign modal |
| Low capacity warnings | ✅ Works | Alerts shown |
| Cancel tour from dashboard | ⚠️ Partial | Can cancel but no batch notify |
| Print all manifests | ❌ Missing | No bulk print |
| Revenue today | ✅ Works | Business tab |

#### What Needs to Happen

1. **Bulk Manifest Print**
   - "Print All Manifests" button
   - Opens printable view with all today's tours

2. **Batch Customer Notification on Cancel**
   - When cancelling schedule, offer to notify all booked customers
   - Send cancellation emails to all affected bookings

---

### Flow 4: Guide Operations

**Persona:** Maria (Guide) checks her schedule

```
Receives magic link → Views assignments → Confirms/declines → Accesses manifest
```

#### Current State: 90% Working

| Step | Status | Issue |
|------|--------|-------|
| Receive magic link email | ⚠️ Partial | Works but link URL may be wrong |
| Login to portal | ✅ Works | JWT auth |
| View upcoming assignments | ✅ Works | List with dates |
| Confirm assignment | ✅ Works | Status updates |
| Decline with reason | ✅ Works | Captures reason |
| View manifest | ✅ Works | Participant list |
| Print manifest | ✅ Works | Browser print |
| Daily manifest email | ⚠️ Partial | Inngest function exists, needs cron |

#### What Needs to Happen

1. **Verify Magic Link URLs**
   - Ensure `NEXT_PUBLIC_APP_URL` is correct in production
   - Test guide portal flow end-to-end

2. **Enable Daily Manifest Cron**
   - Configure Inngest cron for 6 AM daily manifest emails

---

### Flow 5: Payment & Revenue

**Persona:** Michael (Owner) tracks revenue

```
Bookings come in → Payments recorded → Revenue reports accurate
```

#### Current State: 30% Working

| Step | Status | Issue |
|------|--------|-------|
| Record payment on booking | ❌ Missing | No payment recording UI |
| Accept online payment | ❌ Missing | Stripe charge not implemented |
| Process refund | ❌ Missing | No Stripe refund |
| View revenue by period | ✅ Works | Reports page |
| Revenue by tour | ✅ Works | Breakdown available |
| Revenue by payment method | ❌ Missing | Payment method not tracked |
| Export revenue report | ✅ Works | CSV export |

#### What Needs to Happen

**Phase A: Manual Payment Recording (No Stripe)**
1. Add payment recording to booking detail page
2. Fields: Amount, Method (Cash/Card/Transfer), Reference, Date
3. Support partial payments (deposits)
4. Calculate and display balance due
5. Payment history on booking

**Phase B: Stripe Integration (Later)**
1. Create payment intent on booking
2. Payment link for customer
3. Webhook handling for payment events
4. Automatic status updates

---

### Flow 6: Communications

**Persona:** System sends right message at right time

```
Event occurs → Appropriate email sent → Logged in communication history
```

#### Current State: 50% Working

| Event | Email Sent? | Issue |
|-------|-------------|-------|
| Booking created | ❌ No | Only on manual confirm |
| Booking confirmed | ✅ Yes | Inngest wired |
| Booking cancelled | ✅ Yes | Inngest wired |
| Booking rescheduled | ❌ No | No event |
| 24h reminder | ⚠️ Partial | Function exists, not triggered |
| Guide assigned | ⚠️ Partial | Function exists, trigger unclear |
| Guide daily manifest | ⚠️ Partial | Needs cron setup |
| Abandoned cart | ⚠️ Partial | Function exists, not triggered |
| Review request | ⚠️ Partial | Function exists, not triggered |

#### What Needs to Happen

1. **Wire Missing Email Triggers**
   - Booking creation → `booking/created` event
   - Booking reschedule → `booking/rescheduled` event
   - Guide assignment → verify trigger working

2. **Enable Cron Jobs**
   - 24h booking reminder (cron: check bookings for tomorrow)
   - Daily guide manifest (cron: 6 AM)
   - Abandoned cart check (cron: every 15 minutes)

3. **Test Email Delivery**
   - Set `RESEND_API_KEY` in environment
   - Send test emails for each template
   - Verify formatting and links

---

## Production Blockers

Ranked by impact on ability to run a real tour business.

### P0: Cannot Operate Without These

| Blocker | Impact | Effort | Solution |
|---------|--------|--------|----------|
| **No payment recording** | Can't track who paid | 2 days | Add payment UI to booking detail |
| **No confirmation on create** | Customers don't know booking received | 0.5 day | Fire event on booking creation |
| **Placeholder emails** | Phone-only customers have fake emails | 1 day | Make email truly optional in schema |
| **Environment variables missing** | Emails won't send, auth may break | 0.5 day | Set up .env.production properly |

### P1: Significantly Impairs Operations

| Blocker | Impact | Effort | Solution |
|---------|--------|--------|----------|
| **Refunds don't process** | Can't refund customers | 1 day | Add Stripe refund call (or manual record) |
| **No reschedule notification** | Customers miss changed bookings | 0.5 day | Add reschedule event and email |
| **Pricing tiers hardcoded** | Wrong prices for children | 1 day | Fetch from tourPricingTiers table |
| **Cron jobs not running** | Reminders never sent | 0.5 day | Configure Inngest cron schedules |

### P2: Quality of Life

| Blocker | Impact | Effort | Solution |
|---------|--------|--------|----------|
| Bulk manifest print | Morning prep takes longer | 0.5 day | Add print all button |
| Missing indexes | Slow queries at scale | 0.5 day | Add composite indexes |
| No payment method tracking | Revenue reports incomplete | 0.5 day | Add paymentMethod field |

---

## Work Packages

Actionable chunks of work, roughly sprint-sized.

---

### Package 1: Payment Recording (No Stripe)

**Goal:** Staff can record that a customer paid

**Scope:**
- [ ] Add `payments` table (id, bookingId, amount, method, reference, date, createdBy)
- [ ] Add payment recording UI to booking detail page
- [ ] Show payment history on booking
- [ ] Calculate balance due (total - sum of payments)
- [ ] Update booking `paymentStatus` based on payments
- [ ] Add "Record Payment" button to booking list actions

**Acceptance Criteria:**
- Sarah creates booking → Records $200 cash payment → Booking shows "Paid"
- Booking for $500 → Record $100 deposit → Shows "Partial" with $400 due
- Payment history shows who recorded each payment and when

**Effort:** 2-3 days

---

### Package 2: Email Flow Completion

**Goal:** Right email at right time, every time

**Scope:**
- [ ] Fire `booking/created` event when booking created (not just confirmed)
- [ ] Add `booking/rescheduled` event with email template
- [ ] Configure Inngest cron for 24h reminders
- [ ] Configure Inngest cron for daily guide manifests
- [ ] Test all email templates with real Resend API key
- [ ] Add email preview in CRM (see what customer will receive)

**Acceptance Criteria:**
- Create booking → Confirmation email arrives within 1 minute
- Reschedule booking → Customer gets email with new date
- 24h before tour → Customer gets reminder
- 6 AM daily → Guides with tours today get manifest email

**Effort:** 2 days

---

### Package 3: Customer Data Cleanup

**Goal:** No fake data, proper handling of phone-only customers

**Scope:**
- [ ] Make customer email nullable in database schema
- [ ] Update customer creation to allow phone-only (no placeholder email)
- [ ] Add validation: must have email OR phone (not neither)
- [ ] Update booking flow to handle phone-only customers
- [ ] Skip email notifications for customers without email (log instead)
- [ ] Add customer contact preference (Email/Phone/Both)

**Acceptance Criteria:**
- Create customer with phone only → No fake email in database
- Booking with phone-only customer → No email sent, logged as "no email"
- Customer with email → Gets all notifications

**Effort:** 1-2 days

---

### Package 4: Pricing Accuracy

**Goal:** Prices come from database, not hardcoded

**Scope:**
- [ ] Fetch tour pricing tiers when creating booking
- [ ] Use actual child/infant prices from tiers
- [ ] Show price breakdown with tier names ("Adult x2 @ $50 = $100")
- [ ] Handle missing tiers gracefully (default to base price)
- [ ] Add pricing tier management to tour edit page

**Acceptance Criteria:**
- Tour has "Child (5-12): $25" tier → Booking shows correct child price
- Tour has no child tier → Defaults to adult price with note
- Price breakdown shows exactly where each amount comes from

**Effort:** 1-2 days

---

### Package 5: Refund Flow

**Goal:** Staff can process refunds properly

**Scope:**
- [ ] Add `refunds` table if not exists (amount, reason, method, status)
- [ ] Refund recording UI on booking detail
- [ ] For cash/manual payments: Just record refund
- [ ] Update payment balance when refund recorded
- [ ] Refund confirmation email to customer
- [ ] Activity log entry for refund

**Acceptance Criteria:**
- Customer paid $100 cash → Issue $50 refund → Balance shows -$50 refunded
- Refund recorded → Customer gets refund confirmation email
- Activity log shows "Refund $50 issued by Sarah - Reason: Schedule cancelled"

**Effort:** 1-2 days

---

### Package 6: Stripe Integration (Future)

**Goal:** Accept online payments

**Scope:**
- [ ] Create payment intent when booking created
- [ ] Generate payment link for customer
- [ ] Webhook endpoint for payment events
- [ ] Auto-update booking status on payment success
- [ ] Handle failed payments gracefully
- [ ] Stripe Connect for multi-tenant payments

**Acceptance Criteria:**
- Customer gets booking confirmation with "Pay Now" link
- Customer pays → Booking auto-updates to "Paid"
- Payment fails → Booking stays "Pending", customer notified

**Note:** This can wait. Manual payment recording covers most use cases.

**Effort:** 3-5 days

---

## Environment Setup

Required for production:

```bash
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Email (Resend)
RESEND_API_KEY=re_...

# Background Jobs (Inngest)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App URLs
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# Stripe (when ready)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Definition of Done

A flow is "production ready" when:

1. **Works end-to-end** - No manual workarounds needed
2. **Handles errors gracefully** - User sees helpful message, not crash
3. **Sends appropriate notifications** - Customer/guide informed at each step
4. **Logs activity** - Who did what, when, why
5. **Works on mobile** - Responsive, touch-friendly
6. **Tested with real data** - Not just happy path

---

## What We're NOT Building Yet

To stay focused on production, we're deferring:

| Feature | Why Defer |
|---------|-----------|
| Web App (public booking site) | CRM must work first |
| Multi-currency | Single currency is fine for launch |
| SMS/WhatsApp | Email covers most cases |
| Advanced reporting | Basic reports are sufficient |
| API for partners | No partners yet |
| Digital waivers | Manual waivers work for now |
| Resource management (boats, bikes) | Guides only for now |
| Multi-day tours | Day tours only for launch |

These are all good features. They're just not blocking production.

---

## Success Metrics

We're ready for production when:

| Metric | Target |
|--------|--------|
| Booking flow completion | Can create booking and record payment in < 2 min |
| Email delivery | 100% of bookings trigger confirmation email |
| Morning prep time | Operations check + manifest review < 10 min |
| Customer modification | Reschedule or cancel in < 1 min |
| Data accuracy | Zero placeholder/fake data in production |

---

*Document focused on production readiness, not feature completeness.*
*Last updated: December 15, 2025*
