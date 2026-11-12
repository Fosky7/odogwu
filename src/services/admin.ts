/**
 * Admin review helpers.
 *
 * The verification queue is a thin, typed layer over the shared bill ledger in
 * `@/lib/billStore`: it reads the pending slice and moves a request to
 * `approved` (publish to the public feed) or `rejected` (keep it out). Because
 * every screen reads the same ledger, the queue and the feed can never disagree
 * about what an admin decided.
 */

import {
  approveBill,
  getBill,
  getBillsSnapshot,
  getPendingBillsSnapshot,
  rejectBill,
  type BillRequest,
  type BillStatus,
} from "@/lib/billStore";

export type { BillRequest, BillStatus };

/** Page copy other screens (and the header doorway) can reuse verbatim. */
export const VERIFICATION_QUEUE_HEADING = "Verification queue";

/** The exact confirmations the reviewer sees after a decision. */
export const APPROVED_FLASH = "Request approved";
export const REJECTED_FLASH = "Request rejected";

/** Requests waiting for a decision, newest first. */
export function listPendingRequests(): BillRequest[] {
  return getPendingBillsSnapshot();
}

/** All known requests in a given state (useful for counts and history). */
export function listRequestsByStatus(status: BillStatus): BillRequest[] {
  return getBillsSnapshot().filter((request) => request.status === status);
}

export type QueueSummary = {
  pending: number;
  approved: number;
  rejected: number;
};

export function getQueueSummary(): QueueSummary {
  const summary: QueueSummary = { pending: 0, approved: 0, rejected: 0 };
  for (const request of getBillsSnapshot()) {
    summary[request.status] += 1;
  }
  return summary;
}

/** Publish a request to the feed. Returns the updated request, or null if gone. */
export function approveRequest(id: string): BillRequest | null {
  return approveBill(id);
}

/** Keep a request out of the feed. Returns the updated request, or null if gone. */
export function rejectRequest(id: string): BillRequest | null {
  return rejectBill(id);
}

/** Read a single request regardless of its status. */
export function getRequest(id: string): BillRequest | null {
  return getBill(id);
}

/**
 * Stable, locale-pinned date rendering (UTC) so the submitted timestamp reads
 * the same in every browser and on every machine.
 */
const submittedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatSubmittedAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return submittedAtFormatter.format(date);
}
