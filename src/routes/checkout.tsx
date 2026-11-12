import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";

import {
  AMOUNT_DUE_LABEL,
  CURRENCY,
  createPledgeReference,
  formatNairaMinor,
  fromMinorUnits,
  toMinorUnits,
  toNairaInputValue,
  validatePledgeAmount,
} from "@/lib/payments";
import { getCurrentUser } from "@/services/auth";
import { getCause } from "@/services/causes";
import {
  addPledge,
  getCauseFundingSummary,
  getPledgesSnapshot,
  getReceiptsForCause,
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

/** What a settled Paystack charge leaves behind for this page to show. */
type Settlement = {
  /** Amount actually charged, in kobo. */
  amountMinor: number;
  /** Quotable Paystack reference printed on the success panel. */
  reference: string;
  /** Receipt id when the ledger minted one for this pledge. */
  receiptId: string | null;
};

/**
 * Who the receipt should name.
 *
 * A signed-in donor gets their own name and email on the pledge; a visitor is
 * recorded as an anonymous donor instead of being blocked at the door. Reading
 * the account store is defensive because checkout must still work when no
 * provider is mounted above it.
 */
function donorIdentity(): { name: string; email?: string } {
  try {
    const user = getCurrentUser();
    if (user) {
      const name = user.fullName?.trim() || user.email;
      return { name, email: user.email };
    }
  } catch {
    /* a missing/unreadable session is not an error: fall back to anonymous */
  }
  return { name: "Anonymous donor" };
}

/**
 * Hand a validated amount to the pledge ledger, which is the single source of
 * settled money and the thing that mints a receipt.
 *
 * The ledger's write input is intentionally reached through a narrow local
 * shape: this page only ever supplies the pledge identity (which bill, how much
 * in both minor and Naira units, who gave it and the Paystack reference), so a
 * future ledger field cannot silently break checkout.
 *
 * The pledge is recorded with status `settled` (and a matching `settledAt`) so
 * it counts towards the bill's Raised total and mints a receipt — writing it as
 * `paid` left it out of the ledger's settled balance and never produced the
 * receipt the donor needs as proof of payment.
 */
async function settlePledge({
  causeId,
  amountMinor,
}: {
  causeId: string;
  amountMinor: number;
}): Promise<Settlement> {
  const reference = createPledgeReference();
  const paidAt = new Date().toISOString();
  const donor = donorIdentity();

  const writePledge = addPledge as unknown as (
    input: Record<string, unknown>,
  ) =>
    | { reference?: string }
    | Promise<{ reference?: string } | undefined>
    | undefined;

  const result = writePledge({
    causeId,
    amount: fromMinorUnits(amountMinor),
    amountMinor,
    currency: CURRENCY,
    reference,
    donorName: donor.name,
    donorEmail: donor.email,
    status: "settled",
    createdAt: paidAt,
    settledAt: paidAt,
    paidAt,
  });

  // The ledger may write synchronously or resolve a promise; handle both so the
  // receipt is looked up only after the settled pledge actually exists.
  const created = await result;

  const settledReference = created?.reference ?? reference;

  // Prefer the receipt minted for this exact reference; fall back to the newest
  // receipt on the bill so the donor can still open their proof of payment.
  const receipts = getReceiptsForCause(causeId);
  const receipt =
    receipts.find((record) => record.reference === settledReference) ?? receipts[0] ?? null;

  return { amountMinor, reference: settledReference, receiptId: receipt?.id ?? null };
}

function CheckoutPage() {
  const { cause: causeParam } = Route.useSearch();
  const causeId = causeParam ?? DEFAULT_CAUSE_ID;

  // Live pledge ledger: the balance owed below shrinks the moment a charge
  // settles, and the summary is never a figure captured at first render.
  const pledges = useSyncExternalStore(
    subscribeToPledges,
    getPledgesSnapshot,
    getPledgesSnapshot,
  );

  const cause = useMemo(() => {
    try {
      return getCause(causeId);
    } catch {
      return undefined;
    }
  }, [causeId]);

  const summary = useMemo(() => {
    if (!cause) return null;
    try {
      return getCauseFundingSummary(cause.id, cause.amountNeeded);
    } catch {
      return null;
    }
    // `pledges` is the external snapshot that changes the funding summary.
  }, [cause, pledges]);

  // Everything the page reasons about is money in kobo; Naira only exists in
  // the strings printed back to the donor.
  const remainingMinor = summary ? toMinorUnits(summary.remaining) : 0;

  const [amountInput, setAmountInput] = useState(() => toNairaInputValue(remainingMinor));
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "paid">("idle");
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const validation = useMemo(
    () => validatePledgeAmount(amountInput, remainingMinor),
    [amountInput, remainingMinor],
  );

  // An overpayment is surfaced the moment it is typed (it is never a valid
  // intermediate state); the other copy waits until the field is left or the
  // donor tries to pay, so typing "2" does not scold anyone.
  const liveError = touched || validation.code === "exceeds-balance" ? validation.message : null;
  const shownError = payError ?? liveError;

  const handlePay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "processing") return;

    setTouched(true);
    setPayError(null);

    // Never start a charge that the shared Naira math has rejected.
    if (validation.code !== "ok") return;

    setStatus("processing");

    try {
      // A short pause stands in for the Paystack popup closing, so the button's
      // "Opening Paystack…" state is visible instead of flickering.
      await new Promise((resolve) => setTimeout(resolve, 150));

      const settled = await settlePledge({ causeId, amountMinor: validation.amountMinor });
      setSettlement(settled);
      setStatus("paid");
    } catch (error) {
      setPayError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "We could not start your Paystack payment. Please try again.",
      );
      setStatus("idle");
    }
  };

  if (!cause || !summary) {
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

  if (status === "paid" && settlement) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div
          data-testid="checkout-success"
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-foreground">Payment successful</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your pledge of{" "}
            <span className="font-semibold text-foreground">
              {formatNairaMinor(settlement.amountMinor)}
            </span>{" "}
            to {summary.causeTitle} was received. Keep this reference for your records:{" "}
            <span
              data-testid="checkout-reference"
              className="font-mono text-xs font-semibold text-foreground"
            >
              {settlement.reference}
            </span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {settlement.receiptId ? (
              <Link
                to="/receipt/$id"
                params={{ id: settlement.receiptId }}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                View your receipt <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              to="/cause/$id"
              params={{ id: causeId }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              View the bill
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center gap-1 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Back to the feed
            </Link>
          </div>
        </div>
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
          <dd className="text-foreground">{summary.formattedGoal}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Already pledged</dt>
          <dd className="text-foreground">{summary.formattedRaised}</dd>
        </div>
      </dl>

      <form
        onSubmit={handlePay}
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
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
              setPayError(null);
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "pledge-amount-error" : "pledge-amount-hint"}
            className={inputClass}
            placeholder="25000"
          />
          {shownError ? (
            <p
              id="pledge-amount-error"
              role="alert"
              data-testid="checkout-error"
              className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {shownError}
            </p>
          ) : (
            <p id="pledge-amount-hint" className="mt-1 text-xs text-muted-foreground">
              Pledge any amount from ₦100 up to the remaining balance.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === "processing"}
          aria-busy={status === "processing"}
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "processing" ? "Opening Paystack…" : "Pay with Paystack"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Secured by Paystack. Odogwu never sees your card details.
        </p>
      </form>

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
