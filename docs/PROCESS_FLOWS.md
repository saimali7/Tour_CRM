# Tour CRM Process Flows

> A first-principles guide to operating the Tour CRM efficiently. Each flow is designed for minimum steps and maximum clarity.

---

## Table of Contents

1. [Daily Operations Dashboard](#1-daily-operations-dashboard)
2. [Taking a Booking (Phone/Walk-in)](#2-taking-a-booking-phonewalk-in)
3. [Managing Today's Tours](#3-managing-todays-tours)
4. [Processing Payments](#4-processing-payments)
5. [Handling Cancellations & Refunds](#5-handling-cancellations--refunds)
6. [Rescheduling a Booking](#6-rescheduling-a-booking)
7. [Setting Up a New Tour Product](#7-setting-up-a-new-tour-product)
8. [Creating Tour Schedules](#8-creating-tour-schedules)
9. [Managing Guides](#9-managing-guides)
10. [Customer Lookup & History](#10-customer-lookup--history)
11. [End-of-Day Reconciliation](#11-end-of-day-reconciliation)
12. [Weekly Business Review](#12-weekly-business-review)

---

## 1. Daily Operations Dashboard

**When**: Start of each workday
**Time**: 30 seconds
**Goal**: Understand what needs attention TODAY

### Flow

```
Open CRM → Dashboard (auto-loads)
```

### What You See

**Today Tab** (default view):

| Section | What It Shows | Action Required |
|---------|---------------|-----------------|
| **Alerts (Red)** | Critical issues: Unassigned guides, overbookings, payment failures | Click to resolve immediately |
| **Warnings (Yellow)** | Pending confirmations, low capacity tours | Review and decide |
| **Today's Schedule** | Chronological list of today's tours | Quick reference |
| **Quick Stats** | Today's bookings, revenue, participants | At-a-glance health |

### Decision Tree

```
See red alert? → Click → Resolve → Return to dashboard
No alerts? → Check Today's Schedule → Ready to operate
```

### Keyboard Shortcut
- `⌘K` → Type "dashboard" → Enter (from anywhere in the app)

---

## 2. Taking a Booking (Phone/Walk-in)

**When**: Customer calls or walks in wanting to book
**Time**: 60-90 seconds
**Goal**: Create confirmed booking with payment

### The Conversation Flow

```
Customer: "I'd like to book the sunset tour for Saturday"
You: [Already creating booking while talking]
```

### Step-by-Step

```
Step 1: Start Booking
─────────────────────
Dashboard → Click "New Booking" button (top right)
OR: ⌘K → "new booking" → Enter

Step 2: Find/Create Customer (10 sec)
─────────────────────────────────────
• Start typing customer email or phone
• FOUND → Select from dropdown
• NOT FOUND → Click "+ Create Customer"
  └─ Enter: First name, Last name, Email OR Phone
  └─ Click "Create" → Auto-selected

Step 3: Select Schedule (10 sec)
────────────────────────────────
• Type tour name in Schedule dropdown
• See: Tour Name | Date | Time | X spots left
• Click to select

Step 4: Enter Guest Count (5 sec)
─────────────────────────────────
• Adults: [number]
• Children: [number] (optional)
• Infants: [number] (optional)
• Price calculates automatically

Step 5: Add Details (15 sec, if needed)
───────────────────────────────────────
• Special requests: "Window seat preferred"
• Dietary: "Vegetarian x2"
• Accessibility: "Wheelchair access needed"
• Hotel pickup: Enter hotel name

Step 6: Complete (5 sec)
────────────────────────
• Review total price with customer
• Click "Create Booking"
• Booking created with reference number

Step 7: Payment (next section)
──────────────────────────────
• See Section 4: Processing Payments
```

### Quick Reference Card

| Customer Says | You Do |
|---------------|--------|
| "For 2 adults and 1 child" | Enter: Adults=2, Children=1 |
| "Any dietary options?" | Check tour inclusions (visible on form) |
| "Can you pick us up?" | Enter hotel in "Hotel/Pickup" field |
| "I have a promo code" | Enter code in discount field |

### After Booking

```
Booking Created
     │
     ├─→ Confirmation email sent automatically (if email provided)
     │
     └─→ Booking appears in:
         • Today's schedule (if today)
         • Bookings list
         • Customer's history
```

---

## 3. Managing Today's Tours

**When**: Day of operations
**Time**: Ongoing
**Goal**: Ensure every tour runs smoothly

### Morning Check (9 AM)

```
Dashboard → Today Tab → Today's Schedule section
```

**For each tour, verify:**

| Check | Status | Action if Problem |
|-------|--------|-------------------|
| Guide assigned? | Green checkmark | Click → Assign available guide |
| Capacity OK? | "8/12 booked" | None needed |
| All confirmed? | No yellow badges | Click pending → Confirm or follow up |

### Pre-Tour (1 hour before)

```
Click tour in Today's Schedule
     │
     └─→ Schedule Detail Page
         │
         ├─→ View Manifest (participant list)
         │   • Names, counts, special requests
         │   • Dietary requirements highlighted
         │   • Click "Print" or "Email to Guide"
         │
         └─→ Verify guide assignment
             • Guide name and contact visible
             • Click guide name → Quick view with phone
```

### During Tour

```
No action needed in CRM
Guide leads tour using manifest
```

### Post-Tour

```
Schedule Detail → Click "Mark Complete"
     │
     ├─→ All bookings marked "Completed"
     ├─→ Review request emails queued (if enabled)
     └─→ Tour removed from active schedule
```

### Handling No-Shows

```
Booking Detail → Click "Mark No-Show"
     │
     ├─→ Status changes to "No Show"
     ├─→ Capacity NOT released (already past)
     └─→ Note added to customer record
```

---

## 4. Processing Payments

**When**: After booking or when customer pays
**Time**: 15-30 seconds
**Goal**: Record payment accurately

### Payment Methods Supported

| Method | When Used | Recording Process |
|--------|-----------|-------------------|
| **Cash** | Walk-in customers | Manual recording |
| **Card (in-person)** | Your terminal | Manual recording |
| **Card (online)** | Customer pays via link | Automatic via Stripe |
| **Bank Transfer** | Corporate bookings | Manual recording |

### Recording a Manual Payment

```
Step 1: Open Booking
──────────────────
Booking Detail → "Record Payment" button

Step 2: Enter Details
────────────────────
• Amount: [enter amount]
• Method: Cash / Card / Bank Transfer / Other
• Reference: Receipt # or transaction ID (optional)
• Notes: Any relevant details

Step 3: Save
────────────
Click "Record Payment"
     │
     ├─→ Payment logged with timestamp
     ├─→ Payment status updates (Pending → Partial/Paid)
     └─→ Activity log entry created
```

### Sending a Payment Link

```
Booking Detail → "Send Payment Link"
     │
     ├─→ Stripe generates secure payment page
     ├─→ Link sent to customer email
     └─→ When paid: Status auto-updates to "Paid"
```

### Payment Status Reference

| Status | Meaning | Action |
|--------|---------|--------|
| **Pending** | No payment received | Follow up or collect |
| **Partial** | Some payment received | Collect remainder |
| **Paid** | Full amount received | No action needed |
| **Refunded** | Money returned | Booking may be cancelled |

---

## 5. Handling Cancellations & Refunds

**When**: Customer requests cancellation
**Time**: 30-60 seconds
**Goal**: Cancel booking and process refund if applicable

### Cancellation Flow

```
Step 1: Find Booking
────────────────────
⌘K → Type reference number or customer name → Select booking

Step 2: Review Cancellation Policy
──────────────────────────────────
Booking Detail shows:
• Tour cancellation policy (e.g., "Free cancellation 24h before")
• Hours until tour starts
• Suggested refund amount

Step 3: Cancel Booking
─────────────────────
Click "Cancel Booking"
     │
     ├─→ Select reason:
     │   • Customer request
     │   • Weather
     │   • Operational
     │   • Other
     │
     └─→ Confirm cancellation
```

### Refund Flow (After Cancellation)

```
Step 4: Process Refund
─────────────────────
Click "Issue Refund"
     │
     ├─→ Enter refund amount
     │   • Full refund: Click "Full Amount"
     │   • Partial: Enter custom amount
     │
     ├─→ Select reason:
     │   • Customer request
     │   • Schedule cancelled
     │   • Duplicate booking
     │   • Other
     │
     └─→ Click "Process Refund"

Step 5: Automatic Actions
─────────────────────────
     │
     ├─→ Stripe processes refund (if paid online)
     ├─→ Cancellation email sent to customer
     ├─→ Capacity released (others can book)
     └─→ Activity logged
```

### Refund Decision Guide

| Cancellation Timing | Suggested Refund |
|---------------------|------------------|
| 48+ hours before | 100% |
| 24-48 hours before | 50% (policy dependent) |
| < 24 hours before | 0% (policy dependent) |
| No-show | 0% |
| Tour cancelled by operator | 100% |

---

## 6. Rescheduling a Booking

**When**: Customer wants different date/time
**Time**: 30 seconds
**Goal**: Move booking to new schedule

### Flow

```
Step 1: Open Booking
────────────────────
Find booking → Click "Reschedule"

Step 2: Select New Schedule
───────────────────────────
• Dropdown shows available schedules
• Each shows: Date | Time | Spots Available
• Select new schedule

Step 3: Confirm
───────────────
Click "Confirm Reschedule"
     │
     ├─→ Old schedule: Capacity released
     ├─→ New schedule: Capacity reserved
     ├─→ Reschedule email sent to customer
     └─→ Activity logged with old/new dates
```

### Price Difference Handling

| Scenario | System Behavior |
|----------|-----------------|
| Same price | No change |
| New schedule more expensive | Shows difference, collect additional |
| New schedule cheaper | Shows difference, issue partial refund |

---

## 7. Setting Up a New Tour Product

**When**: Adding new tour offering
**Time**: 5-10 minutes
**Goal**: Tour ready to schedule and sell

### Flow

```
Step 1: Create Tour
───────────────────
Sidebar → Tours → "New Tour" button

Step 2: Basic Information
─────────────────────────
• Name: "Sunset City Walking Tour"
• Duration: 120 minutes
• Base Price: $49

Step 3: Capacity
────────────────
• Minimum: 2 (tour runs with at least 2)
• Maximum: 12 (most you can accommodate)

Step 4: Description
───────────────────
• Short description: One sentence for listings
• Full description: Complete tour details

Step 5: Meeting Point
─────────────────────
• Location: "Central Station, Main Entrance"
• Details: "Look for guide with orange umbrella"

Step 6: Media
─────────────
• Upload cover image (main photo)
• Add gallery images (3-5 recommended)

Step 7: Inclusions/Exclusions
─────────────────────────────
Inclusions:          Exclusions:
+ Professional guide  - Food and drinks
+ Walking map         - Gratuities
+ Audio guide         - Hotel pickup

Step 8: Cancellation Policy
───────────────────────────
• Free cancellation hours: 24
• Policy text: Auto-generated or custom

Step 9: Save as Draft
─────────────────────
Click "Save" → Tour saved as Draft

Step 10: Assign Guide Qualifications
────────────────────────────────────
Tour Detail → "Guide Qualifications" section
• Check guides who can lead this tour
• Based on language, experience, training

Step 11: Publish
────────────────
Click "Publish" → Tour now available for scheduling
```

### Tour Status Lifecycle

```
Draft → Active → [Paused] → Archived
  │        │         │          │
  │        │         │          └─ No longer offered
  │        │         └─ Temporarily unavailable
  │        └─ Can create schedules, take bookings
  └─ Setup in progress, not bookable
```

---

## 8. Creating Tour Schedules

**When**: Planning upcoming tour dates
**Time**: 30 seconds per schedule
**Goal**: Make tour available for specific date/time

### Single Schedule

```
Step 1: Navigate
────────────────
Sidebar → Schedules → "New Schedule"

Step 2: Select Tour
───────────────────
• Dropdown shows active tours only
• Select tour

Step 3: Date & Time
───────────────────
• Date: Pick from calendar
• Start time: Enter time
• End time: Auto-calculated from duration

Step 4: Capacity (Optional)
───────────────────────────
• Max participants: Defaults from tour
• Override if this schedule is different

Step 5: Pricing (Optional)
──────────────────────────
• Defaults from tour base price
• Seasonal pricing auto-applies if configured
• Manual override available

Step 6: Save
────────────
Click "Create Schedule"
     │
     └─→ Schedule appears in calendar
         Bookings can now be made
```

### Bulk Schedule Creation

```
Schedules → Calendar View → "Bulk Create"
     │
     ├─→ Select tour
     ├─→ Select date range
     ├─→ Select days of week (Mon, Wed, Fri)
     ├─→ Set time
     └─→ Create all schedules at once
```

### Calendar Views

| View | Best For |
|------|----------|
| **Month** | Overview, planning |
| **Week** | Operational planning |
| **Day** | Day-of operations |
| **Agenda** | List view of upcoming |

---

## 9. Managing Guides

**When**: Adding guides, managing availability
**Time**: 2-3 minutes for new guide
**Goal**: Guides ready to be assigned

### Adding a New Guide

```
Step 1: Create Guide
────────────────────
Sidebar → Guides → "New Guide"

Step 2: Basic Info
──────────────────
• Name: First and Last
• Email: For notifications
• Phone: For day-of contact
• Photo: Professional headshot

Step 3: Languages
─────────────────
Select all languages guide speaks fluently

Step 4: Weekly Availability
───────────────────────────
Set recurring availability pattern:
┌─────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun │
│  9-5  9-5  OFF  9-5  9-5  9-9  OFF │
└─────────────────────────────────────┘

Step 5: Tour Qualifications
───────────────────────────
Check which tours this guide can lead:
☑ City Walking Tour
☑ Food Tour
☐ Adventure Hike (needs training)

Step 6: Save & Activate
───────────────────────
Click "Create Guide" → Status: Active
```

### Assigning Guide to Schedule

```
Schedule Detail → "Assign Guide"
     │
     ├─→ See list of qualified guides
     ├─→ Each shows: Name | Availability status
     │   • Green: Available
     │   • Yellow: Tentative
     │   • Red: Unavailable/Conflict
     │
     └─→ Click guide name → Assigned
         Guide receives notification email
```

### Guide Availability Override

```
Guide Detail → Availability → "Add Exception"
     │
     ├─→ Date: [specific date]
     ├─→ Status: Available / Unavailable
     ├─→ Hours: Custom hours for that day
     └─→ Save → Overrides weekly pattern
```

---

## 10. Customer Lookup & History

**When**: Customer calls with question, repeat booking
**Time**: 10 seconds to find
**Goal**: Access complete customer context

### Finding a Customer

```
Method 1: Global Search
───────────────────────
⌘K → Type name, email, or phone → Select customer

Method 2: From Booking
──────────────────────
Any booking → Click customer name → Customer detail

Method 3: Customer List
───────────────────────
Sidebar → Customers → Search bar
```

### Customer Detail Shows

```
┌─────────────────────────────────────────────┐
│  John Smith                                 │
│  john@email.com | +1 555-0123               │
├─────────────────────────────────────────────┤
│  BOOKINGS (5)                               │
│  • Sunset Tour - Dec 20, 2025 - Confirmed   │
│  • Food Tour - Nov 15, 2025 - Completed     │
│  • City Walk - Oct 3, 2025 - Completed      │
│  ...                                        │
├─────────────────────────────────────────────┤
│  NOTES                                      │
│  • VIP customer, always give best guide     │
│  • Prefers morning tours                    │
├─────────────────────────────────────────────┤
│  TAGS                                       │
│  [Repeat Customer] [VIP] [Photography]      │
└─────────────────────────────────────────────┘
```

### Quick Actions from Customer

| Action | How |
|--------|-----|
| Book for this customer | Click "New Booking" → Customer pre-filled |
| Add note | Click "Add Note" → Type → Save |
| View all bookings | Scroll to bookings section |
| Edit contact info | Click "Edit" button |

---

## 11. End-of-Day Reconciliation

**When**: End of business day
**Time**: 5-10 minutes
**Goal**: Verify operations and finances

### Daily Checklist

```
Step 1: Complete Today's Tours
──────────────────────────────
Dashboard → Today's Schedule
• Mark any remaining tours as Complete
• Handle no-shows

Step 2: Verify Payments
───────────────────────
Bookings → Filter: Today + Payment: Pending
• Follow up or record outstanding payments
• Note any issues

Step 3: Tomorrow Preview
────────────────────────
Dashboard → Check tomorrow's schedule
• All guides assigned?
• Any pending confirmations?
• Capacity issues?

Step 4: Quick Stats Check
─────────────────────────
Dashboard → Today Tab → Stats
• Today's revenue
• Bookings count
• Any anomalies?
```

### Reconciliation Report

```
Reports → Revenue → Date: Today
     │
     ├─→ Total bookings
     ├─→ Revenue collected
     ├─→ Refunds issued
     └─→ Net revenue
```

---

## 12. Weekly Business Review

**When**: Weekly (suggest Monday morning)
**Time**: 15-20 minutes
**Goal**: Understand business performance and plan

### Report Dashboard

```
Reports Hub → Access all reports
```

### Weekly Review Flow

```
Step 1: Revenue Report
──────────────────────
Reports → Revenue
• Date range: Last 7 days
• Compare to previous week
• Check: Revenue trend, refund rate

Step 2: Booking Report
──────────────────────
Reports → Bookings
• Bookings by tour (which tours selling?)
• Bookings by source (where are customers coming from?)
• Conversion rate (views to bookings)

Step 3: Capacity Report
───────────────────────
Reports → Capacity
• Tour utilization (are tours full or empty?)
• Identify: Underperforming schedules to cancel
• Identify: High-demand slots to add more

Step 4: Customer Report
───────────────────────
Reports → Customers
• New vs returning customers
• Top customers by spend
• Customer segments

Step 5: Action Items
────────────────────
Based on reports, decide:
• Add/remove schedules
• Adjust pricing
• Run promotions
• Follow up with customers
```

### Key Metrics to Track

| Metric | Good | Investigate |
|--------|------|-------------|
| Booking conversion | >3% | <1% |
| Capacity utilization | 60-80% | <40% or >95% |
| Refund rate | <5% | >10% |
| Repeat customer rate | >20% | <10% |

---

## Quick Reference: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette (search anything) |
| `⌘B` | New booking |
| `⌘/` | Keyboard shortcuts help |
| `Esc` | Close modal/dialog |

## Quick Reference: Status Colors

| Color | Bookings | Schedules | Payments |
|-------|----------|-----------|----------|
| **Green** | Confirmed | Scheduled | Paid |
| **Yellow** | Pending | - | Partial |
| **Red** | Cancelled | Cancelled | Failed |
| **Gray** | Completed | Completed | Refunded |

---

## Common Scenarios

### "Customer wants to add more people"

```
Open booking → Edit → Increase guest count → Save
Price auto-recalculates → Collect difference
```

### "Tour is full but customer really wants to join"

```
Check: Can this schedule accommodate more?
If yes: Schedule Detail → Edit → Increase max capacity
If no: Offer alternative date/time
```

### "Guide called in sick"

```
Schedule Detail → Click assigned guide → "Reassign"
Select available qualified guide
New guide receives notification
```

### "Customer lost confirmation email"

```
Booking Detail → "Resend Confirmation"
Email sent immediately
```

### "Need to cancel entire tour (weather, etc.)"

```
Schedule Detail → "Cancel Schedule"
All bookings auto-cancelled
All customers notified
Refunds can be processed in bulk
```

---

## System Automations (What Happens Automatically)

| Trigger | Automatic Action |
|---------|------------------|
| Booking created | Confirmation email sent |
| 24h before tour | Reminder email sent |
| Tour completed | Review request email sent |
| Payment received (online) | Receipt sent, status updated |
| Refund processed | Notification sent |
| Guide assigned | Assignment notification sent |

---

*Document Version: 1.0*
*Last Updated: December 2025*
