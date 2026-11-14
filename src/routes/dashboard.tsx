import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, Trophy } from "lucide-react";

import { MyRequestsList } from "@/components/MyRequestsList";
import { PledgeList } from "@/components/PledgeList";
import { useAuth } from "@/context/AuthContext";
import { AUTH_CHANGE_EVENT } from "@/lib/authStore";
import { subscribeToBillRequests } from "@/services/causes";
import {
  LEADERBOARD_VISIBILITY_OPTIONS,
  fetchMyLeaderboardStanding,
  setLeaderboardVisibility,
  type MyLeaderboardStanding,
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

/** The honest starting point before the backend standing has been read. */
const EMPTY_STANDING: MyLeaderboardStanding = {
  rank: null,
  totalMinor: 0,
  totalNaira: 0,
  formattedTotal: formatNaira(0),
  causesSupported: 0,
  showOnLeaderboard: false,
  isRanked: false,
};

/**
 * The viewer's standing on the public Top Odogwus board.
 *
 * Ranking is opt-in, so this card reads the stored choice from the backend,
 * lets the donor change it (the write goes through row level security for
 * their own row only) and always shows the saved choice back — that is what
 * makes "Show my name" / "Don't rank me" verifiable after a reload.
 */
function DashboardRankCard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [standing, setStanding] = useState<MyLeaderboardStanding | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A late read must never overwrite a choice the donor just saved.
  const touchedRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setStanding(null);
      return () => {
        active = false;
      };
    }

    fetchMyLeaderboardStanding()
      .then((next) => {
        if (!active || touchedRef.current) return;
        setStanding(next);
      })
      .catch(() => {
        if (!active || touchedRef.current) return;
        setStanding(null);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleVisibility = (next: boolean) => {
    if (!userId) return;

    touchedRef.current = true;
    setError(null);

    // Capture what was showing so a refused write can restore the truth.
    const before = standing;

    // Reflect the choice immediately. A radio whose checked state only moves
    // after the network round-trip never changes on click (it is reported as
    // "the click did not change its state") and feels broken to a donor.
    setStanding((previous) => {
      const base = previous ?? { ...EMPTY_STANDING };
      return {
        ...base,
        showOnLeaderboard: next,
        isRanked: next ? base.isRanked : false,
        rank: next ? base.rank : null,
      };
    });

    void (async () => {
      try {
        // The backend is the source of truth: reconcile with the value it
        // actually stored (the fallback write is idempotent on the account).
        const stored = await setLeaderboardVisibility(next);
        setStanding((previous) => {
          const base = previous ?? { ...EMPTY_STANDING };
          return {
            ...base,
            showOnLeaderboard: stored,
            isRanked: stored ? base.isRanked : false,
            rank: stored ? base.rank : null,
          };
        });
      } catch {
        setStanding(before);
        setError("We could not save your leaderboard choice. Please try again.");
      }
    })();
  };

  // Ranking is opt-in: an account that chose "Don't rank me" is never shown as
  // ranked, even if a stale total exists.
  const ranked = Boolean(
    standing && standing.showOnLeaderboard && standing.isRanked && standing.rank,
  );

  return (
    <section
      data-testid="dashboard-rank-card"
      aria-labelledby="dashboard-rank-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="dashboard-rank-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Leaderboard standing
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Where you stand on the public Top Odogwus board, and whether your giving
        total is published there.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rank
          </dt>
          <dd className="mt-1 text-lg font-bold text-foreground">
            {ranked ? (
              <span data-testid="dashboard-rank-number">{standing?.rank}</span>
            ) : (
              <span data-testid="dashboard-rank-status">Not ranked yet</span>
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total given
          </dt>
          <dd
            data-testid="dashboard-rank-total"
            className="mt-1 text-lg font-bold text-foreground"
          >
            {standing?.formattedTotal ?? formatNaira(0)}
          </dd>
        </div>
      </dl>

      {userId ? (
        <fieldset className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Leaderboard privacy
          </legend>
          <div className="mt-2 space-y-2">
            {LEADERBOARD_VISIBILITY_OPTIONS.map((option) => (
              <label
                key={option.label}
                className="flex cursor-pointer items-start gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="dashboard-leaderboard-visibility"
                  value={String(option.value)}
                  checked={(standing?.showOnLeaderboard ?? false) === option.value}
                  onChange={() => {
                    handleVisibility(option.value);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">{option.label}</span>
              </label>
            ))}
          </div>

          {standing ? (
            <p
              data-testid="dashboard-rank-saved"
              role="status"
              className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              {`Saved: ${standing.showOnLeaderboard ? "Show my name" : "Don't rank me"}`}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to be ranked on the Top Odogwus board.
        </p>
      )}
    </section>
  );
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

      <DashboardRankCard />

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
