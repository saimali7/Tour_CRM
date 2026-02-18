export type CashCollectionStatus = "pending" | "collected";

export interface CashCollectionHistoryItem {
  at: string;
  action: "created" | "updated" | "collected";
  expectedAmount: string;
  collectedAmount?: string;
  notes?: string;
  actorId?: string;
}

export interface CashCollectionMetadata {
  enabled: true;
  method: "cash";
  status: CashCollectionStatus;
  expectedAmount: string;
  currency: string;
  notes?: string;
  collectedAmount?: string;
  collectedAt?: string;
  history: CashCollectionHistoryItem[];
}

interface MetadataContainer {
  cashCollection?: CashCollectionMetadata;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getCashCollectionMetadata(
  metadata: Record<string, unknown> | null | undefined
): CashCollectionMetadata | null {
  if (!isRecord(metadata)) return null;
  const cashCollection = metadata.cashCollection;
  if (!isRecord(cashCollection)) return null;
  if (cashCollection.method !== "cash" || cashCollection.enabled !== true) return null;
  if (typeof cashCollection.expectedAmount !== "string") return null;
  if (typeof cashCollection.currency !== "string") return null;
  if (cashCollection.status !== "pending" && cashCollection.status !== "collected") return null;

  const history = Array.isArray(cashCollection.history)
    ? cashCollection.history.filter(isRecord).map((item) => {
        const action: CashCollectionHistoryItem["action"] =
          item.action === "collected" || item.action === "updated" || item.action === "created"
            ? item.action
            : "updated";
        return {
          at: String(item.at ?? new Date().toISOString()),
          action,
          expectedAmount: String(item.expectedAmount ?? cashCollection.expectedAmount),
          collectedAmount: item.collectedAmount ? String(item.collectedAmount) : undefined,
          notes: item.notes ? String(item.notes) : undefined,
          actorId: item.actorId ? String(item.actorId) : undefined,
        };
      })
    : [];

  return {
    enabled: true,
    method: "cash",
    status: cashCollection.status,
    expectedAmount: cashCollection.expectedAmount,
    currency: cashCollection.currency,
    notes: cashCollection.notes ? String(cashCollection.notes) : undefined,
    collectedAmount: cashCollection.collectedAmount
      ? String(cashCollection.collectedAmount)
      : undefined,
    collectedAt: cashCollection.collectedAt ? String(cashCollection.collectedAt) : undefined,
    history,
  };
}

export function withCashCollectionMetadata(
  metadata: Record<string, unknown> | null | undefined,
  cashCollection: CashCollectionMetadata
): Record<string, unknown> {
  const base: MetadataContainer = isRecord(metadata) ? { ...metadata } : {};
  base.cashCollection = cashCollection;
  return base;
}

export function createPendingCashCollection(
  expectedAmount: string,
  currency: string,
  notes?: string,
  actorId?: string
): CashCollectionMetadata {
  const now = new Date().toISOString();
  return {
    enabled: true,
    method: "cash",
    status: "pending",
    expectedAmount,
    currency,
    notes,
    history: [
      {
        at: now,
        action: "created",
        expectedAmount,
        notes,
        actorId,
      },
    ],
  };
}

export function updatePendingCashCollection(
  current: CashCollectionMetadata,
  expectedAmount: string,
  notes?: string,
  actorId?: string
): CashCollectionMetadata {
  const now = new Date().toISOString();
  return {
    ...current,
    status: current.status === "collected" ? "collected" : "pending",
    expectedAmount,
    notes,
    history: [
      ...current.history,
      {
        at: now,
        action: "updated",
        expectedAmount,
        notes,
        actorId,
      },
    ],
  };
}

export function markCashCollectionCollected(
  current: CashCollectionMetadata,
  collectedAmount: string,
  actorId?: string
): CashCollectionMetadata {
  const now = new Date().toISOString();
  return {
    ...current,
    status: "collected",
    collectedAt: now,
    collectedAmount,
    history: [
      ...current.history,
      {
        at: now,
        action: "collected",
        expectedAmount: current.expectedAmount,
        collectedAmount,
        actorId,
      },
    ],
  };
}
