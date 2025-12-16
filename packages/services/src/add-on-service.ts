import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";
import { db } from "@tour/database";
import {
  addOnProducts,
  tourAddOns,
  bookingAddOns,
} from "@tour/database/schema";
import type {
  NewAddOnProduct,
  AddOnType,
  BookingAddOnStatus,
} from "@tour/database/schema";
import type { ServiceContext } from "./types";

export class AddOnService {
  constructor(private ctx: ServiceContext) {}

  // ==========================================
  // Add-On Products (CRUD)
  // ==========================================

  async getProducts(
    filters?: {
      isActive?: boolean;
      category?: string;
      type?: AddOnType;
      search?: string;
    },
    sortField?: "name" | "price" | "createdAt",
    sortDirection?: "asc" | "desc"
  ) {
    const conditions = [eq(addOnProducts.organizationId, this.ctx.organizationId)];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(addOnProducts.isActive, filters.isActive));
    }
    if (filters?.category) {
      conditions.push(eq(addOnProducts.category, filters.category));
    }
    if (filters?.type) {
      conditions.push(eq(addOnProducts.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(ilike(addOnProducts.name, `%${filters.search}%`));
    }

    const orderBy = sortField
      ? sortDirection === "desc"
        ? desc(addOnProducts[sortField])
        : asc(addOnProducts[sortField])
      : asc(addOnProducts.sortOrder);

    return db
      .select()
      .from(addOnProducts)
      .where(and(...conditions))
      .orderBy(orderBy);
  }

  async getProductById(id: string) {
    const results = await db
      .select()
      .from(addOnProducts)
      .where(
        and(
          eq(addOnProducts.id, id),
          eq(addOnProducts.organizationId, this.ctx.organizationId)
        )
      )
      .limit(1);

    return results[0] || null;
  }

  async createProduct(data: Omit<NewAddOnProduct, "organizationId">) {
    const results = await db
      .insert(addOnProducts)
      .values({
        ...data,
        organizationId: this.ctx.organizationId,
      })
      .returning();

    const product = results[0];
    if (!product) {
      throw new Error("Failed to create add-on product");
    }
    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<Omit<NewAddOnProduct, "organizationId" | "id">>
  ) {
    const results = await db
      .update(addOnProducts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addOnProducts.id, id),
          eq(addOnProducts.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  async deleteProduct(id: string) {
    // Soft delete - set inactive
    const results = await db
      .update(addOnProducts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(addOnProducts.id, id),
          eq(addOnProducts.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results.length > 0;
  }

  async getCategories() {
    const results = await db
      .selectDistinct({ category: addOnProducts.category })
      .from(addOnProducts)
      .where(
        and(
          eq(addOnProducts.organizationId, this.ctx.organizationId),
          eq(addOnProducts.isActive, true),
          sql`${addOnProducts.category} IS NOT NULL`
        )
      )
      .orderBy(addOnProducts.category);

    return results.map((r) => r.category).filter(Boolean) as string[];
  }

  // ==========================================
  // Tour Add-Ons (Associations)
  // ==========================================

  async getTourAddOns(tourId: string) {
    return db
      .select({
        tourAddOn: tourAddOns,
        product: addOnProducts,
      })
      .from(tourAddOns)
      .innerJoin(addOnProducts, eq(tourAddOns.addOnProductId, addOnProducts.id))
      .where(
        and(
          eq(tourAddOns.tourId, tourId),
          eq(tourAddOns.organizationId, this.ctx.organizationId),
          eq(addOnProducts.isActive, true)
        )
      )
      .orderBy(tourAddOns.sortOrder);
  }

  async addToTour(data: {
    tourId: string;
    addOnProductId: string;
    priceOverride?: string;
    isRequired?: boolean;
    isRecommended?: boolean;
    sortOrder?: number;
  }) {
    const results = await db
      .insert(tourAddOns)
      .values({
        organizationId: this.ctx.organizationId,
        tourId: data.tourId,
        addOnProductId: data.addOnProductId,
        priceOverride: data.priceOverride,
        isRequired: data.isRequired ?? false,
        isRecommended: data.isRecommended ?? false,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    const tourAddOn = results[0];
    if (!tourAddOn) {
      throw new Error("Failed to add add-on to tour");
    }
    return tourAddOn;
  }

  async removeFromTour(tourId: string, addOnProductId: string) {
    const results = await db
      .delete(tourAddOns)
      .where(
        and(
          eq(tourAddOns.tourId, tourId),
          eq(tourAddOns.addOnProductId, addOnProductId),
          eq(tourAddOns.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results.length > 0;
  }

  async updateTourAddOn(
    tourId: string,
    addOnProductId: string,
    data: {
      priceOverride?: string | null;
      isRequired?: boolean;
      isRecommended?: boolean;
      sortOrder?: number;
    }
  ) {
    const results = await db
      .update(tourAddOns)
      .set(data)
      .where(
        and(
          eq(tourAddOns.tourId, tourId),
          eq(tourAddOns.addOnProductId, addOnProductId),
          eq(tourAddOns.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  // ==========================================
  // Booking Add-Ons
  // ==========================================

  async getBookingAddOns(bookingId: string) {
    return db
      .select({
        bookingAddOn: bookingAddOns,
        product: addOnProducts,
      })
      .from(bookingAddOns)
      .innerJoin(addOnProducts, eq(bookingAddOns.addOnProductId, addOnProducts.id))
      .where(
        and(
          eq(bookingAddOns.bookingId, bookingId),
          eq(bookingAddOns.organizationId, this.ctx.organizationId)
        )
      );
  }

  async addToBooking(data: {
    bookingId: string;
    addOnProductId: string;
    quantity: number;
    unitPrice: string;
    additionalInfo?: string;
  }) {
    const totalPrice = (parseFloat(data.unitPrice) * data.quantity).toFixed(2);

    const results = await db
      .insert(bookingAddOns)
      .values({
        organizationId: this.ctx.organizationId,
        bookingId: data.bookingId,
        addOnProductId: data.addOnProductId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice,
        additionalInfo: data.additionalInfo,
        status: "confirmed",
      })
      .returning();

    const bookingAddOn = results[0];
    if (!bookingAddOn) {
      throw new Error("Failed to add add-on to booking");
    }
    return bookingAddOn;
  }

  async updateBookingAddOn(
    id: string,
    data: {
      quantity?: number;
      additionalInfo?: string;
      status?: BookingAddOnStatus;
    }
  ) {
    // If quantity changes, recalculate total
    const updateData: Record<string, unknown> = { ...data };

    if (data.quantity !== undefined) {
      const existing = await db
        .select()
        .from(bookingAddOns)
        .where(
          and(
            eq(bookingAddOns.id, id),
            eq(bookingAddOns.organizationId, this.ctx.organizationId)
          )
        )
        .limit(1);

      if (existing[0]) {
        updateData.totalPrice = (
          parseFloat(existing[0].unitPrice) * data.quantity
        ).toFixed(2);
      }
    }

    const results = await db
      .update(bookingAddOns)
      .set(updateData)
      .where(
        and(
          eq(bookingAddOns.id, id),
          eq(bookingAddOns.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results[0] || null;
  }

  async removeFromBooking(id: string) {
    const results = await db
      .delete(bookingAddOns)
      .where(
        and(
          eq(bookingAddOns.id, id),
          eq(bookingAddOns.organizationId, this.ctx.organizationId)
        )
      )
      .returning();

    return results.length > 0;
  }

  async cancelBookingAddOn(id: string) {
    return this.updateBookingAddOn(id, { status: "cancelled" });
  }

  // ==========================================
  // Calculations
  // ==========================================

  async calculateAddOnsTotal(bookingId: string): Promise<number> {
    const addOns = await this.getBookingAddOns(bookingId);
    return addOns.reduce((sum, { bookingAddOn }) => {
      if (bookingAddOn.status === "confirmed") {
        return sum + parseFloat(bookingAddOn.totalPrice);
      }
      return sum;
    }, 0);
  }

  async getAvailableAddOnsForTour(tourId: string) {
    // Get tour-specific add-ons plus any universal add-ons
    const tourSpecific = await this.getTourAddOns(tourId);

    return tourSpecific.map(({ tourAddOn, product }) => ({
      ...product,
      priceOverride: tourAddOn.priceOverride,
      isRequired: tourAddOn.isRequired,
      isRecommended: tourAddOn.isRecommended,
      effectivePrice: tourAddOn.priceOverride || product.price,
    }));
  }
}
