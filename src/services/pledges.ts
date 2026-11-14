import {
  addPledge as addPledgeToLedger,
  formatNaira as formatNairaAmount,
  getCauseFundingSummary as readCauseFundingSummary,
  getLatestReceiptForCause as readLatestReceiptForCause,
  getPledgesForCause as readPledgesForCause,
  getPledgesSnapshot as readPledgesSnapshot,
  getReceipt as readReceipt,
  getReceiptForPledge as readReceiptForPledge,
  getReceiptsForCause as readReceiptsForCause,
  getReceiptsSnapshot as readReceiptsSnapshot,
  subscribeToPledges as subscribeToPledgeLedger,
  type NewPledgeInput,
} from "@/lib/pledges";
import type { FundingSummary, Pledge, Receipt } from "@/types/models";

/**
 * Pledge & receipt service — the single import surface pages use.
 *
 * The ledger itself lives in `@/lib/pledges` (an in-memory, subscribable store).
 * This module is the app-facing boundary: it re-exports the reads and writes the
 * pages need with a stable, documented API, so a page never reaches into the
 * store internals and the storage strategy can change without touching a route.
 *
 * Two rules are enforced here rather than in every caller:
 *   1. Funding totals only ever count `settled` pledges, so a Raised figure is
 *      always money that cleared and therefore has a receipt behind it.
 *   2. Reads are snapshot-stable, which is what lets `useSyncExternalStore`
 *      render the same value twice without looping.
 */

export type { NewPledgeInput };
export type { FundingSummary, Pledge, Receipt };

/**
 * Subscribe to pledge/receipt changes. Returns the unsubscribe function, which
 * is exactly the contract `useSyncExternalStore` expects.
 */
export function subscribeToPledges(listener: () => void): () => void {
  return subscribeToPledgeLedger(listener);
}

/**
 * Stable snapshot of every pledge. Pass this as both the client read and the
 * server snapshot so the first render already shows real totals.
 */
export function getPledgesSnapshot(): Pledge[] {
  return readPledgesSnapshot();
}

/** Stable snapshot of every receipt. */
export function getReceiptsSnapshot(): Receipt[] {
  return readReceiptsSnapshot();
}

/** Every pledge recorded against one bill. */
export function getPledgesForCause(causeId: string): Pledge[] {
  return readPledgesForCause(causeId);
}

/** Receipts for one bill, newest first. */
export function getReceiptsForCause(causeId: string): Receipt[] {
  return readReceiptsForCause(causeId);
}

/**
 * Look up a single receipt by its shareable id.
 *
 * An unknown or blank reference returns `null` rather than throwing: the route
 * renders a "Receipt not found" state, because a missing receipt means a wrong
 * link, never "still loading".
 */
export function getReceipt(id: string): Receipt | null {
  const reference = String(id ?? "").trim();
  if (!reference) return null;

  // The receipt's own id is the canonical lookup. A dashboard pledge link may
  // carry the quotable payment reference instead, so fall back to matching on
  // it rather than dead-ending on a receipt that plainly exists.
  const direct = readReceipt(reference);
  if (direct) return direct;

  return (
    readReceiptsSnapshot().find((receipt) => receipt.reference === reference) ?? null
  );
}

/** The receipt a settled pledge produced, if it has one. */
export function getReceiptForPledge(pledgeId: string): Receipt | null {
  return readReceiptForPledge(pledgeId);
}

/**
 * The most recently paid receipt for a bill. This is what the "View receipt"
 * link on the bill page points at, so the newest proof is always one click away.
 */
export function getLatestReceiptForCause(causeId: string): Receipt | null {
  return readLatestReceiptForCause(causeId);
}

/**
 * Live funding totals for a bill: Raised, Remaining, Donors, Pledges and the
 * percentage of the target covered.
 *
 * `targetAmount` is clamped inside the ledger, so a bad record can never produce
 * a negative Remaining total or a progress bar wider than its track.
 */
export function getCauseFundingSummary(
  causeId: string,
  targetAmount: number,
): FundingSummary {
  return readCauseFundingSummary(causeId, targetAmount);
}

/**
 * Record a pledge that has cleared. Crediting a pledge mints its receipt at the
 * same time, because in this app a settled pledge and a receipt are one event.
 *
 * Throws an Error carrying human-readable copy when the input is impossible, so
 * a form can surface `error.message` directly.
 */
export function addPledge(input: NewPledgeInput): Pledge {
  return addPledgeToLedger(input);
}

/** Format an amount as Naira (e.g. ₦25,000), tolerating a bad number. */
export function formatNaira(amount: number): string {
  return formatNairaAmount(amount);
}
