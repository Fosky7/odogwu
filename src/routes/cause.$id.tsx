import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { FEED_BILLS } from "@/data/feedBills";

export const Route = createFileRoute("/cause/$id")({
  head: () => ({
    meta: [
      { title: "Bill details \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Verified bill details, proof and live funding progress on Odogwu \u2014 see what has been Raised and what is Remaining before you pledge.",
      },
    ],
  }),
  component: CauseDetailPage,
});

type LooseBill = Record<string, unknown>;

const bills = FEED_BILLS as unknown as LooseBill[];

function pick(bill: LooseBill, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = bill[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function pickNumber(bill: LooseBill, keys: string[]): number | null {
  for (const key of keys) {
    const value = bill[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value.replace(/[^0-9.-]/g, "")))
    ) {
      return Number(value.replace(/[^0-9.-]/g, ""));
    }
  }
  return null;
}

function formatNaira(value: number): string {
  return `\u20a6${Math.round(value).toLocaleString("en-NG")}`;
}

function CauseDetailPage() {
  const { id } = Route.useParams();

  // Older links used a 1-based number (e.g. /cause/1); map those to the
  // matching bill in the shared list so they never land on "not found".
  const bill =
    bills.find(
      (candidate) => pick(candidate, ["id", "causeId", "slug"], "") === String(id),
    ) ?? (/^[1-9]\d*$/.test(String(id)) ? bills[Number(id) - 1] : undefined);

  if (!bill) {
    return (
      <div
        className="mx-auto w-full max-w-3xl px-4 py-16 text-center"
        data-testid="cause-not-found"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          We couldn't find that bill
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          This bill may have been closed, removed, or the link may be incorrect.
          Browse the verified feed to find another bill to support.
        </p>
        <Link
          to="/feed"
          data-testid="cause-not-found-back-link"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to feed
        </Link>
      </div>
    );
  }

  const title = pick(bill, ["title", "name", "billTitle"], "Verified bill");
  const beneficiary = pick(
    bill,
    ["beneficiary", "beneficiaryName", "owner", "postedBy"],
    "a verified beneficiary",
  );
  const category = pick(bill, ["category", "type"], "Bill");
  const story = pick(
    bill,
    ["story", "description", "summary", "details"],
    "Odogwu moderators reviewed the proof for this bill before it reached the feed.",
  );
  const image = pick(bill, ["image", "imageUrl", "photo", "proofImage"], "");

  const target = pickNumber(bill, ["amount", "target", "targetAmount", "total", "goal"]);
  const raised =
    pickNumber(bill, ["raised", "raisedAmount", "funded", "amountRaised"]) ?? 0;
  const remaining =
    pickNumber(bill, ["remaining", "remainingAmount", "balance"]) ??
    (target !== null ? Math.max(target - raised, 0) : null);
  const progress =
    target && target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Link
        to="/feed"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to feed
      </Link>

      <article className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-56 w-full object-cover sm:h-72"
            loading="lazy"
          />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent sm:h-36" />
        )}

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          </div>

          <h1
            className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            data-testid="cause-title"
          >
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Posted by {beneficiary}</p>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
            Bill details
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{story}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {target !== null ? (
              <div className="rounded-xl border border-border bg-muted/60 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bill total
                </dt>
                <dd className="mt-1 text-lg font-bold text-foreground">{formatNaira(target)}</dd>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Raised
              </dt>
              <dd className="mt-1 text-lg font-bold text-emerald-600">{formatNaira(raised)}</dd>
            </div>
            {remaining !== null ? (
              <div className="rounded-xl border border-border bg-muted/60 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Remaining
                </dt>
                <dd className="mt-1 text-lg font-bold text-foreground">
                  {formatNaira(remaining)}
                </dd>
              </div>
            ) : null}
          </dl>

          {target !== null && target > 0 ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Funding progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/feed"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Browse more bills
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
