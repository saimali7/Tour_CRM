/**
 * BookingParticipantService - Participant CRUD operations
 *
 * This service handles participant management:
 * - addParticipant: Add a participant to a booking
 * - removeParticipant: Remove a participant from a booking
 * - updateParticipant: Update participant details
 * - getParticipants: Get all participants for a booking
 */

import { eq, and } from "drizzle-orm";
import {
  bookingParticipants,
  type BookingParticipant,
} from "@tour/database";
import { BaseService } from "../base-service";
import type { ServiceContext } from "../types";
import { NotFoundError, ServiceError } from "../types";
import { BookingCore } from "./booking-core";
import { BookingQueryService } from "./booking-query-service";
import type { ParticipantInput } from "./types";

export class BookingParticipantService extends BaseService {
  private queryService: BookingQueryService;

  constructor(
    ctx: ServiceContext,
    private core: BookingCore
  ) {
    super(ctx);
    this.queryService = new BookingQueryService(ctx, core);
  }

  /**
   * Add a participant to a booking
   */
  async addParticipant(
    bookingId: string,
    participant: ParticipantInput
  ): Promise<BookingParticipant> {
    // Verify booking exists and belongs to organization
    await this.queryService.getById(bookingId);

    const [created] = await this.db
      .insert(bookingParticipants)
      .values({
        organizationId: this.organizationId,
        bookingId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        phone: participant.phone,
        type: participant.type,
        dietaryRequirements: participant.dietaryRequirements,
        accessibilityNeeds: participant.accessibilityNeeds,
        notes: participant.notes,
      })
      .returning();

    if (!created) {
      throw new ServiceError("Failed to add participant", "CREATE_FAILED", 500);
    }

    return created;
  }

  /**
   * Remove a participant from a booking
   */
  async removeParticipant(
    bookingId: string,
    participantId: string
  ): Promise<void> {
    // Verify booking exists and belongs to organization
    await this.queryService.getById(bookingId);

    await this.db
      .delete(bookingParticipants)
      .where(
        and(
          eq(bookingParticipants.id, participantId),
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.organizationId)
        )
      );
  }

  /**
   * Update a participant's details
   */
  async updateParticipant(
    bookingId: string,
    participantId: string,
    data: Partial<ParticipantInput>
  ): Promise<BookingParticipant> {
    // Verify booking exists and belongs to organization
    await this.queryService.getById(bookingId);

    const [updated] = await this.db
      .update(bookingParticipants)
      .set(data)
      .where(
        and(
          eq(bookingParticipants.id, participantId),
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("Participant", participantId);
    }

    return updated;
  }

  /**
   * Get all participants for a booking
   */
  async getParticipants(bookingId: string): Promise<BookingParticipant[]> {
    // Verify booking exists and belongs to organization
    await this.queryService.getById(bookingId);

    return this.db.query.bookingParticipants.findMany({
      where: and(
        eq(bookingParticipants.bookingId, bookingId),
        eq(bookingParticipants.organizationId, this.organizationId)
      ),
    });
  }
}
