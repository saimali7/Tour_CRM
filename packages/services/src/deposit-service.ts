import { eq, and, sql, lte, gte, or } from "drizzle-orm";
import { db } from "@tour/database";
import {
  bookings,
  tours,
} from "@tour/database/schema";
import type { ServiceContext } from "./types";

export interface DepositCalculation {
  total: number;
  depositAmount: number;
  balanceAmount: number;
  balanceDueDate: Date | null;
  depositRequired: boolean;
}

export class DepositService {
  constructor(private ctx: ServiceContext) {}

  // ==========================================
  // Deposit Calculations
  // ==========================================

  async calculateDeposit(
    tourId: string,
    bookingTotal: number,
    scheduleDate: Date
  ): Promise<DepositCalculation> {
    // Get tour deposit settings
    const tourResults = await db
      .select()
      .from(tours)
      .where(
        and(
          eq(tours.id, tourId),
          eq(tours.organizationId, this.ctx.organizationId)
        )
      )
      .limit(1);

    const tour = tourResults[0];

    if (!tour || !tour.depositEnabled) {
      return {
        total: bookingTotal,
        depositAmount: bookingTotal,
        balanceAmount: 0,
        balanceDueDate: null,
        depositRequired: false,
      };
    }

    // Calculate deposit amount
    let depositAmount: number;

    if (tour.depositType === "percentage" && tour.depositAmount) {
      // Percentage of total
      const percentage = parseFloat(tour.depositAmount);
      depositAmount = Math.round((bookingTotal * percentage) / 100 * 100) / 100;
    } else if (tour.depositType === "fixed" && tour.depositAmount) {
      // Fixed amount (but not more than total)
      depositAmount = Math.min(parseFloat(tour.depositAmount), bookingTotal);
    } else {
      // Default to full amount
      depositAmount = bookingTotal;
    }

    const balanceAmount = bookingTotal - depositAmount;

    // Calculate balance due date
    let balanceDueDate: Date | null = null;
    if (balanceAmount > 0 && tour.balanceDueDays !== null) {
      balanceDueDate = new Date(scheduleDate);
      balanceDueDate.setDate(balanceDueDate.getDate() - (tour.balanceDueDays || 0));

      // If balance due date is in the past, set it to today
      if (balanceDueDate < new Date()) {
        balanceDueDate = new Date();
      }
    }

    return {
      total: bookingTotal,
      depositAmount,
      balanceAmount,
      balanceDueDate,
      depositRequired: true,
    };
  }

  // ==========================================
  // Deposit Tracking
  // ==========================================

  async recordDepositPayment(
    bookingId: string,
    amount: number,
    stripePaymentIntentId?: string
  ) {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const currentDeposit = parseFloat(booking.depositPaid || "0");
    const newDepositPaid = currentDeposit + amount;
    const depositRequired = parseFloat(booking.depositRequired || "0");

    // Determine new payment status
    let paymentStatus: "pending" | "partial" | "paid" = "pending";
    const totalPaid = parseFloat(booking.paidAmount || "0") + amount;
    const total = parseFloat(booking.total);

    if (totalPaid >= total) {
      paymentStatus = "paid";
    } else if (newDepositPaid >= depositRequired || totalPaid > 0) {
      paymentStatus = "partial";
    }

    const results = await db
      .update(bookings)
      .set({
        depositPaid: newDepositPaid.toFixed(2),
        depositPaidAt: new Date(),
        paidAmount: totalPaid.toFixed(2),
        paymentStatus,
        stripePaymentIntentId: stripePaymentIntentId || booking.stripePaymentIntentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  async recordBalancePayment(
    bookingId: string,
    amount: number,
    stripePaymentIntentId?: string
  ) {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const totalPaid = parseFloat(booking.paidAmount || "0") + amount;
    const total = parseFloat(booking.total);

    const paymentStatus = totalPaid >= total ? "paid" : "partial";

    const results = await db
      .update(bookings)
      .set({
        paidAmount: totalPaid.toFixed(2),
        paymentStatus,
        balancePaidAt: paymentStatus === "paid" ? new Date() : booking.balancePaidAt,
        stripePaymentIntentId: stripePaymentIntentId || booking.stripePaymentIntentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  // ==========================================
  // Balance Due Tracking
  // ==========================================

  async getBookingsWithBalanceDue(options?: {
    dueBefore?: Date;
    dueAfter?: Date;
    includeOverdue?: boolean;
  }) {
    const conditions = [
      eq(bookings.organizationId, this.ctx.organizationId),
      eq(bookings.status, "confirmed"),
      or(
        eq(bookings.paymentStatus, "pending"),
        eq(bookings.paymentStatus, "partial")
      )!,
      sql`${bookings.depositRequired}::numeric > 0`,
    ];

    if (options?.dueBefore) {
      conditions.push(lte(bookings.balanceDueDate, options.dueBefore));
    }
    if (options?.dueAfter) {
      conditions.push(gte(bookings.balanceDueDate, options.dueAfter));
    }
    if (!options?.includeOverdue) {
      conditions.push(gte(bookings.balanceDueDate, new Date()));
    }

    return db
      .select({
        booking: bookings,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(and(...conditions))
      .orderBy(bookings.balanceDueDate);
  }

  async getOverdueBalances() {
    const now = new Date();

    return db
      .select({
        booking: bookings,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.status, "confirmed"),
          or(
            eq(bookings.paymentStatus, "pending"),
            eq(bookings.paymentStatus, "partial")
          )!,
          lte(bookings.balanceDueDate, now),
          sql`${bookings.paidAmount}::numeric < ${bookings.total}::numeric`
        )
      )
      .orderBy(bookings.balanceDueDate);
  }

  async getBalancesDueSoon(days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return db
      .select({
        booking: bookings,
        tour: {
          id: tours.id,
          name: tours.name,
        },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.status, "confirmed"),
          or(
            eq(bookings.paymentStatus, "pending"),
            eq(bookings.paymentStatus, "partial")
          )!,
          gte(bookings.balanceDueDate, now),
          lte(bookings.balanceDueDate, futureDate),
          sql`${bookings.paidAmount}::numeric < ${bookings.total}::numeric`
        )
      )
      .orderBy(bookings.balanceDueDate);
  }

  // ==========================================
  // Deposit Statistics
  // ==========================================

  async getDepositStats() {
    // Total deposits collected
    const [depositStats] = await db
      .select({
        totalDeposits: sql<string>`COALESCE(SUM(${bookings.depositPaid}::numeric), 0)`,
        totalRequired: sql<string>`COALESCE(SUM(${bookings.depositRequired}::numeric), 0)`,
        bookingsWithDeposit: sql<number>`COUNT(CASE WHEN ${bookings.depositRequired}::numeric > 0 THEN 1 END)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.status, "confirmed")
        )
      );

    // Outstanding balances
    const [balanceStats] = await db
      .select({
        totalOutstanding: sql<string>`COALESCE(SUM(${bookings.total}::numeric - ${bookings.paidAmount}::numeric), 0)`,
        bookingsWithBalance: sql<number>`COUNT(CASE WHEN ${bookings.paidAmount}::numeric < ${bookings.total}::numeric THEN 1 END)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.status, "confirmed"),
          or(
            eq(bookings.paymentStatus, "pending"),
            eq(bookings.paymentStatus, "partial")
          )
        )
      );

    // Overdue count
    const [overdueStats] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric - ${bookings.paidAmount}::numeric), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.ctx.organizationId),
          eq(bookings.status, "confirmed"),
          or(
            eq(bookings.paymentStatus, "pending"),
            eq(bookings.paymentStatus, "partial")
          ),
          lte(bookings.balanceDueDate, new Date()),
          sql`${bookings.paidAmount}::numeric < ${bookings.total}::numeric`
        )
      );

    return {
      totalDepositsCollected: parseFloat(depositStats?.totalDeposits || "0"),
      totalDepositsRequired: parseFloat(depositStats?.totalRequired || "0"),
      bookingsWithDeposit: Number(depositStats?.bookingsWithDeposit || 0),
      totalOutstandingBalance: parseFloat(balanceStats?.totalOutstanding || "0"),
      bookingsWithBalance: Number(balanceStats?.bookingsWithBalance || 0),
      overdueCount: Number(overdueStats?.count || 0),
      overdueAmount: parseFloat(overdueStats?.total || "0"),
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async getBookingById(id: string) {
    const results = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.organizationId, this.ctx.organizationId)
        )
      )
      .limit(1);

    return results[0] || null;
  }

  getPaymentBreakdown(booking: {
    total: string;
    depositRequired: string | null;
    depositPaid: string | null;
    paidAmount: string | null;
    balanceDueDate: Date | null;
  }) {
    const total = parseFloat(booking.total);
    const depositRequired = parseFloat(booking.depositRequired || "0");
    const depositPaid = parseFloat(booking.depositPaid || "0");
    const paidAmount = parseFloat(booking.paidAmount || "0");

    const balanceRequired = total - depositRequired;
    const balancePaid = paidAmount - depositPaid;
    const totalRemaining = total - paidAmount;

    return {
      total,
      deposit: {
        required: depositRequired,
        paid: depositPaid,
        remaining: Math.max(0, depositRequired - depositPaid),
        isComplete: depositPaid >= depositRequired,
      },
      balance: {
        required: balanceRequired,
        paid: balancePaid,
        remaining: Math.max(0, balanceRequired - balancePaid),
        dueDate: booking.balanceDueDate,
        isOverdue: booking.balanceDueDate
          ? new Date(booking.balanceDueDate) < new Date()
          : false,
      },
      totalPaid: paidAmount,
      totalRemaining,
      isFullyPaid: paidAmount >= total,
    };
  }
}
