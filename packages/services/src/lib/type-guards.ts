/**
 * Type Guards for Drizzle ORM Query Results
 *
 * These guards validate that relations loaded correctly before using the data.
 * They provide runtime safety and useful error messages when Drizzle's type
 * inference doesn't match the actual loaded relations.
 *
 * There are two patterns for using these guards:
 *
 * 1. **Validation-only (recommended for services with internal types):**
 *    ```ts
 *    const bookingsRaw = await db.query.bookings.findMany({ with: { customer: true } });
 *    validateBookingWithRelationsArray(bookingsRaw, 'getTourRuns');
 *    const typedBookings = bookingsRaw as unknown as BookingWithRelations[];
 *    ```
 *
 * 2. **Type assertion (when you want TypeScript narrowing):**
 *    ```ts
 *    const bookingsRaw = await db.query.bookings.findMany({ with: { customer: true } });
 *    assertBookingWithRelationsArray(bookingsRaw, 'getTourRuns');
 *    // bookingsRaw is now typed as BookingWithRelationsShape[]
 *    ```
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Check if value is a non-empty string
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number
 */
function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

// =============================================================================
// BOOKING TYPE GUARDS
// =============================================================================

/**
 * Shape of a booking with customer, tour, and participants relations loaded.
 * This matches the internal BookingWithRelations types used in services.
 */
export interface BookingWithRelationsShape {
  id: string;
  referenceNumber: string;
  customerId: string;
  status: string;
  totalParticipants: number;
  adultCount: number;
  childCount: number | null;
  infantCount: number | null;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  internalNotes: string | null;
  paymentStatus: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  tour: {
    id: string;
    name: string;
    slug: string;
    durationMinutes: number;
  } | null;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

/**
 * Extended booking shape that includes booking date/time fields
 * Used in tour run queries where date-based grouping is needed
 */
export interface BookingWithDateFieldsShape extends BookingWithRelationsShape {
  tourId: string | null;
  bookingDate: Date | null;
  bookingTime: string | null;
}

/**
 * Validate that a single booking has the expected structure with relations
 */
export function isBookingWithRelations(value: unknown): value is BookingWithRelationsShape {
  if (!isObject(value)) return false;

  // Check core booking fields
  if (!isString(value.id)) return false;
  if (!isString(value.referenceNumber)) return false;
  if (!isString(value.customerId)) return false;
  if (!isString(value.status)) return false;
  if (!isNumber(value.totalParticipants)) return false;
  if (!isNumber(value.adultCount)) return false;
  if (!isString(value.paymentStatus)) return false;

  // Check participants array exists (can be empty)
  if (!Array.isArray(value.participants)) return false;

  // Customer can be null (optional relation)
  if (value.customer !== null && !isObject(value.customer)) return false;

  // Tour can be null (optional relation)
  if (value.tour !== null && !isObject(value.tour)) return false;

  return true;
}

/**
 * Assert that a value is a booking with relations.
 * Throws with context if validation fails.
 */
export function assertBookingWithRelations(
  value: unknown,
  context?: string
): asserts value is BookingWithRelationsShape {
  if (!isObject(value)) {
    throw new TypeError(
      `Expected booking object${context ? ` in ${context}` : ""}, got ${typeof value}`
    );
  }

  if (!isString(value.id)) {
    throw new TypeError(
      `Invalid booking: missing or invalid 'id' field${context ? ` in ${context}` : ""}`
    );
  }

  if (!isString(value.customerId)) {
    throw new TypeError(
      `Invalid booking: missing or invalid 'customerId' field${context ? ` in ${context}` : ""}`
    );
  }

  if (!Array.isArray(value.participants)) {
    throw new TypeError(
      `Invalid booking: 'participants' relation not loaded${context ? ` in ${context}` : ""}. ` +
        "Ensure the query includes { with: { participants: true } }"
    );
  }

  if (!isBookingWithRelations(value)) {
    throw new TypeError(
      `Invalid booking structure${context ? ` in ${context}` : ""}. ` +
        "Check that all required relations are loaded."
    );
  }
}

/**
 * Assert that an array contains bookings with relations.
 * Validates the first element if array is non-empty.
 */
export function assertBookingWithRelationsArray(
  value: unknown,
  context?: string
): asserts value is BookingWithRelationsShape[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Expected booking array${context ? ` in ${context}` : ""}, got ${typeof value}`
    );
  }

  // Validate first element if non-empty (performance optimization)
  if (value.length > 0) {
    assertBookingWithRelations(value[0], context);
  }
}

/**
 * Validate bookings array without changing TypeScript type.
 * Use this when you need to keep using `as unknown as` casts but want runtime validation.
 * Throws TypeError if validation fails.
 */
export function validateBookingWithRelationsArray<T>(
  value: T,
  context?: string
): T {
  assertBookingWithRelationsArray(value, context);
  return value;
}

/**
 * Validate booking with date fields (for tour run queries)
 */
export function isBookingWithDateFields(value: unknown): value is BookingWithDateFieldsShape {
  if (!isBookingWithRelations(value)) return false;
  // Date fields can be null but must exist
  if (!("tourId" in value)) return false;
  if (!("bookingDate" in value)) return false;
  if (!("bookingTime" in value)) return false;
  return true;
}

/**
 * Assert booking array has date fields for tour run grouping
 */
export function assertBookingWithDateFieldsArray(
  value: unknown,
  context?: string
): asserts value is BookingWithDateFieldsShape[] {
  assertBookingWithRelationsArray(value, context);

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0] as unknown as Record<string, unknown>;
    if (first && !("tourId" in first)) {
      throw new TypeError(
        `Invalid booking: missing 'tourId' field${context ? ` in ${context}` : ""}. ` +
          "This field is required for tour run grouping."
      );
    }
    if (first && !("bookingDate" in first)) {
      throw new TypeError(
        `Invalid booking: missing 'bookingDate' field${context ? ` in ${context}` : ""}. ` +
          "This field is required for tour run grouping."
      );
    }
    if (first && !("bookingTime" in first)) {
      throw new TypeError(
        `Invalid booking: missing 'bookingTime' field${context ? ` in ${context}` : ""}. ` +
          "This field is required for tour run grouping."
      );
    }
  }
}

/**
 * Validate booking array with date fields without changing TypeScript type.
 * Throws TypeError if validation fails.
 */
export function validateBookingWithDateFieldsArray<T>(
  value: T,
  context?: string
): T {
  assertBookingWithDateFieldsArray(value, context);
  return value;
}

// =============================================================================
// GUIDE ASSIGNMENT TYPE GUARDS
// =============================================================================

/**
 * Shape of a guide assignment with guide relation loaded
 */
export interface GuideAssignmentWithRelationsShape {
  id: string;
  bookingId: string;
  guideId: string | null;
  outsourcedGuideName: string | null;
  outsourcedGuideContact: string | null;
  status: string;
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
}

/**
 * Validate that a guide assignment has the expected structure
 */
export function isGuideAssignmentWithRelations(
  value: unknown
): value is GuideAssignmentWithRelationsShape {
  if (!isObject(value)) return false;

  if (!isString(value.id)) return false;
  if (!isString(value.bookingId)) return false;
  if (!isString(value.status)) return false;

  // guideId can be null for outsourced guides
  if (value.guideId !== null && !isString(value.guideId)) return false;

  // guide relation can be null
  if (value.guide !== null && !isObject(value.guide)) return false;

  return true;
}

/**
 * Assert that a value is a guide assignment with relations
 */
export function assertGuideAssignmentWithRelations(
  value: unknown,
  context?: string
): asserts value is GuideAssignmentWithRelationsShape {
  if (!isObject(value)) {
    throw new TypeError(
      `Expected guide assignment object${context ? ` in ${context}` : ""}, got ${typeof value}`
    );
  }

  if (!isString(value.id)) {
    throw new TypeError(
      `Invalid guide assignment: missing or invalid 'id' field${context ? ` in ${context}` : ""}`
    );
  }

  if (!isString(value.bookingId)) {
    throw new TypeError(
      `Invalid guide assignment: missing or invalid 'bookingId' field${context ? ` in ${context}` : ""}`
    );
  }

  if (!isGuideAssignmentWithRelations(value)) {
    throw new TypeError(
      `Invalid guide assignment structure${context ? ` in ${context}` : ""}. ` +
        "Check that the guide relation is loaded."
    );
  }
}

/**
 * Assert that an array contains guide assignments with relations
 */
export function assertGuideAssignmentWithRelationsArray(
  value: unknown,
  context?: string
): asserts value is GuideAssignmentWithRelationsShape[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Expected guide assignment array${context ? ` in ${context}` : ""}, got ${typeof value}`
    );
  }

  if (value.length > 0) {
    assertGuideAssignmentWithRelations(value[0], context);
  }
}

/**
 * Validate guide assignment array without changing TypeScript type.
 * Throws TypeError if validation fails.
 */
export function validateGuideAssignmentWithRelationsArray<T>(
  value: T,
  context?: string
): T {
  assertGuideAssignmentWithRelationsArray(value, context);
  return value;
}

// =============================================================================
// GUIDE PORTAL SPECIFIC TYPE GUARDS
// =============================================================================

/**
 * Shape of booking with tour and customer for guide portal manifest
 */
export interface GuidePortalBookingShape {
  id: string;
  tourId: string | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  status: string;
  totalParticipants: number;
  total: string | null;
  tour: {
    id: string;
    name: string;
    maxParticipants: number;
  } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

/**
 * Validate guide portal booking shape
 */
export function isGuidePortalBooking(value: unknown): value is GuidePortalBookingShape {
  if (!isObject(value)) return false;

  if (!isString(value.id)) return false;
  if (!isString(value.status)) return false;

  // tour and customer can be null
  if (value.tour !== null && !isObject(value.tour)) return false;
  if (value.customer !== null && !isObject(value.customer)) return false;

  return true;
}

/**
 * Assert array of guide portal bookings
 */
export function assertGuidePortalBookingArray(
  value: unknown,
  context?: string
): asserts value is GuidePortalBookingShape[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Expected guide portal booking array${context ? ` in ${context}` : ""}, got ${typeof value}`
    );
  }

  if (value.length > 0 && !isGuidePortalBooking(value[0])) {
    throw new TypeError(
      `Invalid guide portal booking structure${context ? ` in ${context}` : ""}. ` +
        "Check that tour and customer relations are loaded."
    );
  }
}

/**
 * Validate guide portal booking array without changing TypeScript type.
 * Throws TypeError if validation fails.
 */
export function validateGuidePortalBookingArray<T>(
  value: T,
  context?: string
): T {
  assertGuidePortalBookingArray(value, context);
  return value;
}

/**
 * Validate a single booking with relations without changing TypeScript type.
 * Throws TypeError if validation fails.
 */
export function validateBookingWithRelations<T>(
  value: T,
  context?: string
): T {
  assertBookingWithRelations(value, context);
  return value;
}
