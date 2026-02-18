import { eq, and, desc, asc, sql, count, gte, lte } from "drizzle-orm";
import {
  payments,
  bookings,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  type DateRangeFilter,
  NotFoundError,
  ValidationError,
  ServiceError,
} from "./types";
import { createServiceLogger } from "./lib/logger";
import {
  getCashCollectionMetadata,
  markCashCollectionCollected,
  withCashCollectionMetadata,
} from "./booking/cash-collection";

export interface PaymentFilters {
  bookingId?: string;
  method?: PaymentMethod;
  dateRange?: DateRangeFilter;
}

export type PaymentSortField = "recordedAt" | "amount";

export interface CreatePaymentInput {
  bookingId: string;
  amount: string;
  currency?: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  recordedBy: string;
  recordedByName?: string;
}

export interface PaymentStats {
  totalCollected: string;
  totalCount: number;
  byMethod: Record<PaymentMethod, { count: number; total: string }>;
  averagePaymentAmount: string;
}

export class PaymentService extends BaseService {
  private logger = createServiceLogger("payment", this.organizationId);

  /**
   * Get all payments with filters and pagination
   */
  async getAll(
    filters: PaymentFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<PaymentSortField> = { field: "recordedAt", direction: "desc" }
  ): Promise<PaginatedResult<Payment>> {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(payments.organizationId, this.organizationId)];

    if (filters.bookingId) {
      conditions.push(eq(payments.bookingId, filters.bookingId));
    }
    if (filters.method) {
      conditions.push(eq(payments.method, filters.method));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(payments.recordedAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(payments.recordedAt, filters.dateRange.to));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(payments[sort.field])
        : desc(payments[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(payments)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single payment by ID
   */
  async getById(id: string): Promise<Payment> {
    const payment = await this.db.query.payments.findFirst({
      where: and(
        eq(payments.id, id),
        eq(payments.organizationId, this.organizationId)
      ),
    });

    if (!payment) {
      throw new NotFoundError("Payment", id);
    }

    return payment;
  }

  /**
   * Get all payments for a specific booking
   */
  async listByBooking(bookingId: string): Promise<Payment[]> {
    // Verify booking exists and belongs to org
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    return this.db.query.payments.findMany({
      where: and(
        eq(payments.bookingId, bookingId),
        eq(payments.organizationId, this.organizationId)
      ),
      orderBy: desc(payments.recordedAt),
    });
  }

  /**
   * Calculate booking balance (total - sum of payments)
   */
  async getBookingBalance(bookingId: string): Promise<{
    bookingTotal: string;
    totalPaid: string;
    balance: string;
    currency: string;
  }> {
    // Get booking
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // Sum all payments
    const result = await this.db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)::TEXT`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, bookingId),
          eq(payments.organizationId, this.organizationId)
        )
      );

    const totalPaid = result[0]?.totalPaid || "0";
    const bookingTotal = booking.total;
    const balance = (parseFloat(bookingTotal) - parseFloat(totalPaid)).toFixed(2);

    return {
      bookingTotal,
      totalPaid,
      balance,
      currency: booking.currency,
    };
  }

  /**
   * Create a new payment record
   */
  async create(input: CreatePaymentInput): Promise<Payment> {
    this.logger.info(
      {
        bookingId: input.bookingId,
        amount: input.amount,
        method: input.method,
        recordedBy: input.recordedBy,
      },
      "Recording payment"
    );

    // Get booking and verify it exists
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, input.bookingId),
        eq(bookings.organizationId, this.organizationId)
      ),
    });

    if (!booking) {
      this.logger.warn({ bookingId: input.bookingId }, "Payment recording failed: booking not found");
      throw new NotFoundError("Booking", input.bookingId);
    }

    // Validate amount is positive
    const amount = parseFloat(input.amount);
    if (amount <= 0) {
      throw new ValidationError("Payment amount must be greater than 0");
    }

    // Get current balance
    const balanceInfo = await this.getBookingBalance(input.bookingId);
    const currentBalance = parseFloat(balanceInfo.balance);

    // Prevent overpayment - this is a business logic error
    // If you need to allow overpayments (e.g., for credits), use a different method
    if (amount > currentBalance && currentBalance > 0) {
      throw new ValidationError(
        `Payment amount ($${amount.toFixed(2)}) exceeds remaining balance ($${currentBalance.toFixed(2)}). ` +
        `Please enter an amount of $${currentBalance.toFixed(2)} or less.`
      );
    }

    // Prevent payment when already fully paid
    if (currentBalance <= 0) {
      throw new ValidationError(
        "This booking is already fully paid. No additional payment is needed."
      );
    }

    // Create payment record
    const [payment] = await this.db
      .insert(payments)
      .values({
        organizationId: this.organizationId,
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency || booking.currency,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        recordedBy: input.recordedBy,
        recordedByName: input.recordedByName,
      })
      .returning();

    if (!payment) {
      this.logger.error(
        { bookingId: input.bookingId, amount: input.amount },
        "Failed to create payment record"
      );
      throw new ServiceError("Failed to create payment", "CREATE_FAILED", 500);
    }

    // Calculate new total paid
    const newBalanceInfo = await this.getBookingBalance(input.bookingId);
    const totalPaid = parseFloat(newBalanceInfo.totalPaid);
    const bookingTotal = parseFloat(booking.total);

    // Update booking payment status
    let newPaymentStatus: PaymentStatus = "pending";
    if (totalPaid >= bookingTotal) {
      newPaymentStatus = "paid";
    } else if (totalPaid > 0) {
      newPaymentStatus = "partial";
    }

    const bookingMetadata = (booking.metadata as Record<string, unknown> | null | undefined) ?? {};
    const cashCollection = getCashCollectionMetadata(bookingMetadata);
    let updatedMetadata: Record<string, unknown> | undefined;
    if (cashCollection) {
      const expectedAmount = parseFloat(cashCollection.expectedAmount);
      if (Number.isFinite(expectedAmount) && totalPaid >= expectedAmount) {
        updatedMetadata = withCashCollectionMetadata(
          bookingMetadata,
          markCashCollectionCollected(
            cashCollection,
            newBalanceInfo.totalPaid,
            input.recordedBy
          )
        );
      }
    }

    await this.db
      .update(bookings)
      .set({
        paymentStatus: newPaymentStatus,
        paidAmount: newBalanceInfo.totalPaid,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, input.bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    this.logger.info(
      {
        paymentId: payment.id,
        bookingId: input.bookingId,
        amount: input.amount,
        method: input.method,
        previousStatus: booking.paymentStatus,
        newStatus: newPaymentStatus,
        totalPaid: newBalanceInfo.totalPaid,
        balance: newBalanceInfo.balance,
      },
      "Payment recorded successfully"
    );

    return payment;
  }

  /**
   * Delete a payment (admin only)
   */
  async delete(id: string): Promise<void> {
    // Get the payment
    const payment = await this.getById(id);

    // Delete the payment
    await this.db
      .delete(payments)
      .where(
        and(eq(payments.id, id), eq(payments.organizationId, this.organizationId))
      );

    // Recalculate booking payment status
    const balanceInfo = await this.getBookingBalance(payment.bookingId);
    const booking = await this.db.query.bookings.findFirst({
      where: eq(bookings.id, payment.bookingId),
    });

    if (!booking) {
      return;
    }

    const totalPaid = parseFloat(balanceInfo.totalPaid);
    const bookingTotal = parseFloat(booking.total);

    let newPaymentStatus: PaymentStatus = "pending";
    if (totalPaid >= bookingTotal) {
      newPaymentStatus = "paid";
    } else if (totalPaid > 0) {
      newPaymentStatus = "partial";
    }

    const bookingMetadata = (booking.metadata as Record<string, unknown> | null | undefined) ?? {};
    const cashCollection = getCashCollectionMetadata(bookingMetadata);
    let updatedMetadata: Record<string, unknown> | undefined;
    if (cashCollection) {
      const expectedAmount = parseFloat(cashCollection.expectedAmount);
      if (!Number.isFinite(expectedAmount) || totalPaid < expectedAmount) {
        updatedMetadata = withCashCollectionMetadata(bookingMetadata, {
          ...cashCollection,
          status: "pending",
          collectedAt: undefined,
          collectedAmount: undefined,
          history: [
            ...cashCollection.history,
            {
              at: new Date().toISOString(),
              action: "updated",
              expectedAmount: cashCollection.expectedAmount,
              actorId: this.userId,
            },
          ],
        });
      }
    }

    await this.db
      .update(bookings)
      .set({
        paymentStatus: newPaymentStatus,
        paidAmount: balanceInfo.totalPaid,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, payment.bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Get payment statistics
   */
  async getStats(filters: { dateRange?: DateRangeFilter } = {}): Promise<PaymentStats> {
    const conditions = [eq(payments.organizationId, this.organizationId)];

    if (filters.dateRange?.from) {
      conditions.push(gte(payments.recordedAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(payments.recordedAt, filters.dateRange.to));
    }

    // Get all payments for processing
    const allPayments = await this.db
      .select({
        amount: payments.amount,
        method: payments.method,
      })
      .from(payments)
      .where(and(...conditions));

    // Calculate stats
    let totalCollected = 0;
    const byMethod: Record<PaymentMethod, { count: number; total: string }> = {
      cash: { count: 0, total: "0" },
      card: { count: 0, total: "0" },
      bank_transfer: { count: 0, total: "0" },
      check: { count: 0, total: "0" },
      other: { count: 0, total: "0" },
    };

    for (const payment of allPayments) {
      const amount = parseFloat(payment.amount);
      totalCollected += amount;

      const method = payment.method as PaymentMethod;
      byMethod[method].count += 1;
      byMethod[method].total = (
        parseFloat(byMethod[method].total) + amount
      ).toFixed(2);
    }

    const totalCount = allPayments.length;
    const averagePaymentAmount =
      totalCount > 0 ? (totalCollected / totalCount).toFixed(2) : "0";

    return {
      totalCollected: totalCollected.toFixed(2),
      totalCount,
      byMethod,
      averagePaymentAmount,
    };
  }
}
