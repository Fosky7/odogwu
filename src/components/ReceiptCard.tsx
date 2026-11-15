import { Check } from "lucide-react";

/**
 * A receipt is proof that a pledge actually cleared. The card is deliberately
 * self-contained: it only needs the money facts (amount, reference, when it
 * cleared and who gave it) so the same component can render a receipt from the
 * pledge ledger, a freshly created one, or a future backend row without caring
 * where the record came from.
 */
export type ReceiptCardData = {
  id: string;
  amount: number;
  reference: string;
  donorName?: string | null;
  paidAt?: string | null;
  causeId?: string | null;
  currency?: string | null;
};

export type ReceiptCardProps = {
  receipt: ReceiptCardData;
};

/**
 * Miniature Odogwu brand mark - the Igbo chieftaincy cap (okpu agu) crowned by
 * a single upright eagle feather (ugo) - so a printed receipt carries the same
 * identity as the site header. Purely decorative, hence aria-hidden.
 */
function ReceiptBrandMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`${className} shrink-0 text-primary`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M16.2 4.4c2 1.9 3 4.1 3 6.5 0 1.3-.3 2.5-.9 3.6h-4.2c-.6-1.1-.9-2.3-.9-3.6 0-2.4 1-4.6 3-6.5Z"
        fill="white"
      />
      <path
        d="M9.4 16.9c0-2.6 3-4.7 6.8-4.7s6.8 2.1 6.8 4.7v2.9H9.4v-2.9Z"
        fill="white"
      />
      <path
        d="M8 21h16.4v3.2c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2V21Z"
        fill="white"
      />
      <circle cx="12.8" cy="15.6" r="0.9" fill="currentColor" opacity="0.35" />
      <circle cx="16.2" cy="14.4" r="0.9" fill="currentColor" opacity="0.35" />
      <circle cx="19.6" cy="15.6" r="0.9" fill="currentColor" opacity="0.35" />
      <circle cx="12" cy="22.6" r="0.7" fill="currentColor" opacity="0.35" />
      <circle cx="16.2" cy="22.6" r="0.7" fill="currentColor" opacity="0.35" />
      <circle cx="20.4" cy="22.6" r="0.7" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

/**
 * Naira formatting matches the rest of the app (whole naira, no kobo noise) so
 * a receipt amount can be compared line-for-line with the funding totals on the
 * bill page.
 */
const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatNaira(amount: number): string {
  return nairaFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Dates are printed with a pinned timezone so the server render and the client
 * render produce identical markup (no hydration drift on a receipt).
 */
const paidAtFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatPaidAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : paidAtFormatter.format(date);
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  const amountLabel = formatNaira(receipt.amount);
  const paidOn = formatPaidAt(receipt.paidAt);

  return (
    <article
      data-testid="receipt-card"
      aria-labelledby="receipt-card-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <ReceiptBrandMark className="h-5 w-5" />
            Odogwu
          </span>
          <span
            data-testid="receipt-status"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Paid
          </span>
        </div>
        <h1
          id="receipt-card-title"
          className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          Payment receipt
        </h1>
        <p className="mt-1 text-sm text-slate-600">{`Receipt #${receipt.id}`}</p>
      </header>

      <div className="px-6 py-6 sm:px-8">
        <p className="text-sm font-medium text-slate-500">Amount paid</p>
        <p
          data-testid="receipt-amount"
          className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl"
        >
          {amountLabel}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
            <dt className="font-medium text-slate-500">Reference</dt>
            <dd
              data-testid="receipt-reference"
              className="break-all font-mono font-semibold text-slate-900"
            >
              {receipt.reference}
            </dd>
          </div>

          {paidOn ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
              <dt className="font-medium text-slate-500">Paid on</dt>
              <dd className="font-semibold text-slate-900">{paidOn}</dd>
            </div>
          ) : null}

          {receipt.donorName ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
              <dt className="font-medium text-slate-500">Paid by</dt>
              <dd className="font-semibold text-slate-900">{receipt.donorName}</dd>
            </div>
          ) : null}

          {receipt.causeId ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="font-medium text-slate-500">Bill reference</dt>
              <dd className="font-semibold text-slate-900">{`#${receipt.causeId}`}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-relaxed text-slate-500 sm:px-8">
        This receipt only exists because the money cleared, and it counts towards the bill shown
        above. Keep the reference for your records.
      </footer>
    </article>
  );
}

export default ReceiptCard;
