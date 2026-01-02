# Navigation & User Flow UI/UX Test Plan

## Objective
Test all page navigation links and user flows from a daily tour operator perspective to ensure users can reach their destinations and complete intended actions seamlessly.

---

## Test Methodology
1. Start from each main navigation entry point
2. Test all clickable links that lead to other pages
3. Verify user can complete common workflows end-to-end
4. Check for dead ends, broken links, and confusing navigation
5. Validate breadcrumbs, back buttons, and contextual navigation

---

## Navigation Structure

### Primary Navigation (Sidebar)
1. Dashboard (Home)
2. Calendar
3. Bookings
4. Tours
5. Customers
6. Guides
7. Analytics
8. Settings

### Secondary Navigation (Within Pages)
- Sub-tabs within pages
- Action buttons leading to forms/detail pages
- Table row clicks leading to detail pages
- Breadcrumbs for navigation context

---

## Test Scenarios

### 1. Dashboard Navigation Flows
**Goal:** All dashboard links lead to correct destinations
- [x] "View full calendar" link → Calendar page
- [x] "Needs Guide" tour cards → Schedule detail or calendar
- [x] Quick Book button → Booking flow
- [x] Today's schedule items → Schedule detail pages
- [x] Stats cards (if clickable) → Relevant pages (Payments Due → Bookings with filter)

### 2. Calendar → Schedule Detail Flow
**Goal:** Navigate from calendar to manage a specific schedule
- [x] Click on a day with tours → Shows tours for that day
- [x] Click on a specific tour → Schedule detail page
- [x] Schedule detail → Can navigate back to calendar
- [x] Schedule detail links → Booking detail, Customer detail

### 3. Bookings List → Booking Detail Flow
**Goal:** Find and manage a specific booking
- [x] Bookings page loads with list
- [x] Click on booking row → Booking detail page
- [x] Booking detail → Customer link works ("View Profile" button)
- [x] Booking detail → Schedule link works
- [x] Booking detail → Edit/Cancel actions available
- [x] Back navigation works

### 4. Tours List → Tour Detail → Schedule Flow
**Goal:** Manage tours and their schedules
- [x] Tours page loads with list
- [x] Click tour row → Tour detail page
- [x] Tour detail → Schedules tab shows schedules
- [x] "Add Schedule" button → Schedule creation form
- [x] Schedule creation → Redirects appropriately
- [x] Tour edit form accessible

### 5. Customers List → Customer Detail Flow
**Goal:** Find and view customer information
- [x] Customers page loads with list
- [x] Search/filter works
- [x] Click customer row → Customer detail page (Customer 360 view)
- [x] Customer detail → Shows booking history
- [x] Booking history items → Link to booking details
- [x] Back navigation works

### 6. Guides List → Guide Detail Flow
**Goal:** Manage guide information and assignments
- [x] Guides page loads with list
- [x] Click guide row → Guide detail page (after bug fix)
- [x] Guide detail → Shows upcoming schedules
- [x] Schedule items → Link to schedule details
- [x] Edit guide button → Edit form
- [x] Back navigation works

### 7. Analytics Page Navigation
**Goal:** Access various analytics views
- [ ] Analytics page loads - NOT TESTED
- [ ] Any sub-navigation/tabs work
- [ ] Date range selectors work
- [ ] Export actions (if any) work

### 8. Settings Page Navigation
**Goal:** Access all settings sections
- [x] Settings page loads with organized categories
- [x] Sub-navigation between settings sections
- [x] General settings section accessible
- [x] Notifications settings section accessible
- [x] Save actions work and provide feedback ("Changes saved" indicator)

### 9. Cross-Page Contextual Links
**Goal:** Links embedded in content lead to correct pages
- [x] Customer name in booking → Customer detail ("View Profile" button)
- [x] Tour name in schedule → Tour detail ("View Tour Details" link)
- [x] Guide name in schedule → Guide detail
- [x] Schedule reference in booking → Schedule detail

### 10. Breadcrumb & Back Navigation
**Goal:** Users can navigate back without getting lost
- [x] Browser back button works correctly
- [x] No broken navigation states
- [ ] Breadcrumbs - Most pages use back buttons instead of breadcrumbs

### 11. Empty States & Edge Cases
**Goal:** Pages handle missing data gracefully
- [x] Empty lists show helpful messages (Calendar "No tours" on empty days)
- [ ] 404 pages for invalid IDs - NOT TESTED
- [x] Error states show error message (Guide detail showed error before fix)

### 12. Quick Actions Across Pages
**Goal:** Common actions accessible from multiple contexts
- [x] Quick Book accessible from dashboard
- [x] Quick Guide Assign from calendar/schedule
- [x] Create buttons lead to correct forms

---

## Test Execution Log

### Date: December 22, 2025

#### Test Results

**Navigation Flows Tested:**

| Flow | Status | Notes |
|------|--------|-------|
| Dashboard → Calendar | PASS | "View full calendar" link works |
| Dashboard → Quick Book | PASS | Opens booking modal |
| Dashboard → Bookings (filtered) | PASS | "Payments Due" → Bookings with payment filter |
| Bookings → Booking Detail | PASS | Click row opens detail page |
| Booking Detail → Customer | PASS | "View Profile" button works |
| Calendar → Schedule Detail | PASS | Day view schedules are clickable |
| Schedule Detail → Tour | PASS | "View Tour Details" link works |
| Tours → Tour Detail | PASS | Tour cards open detail page |
| Tour Detail → Schedules tab | PASS | Tab navigation works |
| Customers → Customer Detail | PASS | Customer 360 view with booking history |
| Guides → Guide Detail | PASS | After bug fix (see below) |
| Guide Detail → Schedules | PASS | Schedule links work |
| Settings → Sub-sections | PASS | General, Notifications work |
| Browser Back Button | PASS | Consistent navigation history |

**Test Coverage: 11/12 scenarios tested (92%)**
- Analytics page navigation not tested in this session

---

## Bugs Found

### 1. Guide Detail Page 500 Error - FIXED

**Location:** `packages/services/src/guide-service.ts:122-138`

**Issue:** The `getByIdWithStats` method passed a JavaScript Date object directly into a SQL template literal. PostgreSQL received the date as a locale string (e.g., `Mon Dec 22 2025 17:48:05 GMT+0400`) which it couldn't parse.

**Error Message:**
```
Failed query: select count(*), COUNT(*) FILTER (WHERE "starts_at" > $1 AND "status" = 'scheduled')
params: Mon Dec 22 2025 17:48:05 GMT+0400 (توقيت الخليج),...
```

**Root Cause:** Drizzle ORM's `sql` template literal doesn't auto-convert Date objects to ISO format for PostgreSQL.

**Fix Applied:**
```typescript
// Before (broken):
upcomingSchedules: sql<number>`COUNT(*) FILTER (WHERE ${schedules.startsAt} > ${now} AND ...)`

// After (fixed):
upcomingSchedules: sql<number>`COUNT(*) FILTER (WHERE ${schedules.startsAt} > ${now.toISOString()}::timestamp AND ...)`
```

**Status:** Fixed and verified on Dec 22, 2025

---

## Recommendations

1. **Add breadcrumbs** - Most pages use back buttons only; consider adding breadcrumb navigation for deeper pages
2. **Test Analytics page** - Not covered in this session
3. **Add aria-labels** - Console shows accessibility warnings for icon-only buttons
4. **Test 404 handling** - Verify invalid ID routes show proper error pages
5. **Test mobile responsive** - Navigation not tested on smaller screens

---

## UI/UX Observations

**Positive:**
- Consistent navigation patterns across all pages
- Cross-page contextual links work seamlessly (booking → customer → booking history)
- Settings page has excellent organization with clear categories
- Quick actions (Book, Assign Guide) accessible from multiple contexts
- Empty states provide helpful messages

**Navigation Highlights:**
- Dashboard provides excellent at-a-glance overview with actionable links
- Calendar Day view shows schedules as clickable items
- Customer 360 view integrates booking history with navigation
- Guide detail shows complete schedule information with links
- Settings sidebar navigation is intuitive and well-organized
