import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  LEADERBOARD_LIMIT,
  fetchLeaderboard,
  type LeaderboardEntry,
} from "@/services/leaderboard";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Top Odogwus \u2014 Odogwu" },
      {
        name: "description",
        content:
          "The Top Odogwus leaderboard: the donors who have given the most to verified bills on Odogwu, ranked by settled Naira given.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type LoadStatus = "loading" | "ready" | "error";

/**
 * The public Top Odogwus board.
 *
 * Ranking, opt-in filtering and the 100-row clamp all live in the database (see
 * the leaderboard migration); this page only renders what the leaderboard
 * service hands back, in the order it hands it back, so a reload always shows
 * the same ranks next to the same names.
 */
function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");

    fetchLeaderboard(LEADERBOARD_LIMIT)
      .then((rows) => {
        if (!active) return;
        setEntries(rows.slice(0, LEADERBOARD_LIMIT));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setEntries([]);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <main
      data-testid="leaderboard-page"
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <header className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          Leaderboard
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Top Odogwus
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The donors who have cleared the most verified bills, ranked by the Naira
          they have actually given. Only accounts that opted in appear here.
        </p>
      </header>

      {!user ? (
        <p
          data-testid="leaderboard-signin-prompt"
          className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground"
        >
          Sign in to be ranked
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      ) : null}

      <section className="mt-8" aria-label="Ranked donors">
        {status === "loading" ? (
          <p
            data-testid="leaderboard-loading"
            className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground"
          >
            Loading the board…
          </p>
        ) : null}

        {status === "error" ? (
          <div
            data-testid="leaderboard-error"
            className="rounded-2xl border border-border bg-card px-4 py-10 text-center"
          >
            <p className="text-sm font-semibold text-foreground">
              We could not load the leaderboard right now.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : null}

        {status === "ready" && entries.length === 0 ? (
          <div
            data-testid="leaderboard-empty"
            className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center"
          >
            <h2 className="text-lg font-semibold text-foreground">No Odogwus ranked yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Once donors clear a bill and choose "Show my name", they will appear
              here.
            </p>
            <Link
              to="/feed"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            >
              Browse verified bills
            </Link>
          </div>
        ) : null}

        {status === "ready" && entries.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Top Odogwus ranked by total Naira given
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">Rank</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">Display name</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold sm:px-4">
                    Total given
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell sm:px-4">
                    Causes supported
                  </th>
                </tr>
              </thead>
              <tbody data-testid="leaderboard-list">
                {entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    data-testid="leaderboard-row"
                    className="border-b border-border last:border-b-0"
                  >
                    <td
                      data-testid="leaderboard-rank"
                      className="px-3 py-3 text-sm font-bold text-foreground sm:px-4"
                    >
                      {entry.rank}
                    </td>
                    <td
                      data-testid="leaderboard-name"
                      className="px-3 py-3 text-sm font-medium text-foreground sm:px-4"
                    >
                      {entry.displayName}
                      <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                        {entry.causesSupported} cause
                        {entry.causesSupported === 1 ? "" : "s"} supported
                      </span>
                    </td>
                    <td
                      data-testid="leaderboard-total"
                      className="px-3 py-3 text-right text-sm font-semibold text-emerald-600 sm:px-4"
                    >
                      {entry.formattedTotal}
                    </td>
                    <td
                      data-testid="leaderboard-causes"
                      className="hidden px-3 py-3 text-right text-sm text-muted-foreground sm:table-cell sm:px-4"
                    >
                      {entry.causesSupported}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          to="/feed"
          className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:bg-accent"
        >
          Explore the feed
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:bg-accent"
        >
          My dashboard
        </Link>
      </nav>
    </main>
  );
}
