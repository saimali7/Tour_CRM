import { eq, and, sum } from "drizzle-orm";
import {
  bookingItems,
  products,
  schedules,
  type BookingItem,
  type BookingItemStatus,
  type BookingItemMetadata,
  type ProductType,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError } from "./types";

// ==========================================
// Input Types
// ==========================================

export interface AddBookingItemInput {
  productId: string;
  scheduleId?: string; // For tours
  quantity?: number;
  participants?: number; // For per-person items
  unitPrice: string;
  discountAmount?: string;
  metadata?: BookingItemMetadata;
  internalNotes?: string;
}

export interface UpdateBookingItemInput {
  quantity?: number;
  participants?: number;
  unitPrice?: string;
  discountAmount?: string;
  metadata?: BookingItemMetadata;
  internalNotes?: string;
}

// ==========================================
// Booking Item with Product Data
// ==========================================

export interface BookingItemWithProduct extends BookingItem {
  product: {
    id: string;
    name: string;
    type: ProductType;
    status: string;
  };
}

// ==========================================
// BookingItemService
// ==========================================

export class BookingItemService extends BaseService {
  /**
   * Get all items for a booking
   */
  async getByBookingId(bookingId: string): Promise<BookingItemWithProduct[]> {
    const result = await this.db
      .select({
        item: bookingItems,
        product: {
          id: products.id,
          name: products.name,
          type: products.type,
          status: products.status,
        },
      })
      .from(bookingItems)
      .innerJoin(products, eq(bookingItems.productId, products.id))
      .where(
        and(
          eq(bookingItems.bookingId, bookingId),
          eq(bookingItems.organizationId, this.organizationId)
        )
      )
      .orderBy(bookingItems.createdAt);

    return result.map((row) => ({
      ...row.item,
      product: row.product,
    }));
  }

  /**
   * Get single item with product data
   */
  async getById(id: string): Promise<BookingItemWithProduct> {
    const result = await this.db
      .select({
        item: bookingItems,
        product: {
          id: products.id,
          name: products.name,
          type: products.type,
          status: products.status,
        },
      })
      .from(bookingItems)
      .innerJoin(products, eq(bookingItems.productId, products.id))
      .where(
        and(
          eq(bookingItems.id, id),
          eq(bookingItems.organizationId, this.organizationId)
        )
      )
      .limit(1);

    if (!result.length || !result[0]) {
      throw new NotFoundError("Booking item", id);
    }

    const row = result[0];
    return {
      ...row.item,
      product: row.product,
    };
  }

  /**
   * Add an item to a booking
   */
  async add(bookingId: string, input: AddBookingItemInput): Promise<BookingItem> {
    // Fetch the product to get productType and productName
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.id, input.productId),
        eq(products.organizationId, this.organizationId)
      ),
    });

    if (!product) {
      throw new NotFoundError("Product", input.productId);
    }

    // Validate scheduleId if provided
    if (input.scheduleId) {
      const schedule = await this.db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, input.scheduleId),
          eq(schedules.organizationId, this.organizationId)
        ),
      });

      if (!schedule) {
        throw new NotFoundError("Schedule", input.scheduleId);
      }
    }

    // Calculate pricing
    const quantity = input.quantity ?? 1;
    const unitPrice = parseFloat(input.unitPrice);
    const discountAmount = input.discountAmount ? parseFloat(input.discountAmount) : 0;

    // Calculate subtotal = unitPrice * quantity
    const subtotal = unitPrice * quantity;

    // Calculate totalPrice = subtotal - discountAmount
    const totalPrice = subtotal - discountAmount;

    // Insert the booking item
    const [bookingItem] = await this.db
      .insert(bookingItems)
      .values({
        organizationId: this.organizationId,
        bookingId,
        productId: input.productId,
        productType: product.type,
        productName: product.name,
        scheduleId: input.scheduleId,
        quantity,
        participants: input.participants,
        unitPrice: input.unitPrice,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        metadata: input.metadata || {},
        internalNotes: input.internalNotes,
        status: "pending",
      })
      .returning();

    if (!bookingItem) {
      throw new Error("Failed to create booking item");
    }

    return bookingItem;
  }

  /**
   * Update an item
   */
  async update(id: string, input: UpdateBookingItemInput): Promise<BookingItem> {
    // Ensure item exists and belongs to org
    const existing = await this.getById(id);

    // Prepare update values
    const updates: Record<string, unknown> = {};

    if (input.quantity !== undefined) {
      updates.quantity = input.quantity;
    }
    if (input.participants !== undefined) {
      updates.participants = input.participants;
    }
    if (input.unitPrice !== undefined) {
      updates.unitPrice = input.unitPrice;
    }
    if (input.discountAmount !== undefined) {
      updates.discountAmount = input.discountAmount;
    }
    if (input.metadata !== undefined) {
      updates.metadata = input.metadata;
    }
    if (input.internalNotes !== undefined) {
      updates.internalNotes = input.internalNotes;
    }

    // Recalculate pricing if any pricing-related field changed
    if (input.quantity !== undefined || input.unitPrice !== undefined || input.discountAmount !== undefined) {
      const quantity = input.quantity ?? existing.quantity;
      const unitPrice = input.unitPrice ? parseFloat(input.unitPrice) : parseFloat(existing.unitPrice);
      const discountAmount = input.discountAmount
        ? parseFloat(input.discountAmount)
        : parseFloat(existing.discountAmount || "0");

      const subtotal = unitPrice * quantity;
      const totalPrice = subtotal - discountAmount;

      updates.subtotal = subtotal.toFixed(2);
      updates.totalPrice = totalPrice.toFixed(2);
    }

    // Update the item
    const [updatedItem] = await this.db
      .update(bookingItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingItems.id, id),
          eq(bookingItems.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updatedItem) {
      throw new NotFoundError("Booking item", id);
    }

    return updatedItem;
  }

  /**
   * Remove an item
   */
  async remove(id: string): Promise<void> {
    // Ensure item exists and belongs to org
    await this.getById(id);

    await this.db
      .delete(bookingItems)
      .where(
        and(
          eq(bookingItems.id, id),
          eq(bookingItems.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Update item status
   */
  async updateStatus(id: string, status: BookingItemStatus): Promise<BookingItem> {
    // Ensure item exists and belongs to org
    await this.getById(id);

    const [updatedItem] = await this.db
      .update(bookingItems)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingItems.id, id),
          eq(bookingItems.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updatedItem) {
      throw new NotFoundError("Booking item", id);
    }

    return updatedItem;
  }

  /**
   * Mark item as fulfilled
   */
  async fulfill(id: string): Promise<BookingItem> {
    // Ensure item exists and belongs to org
    await this.getById(id);

    const [updatedItem] = await this.db
      .update(bookingItems)
      .set({
        status: "fulfilled",
        fulfilledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingItems.id, id),
          eq(bookingItems.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updatedItem) {
      throw new NotFoundError("Booking item", id);
    }

    return updatedItem;
  }

  /**
   * Calculate total for all items in a booking
   */
  async calculateBookingTotal(bookingId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sum(bookingItems.totalPrice),
      })
      .from(bookingItems)
      .where(
        and(
          eq(bookingItems.bookingId, bookingId),
          eq(bookingItems.organizationId, this.organizationId)
        )
      );

    const total = result[0]?.total;
    return total ? parseFloat(total) : 0;
  }
}
