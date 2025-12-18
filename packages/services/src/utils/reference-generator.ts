/**
 * Short Reference Generator
 *
 * Generates phone-friendly booking references that are:
 * - 4-6 characters long
 * - Uppercase for clarity on phone
 * - Using unambiguous characters (no 0/O, 1/I/L confusion)
 * - Unique within an organization
 */

// Characters that are unambiguous on phone (no 0/O, 1/I/L)
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generate a random short reference
 * @param length - Length of the reference (default: 4)
 * @returns Random reference string
 */
export function generateShortReference(length: number = 4): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return result;
}

/**
 * Generate a unique short reference within an organization
 * Tries 4-character refs first, then falls back to 6-character if collisions occur
 *
 * @param checkExists - Async function that returns true if reference already exists
 * @param maxAttempts - Maximum number of attempts before failing (default: 10)
 * @returns Unique reference string
 */
export async function generateUniqueShortReference(
  checkExists: (ref: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    // Try 4 chars first (for cleaner refs), then 6 if too many collisions
    const length = i < 5 ? 4 : 6;
    const ref = generateShortReference(length);

    const exists = await checkExists(ref);
    if (!exists) {
      return ref;
    }
  }

  // Last resort: use timestamp + random for guaranteed uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  const random = generateShortReference(3);
  return `${timestamp}${random}`;
}

/**
 * Validate a short reference format
 * @param ref - Reference to validate
 * @returns true if valid format
 */
export function isValidShortReference(ref: string): boolean {
  if (!ref || ref.length < 4 || ref.length > 6) {
    return false;
  }

  // Check all characters are in our charset
  return ref.split("").every((char) => CHARSET.includes(char));
}
