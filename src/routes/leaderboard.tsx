import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { LeaderboardTable } from "@/components/LeaderboardTable";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LEADERBOARD_PERIODS } from "@/services/leaderboard";
import type { LeaderboardPeriod } from "@/types/models";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Odogwu leaderboard" },
      {
        name: "description",
        content:
          "The top Odogwu givers, ranked only by confirmed pledges settled through the payment server.",
      },
    ],
  }),
  component: LeaderboardPage,
});

/**
 * The public Odogwu leaderboard.
 *
 * Everything ranked here comes from the SECURITY DEFINER aggregate
 * (`leaderboard_top_givers`) over settled payments, so a pledge the browser
 * wrote by hand can never buy a place. The page itself only picks a window
 * (all time / this month) and renders what the hook hands back.
 */
function LeaderboardPage() {
  const { givers, period, setPeriod, loading, error, refresh } = useLeaderboard({
    period: "all",
  });

  // The service copy uses "all-time" / "this-month"; the hook uses "all" / "month".
  const activePeriod: LeaderboardPeriod = period === "month" ? "this-month" : "all-time";

  return (
    <main
      data-testid="leaderboard-page"
      className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-16 pt-8 sm:px-6"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Odogwu leaderboard
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The givers whose confirmed pledges have funded the most bills. Totals are
          verified by the payment server — nothing typed into the browser can raise a
          rank.
        </p>
      </header>

      <div role="group" aria-label="Leaderboard period" className="flex flex-wrap gap-2">
        {LEADERBOARD_PERIODS.map((option) => {
          const selected = option.id === activePeriod;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              data-testid={`leaderboard-filter-${option.id}`}
              onClick={() => setPeriod(option.id === "this-month" ? "month" : "all")}
              className={
                selected
                  ? "inline-flex min-h-10 items-center justify-center rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  : "inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <LeaderboardTable
        entries={givers}
        period={activePeriod}
        loading={loading}
        error={error}
        emptyMessage={
          activePeriod === "this-month"
            ? "No confirmed pledges this month yet. The first one takes the badge."
            : "No Odogwus on the board yet. The first confirmed pledge takes the badge."
        }
        onRetry={() => {
          void refresh();
        }}
      />
    </main>
  );
}

export default LeaderboardPage;
