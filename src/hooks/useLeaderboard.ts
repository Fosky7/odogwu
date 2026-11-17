/**
 * useLeaderboard
 * ==============
 *
 * Reads the Odogwu leaderboard, the signed-in giver's own rank and the giver's
 * name-visibility choice from the server-verified aggregates added in
 * `20261117000000_odogwu_leaderboard.sql`.
 *
 * Why the ranking cannot be spoofed from the browser:
 *   * `leaderboard_top_givers` / `leaderboard_my_rank` are SECURITY DEFINER
 *     functions that only count `user_pledges` rows joined to a `payments` row
 *     already marked `paid` by the payment server. A pledge the browser wrote
 *     by hand has no settled payment behind it, so it can never buy a rank.
 *   * The giver's privacy choice lives in `public.giver_profiles`, which is
 *     owner-scoped by RLS. The public list only ever receives the projected
 *     display name (or "Anonymous giver") and a stable hash, never the uuid.
 *
 * Persistence contract (dashboard "Your giving rank" card):
 *   * turning "Show my name on the leaderboard" off writes
 *     `is_anonymous = true` to the giver's own `giver_profiles` row;
 *   * the row is re-read straight after the write and again on every mount, so
 *     the switch still shows off after a full page reload;
 *   * when the giver has opted out, the local rank summary immediately renders
 *     "Anonymous giver" — the same name the public aggregate will return.
 *
 * The hook reloads on mount and whenever the selected period changes, so a
 * full page reload always shows the same ranked givers in the same order
 * (the RPC orders by total desc, earliest settlement, then a stable id hash).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type LeaderboardPeriod = "all" | "month";

export interface LeaderboardGiver {
  rank: number;
  giverKey: string;
  displayName: string;
  isAnonymous: boolean;
  totalMinor: number;
  totalNaira: number;
  pledgeCount: number;
}

export interface MyLeaderboardRank {
  rank: number;
  totalMinor: number;
  totalNaira: number;
  pledgeCount: number;
  isAnonymous: boolean;
  displayName: string;
  giversAhead: number;
}

export interface LeaderboardPrivacy {
  displayName: string | null;
  isAnonymous: boolean;
}

export interface UseLeaderboardOptions {
  /** `all` is all-time (default); `month` starts at the first UTC day of this month. */
  period?: LeaderboardPeriod;
  /** The SQL function caps this at 100. */
  limit?: number;
}

export interface UseLeaderboardResult {
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
  givers: LeaderboardGiver[];
  topGivers: LeaderboardGiver[];
  myRank: MyLeaderboardRank | null;
  privacy: LeaderboardPrivacy | null;
  /** True once the stored visibility choice has actually been read. */
  privacyLoaded: boolean;
  isAnonymous: boolean;
  userId: string | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  updateVisibility: (isAnonymous: boolean) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const DEFAULT_LIMIT = 100;
const ANONYMOUS_LABEL = "Anonymous giver";
const DEFAULT_LABEL = "Odogwu giver";

/**
 * Narrow structural view of the Supabase client. The generated Database type
 * may not know about the new leaderboard functions/table yet, so the hook talks
 * to them through this cast instead of inventing a second client.
 */
interface LeaderboardDb {
  rpc(
    fn: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update(
      values: Record<string, unknown>,
    ): {
      eq(
        column: string,
        value: unknown,
      ): Promise<{ error: { message: string } | null }>;
    };
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
    upsert(
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ): Promise<{ error: { message: string } | null }>;
  };
}

const db = supabase as unknown as LeaderboardDb;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** First instant of the current month in UTC, matching the SQL `p_since` filter. */
function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function sinceFor(period: LeaderboardPeriod): string | null {
  return period === "month" ? monthStartIso() : null;
}

function mapGiver(value: unknown, index: number): LeaderboardGiver {
  const row = asRecord(value);
  return {
    rank: readNumber(row.rank) || index + 1,
    giverKey: readString(row.giver_key),
    displayName: readString(row.display_name, DEFAULT_LABEL),
    isAnonymous: row.is_anonymous === true,
    totalMinor: readNumber(row.total_minor),
    totalNaira: readNumber(row.total_naira),
    pledgeCount: readNumber(row.pledge_count),
  };
}

function mapMyRank(value: unknown): MyLeaderboardRank | null {
  const row = asRecord(value);
  if (Object.keys(row).length === 0) return null;

  return {
    rank: readNumber(row.rank),
    totalMinor: readNumber(row.total_minor),
    totalNaira: readNumber(row.total_naira),
    pledgeCount: readNumber(row.pledge_count),
    isAnonymous: row.is_anonymous === true,
    displayName: readString(row.display_name, DEFAULT_LABEL),
    giversAhead: readNumber(row.givers_ahead),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  const record = asRecord(error);
  return readString(record.message, fallback);
}

/** The name already known for the auth user, used as a public-name fallback. */
function nameFromMetadata(metadata: unknown): string {
  const record = asRecord(metadata);
  return readString(record.full_name, readString(record.name));
}

export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardResult {
  const initialPeriod = options.period ?? "all";
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? DEFAULT_LIMIT), 1), 100);

  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [givers, setGivers] = useState<LeaderboardGiver[]>([]);
  const [myRank, setMyRank] = useState<MyLeaderboardRank | null>(null);
  const [privacy, setPrivacy] = useState<LeaderboardPrivacy | null>(null);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const savingRef = useRef(false);

  /**
   * Read the giver's own `giver_profiles` row. Owner-only by RLS, so this can
   * never read anyone else's visibility choice.
   */
  const readPrivacy = useCallback(
    async (id: string, fallbackName: string): Promise<LeaderboardPrivacy> => {
      const { data, error: profileError } = await db
        .from("giver_profiles")
        .select("display_name, is_anonymous")
        .eq("user_id", id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);

      const profile = asRecord(data);
      return {
        displayName: readString(profile.display_name, fallbackName) || null,
        isAnonymous: profile.is_anonymous === true,
      };
    },
    [],
  );

  const load = useCallback(async (): Promise<void> => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const since = sinceFor(period);

      // 1. The public ranked list. The RPC is ordered server-side; the hook
      //    never re-sorts it, so a reload keeps the identical order.
      const { data: topData, error: topError } = await db.rpc("leaderboard_top_givers", {
        p_limit: limit,
        p_since: since,
      });
      if (topError) throw new Error(topError.message);
      if (request !== requestId.current) return;

      const topRows = Array.isArray(topData) ? topData : [];
      setGivers(topRows.map(mapGiver));

      // 2. The signed-in giver's own card and privacy setting.
      const { data: authData } = await supabase.auth.getUser();
      if (request !== requestId.current) return;

      const currentUser = authData?.user ?? null;
      setUserId(currentUser?.id ?? null);

      if (!currentUser) {
        setMyRank(null);
        setPrivacy(null);
        setPrivacyLoaded(true);
        return;
      }

      const { data: rankData, error: rankError } = await db.rpc("leaderboard_my_rank", {
        p_since: since,
      });
      if (rankError) throw new Error(rankError.message);
      if (request !== requestId.current) return;

      const rankRows = Array.isArray(rankData) ? rankData : rankData ? [rankData] : [];
      setMyRank(mapMyRank(rankRows[0]));

      const stored = await readPrivacy(
        currentUser.id,
        nameFromMetadata(currentUser.user_metadata),
      );
      if (request !== requestId.current) return;

      // A choice is being saved right now. The write owns the visible value, so
      // this (older) read must never publish the previous setting over it.
      if (savingRef.current) return;

      setPrivacy(stored);
      setPrivacyLoaded(true);
    } catch (err) {
      if (request !== requestId.current) return;
      setError(errorMessage(err, "Could not load the leaderboard."));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [period, limit, readPrivacy]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  /**
   * Write the giver's own visibility / display name, then re-read the stored row
   * so the switch can only ever show what the database actually kept.
   *
   * Two things keep the saved choice visible:
   *   * every read started before this write is invalidated (`requestId`), so a
   *     late `load()` result cannot put the old value back on the switch;
   *   * the chosen value is applied immediately after the write succeeds and is
   *     then confirmed by the server's own readback.
   */
  const persistPrivacy = useCallback(
    async (patch: { isAnonymous?: boolean; displayName?: string | null }): Promise<void> => {
      if (savingRef.current) {
        throw new Error("Your leaderboard visibility is already being saved.");
      }

      savingRef.current = true;

      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user ?? null;
        if (!currentUser) {
          throw new Error("Sign in to change how you appear on the leaderboard.");
        }

        const fallbackName = nameFromMetadata(currentUser.user_metadata);

        const storedName =
          patch.displayName !== undefined
            ? typeof patch.displayName === "string"
              ? patch.displayName.trim().slice(0, 60)
              : ""
            : readString(privacy?.displayName, fallbackName);

        const nextAnonymous =
          patch.isAnonymous !== undefined ? patch.isAnonymous : privacy?.isAnonymous === true;

        // Anything already in flight was started before this write, so its
        // result is stale the moment the new value lands.
        requestId.current += 1;

        const values: Record<string, unknown> = {
          user_id: currentUser.id,
          display_name: storedName ? storedName : null,
          is_anonymous: nextAnonymous,
        };

        const { error: upsertError } = await db
          .from("giver_profiles")
          .upsert(values, { onConflict: "user_id" });

        if (upsertError) {
          // `ON CONFLICT (user_id)` needs a unique index on `user_id`. Where
          // that index is absent the upsert is refused outright, so fall back
          // to updating the owner's own row and inserting it when it is still
          // missing. Either way the write is owner-scoped by RLS.
          const { error: updateError } = await db
            .from("giver_profiles")
            .update(values)
            .eq("user_id", currentUser.id);

          if (updateError) {
            const { error: insertError } = await db.from("giver_profiles").insert(values);
            if (insertError) throw new Error(insertError.message);
          }
        }

        // Publish the accepted choice straight away, so the switch reflects it
        // while the confirming read below is still on the wire.
        setUserId(currentUser.id);
        setPrivacy({ displayName: storedName || null, isAnonymous: nextAnonymous });
        setPrivacyLoaded(true);
        setLoading(false);

        setMyRank((current) => {
          if (!current) return current;
          return {
            ...current,
            isAnonymous: nextAnonymous,
            displayName: nextAnonymous
              ? ANONYMOUS_LABEL
              : readString(storedName, current.displayName),
          };
        });

        // Confirm the write by reading the row back instead of trusting local state.
        const stored = await readPrivacy(currentUser.id, fallbackName);

        requestId.current += 1;
        setPrivacy({
          displayName: stored.displayName ?? (storedName || null),
          isAnonymous: stored.isAnonymous,
        });
        setPrivacyLoaded(true);
        setLoading(false);

        setMyRank((current) => {
          if (!current) return current;
          return {
            ...current,
            isAnonymous: stored.isAnonymous,
            displayName: stored.isAnonymous
              ? ANONYMOUS_LABEL
              : readString(stored.displayName, storedName || current.displayName),
          };
        });
      } finally {
        savingRef.current = false;
      }
    },
    [privacy?.displayName, privacy?.isAnonymous, readPrivacy],
  );

  const updateVisibility = useCallback(
    (isAnonymous: boolean): Promise<void> => persistPrivacy({ isAnonymous }),
    [persistPrivacy],
  );

  const updateDisplayName = useCallback(
    (displayName: string): Promise<void> => persistPrivacy({ displayName }),
    [persistPrivacy],
  );

  const isAnonymous = useMemo(
    () => privacy?.isAnonymous ?? false,
    [privacy?.isAnonymous],
  );

  return {
    period,
    setPeriod,
    givers,
    topGivers: givers,
    myRank,
    privacy,
    privacyLoaded,
    isAnonymous,
    userId,
    loading,
    isLoading: loading,
    error,
    refresh,
    reload: refresh,
    updateVisibility,
    updateDisplayName,
  };
}

export default useLeaderboard;
