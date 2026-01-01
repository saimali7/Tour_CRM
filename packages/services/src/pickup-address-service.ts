import { eq, and, asc, ilike, or, isNotNull } from "drizzle-orm";
import {
  pickupAddresses,
  type PickupAddress,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ConflictError } from "./types";

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new pickup address
 */
export interface CreatePickupAddressInput {
  /** Display name for the pickup location (e.g., "Marriott Marina") */
  name: string;
  /** Full street address */
  address: string;
  /** Geographic zone for clustering (e.g., "Marina", "Downtown", "Palm") */
  zone?: string;
  /** Short display name for compact UI (e.g., "Marina Marriott") */
  shortName?: string;
  /** GPS latitude coordinate */
  latitude?: number;
  /** GPS longitude coordinate */
  longitude?: number;
  /** Instructions for drivers/guides on how to complete pickup */
  pickupInstructions?: string;
  /** Average time in minutes to complete a pickup at this location */
  averagePickupMinutes?: number;
  /** Sort order for display in lists */
  sortOrder?: number;
}

/**
 * Input for updating an existing pickup address
 */
export interface UpdatePickupAddressInput extends Partial<CreatePickupAddressInput> {
  /** Whether this pickup address is active */
  isActive?: boolean;
}

/**
 * Options for filtering pickup addresses
 */
export interface GetPickupAddressesOptions {
  /** Filter by zone */
  zone?: string;
  /** Only return active addresses (default: true) */
  activeOnly?: boolean;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Pickup Address Service
 *
 * Manages predefined pickup locations for tours. Each pickup address belongs
 * to a geographic zone which is used for route optimization and guide
 * assignment clustering in the Tour Command Center.
 */
export class PickupAddressService extends BaseService {
  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Get all pickup addresses for the organization
   *
   * @param options - Optional filters for zone and active status
   * @returns Array of pickup addresses sorted by zone and sort order
   *
   * @example
   * ```ts
   * // Get all active addresses
   * const addresses = await pickupAddressService.getAll();
   *
   * // Get active addresses in Marina zone
   * const marinaAddresses = await pickupAddressService.getAll({
   *   zone: "Marina",
   *   activeOnly: true
   * });
   *
   * // Get all addresses including inactive
   * const allAddresses = await pickupAddressService.getAll({ activeOnly: false });
   * ```
   */
  async getAll(options: GetPickupAddressesOptions = {}): Promise<PickupAddress[]> {
    const { zone, activeOnly = true } = options;

    const conditions = [eq(pickupAddresses.organizationId, this.organizationId)];

    if (zone) {
      conditions.push(eq(pickupAddresses.zone, zone));
    }

    if (activeOnly) {
      conditions.push(eq(pickupAddresses.isActive, true));
    }

    return this.db.query.pickupAddresses.findMany({
      where: and(...conditions),
      orderBy: [asc(pickupAddresses.zone), asc(pickupAddresses.sortOrder), asc(pickupAddresses.name)],
    });
  }

  /**
   * Get a specific pickup address by ID
   *
   * @param id - The pickup address ID
   * @returns The pickup address or undefined if not found
   *
   * @example
   * ```ts
   * const address = await pickupAddressService.getById("addr_123");
   * if (address) {
   *   console.log(address.name); // "Marriott Marina"
   * }
   * ```
   */
  async getById(id: string): Promise<PickupAddress | undefined> {
    return this.db.query.pickupAddresses.findFirst({
      where: and(
        eq(pickupAddresses.id, id),
        eq(pickupAddresses.organizationId, this.organizationId)
      ),
    });
  }

  /**
   * Get a pickup address by ID or throw if not found
   *
   * @param id - The pickup address ID
   * @returns The pickup address
   * @throws NotFoundError if pickup address doesn't exist
   */
  async getByIdOrThrow(id: string): Promise<PickupAddress> {
    const address = await this.getById(id);
    if (!address) {
      throw new NotFoundError("Pickup address", id);
    }
    return address;
  }

  /**
   * Create a new pickup address
   *
   * @param input - The pickup address data
   * @returns The created pickup address
   * @throws ConflictError if address name already exists in organization
   *
   * @example
   * ```ts
   * const address = await pickupAddressService.create({
   *   name: "Marriott Marina",
   *   address: "123 Marina Walk, Dubai Marina",
   *   zone: "Marina",
   *   shortName: "Marina Marriott",
   *   latitude: 25.0768,
   *   longitude: 55.1340,
   *   pickupInstructions: "Meet at main lobby entrance",
   *   averagePickupMinutes: 5
   * });
   * ```
   */
  async create(input: CreatePickupAddressInput): Promise<PickupAddress> {
    // Check for duplicate name within organization
    const existing = await this.db.query.pickupAddresses.findFirst({
      where: and(
        eq(pickupAddresses.organizationId, this.organizationId),
        eq(pickupAddresses.name, input.name)
      ),
    });

    if (existing) {
      throw new ConflictError(`Pickup address with name "${input.name}" already exists`);
    }

    const [address] = await this.db
      .insert(pickupAddresses)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        address: input.address,
        zone: input.zone,
        shortName: input.shortName,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        pickupInstructions: input.pickupInstructions,
        averagePickupMinutes: input.averagePickupMinutes,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (!address) {
      throw new Error("Failed to create pickup address");
    }

    return address;
  }

  /**
   * Update an existing pickup address
   *
   * @param id - The pickup address ID
   * @param input - The fields to update
   * @returns The updated pickup address
   * @throws NotFoundError if pickup address doesn't exist
   * @throws ConflictError if new name conflicts with existing address
   *
   * @example
   * ```ts
   * const updated = await pickupAddressService.update("addr_123", {
   *   pickupInstructions: "Meet at side entrance",
   *   averagePickupMinutes: 7
   * });
   * ```
   */
  async update(id: string, input: UpdatePickupAddressInput): Promise<PickupAddress> {
    // Verify address exists
    await this.getByIdOrThrow(id);

    // Check for name conflict if name is being updated
    if (input.name) {
      const existing = await this.db.query.pickupAddresses.findFirst({
        where: and(
          eq(pickupAddresses.organizationId, this.organizationId),
          eq(pickupAddresses.name, input.name),
          // Exclude current address from check
          // Using raw SQL for NOT equal since we need to exclude this ID
        ),
      });

      if (existing && existing.id !== id) {
        throw new ConflictError(`Pickup address with name "${input.name}" already exists`);
      }
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.address !== undefined) updateValues.address = input.address;
    if (input.zone !== undefined) updateValues.zone = input.zone;
    if (input.shortName !== undefined) updateValues.shortName = input.shortName;
    if (input.latitude !== undefined) updateValues.latitude = input.latitude?.toString();
    if (input.longitude !== undefined) updateValues.longitude = input.longitude?.toString();
    if (input.pickupInstructions !== undefined) updateValues.pickupInstructions = input.pickupInstructions;
    if (input.averagePickupMinutes !== undefined) updateValues.averagePickupMinutes = input.averagePickupMinutes;
    if (input.sortOrder !== undefined) updateValues.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [address] = await this.db
      .update(pickupAddresses)
      .set(updateValues)
      .where(
        and(
          eq(pickupAddresses.id, id),
          eq(pickupAddresses.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!address) {
      throw new NotFoundError("Pickup address", id);
    }

    return address;
  }

  /**
   * Delete a pickup address
   *
   * Note: This performs a hard delete. Consider using update with isActive=false
   * for soft delete to preserve historical data.
   *
   * @param id - The pickup address ID
   * @throws NotFoundError if pickup address doesn't exist
   *
   * @example
   * ```ts
   * await pickupAddressService.delete("addr_123");
   * ```
   */
  async delete(id: string): Promise<void> {
    // Verify address exists
    await this.getByIdOrThrow(id);

    await this.db
      .delete(pickupAddresses)
      .where(
        and(
          eq(pickupAddresses.id, id),
          eq(pickupAddresses.organizationId, this.organizationId)
        )
      );
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all distinct zones for the organization
   *
   * Returns unique zone names that have at least one active pickup address.
   *
   * @returns Array of zone names sorted alphabetically
   *
   * @example
   * ```ts
   * const zones = await pickupAddressService.getZones();
   * // ["Downtown", "Marina", "Palm"]
   * ```
   */
  async getZones(): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ zone: pickupAddresses.zone })
      .from(pickupAddresses)
      .where(
        and(
          eq(pickupAddresses.organizationId, this.organizationId),
          eq(pickupAddresses.isActive, true),
          isNotNull(pickupAddresses.zone)
        )
      )
      .orderBy(asc(pickupAddresses.zone));

    return result
      .map((r) => r.zone)
      .filter((zone): zone is string => zone !== null);
  }

  /**
   * Get all active pickup addresses in a specific zone
   *
   * @param zone - The zone name to filter by
   * @returns Array of pickup addresses in the zone
   *
   * @example
   * ```ts
   * const marinaAddresses = await pickupAddressService.getByZone("Marina");
   * ```
   */
  async getByZone(zone: string): Promise<PickupAddress[]> {
    return this.getAll({ zone, activeOnly: true });
  }

  /**
   * Search pickup addresses by name or address
   *
   * Performs case-insensitive partial matching on name and address fields.
   * Only returns active addresses.
   *
   * @param query - The search query string
   * @returns Array of matching pickup addresses
   *
   * @example
   * ```ts
   * // Search for addresses containing "marriott"
   * const results = await pickupAddressService.search("marriott");
   *
   * // Search for addresses in a specific street
   * const streetResults = await pickupAddressService.search("marina walk");
   * ```
   */
  async search(query: string): Promise<PickupAddress[]> {
    if (!query || query.trim().length === 0) {
      return this.getAll({ activeOnly: true });
    }

    const searchPattern = `%${query.trim()}%`;

    return this.db.query.pickupAddresses.findMany({
      where: and(
        eq(pickupAddresses.organizationId, this.organizationId),
        eq(pickupAddresses.isActive, true),
        or(
          ilike(pickupAddresses.name, searchPattern),
          ilike(pickupAddresses.address, searchPattern),
          ilike(pickupAddresses.shortName, searchPattern)
        )
      ),
      orderBy: [asc(pickupAddresses.zone), asc(pickupAddresses.sortOrder), asc(pickupAddresses.name)],
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if a pickup address exists and is active
   *
   * @param id - The pickup address ID
   * @returns True if address exists and is active
   */
  async isActive(id: string): Promise<boolean> {
    const address = await this.getById(id);
    return address?.isActive === true;
  }

  /**
   * Reorder pickup addresses within a zone by updating sort order
   *
   * @param orderedIds - Array of pickup address IDs in desired order
   *
   * @example
   * ```ts
   * // Set the display order for addresses
   * await pickupAddressService.reorderAddresses([
   *   "addr_marina_1",
   *   "addr_marina_2",
   *   "addr_marina_3"
   * ]);
   * ```
   */
  async reorderAddresses(orderedIds: string[]): Promise<void> {
    // Update sort order for each address
    await Promise.all(
      orderedIds.map((id, index) =>
        this.db
          .update(pickupAddresses)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(pickupAddresses.id, id),
              eq(pickupAddresses.organizationId, this.organizationId)
            )
          )
      )
    );
  }
}
