import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";

import { MyRequestsList } from "@/components/MyRequestsList";
import { PledgeList } from "@/components/PledgeList";
import { AUTH_CHANGE_EVENT } from "@/lib/authStore";
import { getDashboardSnapshot, type DashboardData } from "@/services/users";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      {
        name: "description",
        content:
          "Track the bills you have pledged to support, your funding total and your receipts.",
      },
    ],
  }),
  component: DashboardPage,
});

function formatNaira(value: number): string {
  return `\u20a6${Math.round(Number.isFinite(value) ? value : 0).toLocaleString("en-NG")}`;
}

/**
 * The donor / beneficiary dashboard.
 *
 * It reads the same browser-backed snapshot the rest of the app uses
 * (`getDashboardSnapshot`) and renders the shared "My pledges" and "My
 * requests" sections, so a pledge that settles elsewhere immediately shows up
 * here with its receipt link and its funding progress.
 */
function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      try {
        setData(getDashboardSnapshot());
      } catch {
        setData(null);
      }
    };

    sync();

    // Keep the dashboard in step with pledges/requests written anywhere else.
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener(AUTH_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
    };
  }, []);

  const pledges = data?.pledges ?? [];
  const requests = data?.requests ?? [];

  const totalPledged = pledges.reduce(
    (sum, pledge) => sum + (Number.isFinite(pledge.amountNaira) ? pledge.amountNaira : 0),
    0,
  );
  const billsSupported = new Set(
    pledges.map((pledge) => pledge.causeId ?? pledge.id),
  ).size;

  return (
    <main
      data-testid="dashboard-page"
      className="mx-auto w-full max-w-3xl space-y-8 px-4 pb-16 pt-8 sm:px-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.signedIn && data.email
              ? `Signed in as ${data.email} — your pledges, receipts and funding progress.`
              : "Your pledges, receipts and funding progress in one place."}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Totals">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total pledged
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {data ? formatNaira(totalPledged) : "\u2014"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bills supported
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {data ? billsSupported : "\u2014"}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Receipts
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {data ? pledges.length : "\u2014"}
          </p>
        </div>
      </section>

      <PledgeList pledges={pledges} />

      <MyRequestsList requests={requests} />

      {data && !data.signedIn ? (
        <div
          data-testid="dashboard-guest"
          className="rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center"
        >
          <h2 className="text-lg font-semibold text-foreground">No pledges yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Sign in to keep every pledge and payment receipt against your own account.
          </p>
          <a
            href="/feed"
            data-testid="browse-bills-empty"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            Browse bills
          </a>
        </div>
      ) : null}

      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:bg-accent"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Home
        </Link>
        <Link
          to="/feed"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:bg-accent"
        >
          Explore the feed
        </Link>
      </nav>
    </main>
  );
}
