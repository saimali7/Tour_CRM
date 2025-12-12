import { describe, it, expect } from "vitest";
import { slugSchema, emailSchema } from "./common";

describe("slugSchema", () => {
  it("should accept valid slugs", () => {
    expect(slugSchema.safeParse("hello-world").success).toBe(true);
    expect(slugSchema.safeParse("my-tour-2024").success).toBe(true);
    expect(slugSchema.safeParse("abc").success).toBe(true);
  });

  it("should reject invalid slugs", () => {
    expect(slugSchema.safeParse("ab").success).toBe(false); // too short
    expect(slugSchema.safeParse("Hello-World").success).toBe(false); // uppercase
    expect(slugSchema.safeParse("hello_world").success).toBe(false); // underscore
    expect(slugSchema.safeParse("hello world").success).toBe(false); // space
  });
});

describe("emailSchema", () => {
  it("should accept valid emails", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user.name@domain.co.uk").success).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(emailSchema.safeParse("notanemail").success).toBe(false);
    expect(emailSchema.safeParse("missing@domain").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});
