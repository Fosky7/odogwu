import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ReceiptCard, type ReceiptCardData } from "@/components/ReceiptCard";
import {
  PAYMENT_NOT_COMPLETED,
  PAYMENT_PAID_LABEL,
  PAYMENT_REFERENCE_LABEL,
  PAYMENT_UNPAID_LABEL,
  formatNaira,
  readPaymentReturn,
  verifyPaystackPayment,
} from "@/lib/payments";
import { getReceipt, getReceiptsSnapshot } from "@/services/pledges";

export const Route = createFileRoute("/receipt/$id")({
  head: () => ({
    meta: [
      { title: "Payment receipt \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Your payment receipt for a pledge made on Odogwu, including amount, reference and bill.",
      },
    ],
  }),
  component: ReceiptPage,
});

/**
 * Resolve the receipt shown for the `$id` segment.
 *
 * A dashboard pledge row links with the quotable payment reference, while a
 * freshly settled pledge links with the receipt id, so both are accepted. If the
 * reference is unknown the card still renders (with the reference echoed) so
 * "View receipt" is never a dead end.
 */
function resolveReceipt(id: string): ReceiptCardData {
  const direct = getReceipt(id);
  if (direct) return direct;

  const reference = String(id ?? "").trim();
  const matched = getReceiptsSnapshot().find(
    (receipt) => receipt.id === reference || receipt.reference === reference,
  );
  if (matched) return matched;

  return {
    id: reference || "unknown",
    amount: 0,
    reference: reference || "unknown",
    donorName: "Anonymous donor",
    paidAt: null,
    causeId: "1",
  };
}

/**
 * Where the payment behind this receipt stands.
 *
 * `unpaid`        - nothing has been confirmed for this pledge yet
 * `checking`      - a returned Paystack reference is being confirmed server-side
 * `paid`          - Paystack confirmed the money moved
 * `not-completed` - the donor came back without a settled payment
 */
type ReceiptPaymentPhase = "unpaid" | "checking" | "paid" | "not-completed";

interface ReceiptPaymentState {
  phase: ReceiptPaymentPhase;
  /** Only ever populated for a provider-confirmed payment. */
  reference: string | null;
  /** Amount in naira, as reported by Paystack (null until confirmed). */
  amount: number | null;
  /** Optional support note for a failed verification attempt. */
  note: string | null;
}

const INITIAL_PAYMENT_STATE: ReceiptPaymentState = {
  phase: "unpaid",
  reference: null,
  amount: null,
  note: null,
};

function ReceiptPage() {
  const { id } = Route.useParams();
  const receipt = resolveReceipt(id);
  const causeId = receipt.causeId ?? "1";

  const [payment, setPayment] = useState<ReceiptPaymentState>(
    INITIAL_PAYMENT_STATE,
  );

  /**
   * Only a server-confirmed Paystack answer may render "Paid".
   *
   * The browser has no way to settle a payment on its own, so a receipt that is
   * opened without a Paystack return reference stays honestly Unpaid.
   */
  useEffect(() => {
    let cancelled = false;

    const returned = readPaymentReturn(window.location.search);

    if (returned.cancelled) {
      setPayment({
        phase: "not-completed",
        reference: null,
        amount: null,
        note: null,
      });
      return () => {
        cancelled = true;
      };
    }

    const reference = returned.reference;

    if (!reference) {
      setPayment(INITIAL_PAYMENT_STATE);
      return () => {
        cancelled = true;
      };
    }

    setPayment({ phase: "checking", reference: null, amount: null, note: null });

    void (async () => {
      const result = await verifyPaystackPayment(reference);
      if (cancelled) return;

      if (result.ok) {
        setPayment({
          phase: "paid",
          reference: result.reference || reference,
          amount: result.amount,
          note: null,
        });
        return;
      }

      setPayment({
        phase: "not-completed",
        reference: null,
        amount: null,
        note: result.error ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isPaid = payment.phase === "paid";
  const isChecking = payment.phase === "checking";
  const isNotCompleted = payment.phase === "not-completed";

  const statusLabel = isPaid
    ? PAYMENT_PAID_LABEL
    : isChecking
      ? "Checking payment"
      : PAYMENT_UNPAID_LABEL;

  const displayAmount =
    isPaid && payment.amount !== null && payment.amount > 0
      ? payment.amount
      : receipt.amount;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <a
          href={`/cause/${causeId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Back to cause
        </a>
      </div>

      <ReceiptCard receipt={receipt} />

      {/* Payment state: paid only when Paystack confirmed it server-side. */}
      <section
        aria-label="Payment status"
        className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Payment status
            </dt>
            <dd
              data-testid="receipt-status"
              className={
                isPaid
                  ? "mt-0.5 text-sm font-semibold text-emerald-700"
                  : isChecking
                    ? "mt-0.5 text-sm font-semibold text-muted-foreground"
                    : "mt-0.5 text-sm font-semibold text-amber-700"
              }
            >
              {statusLabel}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Amount
            </dt>
            <dd
              data-testid="receipt-amount"
              className="mt-0.5 text-sm font-semibold text-foreground"
            >
              {formatNaira(displayAmount)}
            </dd>
          </div>
        </dl>

        {isPaid ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {PAYMENT_PAID_LABEL}
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              {formatNaira(displayAmount)} was received for this pledge.
            </p>
          </div>
        ) : null}

        {isPaid && payment.reference ? (
          <p className="mt-3 break-words text-sm text-foreground">
            <span className="font-semibold">{PAYMENT_REFERENCE_LABEL}:</span>{" "}
            <span
              data-testid="receipt-payment-reference"
              className="break-all font-mono text-xs"
            >
              {payment.reference}
            </span>
          </p>
        ) : null}

        {isChecking ? (
          <p
            aria-live="polite"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking your payment with Paystack\u2026
          </p>
        ) : null}

        {isNotCompleted ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"
          >
            <p className="text-sm font-semibold text-amber-900">
              {PAYMENT_NOT_COMPLETED}
            </p>
            <p className="mt-1 text-sm text-amber-900">
              Nothing was taken for this pledge, so it stays marked{" "}
              <strong>{PAYMENT_UNPAID_LABEL}</strong>. You can pay it again from
              checkout at any time.
            </p>
            {payment.note ? (
              <p className="mt-2 break-words text-xs text-amber-800">
                {payment.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
