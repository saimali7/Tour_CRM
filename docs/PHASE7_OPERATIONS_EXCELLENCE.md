# Phase 7: Operations Excellence

**Version:** 1.0
**Created:** December 2025
**Status:** Implementation Ready
**Goal:** Transform from feature-complete to operations-first world-class CRM

---

## Executive Summary

### The Transformation

| From | To |
|------|-----|
| Feature-complete but workflow-fragmented | Operations-first with intelligent automation |
| Reactive data display | Proactive intelligence surfacing |
| Manual operations | Automated excellence |
| Generic CRM | Tour-operations specialist |

### Why This Phase

The CRM has **excellent bones**:
- Multi-tenant architecture: Production-grade
- Service layer: Comprehensive (28 services)
- Database schema: Complete (14+ schema files)
- UI components: Polished (Phase 6 UX overhaul complete)

**But it's missing the muscle (efficiency) and brain (intelligence).**

A tour operator trying to use this today would find:
- Payment infrastructure exists but **no UI to record payments**
- Email services work but **confirmation doesn't fire on booking creation**
- Customer intelligence calculates scores but **never shows them**
- Reports exist but **no forecasting or goal tracking**

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Phone booking time | 4-5 minutes | < 60 seconds |
| Morning prep time | 15-20 minutes | < 5 minutes |
| Customer modification | 3-4 minutes | < 60 seconds |
| Email automation coverage | ~30% | 100% |
| Intelligence visibility | 0% | 100% (scores, alerts, predictions) |

---

## Phase Structure

```
Phase 7: Operations Excellence
├── 7.1 Production Completion      ─── Wire what exists (1 week)
├── 7.2 Operational Speed          ─── 60-second workflows (2 weeks)
├── 7.3 Intelligence Surface       ─── Proactive insights (1 week)
├── 7.4 High-Impact Features       ─── Critical business features (3 weeks)
└── 7.5 Guide Mobile Experience    ─── PWA for guides (1 week)

Total Estimated Duration: 8 weeks
```

---

## 7.1 Production Completion (Week 1)

> **Goal:** Wire existing infrastructure so operators can run their business end-to-end.

### 7.1.1 Payment Recording UI

**What Exists:**
- `payments` table schema ✅
- `PaymentService` with full CRUD ✅
- `paymentRouter` with all endpoints ✅
- Booking `paymentStatus` and `paidAmount` fields ✅

**What's Missing:**
- UI to record payments on booking detail page
- Payment history display
- Balance due calculation display

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create PaymentRecorder component | `components/bookings/payment-recorder.tsx` | Medium |
| Add payment history to booking detail | `app/org/[slug]/bookings/[id]/page.tsx` | Low |
| Show balance due prominently | Same file | Low |
| Add "Record Payment" to booking list actions | `app/org/[slug]/bookings/page.tsx` | Low |

**Component Design:**

```typescript
// PaymentRecorder component
interface PaymentRecorderProps {
  bookingId: string;
  bookingTotal: string;
  currency: string;
  onPaymentRecorded?: () => void;
}

// Features:
// - Amount input with validation
// - Payment method selector (Cash, Card, Bank Transfer, Check, Other)
// - Optional reference field
// - Optional notes
// - Shows current balance before/after
// - Supports partial payments (deposits)
```

**Acceptance Criteria:**
- [ ] Staff can record payment from booking detail page
- [ ] Payment history shows all payments with who recorded them
- [ ] Balance due updates automatically
- [ ] Booking status changes: Pending → Partial → Paid
- [ ] Activity log captures payment recording

**Effort:** 1-2 days

---

### 7.1.2 Email Automation Wiring

**What Exists:**
- `EmailService` with `sendBookingConfirmation`, `sendBookingCancellation` ✅
- Email templates in `packages/emails` ✅
- Inngest functions for some triggers ✅
- `booking/confirmed` event handler ✅

**What's Missing:**
- Fire `booking/created` event on booking creation
- Fire `booking/rescheduled` event on reschedule
- Enable cron jobs for reminders

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Emit `booking/created` in booking service | `booking-service.ts` | Low |
| Create `booking/created` Inngest handler | `inngest/functions/booking-emails.ts` | Low |
| Emit `booking/rescheduled` in booking service | `booking-service.ts` | Low |
| Create reschedule email template | `packages/emails/templates/booking-reschedule.tsx` | Low |
| Create `booking/rescheduled` handler | `inngest/functions/booking-emails.ts` | Low |
| Configure reminder cron (24h before) | `inngest/client.ts` | Low |
| Configure guide manifest cron (6 AM) | `inngest/client.ts` | Low |

**Event Flow:**

```
Booking Created → inngest.send("booking/created") → Send confirmation email
Booking Rescheduled → inngest.send("booking/rescheduled") → Send reschedule email
Cron (daily 6AM) → Check tours today → Send manifests to assigned guides
Cron (hourly) → Check tours in 24h → Send reminders to customers
```

**Acceptance Criteria:**
- [ ] Customer receives confirmation email immediately on booking
- [ ] Customer receives email with new date/time on reschedule
- [ ] Customers get reminder 24 hours before tour
- [ ] Guides get manifest email at 6 AM for today's tours
- [ ] All emails logged in communication_logs table

**Effort:** 1-2 days

---

### 7.1.3 Pricing Tier Integration

**What Exists:**
- `tour_pricing_tiers` table ✅
- Pricing calculation service ✅
- Seasonal pricing, group discounts, promo codes ✅

**What's Missing:**
- Booking form fetches actual pricing tiers (currently hardcoded 50% for children)
- Price breakdown shows tier names

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Fetch tour pricing tiers in booking form | `components/bookings/booking-form.tsx` | Medium |
| Use tier prices instead of hardcoded percentages | Same file | Medium |
| Show breakdown with tier names | Same file | Low |
| Handle missing tiers gracefully | Same file | Low |

**Acceptance Criteria:**
- [ ] Tour with "Child (5-12): $25" → Booking shows $25 per child
- [ ] Tour with no child tier → Uses adult price with note
- [ ] Price breakdown: "Adult × 2 @ $50 = $100"
- [ ] Seasonal/group/promo adjustments shown correctly

**Effort:** 1 day

---

### 7.1.4 Refund Flow Completion

**What Exists:**
- `refunds` table ✅
- `RefundService` ✅
- Refund recording in booking cancellation ✅

**What's Missing:**
- Refund updates payment balance
- Refund email to customer
- Proper refund UI on booking detail

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create RefundRecorder component | `components/bookings/refund-recorder.tsx` | Medium |
| Wire refund to payment balance | `refund-service.ts` | Low |
| Create refund email template | `packages/emails/templates/booking-refund.tsx` | Low |
| Send refund notification | `inngest/functions/booking-emails.ts` | Low |

**Acceptance Criteria:**
- [ ] Staff can issue full or partial refund
- [ ] Payment balance reflects refund
- [ ] Customer receives refund confirmation email
- [ ] Activity log captures refund with reason

**Effort:** 1 day

---

## 7.2 Operational Speed (Weeks 2-3)

> **Goal:** Every common operation completes in under 60 seconds.

### 7.2.1 Quick Booking Flow

**The Problem:**
Current booking flow: 12+ clicks across 4-5 screens.
Phone calls require: "Can you hold while I create your booking?"

**The Solution:**
Single-screen booking flow with smart defaults and auto-complete.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create QuickBookingModal component | `components/bookings/quick-booking-modal.tsx` | High |
| Customer search with inline create | Same | Medium |
| Tour/Schedule selector with availability | Same | Medium |
| Participant count with instant pricing | Same | Medium |
| Payment recording inline | Same | Low |
| Keyboard-navigable flow | Same | Medium |

**Component Design:**

```typescript
// QuickBookingModal - 60-second booking
// Layout: Single modal with 4 sections visible at once

┌─────────────────────────────────────────────────────────────┐
│  Quick Booking                                    [X Close] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CUSTOMER                    2. TOUR & DATE              │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ [Search customer...]    │   │ [Search tour...]        │ │
│  │ + Create New Customer   │   │                         │ │
│  │                         │   │ Available: Dec 20, 9AM  │ │
│  │ John Smith              │   │           Dec 20, 2PM ● │ │
│  │ john@email.com          │   │           Dec 21, 9AM   │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│  3. PARTICIPANTS               4. PAYMENT                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ Adults:  [2] × $50      │   │ Total: $100.00          │ │
│  │ Children:[1] × $25      │   │ ○ Pay Later             │ │
│  │ Infants: [0] × Free     │   │ ● Record Payment        │ │
│  │                         │   │   Amount: [$100]        │ │
│  │ Total: $125.00          │   │   Method: [Cash ▼]      │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│  [Cancel]                            [Create Booking →]     │
└─────────────────────────────────────────────────────────────┘

// Keyboard shortcuts:
// Tab: Next field
// Enter in customer search: Select first result
// Cmd+Enter: Submit booking
// Escape: Cancel
```

**Smart Defaults:**
- If customer has previous bookings, pre-fill with common tour
- Default to next available schedule for selected tour
- Default adults to 2 (most common)
- Remember last payment method used

**Acceptance Criteria:**
- [ ] Complete phone booking in < 60 seconds
- [ ] Customer recognized by partial name/email/phone
- [ ] Tour availability shown inline
- [ ] Price calculates in real-time
- [ ] Payment can be recorded immediately or skipped
- [ ] Confirmation email fires automatically
- [ ] Modal accessible via Cmd+B or "Quick Book" button

**Effort:** 3-4 days

---

### 7.2.2 Customer 360 View

**The Problem:**
When customer calls, staff must navigate multiple pages to understand their history.

**The Solution:**
Single page showing everything about a customer at a glance.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create Customer360Page component | `app/org/[slug]/customers/[id]/page.tsx` | High |
| Header: Contact + Quick Actions | Same | Medium |
| Left Column: Key metrics (CLV, score, segment) | Same | Medium |
| Center: Booking timeline | Same | Medium |
| Right: Communication history | Same | Medium |
| Quick actions: Book, Email, Call, Note | Same | Low |

**Layout Design:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    John Smith                    [Book] [Email] [Call]   │
│            john@example.com | +1 555-1234                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌────────────────────────────────────────────┐│
│  │ INSIGHTS    │  │ BOOKING TIMELINE                           ││
│  │             │  │                                            ││
│  │ CLV: $850   │  │ ● Dec 15 - City Food Tour (Upcoming)       ││
│  │ Score: 85   │  │   2 adults, $100, Paid                     ││
│  │ Segment:    │  │                                            ││
│  │   VIP       │  │ ● Nov 20 - Night Photography Tour          ││
│  │             │  │   2 adults, $150, Completed                ││
│  │ Bookings: 5 │  │   ★★★★★ "Amazing experience!"              ││
│  │ Total: $650 │  │                                            ││
│  │             │  │ ● Oct 5 - Harbor Cruise                    ││
│  │ Last Visit: │  │   3 adults + 1 child, $200, Completed      ││
│  │   Nov 20    │  │                                            ││
│  │             │  │ [Show all 5 bookings →]                    ││
│  │ ──────────  │  └────────────────────────────────────────────┘│
│  │             │  ┌────────────────────────────────────────────┐│
│  │ ENGAGEMENT  │  │ COMMUNICATIONS                             ││
│  │             │  │                                            ││
│  │ ⚠ At Risk   │  │ Dec 10 - Booking confirmation sent         ││
│  │   No booking│  │ Nov 21 - Review request sent               ││
│  │   in 30 days│  │ Nov 20 - Tour reminder sent                ││
│  │             │  │ Nov 15 - Booking confirmation sent         ││
│  │ Preferred:  │  │                                            ││
│  │   Weekend   │  │ [View all →]                               ││
│  │   Morning   │  └────────────────────────────────────────────┘│
│  │   Food tours│                                                │
│  └─────────────┘  ┌────────────────────────────────────────────┐│
│                   │ NOTES                                      ││
│                   │                                            ││
│                   │ 📌 VIP - hotel concierge referral          ││
│                   │ Dec 1 - Prefers window seats               ││
│                   │                                            ││
│                   │ [+ Add Note]                               ││
│                   └────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Customer record (contact info)
- CustomerIntelligenceService (CLV, score, segment)
- BookingService (booking history)
- CommunicationService (email history)
- CustomerNoteService (notes)

**Acceptance Criteria:**
- [ ] Full customer context visible without navigation
- [ ] CLV and customer score prominently displayed
- [ ] Booking history with status and review snippets
- [ ] Communication history
- [ ] Quick book button with customer pre-filled
- [ ] One-click rebook from past booking

**Effort:** 2-3 days

---

### 7.2.3 Morning Briefing

**The Problem:**
Operations manager opens 5 tabs to prep for the day.

**The Solution:**
One-click morning briefing with all critical information.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create MorningBriefing component | `components/dashboard/morning-briefing.tsx` | Medium |
| Today's Tours with participant counts | Same | Low |
| Alert summary (unassigned guides, low capacity) | Same | Low |
| Print All Manifests button | Same | Medium |
| Printable briefing view | `app/org/[slug]/briefing/page.tsx` | Medium |

**Briefing Contents:**

```
┌─────────────────────────────────────────────────────────────────┐
│  MORNING BRIEFING - December 20, 2025                   [Print] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🚨 ALERTS (2)                                                  │
│  ─────────────                                                  │
│  • 2:00 PM Harbor Cruise has no guide assigned                  │
│  • 9:00 AM City Food Tour is at 95% capacity (19/20)            │
│                                                                 │
│  📅 TODAY'S SCHEDULE                                            │
│  ─────────────────                                              │
│  9:00 AM   City Food Tour          19 pax    Maria (Confirmed)  │
│  10:00 AM  Walking History Tour     8 pax    John (Confirmed)   │
│  2:00 PM   Harbor Cruise           12 pax    ⚠️ Unassigned      │
│  4:00 PM   Sunset Photography       6 pax    Sarah (Pending)    │
│                                                                 │
│  💰 EXPECTED REVENUE TODAY: $2,450                              │
│                                                                 │
│  📋 MANIFESTS                                                   │
│  [Print All Manifests]  [Email Guides]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] One-click access from dashboard
- [ ] Shows all alerts requiring attention
- [ ] Lists all tours with participant counts
- [ ] Shows guide assignment status
- [ ] Print all manifests in one action
- [ ] Optionally email briefing to self/team

**Effort:** 2 days

---

### 7.2.4 Batch Operations

**The Problem:**
Rescheduling 10 bookings = 10 repetitive flows.
No way to email multiple customers at once.

**The Solution:**
Multi-select with bulk actions on list pages.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Add selection state to DataTable | `components/ui/data-table.tsx` | Medium |
| Create BulkActionsBar component | `components/ui/bulk-actions-bar.tsx` | Medium |
| Booking bulk actions (reschedule, cancel, email) | `app/org/[slug]/bookings/page.tsx` | Medium |
| Schedule bulk actions (cancel all, notify all) | `app/org/[slug]/schedules/page.tsx` | Medium |

**Bulk Actions by Entity:**

| Entity | Bulk Actions |
|--------|--------------|
| Bookings | Reschedule, Cancel, Send Email, Export |
| Schedules | Cancel (with customer notification), Assign Guide |
| Customers | Send Email, Export, Add Tag |
| Guides | Send Assignment Email |

**Acceptance Criteria:**
- [ ] Checkbox column on all list pages
- [ ] Select all / deselect all
- [ ] Actions bar appears when items selected
- [ ] Confirmation modal for destructive actions
- [ ] Progress indicator for bulk operations
- [ ] Activity log captures bulk actions

**Effort:** 2-3 days

---

## 7.3 Intelligence Surface (Week 4)

> **Goal:** System thinks ahead and surfaces insights proactively.

### 7.3.1 Customer Intelligence in UI

**What Exists:**
- CustomerIntelligenceService with scoring, segmentation, CLV ✅
- Calculation methods work ✅

**What's Missing:**
- Intelligence never shown in UI
- No alerts for at-risk customers
- No actionable recommendations

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Add CustomerScore badge to customer list | `app/org/[slug]/customers/page.tsx` | Low |
| Add segment filter to customer list | Same | Low |
| Create AtRiskCustomers dashboard widget | `components/dashboard/at-risk-customers.tsx` | Medium |
| Create CustomerInsights panel | `components/customers/customer-insights.tsx` | Medium |
| Add engagement recommendations | Same | Medium |

**Dashboard Widget:**

```
┌────────────────────────────────────────┐
│ ⚠️ AT-RISK CUSTOMERS (5)               │
├────────────────────────────────────────┤
│                                        │
│ John Smith         Score: 45 ↓        │
│ No booking in 45 days                  │
│ [Send Re-engagement Email]             │
│                                        │
│ Sarah Johnson      Score: 38 ↓        │
│ No booking in 60 days                  │
│ [Send Special Offer]                   │
│                                        │
│ [View All At-Risk →]                   │
└────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Customer score visible on list and detail pages
- [ ] Segment badges (VIP, Loyal, At Risk, Dormant)
- [ ] Dashboard shows at-risk customers needing attention
- [ ] One-click re-engagement actions
- [ ] CLV visible on customer detail

**Effort:** 2 days

---

### 7.3.2 Forecasting Dashboard

**The Problem:**
"Will we hit our target this month?" is guesswork.

**The Solution:**
Forecasting based on historical patterns and current bookings.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create ForecastingService | `packages/services/src/forecasting-service.ts` | High |
| Revenue forecast (current pace + historical) | Same | Medium |
| Booking forecast | Same | Medium |
| Create ForecastDashboard component | `components/reports/forecast-dashboard.tsx` | Medium |
| Add forecast widget to business dashboard | `app/org/[slug]/page.tsx` | Low |

**Forecast Methods:**

```typescript
interface ForecastResult {
  currentPeriod: {
    actual: number;
    projected: number;
    percentComplete: number;
  };
  comparison: {
    vsLastPeriod: number;
    vsLastYear: number;
  };
  trend: "up" | "down" | "flat";
  confidence: "high" | "medium" | "low";
}

// Calculation:
// 1. Current month progress: bookings/revenue so far
// 2. Same period last month/year: baseline
// 3. Current pace: (actual / days elapsed) * days in month
// 4. Weighted projection: 60% pace + 40% historical pattern
```

**Dashboard Display:**

```
┌──────────────────────────────────────────────────────────────┐
│ REVENUE FORECAST - December 2025                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Current:      $12,500 (50% of month)                        │
│  Projected:    $26,000                                       │
│  Last Dec:     $24,000                                       │
│                                                              │
│  [=========>          ] 48% of projected                     │
│                                                              │
│  📈 Trending +8% vs last year                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │     $30k │                                    ╱         ││
│  │          │                              ╱╱╱╱           ││
│  │     $20k │                        ╱╱╱╱                 ││
│  │          │                  ╱╱╱╱      ← Projected      ││
│  │     $10k │      ╱╱╱╱╱╱╱╱╱╱╱╱    ← Actual              ││
│  │          │╱╱╱╱╱╱                                       ││
│  │       $0 ├────────────────────────────────────────────││
│  │          1    5    10   15   20   25   31              ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Revenue forecast based on current pace + history
- [ ] Booking count forecast
- [ ] Visual progress toward monthly targets
- [ ] Comparison to previous periods
- [ ] Trend indicators

**Effort:** 3 days

---

### 7.3.3 Goal Tracking

**The Problem:**
No way to set "200 bookings this month" and track progress.

**The Solution:**
Simple goal setting with progress visualization.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create `organization_goals` table | `packages/database/src/schema/goals.ts` | Low |
| Create GoalService | `packages/services/src/goal-service.ts` | Medium |
| Create GoalSetting UI in settings | `app/org/[slug]/settings/goals/page.tsx` | Medium |
| Create GoalProgress widget | `components/dashboard/goal-progress.tsx` | Medium |

**Goal Types:**

```typescript
type GoalType =
  | "monthly_revenue"
  | "monthly_bookings"
  | "monthly_customers"
  | "capacity_utilization";

interface Goal {
  id: string;
  organizationId: string;
  type: GoalType;
  targetValue: number;
  period: "monthly" | "quarterly" | "yearly";
  startDate: Date;
  endDate: Date;
}
```

**Acceptance Criteria:**
- [ ] Set monthly targets for revenue/bookings
- [ ] Dashboard shows progress toward goals
- [ ] Alert when falling behind pace
- [ ] Celebrate when goals achieved
- [ ] Historical goal performance

**Effort:** 2 days

---

### 7.3.4 Proactive Alerts

**The Problem:**
System waits to be asked instead of surfacing issues.

**The Solution:**
Automated alert system for operational issues.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create AlertService | `packages/services/src/alert-service.ts` | Medium |
| Create Inngest cron for alert checks | `inngest/functions/alerts.ts` | Medium |
| Create AlertCenter component | `components/dashboard/alert-center.tsx` | Medium |
| Email digest for critical alerts | `packages/emails/templates/alert-digest.tsx` | Low |

**Alert Types:**

| Alert | Trigger | Severity |
|-------|---------|----------|
| Unassigned Guide | Tour in 24h without guide | Critical |
| Low Capacity | Tour < 30% full in 48h | Warning |
| High Capacity | Tour > 90% full | Info |
| Payment Overdue | Unpaid booking, tour in 24h | Critical |
| Guide Not Confirmed | Assignment pending, tour in 24h | Warning |
| Customer At Risk | Score dropped below threshold | Info |
| Revenue Behind Pace | 20%+ behind monthly target | Warning |

**Acceptance Criteria:**
- [ ] Alerts shown in dashboard header
- [ ] Click-through to resolve
- [ ] Optional email digest
- [ ] Dismissible with reason
- [ ] Alert history

**Effort:** 2 days

---

## 7.4 High-Impact Features (Weeks 5-7)

> **Goal:** Features that real operators can't run their business without.

### 7.4.1 Digital Waivers

**Why Critical:**
Insurance mandates signed waivers. No waiver = no coverage.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create `waivers` table | `packages/database/src/schema/waivers.ts` | Medium |
| Create `booking_waivers` junction table | Same | Low |
| Create WaiverService | `packages/services/src/waiver-service.ts` | Medium |
| Create waiver template editor | `app/org/[slug]/settings/waivers/page.tsx` | Medium |
| Create customer waiver signing page | `app/waiver/[token]/page.tsx` | Medium |
| Create WaiverStatus component | `components/bookings/waiver-status.tsx` | Low |
| Add waiver link to confirmation email | `packages/emails/templates/booking-confirmation.tsx` | Low |
| Create check-in waiver verification | Part of check-in feature | Low |

**Schema:**

```typescript
// Waiver template
export const waivers = pgTable("waivers", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(), // "Standard Liability Waiver"
  content: text("content").notNull(), // HTML content
  requiredForTours: text("required_for_tours").array(), // Tour IDs or "all"
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Signed waiver
export const bookingWaivers = pgTable("booking_waivers", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  bookingId: text("booking_id").notNull(),
  waiverId: text("waiver_id").notNull(),
  participantName: text("participant_name").notNull(),
  signatureData: text("signature_data"), // Base64 signature image
  signedAt: timestamp("signed_at"),
  ipAddress: text("ip_address"),
});
```

**Flow:**
1. Tour configured to require waiver
2. Booking created → Waiver link in confirmation email
3. Customer clicks link → Signs for each participant
4. Signature captured with timestamp and IP
5. Check-in shows waiver status
6. Signed waivers viewable/downloadable

**Acceptance Criteria:**
- [ ] Create waiver templates with rich text
- [ ] Associate waivers with tours
- [ ] Customer can sign digitally (signature pad)
- [ ] Sign for multiple participants
- [ ] Waiver status visible on booking
- [ ] Block check-in if waiver unsigned (configurable)
- [ ] Download signed waiver as PDF

**Effort:** 4-5 days

---

### 7.4.2 Deposits & Payment Plans

**Why Critical:**
Can't sell $500+ tours without deposits. Industry standard: 20-50% upfront.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Add deposit settings to tour | `packages/database/src/schema/tours.ts` | Low |
| Create DepositSettings component | `components/tours/deposit-settings.tsx` | Medium |
| Update booking form for deposits | `components/bookings/booking-form.tsx` | Medium |
| Create payment schedule display | `components/bookings/payment-schedule.tsx` | Medium |
| Create payment reminder Inngest job | `inngest/functions/payment-reminders.ts` | Medium |
| Create overdue payment alerts | Part of alert system | Low |

**Schema Updates:**

```typescript
// Tour deposit settings
depositRequired: boolean("deposit_required").default(false),
depositType: text("deposit_type").$type<"percentage" | "fixed">(),
depositAmount: numeric("deposit_amount"), // Percentage (0.20) or fixed ($100)
depositDueDays: integer("deposit_due_days").default(0), // Days before tour
balanceDueDays: integer("balance_due_days").default(7), // Days before tour

// Booking payment tracking
depositAmount: numeric("deposit_amount"),
depositPaidAt: timestamp("deposit_paid_at"),
balanceDueDate: date("balance_due_date"),
```

**Payment Schedule Display:**

```
┌────────────────────────────────────────┐
│ PAYMENT SCHEDULE                       │
├────────────────────────────────────────┤
│                                        │
│ Deposit (20%):        $100.00          │
│   Due: Immediately    ✅ Paid Dec 10   │
│                                        │
│ Balance:              $400.00          │
│   Due: Dec 20         ⏳ Pending       │
│                                        │
│ Total:                $500.00          │
└────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Configure deposit requirement per tour
- [ ] Booking shows deposit vs balance amounts
- [ ] Payment schedule with due dates
- [ ] Reminders before balance due
- [ ] Alert for overdue payments
- [ ] Block check-in if balance unpaid (configurable)

**Effort:** 3-4 days

---

### 7.4.3 Check-In & Attendance

**Why Critical:**
Guides need to verify who showed up. No-shows tracked. Waiver verified.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Add check-in fields to booking_participants | Schema update | Low |
| Create CheckInService | `packages/services/src/check-in-service.ts` | Medium |
| Create check-in UI for guide portal | `app/(guide-portal)/guide/schedule/[id]/check-in/page.tsx` | Medium |
| Create staff check-in page | `app/org/[slug]/schedules/[id]/check-in/page.tsx` | Medium |
| Create no-show handling | Part of check-in service | Low |
| Post-tour summary with attendance | Part of manifest | Low |

**Schema Updates:**

```typescript
// booking_participants additions
checkedIn: boolean("checked_in").default(false),
checkedInAt: timestamp("checked_in_at"),
checkedInBy: text("checked_in_by"), // Guide or staff ID
noShow: boolean("no_show").default(false),
noShowMarkedAt: timestamp("no_show_marked_at"),
```

**Check-In UI:**

```
┌────────────────────────────────────────────────────────────┐
│ CHECK-IN: City Food Tour - Dec 20, 9:00 AM                │
│ Guide: Maria | 19/20 Participants                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ □ John Smith (2 adults)           Waiver: ✅              │
│   john@email.com | +1 555-1234    [Check In] [No Show]    │
│                                                            │
│ ☑ Sarah Johnson (1 adult)         Waiver: ✅  ✓ 9:02 AM  │
│   sarah@email.com | +1 555-5678                           │
│                                                            │
│ □ Mike Davis (2 adults + 1 child) Waiver: ⚠️ Pending      │
│   mike@email.com | +1 555-9999    [Check In] [No Show]    │
│                                                            │
│ ────────────────────────────────────────────────────────   │
│ Checked In: 1 | Pending: 2 | No Show: 0                    │
│                                                            │
│ [Mark Tour Started]                                        │
└────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Guide can check in participants from portal
- [ ] Staff can check in from CRM
- [ ] Waiver status shown (block if unsigned - configurable)
- [ ] No-show marking with timestamp
- [ ] Attendance summary after tour
- [ ] No-show statistics in reports

**Effort:** 3 days

---

### 7.4.4 Booking Add-Ons & Upsells

**Why Critical:**
Direct revenue increase: photo packages, meal upgrades, equipment rental.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create `add_ons` table | `packages/database/src/schema/add-ons.ts` | Medium |
| Create `booking_add_ons` junction | Same | Low |
| Create AddOnService | `packages/services/src/add-on-service.ts` | Medium |
| Create add-on management UI | `app/org/[slug]/settings/add-ons/page.tsx` | Medium |
| Create add-on assignment to tours | `components/tours/tour-add-ons.tsx` | Medium |
| Add add-on selection to booking flow | `components/bookings/add-on-selector.tsx` | Medium |
| Show add-ons in booking detail | `components/bookings/booking-add-ons.tsx` | Low |

**Schema:**

```typescript
export const addOns = pgTable("add_ons", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(), // "Professional Photo Package"
  description: text("description"),
  price: numeric("price").notNull(),
  priceType: text("price_type").$type<"per_booking" | "per_person">(),
  availableFor: text("available_for").array(), // Tour IDs or "all"
  maxQuantity: integer("max_quantity"),
  isActive: boolean("is_active").default(true),
});

export const bookingAddOns = pgTable("booking_add_ons", {
  id: text("id").primaryKey().$defaultFn(createId),
  bookingId: text("booking_id").notNull(),
  addOnId: text("add_on_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
});
```

**Add-On Types:**
- Per-booking: Photo package ($50 per booking)
- Per-person: Meal upgrade ($15 per person)
- Limited quantity: Equipment rental (5 available)

**Acceptance Criteria:**
- [ ] Create add-ons with pricing
- [ ] Assign add-ons to specific tours
- [ ] Select add-ons during booking
- [ ] Add-on pricing in booking total
- [ ] Add-on visibility in manifests
- [ ] Add-on revenue in reports

**Effort:** 3-4 days

---

### 7.4.5 Gift Vouchers

**Why Critical:**
B2B revenue from hotels. Pre-paid = cash before service.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Create `vouchers` table | `packages/database/src/schema/vouchers.ts` | Medium |
| Create VoucherService | `packages/services/src/voucher-service.ts` | Medium |
| Create voucher management page | `app/org/[slug]/vouchers/page.tsx` | Medium |
| Create voucher redemption flow | Part of booking flow | Medium |
| Create B2B voucher batch creation | `components/vouchers/batch-create.tsx` | Medium |
| Voucher email delivery | `packages/emails/templates/voucher.tsx` | Low |

**Schema:**

```typescript
export const vouchers = pgTable("vouchers", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").$type<"monetary" | "tour_specific">(),
  value: numeric("value"), // Dollar amount or null for tour-specific
  tourId: text("tour_id"), // If tour-specific
  purchaserEmail: text("purchaser_email"),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  message: text("message"),
  expiresAt: timestamp("expires_at"),
  redeemedAt: timestamp("redeemed_at"),
  redeemedBookingId: text("redeemed_booking_id"),
  batchId: text("batch_id"), // For B2B batch purchases
  status: text("status").$type<"active" | "redeemed" | "expired">(),
});
```

**Acceptance Criteria:**
- [ ] Create individual vouchers (gift purchase)
- [ ] Create batch vouchers (B2B hotel purchase)
- [ ] Email voucher to recipient
- [ ] Redeem voucher during booking
- [ ] Partial redemption for monetary vouchers
- [ ] Voucher status tracking
- [ ] Voucher revenue in reports

**Effort:** 3-4 days

---

## 7.5 Guide Mobile Experience (Week 8)

> **Goal:** Mobile-first PWA for guides with offline support.

### 7.5.1 Guide Portal PWA

**The Problem:**
Current guide portal is desktop-focused. Guides use phones in the field.

**The Solution:**
Progressive Web App with offline manifest caching.

**Implementation:**

| Task | File(s) | Complexity |
|------|---------|------------|
| Add PWA manifest | `app/(guide-portal)/manifest.json` | Low |
| Add service worker | `public/sw.js` | Medium |
| Mobile-first guide dashboard | Refactor existing | Medium |
| Offline manifest caching | Service worker | High |
| Pull-to-refresh | UI update | Low |
| Push notifications setup | Service worker + backend | High |

**PWA Features:**

| Feature | Implementation |
|---------|----------------|
| Install prompt | manifest.json + service worker |
| Offline manifests | Cache API for today's assignments |
| Push notifications | Web Push API + Inngest trigger |
| Background sync | For check-in when offline |
| Native feel | Touch gestures, bottom nav |

**Mobile Layout:**

```
┌─────────────────────────────────┐
│ ≡  Maria's Schedule      🔔 •  │
├─────────────────────────────────┤
│                                 │
│  TODAY                          │
│  ┌─────────────────────────────┐│
│  │ 9:00 AM                     ││
│  │ City Food Tour              ││
│  │ 19 participants             ││
│  │ ✅ Confirmed                ││
│  │ [View Manifest] [Check In]  ││
│  └─────────────────────────────┘│
│                                 │
│  TOMORROW                       │
│  ┌─────────────────────────────┐│
│  │ 10:00 AM                    ││
│  │ Walking History Tour        ││
│  │ 8 participants              ││
│  │ ⏳ Pending                  ││
│  │ [Confirm] [Decline]         ││
│  └─────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│  🏠      📅      ✓      ⚙️     │
│  Home  Schedule Check-In Settings│
└─────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Install as app on iOS/Android
- [ ] View manifests offline
- [ ] Check in participants offline (sync when online)
- [ ] Push notification for new assignments
- [ ] Push notification for last-minute changes
- [ ] Touch-friendly interface
- [ ] Fast loading (< 3s)

**Effort:** 4-5 days

---

## Technical Implementation Details

### Database Migrations

All schema changes should be additive to avoid data loss:

```bash
# After schema updates
pnpm db:generate  # Generate migration
pnpm db:push      # Apply to database

# Verify
pnpm db:studio    # Check in Drizzle Studio
```

### Service Layer Pattern

All new services follow existing pattern:

```typescript
// packages/services/src/[feature]-service.ts
import { BaseService } from "./base-service";

export class FeatureService extends BaseService {
  async create(input: CreateInput) {
    // Always include organizationId
    return this.db.insert(table).values({
      organizationId: this.organizationId,
      ...input,
    }).returning();
  }
}

// Export from index.ts
export * from "./[feature]-service";

// Add to createServices factory
```

### tRPC Router Pattern

```typescript
// apps/crm/src/server/routers/[feature].ts
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";

export const featureRouter = createRouter({
  list: protectedProcedure
    .input(listSchema)
    .query(async ({ ctx, input }) => {
      const services = createServices({
        organizationId: ctx.orgContext.organizationId
      });
      return services.feature.getAll(input);
    }),

  create: adminProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});

// Add to index.ts router
```

### Inngest Event Pattern

```typescript
// apps/crm/src/inngest/functions/[feature].ts
import { inngest } from "../client";

export const featureCreated = inngest.createFunction(
  { id: "feature-created", name: "Feature Created Handler" },
  { event: "feature/created" },
  async ({ event, step }) => {
    // Handle event
  }
);

// Register in index.ts
```

---

## Testing Strategy

### Unit Tests

Focus on:
- Service layer business logic
- Pricing calculations
- Date handling
- Permission checks

### Integration Tests

Focus on:
- tRPC router endpoints
- Database operations
- Multi-tenant isolation

### E2E Tests (Playwright)

Focus on critical flows:
- Quick booking flow
- Payment recording
- Check-in flow
- Email sending (mock)

---

## Rollout Strategy

### Week-by-Week Deployment

| Week | Deploy | Verify |
|------|--------|--------|
| 1 | 7.1 Production Completion | Payments work, emails fire |
| 2-3 | 7.2 Operational Speed | Quick booking < 60s |
| 4 | 7.3 Intelligence Surface | Scores visible, forecasts work |
| 5-6 | 7.4.1-7.4.3 (Waivers, Deposits, Check-In) | Core ops features |
| 7 | 7.4.4-7.4.5 (Add-Ons, Vouchers) | Revenue features |
| 8 | 7.5 Guide PWA | Mobile works offline |

### Feature Flags

Consider feature flags for:
- New booking flow (gradual rollout)
- Intelligence widgets (optional)
- PWA prompt (after testing)

---

## Success Criteria

Phase 7 is complete when:

| Criteria | Measurement |
|----------|-------------|
| Payment recording works | Staff can record payment, balance updates |
| Emails fire automatically | 100% of bookings trigger confirmation |
| Quick booking < 60s | Timed test with real user |
| Customer 360 exists | Full context visible without navigation |
| Intelligence visible | Scores, forecasts, alerts in dashboard |
| Waivers work | Sign → verify → block if unsigned |
| Deposits work | Configure → collect → remind |
| Check-in works | Guide can check in from phone |
| Guide PWA works | Install → offline → push notifications |

---

## Dependencies & Risks

### Dependencies

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Inngest cron | Requires paid plan for production | Use free tier with polling fallback |
| Push notifications | Browser support varies | Graceful degradation to email |
| Service worker | iOS Safari limitations | Test on real devices |
| Stripe (future) | Not blocking Phase 7 | Manual payment recording first |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Delays | Strict phase boundaries |
| Mobile testing | Bugs in field | Beta test with real guides |
| Data migration | Corruption | Additive schema changes only |
| Performance | Slow at scale | Indexes, query optimization |

---

## Appendix: File Structure

```
packages/
├── database/src/schema/
│   ├── waivers.ts         # NEW
│   ├── add-ons.ts         # NEW
│   ├── vouchers.ts        # NEW
│   ├── goals.ts           # NEW
│   └── ...
├── services/src/
│   ├── waiver-service.ts      # NEW
│   ├── add-on-service.ts      # NEW
│   ├── voucher-service.ts     # NEW
│   ├── check-in-service.ts    # NEW
│   ├── forecasting-service.ts # NEW
│   ├── goal-service.ts        # NEW
│   ├── alert-service.ts       # NEW
│   └── ...
├── emails/src/templates/
│   ├── booking-reschedule.tsx # NEW
│   ├── booking-refund.tsx     # EXISTS (verify)
│   ├── waiver-request.tsx     # NEW
│   ├── payment-reminder.tsx   # NEW
│   ├── voucher.tsx            # NEW
│   └── ...

apps/crm/
├── src/
│   ├── app/org/[slug]/
│   │   ├── settings/
│   │   │   ├── waivers/       # NEW
│   │   │   ├── goals/         # NEW
│   │   │   └── add-ons/       # NEW (or in settings page)
│   │   ├── vouchers/          # NEW
│   │   ├── briefing/          # NEW
│   │   └── ...
│   ├── components/
│   │   ├── bookings/
│   │   │   ├── quick-booking-modal.tsx    # NEW
│   │   │   ├── payment-recorder.tsx       # NEW
│   │   │   ├── refund-recorder.tsx        # NEW
│   │   │   ├── waiver-status.tsx          # NEW
│   │   │   ├── payment-schedule.tsx       # NEW
│   │   │   └── add-on-selector.tsx        # NEW
│   │   ├── customers/
│   │   │   └── customer-insights.tsx      # NEW
│   │   ├── dashboard/
│   │   │   ├── morning-briefing.tsx       # NEW
│   │   │   ├── at-risk-customers.tsx      # NEW
│   │   │   ├── goal-progress.tsx          # NEW
│   │   │   ├── alert-center.tsx           # NEW
│   │   │   └── forecast-widget.tsx        # NEW
│   │   └── ui/
│   │       └── bulk-actions-bar.tsx       # NEW
│   └── server/routers/
│       ├── waiver.ts          # NEW
│       ├── add-on.ts          # NEW
│       ├── voucher.ts         # NEW
│       ├── check-in.ts        # NEW
│       ├── goal.ts            # NEW
│       └── forecast.ts        # NEW
```

---

*Document created: December 2025*
*Phase 7: Operations Excellence - Implementation Ready*
