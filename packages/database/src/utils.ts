import { createId as cuid2 } from "@paralleldrive/cuid2";

// Generate a CUID2 - collision-resistant unique identifier
export function createId(): string {
  return cuid2();
}

// Generate a prefixed ID for better debugging
export function createPrefixedId(prefix: string): string {
  return `${prefix}_${cuid2()}`;
}
