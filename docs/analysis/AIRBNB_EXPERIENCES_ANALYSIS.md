# Airbnb Experiences - Platform Analysis

> Competitive analysis of Airbnb's Experience host platform for Tour CRM improvement

## Executive Summary

Airbnb Experiences is a growing segment within Airbnb, offering **650+ cities and 19 categories** of activities. Their host platform underwent a **major 2025 redesign** with mobile-first approach and innovative UX patterns. Key strengths include the **"Today" dashboard hub**, **bidirectional review system**, and **server-driven UI architecture**.

---

## 1. Booking Management

### "Today" Tab Hub (2025 Redesign)

**Central Daily Operations Dashboard:**
- Chronological, actionable items
- No context switching between calendar/messages/reservations
- View guest details, add personal notes
- Message entire groups with rich media

**Payment Automation:**
- Payouts within 24 hours of hosting
- Automatic processing
- Clear fee breakdown

**Key Workflow:**
1. Instant booking notifications
2. Guest info access
3. Group chat
4. Automated payouts

**Special Booking Features:**
- Special offers to individual guests (24-hour acceptance window)
- Private group bookings
- Custom date requests
- Single-guest minimums

### Key Insight
The "Today" tab eliminates context switching. Everything a host needs for the day is in one chronological view. Our dashboard should follow this pattern.

---

## 2. Dashboard Features

### 2025 Major Redesign

**Today Tab Features:**
- Daily hosting assistant
- Chronological tasks
- Upcoming check-ins
- Pending messages
- Maintenance reminders
- Personal notes on reservations
- Contextual tips ("ask guests how things are going")
- Toggle current/upcoming views

**Five Focused Tabs:**
1. Today - Daily operations
2. Calendar - Scheduling
3. Listings - Product management
4. Messages - Communication
5. Insights - Analytics

**Mobile-First Design:**
- Complete redesign from ground up
- No laptop needed for full functionality
- Touch-optimized interface

### Analytics Displayed

**Metrics:**
- Occupancy rates
- Nightly/hourly rates
- Earnings (filterable)
- Year-over-year trends
- Seasonal performance
- Comparative analytics vs. nearby competitors

**Time Frames:**
- Last/next week/month/year
- Next 3/6 months
- Custom ranges

**Known Limitation:**
Only 1 year of historical data - major complaint from hosts wanting multi-year trends.

### Key Insight
Five focused tabs reduce cognitive overload. Each tab has single purpose. Our CRM navigation should be similarly focused.

---

## 3. Customer/Guest Management

### Bidirectional Review System

**How It Works:**
- Both hosts AND guests review each other
- 14-day review window from activity completion
- Reviews hidden until both submit (prevents bias)
- Public transparency builds trust

**Six Rating Categories:**
1. Accuracy
2. Communication
3. Cleanliness (less relevant for experiences)
4. Location
5. Check-in ease
6. Value

**Superhost Requirement:**
- Maintain 4.8+ rating
- Fast response times
- Low cancellation rate

### Guest Data Access

- All data through reservation records
- Private host notes for special requests
- Full communication history per booking
- Impact: Single negative review can significantly hurt future bookings

### Key Insight
Bidirectional reviews create accountability. Hidden-until-both-submit prevents retaliation reviews. Our guide-customer review system should follow this.

---

## 4. Experience Management

### Creation & Approval Process

**Free Submission with Human Review:**
- No listing fee
- Airbnb team reviews every submission
- Quality vetting built-in

**Required Sections:**
1. "What We'll Do" - Activity description
2. "About You" - Host qualifications
3. "Settings" - Size, duration, pricing

**Host Requirements:**
- 2+ years experience (5 for chefs without degree)
- ID verification
- Background checks
- Professional portfolio

**Timeline:**
- Few weeks typical
- Longer in high-demand areas

### Progressive Disclosure

**Initial Submission:**
- Description, photos, basic info

**Post-Review Requests:**
- License/insurance (context-specific)
- Additional documentation

**Why It Works:**
- Prevents overwhelming new hosts
- Requests only what's needed
- Reduces abandonment

### Key Insight
Progressive disclosure reduces form abandonment. Don't ask for everything upfront. Request context-specific documents after initial review.

---

## 5. Scheduling/Availability

### Smart Scheduling Constraints

**Time Horizons:**
- Daily experiences: 60 days ahead (rolling window)
- Weekly experiences: 52 weeks ahead

**Why Different Windows:**
- Prevents decision paralysis
- Aligns with actual booking lead times
- Forces regular calendar maintenance

### Calendar Features

- Google Calendar real-time sync
- New daily view with hour-by-hour schedule
- Custom date requests from guests
- Date-specific pricing
- Block dates to avoid cancellations

### Co-Host Scheduling

- Up to 20 co-hosts per experience
- Overlapping instances allowed (not same start time)
- Shared calendar access

### Key Insight
Different time horizons for different patterns (60 days vs 52 weeks) is smart UX. Rolling windows prevent stale availability.

---

## 6. Co-Host Management

### Two-Tier System

**Co-Hosts (up to 20):**
- Lead guests on experiences
- Name/photo/bio appear on listing
- Reviews don't appear on individual profile

**Assistants:**
- Backend support only
- No guest interaction
- Hidden from public listing
- Cannot lead experiences

### Permission Levels

**Full Access Co-Host:**
- Everything except billing
- Update listings
- Manage bookings
- Calendar access
- Add/remove other co-hosts

**Standard Co-Host:**
- Limited messaging (max 3 people)
- Inbox access
- Basic operations

**No Financial Access:**
- Can't see payout info
- Protected sensitive data

### Management Features

- Easy add/remove with confirmation emails
- Self-removal option for co-hosts
- ID verification requirements
- License/certification tracking

### Key Insight
Graduated permission levels protect sensitive data while enabling delegation. Our role system (Owner/Admin/Manager/Support/Guide) aligns well.

---

## 7. Pricing & Promotions

### Discount Types

1. **New Listing Promotion** - 20% off first 3 bookings
2. **Early Bird** - 1-24 months advance booking
3. **Last Minute** - 0-29 days before arrival
4. **Length-of-Stay** - Weekly (7+), Monthly (28+)
5. **Large Group** - Automatic threshold discounts
6. **Custom Promotions** - Build your own % and dates

### Dynamic Pricing

- Customize price by specific date/time
- AI-generated price tips up to 1 year in advance
- **One-tap adoption**: "Adopt all tips in one tap"
- Seasonal adjustments for holidays

### Visibility Benefits

- 10%+ discounts get special search callouts
- Discounted prices shown with crossed-out originals
- May improve search ranking

### Revenue Structure

- Hosts retain **80-85%** of booking fees
- Airbnb takes **15-20%** commission
- Upgrade program: 10% fees through June 2025 (invite-only)

### Key Insight
AI price tips with one-tap adoption reduces decision fatigue. Multiple discount types optimize for different booking behaviors.

---

## 8. Reporting/Analytics

### Native Airbnb Insights

**Availability:**
- Requires 2+ listings (auto-enables at 6+)
- Limited for single-experience hosts

**Core Metrics:**
- Occupancy rate
- Average Daily Rate (ADR)
- RevPAR (Revenue per available period)
- Guest satisfaction
- Total revenue
- Lead time
- Conversion rate
- Average length of stay

**Ratings Breakdown:**
- By category with trend tracking
- Comparative to area average
- Historical trends

**Time Frames:**
- Past year
- Next 6 months
- Year-over-year comparison

### Limitations

- Only 1 year historical data
- Not as advanced as third-party tools
- Limited predictive capabilities
- Airbnb-only data (no cross-channel)

**Third-Party Alternatives:**
- Airbtics
- Rankbreeze
- Hostaway
- Hostfully
- PriceLabs

### Key Insight
1-year data limit is a major pain point. Our CRM should support multi-year analytics from day one.

---

## 9. Communication Tools

### Native Scheduled Messages

**3 Trigger Events:**
1. New booking
2. Check-in
3. Check-out

**Dynamic Placeholders:**
- `{{guest_name}}`
- `{{check_in_date}}`
- `{{house_rules}}`
- `{{experience_name}}`

**Features:**
- Timeline view of full message history
- Time zone aware (sends in listing's timezone)
- Manual override (skip, customize, send early)

### Limitations

- Only 3 triggers
- Single channel (platform messages)
- AI suggestions require manual editing

**Third-Party Tools:**
- Hospitable
- Superhost Tools ($5/month)
- Host Tools
- Hostaway

### Key Insight
3 triggers is too limiting. Our Inngest-based system can support many more triggers: booking created, payment received, 24h reminder, 1h reminder, post-tour follow-up, review request, etc.

---

## 10. Mobile Experience

### 2025 App Redesign

**Complete Rebuild:**
- Most significant improvement in platform history
- Mobile-first design
- No laptop or PMS needed
- Server-driven UI for rapid iteration

**Five Host Tabs:**
1. **Today** - Reservation overview, guest details, notes, tips
2. **Calendar** - Hour-by-hour view, Google sync, quick edits
3. **Listings** - Complete control from phone
4. **Messages** - Group chat, rich media, quick replies
5. **Insights** - Analytics on mobile

### AI Assistant

- Context-aware (recognizes user, reservation, listing)
- Personalized responses
- In-chat actions via interactive cards
- 24/7 availability

### Server-Driven UI ("Ghost Platform")

**Architecture:**
- Backend controls rendering
- Rapid iteration across iOS/Android/web
- Update without app store approval
- Built-in A/B testing

### Key Insight
Server-driven UI enables rapid iteration without app store delays. Consider for our mobile apps. AI assistant in chat is powerful for support scaling.

---

## 11. Notable UX Patterns

### Pattern 1: Daily Operations Hub ("Today")
- Single chronological dashboard
- Combines system data + human notes + contextual tips
- Actionable, not just informational

### Pattern 2: Bidirectional Reviews
- Both parties review each other
- Hidden until both submit or 14 days
- Prevents bias, creates accountability

### Pattern 3: Smart Scheduling Constraints
- Different horizons for different patterns
- Prevents decision paralysis
- Forces regular maintenance

### Pattern 4: Graduated Permissions
- Primary Host → Full Access → Standard → Assistant
- Protects sensitive data
- Enables delegation without risk

### Pattern 5: AI-Suggested Actions
- Price tips, contextual suggestions
- One-tap adoption
- Reduces manual decisions while maintaining control

### Pattern 6: Server-Driven UI
- Backend controls interface
- Cross-platform consistency
- Faster deployment, easier A/B testing

### Pattern 7: Dynamic Placeholders
- Templates auto-fill personalized data
- Personalization at scale
- Reduces errors

### Pattern 8: Visibility Incentives
- Fast response times = better placement
- Discounts = better placement
- High ratings = better placement
- Aligns host incentives with guest experience

### Pattern 9: Progressive Disclosure
- Don't ask for everything upfront
- Request docs after initial review
- Reduces abandonment

### Pattern 10: Multi-Tier Discounts
- Different types for different behaviors
- New listing, early bird, last minute, group
- Optimizes for different business goals

---

## 12. Recommendations for Our CRM

### Immediate (Phase 4 - Pricing)

**Implement Discount Playbook:**
- Early bird (2+ weeks advance)
- Last minute (< 7 days)
- Group size thresholds
- First booking promotion for new tours

**AI Price Tips:**
- Use historical demand + seasonality
- One-tap adoption for suggestions

**Visibility Callouts:**
- Show discount badges in customer views
- Crossed-out original prices

### Quick Wins

1. **"Today" Dashboard Per Role:**
   - Owner: Revenue, upcoming tours, issues
   - Manager: Today's schedules, assignments, inquiries
   - Guide: My assignments, participant count, requests
   - Support: Pending messages, modifications

2. **Bidirectional Reviews:**
   - Guides ↔ customers
   - Hidden until both submit

3. **Smart Scheduling:**
   - Rolling 60-90 day window for recurring tours

4. **Message Templates:**
   - Dynamic placeholders
   - `{{customer_name}}`, `{{tour_name}}`, `{{schedule_date}}`

### Medium-Term (Phase 5-6)

1. Multi-tier permissions validation
2. AI-suggested actions (pricing, availability, timing)
3. Google Calendar sync
4. Mobile-first guide portal (PWA)

### Long-Term (Phase 7+ Web)

1. Server-driven UI consideration
2. Guest social features (connect before tour)
3. Quality-based search ranking

---

## What NOT to Copy

| Pattern | Why Not |
|---------|---------|
| 1-year analytics limit | Major complaint - build multi-year from start |
| Only 3 message triggers | Too limited - build robust custom triggers |
| Waitlist for new experiences | Artificial scarcity - allow all qualified |
| Manual review for every listing | Consider automated validation + spot-check |

---

## Competitive Comparison

| Feature | Airbnb Experiences | Our CRM |
|---------|-------------------|---------|
| **Commission** | 15-20% | 0% (SaaS) |
| **Guide Management** | Co-host system | Native guides |
| **Mobile App** | Excellent (2025) | Guide portal (web) |
| **Analytics History** | 1 year only | Multi-year |
| **Message Triggers** | 3 only | Unlimited (Inngest) |
| **Review System** | Bidirectional | To implement |
| **AI Assistance** | Chat assistant | To consider |
| **Pricing AI** | Price tips | To implement |

---

## Key Strengths (Learn From)

| Feature | Application |
|---------|-------------|
| "Today" dashboard | Daily operations hub |
| Bidirectional reviews | Guide-customer accountability |
| Server-driven UI | Rapid mobile iteration |
| AI price tips | Smart pricing suggestions |
| Graduated permissions | Role-based access |
| Progressive disclosure | Reduce form abandonment |
| Smart constraints | Prevent decision paralysis |

## Weaknesses (Our Opportunities)

| Gap | Our Advantage |
|-----|---------------|
| 1-year data limit | Multi-year analytics |
| Limited triggers | Robust automation |
| Manual listing review | Automated validation |
| High commission | Flat SaaS pricing |
| No direct booking | White-label site |
| Platform dependency | Own customer relationship |

---

## Sources

- Airbnb 2025 Summer Release announcement
- Airbnb Host Dashboard tutorials
- Airbnb Co-hosting documentation
- Airbnb Pricing & Discounts guides
- Airbnb Analytics documentation
- Airbnb Engineering blog (Server-driven UI)
- Third-party host tool comparisons
- Host community forums and reviews
