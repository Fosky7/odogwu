import { supabase } from "@/integrations/supabase/client";

/**
 * Leaderboard service.
 *
 * The public board itself is produced by the database (`public.leaderboard_top`
 * plus the `public.leaderboard_entries` view, added in the leaderboard
 * migration). The database already:
 *
 *  - restricts every row to accounts that opted in (`show_on_leaderboard`),
 *  - sums only money that actually settled, normalised to kobo,
 *  - clamps the result to the top 100 and breaks ties on `user_id` so ranks are
 *    stable across reloads.
 *
 * This module is the single place the UI touches that data. It turns the
 * PostgREST payload (Postgres `bigint` arrives as a string) into typed models,
 * keeps every amount in kobo so pages never do money math, and guarantees that
 * an e-mail address can never be published as a display name.
 */

/** Public board size. `leaderboard_top` clamps to the same number server-side. */
export const LEADERBOARD_LIMIT = 100;

/** What a ranked account with no publishable name is called. */
export const ANONYMOUS_DISPLAY_NAME = "Anonymous Odogwu";

/**
 * The two visibility choices offered in the pledge sheet, the dashboard rank
 * card and the privacy policy. Keeping the copy here means every surface says
 * exactly the same thing.
 */
export const LEADERBOARD_VISIBILITY_OPTIONS = [
  {
    value: true as const,
    label: "Show my name" as const,
    description:
      "Your giving total is ranked publicly next to your name on the Top Odogwus board.",
  },
  {
    value: false as const,
    label: "Don't rank me" as const,
    description:
      "Your totals are never published and you never appear on the public board.",
  },
];

/** One row of the public board, already safe to render. */
export type LeaderboardEntry = {
  /** 1-based position on the board (1 = gave the most). */
  rank: number;
  /** Account id. Used as a stable React key; never rendered. */
  userId: string;
  /** Publishable name, or `ANONYMOUS_DISPLAY_NAME`. Never an e-mail address. */
  displayName: string;
  /** Settled money in kobo (integer). */
  totalMinor: number;
  /** The same amount in Naira, for charts/aggregations. */
  totalNaira: number;
  /** Pre-formatted Naira string, e.g. "\u20a625,000". */
  formattedTotal: string;
  /** How many distinct bills this donor's settled pledges funded. */
  causesSupported: number;
};

/** The signed-in viewer's own standing, which drives the dashboard rank card. */
export type MyLeaderboardStanding = {
  /** `null` when the account is not ranked (not opted in, or nothing settled). */
  rank: number | null;
  totalMinor: number;
  totalNaira: number;
  formattedTotal: string;
  causesSupported: number;
  /** The stored opt-in flag (defaults to `false`: ranking is opt-in). */
  showOnLeaderboard: boolean;
  /** True only when the account currently holds a position on the board. */
  isRanked: boolean;
};

/** Error thrown when the leaderboard backend cannot be read or written. */
export class LeaderboardError extends Error {
  /** Raw driver/RPC error, kept for logging. Never shown to a donor. */
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "LeaderboardError";
    this.details = details;
  }
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format kobo (minor units) as a Naira string.
 *
 * Every amount on the board is settled money, so it is always a whole number of
 * kobo; the two-decimal branch only exists to stay honest if a partial amount
 * ever reaches the ledger.
 */
export function formatNairaMinor(minor: number): string {
  const safeKobo = Number.isFinite(minor) ? Math.trunc(minor) : 0;
  return `\u20a6${nairaFormatter.format(safeKobo / 100)}`;
}

/* -------------------------------------------------------------------------- */
/* PostgREST facade                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The generated database types in this project do not describe the leaderboard
 * functions yet, so this module talks to them through a deliberately narrow
 * facade: just the handful of call shapes actually used below. That keeps the
 * call sites type-checked without re-declaring the whole PostgREST builder.
 */
type QueryResult<T = unknown> = { data: T; error: unknown };

type QueryChain = {
  limit: (count: number) => PromiseLike<QueryResult>;
  maybeSingle: () => PromiseLike<QueryResult>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
};

type TableQuery = QueryChain & {
  select: (columns?: string) => QueryChain;
  upsert: (
    values: Record<string, unknown>,
    options?: { onConflict?: string },
  ) => PromiseLike<QueryResult>;
};

type LeaderboardClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<QueryResult>;
  from: (table: string) => TableQuery;
};

const db = supabase as unknown as LeaderboardClient;

/** A raw board row exactly as the database returns it. */
type LeaderboardRow = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Normalisation helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Postgres `bigint`/`numeric` columns arrive as strings over PostgREST. */
function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Read the single row out of either an array payload or a composite object. */
function firstRow(payload: unknown): LeaderboardRow | null {
  if (Array.isArray(payload)) {
    const [row] = payload;
    return row && typeof row === "object" ? (row as LeaderboardRow) : null;
  }
  return payload && typeof payload === "object"
    ? (payload as LeaderboardRow)
    : null;
}

/** Keep the requested page size inside what the database will serve. */
function clampLimit(limit: number): number {
  const numeric = Number.isFinite(limit) ? Math.trunc(limit) : LEADERBOARD_LIMIT;
  return Math.max(1, Math.min(numeric || LEADERBOARD_LIMIT, LEADERBOARD_LIMIT));
}

/**
 * Turn whatever name was stored into something safe to publish.
 *
 * The board is public, so a stored value that looks like an e-mail address is
 * never rendered: the account falls back to "Anonymous Odogwu" instead. This is
 * defence in depth - the database already prefers the profile name - but the
 * client must never be the thing that leaks a donor's inbox.
 */
export function sanitizeDisplayName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return ANONYMOUS_DISPLAY_NAME;
  if (raw.includes("@")) return ANONYMOUS_DISPLAY_NAME;
  return raw;
}

/** Map one raw row onto a render-ready board entry, or `null` if unusable. */
function toEntry(row: LeaderboardRow, fallbackRank: number): LeaderboardEntry | null {
  const userId = typeof row.user_id === "string" ? row.user_id.trim() : "";
  if (!userId) return null;

  const totalMinor = Math.max(Math.trunc(toFiniteNumber(row.total_minor)), 0);
  // A row with nothing settled is not a ranking - the database filters these
  // out, and so do we, so the lowest shown "Total given" is always at least
  // \u20a61.
  if (totalMinor <= 0) return null;

  const rankValue = Math.trunc(toFiniteNumber(row.rank));
  const rank = rankValue > 0 ? rankValue : fallbackRank;

  return {
    rank,
    userId,
    displayName: sanitizeDisplayName(row.display_name),
    totalMinor,
    totalNaira: totalMinor / 100,
    formattedTotal: formatNairaMinor(totalMinor),
    causesSupported: Math.max(Math.trunc(toFiniteNumber(row.causes_supported)), 0),
  };
}

/** Map the caller's own standing row. */
function mapStanding(row: LeaderboardRow): MyLeaderboardStanding {
  const totalMinor = Math.max(Math.trunc(toFiniteNumber(row.total_minor)), 0);
  const rankValue = Math.trunc(toFiniteNumber(row.rank));
  const rank = rankValue > 0 ? rankValue : null;

  const showOnLeaderboard =
    row.show_on_leaderboard === true || row.show_on_leaderboard === "true";

  return {
    rank,
    totalMinor,
    totalNaira: totalMinor / 100,
    formattedTotal: formatNairaMinor(totalMinor),
    causesSupported: Math.max(Math.trunc(toFiniteNumber(row.causes_supported)), 0),
    showOnLeaderboard,
    isRanked: rank !== null,
  };
}

/** The honest "Not ranked yet" state. */
function unrankedStanding(showOnLeaderboard = false): MyLeaderboardStanding {
  return {
    rank: null,
    totalMinor: 0,
    totalNaira: 0,
    formattedTotal: formatNairaMinor(0),
    causesSupported: 0,
    showOnLeaderboard,
    isRanked: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Session + reads                                                             */
/* -------------------------------------------------------------------------- */

/** The signed-in account id, or `null` for a signed-out visitor. */
async function currentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Ask the database for the ranked rows.
 *
 * The RPC is preferred (it owns the tie-breaking order); the public view is the
 * fallback so the page still renders if the function was not created in a
 * particular environment. A real failure is reported, never swallowed into an
 * empty-but-successful board.
 */
async function readRankedRows(
  limit: number,
): Promise<{ rows: LeaderboardRow[]; error: unknown }> {
  let firstError: unknown = null;

  try {
    const { data, error } = await db.rpc("leaderboard_top", { p_limit: limit });
    if (!error && Array.isArray(data)) {
      return { rows: data as LeaderboardRow[], error: null };
    }
    firstError = error ?? new LeaderboardError("leaderboard_top returned no rows");
  } catch (error) {
    firstError = error;
  }

  try {
    const { data, error } = await db
      .from("leaderboard_entries")
      .select("rank, user_id, display_name, total_minor, causes_supported")
      .order("rank", { ascending: true })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return { rows: data as LeaderboardRow[], error: null };
    }
    return { rows: [], error: error ?? firstError };
  } catch (error) {
    return { rows: [], error: error ?? firstError };
  }
}

/** Read the caller's stored opt-in flag straight from the table (own row only). */
async function readPreference(userId: string): Promise<boolean | null> {
  try {
    const { data, error } = await db
      .from("leaderboard_preferences")
      .select("show_on_leaderboard")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return null;
    const row = firstRow(data);
    if (!row) return null;
    return row.show_on_leaderboard === true || row.show_on_leaderboard === "true";
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The Top Odogwus board: at most `limit` (max 100) opted-in donors, ordered by
 * settled Naira given, highest first.
 *
 * Ranks are recomputed from the ordered result so a reload always shows the same
 * numbers in the same order, even if a driver ignored the `ORDER BY`.
 *
 * @throws {LeaderboardError} when the backend could not be read at all.
 */
export async function fetchLeaderboard(
  limit: number = LEADERBOARD_LIMIT,
): Promise<LeaderboardEntry[]> {
  const safeLimit = clampLimit(limit);
  const { rows, error } = await readRankedRows(safeLimit);

  if (error) {
    throw new LeaderboardError(
      "We could not load the leaderboard right now. Please try again.",
      error,
    );
  }

  const seen = new Set<string>();
  const entries: LeaderboardEntry[] = [];

  rows.forEach((row, index) => {
    const entry = toEntry(row, index + 1);
    if (!entry || seen.has(entry.userId)) return;
    seen.add(entry.userId);
    entries.push(entry);
  });

  entries.sort((a, b) => {
    if (b.totalMinor !== a.totalMinor) return b.totalMinor - a.totalMinor;
    if (a.userId === b.userId) return 0;
    return a.userId < b.userId ? -1 : 1;
  });

  return entries
    .slice(0, safeLimit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * The signed-in viewer's own rank and total, for the dashboard rank card.
 *
 * Returns `null` when nobody is signed in (the card is simply not shown) and a
 * zeroed, unranked standing when the account exists but has no position yet.
 *
 * @throws {LeaderboardError} only for an unexpected read failure; a missing
 *   ranking row is a normal state, not an error.
 */
export async function fetchMyLeaderboardStanding(): Promise<MyLeaderboardStanding | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await db.rpc("leaderboard_my_rank");
    if (!error) {
      const row = firstRow(data);
      if (row) return mapStanding(row);
    }
  } catch {
    /* fall through to the preference-only read below */
  }

  // Fallback for environments where the ranking function is absent: at least
  // report the stored choice so the toggle reflects the truth. Totals stay at
  // zero because ranking math belongs to the database.
  const preference = await readPreference(userId);
  return unrankedStanding(preference ?? false);
}

/**
 * Store the caller's leaderboard visibility ("Show my name" / "Don't rank me").
 *
 * The RPC is preferred because it returns the saved row; the direct upsert is
 * the fallback and is still safe - row level security only allows an account to
 * write its own row.
 *
 * @returns the value that is actually stored.
 * @throws {LeaderboardError} when nobody is signed in or the write was refused.
 */
export async function setLeaderboardVisibility(
  showOnLeaderboard: boolean,
): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) {
    throw new LeaderboardError("Sign in to change your leaderboard visibility.");
  }

  const desired = Boolean(showOnLeaderboard);

  try {
    const { data, error } = await db.rpc("set_leaderboard_visibility", {
      p_show_on_leaderboard: desired,
    });
    if (!error) {
      const row = firstRow(data);
      if (row && "show_on_leaderboard" in row) {
        return row.show_on_leaderboard === true || row.show_on_leaderboard === "true";
      }
      return desired;
    }
  } catch {
    /* fall through to the direct write */
  }

  try {
    const { error } = await db
      .from("leaderboard_preferences")
      .upsert(
        { user_id: userId, show_on_leaderboard: desired },
        { onConflict: "user_id" },
      );

    if (error) {
      throw new LeaderboardError(
        "We could not save your leaderboard choice. Please try again.",
        error,
      );
    }
    return desired;
  } catch (error) {
    if (error instanceof LeaderboardError) throw error;
    throw new LeaderboardError(
      "We could not save your leaderboard choice. Please try again.",
      error,
    );
  }
}
