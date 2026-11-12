import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, RefreshCw } from "lucide-react";

import { PledgeSheet } from "@/components/PledgeSheet";
import { FEED_BILLS, type FeedBill } from "@/data/feedBills";
import { useApprovedFeedBills } from "@/hooks/useBillFeed";
import { usePledge } from "@/hooks/usePledge";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Verified bills — Odogwu" },
      {
        name: "description",
        content:
          "Browse verified hospital, school and rent bills on Odogwu with live raised progress.",
      },
    ],
  }),
  component: FeedPage,
});

/**
 * The verified bill a new pledge is made against from the feed. It is the same
 * bill the card's "View bill details" link opens, so the sheet, the bill page
 * and the receipt all describe one cause.
 */
const PLEDGE_CAUSE_ID = "1";

function FeedPage() {
  // Only admin-approved requests are surfaced here — a pending request stays in
  // the verification queue and out of the deck.
  const approvedBills = useApprovedFeedBills();

  // Approved requests may still be loading (or the hook may briefly return no
  // value), so the deck is always composed from real arrays. This keeps the
  // caught-up panel and Refresh feed from being reached by a crash.
  const bills = useMemo<FeedBill[]>(() => {
    const approved = Array.isArray(approvedBills) ? approvedBills : [];
    return [...approved, ...FEED_BILLS];
  }, [approvedBills]);

  /**
   * Position inside the verified deck. `index === total` (or a deck with no
   * bills at all) means the donor has reviewed everything and sees the
   * "You're all caught up" panel until they choose to refresh.
   */
  const [index, setIndex] = useState(0);

  // The pledge sheet controller: it resolves the bill and keeps its remaining
  // balance live, so the Amount field is prefilled with what is actually owed.
  const pledge = usePledge({ causeId: PLEDGE_CAUSE_ID });

  const total = bills.length;

  // The deck can shrink (for example when approved requests change), so the
  // position is always clamped to the current deck before rendering.
  const safeIndex = Math.min(index, total);
  const isCaughtUp = total === 0 || safeIndex >= total;
  const bill = isCaughtUp ? undefined : bills[safeIndex];

  const skip = () => {
    // Skipping is a pure deck move: it must never open the pledge sheet.
    // Skipping the last remaining card surfaces the end-of-deck state.
    setIndex((current) => Math.min(current + 1, total));
  };

  const previous = () => {
    // From the end-of-deck panel, Previous returns to the last bill card.
    setIndex((current) => Math.max(Math.min(current, total) - 1, 0));
  };

  const refresh = () => {
    // Rebuilds the deck from the top, including any newly approved requests,
    // and dismisses any sheet so the restored card is interactive again.
    pledge.closeSheet();
    setIndex(0);
    // Bring the first restored card back into view after a scroll-through.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-dvh bg-slate-50 px-4 pt-10 pb-28 sm:pb-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Odogwu</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Verified bills</h1>
        <p className="mt-2 text-slate-600">
          Every bill below was checked against documents from the hospital, school or landlord.
          Skip any story that is not for you — the next verified bill is right behind it.
        </p>

        {bill ? (
          <div
            data-testid="feed-card"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Verified
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {bill.type}
              </span>
            </div>

            {/* Approved admin requests keep their own headline so a donor can see
                exactly which request was published by the review desk. */}
            {bill.title ? (
              <p
                data-testid="feed-title"
                className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700"
              >
                {bill.title}
              </p>
            ) : null}

            <h2 className="mt-2 text-2xl font-bold text-slate-900" data-testid="feed-beneficiary">
              {bill.beneficiary}
            </h2>
            <p className="text-sm text-slate-500">
              {bill.location} · {bill.daysLeft} days left
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">{bill.amount}</p>
            <p className="mt-4 text-slate-700">{bill.story}</p>

            <div className="mt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-900">Raised {bill.raised}</span>
                <span className="text-slate-500">of {bill.goal}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${bill.percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{bill.percent}% funded</p>
            </div>

            <Link
              to="/cause/$id"
              params={{ id: bill.id }}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
            >
              View bill details <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div
            data-testid="feed-empty-state"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">You're all caught up</h2>
            <p className="mt-2 text-sm text-slate-600">
              You've reviewed every verified bill in this round. New requests appear here as soon
              as our review desk approves them — refresh to check again.
            </p>
            <button
              type="button"
              onClick={refresh}
              data-testid="feed-refresh-button"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh feed
            </button>
          </div>
        )}

        {/* Pledge/Skip live in a bar that is pinned to the bottom of the screen
            on phones (so both actions are always reachable without scrolling)
            and flows inline on tablet/desktop. No money moves until Paystack
            clears. */}
        {bill ? (
          <div
            data-testid="feed-action-bar"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none"
          >
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
              <button
                type="button"
                onClick={previous}
                className="shrink-0 whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4"
              >
                Previous
              </button>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {Math.min(safeIndex + 1, total)} of {total}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={pledge.openSheet}
                  data-testid="feed-pledge-button"
                  className="shrink-0 whitespace-nowrap rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Pledge
                </button>
                <button
                  type="button"
                  onClick={skip}
                  data-testid="feed-skip-button"
                  className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
        >
          Back to the swipe deck <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {/* The sheet lives at the page level so it can overlay any card. */}
        <PledgeSheet
          open={pledge.isOpen}
          onClose={pledge.closeSheet}
          causeId={pledge.causeId}
          causeTitle={pledge.causeTitle}
          remainingMinor={pledge.remainingMinor}
        />
      </div>
    </main>
  );
}
