import { eq, and, desc, asc, sql, count, ilike, or } from "drizzle-orm";
import {
  customers,
  bookings,
  type Customer,
  type CustomerSource,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
  ConflictError,
} from "./types";

export interface CustomerFilters {
  search?: string;
  source?: CustomerSource;
  tags?: string[];
  country?: string;
}

export type CustomerSortField = "createdAt" | "lastName" | "email";

export interface CustomerWithStats extends Customer {
  totalBookings?: number;
  totalSpent?: string;
  lastBookingAt?: Date | null;
}

export interface CreateCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  language?: string;
  currency?: string;
  notes?: string;
  tags?: string[];
  source?: CustomerSource;
  sourceDetails?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}

export class CustomerService extends BaseService {
  async getAll(
    filters: CustomerFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<CustomerSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<Customer>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(customers.organizationId, this.organizationId)];

    if (filters.search) {
      conditions.push(
        or(
          ilike(customers.email, `%${filters.search}%`),
          ilike(customers.firstName, `%${filters.search}%`),
          ilike(customers.lastName, `%${filters.search}%`),
          ilike(customers.phone, `%${filters.search}%`)
        )!
      );
    }
    if (filters.source) {
      conditions.push(eq(customers.source, filters.source));
    }
    if (filters.country) {
      conditions.push(eq(customers.country, filters.country));
    }
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(
        sql`${customers.tags} ?| array[${sql.join(
          filters.tags.map((t) => sql`${t}`),
          sql`, `
        )}]`
      );
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(customers[sort.field])
        : desc(customers[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(customers)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data,
      ...this.paginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<Customer> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", id);
    }

    return customer;
  }

  async getByIdWithStats(id: string): Promise<CustomerWithStats> {
    const customer = await this.getById(id);

    const statsResult = await this.db
      .select({
        totalBookings: count(),
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, id),
          eq(bookings.organizationId, this.organizationId)
        )
      );

    const stats = statsResult[0];

    return {
      ...customer,
      totalBookings: stats?.totalBookings ?? 0,
      totalSpent: stats?.totalSpent ?? "0",
      lastBookingAt: stats?.lastBookingAt ?? null,
    };
  }

  async getByEmail(email: string): Promise<Customer | null> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.email, email.toLowerCase()),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    return customer || null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const email = input.email.toLowerCase();

    const existing = await this.getByEmail(email);
    if (existing) {
      throw new ConflictError(`Customer with email "${email}" already exists`);
    }

    const [customer] = await this.db
      .insert(customers)
      .values({
        organizationId: this.organizationId,
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        language: input.language,
        currency: input.currency,
        notes: input.notes,
        tags: input.tags,
        source: input.source || "manual",
        sourceDetails: input.sourceDetails,
        metadata: input.metadata,
      })
      .returning();

    if (!customer) {
      throw new Error("Failed to create customer");
    }

    return customer;
  }

  async getOrCreate(input: CreateCustomerInput): Promise<Customer> {
    const existing = await this.getByEmail(input.email);
    if (existing) {
      return existing;
    }
    return this.create(input);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    await this.getById(id);

    if (input.email) {
      const email = input.email.toLowerCase();
      const existing = await this.db.query.customers.findFirst({
        where: and(
          eq(customers.email, email),
          eq(customers.organizationId, this.organizationId),
          sql`${customers.id} != ${id}`
        ),
      });

      if (existing) {
        throw new ConflictError(`Customer with email "${email}" already exists`);
      }

      input.email = email;
    }

    const [customer] = await this.db
      .update(customers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!customer) {
      throw new NotFoundError("Customer", id);
    }

    return customer;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, this.organizationId)
        )
      );
  }

  async addTags(id: string, tags: string[]): Promise<Customer> {
    const customer = await this.getById(id);
    const currentTags = customer.tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];

    return this.update(id, { tags: newTags });
  }

  async removeTags(id: string, tags: string[]): Promise<Customer> {
    const customer = await this.getById(id);
    const currentTags = customer.tags || [];
    const newTags = currentTags.filter((t) => !tags.includes(t));

    return this.update(id, { tags: newTags });
  }

  async getBookings(id: string): Promise<typeof bookings.$inferSelect[]> {
    await this.getById(id);

    return this.db.query.bookings.findMany({
      where: and(
        eq(bookings.customerId, id),
        eq(bookings.organizationId, this.organizationId)
      ),
      orderBy: [desc(bookings.createdAt)],
    });
  }

  async getAllTags(): Promise<string[]> {
    const result = await this.db
      .select({
        tags: customers.tags,
      })
      .from(customers)
      .where(eq(customers.organizationId, this.organizationId));

    const allTags = result.flatMap((r) => r.tags || []);
    return [...new Set(allTags)].sort();
  }

  async getStats(): Promise<{
    total: number;
    thisMonth: number;
    bySource: Record<string, number>;
    topCountries: Array<{ country: string; count: number }>;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalResult, thisMonthResult, bySourceResult, countriesResult] =
      await Promise.all([
        this.db
          .select({ total: count() })
          .from(customers)
          .where(eq(customers.organizationId, this.organizationId)),

        this.db
          .select({ count: count() })
          .from(customers)
          .where(
            and(
              eq(customers.organizationId, this.organizationId),
              sql`${customers.createdAt} >= ${startOfMonth}`
            )
          ),

        this.db
          .select({
            source: customers.source,
            count: count(),
          })
          .from(customers)
          .where(eq(customers.organizationId, this.organizationId))
          .groupBy(customers.source),

        this.db
          .select({
            country: customers.country,
            count: count(),
          })
          .from(customers)
          .where(
            and(
              eq(customers.organizationId, this.organizationId),
              sql`${customers.country} IS NOT NULL`
            )
          )
          .groupBy(customers.country)
          .orderBy(desc(count()))
          .limit(10),
      ]);

    const bySource: Record<string, number> = {};
    for (const row of bySourceResult) {
      if (row.source) {
        bySource[row.source] = row.count;
      }
    }

    return {
      total: totalResult[0]?.total ?? 0,
      thisMonth: thisMonthResult[0]?.count ?? 0,
      bySource,
      topCountries: countriesResult
        .filter((r) => r.country)
        .map((r) => ({ country: r.country!, count: r.count })),
    };
  }

  async search(query: string, limit = 10): Promise<Customer[]> {
    return this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, this.organizationId),
          or(
            ilike(customers.email, `%${query}%`),
            ilike(customers.firstName, `%${query}%`),
            ilike(customers.lastName, `%${query}%`)
          )
        )
      )
      .limit(limit);
  }
}
