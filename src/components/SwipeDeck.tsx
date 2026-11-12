import { useCallback, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { PledgeSheet } from "@/components/PledgeSheet";
import { usePledge } from "@/hooks/usePledge";
import type { FeedBill } from "@/data/feedBills";

/** The verified cause the deck's Pledge action funds when no id is supplied. */
const DEFAULT_CAUSE_ID = "1";

export type SwipeDeckProps = {
  /** The verified bills to swipe through, in display order. */
  bills: FeedBill[];
  /** Optional footer rendered under the deck (e.g. a link to the full feed). */
  footer?: ReactNode;
  /** Verified cause the deck's Pledge button funds. Defaults to bill #1. */
  causeId?: string;
  /**
   * Verified cause the sheet collects a pledge for, when it differs from the
   * bill whose details the card opens. A fully funded bill has nothing left to
   * pledge, so the sheet can be pointed at a bill that still owes money while
   * "View bill details" keeps opening the card's own bill.
   */
  pledgeCauseId?: string;
};

/**
 * The one-bill-at-a-time deck used on the home page.
 *
 * Two actions sit under the card and they are deliberately different:
 *  - "Pledge" opens the "Make a pledge" sheet for the verified cause. Nothing is
 *    charged there; the sheet only hands a validated amount to the Paystack
 *    checkout.
 *  - "Skip" simply advances to the next bill. It never opens the sheet and it
 *    never moves money — the next story is the whole outcome.
 *
 * The card keeps its stable test ids (`swipe-deck`, `deck-beneficiary`,
 * `deck-amount`) so the rendered bill, its Naira total and the skip behaviour
 * stay verifiable through the real UI.
 */
export function SwipeDeck({
  bills,
  footer,
  causeId = DEFAULT_CAUSE_ID,
  pledgeCauseId,
}: SwipeDeckProps) {
  const [index, setIndex] = useState(0);

  // Sheet controller: it keeps the cause's remaining balance live, so the amount
  // field always suggests what the bill actually still owes.
  const pledge = usePledge({ causeId: pledgeCauseId ?? causeId });

  const total = bills.length;
  const currentIndex = total > 0 ? ((index % total) + total) % total : 0;
  const bill = bills[currentIndex];

  const skip = useCallback(() => {
    setIndex((current) => (total > 0 ? (current + 1) % total : 0));
  }, [total]);

  const previous = useCallback(() => {
    setIndex((current) => (total > 0 ? (current - 1 + total) % total : 0));
  }, [total]);

  if (!bill) {
    return (
      <section
        data-testid="swipe-deck"
        className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm"
      >
        There are no verified bills to swipe through right now.{" "}
        <Link to="/feed" className="font-semibold text-primary hover:underline">
          Browse the feed
        </Link>{" "}
        instead.
      </section>
    );
  }

  const percent = Math.max(0, Math.min(100, Number.isFinite(bill.percent) ? bill.percent : 0));

  return (
    <section data-testid="swipe-deck" aria-label="Verified bills deck" className="space-y-4">
      <article className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-foreground/5">
        {/* Accent ribbon: a single visual anchor that keeps the card from
            reading as a plain bordered box. */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/50 to-primary/10"
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Verified
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {bill.type}
            </span>
          </div>

          {/* Admin-approved requests keep their own headline so a donor can see
              exactly which request was published by the review desk. */}
          {bill.title ? (
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {bill.title}
            </p>
          ) : null}

          <h3
            data-testid="deck-beneficiary"
            aria-live="polite"
            className="mt-2 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            {bill.beneficiary}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {bill.location} · {bill.daysLeft} days left
          </p>

          {/* The amount panel groups the Naira total with the funding bar so the
              money story is read in one glance. */}
          <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Amount needed
            </p>
            <p
              data-testid="deck-amount"
              className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              {bill.amount}
            </p>

            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">Raised {bill.raised}</span>
                <span className="text-muted-foreground">of {bill.goal}</span>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Bill funding progress"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{percent}% funded</p>
            </div>
          </div>

          <p className="mt-5 leading-relaxed text-foreground/80">{bill.story}</p>

          {/* The doorway into the verified bill's own page, so a donor can read
              the full story and the proof behind the amount before pledging. */}
          <Link
            to="/cause/$id"
            params={{ id: causeId }}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View bill details <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Action bar: sits on its own surface so the two money-adjacent actions
            are unmistakably separate from the bill's story. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={previous}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </button>

          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} of {total}
          </span>

          <div className="flex items-center gap-2">
            {/* Opens the sheet; no charge is created until Paystack clears. */}
            <button
              type="button"
              onClick={pledge.openSheet}
              data-testid="deck-pledge"
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-95"
            >
              Pledge
            </button>
            {/* Advances the deck only — never opens the pledge sheet. */}
            <button
              type="button"
              onClick={skip}
              className="inline-flex items-center gap-1 rounded-full bg-foreground px-6 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Skip <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      {footer ? <div className="pt-1">{footer}</div> : null}

      {/* The sheet lives at the deck level so it can overlay the whole card. */}
      <PledgeSheet
        open={pledge.isOpen}
        onClose={pledge.closeSheet}
        causeId={pledge.causeId}
        causeTitle={pledge.causeTitle}
        remainingMinor={pledge.remainingMinor}
      />
    </section>
  );
}
