export type CashCollectionStatus = "pending" | "collected";

export interface CashCollectionMetadata {
  enabled: true;
  method: "cash";
  status: CashCollectionStatus;
  expectedAmount: string;
  currency: string;
  notes?: string;
  collectedAmount?: string;
  collectedAt?: string;
}

export type PaymentStatusWithCash =
  | "pending"
  | "partial"
  | "paid"
  | "refunded"
  | "failed"
  | "cash_collection";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getCashCollectionMetadata(metadata: unknown): CashCollectionMetadata | null {
  if (!isRecord(metadata)) return null;
  const cashCollection = metadata.cashCollection;
  if (!isRecord(cashCollection)) return null;
  if (cashCollection.enabled !== true || cashCollection.method !== "cash") return null;
  if (cashCollection.status !== "pending" && cashCollection.status !== "collected") return null;
  if (typeof cashCollection.expectedAmount !== "string") return null;
  if (typeof cashCollection.currency !== "string") return null;

  return {
    enabled: true,
    method: "cash",
    status: cashCollection.status,
    expectedAmount: cashCollection.expectedAmount,
    currency: cashCollection.currency,
    notes: typeof cashCollection.notes === "string" ? cashCollection.notes : undefined,
    collectedAmount:
      typeof cashCollection.collectedAmount === "string"
        ? cashCollection.collectedAmount
        : undefined,
    collectedAt:
      typeof cashCollection.collectedAt === "string" ? cashCollection.collectedAt : undefined,
  };
}

export function isCashCollectionPending(metadata: unknown): boolean {
  const cash = getCashCollectionMetadata(metadata);
  return !!cash && cash.status === "pending";
}

export function getDisplayPaymentStatus(
  paymentStatus: string,
  metadata: unknown
): PaymentStatusWithCash {
  if (isCashCollectionPending(metadata)) {
    return "cash_collection";
  }

  if (
    paymentStatus === "pending" ||
    paymentStatus === "partial" ||
    paymentStatus === "paid" ||
    paymentStatus === "refunded" ||
    paymentStatus === "failed"
  ) {
    return paymentStatus;
  }

  return "pending";
}
