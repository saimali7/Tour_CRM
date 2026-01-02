# Booking Model Migration Plan

## From Schedule-Based to Availability-Based

**Status:** Backend 85% ready, UI 0% ready
**Estimated Effort:** 4-5 days
**Risk Level:** Medium (backward compatible approach)

---

## Executive Summary

The codebase has TWO booking models:
- **Schedule-based (Legacy):** `scheduleId` → pre-created schedule entity
- **Availability-based (Target):** `tourId + bookingDate + bookingTime`

Backend services already support the new model. The blocker is:
1. Validators require `scheduleId`
2. UI only has schedule picker, no date/time selection

---

## Migration Phases

### Phase 1: Enable Availability-Based Booking Creation
**Goal:** Allow bookings to be created WITHOUT scheduleId

| Task | File | Change |
|------|------|--------|
| 1.1 | `packages/validators/src/booking.ts` | Make `scheduleId` optional, require `tourId + bookingDate + bookingTime` as alternative |
| 1.2 | `apps/crm/src/server/routers/booking.ts` | Update create schema to accept either model |
| 1.3 | `packages/services/src/booking/booking-command-service.ts` | Remove dual-write, use only availability fields |

**Acceptance Criteria:**
- Can create booking via API with `{ tourId, bookingDate, bookingTime }` (no scheduleId)
- Existing schedule-based bookings still work

---

### Phase 2: Build Availability-Based Booking UI
**Goal:** New booking form that uses date/time picker instead of schedule selector

| Task | File | Change |
|------|------|--------|
| 2.1 | `components/bookings/booking-form/TourSection.tsx` | NEW - Tour selector component |
| 2.2 | `components/bookings/booking-form/DateTimeSection.tsx` | NEW - Date picker with availability calendar + time slot picker |
| 2.3 | `components/bookings/booking-form/ScheduleSection.tsx` | REMOVE - No longer needed |
| 2.4 | `components/bookings/booking-form/useBookingForm.ts` | Update state to use tourId/date/time instead of scheduleId |
| 2.5 | `components/bookings/booking-form/BookingFormContainer.tsx` | Wire new sections |
| 2.6 | `components/bookings/unified-booking-sheet.tsx` | Update mutation payload |

**Acceptance Criteria:**
- User selects: Tour → Date (from availability calendar) → Time slot → Guest counts
- Form submits without scheduleId
- Shows capacity/availability for selected date

---

### Phase 3: Update Related Features
**Goal:** Ensure manifests, check-in, guide assignment work with new model

| Task | File | Change |
|------|------|--------|
| 3.1 | `packages/services/src/manifest-service.ts` | Add `getForTourRun()` method |
| 3.2 | `packages/services/src/check-in-service.ts` | Support check-in by tour run |
| 3.3 | `apps/crm/src/server/routers/booking.ts` | Update `reschedule` to accept date/time |
| 3.4 | `apps/crm/src/inngest/functions/guide-notifications.ts` | Use tour run URLs |

**Acceptance Criteria:**
- Manifests accessible via `/manifest?tourId=X&date=Y&time=Z`
- Check-in works for tour runs
- Guide notifications have correct links

---

### Phase 4: Remove Legacy Dual-Write
**Goal:** Stop writing to legacy columns on NEW bookings

| Task | File | Change |
|------|------|--------|
| 4.1 | `booking-command-service.ts` | Remove `scheduleId` from insert |
| 4.2 | `booking-command-service.ts` | Remove `adultCount/childCount/infantCount` from insert |
| 4.3 | `booking-bulk-service.ts` | Remove schedule.bookedCount updates |
| 4.4 | All services | Remove schedule joins for new bookings |

**Acceptance Criteria:**
- New bookings have NULL scheduleId
- New bookings only have guestAdults/Children/Infants (not legacy counts)
- Old bookings still work

---

### Phase 5: Schema Cleanup (Optional/Future)
**Goal:** Remove legacy columns from schema

| Task | Change |
|------|--------|
| 5.1 | Backfill script: ensure all bookings have tourId/date/time |
| 5.2 | Add NOT NULL constraints to tourId, bookingDate, bookingTime |
| 5.3 | Drop scheduleId column |
| 5.4 | Drop adultCount, childCount, infantCount columns |

**This phase is OPTIONAL** - can be done later when confident no issues.

---

## Detailed Implementation

### Phase 1.1: Update Booking Validator

**Current (`packages/validators/src/booking.ts`):**
```typescript
export const createBookingSchema = z.object({
  scheduleId: z.string().min(1, "Schedule is required"),
  // ...
});
```

**Target:**
```typescript
export const createBookingSchema = z.object({
  // Either schedule-based OR availability-based (not both required)
  scheduleId: z.string().optional(),

  // Availability-based fields
  tourId: z.string().optional(),
  bookingDate: z.string().optional(), // ISO date string
  bookingTime: z.string().optional(), // HH:MM format

  // Guest counts (new names)
  guestAdults: z.number().int().min(1).default(1),
  guestChildren: z.number().int().min(0).default(0),
  guestInfants: z.number().int().min(0).default(0),

  // Legacy (optional for backward compatibility)
  adultCount: z.number().int().min(1).optional(),
  childCount: z.number().int().min(0).optional(),
  infantCount: z.number().int().min(0).optional(),
  // ...
}).refine(
  (data) => data.scheduleId || (data.tourId && data.bookingDate && data.bookingTime),
  { message: "Either scheduleId OR (tourId + bookingDate + bookingTime) is required" }
);
```

### Phase 2.2: DateTimeSection Component

**New component that:**
1. Fetches available dates from `trpc.tourAvailability.getAvailableDatesForMonth`
2. Shows calendar with available dates highlighted
3. On date selection, fetches time slots from `trpc.tourAvailability.getDepartureTimesForDate`
4. Shows time slot buttons with capacity

```typescript
// Simplified structure
function DateTimeSection({
  tourId,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange
}) {
  const { data: availableDates } = trpc.tourAvailability.getAvailableDatesForMonth.useQuery({
    tourId,
    year: currentMonth.year,
    month: currentMonth.month,
  });

  const { data: timeSlots } = trpc.tourAvailability.getDepartureTimesForDate.useQuery({
    tourId,
    date: selectedDate,
  }, { enabled: !!selectedDate });

  return (
    <>
      <Calendar
        availableDates={availableDates}
        selected={selectedDate}
        onSelect={onDateChange}
      />
      {selectedDate && (
        <TimeSlotPicker
          slots={timeSlots}
          selected={selectedTime}
          onSelect={onTimeChange}
        />
      )}
    </>
  );
}
```

---

## Files to Modify (Complete List)

### Phase 1: Validators & Routers
- [ ] `packages/validators/src/booking.ts`
- [ ] `apps/crm/src/server/routers/booking.ts`

### Phase 2: UI Components
- [ ] `apps/crm/src/components/bookings/booking-form/types.ts`
- [ ] `apps/crm/src/components/bookings/booking-form/useBookingForm.ts`
- [ ] `apps/crm/src/components/bookings/booking-form/TourSection.tsx` (NEW)
- [ ] `apps/crm/src/components/bookings/booking-form/DateTimeSection.tsx` (NEW)
- [ ] `apps/crm/src/components/bookings/booking-form/BookingFormContainer.tsx`
- [ ] `apps/crm/src/components/bookings/booking-form/index.tsx`
- [ ] `apps/crm/src/components/bookings/unified-booking-sheet.tsx`
- [ ] `apps/crm/src/components/bookings/customer-first-booking-sheet.tsx`

### Phase 3: Services
- [ ] `packages/services/src/manifest-service.ts`
- [ ] `packages/services/src/check-in-service.ts`
- [ ] `apps/crm/src/inngest/functions/guide-notifications.ts`

### Phase 4: Cleanup
- [ ] `packages/services/src/booking/booking-command-service.ts`
- [ ] `packages/services/src/booking/booking-bulk-service.ts`

---

## Rollback Plan

If issues arise:
1. Validator change is backward compatible (scheduleId still accepted)
2. UI can be feature-flagged
3. Dual-write removal can be reverted
4. Schema changes are last and optional

---

## Success Metrics

- [ ] New bookings created without scheduleId via API
- [ ] New bookings created via UI using date/time picker
- [ ] Manifests work for tour runs
- [ ] Check-in works for tour runs
- [ ] Guide notifications have correct links
- [ ] No regression in existing booking flows
