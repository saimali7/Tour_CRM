/**
 * BookingService - Facade for backward compatibility
 *
 * This class maintains the original BookingService API by delegating
 * to the specialized services. Existing code that uses BookingService
 * will continue to work without any changes.
 *
 * The facade pattern allows us to:
 * 1. Split the implementation into focused services
 * 2. Maintain backward compatibility with existing routers
 * 3. Provide a single entry point for booking operations
 */

import type { BookingParticipant, PaymentStatus } from "@tour/database";
import { BaseService } from "../base-service";
import type {
  ServiceContext,
  PaginationOptions,
  PaginatedResult,
  SortOptions,
  DateRangeFilter,
} from "../types";

import { BookingCore } from "./booking-core";
import { BookingQueryService } from "./booking-query-service";
import { BookingCommandService } from "./booking-command-service";
import { BookingStatsService } from "./booking-stats-service";
import { BookingParticipantService } from "./booking-participant-service";
import { BookingBulkService } from "./booking-bulk-service";
import type {
  BookingFilters,
  BookingSortField,
  BookingWithRelations,
  CreateBookingInput,
  UpdateBookingInput,
  ParticipantInput,
  BookingStats,
  UrgencyGroupedBookings,
  ActionableBookings,
  UpcomingBookings,
  TodayBookingsWithUrgency,
  BulkConfirmResult,
  BulkCancelResult,
  BulkPaymentUpdateResult,
  BulkRescheduleResult,
} from "./types";

export class BookingService extends BaseService {
  private readonly core: BookingCore;
  private readonly query: BookingQueryService;
  private readonly command: BookingCommandService;
  private readonly stats: BookingStatsService;
  private readonly participant: BookingParticipantService;
  private readonly bulk: BookingBulkService;

  constructor(ctx: ServiceContext) {
    super(ctx);

    // Initialize core and all sub-services
    this.core = new BookingCore(ctx);
    this.query = new BookingQueryService(ctx, this.core);
    this.command = new BookingCommandService(ctx, this.core);
    this.stats = new BookingStatsService(ctx, this.core);
    this.participant = new BookingParticipantService(ctx, this.core);
    this.bulk = new BookingBulkService(ctx, this.core, this.command);
  }

  // ==========================================================================
  // QUERY OPERATIONS (delegated to BookingQueryService)
  // ==========================================================================

  getAll(
    filters?: BookingFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions<BookingSortField>
  ): Promise<PaginatedResult<BookingWithRelations>> {
    return this.query.getAll(filters, pagination, sort);
  }

  getById(id: string): Promise<BookingWithRelations> {
    return this.query.getById(id);
  }

  getByReference(referenceNumber: string): Promise<BookingWithRelations> {
    return this.query.getByReference(referenceNumber);
  }

  getForTourRun(
    tourId: string,
    date: Date,
    time: string
  ): Promise<BookingWithRelations[]> {
    return this.query.getForTourRun(tourId, date, time);
  }

  getTodaysBookings(): Promise<BookingWithRelations[]> {
    return this.query.getTodaysBookings();
  }

  // ==========================================================================
  // COMMAND OPERATIONS (delegated to BookingCommandService)
  // ==========================================================================

  create(input: CreateBookingInput): Promise<BookingWithRelations> {
    return this.command.create(input);
  }

  update(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
    return this.command.update(id, input);
  }

  confirm(id: string): Promise<BookingWithRelations> {
    return this.command.confirm(id);
  }

  cancel(id: string, reason?: string): Promise<BookingWithRelations> {
    return this.command.cancel(id, reason);
  }

  markNoShow(id: string): Promise<BookingWithRelations> {
    return this.command.markNoShow(id);
  }

  complete(id: string): Promise<BookingWithRelations> {
    return this.command.complete(id);
  }

  reschedule(
    id: string,
    input: { tourId?: string; bookingDate: Date; bookingTime: string }
  ): Promise<BookingWithRelations> {
    return this.command.reschedule(id, input);
  }

  updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paidAmount?: string,
    stripePaymentIntentId?: string
  ): Promise<BookingWithRelations> {
    return this.command.updatePaymentStatus(id, paymentStatus, paidAmount, stripePaymentIntentId);
  }

  // ==========================================================================
  // PARTICIPANT OPERATIONS (delegated to BookingParticipantService)
  // ==========================================================================

  addParticipant(
    bookingId: string,
    participant: ParticipantInput
  ): Promise<BookingParticipant> {
    return this.participant.addParticipant(bookingId, participant);
  }

  removeParticipant(bookingId: string, participantId: string): Promise<void> {
    return this.participant.removeParticipant(bookingId, participantId);
  }

  // ==========================================================================
  // STATS OPERATIONS (delegated to BookingStatsService)
  // ==========================================================================

  getStats(dateRange?: DateRangeFilter): Promise<BookingStats> {
    return this.stats.getStats(dateRange);
  }

  getGroupedByUrgency(): Promise<UrgencyGroupedBookings> {
    return this.stats.getGroupedByUrgency();
  }

  getNeedsAction(): Promise<ActionableBookings> {
    return this.stats.getNeedsAction();
  }

  getUpcoming(days?: number): Promise<UpcomingBookings> {
    return this.stats.getUpcoming(days);
  }

  getTodayWithUrgency(): Promise<TodayBookingsWithUrgency> {
    return this.stats.getTodayWithUrgency();
  }

  // ==========================================================================
  // BULK OPERATIONS (delegated to BookingBulkService)
  // ==========================================================================

  bulkConfirm(ids: string[]): Promise<BulkConfirmResult> {
    return this.bulk.bulkConfirm(ids);
  }

  bulkCancel(ids: string[], reason?: string): Promise<BulkCancelResult> {
    return this.bulk.bulkCancel(ids, reason);
  }

  bulkUpdatePaymentStatus(
    ids: string[],
    paymentStatus: PaymentStatus
  ): Promise<BulkPaymentUpdateResult> {
    return this.bulk.bulkUpdatePaymentStatus(ids, paymentStatus);
  }

  bulkReschedule(
    ids: string[],
    input: { tourId?: string; bookingDate: Date; bookingTime: string }
  ): Promise<BulkRescheduleResult> {
    return this.bulk.bulkReschedule(ids, input);
  }
}
