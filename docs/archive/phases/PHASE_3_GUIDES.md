# Phase 3: Guide Operations

**Status:** ✅ Complete (95%)
**Completed:** December 13, 2025
**Duration:** ~1 day

## Summary

Built complete guide management system including availability scheduling, tour qualifications, assignment workflow with conflict detection, guide portal with magic link authentication, and manifest system with print support.

---

## Database Tables Added

```typescript
// packages/database/src/schema/guide-operations.ts
- guide_availability ✅ (weekly patterns)
- guide_availability_overrides ✅ (date-specific)
- tour_guide_qualifications ✅ (which guides lead which tours)
- guide_assignments ✅ (schedule-guide with status)
- guide_tokens ✅ (magic link authentication)
```

## Services Added

| Service | File | Status |
|---------|------|--------|
| GuideAvailabilityService | `guide-availability-service.ts` | ✅ |
| TourGuideQualificationService | `tour-guide-qualification-service.ts` | ✅ |
| GuideAssignmentService | `guide-assignment-service.ts` | ✅ |
| ManifestService | `manifest-service.ts` | ✅ |

## Guide Management

| Task | Status | Notes |
|------|--------|-------|
| Guide list page | ✅ | Search, filter, stats |
| Guide create form | ✅ | All fields with languages |
| Guide detail page | ✅ | Profile with tabs |
| Guide edit form | ✅ | Pre-populated fields |
| Guide photo upload | ✅ | Avatar support |
| Languages & certifications | ✅ | Multi-select with badges |

## Availability System

| Task | Status | Notes |
|------|--------|-------|
| Weekly availability pattern | ✅ | Day-by-day time slots |
| Date-specific overrides | ✅ | Vacation, sick days |
| Availability calendar view | ✅ | In guide detail page |
| Availability checking | ✅ | Service methods |

## Tour-Guide Qualifications

| Task | Status | Notes |
|------|--------|-------|
| Qualifications UI | ✅ | In tour detail page |
| Add/remove guides | ✅ | With dropdown |
| Set primary guide | ✅ | Per tour |
| Filter available guides | ✅ | For scheduling |

## Assignments

| Task | Status | Notes |
|------|--------|-------|
| Assign guide to schedule | ✅ | With conflict detection |
| Assignment status workflow | ✅ | Pending → Confirmed/Declined |
| Conflict detection | ✅ | Time overlap checking |
| Assignment UI component | ✅ | In schedule detail |

## Guide Portal

| Task | Status | Notes |
|------|--------|-------|
| Magic link authentication | ✅ | JWT-based |
| Guide dashboard | ✅ | Upcoming tours |
| Assignments list | ✅ | With status filters |
| Confirm/decline assignments | ✅ | With reasons |
| Schedule manifest view | ✅ | Participant list |
| Login page | ✅ | Token validation |

## Manifests

| Task | Status | Notes |
|------|--------|-------|
| Manifest service | ✅ | Full participant data |
| Manifest UI component | ✅ | In schedule detail |
| Print support | ✅ | Browser print dialog |
| Email to guide button | ✅ | Pre-filled mailto |

## Guide Notifications (Inngest)

| Task | Status | Notes |
|------|--------|-------|
| Assignment created email | ✅ | With confirm/decline links |
| Pending assignment reminder | ✅ | 24-hour follow-up |
| Tour reminder (24h before) | ✅ | With manifest link |
| Daily manifest email | ✅ | 6 AM cron job |

## Known Gaps (Deferred)

- PDF manifest export
- Mark tour complete from portal
- Guide performance tracking

---

*Archived from PROGRESS.md on January 2, 2026*
