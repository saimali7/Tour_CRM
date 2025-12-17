import { eq, and, desc, asc, isNull } from "drizzle-orm";
import { BaseService } from "./base-service";
import {
  waiverTemplates,
  tourWaivers,
  signedWaivers,
  tours,
  bookings,
  bookingParticipants,
  schedules,
  customers,
  type WaiverTemplate,
  type NewWaiverTemplate,
  type TourWaiver,
  type NewTourWaiver,
  type SignedWaiver,
  type NewSignedWaiver,
  type HealthInfo,
  type SignatureType,
} from "@tour/database";

// ==========================================
// Types
// ==========================================

export type WaiverSortField = "name" | "createdAt" | "updatedAt";

export interface WaiverTemplateFilters {
  isActive?: boolean;
  search?: string;
}

export interface CreateWaiverTemplateInput {
  name: string;
  description?: string;
  content: string;
  requiresSignature?: boolean;
  requiresInitials?: boolean;
  requiresEmergencyContact?: boolean;
  requiresDateOfBirth?: boolean;
  requiresHealthInfo?: boolean;
  isActive?: boolean;
  version?: string;
}

export interface UpdateWaiverTemplateInput extends Partial<CreateWaiverTemplateInput> {}

export interface CreateTourWaiverInput {
  tourId: string;
  waiverTemplateId: string;
  isRequired?: boolean;
}

export interface CreateSignedWaiverInput {
  waiverTemplateId: string;
  bookingId: string;
  participantId?: string;
  signedByName: string;
  signedByEmail?: string;
  signedByPhone?: string;
  signatureData?: string;
  signatureType?: SignatureType;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  healthInfo?: HealthInfo;
  dateOfBirth?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface WaiverTemplateWithTours extends WaiverTemplate {
  tours: Array<{
    id: string;
    name: string;
    isRequired: boolean;
  }>;
}

export interface TourWaiverWithTemplate extends TourWaiver {
  waiverTemplate: WaiverTemplate | null;
}

export interface SignedWaiverWithRelations extends SignedWaiver {
  waiverTemplate: WaiverTemplate | null;
  booking: {
    id: string;
    referenceNumber: string;
  } | null;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface BookingWaiverStatus {
  bookingId: string;
  requiredWaivers: Array<{
    waiverTemplateId: string;
    waiverName: string;
    isSigned: boolean;
    signedAt?: Date;
  }>;
  allWaiversSigned: boolean;
  pendingCount: number;
}

// ==========================================
// Service
// ==========================================

export class WaiverService extends BaseService {
  // ==========================================
  // Waiver Templates
  // ==========================================

  /**
   * Get all waiver templates for the organization
   */
  async getTemplates(
    filters: WaiverTemplateFilters = {},
    sortField: WaiverSortField = "createdAt",
    sortDirection: "asc" | "desc" = "desc"
  ): Promise<WaiverTemplate[]> {
    const conditions = [eq(waiverTemplates.organizationId, this.organizationId)];

    if (filters.isActive !== undefined) {
      conditions.push(eq(waiverTemplates.isActive, filters.isActive));
    }

    const sortColumn =
      sortField === "name"
        ? waiverTemplates.name
        : sortField === "updatedAt"
        ? waiverTemplates.updatedAt
        : waiverTemplates.createdAt;

    const orderFn = sortDirection === "asc" ? asc : desc;

    const results = await this.db
      .select()
      .from(waiverTemplates)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn));

    // Filter by search if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return results.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Get a single waiver template by ID
   */
  async getTemplateById(id: string): Promise<WaiverTemplate | null> {
    const result = await this.db.query.waiverTemplates.findFirst({
      where: and(
        eq(waiverTemplates.id, id),
        eq(waiverTemplates.organizationId, this.organizationId)
      ),
    });
    return result ?? null;
  }

  /**
   * Get waiver template with associated tours
   */
  async getTemplateWithTours(id: string): Promise<WaiverTemplateWithTours | null> {
    const template = await this.getTemplateById(id);
    if (!template) return null;

    const linkedTours = await this.db
      .select({
        tourWaiverId: tourWaivers.id,
        tourId: tours.id,
        tourName: tours.name,
        isRequired: tourWaivers.isRequired,
      })
      .from(tourWaivers)
      .innerJoin(tours, eq(tourWaivers.tourId, tours.id))
      .where(
        and(
          eq(tourWaivers.waiverTemplateId, id),
          eq(tourWaivers.organizationId, this.organizationId)
        )
      );

    return {
      ...template,
      tours: linkedTours.map((t) => ({
        id: t.tourId,
        name: t.tourName,
        isRequired: t.isRequired,
      })),
    };
  }

  /**
   * Create a new waiver template
   */
  async createTemplate(input: CreateWaiverTemplateInput): Promise<WaiverTemplate> {
    const [template] = await this.db
      .insert(waiverTemplates)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        description: input.description,
        content: input.content,
        requiresSignature: input.requiresSignature ?? true,
        requiresInitials: input.requiresInitials ?? false,
        requiresEmergencyContact: input.requiresEmergencyContact ?? false,
        requiresDateOfBirth: input.requiresDateOfBirth ?? false,
        requiresHealthInfo: input.requiresHealthInfo ?? false,
        isActive: input.isActive ?? true,
        version: input.version ?? "1.0",
      } satisfies NewWaiverTemplate)
      .returning();

    if (!template) {
      throw new Error("Failed to create waiver template");
    }
    return template;
  }

  /**
   * Update a waiver template
   */
  async updateTemplate(
    id: string,
    input: UpdateWaiverTemplateInput
  ): Promise<WaiverTemplate | null> {
    const [updated] = await this.db
      .update(waiverTemplates)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waiverTemplates.id, id),
          eq(waiverTemplates.organizationId, this.organizationId)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a waiver template (soft delete by setting isActive = false)
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const [result] = await this.db
      .update(waiverTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(waiverTemplates.id, id),
          eq(waiverTemplates.organizationId, this.organizationId)
        )
      )
      .returning({ id: waiverTemplates.id });

    return !!result;
  }

  // ==========================================
  // Tour-Waiver Associations
  // ==========================================

  /**
   * Get all waivers required for a tour
   */
  async getTourWaivers(tourId: string): Promise<TourWaiverWithTemplate[]> {
    const results = await this.db
      .select({
        tourWaiver: tourWaivers,
        waiverTemplate: waiverTemplates,
      })
      .from(tourWaivers)
      .leftJoin(waiverTemplates, eq(tourWaivers.waiverTemplateId, waiverTemplates.id))
      .where(
        and(
          eq(tourWaivers.tourId, tourId),
          eq(tourWaivers.organizationId, this.organizationId)
        )
      );

    return results.map((r) => ({
      ...r.tourWaiver,
      waiverTemplate: r.waiverTemplate,
    }));
  }

  /**
   * Add a waiver requirement to a tour
   */
  async addWaiverToTour(input: CreateTourWaiverInput): Promise<TourWaiver> {
    const [tourWaiver] = await this.db
      .insert(tourWaivers)
      .values({
        organizationId: this.organizationId,
        tourId: input.tourId,
        waiverTemplateId: input.waiverTemplateId,
        isRequired: input.isRequired ?? true,
      } satisfies NewTourWaiver)
      .returning();

    if (!tourWaiver) {
      throw new Error("Failed to add waiver to tour");
    }
    return tourWaiver;
  }

  /**
   * Remove a waiver requirement from a tour
   */
  async removeWaiverFromTour(tourId: string, waiverTemplateId: string): Promise<boolean> {
    const [result] = await this.db
      .delete(tourWaivers)
      .where(
        and(
          eq(tourWaivers.tourId, tourId),
          eq(tourWaivers.waiverTemplateId, waiverTemplateId),
          eq(tourWaivers.organizationId, this.organizationId)
        )
      )
      .returning({ id: tourWaivers.id });

    return !!result;
  }

  /**
   * Update waiver requirement for a tour (required/optional)
   */
  async updateTourWaiver(
    tourId: string,
    waiverTemplateId: string,
    isRequired: boolean
  ): Promise<TourWaiver | null> {
    const [updated] = await this.db
      .update(tourWaivers)
      .set({ isRequired })
      .where(
        and(
          eq(tourWaivers.tourId, tourId),
          eq(tourWaivers.waiverTemplateId, waiverTemplateId),
          eq(tourWaivers.organizationId, this.organizationId)
        )
      )
      .returning();

    return updated ?? null;
  }

  // ==========================================
  // Signed Waivers
  // ==========================================

  /**
   * Get all signed waivers for a booking
   */
  async getSignedWaiversForBooking(bookingId: string): Promise<SignedWaiverWithRelations[]> {
    const results = await this.db
      .select({
        signedWaiver: signedWaivers,
        waiverTemplate: waiverTemplates,
        booking: {
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
        },
        participant: {
          id: bookingParticipants.id,
          firstName: bookingParticipants.firstName,
          lastName: bookingParticipants.lastName,
        },
      })
      .from(signedWaivers)
      .leftJoin(waiverTemplates, eq(signedWaivers.waiverTemplateId, waiverTemplates.id))
      .leftJoin(bookings, eq(signedWaivers.bookingId, bookings.id))
      .leftJoin(bookingParticipants, eq(signedWaivers.participantId, bookingParticipants.id))
      .where(
        and(
          eq(signedWaivers.bookingId, bookingId),
          eq(signedWaivers.organizationId, this.organizationId)
        )
      )
      .orderBy(desc(signedWaivers.signedAt));

    return results.map((r) => ({
      ...r.signedWaiver,
      waiverTemplate: r.waiverTemplate,
      booking: r.booking,
      participant: r.participant,
    }));
  }

  /**
   * Get a specific signed waiver
   */
  async getSignedWaiver(id: string): Promise<SignedWaiverWithRelations | null> {
    const results = await this.db
      .select({
        signedWaiver: signedWaivers,
        waiverTemplate: waiverTemplates,
        booking: {
          id: bookings.id,
          referenceNumber: bookings.referenceNumber,
        },
        participant: {
          id: bookingParticipants.id,
          firstName: bookingParticipants.firstName,
          lastName: bookingParticipants.lastName,
        },
      })
      .from(signedWaivers)
      .leftJoin(waiverTemplates, eq(signedWaivers.waiverTemplateId, waiverTemplates.id))
      .leftJoin(bookings, eq(signedWaivers.bookingId, bookings.id))
      .leftJoin(bookingParticipants, eq(signedWaivers.participantId, bookingParticipants.id))
      .where(
        and(
          eq(signedWaivers.id, id),
          eq(signedWaivers.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const r = results[0];
    if (!r) return null;

    return {
      ...r.signedWaiver,
      waiverTemplate: r.waiverTemplate,
      booking: r.booking,
      participant: r.participant,
    };
  }

  /**
   * Sign a waiver for a booking
   */
  async signWaiver(input: CreateSignedWaiverInput): Promise<SignedWaiver> {
    // Get the waiver template to snapshot version/content
    const template = await this.getTemplateById(input.waiverTemplateId);

    const [signed] = await this.db
      .insert(signedWaivers)
      .values({
        organizationId: this.organizationId,
        waiverTemplateId: input.waiverTemplateId,
        bookingId: input.bookingId,
        participantId: input.participantId,
        signedByName: input.signedByName,
        signedByEmail: input.signedByEmail,
        signedByPhone: input.signedByPhone,
        signatureData: input.signatureData,
        signatureType: input.signatureType ?? "typed",
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelationship: input.emergencyContactRelationship,
        healthInfo: input.healthInfo,
        dateOfBirth: input.dateOfBirth,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        waiverVersionAtSigning: template?.version,
        waiverContentAtSigning: template?.content,
        signedAt: new Date(),
      } satisfies NewSignedWaiver)
      .returning();

    if (!signed) {
      throw new Error("Failed to sign waiver");
    }
    return signed;
  }

  /**
   * Check waiver status for a booking
   */
  async getBookingWaiverStatus(bookingId: string): Promise<BookingWaiverStatus> {
    // Get the booking with its schedule to find the tour
    const bookingWithSchedule = await this.db
      .select({
        bookingId: bookings.id,
        tourId: schedules.tourId,
      })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const booking = bookingWithSchedule[0];
    if (!booking) {
      return {
        bookingId,
        requiredWaivers: [],
        allWaiversSigned: true,
        pendingCount: 0,
      };
    }

    // Get required waivers for the tour
    const requiredWaivers = await this.db
      .select({
        waiverTemplateId: tourWaivers.waiverTemplateId,
        waiverName: waiverTemplates.name,
        isRequired: tourWaivers.isRequired,
      })
      .from(tourWaivers)
      .innerJoin(waiverTemplates, eq(tourWaivers.waiverTemplateId, waiverTemplates.id))
      .where(
        and(
          eq(tourWaivers.tourId, booking.tourId),
          eq(tourWaivers.organizationId, this.organizationId),
          eq(tourWaivers.isRequired, true),
          eq(waiverTemplates.isActive, true)
        )
      );

    if (requiredWaivers.length === 0) {
      return {
        bookingId,
        requiredWaivers: [],
        allWaiversSigned: true,
        pendingCount: 0,
      };
    }

    // Get signed waivers for this booking
    const signedWaiversList = await this.db
      .select({
        waiverTemplateId: signedWaivers.waiverTemplateId,
        signedAt: signedWaivers.signedAt,
      })
      .from(signedWaivers)
      .where(
        and(
          eq(signedWaivers.bookingId, bookingId),
          eq(signedWaivers.organizationId, this.organizationId),
          isNull(signedWaivers.participantId) // Main booking waiver, not per-participant
        )
      );

    const signedMap = new Map(
      signedWaiversList.map((s) => [s.waiverTemplateId, s.signedAt])
    );

    const waiverStatuses = requiredWaivers.map((w) => ({
      waiverTemplateId: w.waiverTemplateId,
      waiverName: w.waiverName,
      isSigned: signedMap.has(w.waiverTemplateId),
      signedAt: signedMap.get(w.waiverTemplateId) ?? undefined,
    }));

    const pendingCount = waiverStatuses.filter((w) => !w.isSigned).length;

    return {
      bookingId,
      requiredWaivers: waiverStatuses,
      allWaiversSigned: pendingCount === 0,
      pendingCount,
    };
  }

  /**
   * Check if all required waivers are signed for multiple bookings
   */
  async checkWaiversSignedForBookings(
    bookingIds: string[]
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    for (const bookingId of bookingIds) {
      const status = await this.getBookingWaiverStatus(bookingId);
      result.set(bookingId, status.allWaiversSigned);
    }

    return result;
  }

  /**
   * Get pending waivers across all upcoming bookings
   */
  async getPendingWaivers(): Promise<
    Array<{
      booking: {
        id: string;
        referenceNumber: string;
        customerName: string;
      };
      waiver: {
        id: string;
        name: string;
      };
    }>
  > {
    const now = new Date();

    // Get upcoming confirmed bookings with customer and schedule info
    const upcomingBookings = await this.db
      .select({
        bookingId: bookings.id,
        referenceNumber: bookings.referenceNumber,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        tourId: schedules.tourId,
        startsAt: schedules.startsAt,
      })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          eq(bookings.status, "confirmed")
        )
      )
      .orderBy(asc(schedules.startsAt))
      .limit(100);

    const pending: Array<{
      booking: { id: string; referenceNumber: string; customerName: string };
      waiver: { id: string; name: string };
    }> = [];

    for (const booking of upcomingBookings) {
      // Skip past bookings
      if (new Date(booking.startsAt) < now) {
        continue;
      }

      const status = await this.getBookingWaiverStatus(booking.bookingId);
      for (const waiver of status.requiredWaivers) {
        if (!waiver.isSigned) {
          pending.push({
            booking: {
              id: booking.bookingId,
              referenceNumber: booking.referenceNumber,
              customerName: `${booking.customerFirstName ?? ""} ${booking.customerLastName ?? ""}`.trim(),
            },
            waiver: {
              id: waiver.waiverTemplateId,
              name: waiver.waiverName,
            },
          });
        }
      }
    }

    return pending;
  }
}
