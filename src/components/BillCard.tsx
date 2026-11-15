import { ShieldCheck } from "lucide-react";

import { formatNaira, type Cause } from "@/types/models";

export interface BillCardProps {
  /** The verified bill to display. */
  cause: Cause;
  /** Stronger ring used for the card sitting on top of a swipe deck. */
  highlighted?: boolean;
}

/**
 * A single verified bill: who it is for, what the bill is, the total that has
 * to be cleared and how much has already been raised towards it.
 *
 * The card is presentational only — it never fetches data or mutates state, so
 * the deck and the feed render identical information. Every card carries the
 * "Verified" badge because only verified bills are ever projected into a
 * `Cause` (see `toCauses` in `@/types/models`).
 */
export function BillCard({ cause, highlighted = false }: BillCardProps) {
  // Clamp before rounding so a stale record can never render 120%.
  const funded = Math.min(Math.max(cause.progress, 0), 1);
  const percent = Math.round(funded * 100);

  return (
    <article
      data-testid="bill-card"
      aria-label={`Verified ${cause.typeLabel.toLowerCase()} for ${cause.beneficiary}`}
      className={[
        "w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm",
        highlighted ? "ring-2 ring-primary/30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            data-testid="bill-type"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {cause.typeLabel}
          </p>
          <h3
            data-testid="bill-beneficiary"
            className="mt-1 truncate text-xl font-bold tracking-tight text-foreground"
          >
            {cause.beneficiary}
          </h3>
        </div>
        <span
          data-testid="bill-verified-badge"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-foreground"
        >
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Verified
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{cause.title}</p>

      <p
        data-testid="bill-amount"
        className="mt-4 text-3xl font-bold tracking-tight text-foreground"
      >
        {formatNaira(cause.amount)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Total bill ({cause.currency})</p>

      <div className="mt-4 space-y-2">
        <p data-testid="bill-raised" className="text-sm text-foreground">
          <span className="font-semibold">Raised</span> {formatNaira(cause.raised)} of{" "}
          {formatNaira(cause.amount)} · {percent}%
        </p>
        <div
          role="progressbar"
          aria-label={`Funding progress for ${cause.beneficiary}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatNaira(cause.remaining)} still outstanding
        </p>
      </div>
    </article>
  );
}
