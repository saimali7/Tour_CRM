import { eq, and, desc, asc, ilike, sql, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "@tour/database";
import {
  giftVouchers,
  voucherRedemptions,
  bookings,
} from "@tour/database/schema";
import type {
  NewGiftVoucher,
  GiftVoucher,
  VoucherType,
  VoucherStatus,
} from "@tour/database/schema";
import type { ServiceContext } from "./types";

export class VoucherService {
  constructor(private ctx: ServiceContext) {}

  // ==========================================
  // Voucher CRUD
  // ==========================================

  async getVouchers(
    filters?: {
      status?: VoucherStatus;
      type?: VoucherType;
      search?: string;
      recipientEmail?: string;
      purchaserEmail?: string;
      expiringWithinDays?: number;
    },
    sortField?: "createdAt" | "expiresAt" | "monetaryValue",
    sortDirection?: "asc" | "desc",
    limit?: number,
    offset?: number
  ) {
    const conditions = [eq(giftVouchers.organizationId, this.ctx.organizationId)];

    if (filters?.status) {
      conditions.push(eq(giftVouchers.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(giftVouchers.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(giftVouchers.code, `%${filters.search}%`),
          ilike(giftVouchers.recipientName, `%${filters.search}%`),
          ilike(giftVouchers.purchaserName, `%${filters.search}%`)
        )!
      );
    }
    if (filters?.recipientEmail) {
      conditions.push(eq(giftVouchers.recipientEmail, filters.recipientEmail));
    }
    if (filters?.purchaserEmail) {
      conditions.push(eq(giftVouchers.purchaserEmail, filters.purchaserEmail));
    }
    if (filters?.expiringWithinDays !== undefined) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      conditions.push(
        and(
          lte(giftVouchers.expiresAt, futureDate),
          gte(giftVouchers.expiresAt, new Date())
        )!
      );
    }

    const orderBy = sortField
      ? sortDirection === "desc"
        ? desc(giftVouchers[sortField])
        : asc(giftVouchers[sortField])
      : desc(giftVouchers.createdAt);

    let query = db
      .select()
      .from(giftVouchers)
      .where(and(...conditions))
      .orderBy(orderBy);

    if (limit) {
      query = query.limit(limit) as typeof query;
    }
    if (offset) {
      query = query.offset(offset) as typeof query;
    }

    return query;
  }

  async getVoucherById(id: string) {
    const results = await db
      .select()
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.id, id),
          eq(giftVouchers.organizationId, this.ctx.organizationId)
        )
      )
      .limit(1);

    return results[0] || null;
  }

  async getVoucherByCode(code: string) {
    const results = await db
      .select()
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.code, code.toUpperCase()),
          eq(giftVouchers.organizationId, this.ctx.organizationId)
        )
      )
      .limit(1);

    return results[0] || null;
  }

  async createVoucher(
    data: Omit<NewGiftVoucher, "organizationId" | "code" | "remainingValue"> & {
      code?: string;
    }
  ) {
    const code = data.code?.toUpperCase() || this.generateVoucherCode();

    // Set remaining value for monetary vouchers
    const remainingValue =
      data.type === "monetary" ? data.monetaryValue : undefined;

    const results = await db
      .insert(giftVouchers)
      .values({
        ...data,
        code,
        remainingValue,
        organizationId: this.ctx.organizationId,
      })
      .returning();

    const voucher = results[0];
    if (!voucher) {
      throw new Error("Failed to create voucher");
    }
    return voucher;
  }

  async updateVoucher(
    id: string,
    data: Partial<
      Omit<NewGiftVoucher, "organizationId" | "id" | "code" | "remainingValue">
    >
  ) {
    const results = await db
      .update(giftVouchers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(giftVouchers.id, id),
          eq(giftVouchers.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  async cancelVoucher(id: string) {
    return this.updateVoucher(id, { status: "cancelled" });
  }

  // ==========================================
  // Voucher Validation & Redemption
  // ==========================================

  async validateVoucher(code: string): Promise<{
    valid: boolean;
    voucher?: GiftVoucher | null;
    error?: string;
    value?: number;
    type?: VoucherType;
  }> {
    const voucher = await this.getVoucherByCode(code);

    if (!voucher) {
      return { valid: false, error: "Voucher not found" };
    }

    // Check status
    if (voucher.status === "redeemed") {
      return { valid: false, voucher, error: "Voucher has already been redeemed" };
    }
    if (voucher.status === "cancelled") {
      return { valid: false, voucher, error: "Voucher has been cancelled" };
    }
    if (voucher.status === "expired") {
      return { valid: false, voucher, error: "Voucher has expired" };
    }

    // Check expiry
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      // Auto-expire the voucher
      await this.updateVoucher(voucher.id, { status: "expired" });
      return { valid: false, voucher, error: "Voucher has expired" };
    }

    // Check valid from date
    if (new Date(voucher.validFrom) > new Date()) {
      return { valid: false, voucher, error: "Voucher is not yet valid" };
    }

    // Calculate available value
    let value: number | undefined;
    if (voucher.type === "monetary") {
      value = parseFloat(voucher.remainingValue || voucher.monetaryValue || "0");
    } else if (voucher.type === "percentage") {
      value = voucher.percentageValue || 0;
    }

    return {
      valid: true,
      voucher,
      value,
      type: voucher.type,
    };
  }

  async redeemVoucher(
    code: string,
    bookingId: string,
    amountToRedeem?: number
  ): Promise<{
    success: boolean;
    amountRedeemed?: number;
    remainingValue?: number;
    error?: string;
  }> {
    const validation = await this.validateVoucher(code);

    if (!validation.valid || !validation.voucher) {
      return { success: false, error: validation.error };
    }

    const voucher = validation.voucher;

    // Handle different voucher types
    if (voucher.type === "monetary") {
      const availableValue = parseFloat(
        voucher.remainingValue || voucher.monetaryValue || "0"
      );
      const redeeming = amountToRedeem
        ? Math.min(amountToRedeem, availableValue)
        : availableValue;

      const newRemaining = availableValue - redeeming;

      // Record redemption
      await db.insert(voucherRedemptions).values({
        organizationId: this.ctx.organizationId,
        voucherId: voucher.id,
        bookingId,
        amountRedeemed: redeeming.toFixed(2),
        remainingAfter: newRemaining.toFixed(2),
      });

      // Update voucher status
      const newStatus: VoucherStatus =
        newRemaining <= 0 ? "redeemed" : "partially_redeemed";

      await db
        .update(giftVouchers)
        .set({
          remainingValue: newRemaining.toFixed(2),
          status: newStatus,
          redeemedAt: newStatus === "redeemed" ? new Date() : undefined,
          redeemedBookingId: newStatus === "redeemed" ? bookingId : undefined,
          updatedAt: new Date(),
        })
        .where(eq(giftVouchers.id, voucher.id));

      return {
        success: true,
        amountRedeemed: redeeming,
        remainingValue: newRemaining,
      };
    } else if (voucher.type === "tour" || voucher.type === "percentage") {
      // Tour and percentage vouchers are fully redeemed in one go
      await db
        .update(giftVouchers)
        .set({
          status: "redeemed",
          redeemedAt: new Date(),
          redeemedBookingId: bookingId,
          updatedAt: new Date(),
        })
        .where(eq(giftVouchers.id, voucher.id));

      // Record redemption
      await db.insert(voucherRedemptions).values({
        organizationId: this.ctx.organizationId,
        voucherId: voucher.id,
        bookingId,
        amountRedeemed: voucher.monetaryValue || "0",
        remainingAfter: "0",
      });

      return {
        success: true,
        amountRedeemed: validation.value,
        remainingValue: 0,
      };
    }

    return { success: false, error: "Unknown voucher type" };
  }

  // ==========================================
  // Redemption History
  // ==========================================

  async getRedemptionHistory(voucherId: string) {
    return db
      .select({
        redemption: voucherRedemptions,
        booking: bookings,
      })
      .from(voucherRedemptions)
      .innerJoin(bookings, eq(voucherRedemptions.bookingId, bookings.id))
      .where(
        and(
          eq(voucherRedemptions.voucherId, voucherId),
          eq(voucherRedemptions.organizationId, this.ctx.organizationId)
        )
      )
      .orderBy(desc(voucherRedemptions.redeemedAt));
  }

  async getBookingVouchers(bookingId: string) {
    return db
      .select({
        redemption: voucherRedemptions,
        voucher: giftVouchers,
      })
      .from(voucherRedemptions)
      .innerJoin(giftVouchers, eq(voucherRedemptions.voucherId, giftVouchers.id))
      .where(
        and(
          eq(voucherRedemptions.bookingId, bookingId),
          eq(voucherRedemptions.organizationId, this.ctx.organizationId)
        )
      );
  }

  // ==========================================
  // Delivery
  // ==========================================

  async markDelivered(id: string) {
    return this.updateVoucher(id, { deliveredAt: new Date() } as { deliveredAt: Date });
  }

  async getUndeliveredVouchers() {
    return db
      .select()
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.organizationId, this.ctx.organizationId),
          isNull(giftVouchers.deliveredAt),
          eq(giftVouchers.status, "active")
        )
      )
      .orderBy(giftVouchers.createdAt);
  }

  // ==========================================
  // Analytics
  // ==========================================

  async getVoucherStats() {
    const now = new Date();

    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.organizationId, this.ctx.organizationId),
          eq(giftVouchers.status, "active")
        )
      );

    const [redeemedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.organizationId, this.ctx.organizationId),
          eq(giftVouchers.status, "redeemed")
        )
      );

    const [totalValue] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${giftVouchers.purchaseAmount}::numeric), 0)`,
      })
      .from(giftVouchers)
      .where(eq(giftVouchers.organizationId, this.ctx.organizationId));

    const [outstandingValue] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${giftVouchers.remainingValue}::numeric), 0)`,
      })
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.organizationId, this.ctx.organizationId),
          or(
            eq(giftVouchers.status, "active"),
            eq(giftVouchers.status, "partially_redeemed")
          )
        )
      );

    // Expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [expiringSoonCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(giftVouchers)
      .where(
        and(
          eq(giftVouchers.organizationId, this.ctx.organizationId),
          or(
            eq(giftVouchers.status, "active"),
            eq(giftVouchers.status, "partially_redeemed")
          ),
          lte(giftVouchers.expiresAt, thirtyDaysFromNow),
          gte(giftVouchers.expiresAt, now)
        )
      );

    return {
      active: Number(activeCount?.count || 0),
      redeemed: Number(redeemedCount?.count || 0),
      totalSold: parseFloat(totalValue?.total || "0"),
      outstandingLiability: parseFloat(outstandingValue?.total || "0"),
      expiringSoon: Number(expiringSoonCount?.count || 0),
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private generateVoucherCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async generateUniqueCode(): Promise<string> {
    let code = this.generateVoucherCode();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await this.getVoucherByCode(code);
      if (!existing) {
        return code;
      }
      code = this.generateVoucherCode();
      attempts++;
    }

    throw new Error("Failed to generate unique voucher code");
  }
}
