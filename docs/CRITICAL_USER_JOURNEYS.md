# Critical User Journeys

> The architectural user stories that make or break the Tour CRM. These are the moments of truth where the system either enables success or causes failure.

---

## The Five Moments That Matter

Every tour business lives or dies by five critical moments:

| Moment | Stakes | Failure Cost |
|--------|--------|--------------|
| **The Sale** | Customer is ready to buy | Lost revenue, lost customer forever |
| **The Execution** | Tour is about to happen | Ruined experience, bad reviews, refunds |
| **The Recovery** | Something went wrong | Angry customers, reputation damage |
| **The Return** | Customer comes back | Missed upsell, lost loyalty |
| **The Truth** | Understanding the business | Bad decisions, missed opportunities |

This document defines what MUST work flawlessly in each moment.

---

## Critical Journey #1: The Live Booking

### The Scenario
```
Phone rings. Customer says:
"Hi, I'd like to book your sunset tour for this Saturday.
There's 4 of us - 2 adults and 2 kids.
Do you have availability?"
```

**You have 90 seconds before they hang up and book with a competitor.**

### What Must Happen

```
┌─────────────────────────────────────────────────────────────────┐
│  SECOND 0-10: Availability Check                                │
│  ─────────────────────────────────────────────────────────────  │
│  • System shows Saturday's sunset tour schedules                │
│  • Each shows: Time | Spots Left | Price                        │
│  • Answer: "Yes, we have the 5:30 PM with 8 spots open"         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SECOND 10-30: Customer Capture                                 │
│  ─────────────────────────────────────────────────────────────  │
│  • "Can I get your name and phone number?"                      │
│  • Type while talking - instant search                          │
│  • EXISTING: "I see you booked with us in October!"             │
│  • NEW: Create with name + phone (email optional)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SECOND 30-50: Booking Creation                                 │
│  ─────────────────────────────────────────────────────────────  │
│  • Customer auto-selected                                       │
│  • Schedule auto-selected from availability check               │
│  • Enter: 2 adults, 2 children                                  │
│  • Price calculates: "$49 x 2 + $29 x 2 = $156"                 │
│  • "Your total is $156"                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SECOND 50-70: Details & Confirmation                           │
│  ─────────────────────────────────────────────────────────────  │
│  • "Any dietary requirements?" → Enter if yes                   │
│  • "Where are you staying?" → Enter hotel for pickup            │
│  • Click Create → Booking confirmed                             │
│  • "You're confirmed! Reference number BK-2847"                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SECOND 70-90: Payment                                          │
│  ─────────────────────────────────────────────────────────────  │
│  • "Would you like to pay now or on arrival?"                   │
│  • NOW: Take card details → Record payment                      │
│  • LATER: "I'll send a payment link to your phone"              │
│  • Done. Customer confirmed in under 90 seconds.                │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Real-time availability** | Customer won't wait for "let me check" | Overbooking or lost sale |
| **Instant customer lookup** | Returning customers expect recognition | Feels impersonal, duplicate records |
| **Phone-only customer creation** | Not everyone has email ready | Lost booking |
| **Live price calculation** | Customer needs total immediately | Pricing errors, disputes |
| **One-click booking** | Every extra click is friction | Abandoned booking |
| **Immediate confirmation** | Customer needs assurance | Anxiety, double-booking elsewhere |

### The Killer Feature: Availability-First Booking

```
Most CRMs: Customer → Schedule → Check availability → Maybe available
This CRM:  Available Schedules → Customer → Book

Start from what's ACTUALLY available. Never show unavailable options.
```

### Success Metric
**Booking completion in < 90 seconds with customer on phone**

---

## Critical Journey #2: The Morning Manifest

### The Scenario
```
It's 7:00 AM. Guide Sarah has a 9:00 AM tour.
She needs to know:
- How many people?
- Their names?
- Any special needs?
- Where to pick them up?
- Has everyone confirmed?
```

**If Sarah doesn't have this information, the tour starts badly.**

### What Must Happen

```
GUIDE VIEW (Mobile-Optimized)
═══════════════════════════════════════════════════════════════

TODAY'S ASSIGNMENT: City Walking Tour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Saturday, Dec 21 • 9:00 AM - 11:30 AM
📍 Central Station, Main Entrance
👥 8 participants (3 bookings)

PARTICIPANT MANIFEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOKING #BK-2847 • Smith Family ✓ Confirmed
├─ John Smith (Adult)
├─ Jane Smith (Adult)
├─ Tommy Smith (Child, 8)
└─ Lucy Smith (Child, 5)
   🍽️ Vegetarian x2 (Jane, Lucy)
   🏨 Pickup: Marriott Downtown, Lobby @ 8:30 AM
   📱 +1 555-0123

BOOKING #BK-2851 • Chen ✓ Confirmed
├─ Wei Chen (Adult)
└─ Mei Chen (Adult)
   🍽️ No shellfish
   📍 Meeting at start point

BOOKING #BK-2853 • Johnson ⚠️ Pending Payment
├─ Robert Johnson (Adult)
└─ Lisa Johnson (Adult)
   📱 +1 555-0456
   ⚠️ Payment pending - may be no-show

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
• Total: 8 participants (6 adults, 2 children)
• Dietary: 2 vegetarian, 1 no shellfish
• Pickups: 1 hotel pickup @ 8:30 AM
• Status: 6 confirmed, 2 pending payment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Single-screen manifest** | Guide checks phone while walking | Missing information |
| **Dietary HIGHLIGHTED** | Must be visible at a glance | Allergic reaction, lawsuit |
| **Hotel pickups with time** | Guide needs route planning | Missed pickup, angry customer |
| **Payment status visible** | Know who might no-show | Wasted capacity |
| **Phone numbers accessible** | Last-minute contact | Can't reach late customer |
| **Headcount summary** | Quick reference | Wrong vehicle size, supplies |

### The Killer Feature: Smart Alerts

```
MANIFEST ALERTS (shown at top)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 1 hotel pickup - leave 30 min early
⚠️ 2 unpaid bookings - potential no-shows
🍽️ 3 dietary requirements - check with restaurant
♿ 0 accessibility needs
```

Guide knows EXACTLY what needs attention before leaving.

### Success Metric
**Guide has complete manifest 1 hour before tour, on mobile, in < 10 seconds**

---

## Critical Journey #3: The Crisis Response

### The Scenario
```
It's 6:00 AM. Weather forecast: Thunderstorms all day.
You have 4 tours scheduled with 47 total participants.
All tours must be cancelled. NOW.
```

**Every minute of delay = more angry customers discovering cancellation themselves.**

### What Must Happen

```
CRISIS: Mass Cancellation Flow
═══════════════════════════════════════════════════════════════

STEP 1: ASSESS (30 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dashboard → Today's Schedule

TODAY'S TOURS AT RISK:
┌────────────────────────────────────────────────────────────┐
│ □ 9:00 AM  City Walk      12 pax   Guide: Sarah    │
│ □ 10:30 AM Food Tour       8 pax   Guide: Mike     │
│ □ 2:00 PM  Sunset Tour    15 pax   Guide: Sarah    │
│ □ 4:00 PM  Night Tour     12 pax   Guide: Alex     │
├────────────────────────────────────────────────────────────┤
│ TOTAL: 4 tours, 47 participants, 32 bookings              │
│ [Select All] [Cancel Selected Tours]                       │
└────────────────────────────────────────────────────────────┘

STEP 2: CANCEL (60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select All → Click "Cancel Selected Tours"

CANCEL TOURS
┌────────────────────────────────────────────────────────────┐
│ Cancellation Reason: [Weather ▼]                          │
│                                                            │
│ □ Send cancellation emails to all customers (47)          │
│ □ Send notification to guides (3)                         │
│ □ Auto-process full refunds for paid bookings (28)        │
│                                                            │
│ Message to customers:                                      │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Due to severe weather conditions, your tour has been  ││
│ │ cancelled. A full refund will be processed within     ││
│ │ 5-7 business days. We apologize for the inconvenience.││
│ │                                                        ││
│ │ Would you like to reschedule? Reply to this email or  ││
│ │ call us at [phone].                                    ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ [Cancel Tours & Notify Everyone]                          │
└────────────────────────────────────────────────────────────┘

STEP 3: EXECUTE (automatic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
System automatically:
├─→ Cancels 4 schedules
├─→ Cancels 32 bookings
├─→ Sends 47 customer emails
├─→ Sends 3 guide notifications
├─→ Processes 28 refunds via Stripe
└─→ Logs all actions for audit

STEP 4: VERIFY (60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dashboard shows:
✓ 4 tours cancelled
✓ 47 emails sent
✓ 28 refunds processing
⚠️ 4 bookings had no email - call list generated
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Bulk operations** | Can't click 32 times | Hours wasted, inconsistent handling |
| **One-click notify all** | Customers need to know NOW | People show up to cancelled tour |
| **Auto-refund option** | Manual refunds take hours | Angry customers, chargebacks |
| **Guide notification** | They need to know too | Guide shows up, wasted time |
| **Audit trail** | Legal protection | No proof of notification |
| **No-email fallback** | Some customers phone-only | They never find out |

### The Killer Feature: Crisis Dashboard

```
During active crisis, dashboard transforms:

ACTIVE CRISIS: Weather Cancellation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: ████████████░░░░░░ 67%

✓ 4/4 tours cancelled
✓ 3/3 guides notified
✓ 32/47 customers emailed
⏳ 28 refunds processing (est. 2 min)
⚠️ ACTION NEEDED: 4 customers without email

[View Call List] [Mark Crisis Resolved]
```

### Success Metric
**Full crisis resolution (cancel, notify, refund) in < 5 minutes for 50 participants**

---

## Critical Journey #4: The Angry Customer

### The Scenario
```
Phone rings. Angry voice:
"I booked a tour for yesterday and NO ONE showed up!
I've been trying to reach you all morning!
I want a refund AND compensation!"
```

**You have 60 seconds to understand what happened and de-escalate.**

### What Must Happen

```
INSTANT CONTEXT (Command Palette: ⌘K)
═══════════════════════════════════════════════════════════════

Type: "yesterday" or customer name/phone
     ↓
CUSTOMER FOUND: Margaret Wilson
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECENT BOOKING: #BK-2834
├─ Tour: Sunset Walking Tour
├─ Date: Yesterday, Dec 20 @ 5:30 PM
├─ Status: ⚠️ SCHEDULE CANCELLED (Weather)
├─ Participants: 2 adults
├─ Paid: $98.00 via card
└─ Refund: ⚠️ NOT PROCESSED

COMMUNICATION HISTORY:
├─ Dec 20, 6:12 AM - Cancellation email SENT
├─ Dec 20, 6:12 AM - Email BOUNCED (invalid address)
└─ No other contact attempts

CUSTOMER RECORD:
├─ Email: mwilson@gmial.com  ← TYPO: should be gmail
├─ Phone: +1 555-0789
├─ Previous bookings: 0 (first-time customer)
└─ Notes: None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK ACTIONS:
[Process Full Refund] [Add Compensation Credit] [Call Customer]
[Add Note] [Correct Email Address]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### What You Now Know (in 10 seconds)
```
1. Tour WAS cancelled (not a no-show by guide)
2. Cancellation email bounced (typo in email)
3. We never tried phone notification
4. Refund was never processed
5. This is a first-time customer (high recovery value)
```

### What You Say
```
"I am so sorry, Mrs. Wilson. I can see exactly what happened.
Your tour was cancelled due to weather, and we tried to email you,
but there was a typo in your email address so you never received it.

That's completely our fault for not calling you as backup.
I'm processing your full refund right now - you'll see it in 3-5 days.

And I'd like to offer you a complimentary tour on us for the trouble.
When would you like to reschedule?"
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Instant booking lookup** | Customer is angry NOW | Fumbling makes it worse |
| **Full communication history** | Know what we sent/didn't send | Blame customer incorrectly |
| **Email delivery status** | Know if they actually received | "We sent it" when we didn't |
| **One-click refund** | Resolve immediately | "I'll have to call you back" |
| **Compensation credits** | Recovery tool | Lost customer forever |
| **Note capture** | Remember this interaction | Same mistake twice |

### The Killer Feature: Communication Timeline

```
COMMUNICATION TIMELINE FOR BOOKING #BK-2834
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dec 18  Booking confirmation      ✓ Delivered, Opened
Dec 19  24-hour reminder          ✓ Delivered, Opened
Dec 20  Cancellation notice       ✗ BOUNCED
Dec 20  Refund confirmation       (not sent - refund not processed)

DELIVERY ISSUES DETECTED:
⚠️ Email mwilson@gmial.com appears invalid
   Suggest: mwilson@gmail.com
```

### Success Metric
**Full customer context available in < 10 seconds from any identifier (name, phone, booking ref)**

---

## Critical Journey #5: The Returning Customer

### The Scenario
```
Phone rings:
"Hi, I did a food tour with you last month and loved it!
I want to book another tour - what else do you have?"
```

**This is your BEST customer. Handle them perfectly.**

### What Must Happen

```
RETURNING CUSTOMER RECOGNITION
═══════════════════════════════════════════════════════════════

Caller ID or name lookup → Instant recognition

WELCOME BACK: David Chen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER PROFILE:
├─ Member since: October 2025
├─ Total bookings: 3
├─ Total spent: $347
├─ Avg rating given: 4.8 ★
└─ Status: 🌟 Repeat Customer

BOOKING HISTORY:
├─ Nov 15: Food Tour ★★★★★ "Amazing guide, great food!"
├─ Oct 28: City Walk ★★★★★ "Perfect introduction to the city"
└─ Oct 12: Sunset Tour ★★★★☆ "Beautiful but crowded"

PREFERENCES (learned):
├─ Preferred time: Morning (2/3 bookings before noon)
├─ Group size: Usually solo or +1
├─ Interests: Food, photography (from tour selections)
└─ Note: Mentioned anniversary trip in November

NOT YET EXPERIENCED:
├─ Night Photography Tour → Matches interests
├─ Wine Tasting Tour → Complements food interest
└─ Adventure Hike → Different category

SUGGESTED SCRIPT:
"Great to hear from you again, David! You did our Food Tour
last month - I see you gave it 5 stars, thank you!

Based on what you enjoyed, I think you'd love our Wine Tasting
Tour or our Night Photography Tour. Both have availability
this weekend. Which sounds interesting?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Book Wine Tour] [Book Photo Tour] [Show All Tours] [Add Note]
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Instant recognition** | Customer expects to be known | "Have you booked before?" = insult |
| **Complete history** | Personalize the conversation | Generic experience |
| **Preference learning** | Smarter recommendations | Suggesting things they won't like |
| **Reviews visible** | Know their sentiment | Recommend tour they hated |
| **Smart suggestions** | Maximize upsell | Missed revenue opportunity |
| **One-click book** | Frictionless for VIP | Making loyal customer wait |

### The Killer Feature: Customer Intelligence

```
CUSTOMER INTELLIGENCE SCORE: 87/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Predicted Lifetime Value: $1,200+
📈 Booking Frequency: Monthly
🎯 Recommended Action: Loyalty program invite
⚠️ Churn Risk: Low

WHY THIS SCORE:
+ 3 bookings in 2 months (high frequency)
+ All 4-5 star reviews (satisfied)
+ Increasing spend ($47 → $98 → $202)
+ Responds to emails (engaged)
```

### Success Metric
**Returning customer identified and personalized in < 5 seconds**

---

## Critical Journey #6: The Revenue Truth

### The Scenario
```
End of month. Owner asks:
"How did we do this month? Are we making money?
Which tours should we run more? Which guides are performing?"
```

**If you can't answer in 2 minutes, you're flying blind.**

### What Must Happen

```
BUSINESS INTELLIGENCE DASHBOARD
═══════════════════════════════════════════════════════════════

DECEMBER 2025 PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REVENUE
┌─────────────────────────────────────────────────────────────┐
│  Gross Revenue     $24,847    ▲ 12% vs Nov                 │
│  Refunds           -$1,203    (4.8% refund rate)           │
│  Net Revenue       $23,644                                  │
│                                                             │
│  ████████████████████████████░░░░░░░░  78% of $30k target  │
└─────────────────────────────────────────────────────────────┘

BOOKINGS
┌─────────────────────────────────────────────────────────────┐
│  Total Bookings        312    ▲ 8% vs Nov                  │
│  Participants          847    ▲ 15% vs Nov                 │
│  Avg Booking Value    $79.64                                │
│  Cancellation Rate    6.2%    ▼ (good - was 8.1%)          │
└─────────────────────────────────────────────────────────────┘

TOUR PERFORMANCE
┌────────────────────────────────────────────────────────────┐
│ Tour              Bookings   Revenue   Capacity   Trend    │
├────────────────────────────────────────────────────────────┤
│ Food Tour            89     $8,722      94%       ▲▲      │
│ City Walk            78     $5,460      71%       ▲       │
│ Sunset Tour          64     $4,992      82%       ═       │
│ Night Photo          42     $3,738      88%       ▲       │
│ Wine Tasting         28     $1,680      45%       ▼▼      │
│ Adventure Hike       11       $825      23%       ▼▼▼     │
└────────────────────────────────────────────────────────────┘
⚠️ INSIGHT: Wine Tasting and Adventure Hike underperforming.
   Consider: Reduce schedules or run promotions.

GUIDE PERFORMANCE
┌────────────────────────────────────────────────────────────┐
│ Guide         Tours Led   Avg Rating   Revenue Generated   │
├────────────────────────────────────────────────────────────┤
│ Sarah M.          34        4.9 ★         $7,823          │
│ Mike R.           28        4.7 ★         $5,992          │
│ Alex K.           24        4.8 ★         $5,104          │
│ Jennifer L.       19        4.2 ★         $3,248          │
│ Tom B.            12        3.9 ★         $1,477          │
└────────────────────────────────────────────────────────────┘
⚠️ INSIGHT: Tom B. has lowest rating. Review feedback.
   Jennifer L. rating declining (was 4.6 in Nov).

CUSTOMER ACQUISITION
┌─────────────────────────────────────────────────────────────┐
│  Source              Bookings    Revenue    Conv. Rate     │
├─────────────────────────────────────────────────────────────┤
│  Direct/Website         156      $12,324      4.2%        │
│  Viator                  78       $5,850      n/a         │
│  Google                  42       $3,318      2.8%        │
│  Referral                24       $2,112      12.4%       │
│  Repeat Customer         12         $943      n/a         │
└─────────────────────────────────────────────────────────────┘
⚠️ INSIGHT: Referrals have 12.4% conversion (3x average).
   Consider: Referral program or discount.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED ACTIONS FOR JANUARY:
1. ⬆️ Add more Food Tour schedules (at capacity)
2. ⬇️ Reduce Wine Tasting to weekends only
3. 🔍 Review Tom B.'s performance and feedback
4. 💰 Launch referral discount program
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Single-screen overview** | Decision makers are busy | Death by reports |
| **Comparison to previous** | Context for numbers | "Is $24k good?" |
| **Capacity utilization** | Know what's working | Running empty tours |
| **Guide performance** | Quality control | Bad guides damage brand |
| **Source attribution** | Marketing ROI | Wasting ad spend |
| **Actionable insights** | What to DO | Data without decisions |

### The Killer Feature: Anomaly Detection

```
AUTOMATED ALERTS THIS MONTH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Dec 8: Adventure Hike cancelled 3x in a row (weather)
   Impact: -$450, 3 dissatisfied customers

🟡 Dec 15: Food Tour at 100% capacity 4 days straight
   Opportunity: Could have sold 23 more spots

🟢 Dec 20: Record single-day revenue: $2,847
   Driver: Corporate booking for 28 pax
```

### Success Metric
**Complete business health assessment in < 2 minutes, with actionable insights**

---

## Critical Journey #7: The Guide Emergency

### The Scenario
```
6:30 AM text from guide:
"I'm sick, can't do my 9 AM tour today. Sorry!"

You have a tour in 2.5 hours with 12 people booked.
```

**Find qualified, available replacement NOW.**

### What Must Happen

```
EMERGENCY GUIDE REPLACEMENT
═══════════════════════════════════════════════════════════════

AFFECTED TOUR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tour: City Walking Tour
Date: Today, 9:00 AM - 11:30 AM
Participants: 12 (4 bookings)
Original Guide: Sarah M. (called in sick)

FIND REPLACEMENT (System auto-searches)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVAILABLE & QUALIFIED:
┌────────────────────────────────────────────────────────────┐
│ ✓ Mike R.                                                  │
│   Qualified: Yes (City Walk certified)                     │
│   Available: Yes (no tours today)                          │
│   Rating: 4.7 ★                                            │
│   Last led this tour: Dec 12                               │
│   [Assign & Notify]                                        │
├────────────────────────────────────────────────────────────┤
│ ✓ Alex K.                                                  │
│   Qualified: Yes (City Walk certified)                     │
│   Available: Yes (afternoon tour only)                     │
│   Rating: 4.8 ★                                            │
│   Last led this tour: Dec 8                                │
│   [Assign & Notify]                                        │
└────────────────────────────────────────────────────────────┘

QUALIFIED BUT UNAVAILABLE:
┌────────────────────────────────────────────────────────────┐
│ ✗ Jennifer L. - Leading Food Tour 9:30 AM                 │
│ ✗ Tom B. - Marked unavailable today                       │
└────────────────────────────────────────────────────────────┘

NOT QUALIFIED:
┌────────────────────────────────────────────────────────────┐
│ ✗ New Guide Chris - Not yet certified for City Walk       │
└────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK ACTIONS:
[Assign Mike R.] [Assign Alex K.] [Cancel Tour] [Call Guides]
```

### One Click Resolution

```
Click "Assign Mike R."
     │
     ├─→ Mike assigned to tour
     ├─→ Mike receives: SMS + Email with manifest
     ├─→ Sarah removed from tour
     ├─→ Sarah marked: "Sick leave - Dec 21"
     ├─→ Activity logged
     └─→ No customer notification needed (same tour, different guide)

DONE. Total time: 30 seconds.
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Qualification filtering** | Can't send unqualified guide | Bad tour, liability |
| **Real-time availability** | Must account for other assignments | Double-booking guide |
| **One-click assign** | Emergency = no time for forms | Missed tour |
| **Auto-notification** | Guide needs manifest immediately | Unprepared guide |
| **No customer impact** | They don't need to know | Unnecessary worry |

### The Killer Feature: Predictive Staffing

```
STAFFING RISK FORECAST (next 7 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Dec 24: 8 tours, only 5 guides available
   Risk: 3 tours have no backup guide
   Action: Ask Jennifer/Tom to be on-call

⚠️ Dec 26: Sarah leading 4 tours (overloaded)
   Risk: High burnout, quality may suffer
   Action: Redistribute 1-2 tours to Mike
```

### Success Metric
**Qualified replacement guide assigned in < 60 seconds**

---

## Critical Journey #8: The Overbooking Prevention

### The Scenario
```
Two staff members taking phone bookings simultaneously.
Both checking availability for the same tour.
Both see "2 spots left."
Both book 2 people each.

Result: 4 people booked for 2 spots. Disaster.
```

**System must prevent this automatically.**

### What Must Happen

```
REAL-TIME INVENTORY MANAGEMENT
═══════════════════════════════════════════════════════════════

HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Staff A opens booking form at 10:00:00
│
├─→ Sees: "Sunset Tour Sat 5:30 PM - 2 spots left"
│
│   Staff B opens booking form at 10:00:05
│   │
│   └─→ Sees: "Sunset Tour Sat 5:30 PM - 2 spots left"
│
Staff A selects schedule, enters 2 guests at 10:00:30
│
├─→ System: HOLDS 2 spots (temporary reservation)
│
│   Staff B sees (real-time update):
│   "Sunset Tour Sat 5:30 PM - 0 spots left" ← UPDATED
│   │
│   └─→ Cannot select this schedule (greyed out)
│
Staff A completes booking at 10:01:00
│
├─→ System: CONFIRMS 2 spots (permanent)
│
│   Staff B: Must choose different schedule
│
└─→ OVERBOOKING PREVENTED
```

### The Safeguards

```
LAYER 1: Real-Time Availability Display
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Availability updates every 2 seconds
• WebSocket connection for instant updates
• All staff see same numbers simultaneously

LAYER 2: Soft Hold on Selection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• When staff selects schedule: 5-minute soft hold
• Spots "reserved" but not confirmed
• Other staff see reduced availability
• Hold expires if booking not completed

LAYER 3: Database-Level Lock
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Final check at booking creation
• Atomic transaction: Check + Book together
• If spots filled between selection and submit:
  → Booking fails with clear message
  → "Sorry, this schedule just filled up.
     Here are alternatives: [list]"

LAYER 4: Overbooking Alerts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If somehow overbooking occurs (edge case):
  → Immediate alert to admin
  → Booking flagged for review
  → Resolution workflow triggered
```

### Critical Requirements

| Requirement | Why It's Critical | Failure Mode |
|-------------|-------------------|--------------|
| **Real-time sync** | Multiple users, one truth | Conflicting information |
| **Optimistic UI updates** | Fast user experience | Laggy, frustrating |
| **Database-level protection** | Last line of defense | Data corruption |
| **Graceful failure** | When conflicts happen | Confused user, lost booking |
| **Immediate alternatives** | Don't lose the sale | Customer hangs up |

### Success Metric
**Zero overbookings regardless of concurrent user activity**

---

## Architecture Summary

### Data Flow Priorities

```
CRITICAL PATH (< 100ms response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Availability check
• Customer lookup
• Booking creation
• Price calculation

IMPORTANT PATH (< 500ms response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Dashboard load
• Manifest generation
• Report queries
• Search results

BACKGROUND (async, eventual)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email sending
• Analytics aggregation
• Audit logging
• Notification delivery
```

### State Management Priorities

```
REAL-TIME (WebSocket/polling)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Schedule availability
• Booking status changes
• Guide assignments

CACHED (refresh on action)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tour catalog
• Guide list
• Customer search
• Price tiers

STATIC (daily refresh)
━━━━━━━━━━━━━━━━━━━━━━━━
• Historical reports
• Analytics aggregates
• Customer segments
```

---

## Success Metrics Summary

| Journey | Metric | Target |
|---------|--------|--------|
| Live Booking | Time to complete | < 90 seconds |
| Morning Manifest | Time to access | < 10 seconds |
| Crisis Response | Time to resolve | < 5 minutes |
| Angry Customer | Time to context | < 10 seconds |
| Returning Customer | Time to recognize | < 5 seconds |
| Revenue Truth | Time to assess | < 2 minutes |
| Guide Emergency | Time to replace | < 60 seconds |
| Overbooking | Prevention rate | 100% |

---

## Implementation Priority

### P0: Without These, CRM is Unusable
1. Real-time availability display
2. Sub-90-second booking flow
3. Basic customer lookup
4. Manifest generation
5. Overbooking prevention

### P1: Without These, Operations Suffer
1. Bulk cancellation/notification
2. Guide replacement workflow
3. Payment recording
4. Communication history
5. Basic reporting

### P2: Without These, Growth Limited
1. Customer intelligence
2. Smart recommendations
3. Predictive insights
4. Anomaly detection
5. Advanced analytics

---

*Document Version: 1.0*
*Last Updated: December 2025*
*Purpose: Define the moments that matter and what success looks like*
