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
 * Miniature version of the classic Odogwu crest used in the site header: a
 * heraldic shield in the brand navy with a double gold rim, a chief band
 * carrying three bezants and a serif "O" monogram, so a printed receipt
 * carries the same engraved seal as the letterhead. Purely decorative, hence
 * aria-hidden.
 */
function ReceiptBrandCrest({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 44"
      aria-hidden="true"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield field */}
      <path
        d="M20 1.8 36.6 7.1v14.1c0 8.6-7 15-16.6 20.1C10.4 36.2 3.4 29.8 3.4 21.2V7.1L20 1.8Z"
        className="text-primary"
        fill="currentColor"
      />
      {/* Engraved outer gold rim */}
      <path
        d="M20 4.7 33.9 9v11.9c0 7.3-5.9 12.7-13.9 17-8-4.3-13.9-9.7-13.9-17V9L20 4.7Z"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Chief band across the head of the shield */}
      <path
        d="M9.2 16.4h21.6"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Three bezants sitting in the chief */}
      <g className="text-amber-400" fill="currentColor">
        <circle cx="14.1" cy="13.2" r="0.95" />
        <circle cx="20" cy="13.2" r="0.95" />
        <circle cx="25.9" cy="13.2" r="0.95" />
      </g>
      {/* Serif "O" monogram */}
      <ellipse
        cx="20"
        cy="26.4"
        rx="4.6"
        ry="5.6"
        className="text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
      />
    </svg>
  );
}

/**
 * Engraved double rule with a centred lozenge - the letterhead divider that
 * separates the wordmark from the receipt body.
 */
function ReceiptRule({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 6"
      aria-hidden="true"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 3h22M40 3h22"
        className="text-slate-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M32 0.8 34.4 3 32 5.2 29.6 3 32 0.8Z"
        className="text-primary"
        fill="currentColor"
        opacity="0.75"
      />
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
          <span className="inline-flex items-center gap-2.5">
            <ReceiptBrandCrest className="h-6 w-6" />
            <span className="flex flex-col leading-none">
              <span className="font-serif text-sm font-semibold tracking-[0.16em] text-slate-900 uppercase">
                Odogwu
              </span>
              <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.26em] text-slate-500">
                Bill clearing
              </span>
            </span>
          </span>
          <span
            data-testid="receipt-status"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Paid
          </span>
        </div>
        <ReceiptRule className="mt-4 h-1.5 w-20" />
        <h1
          id="receipt-card-title"
          className="mt-3 font-serif text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
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
