import { ValidationError } from "../types";

/**
 * Entity Validation Helpers
 *
 * Common patterns for validating entity existence and throwing appropriate errors.
 * These helpers reduce boilerplate in service methods that need to verify
 * entities exist before performing operations.
 *
 * @example
 * ```typescript
 * import { requireEntity, requireEntityArray } from "@tour/services/lib/validation-helpers";
 *
 * // Verify a single entity exists
 * const booking = await requireEntity(
 *   () => this.db.query.bookings.findFirst({ where: ... }),
 *   "Booking",
 *   bookingId
 * );
 *
 * // Verify multiple entities exist
 * const bookings = await requireEntityArray(
 *   () => this.db.query.bookings.findMany({ where: ... }),
 *   "Bookings"
 * );
 * ```
 */

import { NotFoundError } from "../types";

/**
 * Ensures an entity exists, throwing NotFoundError if not.
 *
 * @param getter - Async function that fetches the entity
 * @param entityName - Name of the entity type for error messages
 * @param id - Optional ID to include in error message
 * @returns The entity if found
 * @throws NotFoundError if entity is null or undefined
 *
 * @example
 * ```typescript
 * // In a service method
 * const tour = await requireEntity(
 *   () => this.db.query.tours.findFirst({
 *     where: and(eq(tours.id, tourId), eq(tours.organizationId, this.organizationId))
 *   }),
 *   "Tour",
 *   tourId
 * );
 * ```
 */
export async function requireEntity<T>(
  getter: () => Promise<T | null | undefined>,
  entityName: string,
  id?: string
): Promise<T> {
  const entity = await getter();

  if (!entity) {
    throw new NotFoundError(entityName, id);
  }

  return entity;
}

/**
 * Ensures an array of entities is not empty, throwing NotFoundError if empty.
 *
 * @param getter - Async function that fetches the entities
 * @param entityName - Name of the entity type for error messages
 * @returns The entities array if not empty
 * @throws NotFoundError if array is empty
 *
 * @example
 * ```typescript
 * // Verify at least one booking exists
 * const bookings = await requireEntityArray(
 *   () => this.db.query.bookings.findMany({
 *     where: and(eq(bookings.tourId, tourId), eq(bookings.organizationId, this.organizationId))
 *   }),
 *   "Bookings for tour"
 * );
 * ```
 */
export async function requireEntityArray<T>(
  getter: () => Promise<T[]>,
  entityName: string
): Promise<T[]> {
  const entities = await getter();

  if (!entities || entities.length === 0) {
    throw new NotFoundError(entityName);
  }

  return entities;
}

/**
 * Synchronous version of requireEntity for use with pre-fetched data.
 *
 * @param entity - The entity to validate
 * @param entityName - Name of the entity type for error messages
 * @param id - Optional ID to include in error message
 * @returns The entity if not null/undefined
 * @throws NotFoundError if entity is null or undefined
 *
 * @example
 * ```typescript
 * // Validate a pre-fetched entity
 * const booking = data.bookings.find(b => b.id === id);
 * const validatedBooking = requireEntitySync(booking, "Booking", id);
 * ```
 */
export function requireEntitySync<T>(
  entity: T | null | undefined,
  entityName: string,
  id?: string
): T {
  if (!entity) {
    throw new NotFoundError(entityName, id);
  }

  return entity;
}

/**
 * Validates that a value is defined (not null or undefined).
 * Useful for validating required fields without database lookups.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The value if defined
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * const email = requireDefined(customer.email, "Customer email");
 * ```
 */
export function requireDefined<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required but was not provided`, { [fieldName]: ["Required field is missing"] });
  }

  return value;
}
