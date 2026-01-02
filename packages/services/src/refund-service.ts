import { eq, and, desc, gte, lte, count, sum, sql } from "drizzle-orm";
import {
  refunds,
  bookings,
  type Refund,
  type RefundStatus,
  type RefundReason,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type DateRangeFilter,
  NotFoundError,
  ValidationError,
  ServiceError,
} from "./types";

export interface RefundFilters {
  bookingId?: string;
  status?: RefundStatus;
  dateRange?: DateRangeFilter;
}

export interface RefundWithBooking extends Refund {
  booking?: {
    id: string;
    referenceNumber: string;
    total: string;
    paidAmount: string | null;
    paymentStatus: string;
  };
}

export interface CreateRefundInput {
  bookingId: string;
  amount: string;
  currency?: string;
  reason: RefundReason;
  reasonDetails?: string;
  processedBy?: string;
  processedByName?: string;
  internalNotes?: string;
}

export interface ProcessRefundResult {
  refund: Refund;
  stripeRefundId?: string;
  success: boolean;
  error?: string;
}

export class RefundService extends BaseService {
  /**
   * Get paginated refunds with filters
   */
  async getAll(
    filters: RefundFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<RefundWithBooking>> {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(refunds.organizationId, this.organizationId)];

    if (filters.bookingId) {
      conditions.push(eq(refunds.bookingId, filters.bookingId));
    }
    if (filters.status) {
      conditions.push(eq(refunds.status, filters.status));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(refunds.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(refunds.createdAt, filters.dateRange.to));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          refund: refunds,
          booking: {
            id: bookings.id,
            referenceNumber: bookings.referenceNumber,
            total: bookings.total,
            paidAmount: bookings.paidAmount,
            paymentStatus: bookings.paymentStatus,
          },
        })
        .from(refunds)
        .leftJoin(bookings, eq(refunds.bookingId, bookings.id))
        .where(and(...conditions))
        .orderBy(desc(refunds.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(refunds)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    const formattedData = data.map((row) => ({
      ...row.refund,
      booking: row.booking?.id ? row.booking : undefined,
    }));

    return {
      data: formattedData,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get refund by ID
   */
  async getById(id: string): Promise<RefundWithBooking> {
    const result = await this.db
      .select({
        refund: refunds,
        booking: {
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
          total: bookings.total,
          paidAmount: bookings.paidAmount,
          paymentStatus: bookings.paymentStatus,
        },
      })
      .from(refunds)
      .leftJoin(bookings, eq(refunds.bookingId, bookings.id))
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .limit(1);

    const row = result[0];
    if (!row) {
      throw new NotFoundError("Refund", id);
    }

    return {
      ...row.refund,
      booking: row.booking?.id ? row.booking : undefined,
    };
  }

  /**
   * Get refunds for a booking
   */
  async getForBooking(bookingId: string): Promise<Refund[]> {
    return this.db
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.organizationId, this.organizationId),
          eq(refunds.bookingId, bookingId)
        )
      )
      .orderBy(desc(refunds.createdAt));
  }

  /**
   * Create a refund record (without processing via Stripe yet)
   */
  async create(input: CreateRefundInput): Promise<Refund> {
    // Validate booking exists and belongs to organization
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Validate refund amount
    const refundAmount = parseFloat(input.amount);
    const paidAmount = parseFloat(booking.paidAmount || "0");

    // Get total already refunded
    const existingRefunds = await this.db
      .select({ total: sum(refunds.amount) })
      .from(refunds)
      .where(
        and(
          eq(refunds.bookingId, input.bookingId),
          eq(refunds.status, "succeeded")
        )
      );

    const totalRefunded = parseFloat(existingRefunds[0]?.total || "0");
    const availableForRefund = paidAmount - totalRefunded;

    if (refundAmount > availableForRefund) {
      throw new ValidationError(
        `Refund amount ($${refundAmount.toFixed(2)}) exceeds available refundable amount ($${availableForRefund.toFixed(2)})`
      );
    }

    if (refundAmount <= 0) {
      throw new ValidationError("Refund amount must be greater than 0");
    }

    // Create refund record
    const [refund] = await this.db
      .insert(refunds)
      .values({
        organizationId: this.organizationId,
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency || booking.currency,
        status: "pending",
        reason: input.reason,
        reasonDetails: input.reasonDetails,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
        internalNotes: input.internalNotes,
      })
      .returning();

    if (!refund) {
      throw new ServiceError("Failed to create refund", "CREATE_FAILED", 500);
    }

    return refund;
  }

  /**
   * Mark refund as processing (being sent to Stripe)
   */
  async markProcessing(id: string): Promise<Refund> {
    const [refund] = await this.db
      .update(refunds)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .returning();

    if (!refund) {
      throw new NotFoundError("Refund", id);
    }

    return refund;
  }

  /**
   * Mark refund as succeeded (after Stripe confirms)
   */
  async markSucceeded(id: string, stripeRefundId: string): Promise<Refund> {
    const [refund] = await this.db
      .update(refunds)
      .set({
        status: "succeeded",
        stripeRefundId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .returning();

    if (!refund) {
      throw new NotFoundError("Refund", id);
    }

    // Update booking payment status
    await this.updateBookingPaymentStatus(refund.bookingId);

    return refund;
  }

  /**
   * Mark refund as failed
   */
  async markFailed(id: string, errorMessage: string): Promise<Refund> {
    const [refund] = await this.db
      .update(refunds)
      .set({
        status: "failed",
        stripeErrorMessage: errorMessage,
        updatedAt: new Date(),
      })
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .returning();

    if (!refund) {
      throw new NotFoundError("Refund", id);
    }

    return refund;
  }

  /**
   * Cancel a pending refund
   */
  async cancel(id: string): Promise<Refund> {
    const refund = await this.getById(id);

    if (refund.status !== "pending") {
      throw new ValidationError(
        `Cannot cancel refund in '${refund.status}' status`
      );
    }

    const [updatedRefund] = await this.db
      .update(refunds)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .returning();

    if (!updatedRefund) {
      throw new NotFoundError("Refund", id);
    }

    return updatedRefund;
  }

  /**
   * Update booking payment status after refund
   */
  private async updateBookingPaymentStatus(bookingId: string): Promise<void> {
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) return;

    // Calculate total refunded
    const refundedResult = await this.db
      .select({ total: sum(refunds.amount) })
      .from(refunds)
      .where(
        and(eq(refunds.bookingId, bookingId), eq(refunds.status, "succeeded"))
      );

    const totalRefunded = parseFloat(refundedResult[0]?.total || "0");
    const paidAmount = parseFloat(booking.paidAmount || "0");

    let newPaymentStatus: "pending" | "partial" | "paid" | "refunded" | "failed";
    if (totalRefunded >= paidAmount) {
      newPaymentStatus = "refunded";
    } else if (totalRefunded > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed";
    }

    await this.db
      .update(bookings)
      .set({
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Process refund manually (mark as succeeded without Stripe)
   * Used for manual refunds (cash, bank transfer, etc.)
   */
  async processManual(id: string): Promise<Refund> {
    const refund = await this.getById(id);

    if (refund.status !== "pending") {
      throw new ValidationError(
        `Cannot process refund in '${refund.status}' status. Only pending refunds can be processed.`
      );
    }

    const [updatedRefund] = await this.db
      .update(refunds)
      .set({
        status: "succeeded",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(refunds.id, id), eq(refunds.organizationId, this.organizationId))
      )
      .returning();

    if (!updatedRefund) {
      throw new NotFoundError("Refund", id);
    }

    // Update booking payment status
    await this.updateBookingPaymentStatus(updatedRefund.bookingId);

    return updatedRefund;
  }

  /**
   * Get refund stats
   */
  async getStats(dateRange?: DateRangeFilter): Promise<{
    total: number;
    pending: number;
    succeeded: number;
    failed: number;
    totalAmount: number;
    successAmount: number;
  }> {
    const conditions = [eq(refunds.organizationId, this.organizationId)];

    if (dateRange?.from) {
      conditions.push(gte(refunds.createdAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(refunds.createdAt, dateRange.to));
    }

    const statsResult = await this.db
      .select({
        total: count(),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${refunds.status} = 'pending')`,
        succeeded: sql<number>`COUNT(*) FILTER (WHERE ${refunds.status} = 'succeeded')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${refunds.status} = 'failed')`,
        totalAmount: sql<number>`COALESCE(SUM(${refunds.amount}::numeric), 0)`,
        successAmount: sql<number>`COALESCE(SUM(${refunds.amount}::numeric) FILTER (WHERE ${refunds.status} = 'succeeded'), 0)`,
      })
      .from(refunds)
      .where(and(...conditions));

    const stats = statsResult[0];

    return {
      total: stats?.total ?? 0,
      pending: Number(stats?.pending ?? 0),
      succeeded: Number(stats?.succeeded ?? 0),
      failed: Number(stats?.failed ?? 0),
      totalAmount: Number(stats?.totalAmount ?? 0),
      successAmount: Number(stats?.successAmount ?? 0),
    };
  }
}
