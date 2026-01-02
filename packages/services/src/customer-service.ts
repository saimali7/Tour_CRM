import { eq, and, desc, asc, sql, count, ilike, or, gte } from "drizzle-orm";
import {
  customers,
  bookings,
  customerNotes,
  communicationLogs,
  wishlists,
  notificationPreferences,
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
  ValidationError,
  ServiceError,
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
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  contactPreference?: "email" | "phone" | "both";
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

export interface GdprExportData {
  customer: Customer;
  bookings: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    createdAt: Date;
    adultCount: number;
    childCount: number | null;
    infantCount: number | null;
    total: string;
    currency: string;
    specialRequests: string | null;
    dietaryRequirements: string | null;
    accessibilityNeeds: string | null;
  }>;
  communications: Array<{
    id: string;
    type: string;
    subject: string | null;
    sentAt: Date | null;
    status: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: Date;
    authorName: string;
  }>;
  wishlists: Array<{
    id: string;
    tourId: string;
    createdAt: Date;
  }>;
  notificationPreferences: {
    emailBookingConfirmation: boolean | null;
    emailBookingReminder: boolean | null;
    emailMarketing: boolean | null;
    smsBookingConfirmation: boolean | null;
    smsBookingReminder: boolean | null;
    smsMarketing: boolean | null;
    emailUnsubscribedAt: Date | null;
    smsUnsubscribedAt: Date | null;
  } | null;
  exportedAt: Date;
  organizationId: string;
}

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
    if (!email) return null;

    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.email, email.toLowerCase()),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    return customer || null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    // Validation: Must have email OR phone
    if (!input.email && !input.phone) {
      throw new ValidationError("Customer must have either email or phone number", { contact: ["Either email or phone is required"] });
    }

    // Check for duplicate email if email is provided
    if (input.email) {
      const email = input.email.toLowerCase();
      const existing = await this.getByEmail(email);
      if (existing) {
        throw new ConflictError(`Customer with email "${email}" already exists`);
      }
    }

    const [customer] = await this.db
      .insert(customers)
      .values({
        organizationId: this.organizationId,
        email: input.email ? input.email.toLowerCase() : null,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        contactPreference: input.contactPreference || "email",
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
      throw new ServiceError("Failed to create customer", "CREATE_FAILED", 500);
    }

    return customer;
  }

  async getOrCreate(input: CreateCustomerInput): Promise<Customer> {
    if (input.email) {
      const existing = await this.getByEmail(input.email);
      if (existing) {
        return existing;
      }
    }
    return this.create(input);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const existingCustomer = await this.getById(id);

    // If updating contact info, ensure at least one remains
    const updatedEmail = input.email !== undefined ? input.email : existingCustomer.email;
    const updatedPhone = input.phone !== undefined ? input.phone : existingCustomer.phone;

    if (!updatedEmail && !updatedPhone) {
      throw new ValidationError("Customer must have either email or phone number", { contact: ["Either email or phone is required"] });
    }

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
              gte(customers.createdAt, startOfMonth)
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

  /**
   * GDPR Data Export - Exports all customer data for compliance
   * Returns all personal data stored for the customer including:
   * - Customer profile information
   * - Booking history
   * - Communication logs
   * - Notes (content only, not internal staff notes about customer)
   * - Wishlist items
   * - Notification preferences
   */
  async exportGdprData(id: string): Promise<GdprExportData> {
    const customer = await this.getById(id);

    // Fetch all related data in parallel
    const [
      customerBookings,
      customerCommunications,
      customerNotesList,
      customerWishlists,
      customerPreferences,
    ] = await Promise.all([
      // Bookings
      this.db
        .select({
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
          status: bookings.status,
          createdAt: bookings.createdAt,
          adultCount: bookings.adultCount,
          childCount: bookings.childCount,
          infantCount: bookings.infantCount,
          total: bookings.total,
          currency: bookings.currency,
          specialRequests: bookings.specialRequests,
          dietaryRequirements: bookings.dietaryRequirements,
          accessibilityNeeds: bookings.accessibilityNeeds,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.customerId, id),
            eq(bookings.organizationId, this.organizationId)
          )
        )
        .orderBy(desc(bookings.createdAt)),

      // Communications
      this.db
        .select({
          id: communicationLogs.id,
          type: communicationLogs.type,
          subject: communicationLogs.subject,
          sentAt: communicationLogs.sentAt,
          status: communicationLogs.status,
        })
        .from(communicationLogs)
        .where(
          and(
            eq(communicationLogs.customerId, id),
            eq(communicationLogs.organizationId, this.organizationId)
          )
        )
        .orderBy(desc(communicationLogs.sentAt)),

      // Notes (only content that was shared with or about the customer)
      this.db
        .select({
          id: customerNotes.id,
          content: customerNotes.content,
          createdAt: customerNotes.createdAt,
          authorName: customerNotes.authorName,
        })
        .from(customerNotes)
        .where(
          and(
            eq(customerNotes.customerId, id),
            eq(customerNotes.organizationId, this.organizationId)
          )
        )
        .orderBy(desc(customerNotes.createdAt)),

      // Wishlists
      this.db
        .select({
          id: wishlists.id,
          tourId: wishlists.tourId,
          createdAt: wishlists.createdAt,
        })
        .from(wishlists)
        .where(
          and(
            eq(wishlists.customerId, id),
            eq(wishlists.organizationId, this.organizationId)
          )
        )
        .orderBy(desc(wishlists.createdAt)),

      // Notification preferences
      this.db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.customerId, id),
          eq(notificationPreferences.organizationId, this.organizationId)
        ),
      }),
    ]);

    return {
      customer,
      bookings: customerBookings,
      communications: customerCommunications,
      notes: customerNotesList,
      wishlists: customerWishlists,
      notificationPreferences: customerPreferences
        ? {
            emailBookingConfirmation: customerPreferences.emailBookingConfirmation,
            emailBookingReminder: customerPreferences.emailBookingReminder,
            emailMarketing: customerPreferences.emailMarketing,
            smsBookingConfirmation: customerPreferences.smsBookingConfirmation,
            smsBookingReminder: customerPreferences.smsBookingReminder,
            smsMarketing: customerPreferences.smsMarketing,
            emailUnsubscribedAt: customerPreferences.emailUnsubscribedAt,
            smsUnsubscribedAt: customerPreferences.smsUnsubscribedAt,
          }
        : null,
      exportedAt: new Date(),
      organizationId: this.organizationId,
    };
  }

  /**
   * GDPR Right to Erasure - Anonymizes customer data
   * Instead of hard delete, we anonymize to maintain booking records integrity
   */
  async anonymizeForGdpr(id: string): Promise<void> {
    await this.getById(id);

    // Anonymize customer data
    await this.db
      .update(customers)
      .set({
        email: `deleted-${id}@anonymized.local`,
        firstName: "Deleted",
        lastName: "Customer",
        phone: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postalCode: null,
        notes: null,
        tags: [],
        metadata: {},
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, this.organizationId)
        )
      );

    // Delete customer notes
    await this.db
      .delete(customerNotes)
      .where(
        and(
          eq(customerNotes.customerId, id),
          eq(customerNotes.organizationId, this.organizationId)
        )
      );

    // Delete wishlists
    await this.db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.customerId, id),
          eq(wishlists.organizationId, this.organizationId)
        )
      );

    // Delete notification preferences
    await this.db
      .delete(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.customerId, id),
          eq(notificationPreferences.organizationId, this.organizationId)
        )
      );

    // Note: We keep communication logs for legal compliance but they reference
    // the anonymized customer. Booking records are kept for financial records.
  }
}
