# Booking System Implementation Sprint

**Status:** Active
**Priority:** Critical (Core CRM Feature)
**Planned Duration:** Sprint Focus

---

## Executive Summary

Replace the current simple booking flow with a **customer-first booking system** where:
1. Customer inputs WHO (guests) + WHEN (date)
2. System shows ALL options with pre-calculated prices for THEIR group
3. Customer picks best option → add-ons → checkout

This transforms booking from "configure then see price" to "see all prices then pick".

---

## Current State Analysis

### What Exists
```
bookings              → Customer reservations (simple participant counts)
schedules             → Time slots with single capacity (bookedCount)
tours                 → Products with single basePrice
tourPricingTiers      → Adult/Child/Senior tiers (per-tour)
tourVariants          → Morning/Evening variants (partial)
addOnProducts         → Global add-on catalog
tourAddOns            → Which add-ons apply to which tours
bookingAddOns         → Add-ons purchased per booking
```

### What We Need
```
booking_options              → NEW: Defines how a tour can be booked (shared, private, VIP)
schedule_option_availability → NEW: Per-option availability tracking
waitlist_entries             → NEW: Waitlist support
bookings.booking_option_id   → MODIFY: Reference to selected option
```

### Key Insight
The current system assumes ONE way to book each tour. The new system supports MANY ways (options) to book the same tour, each with different pricing/capacity models.

---

## Epic 1: Database Schema
**Goal:** Create all new tables and modify existing ones

### Story 1.1: Create booking_options table
**Acceptance Criteria:**
- [ ] Table created with all fields from BOOKING_SYSTEM.md
- [ ] JSONB columns for pricingModel and capacityModel
- [ ] Proper indexes and constraints
- [ ] organizationId for multi-tenant isolation
- [ ] TypeScript types exported

**Technical Notes:**
- Use discriminated union types for pricing models
- Create Zod schemas for JSONB validation
- Relations to tours table

### Story 1.2: Create schedule_option_availability table
**Acceptance Criteria:**
- [ ] Tracks per-option availability for each schedule
- [ ] Supports both shared (seats) and unit (vehicles) capacity
- [ ] Unique constraint on (scheduleId, bookingOptionId)

**Technical Notes:**
- Replaces simple bookedCount on schedules
- Needs to be populated when schedules are created

### Story 1.3: Modify bookings table
**Acceptance Criteria:**
- [ ] Add bookingOptionId column (nullable for migration)
- [ ] Add guestAdults, guestChildren, guestInfants
- [ ] Add unitsBooked, pricingSnapshot (JSONB)
- [ ] Index on bookingOptionId

### Story 1.4: Create waitlist_entries table
**Acceptance Criteria:**
- [ ] Customer can join waitlist for sold-out schedules
- [ ] Tracks guest breakdown
- [ ] Status workflow: waiting → notified → converted/expired

### Story 1.5: Modify tour_add_ons for new pricing
**Acceptance Criteria:**
- [ ] pricing_structure as JSONB (supports per_person, per_booking, etc.)
- [ ] applicable_options array (which booking options this applies to)
- [ ] includes dependencies and exclusions

---

## Epic 2: Core Services
**Goal:** Build the calculation and availability engine

### Story 2.1: Create PricingCalculatorService
**Location:** `packages/services/src/pricing-calculator-service.ts`

**Acceptance Criteria:**
- [ ] calculatePerPerson(pricing, guests) → Money
- [ ] calculatePerUnit(pricing, guests) → { total, unitsNeeded, breakdown }
- [ ] calculateFlatRate(pricing, guests) → Money | null
- [ ] calculateTieredGroup(pricing, guests) → Money | null
- [ ] calculateBasePlusPerson(pricing, guests) → Money
- [ ] calculateAddOnPrice(addOn, guests, units) → Money
- [ ] All functions handle currency properly (amounts in cents)

**Test Cases:**
- 2 adults + 1 child on per_person → correct total
- 6 guests on per_unit (max 4) → 2 units needed
- Group of 8 on tiered_group → correct tier selected
- Add-on per_person × 3 guests → 3× price

### Story 2.2: Create BookingOptionService
**Location:** `packages/services/src/booking-option-service.ts`

**Acceptance Criteria:**
- [ ] CRUD operations for booking options
- [ ] Duplicate option (useful for creating variants)
- [ ] Set default option for tour
- [ ] Bulk reorder options
- [ ] Validate pricing/capacity model JSON

**Methods:**
```typescript
getByTourId(tourId: string): Promise<BookingOption[]>
create(input: CreateBookingOptionInput): Promise<BookingOption>
update(id: string, input: UpdateBookingOptionInput): Promise<BookingOption>
delete(id: string): Promise<void>
duplicate(id: string, newName: string): Promise<BookingOption>
setDefault(tourId: string, optionId: string): Promise<void>
reorder(tourId: string, orderedIds: string[]): Promise<void>
```

### Story 2.3: Create AvailabilityService (THE CORE)
**Location:** `packages/services/src/availability-service.ts`

**Acceptance Criteria:**
- [ ] checkAvailability(tourId, date, guests) → CalculatedOption[]
- [ ] Filters out options that don't fit guest count
- [ ] Calculates price for each option using PricingCalculatorService
- [ ] Generates smart recommendations (BEST_VALUE, etc.)
- [ ] Returns scheduling info (time slots for fixed, range for flexible)
- [ ] Includes urgency messages ("Only 2 spots left!")

**Response Shape:**
```typescript
interface CheckAvailabilityResponse {
  tour: { id, name, imageUrl }
  date: string
  guests: { adults, children, infants, total }
  options: CalculatedOption[]
  soldOut: boolean
  alternatives?: {
    nearbyDates?: Array<{ date, availability }>
    waitlistAvailable?: boolean
  }
}
```

### Story 2.4: Create RecommendationEngine
**Location:** `packages/services/src/recommendation-engine.ts`

**Acceptance Criteria:**
- [ ] generateRecommendations(options, guests) → Recommendation[]
- [ ] BEST_VALUE: Private <25% more than shared
- [ ] SAVE_MONEY: Private cheaper than shared (large groups)
- [ ] BEST_FOR_FAMILIES: When children present + fits in one unit
- [ ] PERFECT_FIT: Group fills 75%+ of unit capacity

### Story 2.5: Create AddOnCalculationService
**Location:** Extend existing or create new

**Acceptance Criteria:**
- [ ] getCalculatedAddOns(tourId, optionId, guests, units)
- [ ] Filters by applicable_options
- [ ] Calculates price based on pricing_structure
- [ ] Checks inventory if hasInventory
- [ ] Marks isIncluded if auto-included in option

### Story 2.6: Create WaitlistService
**Location:** `packages/services/src/waitlist-service.ts`

**Acceptance Criteria:**
- [ ] join(scheduleId, optionId?, email, guests)
- [ ] notify(scheduleId) - when spots open up
- [ ] convert(waitlistId, bookingId)
- [ ] expire(waitlistId)

---

## Epic 3: tRPC API Layer
**Goal:** Expose services via tRPC routers

### Story 3.1: Create availability router
**Location:** `apps/crm/src/server/routers/availability.ts`

**Endpoints:**
```typescript
availability.checkAvailability     // Main query - returns calculated options
availability.getAddOns             // Add-ons for selected option
availability.joinWaitlist          // Mutation
availability.getWaitlist           // Admin: view waitlist
```

### Story 3.2: Create booking-options router
**Location:** `apps/crm/src/server/routers/booking-options.ts`

**Endpoints:**
```typescript
bookingOptions.getByTour           // List options for tour
bookingOptions.getById             // Single option
bookingOptions.create              // Admin
bookingOptions.update              // Admin
bookingOptions.delete              // Admin
bookingOptions.duplicate           // Admin
bookingOptions.setDefault          // Admin
bookingOptions.reorder             // Admin
```

### Story 3.3: Modify booking router
**Location:** `apps/crm/src/server/routers/booking.ts`

**Changes:**
- [ ] Update create to accept bookingOptionId
- [ ] Update create to store guest breakdown
- [ ] Update create to store pricing snapshot
- [ ] Add validation: option must be valid for schedule
- [ ] Update capacity tracking to use schedule_option_availability

---

## Epic 4: CRM UI
**Goal:** Build the operator and booking interfaces

### Story 4.1: Tour Options Panel
**Location:** Tour detail page

**Components:**
- [ ] OptionsList: Draggable list of options
- [ ] OptionCard: Displays option with pricing model summary
- [ ] OptionEditorDialog: Create/edit option
- [ ] PricingModelEditor: Visual editor for each pricing type
- [ ] CapacityModelEditor: Shared vs Unit capacity

**UI Patterns:**
- Drag to reorder
- Badge for default option
- Quick actions: Edit, Duplicate, Delete
- Pricing summary shown inline

### Story 4.2: Customer-First Booking Form
**Location:** `/bookings/new` and `/schedules/[id]/book`

**Steps:**
1. Tour selection (if not pre-selected)
2. Date picker
3. Guest counter (Adults, Children, Infants)
4. [Check Availability] button
5. Options list with calculated prices
6. Time slot selection (if applicable)
7. Add-ons selection
8. Customer selection/creation
9. Summary & Create

**Components:**
- [ ] GuestCounterInput
- [ ] AvailabilityResults
- [ ] CalculatedOptionCard
- [ ] TimeSlotSelector
- [ ] AddOnSelector
- [ ] BookingSummary

### Story 4.3: Booking Detail Enhancement
**Location:** `/bookings/[id]`

**Changes:**
- [ ] Show selected option name
- [ ] Show guest breakdown
- [ ] Show pricing breakdown
- [ ] Show add-ons with calculated prices
- [ ] Allow changing option (if allowed by policy)

---

## Epic 5: Integration & Migration
**Goal:** Safely transition existing data

### Story 5.1: Create migration strategy
**Acceptance Criteria:**
- [ ] Document backward compatibility approach
- [ ] Existing bookings work without bookingOptionId
- [ ] Tours without options use "legacy mode"

### Story 5.2: Auto-create default options
**Acceptance Criteria:**
- [ ] Script to create "Shared" option for existing tours
- [ ] Uses existing tourPricingTiers for pricing
- [ ] Sets as default option
- [ ] Idempotent (can run multiple times)

### Story 5.3: Update capacity tracking
**Acceptance Criteria:**
- [ ] Script to migrate bookedCount to schedule_option_availability
- [ ] Handle schedules with bookings already

### Story 5.4: End-to-end testing
**Acceptance Criteria:**
- [ ] Test: Create tour with multiple options
- [ ] Test: Check availability for various group sizes
- [ ] Test: Create booking via new flow
- [ ] Test: Verify capacity decremented correctly
- [ ] Test: Cancel booking releases capacity
- [ ] Test: Reschedule moves capacity

---

## Implementation Order

```
Week 1: Schema + Core Services
├── Day 1-2: Epic 1 (Database Schema)
│   ├── Story 1.1: booking_options
│   ├── Story 1.2: schedule_option_availability
│   ├── Story 1.3: modify bookings
│   └── Push schema, verify
│
├── Day 3-4: Epic 2 Part 1 (Calculation)
│   ├── Story 2.1: PricingCalculatorService
│   ├── Story 2.4: RecommendationEngine
│   └── Unit tests
│
└── Day 5: Epic 2 Part 2 (Core)
    ├── Story 2.2: BookingOptionService
    ├── Story 2.3: AvailabilityService
    └── Integration tests

Week 2: API + UI
├── Day 1-2: Epic 3 (API)
│   ├── Story 3.1: availability router
│   ├── Story 3.2: booking-options router
│   └── Story 3.3: modify booking router
│
├── Day 3-4: Epic 4 Part 1 (Admin UI)
│   └── Story 4.1: Tour Options Panel
│
└── Day 5: Epic 4 Part 2 (Booking UI)
    └── Story 4.2: Customer-First Booking Form

Week 3: Polish + Migration
├── Day 1-2: Epic 5 (Migration)
│   ├── Story 5.1: migration strategy
│   ├── Story 5.2: auto-create options
│   └── Story 5.3: capacity migration
│
├── Day 3-4: Epic 4 Part 3
│   ├── Story 4.3: Booking Detail Enhancement
│   └── Story 2.5: AddOnCalculationService
│
└── Day 5: Epic 5 Final
    └── Story 5.4: End-to-end testing
```

---

## Technical Decisions

### 1. JSONB vs Relational for Pricing Models
**Decision:** JSONB
**Rationale:**
- Pricing models are complex discriminated unions
- Reading entire model is the common operation
- Schema flexibility for future models
- TypeScript types provide compile-time safety
- Zod validates at runtime

### 2. Capacity Tracking Approach
**Decision:** Separate table (schedule_option_availability)
**Rationale:**
- Each option on a schedule can have different capacity
- Shared options pool seats; unit options track units
- Clear separation of concerns
- Easier to query remaining capacity

### 3. Backward Compatibility
**Decision:** Optional bookingOptionId + legacy fallback
**Rationale:**
- Existing bookings continue to work
- Tours without options use tour-level pricing
- Gradual migration possible
- No big-bang cutover risk

### 4. Pricing Snapshot Strategy
**Decision:** Store full snapshot at booking time
**Rationale:**
- Price changes don't affect historical bookings
- Audit trail for disputes
- Enables "what was sold" vs "what exists now" comparison

---

## Files to Create/Modify

### New Files
```
packages/database/src/schema/booking-options.ts
packages/services/src/pricing-calculator-service.ts
packages/services/src/booking-option-service.ts
packages/services/src/availability-service.ts
packages/services/src/recommendation-engine.ts
packages/services/src/waitlist-service.ts
packages/validators/src/booking-option.ts
apps/crm/src/server/routers/availability.ts
apps/crm/src/server/routers/booking-options.ts
apps/crm/src/components/booking-options/
apps/crm/src/components/booking-form/
```

### Modified Files
```
packages/database/src/schema/bookings.ts
packages/database/src/schema/add-ons.ts
packages/database/src/schema/index.ts
packages/services/src/booking-service.ts
packages/services/src/index.ts
apps/crm/src/server/routers/booking.ts
apps/crm/src/server/routers/index.ts
```

---

## Success Metrics

1. **Functional:** All 5 pricing models work correctly
2. **Performance:** checkAvailability < 200ms p95
3. **UX:** Booking flow takes <60 seconds
4. **Data:** Zero data loss during migration
5. **Coverage:** Core services have 80%+ test coverage

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Complex JSONB validation | Zod schemas with strict typing |
| Capacity race conditions | Use transactions with atomic checks |
| UI complexity | Phased rollout, start with simple options |
| Migration issues | Backward compatibility, rollback plan |
| Performance degradation | Add indexes, cache frequently accessed data |

---

*Sprint owned by development team. Updated December 2025.*
