# Stripe Payment Integration (Package 6)

Complete Stripe Connect integration for multi-tenant payment processing.

## Overview

This implementation provides full Stripe payment support using **Stripe Connect** architecture, where:
- Each organization has its own Stripe Connect account
- Organizations receive payments directly
- Platform can optionally take an application fee
- All events are multi-tenant aware and route to correct organization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Platform (Tour CRM)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Organization (Stripe Connect Account)        │   │
│  │  • Receives all booking payments                    │   │
│  │  • Manages refunds                                  │   │
│  │  • Platform can take application fee                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Webhook Handler → Multi-tenant Event Router                │
│  • payment_intent.succeeded → Update booking to paid        │
│  • payment_intent.payment_failed → Mark payment failed      │
│  • charge.refunded → Process refund                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### 1. Enhanced Stripe Library (`apps/crm/src/lib/stripe.ts`)

**Added Functions:**
- `createPaymentIntent()` - Create payment intent via Stripe Connect
- `createPaymentLink()` - Generate Stripe Checkout session
- `retrievePaymentIntent()` - Get payment status
- `cancelPaymentIntent()` - Cancel a payment
- `createRefund()` - Process full or partial refund
- `retrieveRefund()` - Get refund details

**Key Features:**
- All functions use Stripe Connect (`stripeAccount` parameter)
- Support for optional platform application fees
- Automatic payment methods enabled
- Full TypeScript types

### 2. Stripe Webhook Handler (`apps/crm/src/app/api/webhooks/stripe/route.ts`)

**Handles Events:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Full or partial refund processed
- `checkout.session.completed` - Checkout completed (logged)

**Security:**
- Webhook signature verification
- Multi-tenant validation (verifies Connect account matches organization)
- Idempotency protection (prevents duplicate processing)
- Metadata validation

**Error Handling:**
- Comprehensive error logging
- Graceful failure handling
- Returns proper HTTP status codes

### 3. Payment Service (`packages/services/src/payment-service.ts`)

**Already Existed** - Used for manual payment recording (cash, check, bank transfer).

**Key Methods:**
- `create()` - Record manual payment
- `listByBooking()` - Get all payments for booking
- `getBookingBalance()` - Calculate remaining balance
- `delete()` - Remove payment record
- `getStats()` - Payment statistics

### 4. Updated Booking Router (`apps/crm/src/server/routers/booking.ts`)

**Added Mutations:**

#### `createPaymentLink`
```typescript
input: {
  bookingId: string;
  successUrl?: string;
  cancelUrl?: string;
}
returns: {
  url: string;         // Stripe Checkout URL
  sessionId: string;   // Session ID
  amountDue: string;   // Amount to be charged
  currency: string;    // Payment currency
}
```

**Validations:**
- Checks organization has Stripe Connect account configured
- Verifies account is fully onboarded
- Ensures booking isn't already paid
- Calculates amount due (total - already paid)

**Optional Platform Fee:**
```typescript
// Uncomment to enable 2% platform fee
applicationFeeAmount: Math.round(amountInCents * 0.02)
```

#### `getPaymentStatus`
```typescript
input: { bookingId: string }
returns: {
  bookingId: string;
  referenceNumber: string;
  total: string;
  paidAmount: string;
  balance: string;
  currency: string;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
  payments: Payment[];
}
```

### 5. Enhanced Email Template (`packages/emails/src/templates/booking-confirmation.tsx`)

**Added Props:**
- `paymentUrl?: string` - Link to Stripe Checkout
- `paymentStatus?: "pending" | "partial" | "paid" | "refunded" | "failed"`

**UI Components:**

1. **Payment Required Notice** (shown if pending/partial):
   - Yellow alert box
   - "Pay Now" button (green) linking to Stripe Checkout
   - Custom message for partial payments

2. **Payment Confirmed Notice** (shown if paid):
   - Green success box
   - Checkmark icon

**Styling:**
- Matches existing email design
- Mobile-responsive
- Clear call-to-action buttons

## Environment Variables

Required in `.env.local`:

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # For frontend
STRIPE_SECRET_KEY=sk_test_...                   # For backend API
STRIPE_WEBHOOK_SECRET=whsec_...                 # For webhook validation

# Platform URLs (for redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000       # CRM URL
```

**Already documented in** `/Users/saim/Desktop/Tour_CRM/.env.example`

## Database Schema

### Existing Fields in `bookings` table:

```sql
-- Payment tracking
paymentStatus: "pending" | "partial" | "paid" | "refunded" | "failed"
paidAmount: numeric(10, 2)
stripePaymentIntentId: text

-- Amount breakdown
total: numeric(10, 2)
currency: text
```

### Existing Fields in `organizations` table:

```sql
-- Stripe Connect
stripeConnectAccountId: text
stripeConnectOnboarded: boolean
```

## Payment Flow

### 1. Create Booking

```typescript
// Staff creates booking via CRM
const booking = await api.booking.create.mutate({
  customerId: "cust_123",
  scheduleId: "sched_456",
  adultCount: 2,
  // ... other fields
});
// Booking created with paymentStatus: "pending"
```

### 2. Generate Payment Link

```typescript
// Staff generates payment link for customer
const paymentLink = await api.booking.createPaymentLink.mutate({
  bookingId: booking.id,
});

// Returns: { url: "https://checkout.stripe.com/...", ... }
// Send this URL to customer via email/SMS
```

### 3. Customer Pays

1. Customer clicks payment link
2. Redirected to Stripe Checkout
3. Completes payment
4. Redirected to success URL

### 4. Webhook Processing

```
Stripe → POST /api/webhooks/stripe
  ↓
Verify signature
  ↓
Route to organization (via Connect account)
  ↓
Update booking.paymentStatus = "paid"
  ↓
Update booking.paidAmount = total
  ↓
Return 200 OK
```

### 5. Confirmation

- Booking status automatically updated
- Customer sees success page
- Optional: Send confirmation email via Inngest

## Testing Locally

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 2. Forward Webhooks

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy webhook secret (whsec_...) to .env.local as STRIPE_WEBHOOK_SECRET
```

### 3. Trigger Test Webhook

```bash
stripe trigger payment_intent.succeeded
```

### 4. Test Full Flow

1. Start dev server: `pnpm dev`
2. Create a booking in CRM
3. Generate payment link via API
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify booking updated to "paid"

## Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

## Security Considerations

### 1. Webhook Signature Verification
All webhook requests are validated using `stripe.webhooks.constructEvent()` to ensure they came from Stripe.

### 2. Multi-Tenant Validation
```typescript
// Verify event belongs to organization's Connect account
if (event.account !== organization.stripeConnectAccountId) {
  console.error("Account mismatch");
  return;
}
```

### 3. Idempotency
```typescript
// Don't process same payment intent twice
if (booking.stripePaymentIntentId === paymentIntent.id &&
    booking.paymentStatus === "paid") {
  console.log("Already processed");
  return;
}
```

### 4. Metadata Validation
All payment intents include:
```typescript
metadata: {
  organizationId: string;
  bookingId: string;
  customerId: string;
  bookingReference: string;
}
```

## Refund Flow

### Option 1: Via Stripe Dashboard
1. Organization logs into Stripe Dashboard
2. Finds payment intent
3. Issues refund
4. Webhook automatically updates booking

### Option 2: Via CRM (Future)
```typescript
// To be implemented in refund-service.ts
const refund = await api.refund.create.mutate({
  bookingId: "bk_123",
  amount: "50.00", // Partial or full
  reason: "requested_by_customer",
});
// Automatically calls stripe.refunds.create()
```

## Multi-Tenant Payment Routing

### How it Works

1. **Organization Setup**:
   - Each org has unique `stripeConnectAccountId`
   - Stored in `organizations.stripeConnectAccountId`

2. **Payment Creation**:
   ```typescript
   stripe.checkout.sessions.create(
     { /* session params */ },
     { stripeAccount: organization.stripeConnectAccountId }
   )
   ```

3. **Webhook Routing**:
   ```typescript
   // Webhook includes event.account
   const organization = await db.query.organizations.findFirst({
     where: eq(organizations.stripeConnectAccountId, event.account)
   });
   ```

4. **Data Isolation**:
   - All database queries filtered by `organizationId`
   - Impossible for one org to see another's payments

## Platform Fees (Optional)

To enable platform revenue sharing:

### 1. In Payment Link Creation

```typescript
// In booking.ts router
applicationFeeAmount: Math.round(amountInCents * 0.02), // 2% fee
```

### 2. Result

- Customer pays $100
- Organization receives $98
- Platform receives $2

### 3. Configuration

Fees can be:
- **Fixed percentage** (e.g., 2% of all transactions)
- **Tiered** (based on organization plan)
- **Per-booking** (based on booking metadata)

Example tiered implementation:
```typescript
const feePercentage = organization.plan === "free" ? 0.05 : // 5%
                      organization.plan === "starter" ? 0.03 : // 3%
                      organization.plan === "pro" ? 0.02 : // 2%
                      0; // Enterprise: no fee

const applicationFeeAmount = Math.round(amountInCents * feePercentage);
```

## Extending the Integration

### Add Inngest Events

Uncomment in `route.ts`:
```typescript
await inngest.send({
  name: "booking/payment.succeeded",
  data: {
    organizationId,
    bookingId,
    paymentIntentId,
    amount,
    currency,
  },
});
```

Then create handler in `apps/crm/src/inngest/booking/`:
```typescript
export const paymentSucceeded = inngest.createFunction(
  { id: "booking-payment-succeeded" },
  { event: "booking/payment.succeeded" },
  async ({ event }) => {
    // Send confirmation email
    // Update analytics
    // Trigger fulfillment
  }
);
```

### Add Payment Dashboard

Create new page: `apps/crm/src/app/org/[slug]/payments/page.tsx`

```typescript
export default async function PaymentsPage() {
  const payments = await api.payment.getAll.query({
    filters: { dateRange: { from: startOfMonth(), to: endOfMonth() } },
    sort: { field: "recordedAt", direction: "desc" },
  });

  return <PaymentsTable payments={payments.data} />;
}
```

### Add Subscription Billing

For recurring platform fees:

1. Create `stripe.subscriptions.create()` wrapper
2. Add `subscription` table to database
3. Create subscription management UI
4. Handle `invoice.payment_succeeded` webhook

## Troubleshooting

### Webhook Not Firing

1. Check Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Verify webhook secret in `.env.local`
3. Check logs: `tail -f /var/log/stripe-webhooks.log`

### Payment Not Updating Booking

1. Check webhook logs in Stripe Dashboard → Developers → Webhooks
2. Verify `organizationId` and `bookingId` in payment intent metadata
3. Check database: `SELECT * FROM bookings WHERE stripe_payment_intent_id = 'pi_...'`

### Account Mismatch Error

Ensure the organization's `stripeConnectAccountId` matches the Stripe Connect account used for payment.

```sql
SELECT id, name, stripe_connect_account_id
FROM organizations
WHERE id = 'org_...';
```

### Type Errors

If seeing TypeScript errors:
```bash
pnpm typecheck
```

Most common issues:
- Missing awaits on async functions
- Incorrect metadata types
- Database query type mismatches

## API Reference

### Booking Router

#### `booking.createPaymentLink`
- **Type**: `mutation`
- **Auth**: `adminProcedure` (staff only)
- **Input**: `{ bookingId, successUrl?, cancelUrl? }`
- **Returns**: `{ url, sessionId, amountDue, currency }`
- **Errors**:
  - "Booking not found"
  - "Stripe Connect account not configured"
  - "Stripe Connect account not fully onboarded"
  - "This booking has already been paid"
  - "No payment due for this booking"

#### `booking.getPaymentStatus`
- **Type**: `query`
- **Auth**: `protectedProcedure` (any logged-in user)
- **Input**: `{ bookingId }`
- **Returns**: Payment status with full breakdown
- **Errors**: "Booking not found"

### Stripe Functions

All in `/apps/crm/src/lib/stripe.ts`:

```typescript
createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent>
createPaymentLink(params: {...}): Promise<Stripe.Checkout.Session>
retrievePaymentIntent(id: string, accountId: string): Promise<Stripe.PaymentIntent>
cancelPaymentIntent(id: string, accountId: string): Promise<Stripe.PaymentIntent>
createRefund(params: CreateRefundParams): Promise<Stripe.Refund>
retrieveRefund(id: string, accountId: string): Promise<Stripe.Refund>
```

## Next Steps

1. **Test in Production**:
   - Switch to live keys: `pk_live_...`, `sk_live_...`
   - Configure production webhook endpoint
   - Update redirect URLs

2. **Add Inngest Handlers**:
   - Payment confirmation emails
   - Payment failure notifications
   - Refund notifications

3. **Build Payment UI**:
   - Payment history page
   - Refund interface
   - Payment analytics dashboard

4. **Enable Platform Fees**:
   - Uncomment `applicationFeeAmount` in router
   - Configure fee percentages
   - Build revenue tracking

5. **Add Subscription Billing** (Phase 7+):
   - Stripe subscriptions for SaaS billing
   - Invoice management
   - Billing portal

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)

## Support

For issues with this integration:
1. Check this documentation
2. Review Stripe Dashboard logs
3. Check webhook event history
4. Test with Stripe CLI
5. Consult Stripe support for API issues
