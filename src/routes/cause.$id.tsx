import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { getCause, getCauseFunding } from "@/services/causes";

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

function formatNaira(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `\u20a6${Math.round(amount).toLocaleString("en-NG")}`;
}

function CauseDetailPage() {
  const { id } = Route.useParams();

  // Resolve the verified bill from the canonical causes ledger. Everything the
  // page renders (story, proof, money) comes from one record, so the bill page,
  // the checkout and the receipt can never disagree about what is owed.
  let cause;
  try {
    cause = getCause(id);
  } catch {
    cause = undefined;
  }

  if (!cause) {
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

  const funding = getCauseFunding(cause);

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
        {cause.coverImage ? (
          <img
            src={cause.coverImage}
            alt={`${cause.patientName} bill`}
            className="h-56 w-full object-cover sm:h-72"
            loading="lazy"
          />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent sm:h-36" />
        )}

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {cause.category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
            {funding.isFullyFunded ? (
              <span
                data-testid="cause-fully-funded"
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Fully funded
              </span>
            ) : null}
          </div>

          <h1
            className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            data-testid="cause-title"
          >
            {cause.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Posted by {cause.patientName} \u00b7 {cause.hospital} \u00b7 {cause.location}
          </p>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">Bill details</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cause.story}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bill total
              </dt>
              <dd className="mt-1 text-lg font-bold text-foreground">
                {formatNaira(funding.target)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Raised
              </dt>
              <dd
                data-testid="funding-raised"
                className="mt-1 text-lg font-bold text-emerald-600"
              >
                {formatNaira(funding.raised)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Remaining
              </dt>
              <dd className="mt-1 text-lg font-bold text-foreground">
                {formatNaira(funding.remaining)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-muted-foreground">
            <span data-testid="funding-donors" className="font-semibold text-foreground">
              {`${funding.donors} donors`}
            </span>{" "}
            have funded this bill so far.
          </p>

          {funding.target > 0 ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Funding progress</span>
                <span>{funding.percent}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${funding.percent}%` }}
                />
              </div>
            </div>
          ) : null}

          <h2 className="mt-8 text-xl font-bold tracking-tight text-foreground">
            Why this bill
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {cause.whyThisBill}
          </p>

          <h2 className="mt-8 text-xl font-bold tracking-tight text-foreground">
            Proof of bill
          </h2>
          <ul className="mt-3 space-y-4">
            {cause.proof.map((proof) => (
              <li
                key={proof.id}
                className="overflow-hidden rounded-xl border border-border bg-muted/40"
              >
                <img
                  src={proof.imageUrl}
                  alt={proof.label}
                  className="w-full object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {proof.label}
                  </p>
                  {proof.caption ? (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {proof.caption}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

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
