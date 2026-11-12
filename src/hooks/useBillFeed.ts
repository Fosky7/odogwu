import { useMemo, useSyncExternalStore } from "react";

import {
  formatNairaAmount,
  getApprovedBillsSnapshot,
  getPendingBillsSnapshot,
  subscribeToBillStore,
  type BillRequest,
} from "@/lib/billStore";

/**
 * The shape the feed card renders. Approved admin requests are mapped into this
 * shape so the feed page can mix them with its standing verified bills without
 * knowing where a bill came from.
 */
export type FeedCardBill = {
  id: string;
  title: string;
  beneficiary: string;
  amount: string;
  raised: string;
  goal: string;
  percent: number;
  type: string;
  location: string;
  story: string;
  daysLeft: number;
};

/** Newly approved requests get a fresh two-week window to be funded. */
const NEW_REQUEST_WINDOW_DAYS = 14;

function toFeedCardBill(request: BillRequest): FeedCardBill {
  const goal = formatNairaAmount(request.amount);

  return {
    id: request.id,
    title: request.title,
    beneficiary: request.beneficiary,
    amount: goal,
    // A freshly approved request has no settled money behind it yet.
    raised: formatNairaAmount(0),
    goal,
    percent: 0,
    type: request.category,
    location: request.location,
    story: request.description,
    daysLeft: NEW_REQUEST_WINDOW_DAYS,
  };
}

/**
 * Approved requests, newest first — the part of the feed deck that comes from
 * the admin verification queue. Pending requests never appear here.
 */
export function useApprovedFeedBills(): FeedCardBill[] {
  const approved = useSyncExternalStore(
    subscribeToBillStore,
    getApprovedBillsSnapshot,
    getApprovedBillsSnapshot,
  );

  return useMemo(() => approved.map(toFeedCardBill), [approved]);
}

/** Requests still waiting for an admin decision (the verification queue). */
export function usePendingBillRequests(): BillRequest[] {
  return useSyncExternalStore(
    subscribeToBillStore,
    getPendingBillsSnapshot,
    getPendingBillsSnapshot,
  );
}

/** Convenience wrapper for screens that need both sides of the ledger. */
export function useBillFeed(): { approved: FeedCardBill[]; pending: BillRequest[] } {
  const approved = useApprovedFeedBills();
  const pending = usePendingBillRequests();
  return { approved, pending };
}
