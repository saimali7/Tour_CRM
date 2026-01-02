import { eq, and, desc, asc, count } from "drizzle-orm";
import {
  customerNotes,
  type CustomerNote,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ServiceError,
} from "./types";

export type CustomerNoteSortField = "createdAt";

export interface CreateCustomerNoteInput {
  customerId: string;
  content: string;
  isPinned?: boolean;
  authorId: string;
  authorName: string;
}

export interface UpdateCustomerNoteInput {
  content?: string;
  isPinned?: boolean;
}

export class CustomerNoteService extends BaseService {
  async getAll(
    customerId: string,
    pagination: PaginationOptions = {},
    sort: SortOptions<CustomerNoteSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<CustomerNote>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(customerNotes.organizationId, this.organizationId),
      eq(customerNotes.customerId, customerId),
    ];

    const orderBy =
      sort.direction === "asc"
        ? asc(customerNotes[sort.field])
        : desc(customerNotes[sort.field]);

    // Get pinned notes first, then by date
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(customerNotes)
        .where(and(...conditions))
        .orderBy(desc(customerNotes.isPinned), orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(customerNotes)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<CustomerNote> {
    const note = await this.db.query.customerNotes.findFirst({
      where: and(
        eq(customerNotes.id, id),
        eq(customerNotes.organizationId, this.organizationId)
      ),
    });

    if (!note) {
      throw new NotFoundError("CustomerNote", id);
    }

    return note;
  }

  async create(input: CreateCustomerNoteInput): Promise<CustomerNote> {
    const [note] = await this.db
      .insert(customerNotes)
      .values({
        organizationId: this.organizationId,
        customerId: input.customerId,
        content: input.content,
        isPinned: input.isPinned ?? false,
        authorId: input.authorId,
        authorName: input.authorName,
      })
      .returning();

    if (!note) {
      throw new ServiceError("Failed to create customer note", "CREATE_FAILED", 500);
    }

    return note;
  }

  async update(id: string, input: UpdateCustomerNoteInput): Promise<CustomerNote> {
    await this.getById(id);

    const [note] = await this.db
      .update(customerNotes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerNotes.id, id),
          eq(customerNotes.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!note) {
      throw new NotFoundError("CustomerNote", id);
    }

    return note;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(customerNotes)
      .where(
        and(
          eq(customerNotes.id, id),
          eq(customerNotes.organizationId, this.organizationId)
        )
      );
  }

  async togglePin(id: string): Promise<CustomerNote> {
    const note = await this.getById(id);
    return this.update(id, { isPinned: !note.isPinned });
  }

  async getPinnedNotes(customerId: string): Promise<CustomerNote[]> {
    return this.db
      .select()
      .from(customerNotes)
      .where(
        and(
          eq(customerNotes.organizationId, this.organizationId),
          eq(customerNotes.customerId, customerId),
          eq(customerNotes.isPinned, true)
        )
      )
      .orderBy(desc(customerNotes.createdAt));
  }
}
