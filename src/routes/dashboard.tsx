import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";

import { MyRequestsList } from "@/components/MyRequestsList";
import { PledgeList } from "@/components/PledgeList";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { AUTH_CHANGE_EVENT } from "@/lib/authStore";
import { subscribeToBillRequests } from "@/services/causes";
import {
  ANONYMOUS_VISIBILITY_NOTE,
  LEADERBOARD_PRIVACY_LABEL,
} from "@/services/leaderboard";
import { getDashboardSnapshot, type DashboardData } from "@/services/users";
import { subscribeToMyPledges } from "@/services/myPledges";

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
 *
 * It also renders "Your giving rank": the giver's own standing (from the
 * server-verified `leaderboard_my_rank` aggregate) plus the one switch that
 * decides whether their name is published on the leaderboard. The switch
 * writes the owner-scoped `giver_profiles` row and re-reads it, so a full
 * reload always shows exactly what the database kept.
 */
function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const { myRank, isAnonymous, privacyLoaded, updateVisibility } = useLeaderboard({
    period: "all",
  });

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

    // The bill-request ledger refreshes asynchronously after the session
    // hydrates (server readback and legacy adoption), so re-read the snapshot
    // whenever it publishes a new value.
    const unsubscribeRequests = subscribeToBillRequests(sync);
    const unsubscribePledges = subscribeToMyPledges(sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      unsubscribeRequests();
      unsubscribePledges();
    };
  }, []);

  const handleVisibilityChange = async (checked: boolean) => {
    setSavingVisibility(true);
    try {
      // The checkbox reads "show my name", the stored flag is its inverse.
      await updateVisibility(!checked);
    } catch {
      /* the stored choice is re-read on the next load, so nothing is faked */
    } finally {
      setSavingVisibility(false);
    }
  };

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
              ? `Signed in as ${data.email}${
                  data.phone?.trim() ? ` · ${data.phone.trim()}` : ""
                } — your pledges, receipts and funding progress.`
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

      {/* Your giving rank: the giver's own verified standing plus the single
          switch that decides whether their name is published on the board. */}
      <section
        data-testid="your-giving-rank"
        aria-labelledby="giving-rank-heading"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <h2
          id="giving-rank-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Your giving rank
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only confirmed pledges settled through the payment server count toward a
          rank.
        </p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p
            data-testid="giver-rank"
            className="text-base font-semibold text-foreground"
          >
            {myRank && myRank.rank ? `Rank ${myRank.rank}` : "Not ranked yet"}
          </p>
          <p data-testid="giver-total" className="text-base font-bold text-primary">
            {formatNaira(myRank?.totalNaira ?? 0)}
          </p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            data-testid="leaderboard-privacy-switch"
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            checked={!isAnonymous}
            disabled={!privacyLoaded || savingVisibility}
            onChange={(event) => {
              void handleVisibilityChange(event.target.checked);
            }}
          />
          <span>{LEADERBOARD_PRIVACY_LABEL}</span>
        </label>

        {isAnonymous ? (
          <p
            data-testid="leaderboard-anonymous-note"
            className="mt-2 text-xs text-muted-foreground"
          >
            {ANONYMOUS_VISIBILITY_NOTE}
          </p>
        ) : null}
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
