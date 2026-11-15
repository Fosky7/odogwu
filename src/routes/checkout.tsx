import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";

import { FEED_BILLS } from "@/data/feedBills";
import { usePledge } from "@/hooks/usePledge";
import {
  AMOUNT_DUE_LABEL,
  formatNairaMinor,
  toMinorUnits,
  toNairaInputValue,
  validatePledgeAmount,
} from "@/lib/payments";
import { getCause } from "@/services/causes";
import { saveMyPledge } from "@/services/myPledges";
import {
  getCauseFundingSummary,
  getPledgesSnapshot,
  subscribeToPledges,
} from "@/services/pledges";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    cause:
      typeof search.cause === "string" && search.cause.length > 0 ? search.cause : undefined,
    amount:
      typeof search.amount === "string" && search.amount.length > 0 ? search.amount : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — Odogwu" },
      {
        name: "description",
        content:
          "Confirm the amount you want to pledge to a verified bill and pay securely with Paystack.",
      },
    ],
  }),
  component: CheckoutPage,
});

/** The bill used when someone opens /checkout without naming a cause. */
const DEFAULT_CAUSE_ID = "1";

const labelClass = "mb-1 block text-sm font-medium text-foreground";
const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

/** A bill the checkout page can price, whatever source it came from. */
type ResolvedCause = {
  id: string;
  title: string;
  /** Bill total in naira. */
  targetNaira: number;
  /** Money the bill page already reports as raised, in naira. */
  seedRaisedNaira: number;
};

/** Read a display amount such as "₦25,000" back into a number. */
function parseAmountText(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned || (cleaned.match(/\./g) ?? []).length > 1) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolve the bill a checkout link names.
 *
 * Verified causes come from the causes service, and the feed's own bills (whose
 * ids are quoted by the feed deck, e.g. "bill-adaeze-hospital") are resolved
 * from the shared feed deck so a pledge handed over from /cause/:id always lands
 * on a priced checkout instead of a dead end.
 */
function resolveCause(id: string): ResolvedCause | undefined {
  try {
    const known = getCause(id);
    if (known) {
      return {
        id: known.id,
        title: known.title,
        targetNaira: Math.max(0, known.amountNeeded),
        // The causes service total already includes its own raised figure, which
        // the funding summary below accounts for through the ledger.
        seedRaisedNaira: 0,
      };
    }
  } catch {
    /* an unknown bill falls through to the feed deck below */
  }

  const bill =
    FEED_BILLS.find((candidate) => candidate.id === id) ??
    (/^[1-9]\d*$/.test(id) ? FEED_BILLS[Number(id) - 1] : undefined);

  if (!bill) return undefined;

  const targetNaira = parseAmountText(bill.amount) ?? parseAmountText(bill.goal) ?? 0;
  const seedRaisedNaira = Math.min(parseAmountText(bill.raised) ?? 0, targetNaira);

  return {
    id: bill.id,
    title: `${bill.beneficiary} — ${bill.type}`,
    targetNaira,
    seedRaisedNaira,
  };
}

function CheckoutPage() {
  const { cause: causeParam, amount: amountParam } = Route.useSearch();
  const causeId = causeParam ?? DEFAULT_CAUSE_ID;

  // Live pledge ledger: the balance owed below shrinks the moment a charge
  // settles, and the summary is never a figure captured at first render.
  const pledges = useSyncExternalStore(
    subscribeToPledges,
    getPledgesSnapshot,
    getPledgesSnapshot,
  );

  const resolved = useMemo(() => resolveCause(causeId), [causeId]);

  const summary = useMemo(() => {
    if (!resolved) return null;

    let ledgerRaisedNaira = 0;
    try {
      ledgerRaisedNaira = getCauseFundingSummary(
        resolved.id,
        resolved.targetNaira,
      ).raised;
    } catch {
      ledgerRaisedNaira = 0;
    }

    const targetNaira = Math.max(0, resolved.targetNaira);
    const raisedNaira = Math.min(
      targetNaira,
      Math.max(0, resolved.seedRaisedNaira + ledgerRaisedNaira),
    );
    const remainingNaira = Math.max(targetNaira - raisedNaira, 0);

    return {
      causeId: resolved.id,
      causeTitle: resolved.title,
      remainingMinor: toMinorUnits(remainingNaira),
      formattedTarget: formatNairaMinor(toMinorUnits(targetNaira)),
      formattedRaised: formatNairaMinor(toMinorUnits(raisedNaira)),
      formattedRemaining: formatNairaMinor(toMinorUnits(remainingNaira)),
    };
    // `pledges` is the external snapshot that changes the funding summary.
  }, [resolved, pledges]);

  // Everything the page reasons about is money in kobo; Naira only exists in
  // the strings printed back to the donor.
  const remainingMinor = summary ? summary.remainingMinor : 0;

  // The pledge sheet hands its amount over in the URL (?amount=...), so checkout
  // opens on exactly the figure the donor typed instead of always starting from
  // the whole remaining balance. Anything unparseable simply falls back to it.
  const carriedAmountMinor = useMemo(() => {
    const cleaned = (amountParam ?? "").replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    if ((cleaned.match(/\./g) ?? []).length > 1) return null;

    const naira = Number(cleaned);
    if (!Number.isFinite(naira) || naira <= 0) return null;

    const minor = Math.round(toMinorUnits(naira));
    return Number.isFinite(minor) && minor > 0 ? minor : null;
  }, [amountParam]);

  const [amountInput, setAmountInput] = useState(() =>
    toNairaInputValue(carriedAmountMinor ?? remainingMinor),
  );
  const [touched, setTouched] = useState(false);

  const validation = useMemo(
    () => validatePledgeAmount(amountInput, remainingMinor),
    [amountInput, remainingMinor],
  );

  // The real Paystack flow: `pay()` creates the pending ledger row through the
  // server, opens Paystack Inline with the publishable key only and stores the
  // pledge as paid only after `paystack-verify` confirmed the charge. When the
  // charge cannot be opened it reports "Could not start payment" and keeps the
  // Pay button available for a retry.
  const pledge = usePledge({
    causeId: summary?.causeId ?? causeId,
    amountMinor: validation.code === "ok" ? validation.amountMinor : 0,
    onPaid: (_receipt, payment) => {
      // Keep a copy against the signed-in account so "My pledges" follows them.
      void saveMyPledge({
        causeId: payment.causeId || causeId,
        causeTitle: summary?.causeTitle ?? "",
        amountNaira: payment.amount,
        reference: payment.pledgeReference || _receipt.reference,
      }).catch(() => {});
    },
  });

  // An impossible amount is surfaced the moment it is typed (an over-balance or
  // above-ceiling figure is never a valid intermediate state); the softer copy
  // waits until the field is left, so typing "2" does not scold anyone.
  const liveError =
    touched ||
    validation.code === "exceeds-balance" ||
    validation.code === "above-maximum"
      ? validation.message
      : null;

  const handlePay = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pledge.isProcessing) return;

    setTouched(true);

    // Never start a charge that the shared Naira math has rejected.
    if (validation.code !== "ok") return;

    void pledge.pay();
  };

  if (!resolved || !summary) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">We could not find that bill</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The checkout link is missing a verified bill, so there is nothing to pledge to.
        </p>
        <Link
          to="/feed"
          className="mt-6 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Back to the feed <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Checkout</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        Complete your pledge
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Check the amount, then pay with Paystack. Your pledge only counts once the charge clears.
      </p>

      <dl
        data-testid="checkout-summary"
        className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm font-medium text-muted-foreground">{AMOUNT_DUE_LABEL}</dt>
          <dd
            data-testid="checkout-amount-due"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {summary.formattedRemaining}
          </dd>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Bill</dt>
          <dd className="text-right font-medium text-foreground">{summary.causeTitle}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Bill total</dt>
          <dd className="text-foreground">{summary.formattedTarget}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Already pledged</dt>
          <dd className="text-foreground">{summary.formattedRaised}</dd>
        </div>
      </dl>

      <p
        data-testid="checkout-status"
        role="status"
        className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
      >
        Payment status: <span className="font-semibold text-foreground">unpaid</span> — no charge
        has been made yet.
      </p>

      <form
        onSubmit={handlePay}
        className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        noValidate
      >
        <div>
          <label htmlFor="pledge-amount" className={labelClass}>
            Amount
          </label>
          <input
            id="pledge-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountInput}
            onChange={(event) => {
              // Keep exactly what was typed; the validation copy below is the
              // only thing that reacts to the keystroke.
              setAmountInput(event.target.value);
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={liveError ? true : undefined}
            aria-describedby={liveError ? "pledge-amount-error" : "pledge-amount-hint"}
            className={inputClass}
            placeholder="25000"
          />
          {liveError ? (
            <p
              id="pledge-amount-error"
              role="alert"
              data-testid="checkout-error"
              className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {liveError}
            </p>
          ) : (
            <p id="pledge-amount-hint" className="mt-1 text-xs text-muted-foreground">
              Pledge any amount from ₦100 up to the remaining balance.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pledge.isProcessing}
          aria-busy={pledge.isProcessing}
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pledge.isProcessing ? "Opening Paystack…" : "Pay with Paystack"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Secured by Paystack. Odogwu never sees your card details.
        </p>
      </form>

      {/* Honest outcome of the last attempt. A cancelled or failed charge leaves
          the Pay button available and prints no reference. */}
      {pledge.message ? (
        <p
          data-testid="checkout-outcome"
          role="status"
          className={
            pledge.status === "failed"
              ? "mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
          }
        >
          {pledge.message}
        </p>
      ) : null}

      <Link
        to="/cause/$id"
        params={{ id: causeId }}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" /> Back to the bill
      </Link>

      {validation.code === "ok" ? (
        <p data-testid="checkout-pledge-preview" className="mt-4 text-xs text-muted-foreground">
          You are pledging {formatNairaMinor(validation.amountMinor)} to {summary.causeTitle}.
        </p>
      ) : null}
    </main>
  );
}
