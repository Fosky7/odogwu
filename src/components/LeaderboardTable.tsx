/**
 * LeaderboardTable
 * ================
 *
 * The ranked list of Odogwu givers. It renders exactly what it is handed and
 * never computes a rank, a total or a name from client state: every row comes
 * from the SECURITY DEFINER aggregate (settled payments only), so a pledge the
 * browser wrote itself cannot appear here.
 *
 * The component accepts the two shapes the app already produces:
 *   * `LeaderboardEntry` (from `src/services/leaderboard.ts`) — has `total` and
 *     a pre-formatted `formattedTotal`.
 *   * `LeaderboardGiver` (from `src/hooks/useLeaderboard.ts`) — has `totalNaira`
 *     and `totalMinor`.
 * Both are normalised to whole Naira and formatted with the shared
 * `formatNaira`, so every total on the page starts with "₦".
 *
 * Ordering: rows are rendered by their server rank (ascending), then by total
 * (descending) as a deterministic tie-break, so a reload can never reshuffle
 * equal totals. First place additionally carries the "Odogwu" badge.
 *
 * States: a loading placeholder, an honest error line with retry, and an empty
 * state are all handled here so the page never renders a bare blank block. The
 * "Only confirmed pledges count toward rank" note is rendered in every settled
 * state so the rule is never hidden.
 */
import { formatNaira } from "@/types/models";
import { OdogwuBadge } from "@/components/OdogwuBadge";

/** A ranked giver in whichever shape the caller has available. */
export interface LeaderboardTableEntryLike {
  rank: number;
  giverKey?: string | null;
  displayName: string;
  isAnonymous?: boolean;
  /** Whole Naira (`LeaderboardEntry.total`). */
  total?: number;
  /** Whole Naira (`LeaderboardGiver.totalNaira`). */
  totalNaira?: number;
  /** Minor units in kobo (`LeaderboardGiver.totalMinor`), used as a fallback. */
  totalMinor?: number;
  /** Pre-formatted total, used only when it already starts with "₦". */
  formattedTotal?: string;
  pledgeCount?: number;
  isTopGiver?: boolean;
}

export interface LeaderboardTableProps {
  entries: ReadonlyArray<LeaderboardTableEntryLike>;
  /** Drives the secondary copy only; the rows come pre-rank-ordered. */
  period?: "all-time" | "this-month" | "all" | "month";
  loading?: boolean;
  error?: string | null;
  /** Shown when there are no rows and nothing is loading. */
  emptyMessage?: string;
  /** Optional retry (only rendered when `error` is set). */
  onRetry?: () => void;
  className?: string;
}

interface NormalisedRow {
  key: string;
  rank: number;
  displayName: string;
  isAnonymous: boolean;
  total: number;
  formattedTotal: string;
  pledgeCount: number;
  isTopGiver: boolean;
}

const CONFIRMED_NOTE = "Only confirmed pledges count toward rank";

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function toFiniteNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nairaTotal(entry: LeaderboardTableEntryLike): number {
  if (entry.total !== undefined && entry.total !== null) {
    return Math.max(0, Math.round(toFiniteNumber(entry.total)));
  }
  if (entry.totalNaira !== undefined && entry.totalNaira !== null) {
    return Math.max(0, Math.round(toFiniteNumber(entry.totalNaira)));
  }
  if (entry.totalMinor !== undefined && entry.totalMinor !== null) {
    return Math.max(0, Math.round(toFiniteNumber(entry.totalMinor) / 100));
  }
  return 0;
}

function formattedTotalFor(entry: LeaderboardTableEntryLike, total: number): string {
  const provided = typeof entry.formattedTotal === "string" ? entry.formattedTotal.trim() : "";
  if (provided.startsWith("\u20A6")) return provided;
  return formatNaira(total);
}

function normaliseName(entry: LeaderboardTableEntryLike): string {
  if (entry.isAnonymous === true) return "Anonymous giver";
  const name = typeof entry.displayName === "string" ? entry.displayName.trim().replace(/\s+/g, " ") : "";
  return name || "Odogwu giver";
}

/** Public helper so the page and the tests can rely on one normalisation path. */
export function normaliseLeaderboardRows(
  entries: ReadonlyArray<LeaderboardTableEntryLike>,
): NormalisedRow[] {
  const rows: NormalisedRow[] = entries.map((entry, index) => {
    const total = nairaTotal(entry);
    const rank = Math.max(1, Math.round(toFiniteNumber(entry.rank)) || index + 1);
    const key =
      (typeof entry.giverKey === "string" && entry.giverKey.trim()) || `rank-${rank}-${index}`;

    return {
      key,
      rank,
      displayName: normaliseName(entry),
      isAnonymous: entry.isAnonymous === true,
      total,
      formattedTotal: formattedTotalFor(entry, total),
      pledgeCount: Math.max(0, Math.round(toFiniteNumber(entry.pledgeCount))),
      isTopGiver: entry.isTopGiver === true || rank === 1,
    };
  });

  rows.sort(
    (a, b) => a.rank - b.rank || b.total - a.total || a.key.localeCompare(b.key),
  );

  return rows;
}

function pledgeLabel(count: number): string {
  if (count <= 0) return "No confirmed pledges yet";
  return count === 1 ? "1 confirmed pledge" : `${count} confirmed pledges`;
}

function LoadingRows() {
  return (
    <div data-testid="leaderboard-loading" role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">Loading the leaderboard…</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className="h-14 w-full animate-pulse rounded-xl border border-border/60 bg-muted/40"
        />
      ))}
    </div>
  );
}

export function LeaderboardTable({
  entries,
  period = "all-time",
  loading = false,
  error = null,
  emptyMessage = "No Odogwus on the board yet. The first confirmed pledge takes the badge.",
  onRetry,
  className,
}: LeaderboardTableProps) {
  const rows = normaliseLeaderboardRows(entries);
  const isMonthly = period === "this-month" || period === "month";

  if (loading && rows.length === 0) {
    return (
      <section data-testid="leaderboard-table" data-state="loading" className={classes("space-y-3", className)}>
        <LoadingRows />
      </section>
    );
  }

  if (error && rows.length === 0) {
    return (
      <section data-testid="leaderboard-table" data-state="error" className={classes("space-y-3", className)}>
        <p data-testid="leaderboard-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-input px-4 text-sm font-medium"
          >
            Try again
          </button>
        ) : null}
        <p data-testid="leaderboard-note" className="text-xs text-muted-foreground">
          {CONFIRMED_NOTE}
        </p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section data-testid="leaderboard-table" data-state="empty" className={classes("space-y-3", className)}>
        <p data-testid="leaderboard-empty" className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
        <p data-testid="leaderboard-note" className="text-center text-xs text-muted-foreground">
          {CONFIRMED_NOTE}
        </p>
      </section>
    );
  }

  return (
    <section data-testid="leaderboard-table" data-state="ready" data-period={isMonthly ? "this-month" : "all-time"} className={classes("space-y-3", className)}>
      <h2 className="text-base font-semibold tracking-tight">Top givers</h2>

      <ol aria-label="Top givers" className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.key}
            data-testid="leaderboard-row"
            data-rank={row.rank}
            data-anonymous={row.isAnonymous ? "true" : "false"}
            className={classes(
              "flex items-center gap-3 rounded-xl border p-3",
              row.isTopGiver
                ? "border-primary/40 bg-primary/5"
                : "border-border/70 bg-card",
            )}
          >
            <span
              data-testid="leaderboard-rank"
              aria-label={`Rank ${row.rank}`}
              className={classes(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                row.isTopGiver
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {row.rank}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p data-testid="leaderboard-name" className="truncate text-sm font-medium">
                  {row.displayName}
                </p>
                {row.isTopGiver ? <OdogwuBadge /> : null}
              </div>
              <p className="text-xs text-muted-foreground">{pledgeLabel(row.pledgeCount)}</p>
            </div>

            <span
              data-testid="leaderboard-total"
              className="shrink-0 text-sm font-semibold tabular-nums"
            >
              {row.formattedTotal}
            </span>
          </li>
        ))}
      </ol>

      {error ? (
        <p data-testid="leaderboard-error" role="status" className="text-xs text-muted-foreground">
          {error}
        </p>
      ) : null}

      <p data-testid="leaderboard-note" className="text-xs text-muted-foreground">
        {CONFIRMED_NOTE}
      </p>
    </section>
  );
}

export default LeaderboardTable;
