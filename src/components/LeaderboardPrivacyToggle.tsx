import { useCallback, useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import {
  ANONYMOUS_VISIBILITY_NOTE,
  LEADERBOARD_PRIVACY_LABEL,
} from "@/services/leaderboard";
import { formatNaira } from "@/types/models";

/**
 * The giver's own leaderboard card on /dashboard.
 *
 * Two things live here and both come from the server:
 *
 *   * "Your giving rank" — the giver's position and naira total, read from the
 *     SECURITY DEFINER `leaderboard_my_rank` aggregate (settled payments only).
 *   * "Show my name on the leaderboard" — the opt-in switch backed by the
 *     owner-scoped `public.giver_profiles` row. Turning it off writes
 *     `is_anonymous = true`, shows "You will appear as Anonymous giver", and
 *     because the row is re-read on every mount the switch stays off after a
 *     full page reload.
 *
 * The card never computes a rank from anything the browser wrote: an unranked
 * giver is shown honestly as "Not ranked yet" with a ₦0 total.
 */
export function LeaderboardPrivacyToggle() {
  const { myRank, isAnonymous, loading, userId, updateVisibility } = useLeaderboard({
    period: "all",
  });

  const [showName, setShowName] = useState(!isAnonymous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the switch in step with what the server actually stored.
  useEffect(() => {
    setShowName(!isAnonymous);
  }, [isAnonymous]);

  const signedIn = Boolean(userId);

  const handleToggle = useCallback(async (): Promise<void> => {
    if (saving) return;

    const next = !showName;
    setError(null);
    setShowName(next);
    setSaving(true);

    try {
      // `updateVisibility` takes the anonymous flag, which is the opposite of
      // "show my name".
      await updateVisibility(!next);
    } catch (err) {
      setShowName(!next);
      setError(
        err instanceof Error
          ? err.message
          : "We could not save your leaderboard visibility. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [saving, showName, updateVisibility]);

  const rank = myRank && myRank.rank > 0 ? myRank.rank : null;
  const total = myRank?.totalNaira ?? 0;

  return (
    <section
      data-testid="your-giving-rank"
      aria-label="Your giving rank"
      className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Your giving rank</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {!signedIn
            ? "Sign in to be ranked"
            : isAnonymous
              ? "Appearing as Anonymous giver"
              : "Appearing under your name"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rank
          </p>
          <p data-testid="giver-rank" className="mt-1 text-xl font-bold text-foreground">
            {loading ? "\u2026" : rank ? `#${rank}` : "Not ranked yet"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total given
          </p>
          <p data-testid="giver-total" className="mt-1 text-xl font-bold text-foreground">
            {loading ? "\u2026" : formatNaira(total)}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <label
          htmlFor="leaderboard-show-name"
          className="flex items-center justify-between gap-3 text-sm font-medium text-foreground"
        >
          <span>{LEADERBOARD_PRIVACY_LABEL}</span>
          <span className="inline-flex items-center gap-2">
            {saving ? (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : null}
            <input
              id="leaderboard-show-name"
              data-testid="leaderboard-privacy-switch"
              type="checkbox"
              role="switch"
              className="h-5 w-9 cursor-pointer accent-primary disabled:cursor-not-allowed"
              checked={showName}
              disabled={!signedIn || saving || loading}
              onChange={handleToggle}
            />
          </span>
        </label>

        {showName ? (
          <p className="text-sm text-muted-foreground">
            Your name appears next to your total on the Odogwu leaderboard.
          </p>
        ) : (
          <p data-testid="leaderboard-anonymous-note" className="text-sm text-muted-foreground">
            {ANONYMOUS_VISIBILITY_NOTE}
          </p>
        )}

        {!signedIn && !loading ? (
          <p className="text-sm text-muted-foreground">
            Sign in to see your rank and control how you appear.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default LeaderboardPrivacyToggle;
