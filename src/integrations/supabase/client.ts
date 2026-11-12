import { createClient } from "@supabase/supabase-js";

/**
 * Canonical Supabase browser client for the app.
 *
 * Only the publishable (anon) key is ever used here — service-role keys must
 * never reach client code. Configuration comes from Vite env variables so the
 * same bundle can run against different environments.
 */
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined) ??
  "";

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "";

/** True when both the project URL and the publishable key are available. */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Authentication and data access will be unavailable until the environment is configured.",
  );
}

/**
 * Fallback values keep client construction from throwing at import time so the
 * UI can still render a helpful error state instead of a blank screen.
 */
const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "public-anon-key-placeholder";

const browserStorage =
  typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase = createClient(
  SUPABASE_URL || FALLBACK_URL,
  SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...(browserStorage ? { storage: browserStorage } : {}),
    },
  },
);

export default supabase;
