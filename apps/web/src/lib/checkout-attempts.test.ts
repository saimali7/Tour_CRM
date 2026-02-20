import { describe, expect, it } from "vitest";
import { hashCheckoutFingerprint, isValidIdempotencyKey } from "./checkout-attempts";

describe("checkout fingerprint hashing", () => {
  it("is deterministic for equivalent objects", () => {
    const first = hashCheckoutFingerprint({
      bookingDate: "2026-02-20",
      tourId: "tour_123",
      participants: [
        { type: "adult", firstName: "Alice" },
        { type: "child", firstName: "Sam" },
      ],
    });

    const second = hashCheckoutFingerprint({
      participants: [
        { firstName: "Alice", type: "adult" },
        { firstName: "Sam", type: "child" },
      ],
      tourId: "tour_123",
      bookingDate: "2026-02-20",
    });

    expect(first).toBe(second);
  });

  it("changes when payload changes", () => {
    const first = hashCheckoutFingerprint({ totalCents: 12000 });
    const second = hashCheckoutFingerprint({ totalCents: 13000 });
    expect(first).not.toBe(second);
  });
});

describe("idempotency key validation", () => {
  it("accepts expected idempotency keys", () => {
    expect(isValidIdempotencyKey("web-1700000000-abc123XYZ")).toBe(true);
    expect(isValidIdempotencyKey("book:org_demo:key_01")).toBe(true);
  });

  it("rejects malformed or short keys", () => {
    expect(isValidIdempotencyKey(null)).toBe(false);
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(isValidIdempotencyKey("invalid key with spaces")).toBe(false);
    expect(isValidIdempotencyKey("invalid$key*chars")).toBe(false);
  });
});
