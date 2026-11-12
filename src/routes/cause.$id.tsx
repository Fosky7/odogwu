import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { getCause, getCauseFunding, formatNaira } from "@/services/causes";
import { getSeedReceipts } from "@/data/seed";

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

function CauseDetailPage() {
  const { id } = Route.useParams();
  const cause = getCause(id);

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
  const latestReceipt = getSeedReceipts()
    .filter((receipt) => receipt.causeId === cause.id)
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))[0];

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
            alt={cause.title}
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
            {cause.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
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
            Posted by {cause.patientName}
            {cause.relationship ? ` \u2014 ${cause.relationship}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cause.hospital} \u00b7 {cause.location}
          </p>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
            Bill details
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {cause.summary}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {cause.story}
          </p>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
            Why this bill
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {cause.whyThisBill}
          </p>

          {cause.proof.length ? (
            <section className="mt-6" aria-labelledby="proof-heading">
              <h2
                id="proof-heading"
                className="text-xl font-bold tracking-tight text-foreground"
              >
                Bill proof
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {cause.proof.map((proof) => (
                  <figure
                    key={proof.id}
                    className="overflow-hidden rounded-xl border border-border bg-muted/40"
                    data-testid="cause-proof"
                  >
                    <img
                      src={proof.imageUrl}
                      alt={proof.label}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                    <figcaption className="p-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="block font-semibold text-foreground">
                        {proof.label}
                      </span>
                      {proof.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                className="mt-1 text-lg font-bold text-emerald-600"
                data-testid="raised-amount"
              >
                {formatNaira(funding.raised)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Donors
              </dt>
              <dd
                className="mt-1 text-lg font-bold text-foreground"
                data-testid="donor-count"
              >
                {funding.donors}
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
            {latestReceipt ? (
              <a
                href={`/receipt/${latestReceipt.id}`}
                data-testid="latest-receipt-link"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
              >
                View latest receipt
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}