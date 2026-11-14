import { seedPledges, seedReceipts } from "@/data/seed";
import type { FundingSummary, Pledge, Receipt } from "@/types/models";

/**
 * The pledge ledger.
 *
 * A single in-memory store owns every pledge and receipt. Reads go through the
 * helper functions below, and every write replaces the arrays with new ones and
 * notifies subscribers. `useSyncExternalStore` therefore gets a fresh snapshot
 * reference only when something genuinely changed, so the bill page and the
 * home page re-render with new totals the instant money moves — and never show
 * a stale figure.
 */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  // Bills are whole naira; fractions would only add noise to a headline total.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats an amount as Naira, tolerating a bad number rather than printing NaN. */
export function formatNaira(amount: number): string {
  return nairaFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/** What a donor supplies when they pledge towards a bill. */
export type NewPledgeInput = {
  causeId: string;
  donorName: string;
  amount: number;
};

// Seed data is copied so the store never mutates the read-only seed arrays.
let pledges: Pledge[] = [...seedPledges];
let receipts: Receipt[] = [...seedReceipts];

// Snapshot references. Replaced only inside `publish()` so repeated reads
// during a render return the exact same array and cannot loop a subscriber.
let pledgesSnapshot: Pledge[] = pledges;
let receiptsSnapshot: Receipt[] = receipts;

const listeners = new Set<() => void>();

function publish(): void {
  pledgesSnapshot = pledges;
  receiptsSnapshot = receipts;
  for (const listener of listeners) listener();
}

/** Subscribe to pledge/receipt changes. Returns the unsubscribe function. */
export function subscribeToPledges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable snapshot of every pledge (the `useSyncExternalStore` read). */
export function getPledgesSnapshot(): Pledge[] {
  return pledgesSnapshot;
}

/** Stable snapshot of every receipt. */
export function getReceiptsSnapshot(): Receipt[] {
  return receiptsSnapshot;
}

/** Pledges for one bill, newest last. */
export function getPledgesForCause(causeId: string): Pledge[] {
  return pledges.filter((pledge) => pledge.causeId === causeId);
}

/** Receipts for one bill, newest first. */
export function getReceiptsForCause(causeId: string): Receipt[] {
  return receipts
    .filter((receipt) => receipt.causeId === causeId)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

/** Look up a single receipt by its shareable id, or `null` when it is unknown. */
export function getReceipt(id: string): Receipt | null {
  return receipts.find((receipt) => receipt.id === id) ?? null;
}

/** The receipt a settled pledge produced, if it has one. */
export function getReceiptForPledge(pledgeId: string): Receipt | null {
  return receipts.find((receipt) => receipt.pledgeId === pledgeId) ?? null;
}

/** The most recently paid receipt for a bill, used to link "View receipt". */
export function getLatestReceiptForCause(causeId: string): Receipt | null {
  const forCause = receipts.filter((receipt) => receipt.causeId === causeId);
  if (forCause.length === 0) return null;

  return forCause.reduce((latest, receipt) =>
    receipt.paidAt > latest.paidAt ? receipt : latest,
  );
}

/**
 * Live funding totals for a bill.
 *
 * Only settled pledges count, so the Raised figure is always money that
 * actually cleared and is therefore backed by a receipt. Percent is clamped so
 * an over-funded bill never renders a progress bar wider than its track.
 */
export function getCauseFundingSummary(
  causeId: string,
  targetAmount: number,
): FundingSummary {
  const settled = pledges.filter(
    (pledge) => pledge.causeId === causeId && pledge.status === "settled",
  );

  const raised = settled.reduce((total, pledge) => total + pledge.amount, 0);
  const target = Number.isFinite(targetAmount) ? Math.max(0, targetAmount) : 0;
  const remaining = Math.max(target - raised, 0);

  let percent = 0;
  if (target > 0) {
    percent = Math.min(100, Math.round((raised / target) * 100));
  } else if (raised > 0) {
    // A bill with no stated target is fully covered by any settled money.
    percent = 100;
  }

  // Two pledges from the same person are one donor, not two.
  const donors = new Set(
    settled.map((pledge) => pledge.donorName.trim().toLowerCase()),
  ).size;

  const latestPledgeAt = settled.reduce<string | null>((latest, pledge) => {
    const at = pledge.settledAt ?? pledge.createdAt;
    return latest === null || at > latest ? at : latest;
  }, null);

  return {
    causeId,
    currency: "NGN",
    raised,
    target,
    remaining,
    percent,
    donors,
    pledges: settled.length,
    formattedRaised: formatNaira(raised),
    formattedTarget: formatNaira(target),
    formattedRemaining: formatNaira(remaining),
    latestPledgeAt,
    isFullyFunded: target > 0 && raised >= target,
  };
}

/** Highest numeric id in a collection, used to mint the next short id. */
function nextNumericId(records: ReadonlyArray<{ id: string }>): string {
  const highest = records.reduce((max, record) => {
    const value = Number(record.id);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return String(highest + 1);
}

/** A human-quotable payment reference, e.g. `ODG-2025-0004`. */
function nextReference(): string {
  const year = new Date().getUTCFullYear();
  return `ODG-${year}-${String(receipts.length + 1).padStart(4, "0")}`;
}

/**
 * Record a pledge that has cleared. Crediting a pledge immediately creates its
 * receipt, because in this app a settled pledge and a receipt are the same
 * event seen from two sides.
 *
 * Throws an Error with human-readable copy when the input is impossible, so the
 * caller can surface `error.message` directly.
 */
export function addPledge(input: NewPledgeInput): Pledge {
  const causeId = input.causeId.trim();
  if (!causeId) throw new Error("Choose a bill to pledge towards.");

  const amount = Number.isFinite(input.amount) ? Math.round(input.amount) : 0;
  if (amount <= 0) throw new Error("Enter an amount greater than zero.");

  const now = new Date().toISOString();
  const reference = nextReference();

  const pledge: Pledge = {
    id: `plg-${pledges.length + 1}`,
    causeId,
    donorName: input.donorName.trim() || "Anonymous donor",
    amount,
    currency: "NGN",
    status: "settled",
    createdAt: now,
    settledAt: now,
    reference,
  };

  const receipt: Receipt = {
    id: nextNumericId(receipts),
    pledgeId: pledge.id,
    causeId: pledge.causeId,
    donorName: pledge.donorName,
    amount: pledge.amount,
    currency: "NGN",
    reference,
    paidAt: now,
  };

  pledges = [...pledges, pledge];
  receipts = [...receipts, receipt];
  publish();

  return pledge;
}
