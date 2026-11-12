import { Receipt } from "lucide-react";

import type { DashboardPledge } from "@/services/users";

export type PledgeListProps = {
  /** Pledges the signed-in donor made, with their receipt references. */
  pledges?: DashboardPledge[] | null;
};

function dateLabel(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PledgeRow({ pledge }: { pledge: DashboardPledge }) {
  const created = dateLabel(pledge.createdAt);
  // Never render a broken /receipt/undefined link: fall back to the pledge id
  // so the destination page always receives a reference it can resolve.
  const reference =
    (typeof pledge.reference === "string" && pledge.reference.trim()) ||
    pledge.id ||
    "";
  const causeTitle = pledge.causeTitle?.trim() || "Pledge";
  const amountLabel = pledge.amountLabel?.trim() || "—";

  return (
    <li
      data-testid="pledge-row"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="min-w-0">
        <h3
          data-testid="pledge-cause"
          className="truncate text-base font-semibold text-foreground"
        >
          {causeTitle}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {created ? `${created} · ` : ""}Ref {reference}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span data-testid="pledge-amount" className="text-base font-bold text-primary">
          {amountLabel}
        </span>
        {/* A plain anchor keeps the receipt link renderable even if the
            router's typed route id ever drifts from the /receipt/$id file;
            the destination page still reads the reference from the URL. */}
        <a
          href={`/receipt/${encodeURIComponent(reference)}`}
          data-testid="pledge-receipt-link"
          className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          View receipt
        </a>
      </div>
    </li>
  );
}

/** "My pledges" for the donor dashboard, with a receipt link on every row. */
export function PledgeList({ pledges }: PledgeListProps) {
  const rows = Array.isArray(pledges) ? pledges.filter(Boolean) : [];

  return (
    <section aria-labelledby="my-pledges-heading" data-testid="my-pledges">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="my-pledges-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          My pledges
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Every pledge you have made, with the amount you gave and a receipt you can
        reopen at any time.
      </p>

      {rows.length === 0 ? (
        <div
          data-testid="my-pledges-empty"
          className="mt-4 rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">No pledges yet</p>
          <p className="mt-1">
            {"Pledges you make from the feed show up here with their payment receipt. "}
            <a href="/feed" className="font-semibold text-primary hover:underline">
              Browse verified bills
            </a>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((pledge) => (
            <PledgeRow key={pledge.id} pledge={pledge} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default PledgeList;
