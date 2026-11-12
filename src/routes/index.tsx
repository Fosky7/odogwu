import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";

import { SwipeDeck } from "@/components/SwipeDeck";
import { FEED_BILLS } from "@/data/feedBills";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Odogwu \u2014 Verified bills, real giving" },
      {
        name: "description",
        content:
          "Odogwu connects verified bill requests with donors. Browse verified bills, pledge what you can, and track every Naira from pledge to payment receipt.",
      },
    ],
  }),
  component: HomePage,
});

const highlights = [
  {
    icon: ShieldCheck,
    title: "Admin-verified bills only",
    body: "Every request is reviewed by a moderator with proof of the bill before it reaches the feed.",
  },
  {
    icon: TrendingUp,
    title: "Live funding progress",
    body: "See exactly how much is Raised and how much is Remaining on each cause, updated as pledges come in.",
  },
  {
    icon: Receipt,
    title: "A receipt for every pledge",
    body: "Each pledge generates a payment receipt you can reopen any time from your dashboard.",
  },
];

const steps = [
  {
    number: "01",
    title: "Post a bill",
    body: "Beneficiaries describe the bill, attach proof and set a target amount in Naira.",
  },
  {
    number: "02",
    title: "Verification",
    body: "Moderators review the proof and mark the request as verified before it is funded.",
  },
  {
    number: "03",
    title: "Pledge and track",
    body: "Donors pledge and receive a receipt; beneficiaries watch Raised and Remaining grow.",
  },
];

/**
 * Small helper: keeps the featured-card percentage safe when the feed entry
 * is missing or carries a non-numeric value.
 */
function clampPercent(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function HomePage() {
  // The spotlight card uses the first verified bill in the feed. It is only a
  // visual showcase of that bill — the link still opens the real bill page and
  // the deck below still funds the verified cause.
  const featured = FEED_BILLS[0];
  const featuredPercent = clampPercent(featured?.percent);

  const categoryCount = new Set(FEED_BILLS.map((bill) => bill.type)).size;

  const stats = [
    { label: "Verified bills live", value: `${FEED_BILLS.length}` },
    { label: "Bill categories", value: `${categoryCount}` },
    { label: "Receipts", value: "Every pledge" },
  ];

  return (
    <div className="relative isolate overflow-hidden">
      {/* Ambient backdrop: layered glows give the hero depth without adding
          image weight. Everything is decorative and hidden from a11y tools. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-gradient-to-b from-primary/12 via-primary/[0.04] to-background" />
        <div className="absolute -left-40 -top-32 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-24 top-24 h-[360px] w-[360px] rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute left-1/2 top-[520px] h-[300px] w-[520px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Introduction"
          className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
        >
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Verified giving
            </span>

            <h1 className="mt-7 text-balance text-4xl font-bold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
              Clear a bill with a{" "}
              <span className="bg-gradient-to-br from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                swipe
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Odogwu is a transparent bill-funding platform. Beneficiaries post hospital,
              school and utility bills, moderators verify the proof, and donors pledge
              toward the balance. Every pledge produces a printable payment receipt.
            </p>

            {/* Primary doorways. The Dashboard link is the way into the donor /
                beneficiary dashboard, where "My pledges" and "My requests" live.
                The Browse bills link opens the verified feed directly. */}
            <div
              data-testid="home-doorway"
              className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start"
            >
              <Link
                to="/dashboard"
                data-testid="home-dashboard-link"
                aria-label="Dashboard"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 hover:opacity-95 sm:w-auto"
              >
                <User className="h-5 w-5" aria-hidden="true" />
                Dashboard
                <ChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/feed"
                data-testid="home-browse-bills-link"
                aria-label="Browse bills"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-6 py-3.5 text-base font-semibold text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent sm:w-auto"
              >
                <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                Browse bills
              </Link>
              <Link
                to="/create"
                data-testid="home-create-link"
                aria-label="Request help"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-6 py-3.5 text-base font-semibold text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent sm:w-auto"
              >
                <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
                Request help
              </Link>
            </div>

            <div
              data-testid="home-auth-entry"
              className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground lg:justify-start"
            >
              <Link
                to="/login"
                data-testid="home-hero-signin-doorway"
                className="font-semibold text-primary underline-offset-4 transition hover:underline"
              >
                Sign in
              </Link>
              <span aria-hidden="true" className="text-border">
                •
              </span>
              <Link
                to="/signup"
                data-testid="home-hero-signup-doorway"
                className="font-semibold text-primary underline-offset-4 transition hover:underline"
              >
                Create account
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Your dashboard shows your pledges, your requests and your payment receipts.
            </p>

            {/* Quick doorways to the verified feed and the review desk. They live
                in the page body (not the header) so the compact brand + menu
                header stays untouched while both routes are still one click away. */}
            <nav
              aria-label="Explore"
              data-testid="home-explore-nav"
              className="mt-7 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
            >
              <Link
                to="/feed"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-accent"
              >
                Bills
                <ChevronRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </Link>
              <Link
                to="/cause/$id"
                params={{ id: "1" }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-accent"
              >
                Causes
                <ChevronRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </Link>
              <Link
                to="/admin/verify"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-accent"
              >
                Admin verify
                <ChevronRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </Link>
            </nav>
          </div>

          {/* Spotlight card for the first verified bill. It carries the
              `featured-cause-card` / `featured-cause-link` hooks so the featured
              bill is readable and openable straight from the hero. */}
          {featured ? (
            <article
              data-testid="featured-cause-card"
              className="group relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/90 p-6 shadow-2xl shadow-primary/10 ring-1 ring-primary/5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-primary/20 sm:p-8"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl transition group-hover:bg-primary/25"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Featured bill
                  </span>
                  <span className="rounded-full border border-border/70 bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {featured.type}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {featured.beneficiary}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  {featured.location} · {featured.daysLeft} days left
                </p>

                <p className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {featured.amount}
                </p>

                <div className="mt-5 rounded-2xl border border-border/60 bg-muted/40 p-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      Raised {featured.raised}
                    </span>
                    <span className="text-muted-foreground">of {featured.goal}</span>
                  </div>
                  <div
                    className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-border/50"
                    role="progressbar"
                    aria-valuenow={featuredPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Featured bill funding progress"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-500"
                      style={{ width: `${featuredPercent}%` }}
                    />
                  </div>
                  <p className="mt-2.5 text-xs font-medium text-muted-foreground">
                    {featuredPercent}% funded · every Naira receipted
                  </p>
                </div>

                <Link
                  to="/cause/$id"
                  params={{ id: "1" }}
                  data-testid="featured-cause-link"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 transition hover:underline"
                >
                  Read the full story
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </article>
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Stat strip                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Platform at a glance"
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 bg-card/80 px-6 py-5 text-center backdrop-blur"
            >
              <span className="text-lg font-bold tracking-tight text-foreground">
                {stat.value}
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Trust highlights                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Why Odogwu" className="mt-16 grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10"
                />
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/10">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="relative mt-5 text-base font-semibold text-foreground">
                  {item.title}
                </h2>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            );
          })}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The swipe deck                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Verified bills deck" className="mt-20 sm:mt-24">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                The deck
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Swipe through verified bills
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                One verified bill at a time. Pledge what you can, or skip to the next story —
                nothing moves until you confirm a pledge.
              </p>
            </div>
            <Link
              to="/feed"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-accent"
            >
              See all bills
              <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-gradient-to-b from-card/90 to-muted/40 p-4 shadow-xl shadow-primary/5 sm:p-6">
            {/* Adaeze's verified bill opens the deck, and the Pledge action hands a
                validated amount to the Paystack checkout. */}
            <SwipeDeck bills={FEED_BILLS} causeId="1" />
          </div>
        </section>

        {/* Browse doorways under the deck */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/feed"
            data-testid="browse-all-bills"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Browse verified bills
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            to="/feed"
            data-testid="browse-causes-cta"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent"
          >
            Browse causes
          </Link>
          <Link
            to="/feed"
            className="text-sm font-semibold text-primary underline-offset-4 transition hover:underline"
          >
            Open the feed
          </Link>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* How it works                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="How it works"
          className="relative mt-20 overflow-hidden rounded-[2rem] border border-border/70 bg-muted/50 p-6 sm:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              From proof to receipt in three steps
            </h2>
          </div>

          <ol className="relative mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="relative rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {step.number}
                </span>
                <h3 className="mt-3 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing doorways                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Get started"
          className="relative mt-16 overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-6 text-center shadow-lg shadow-primary/5 sm:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Get started
            </span>
            <h2 className="mt-4 text-balance text-xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to give, or need help?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Open your dashboard to follow your pledges and requests, or create an account to
              keep every receipt.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/dashboard"
                data-testid="home-cta-dashboard-doorway"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
              >
                Go to dashboard
              </Link>
              <Link
                to="/signup"
                data-testid="home-cta-signup-doorway"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent"
              >
                Create account
              </Link>
              <Link
                to="/login"
                data-testid="home-cta-signin-doorway"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
