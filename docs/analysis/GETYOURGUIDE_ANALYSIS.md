# GetYourGuide - Platform Analysis

> Competitive analysis of GetYourGuide's supplier platform for Tour CRM improvement

## Executive Summary

GetYourGuide is a leading travel experience marketplace. Their supplier platform serves tour operators with booking management, analytics, and distribution. Key strengths include **predictive analytics**, **AI-assisted content creation**, and **mobile-first guide experience**.

---

## 1. Booking Management

### Workflow & Features

**Booking Organization:**
- Three-tab system: **Upcoming**, **Completed**, and **Canceled**
- Search functionality to quickly locate specific bookings
- Each booking displays: activity name, booking number, dates, participants, commission, agent email

**Booking Actions:**
- **Manage Button** - Opens detailed booking page
- **Download Voucher** - Generate/share customer voucher
- **Proof of Payment** - Request payment documentation
- **Reschedule** - Change booking to another date
- **Cancel Booking** - Cancellation workflow
- **Contact Supplier** - Direct communication channel

**Booking Reference System:**
- Unique identifier follows the customer from reservation through confirmation
- Reference remains consistent even if customer modifies booking
- Important for tracking modifications and maintaining conversation history

### Key Insight
GetYourGuide separates bookings by status in tabs rather than mixing them in one view. This reduces cognitive load and allows operators to focus on what's actionable.

---

## 2. Dashboard & Analytics

### Performance Analytics Dashboard

**Four Key Dashboard Categories:**

**1. Sales & Revenue Dashboard:**
- Net Revenue (after commission)
- Total Tickets Sold
- Tour Visitors (unique customers)
- Conversion Rate (customers who book after viewing)
- Top Source Markets (geographic breakdown)
- Business Exposure metrics

**2. Customer Reviews Dashboard:**
- Average Review Ratings
- Trends in low ratings
- Review breakdown by product

**3. Supplier Cancellation Dashboard:**
- Cancellation Rate percentage
- Cancellation Reasons analysis
- Lost Revenue due to cancellations
- Lost Tickets count

**4. Product Performance Dashboard:**
- Performance across multiple metrics
- Filterable by product, date range, market
- Year-over-year comparison
- Downloadable reports

### Predictive Insights

**"Likely to Sell Out" Badge:**
- AI-powered demand prediction analyzes travel demand + remaining availability
- Alerts suppliers when tours might sell out
- Recommendation: Add more capacity/seats to capture demand
- Business rationale: Sellouts = lost revenue + lower conversion rate = reduced ranking

### Key Insight
The "Likely to Sell Out" prediction turns data into actionable recommendations. Our CRM could implement: "Tour X has 80% capacity for next Saturday - consider adding another departure time."

---

## 3. Customer Management & Communication

### Communication Tools

**Email Communication System:**
- All customer contact information is **anonymized** using temporary email addresses
- Domain: `@reply.getyourguide.com`
- Archive of all supplier-customer communication created automatically
- **Temporary relay email expires 7 days after activity**
- No direct customer email addresses shared (privacy protection)

**Notification Management:**
- Customizable notification settings per user
- Categories: Product quality, bookings, reviews, accounting, customer questions
- Limitation: Only one user per notification type receives alerts
- Workaround: Email groups for shared inbox access

**Live Support Chat:**
- 24/7 availability for active suppliers
- Languages: English, Italian, French, Spanish, German

### Key Insight
The temporary email relay is clever privacy protection, but 7-day expiration is limiting. Our CRM should allow longer communication windows (30 days post-tour) while protecting privacy.

---

## 4. Tour/Activity Management

### Product Creation Wizard

**Step-by-Step Approach:**

1. **Basic Setup** - Language, category, legal status
2. **Product Information** - Name, descriptions, highlights
3. **Location Setup** - Cities, meeting point, map integration
4. **Keywords & Tagging** - Up to 15 keywords, AI suggestions
5. **Inclusions** - What's included/not included
6. **Options Configuration** - Tour variants (Standard vs VIP)
7. **Itinerary Builder** - Visual map journey (**25% more bookings!**)
8. **Availability & Pricing** - Categories, capacity, times
9. **Validation & Review** - Compliance checking, quality review

### AI-Powered Content Creation

**Automated Content Creator:**
- AI generates guideline-friendly listings
- Reduces creation time by **up to 40%**
- Fewer errors in listings
- Multi-language support

### Key Insight
The wizard approach with inline tips is excellent UX. Progressive disclosure prevents overwhelm. The 25% booking increase from visual itineraries justifies building an itinerary builder.

---

## 5. Scheduling/Availability Management

### Availability System

**Calendar Management:**
- Navigate to Manage > Availability
- Filter by product, option, or date
- Two availability modes:
  - **Fixed start times** - Tours depart at specific times
  - **Operating hours** - Customers book within time window

**Manual Availability Creation:**
- Select dates/times products are bookable
- Adjust number of bookable persons per slot
- Bulk editing feature for multiple slots

**Blocking Dates:**
- Block specific slots when unavailable
- Blocked dates don't affect existing bookings
- Prevents new bookings only

**API-Based Availability:**
- Real-time changes via API
- Never remove sold-out slots - set availability to **zero** instead
- Price updates take **up to 24 hours** to sync

### Key Insight
The "never remove, set to zero" pattern for sold-out slots is important API design. The 24-hour sync delay is too long - aim for real-time (< 5 minutes).

---

## 6. Guide/Staff Management

### Guide Assignment Feature

**How It Works:**
- Assign specific guide to each booking directly in portal
- Guide's **name, photo, phone number** displayed to customer
- Helps customers identify correct guide on tour day

**Privacy Protection:**
- Guide's phone number **only visible ±1 hour around activity**
- Prevents calls outside working hours
- Balances customer service with staff privacy

**Mobile App Integration:**
- GetYourGuide Supplier mobile app (Android/iOS)
- Guides can check in customers
- Scan vouchers (paper or mobile QR codes)
- **Share live location** for customers finding meeting point
- View booking details: time slot, language, add-ons

### Key Insight
The time-restricted phone visibility (±1 hour) is brilliant privacy protection. The live location sharing for meeting points is a practical customer experience enhancement.

---

## 7. Pricing & Promotions

### Pricing Models

**Base Pricing Options:**
- Per Person pricing
- Per Group pricing (flat rate)
- Price Tiers (scaled by group size)

**Pricing Categories:**
- Adult, Child, Infant, Senior, Student, etc.
- Different rates per age group
- Automatic payout calculation after commission

### Dynamic Pricing

- Prices can rise **20-30% during peak seasons**
- Discounts up to **40% during off-peak periods**
- Control by: time before departure, vacancies, demand signals

### Promotions & Special Offers

**Special Offers Feature:**
- Discounted prices for limited time
- **Best Practice:** 3-4 week introductory discount on new activities

**Seasonal Promotions:**
- 25% revenue growth during promotional periods
- 15-20% increase in bookings during sales
- Peak events: Summer holidays, festive seasons

**Commission Model:**
- No cost to list/maintain activities
- Commission charged only on **fulfilled bookings**
- Monthly or bi-monthly payments

### Key Insight
The introductory discount recommendation (3-4 weeks) accelerates review generation. Prompt new tour launches with discount suggestions.

---

## 8. Mobile Experience

### GetYourGuide Supplier App

**Platform:** Android & iOS (6.81 MB, lightweight)

**Core Features:**
1. **Customer Check-In** - Verify customers, view purchases
2. **Voucher Scanning** - Paper and mobile QR codes
3. **Live Location Sharing** - Help customers find meeting point
4. **Booking Management** - View upcoming, access manifests

**Setup Time:** Most users running in **under 30 minutes**

### Key Insight
The dedicated mobile app for guides is essential. Our guide portal should evolve to native mobile apps for check-in, QR scanning, and manifest access.

---

## 9. Notable UX Patterns

### Pattern 1: Progressive Disclosure
- Wizard breaks complex task into digestible steps
- Inline tips, examples, prompts at each step
- Prevents overwhelm

### Pattern 2: AI as Co-Pilot
- AI generates draft, human refines
- AI suggests keywords/locations, operator approves
- 40% time savings with quality maintained

### Pattern 3: Predictive Alerts > Raw Data
- "Likely to Sell Out" converts analytics into action
- Lost revenue shown (not just cancellation count)
- Conversion rate tied to visibility/ranking

### Pattern 4: Validation Before Publication
- Automatic guideline compliance checking
- Quality review process
- Faster approval for accurate submissions

### Pattern 5: Performance Standards
- Cancellation rate must be ≤ 1.0%
- No-show rate must be ≤ 0.2%
- 90-day rolling basis monitoring

### Pattern 6: Bulk Editing
- Update availability for multiple slots at once
- Block multiple dates in one action
- Saves time on repetitive tasks

---

## 10. Recommendations for Our CRM

### Immediate (Phase 4)
1. Add "Introductory Discount" prompt for new tours (3-4 weeks)
2. Implement price tiers (group size-based discounts)
3. Show "Lost Revenue" metrics for cancellations

### Phase 5-6
1. Build "Likely to Sell Out" predictions using booking velocity + capacity
2. Add bulk editing for schedules
3. Implement visual itinerary builder (25% booking increase)
4. Add conversion funnel metrics

### Phase 7-8
1. Multi-category review system (Service, Organization, Value, Safety)
2. Photo uploads in reviews
3. Automated review request emails with reminders

### Phase 9+ (Guide Portal)
1. Native mobile app for guides
2. QR code scanning for check-in
3. Live location sharing for meeting points
4. Time-restricted phone number visibility (±1 hour)

### Phase 10+ (SaaS)
1. Performance benchmarks per organization
2. Organization ranking based on performance
3. AI content generation for tour descriptions
4. AI-suggested keywords/tags

---

## Key Strengths (Learn From)

| Feature | Why It Works |
|---------|--------------|
| Predictive Analytics | Turns data into action |
| AI Content Creation | 40% time savings |
| Mobile Guide App | Essential field operations |
| Privacy-Balanced Comms | Anonymized relay + archives |
| Progressive Wizard | Prevents overwhelm |
| Performance Benchmarks | Clear standards |
| 100+ Integrations | Ecosystem approach |
| Visual Itineraries | 25% more bookings |

## Weaknesses (Our Opportunities)

| Gap | Our Advantage |
|-----|---------------|
| Third-party CRM required | Native CRM built-in |
| Basic guide assignment | Full availability, qualifications, manifests |
| 7-day email expiration | 30-day windows |
| 24-hour sync delays | Real-time sync |
| One user per notification | Role-based notifications |
| Limited rescheduling | Sophisticated booking changes |
| No customer lifecycle | Retention/loyalty features |

---

## Sources

- GetYourGuide Supply Partner Portal
- Supply Partner Help Center
- GetYourGuide Analytics Documentation
- Supplier API Documentation
- Third-party integration reviews (Bókun, Rezdy, TourCMS)
