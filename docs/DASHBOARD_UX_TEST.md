# Dashboard UI/UX Test Plan

## Objective
Test the daily operator workflow from a user perspective to identify friction points, bugs, and UX improvements.

---

## Test Scenarios

### 1. Morning Dashboard Review
**Goal:** Operator opens dashboard to see today's status at a glance
- [x] Dashboard loads quickly (<2s)
- [x] Key metrics visible without scrolling
- [x] Today's tours prominently displayed
- [x] Action items (needs guide, pending payments) clearly visible
- [x] Visual hierarchy guides the eye correctly

### 2. Guide Assignment Flow
**Goal:** Quickly assign guides to tours that need them
- [x] "Needs Guide" panel is visible and prominent
- [x] Can identify which tours need guides immediately
- [x] QuickGuideAssign button is discoverable
- [x] Popover opens in correct position (not cut off)
- [x] Team vs External tabs are clear
- [x] Guide list shows availability status
- [x] One-click assignment works
- [x] Feedback after assignment is clear
- [x] UI updates immediately after assignment

### 3. Calendar Navigation
**Goal:** View and manage upcoming schedule
- [x] Calendar loads without delay
- [x] Month/Week/Day views work correctly
- [x] Can see tour capacity at a glance
- [x] Tours needing guides are highlighted
- [x] Can quick-assign from calendar view
- [x] Clicking a day shows schedule details

### 4. Quick Booking Flow
**Goal:** Create a booking for a walk-in customer
- [x] Quick book button is accessible
- [x] Can select tour and time slot quickly
- [x] Customer search/create is smooth
- [x] Participant count selection is intuitive
- [x] Price calculation is visible
- [x] Confirmation is clear

### 5. Schedule Detail View
**Goal:** View full details of a specific schedule
- [x] Can navigate to schedule from dashboard/calendar
- [x] Capacity bar is clear
- [x] Guide assignment widget works
- [x] Booking list is accessible (with empty state)
- [x] Can add booking from this view
- [x] Manifest tab with Print/Email options

### 6. Mobile/Responsive Check
**Goal:** Verify dashboard works on smaller screens
- [ ] Elements don't overflow
- [ ] Touch targets are adequate
- [ ] Popovers don't go off-screen
- [ ] Navigation is accessible

---

## Test Execution Log

### Date: December 22, 2025

#### Bugs Found & Fixed

**1. 500 Error on getAvailableForTime Query**
- **File:** `packages/services/src/guide-service.ts:269-308`
- **Issue:** PostgreSQL OVERLAPS syntax wasn't properly serialized by Drizzle ORM
- **Fix:** Replaced OVERLAPS with standard comparison operators (lte, gte)
```typescript
// Before (broken):
sql`(${schedules.startsAt}, ${schedules.endsAt}) OVERLAPS (${startsAt}, ${endsAt})`

// After (fixed):
lte(schedules.startsAt, endsAt),
gte(schedules.endsAt, startsAt),
```

**2. Duplicate Customer Error in Quick Booking**
- **File:** `apps/crm/src/components/bookings/customer-first-booking-sheet.tsx`
- **Issue:** When creating booking with existing email, 500 error killed the flow
- **Fix:** Catch "already exists" error, find existing customer, use their ID instead
- Shows info toast: "Using existing customer: [name]"

**3. Inngest API Error Blocking Booking Creation**
- **File:** `apps/crm/src/server/routers/booking.ts`
- **Issue:** `await inngest.send()` failed with 401 when Inngest not configured, crashing entire mutation
- **Fix:** Wrapped inngest.send in try-catch so failures don't break booking creation
- Booking succeeds, email notification fails silently with console.error log

#### Data Quality Issue (Not a Code Bug)
- Multiple guide records with same names (6x Michael Chen, 6x Sarah Johnson)
- This is seed data duplication, not a code bug
- Consider deduplicating seed data

#### UI/UX Observations

**Positive:**
- Dashboard provides excellent at-a-glance overview
- "Needs Guide" panel is immediately actionable
- QuickGuideAssign widget is consistent across all views (dashboard, calendar, schedule detail)
- Calendar Week view is clean and functional
- Quick Booking flow is streamlined (3-4 clicks to book)
- Schedule Detail page has comprehensive Manifest with Print/Email options
- Position-aware popovers prevent cutoff issues

**Accessibility Warnings (Non-Critical):**
- Multiple "Icon-only buttons should have aria-label" warnings in console
- Consider adding aria-labels to icon buttons for screen reader support

#### Test Coverage Summary
- Morning Dashboard Review: PASS
- Guide Assignment Flow: PASS (after fixes)
- Calendar Navigation: PASS
- Quick Booking Flow: PASS (after fixes)
- Schedule Detail View: PASS
- Mobile/Responsive: NOT TESTED

---

## Recommendations

1. **Clean up seed data** - Remove duplicate guide records
2. **Add aria-labels** - Improve accessibility for icon-only buttons
3. **Test mobile** - Verify responsive behavior on smaller screens
4. **Configure Inngest** - Set up proper Inngest API keys for production
