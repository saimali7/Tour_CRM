# BookingService Refactoring Plan

**File:** `/packages/services/src/booking-service.ts`
**Current Size:** 2,131 lines
**Date:** January 2026

## Executive Summary

The `BookingService` has grown into a "god object" handling 9+ distinct responsibilities. This document proposes splitting it into 5 focused services while maintaining backward compatibility through a facade pattern.

---

## 1. Current State Analysis

### 1.1 Public Methods Inventory (27 methods)

| Method | Lines | Category | Description |
|--------|-------|----------|-------------|
| `getAll()` | 161-293 | Query | Paginated list with filters |
| `getById()` | 295-355 | Query | Single booking with relations |
| `getByReference()` | 357-409 | Query | Lookup by reference number |
| `create()` | 421-683 | Command | Create booking (schedule or availability model) |
| `update()` | 694-771 | Command | Update booking fields |
| `confirm()` | 773-802 | Command/Status | Confirm pending booking |
| `cancel()` | 804-857 | Command/Status | Cancel booking |
| `markNoShow()` | 859-887 | Command/Status | Mark as no-show |
| `complete()` | 889-917 | Command/Status | Mark as completed |
| `reschedule()` | 919-1023 | Command | Move to different schedule |
| `updatePaymentStatus()` | 1025-1054 | Command/Payment | Update payment fields |
| `addParticipant()` | 1056-1092 | Participant | Add participant to booking |
| `removeParticipant()` | 1094-1109 | Participant | Remove participant |
| `getStats()` | 1111-1163 | Stats | Aggregate statistics |
| `getForSchedule()` | 1165-1173 | Query | Bookings for a schedule |
| `getForTourRun()` | 1179-1244 | Query | Bookings for tour run |
| `getTodaysBookings()` | 1250-1317 | Query | Today's confirmed bookings |
| `bulkConfirm()` | 1324-1388 | Bulk | Confirm multiple bookings |
| `bulkCancel()` | 1395-1514 | Bulk | Cancel multiple bookings |
| `bulkUpdatePaymentStatus()` | 1521-1581 | Bulk | Update payment for multiple |
| `bulkReschedule()` | 1587-1610 | Bulk | Reschedule multiple bookings |
| `getGroupedByUrgency()` | 1662-1780 | Stats/Urgency | Urgency-grouped list |
| `getNeedsAction()` | 1785-1887 | Stats/Urgency | Actionable bookings |
| `getUpcoming()` | 1892-2056 | Stats/Urgency | Upcoming by day |
| `getTodayWithUrgency()` | 2061-2130 | Stats/Urgency | Today with urgency info |

### 1.2 Private Methods

| Method | Lines | Used By | Shareable? |
|--------|-------|---------|------------|
| `recalculateGuideRequirements()` | 147-159 | create, update, cancel, reschedule, bulkCancel | Yes - needs access from multiple services |
| `extractTimeFromDate()` | 688-692 | create | No - only used in create |
| `getBookingUrgency()` | 1619-1657 | getGroupedByUrgency, getNeedsAction, getTodayWithUrgency | Yes - urgency logic |

### 1.3 Responsibility Groups

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT BookingService                          │
├─────────────────────────────────────────────────────────────────────────┤
│ CRUD Operations          │ Status Transitions    │ Payment Updates      │
│ - create()               │ - confirm()           │ - updatePaymentStatus│
│ - update()               │ - cancel()            │                      │
│ - reschedule()           │ - markNoShow()        │                      │
│                          │ - complete()          │                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Query Operations         │ Participant Mgmt      │ Bulk Operations      │
│ - getAll()               │ - addParticipant()    │ - bulkConfirm()      │
│ - getById()              │ - removeParticipant() │ - bulkCancel()       │
│ - getByReference()       │                       │ - bulkUpdatePayment..│
│ - getForSchedule()       │                       │ - bulkReschedule()   │
│ - getForTourRun()        │                       │                      │
│ - getTodaysBookings()    │                       │                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Statistics/Analytics     │ Urgency Grouping                             │
│ - getStats()             │ - getGroupedByUrgency()                      │
│                          │ - getNeedsAction()                           │
│                          │ - getUpcoming()                              │
│                          │ - getTodayWithUrgency()                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Proposed Service Split

### 2.1 New Service Architecture

```
packages/services/src/booking/
├── index.ts                      # Re-exports + BookingService facade
├── booking-core.ts               # Shared utilities and types
├── booking-query-service.ts      # Read operations (~400 lines)
├── booking-command-service.ts    # Write operations (~500 lines)
├── booking-stats-service.ts      # Statistics & urgency (~500 lines)
├── booking-participant-service.ts # Participant CRUD (~100 lines)
└── booking-bulk-service.ts       # Bulk operations (~300 lines)
```

### 2.2 Service Responsibilities

#### BookingQueryService (~400 lines)
```typescript
class BookingQueryService extends BaseService {
  // Core lookups
  getAll(filters, pagination, sort): Promise<PaginatedResult<BookingWithRelations>>
  getById(id): Promise<BookingWithRelations>
  getByReference(referenceNumber): Promise<BookingWithRelations>

  // Contextual queries
  getForSchedule(scheduleId): Promise<BookingWithRelations[]>
  getForTourRun(tourId, date, time): Promise<BookingWithRelations[]>
  getTodaysBookings(): Promise<BookingWithRelations[]>
}
```

#### BookingCommandService (~500 lines)
```typescript
class BookingCommandService extends BaseService {
  constructor(ctx, private core: BookingCore) {}

  // CRUD
  create(input): Promise<BookingWithRelations>
  update(id, input): Promise<BookingWithRelations>

  // Status transitions
  confirm(id): Promise<BookingWithRelations>
  cancel(id, reason?): Promise<BookingWithRelations>
  markNoShow(id): Promise<BookingWithRelations>
  complete(id): Promise<BookingWithRelations>
  reschedule(id, newScheduleId): Promise<BookingWithRelations>

  // Payment
  updatePaymentStatus(id, status, paidAmount?, stripeId?): Promise<BookingWithRelations>
}
```

#### BookingStatsService (~500 lines)
```typescript
class BookingStatsService extends BaseService {
  constructor(ctx, private core: BookingCore) {}

  // Aggregate stats
  getStats(dateRange?): Promise<BookingStats>

  // Urgency grouping (for Needs Action UI)
  getGroupedByUrgency(): Promise<UrgencyGroupedBookings>
  getNeedsAction(): Promise<ActionableBookings>
  getUpcoming(days?): Promise<UpcomingBookings>
  getTodayWithUrgency(): Promise<TodayBookings>
}
```

#### BookingParticipantService (~100 lines)
```typescript
class BookingParticipantService extends BaseService {
  addParticipant(bookingId, participant): Promise<BookingParticipant>
  removeParticipant(bookingId, participantId): Promise<void>
  updateParticipant(bookingId, participantId, data): Promise<BookingParticipant>
  getParticipants(bookingId): Promise<BookingParticipant[]>
}
```

#### BookingBulkService (~300 lines)
```typescript
class BookingBulkService extends BaseService {
  constructor(ctx, private commandService: BookingCommandService) {}

  bulkConfirm(ids): Promise<BulkOperationResult>
  bulkCancel(ids, reason?): Promise<BulkOperationResult>
  bulkUpdatePaymentStatus(ids, status): Promise<BulkOperationResult>
  bulkReschedule(ids, newScheduleId): Promise<BulkOperationResult>
}
```

### 2.3 Shared Code (BookingCore)

```typescript
// booking-core.ts
export class BookingCore {
  constructor(private ctx: ServiceContext) {}

  // Shared helper - recalculate guide requirements
  async recalculateGuideRequirements(scheduleId: string): Promise<void>

  // Shared helper - extract time from date
  extractTimeFromDate(date: Date): string

  // Shared urgency calculation
  getBookingUrgency(booking: BookingWithRelations): UrgencyLevel

  // Shared query builder for booking joins (DRY)
  buildBookingSelectQuery(): SelectQueryBuilder

  // Shared validation
  validateBookingForStatusChange(booking: Booking, targetStatus: BookingStatus): void
}
```

---

## 3. Backward Compatibility Strategy

### 3.1 Facade Pattern

The existing `BookingService` becomes a thin facade that delegates to the new services:

```typescript
// booking-service.ts (becomes facade)
export class BookingService extends BaseService {
  private query: BookingQueryService;
  private command: BookingCommandService;
  private stats: BookingStatsService;
  private participant: BookingParticipantService;
  private bulk: BookingBulkService;

  constructor(ctx: ServiceContext) {
    super(ctx);
    const core = new BookingCore(ctx);
    this.query = new BookingQueryService(ctx, core);
    this.command = new BookingCommandService(ctx, core);
    this.stats = new BookingStatsService(ctx, core);
    this.participant = new BookingParticipantService(ctx, core);
    this.bulk = new BookingBulkService(ctx, this.command);
  }

  // Delegate all methods - NO CHANGES to public API
  getAll(...args) { return this.query.getAll(...args); }
  getById(...args) { return this.query.getById(...args); }
  create(...args) { return this.command.create(...args); }
  // ... etc
}
```

### 3.2 Export Strategy

```typescript
// packages/services/src/booking/index.ts
export { BookingService } from './booking-service';  // Facade (default)

// Also export individual services for direct use
export { BookingQueryService } from './booking-query-service';
export { BookingCommandService } from './booking-command-service';
export { BookingStatsService } from './booking-stats-service';
export { BookingParticipantService } from './booking-participant-service';
export { BookingBulkService } from './booking-bulk-service';

// Re-export all types
export type { BookingFilters, BookingWithRelations, ... } from './types';
```

### 3.3 Services Factory Update

```typescript
// packages/services/src/index.ts
export interface Services {
  booking: BookingService;  // Unchanged - facade

  // Optional: expose sub-services directly if needed
  bookingQuery?: BookingQueryService;
  bookingCommand?: BookingCommandService;
  bookingStats?: BookingStatsService;
}
```

---

## 4. Migration Steps

### Phase 1: Create Infrastructure (Day 1)
1. Create `packages/services/src/booking/` directory
2. Create `booking-core.ts` with shared utilities
3. Create type definitions file
4. Set up barrel export in `index.ts`

### Phase 2: Extract Query Service (Day 1-2)
1. Move `getAll`, `getById`, `getByReference` to `BookingQueryService`
2. Move `getForSchedule`, `getForTourRun`, `getTodaysBookings`
3. Extract shared query builder to `BookingCore`
4. Update facade to delegate

### Phase 3: Extract Command Service (Day 2-3)
1. Move `create`, `update` to `BookingCommandService`
2. Move status transitions: `confirm`, `cancel`, `markNoShow`, `complete`
3. Move `reschedule`, `updatePaymentStatus`
4. Move `recalculateGuideRequirements` to core
5. Update facade to delegate

### Phase 4: Extract Stats Service (Day 3-4)
1. Move `getStats` to `BookingStatsService`
2. Move urgency methods: `getGroupedByUrgency`, `getNeedsAction`, etc.
3. Move `getBookingUrgency` to core
4. Update facade to delegate

### Phase 5: Extract Participant & Bulk Services (Day 4)
1. Create `BookingParticipantService` with participant methods
2. Create `BookingBulkService` delegating to command service
3. Update facade to delegate

### Phase 6: Cleanup & Testing (Day 5)
1. Remove old implementation from facade
2. Run full test suite
3. Run typecheck
4. Update any direct imports if needed

---

## 5. Considerations

### 5.1 Transaction Boundaries

The `create()` method uses a database transaction. This must remain in `BookingCommandService`:

```typescript
// bookingId = await this.db.transaction(async (tx) => { ... })
```

The transaction scope stays within `BookingCommandService.create()`.

### 5.2 Cross-Service Dependencies

```
BookingBulkService ──depends on──> BookingCommandService
BookingCommandService ──depends on──> BookingCore
BookingStatsService ──depends on──> BookingCore
BookingQueryService ──depends on──> BookingCore (for query builder)
```

### 5.3 External Dependencies

Current dependencies that must be preserved:
- `ScheduleService` - called in `recalculateGuideRequirements`
- `TourAvailabilityService` - called in `create` for availability-based bookings
- `bookingLogger` - logging throughout

### 5.4 Router Changes Required

The tRPC router (`apps/crm/src/server/routers/booking.ts`) will need **NO changes** because:
1. It uses `services.booking.*`
2. The facade maintains the same public API
3. All method signatures remain identical

---

## 6. Benefits

| Benefit | Description |
|---------|-------------|
| **Single Responsibility** | Each service has one clear purpose |
| **Testability** | Smaller units are easier to test in isolation |
| **Maintainability** | Changes to queries don't risk breaking commands |
| **Code Navigation** | Easier to find relevant code |
| **Future Extensibility** | New query types go in QueryService, new bulk ops in BulkService |
| **Team Scaling** | Multiple developers can work on different services |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing code | Facade pattern preserves public API |
| Circular dependencies | Core class holds shared code, no circular deps |
| Performance overhead | Minimal - composition is cheap |
| Transaction scope issues | Keep transactions in CommandService |
| Type export issues | Re-export all types from barrel |

---

## 8. Success Criteria

- [ ] All existing tests pass
- [ ] `pnpm typecheck` passes
- [ ] No changes required to booking router
- [ ] No changes required to other services that call BookingService
- [ ] Each new service is under 500 lines
- [ ] BookingService facade is under 100 lines

---

## 9. Future Enhancements (Out of Scope)

After this refactoring is stable:
1. Add caching layer to `BookingQueryService`
2. Add event sourcing to `BookingCommandService`
3. Extract pricing calculation from `create()` to `PricingService`
4. Add read replicas support to `BookingQueryService`
