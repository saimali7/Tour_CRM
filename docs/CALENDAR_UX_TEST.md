# Calendar UI/UX Test Plan

## Objective
Test the calendar from a daily tour operator perspective to identify friction points, bugs, and UX improvements.

---

## Test Scenarios

### 1. Calendar Load & First Impression
**Goal:** Operator navigates to calendar and understands the view immediately
- [x] Calendar loads quickly (<2s)
- [x] Current date is highlighted/visible
- [x] Default view makes sense (Month view - good for overview)
- [x] Tours are visible with key info at a glance
- [x] Visual hierarchy is clear

### 2. View Switching (Month/Week/Day)
**Goal:** Seamlessly switch between calendar views
- [x] Month view shows overview of all tours
- [x] Week view shows more detail per tour
- [x] Day view shows full schedule details
- [x] View switching is instant
- [x] State persists appropriately

### 3. Date Navigation
**Goal:** Quickly navigate to any date
- [x] Previous/Next buttons work correctly
- [x] "Today" button returns to current date
- [ ] Date picker (if available) - not available
- [x] Navigation is smooth and fast
- [x] Selected date is clearly indicated

### 4. Tour Card Information
**Goal:** See all necessary info without clicking
- [x] Tour name is visible
- [x] Time is clearly displayed
- [x] Capacity/booking count shown
- [x] Guide assignment status visible
- [x] Status indicators (needs attention) clear

### 5. Quick Actions from Calendar
**Goal:** Perform common tasks without leaving calendar
- [x] Can quick-assign guide from calendar
- [x] Can click through to schedule detail
- [x] Hover states provide additional info
- [x] Actions are discoverable (Assign button)

### 6. Filtering & Search
**Goal:** Find specific tours quickly
- [x] Filter by tour type works
- [ ] Filter by guide works - not available
- [ ] Filter by status works - not available
- [x] Filters are easy to apply/clear
- [x] Results update immediately

### 7. Visual Indicators & Legends
**Goal:** Understand color coding and icons
- [x] Color coding is consistent
- [x] Legend is accessible (at bottom of month view)
- [x] Status indicators are clear
- [x] Capacity visualization intuitive
- [x] Guide/no-guide distinction clear (warning icons)

### 8. Responsive Behavior
**Goal:** Calendar works on different screen sizes
- [ ] Not tested in this session

### 9. Edge Cases
**Goal:** Handle unusual scenarios gracefully
- [x] Empty days display correctly ("No tours")
- [x] Many tours in one day handled (scrollable list)
- [x] Past dates display correctly (grayed out)
- [x] Future months load correctly

---

## Test Execution Log

### Date: December 22, 2025

#### Views Tested

**Month View:**
- Header stats: 200 schedules, 43/3909 booked, 24 need guide
- Color-coded capacity legend: <50% (green), 50-80% (yellow), 80-100% (orange), Full (red)
- "Needs guide" warning icons with count
- Clean grid layout with days showing tour count and spots left
- Current day (22) highlighted in blue

**Week View:**
- 7-day columns with day headers (day name, date, summary)
- Tour cards show: Time, Tour name, Guide name, Capacity (X of Y)
- Tours without guides show orange warning icons
- Empty days show "No tours"
- Scrollable within each day column

**Day View:**
- Summary stat cards: Tours, Booked, Spots Left, Utilization, Needs Guide
- "Needs Guide" card highlighted in orange
- Tours grouped by time: Morning, Afternoon, Evening
- Each tour shows: Time, Duration (min), Name, Guide/Assign button, Spots left
- External guides shown with "External Guide" button

#### Bugs Found & Fixed

**1. Filter Button Shows Tour ID Instead of Tour Name** ✅ FIXED
- **Location:** Calendar filter dropdown button (`apps/crm/src/app/org/[slug]/(dashboard)/calendar/page.tsx:118-134`)
- **Issue:** After selecting a tour filter, the button displayed the tour UUID instead of the tour name
- **Fix:** Replaced `SelectValue` with custom computed display that looks up the tour name from `toursData`
- **Status:** Fixed and verified on Dec 22, 2025

#### Features Working Well

1. **View Switching:** Instant transitions between Month/Week/Day views
2. **Date Navigation:** Previous/Next/Today buttons work perfectly, stats update immediately
3. **QuickGuideAssign Integration:** Works from Day view - opens Team/External tabs with conflict detection
4. **External Guide Display:** Correctly shows "External Guide" button for outsourced tours
5. **Visual Indicators:**
   - Orange warning badges for tours needing guides
   - Capacity bars with color coding
   - Guide names with avatar initials
6. **Tour Filtering:** Works correctly, updates calendar and stats
7. **Schedule Links:** All tours clickable to schedule detail page

#### UI/UX Observations

**Positive:**
- Exceptional information density without feeling cluttered
- Three views serve different operator needs well
- Morning/Afternoon/Evening grouping in Day view is intuitive
- Stats cards in Day view provide quick operational overview
- Legend at bottom of Month view explains color coding

**Suggestions:**
- Add guide filter option (currently only tour filter)
- Add "needs guide" filter to quickly see all unassigned schedules
- Consider date picker for jumping to specific dates

#### Test Coverage Summary
- Calendar Load & First Impression: PASS
- View Switching (Month/Week/Day): PASS
- Date Navigation: PASS
- Tour Card Information: PASS
- Quick Actions from Calendar: PASS
- Filtering & Search: PASS (bug fixed)
- Visual Indicators & Legends: PASS
- Edge Cases: PASS
- Mobile/Responsive: NOT TESTED

---

## Screenshots Captured
- `calendar-month-view.png` - Month view with color-coded capacity legend
- `calendar-week-view.png` - Week view with tour cards and warning icons
- `calendar-day-view.png` - Day view with stat cards and time groupings

---

## Recommendations

1. ~~**Fix filter button display** - Show tour name instead of UUID~~ ✅ FIXED
2. **Add guide filter** - Allow filtering by assigned guide
3. **Add status filter** - "Needs guide", "Full", "Low bookings" filters
4. **Add date picker** - For jumping to specific dates quickly
5. **Test mobile** - Verify responsive behavior on smaller screens
