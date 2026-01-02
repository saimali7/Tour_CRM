/**
 * Booking Module - Refactored booking services
 *
 * This module provides a complete booking management system split into
 * focused services for better maintainability and testability.
 *
 * Architecture:
 * - BookingService (facade): Backward-compatible API that delegates to specialized services
 * - BookingCore: Shared utilities and helpers
 * - BookingQueryService: Read operations
 * - BookingCommandService: Write operations and status transitions
 * - BookingStatsService: Statistics and urgency grouping
 * - BookingParticipantService: Participant CRUD
 * - BookingBulkService: Bulk operations
 *
 * Usage (recommended - via facade):
 * ```ts
 * const services = createServices({ organizationId });
 * const booking = await services.booking.create(input);
 * const stats = await services.booking.getStats();
 * ```
 *
 * Usage (direct access to specialized services):
 * ```ts
 * import { BookingQueryService, BookingCore } from '@tour/services/booking';
 * const core = new BookingCore(ctx);
 * const queryService = new BookingQueryService(ctx, core);
 * const bookings = await queryService.getAll();
 * ```
 */

// Export the facade (default booking service)
export { BookingService } from "./booking-service";

// Export specialized services for direct use
export { BookingCore, type UrgencyLevel } from "./booking-core";
export { BookingQueryService } from "./booking-query-service";
export { BookingCommandService } from "./booking-command-service";
export { BookingStatsService } from "./booking-stats-service";
export { BookingParticipantService } from "./booking-participant-service";
export { BookingBulkService } from "./booking-bulk-service";

// Export all types
export type {
  // Filter & Sort
  BookingFilters,
  BookingSortField,
  // Core types
  BookingWithRelations,
  PricingSnapshot,
  // Input types
  CreateBookingInput,
  UpdateBookingInput,
  ParticipantInput,
  // Bulk operation results
  BulkConfirmResult,
  BulkCancelResult,
  BulkPaymentUpdateResult,
  BulkRescheduleResult,
  // Stats types
  BookingStats,
  UrgencyGroupedBookings,
  ActionableBookings,
  DayBookings,
  UpcomingBookings,
  TodayBookingsWithUrgency,
} from "./types";
