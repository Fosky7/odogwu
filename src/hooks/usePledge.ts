import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { toMinorUnits } from "@/lib/payments";
import { getCause } from "@/services/causes";
import {
  getCauseFundingSummary,
  getPledgesSnapshot,
  subscribeToPledges,
} from "@/services/pledges";

/**
 * Controller for the "Make a pledge" sheet.
 *
 * The hook owns the sheet's open/closed state and keeps the suggested amount in
 * step with the pledge ledger: the remaining balance is recomputed from settled
 * pledges, so reopening the sheet always suggests what the bill actually still
 * owes instead of a figure captured at first render.
 */
export type PledgeController = {
  /** Whether the sheet is currently mounted on screen. */
  isOpen: boolean;
  /** Open the sheet (e.g. when the feed's "Pledge" button is pressed). */
  openSheet: () => void;
  /** Dismiss the sheet without moving any money. */
  closeSheet: () => void;
  /** Verified bill the pledge is for. */
  causeId: string;
  /** Human title shown inside the sheet. */
  causeTitle: string;
  /** Balance still owed on the bill, in kobo. Never negative. */
  remainingMinor: number;
};

export function usePledge({ causeId }: { causeId: string }): PledgeController {
  // Live ledger snapshot: every settled pledge republishes this value, which in
  // turn recomputes the remaining balance below.
  const pledges = useSyncExternalStore(
    subscribeToPledges,
    getPledgesSnapshot,
    getPledgesSnapshot,
  );

  const cause = useMemo(() => {
    try {
      return getCause(causeId);
    } catch {
      return null;
    }
  }, [causeId]);

  const remainingMinor = useMemo(() => {
    if (!cause) return 0;
    try {
      const funding = getCauseFundingSummary(cause.id, cause.amountNeeded);
      return toMinorUnits(funding.remaining);
    } catch {
      return 0;
    }
    // `pledges` is the external snapshot that changes the funding summary.
  }, [cause, pledges]);

  const [isOpen, setIsOpen] = useState(false);

  // Stable identities so the sheet's focus/escape effect does not re-run on
  // every parent render (which would steal focus from the amount field).
  const openSheet = useCallback(() => setIsOpen(true), []);
  const closeSheet = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openSheet,
    closeSheet,
    causeId,
    causeTitle: cause?.title ?? "Verified bill",
    remainingMinor,
  };
}
