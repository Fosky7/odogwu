/**
 * Odogwu leaderboard service.
 *
 * One typed read path for everything the leaderboard UI needs:
 *
 *   * `fetchLeaderboard(period)`   → the ranked givers, straight from the
 *                                    SECURITY DEFINER aggregate
 *                                    `leaderboard_top_givers` (settled payments
 *                                    only), with the bundled seed list as an
 *                                    honest fallback when the backend cannot be
 *                                    reached.
 *   * `fetchMyGiverRank(period)`   → the signed-in giver's own rank and total
 *                                    via `leaderboard_my_rank`.
 *   * `fetchPrivacySettings` / `savePrivacySettings` → the giver's own row in
 *                                    `giver_profiles` (owner-only RLS).
 *
 * The browser never computes a rank from client-written pledges and never sees
 * an account id: rows are normalised, ordered by their server rank and capped at
 * the top 100 before they leave this module.
 */
import { supabase } from "@/integrations/supabase/client";
import { seedLeaderboard } from "@/data/seed";
import {
  formatNaira,
  type GiverRankSummary,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardPrivacySettings,
  type LeaderboardSnapshot,
} from "@/types/models";

/** The leaderboard never ranks more than the top 100 givers. */
export const LEADERBOARD_LIMIT = 100;

/** Copy used everywhere a giver has opted out of being named. */
export const ANONYMOUS_GIVER_LABEL = "Anonymous giver";

/** Name shown when a giver is public but has not set a display name yet. */
export const DEFAULT_GIVER_LABEL = "Odogwu giver";

/** Label of the dashboard switch that opts a giver in or out of being named. */
export const LEADERBOARD_PRIVACY_LABEL = "Show my name on the leaderboard";

/**
 * Shown under the switch once the giver has opted out, so the consequence of
 * turning it off is spelled out before (and after) it is saved.
 */
export const ANONYMOUS_VISIBILITY_NOTE = `You will appear as ${ANONYMOUS_GIVER_LABEL}`;

/** The filter chips, in render order. */
export const LEADERBOARD_PERIODS: ReadonlyArray<{ id: LeaderboardPeriod; label: string }> = [
  { id: "all-time", label: "All time" },
  { id: "this-month", label: "This month" },
];

/** Narrow an arbitrary string (e.g. a `?range=` search param) to a period. */
export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return value === "all-time" || value === "this-month";
}

/**
 * ISO start of the window the aggregate should count, or `null` for all time.
 * "This month" starts at 00:00 UTC on the first day of the current month, which
 * is the same boundary the database compares `paid_at` against.
 */
export function resolvePeriodSince(
  period: LeaderboardPeriod,
  now: Date = new Date(),
): string | null {
  if (period !== "this-month") return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

/* ------------------------------------------------------------------ */
/* Normalisation helpers                                              */
/* ------------------------------------------------------------------ */

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normaliseDisplayName(value: unknown, isAnonymous: boolean): string {
  if (isAnonymous) return ANONYMOUS_GIVER_LABEL;
  const raw = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return raw ? raw.slice(0, 60) : DEFAULT_GIVER_LABEL;
}

/** Whole Naira from either the pre-rounded `total_naira` or the minor amount. */
function resolveNairaTotal(row: Record<string, unknown>): number {
  if (row.total_naira !== null && row.total_naira !== undefined && row.total_naira !== "") {
    return Math.max(0, Math.round(toNumber(row.total_naira)));
  }
  return Math.max(0, Math.round(toNumber(row.total_minor) / 100));
}

/** One ranked row from the aggregate, already safe to render. */
export function mapLeaderboardRow(row: Record<string, unknown>, index = 0): LeaderboardEntry {
  const isAnonymous = row.is_anonymous === true;
  const rank = Math.max(1, Math.round(toNumber(row.rank) || index + 1));
  const total = resolveNairaTotal(row);
  const key = typeof row.giver_key === "string" ? row.giver_key.trim() : "";

  return {
    rank,
    giverKey: key || `rank-${rank}`,
    displayName: normaliseDisplayName(row.display_name, isAnonymous),
    isAnonymous,
    total,
    formattedTotal: formatNaira(total),
    pledgeCount: Math.max(0, Math.round(toNumber(row.pledge_count))),
    isTopGiver: rank === 1,
  };
}

/**
 * Turn whatever the RPC returned into an ordered, capped list. Ordering is by
 * the server's rank first (so a reload can never reshuffle equal totals), then
 * by total and key as a deterministic tie-break.
 */
export function normaliseLeaderboard(rows: unknown): LeaderboardEntry[] {
  if (!Array.isArray(rows)) return [];

  const entries = rows.map((row, index) => mapLeaderboardRow(recordOf(row), index));

  entries.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.total - a.total ||
      a.giverKey.localeCompare(b.giverKey),
  );

  return entries.slice(0, LEADERBOARD_LIMIT);
}

/** The bundled fallback ranking, used only when the live aggregate is unusable. */
export function seedLeaderboardSnapshot(
  period: LeaderboardPeriod,
  fetchedAt: string = new Date().toISOString(),
): LeaderboardSnapshot {
  return {
    entries: seedLeaderboard.map((entry) => ({ ...entry, isTopGiver: entry.rank === 1 })),
    period,
    since: resolvePeriodSince(period),
    source: "seed",
    fetchedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Untyped client bridge                                              */
/* ------------------------------------------------------------------ */

interface RpcResponse {
  data: unknown;
  error: unknown;
}

interface SelectQuery {
  eq(column: string, value: string): { maybeSingle(): Promise<RpcResponse> };
}

interface GiverProfilesTable {
  select(columns?: string): SelectQuery;
  upsert(
    values: Record<string, unknown>,
    options?: { onConflict?: string },
  ): Promise<{ data?: unknown; error: unknown }>;
}

function rpc(name: string, params: Record<string, unknown>): Promise<RpcResponse> {
  const client = supabase as unknown as {
    rpc(fn: string, args?: Record<string, unknown>): Promise<RpcResponse>;
  };
  return client.rpc(name, params);
}

function giverProfiles(): GiverProfilesTable {
  const client = supabase as unknown as { from(table: string): GiverProfilesTable };
  return client.from("giver_profiles");
}

function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

/**
 * The ranked givers for a period, highest total first.
 *
 * A failed or empty server response falls back to the bundled ranking instead of
 * throwing, so the page can always render a list — it just says where the list
 * came from (`source`), and never invents a total.
 */
export async function fetchLeaderboard(
  period: LeaderboardPeriod = "all-time",
): Promise<LeaderboardSnapshot> {
  const safePeriod: LeaderboardPeriod = isLeaderboardPeriod(period) ? period : "all-time";
  const since = resolvePeriodSince(safePeriod);

  try {
    const { data, error } = await rpc("leaderboard_top_givers", {
      p_limit: LEADERBOARD_LIMIT,
      p_since: since,
    });

    if (error) throw error;

    const entries = normaliseLeaderboard(data);
    if (entries.length > 0) {
      return {
        entries,
        period: safePeriod,
        since,
        source: "server",
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn(
      "[leaderboard] live ranking unavailable, showing the bundled ranking:",
      messageOf(error, "unknown error"),
    );
  }

  return seedLeaderboardSnapshot(safePeriod);
}

/** Map the single row returned by `leaderboard_my_rank`. */
export function mapGiverRank(row: Record<string, unknown>): GiverRankSummary {
  const isAnonymous = row.is_anonymous === true;
  const total = resolveNairaTotal(row);
  const rawRank = Math.round(toNumber(row.rank));
  const hasPledges = rawRank > 0;

  return {
    hasPledges,
    rank: hasPledges ? rawRank : null,
    total,
    formattedTotal: formatNaira(total),
    pledgeCount: Math.max(0, Math.round(toNumber(row.pledge_count))),
    giversAhead: Math.max(0, Math.round(toNumber(row.givers_ahead))),
    isAnonymous,
    displayName: normaliseDisplayName(row.display_name, isAnonymous),
  };
}

/**
 * The signed-in giver's own rank, or `null` when there is no session or the rank
 * cannot be read (the dashboard then shows its "no rank yet" state).
 */
export async function fetchMyGiverRank(
  period: LeaderboardPeriod = "all-time",
): Promise<GiverRankSummary | null> {
  const safePeriod: LeaderboardPeriod = isLeaderboardPeriod(period) ? period : "all-time";

  try {
    const { data, error } = await rpc("leaderboard_my_rank", {
      p_since: resolvePeriodSince(safePeriod),
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const record = recordOf(row);
    if (Object.keys(record).length === 0) return null;

    return mapGiverRank(record);
  } catch (error) {
    console.warn("[leaderboard] could not read your rank:", messageOf(error, "unknown error"));
    return null;
  }
}

/** Defaults used whenever the giver has never saved a visibility choice. */
export const EMPTY_PRIVACY_SETTINGS: LeaderboardPrivacySettings = {
  displayName: null,
  isAnonymous: false,
  updatedAt: null,
};

function mapPrivacyRow(row: Record<string, unknown>): LeaderboardPrivacySettings {
  const name = typeof row.display_name === "string" ? row.display_name.trim() : "";
  return {
    displayName: name ? name.slice(0, 60) : null,
    isAnonymous: row.is_anonymous === true,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/** The giver's own opt-out flag and public name (owner-only read). */
export async function fetchPrivacySettings(
  userId: string,
): Promise<LeaderboardPrivacySettings> {
  if (!userId) return EMPTY_PRIVACY_SETTINGS;

  try {
    const { data, error } = await giverProfiles()
      .select("display_name, is_anonymous, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    const record = recordOf(data);
    if (Object.keys(record).length === 0) return EMPTY_PRIVACY_SETTINGS;

    return mapPrivacyRow(record);
  } catch (error) {
    console.warn(
      "[leaderboard] could not read your visibility setting:",
      messageOf(error, "unknown error"),
    );
    return EMPTY_PRIVACY_SETTINGS;
  }
}

/**
 * Save the giver's visibility choice. Throws so the dashboard can surface a real
 * error instead of silently pretending the switch stuck.
 */
export async function savePrivacySettings(
  userId: string,
  patch: { displayName?: string | null; isAnonymous?: boolean },
): Promise<LeaderboardPrivacySettings> {
  if (!userId) {
    throw new Error("Sign in to change how you appear on the leaderboard.");
  }

  const values: Record<string, unknown> = { user_id: userId };

  if (patch.isAnonymous !== undefined) {
    values.is_anonymous = patch.isAnonymous;
  }

  if (patch.displayName !== undefined) {
    const name = typeof patch.displayName === "string" ? patch.displayName.trim().slice(0, 60) : "";
    values.display_name = name || null;
  }

  try {
    const { error } = await giverProfiles().upsert(values, { onConflict: "user_id" });
    if (error) throw error;
  } catch (error) {
    throw new Error(
      messageOf(error, "We could not save your leaderboard visibility. Please try again."),
    );
  }

  const saved = await fetchPrivacySettings(userId);
  return {
    displayName: saved.displayName,
    isAnonymous: patch.isAnonymous !== undefined ? patch.isAnonymous : saved.isAnonymous,
    updatedAt: saved.updatedAt ?? new Date().toISOString(),
  };
}
