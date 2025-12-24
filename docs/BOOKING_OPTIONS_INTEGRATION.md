# Booking Options Integration Plan

> **Objective**: Make pricing tiers/booking options a first-class citizen throughout the entire CRM, from tour creation to booking completion to reporting.

## Current State Analysis

### What Exists
| Component | Status | Location |
|-----------|--------|----------|
| Schema | ✅ Complete | `packages/database/src/schema/booking-options.ts` |
| Service Layer | ✅ Complete | `packages/services/src/booking-option-service.ts` |
| tRPC Router | ✅ Complete | `apps/crm/src/server/routers/booking-options.ts` |
| Pricing Calculator | ✅ Complete | `packages/services/src/pricing-calculator-service.ts` |
| Options Management UI | ✅ Complete | `apps/crm/src/components/tours/tour-booking-options-tab.tsx` |
| Availability Service | ⚠️ Partial | Has legacy fallback, designed for options |
| Database Tables | ❌ Missing | `booking_options`, `schedule_option_availability` not pushed |

### Critical Gaps
1. **Tour Creation**: No prompt to set up pricing tiers after creating tour
2. **Tour Edit**: Booking options tab buried/not prominent
3. **Schedule Creation**: No visible link to available options
4. **Booking Flow**: Uses legacy fallback instead of configured options
5. **Booking Display**: Doesn't show selected option details
6. **Reports**: No option-based analytics

---

## Integration Plan

### Epic 1: Database & Foundation
**Priority: P0 - Blocker**

| ID | Task | Effort |
|----|------|--------|
| DB-1 | Push `booking_options` table to database | S |
| DB-2 | Push `schedule_option_availability` table | S |
| DB-3 | Push `waitlist_entries` table | S |
| DB-4 | Add migration for existing tours → create default "Standard" option | M |

**Acceptance Criteria:**
- All booking option tables exist in production database
- Existing tours have at least one default booking option
- Legacy bookings continue to work (nullable `bookingOptionId`)

---

### Epic 2: Tour Creation Flow
**Priority: P0 - Critical Path**

| ID | Task | Effort |
|----|------|--------|
| TC-1 | Add "Pricing Setup" step to tour creation wizard | L |
| TC-2 | Create "Quick Pricing" component (simple per-person setup) | M |
| TC-3 | Add "Advanced Options" toggle for complex pricing models | M |
| TC-4 | Auto-create default option from tour's `basePrice` if skipped | S |
| TC-5 | Show pricing preview with sample guest counts | S |

**User Flow:**
```
Create Tour → Basic Info → Images → [NEW] Pricing Setup → Policies → Publish
                                         │
                                         ├─ Quick: Single price tier
                                         │   └─ Adult/Child/Infant prices
                                         │
                                         └─ Advanced: Multiple tiers
                                             ├─ Standard Experience
                                             ├─ Premium Experience
                                             └─ Private Charter
```

**UI Mockup - Quick Pricing:**
```
┌─────────────────────────────────────────────────────────────┐
│  💰 Pricing Setup                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How do you want to price this tour?                        │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 👤 Per Person   │  │ 🚐 Per Vehicle  │                  │
│  │    (selected)   │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Adults (13+)     $[  89.00  ]                      │   │
│  │  Children (3-12)  $[  45.00  ]  ☑ Free under 3     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Preview: 2 adults + 1 child = $223.00                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ▸ Add premium tier or private option                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Epic 3: Tour Edit Page Redesign
**Priority: P1 - High**

| ID | Task | Effort |
|----|------|--------|
| TE-1 | Promote "Pricing" to primary tab (next to Details) | S |
| TE-2 | Show pricing summary card on tour overview | M |
| TE-3 | Add inline option creation from empty state | S |
| TE-4 | Show option usage stats (bookings per option) | M |
| TE-5 | Add "Test Pricing" calculator in sidebar | S |

**Tab Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Golden Gate Bridge Walking Tour                            │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Overview │ Pricing  │ Schedule │ Bookings │ Settings       │
│          │ ●        │          │          │                │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

**Pricing Tab Layout:**
```
┌─────────────────────────────────────────┬───────────────────┐
│  Pricing Tiers                    [+]   │  Test Calculator  │
├─────────────────────────────────────────┤                   │
│                                         │  Adults:  [2]     │
│  ┌─ Standard Experience ─────────────┐  │  Children:[1]     │
│  │  👤 Per Person                    │  │  Infants: [0]     │
│  │  $89 adult · $45 child           │  │                   │
│  │  ⭐ DEFAULT                       │  │  ───────────────  │
│  │  156 bookings this month         │  │  Standard: $223   │
│  └───────────────────────────────────┘  │  Premium:  $356   │
│                                         │  Private:  $450   │
│  ┌─ Premium Experience ──────────────┐  │                   │
│  │  👤 Per Person + Extras          │  │                   │
│  │  $129 adult · $65 child          │  │                   │
│  │  🏷️ BEST VALUE                   │  │                   │
│  │  42 bookings this month          │  │                   │
│  └───────────────────────────────────┘  │                   │
│                                         │                   │
│  ┌─ Private Charter ─────────────────┐  │                   │
│  │  💰 Flat Rate                     │  │                   │
│  │  $450 for up to 8 guests         │  │                   │
│  │  12 bookings this month          │  │                   │
│  └───────────────────────────────────┘  │                   │
│                                         │                   │
└─────────────────────────────────────────┴───────────────────┘
```

---

### Epic 4: Customer-First Booking Flow
**Priority: P0 - Critical Path**

| ID | Task | Effort |
|----|------|--------|
| BF-1 | Remove legacy fallback, require booking options | M |
| BF-2 | Show actual configured options in "Choose Experience" | S |
| BF-3 | Display option badges (BEST_VALUE, RECOMMENDED) | S |
| BF-4 | Show capacity warnings ("Only 3 spots left") | S |
| BF-5 | Handle sold-out options gracefully | S |
| BF-6 | Add "Compare Options" side-by-side view | M |
| BF-7 | Populate `bookingOptionId` on booking creation | S |
| BF-8 | Store pricing snapshot with full option details | S |

**Choose Experience UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Choose Your Experience                                     │
│  Golden Gate Bridge Walking Tour · Dec 22 · 2 adults        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⭐ Standard Experience                              │   │
│  │                                                      │   │
│  │  A scenic walk across the Golden Gate Bridge with    │   │
│  │  expert commentary on history and architecture.      │   │
│  │                                                      │   │
│  │  ✓ Professional guide    ✓ 2-hour duration          │   │
│  │  ✓ Small group (max 15)  ✓ Photo opportunities      │   │
│  │                                                      │   │
│  │  2 × $89.00                                 $178.00  │   │
│  │                                                      │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │   │
│  │  │ 9 AM │ │10 AM │ │ 2 PM │ │ 4 PM │              │   │
│  │  │  ✓   │ │  ✓   │ │ 3 ⚠️ │ │  ✓   │              │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏷️ BEST VALUE · Premium Experience                 │   │
│  │                                                      │   │
│  │  Everything in Standard plus champagne toast,        │   │
│  │  professional photos, and exclusive viewpoint access.│   │
│  │                                                      │   │
│  │  2 × $129.00                                $258.00  │   │
│  │                                                      │   │
│  │  ┌──────┐ ┌──────┐                                  │   │
│  │  │10 AM │ │ 2 PM │  Limited availability            │   │
│  │  │  ✓   │ │ SOLD │                                  │   │
│  │  └──────┘ └──────┘                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔒 Private Charter                                  │   │
│  │                                                      │   │
│  │  Exclusive tour for your group only. Choose your     │   │
│  │  own start time and customize the experience.        │   │
│  │                                                      │   │
│  │  Flat rate for up to 8 guests              $450.00  │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Request preferred time: [___________] [Request]│ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Epic 5: Booking Details & Display
**Priority: P1 - High**

| ID | Task | Effort |
|----|------|--------|
| BD-1 | Show selected option in booking details sidebar | S |
| BD-2 | Display price breakdown from snapshot | S |
| BD-3 | Show option badge (PREMIUM, PRIVATE, etc.) | S |
| BD-4 | Add option to booking list table | S |
| BD-5 | Include option in booking confirmation email | S |
| BD-6 | Show option in manifest view | S |

**Booking Details Panel:**
```
┌─────────────────────────────────────────┐
│  Booking #BK-2024-1234                  │
├─────────────────────────────────────────┤
│                                         │
│  Customer                               │
│  John Smith · john@email.com            │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Experience                             │
│  ┌─────────────────────────────────┐   │
│  │ 🏷️ Premium Experience           │   │
│  │ Golden Gate Bridge Walking Tour │   │
│  │ Dec 22, 2024 · 10:00 AM        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Guests                                 │
│  2 adults · 1 child                     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Pricing                                │
│  2 × $129.00 (adult)          $258.00  │
│  1 × $65.00 (child)            $65.00  │
│                               ─────────│
│  Subtotal                     $323.00  │
│  Tax (8.5%)                    $27.46  │
│                               ─────────│
│  Total                        $350.46  │
│                                         │
│  ✓ Paid in full                        │
│                                         │
└─────────────────────────────────────────┘
```

---

### Epic 6: Schedule Integration
**Priority: P1 - High**

| ID | Task | Effort |
|----|------|--------|
| SC-1 | Show available options when creating schedule | M |
| SC-2 | Allow per-schedule option overrides (enable/disable) | M |
| SC-3 | Display option availability on calendar | S |
| SC-4 | Show option breakdown in schedule details | S |
| SC-5 | Auto-initialize `schedule_option_availability` on create | S |

**Schedule Creation:**
```
┌─────────────────────────────────────────────────────────────┐
│  Create Schedule                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tour: [Golden Gate Bridge Walking Tour    ▼]              │
│                                                             │
│  Date: [December 22, 2024]  Time: [10:00 AM]               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Available Options for this Schedule                        │
│                                                             │
│  ☑ Standard Experience      15 spots                       │
│  ☑ Premium Experience        8 spots                       │
│  ☐ Private Charter          (disabled for group schedules) │
│                                                             │
│  Total Capacity: 23 guests                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Epic 7: Analytics & Reporting
**Priority: P2 - Enhancement**

| ID | Task | Effort |
|----|------|--------|
| AN-1 | Add option breakdown to revenue dashboard | M |
| AN-2 | Show conversion rates by option | M |
| AN-3 | Track option popularity trends | M |
| AN-4 | A/B test option pricing | L |
| AN-5 | Export option performance reports | S |

**Revenue by Option:**
```
┌─────────────────────────────────────────────────────────────┐
│  Revenue by Experience Type                    This Month   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Standard Experience                                        │
│  ████████████████████████████████████░░░░  $12,450  (62%)  │
│  156 bookings                                               │
│                                                             │
│  Premium Experience                                         │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░   $5,418  (27%)   │
│  42 bookings                                                │
│                                                             │
│  Private Charter                                            │
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   $2,250  (11%)   │
│  5 bookings                                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Total                                        $20,118       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase A: Foundation (Week 1)
- [ ] DB-1, DB-2, DB-3: Push all booking option tables
- [ ] DB-4: Migration to create default options for existing tours
- [ ] BF-1: Remove legacy fallback (use real options)
- [ ] BF-7, BF-8: Populate bookingOptionId and pricing snapshot

### Phase B: Tour Setup (Week 2)
- [ ] TC-1, TC-2: Add pricing step to tour creation
- [ ] TC-4: Auto-create default if skipped
- [ ] TE-1, TE-2: Promote pricing tab, add summary card

### Phase C: Booking Flow (Week 3)
- [ ] BF-2, BF-3, BF-4, BF-5: Full option display in booking flow
- [ ] BD-1, BD-2, BD-3: Show option in booking details
- [ ] BD-4: Add to booking list table

### Phase D: Schedule & Polish (Week 4)
- [ ] SC-1, SC-5: Schedule-option integration
- [ ] BD-5, BD-6: Email and manifest integration
- [ ] TE-3, TE-4, TE-5: Tour edit enhancements

### Phase E: Analytics (Week 5+)
- [ ] AN-1, AN-2, AN-3: Dashboard integration
- [ ] AN-5: Export functionality

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Tours with configured options | 100% (vs current ~0%) |
| Bookings with `bookingOptionId` | 100% of new bookings |
| Premium option adoption | Track upsell rate |
| Time to first booking option | < 2 min during tour setup |
| Option-based revenue visibility | Full breakdown in dashboard |

---

## Technical Notes

### Database Migration Strategy
```sql
-- Create default option for each existing tour
INSERT INTO booking_options (id, organization_id, tour_id, name, pricing_model, capacity_model, is_default, status)
SELECT
  generate_id(),
  organization_id,
  id,
  'Standard Experience',
  jsonb_build_object(
    'type', 'per_person',
    'tiers', jsonb_build_array(
      jsonb_build_object('type', 'adult', 'price', jsonb_build_object('amount', (base_price::numeric * 100)::int, 'currency', 'USD'))
    )
  ),
  jsonb_build_object('type', 'shared', 'totalSeats', COALESCE(max_participants, 30)),
  true,
  'active'
FROM tours
WHERE NOT EXISTS (
  SELECT 1 FROM booking_options bo WHERE bo.tour_id = tours.id
);
```

### Backward Compatibility
- `bookingOptionId` remains nullable for legacy bookings
- Legacy bookings display using `pricingSnapshot` or calculated from `total`
- API continues to work without options (auto-creates default)

### Performance Considerations
- Index `booking_options(tour_id, status)` for fast lookups
- Cache calculated prices in Redis for high-traffic tours
- Batch `schedule_option_availability` updates

---

## Open Questions

1. **Waitlist**: Should waitlist be per-option or per-schedule?
2. **Seasonal Pricing**: How do seasons interact with options?
3. **Promo Codes**: Apply to specific options only?
4. **Add-ons**: Bundled with options or separate selection?

---

*Last Updated: December 22, 2024*
