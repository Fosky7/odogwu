// krossbuild:backend-key v1 — auto-generated, safe to keep.
// Keeps this app on the current database key even after the key changes,
// without a rebuild. Only the public browser key is ever fetched.
//
// The key is now persisted for the signed-in account in the `backend_keys`
// table (owner-scoped, idempotent on owner + source collection + source id)
// and adopted after auth hydration. The browser copy is kept unchanged as a
// recovery backup.
const PROJECT_ID = "9255ff1e-0ea3-4426-9b29-e09755e90ed5";
const KEY_ENDPOINT = "https://krossbuild.com/api/public/backend-key";
const BACKEND_KEY_TABLE = "backend_keys";
const BACKEND_KEY_SOURCE_COLLECTION = "backend_key_";
const env: any = (import.meta as any)?.env || {};
const BAKED: string = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
let HOST = "";
try { HOST = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host : ""; } catch { HOST = ""; }
const STORE = "kross:backend-key:" + PROJECT_ID;

let latest = BAKED;
try { const s = typeof localStorage !== "undefined" ? localStorage.getItem(STORE) : null; if (s) latest = s; } catch { /* storage blocked */ }

let inflight: Promise<string> | null = null;
let lastRefresh = 0;

function rememberKey(key: string): void {
  if (!key) return;
  latest = key;
  try { localStorage.setItem(STORE, latest); } catch { /* ignore */ }
}

function persistKey(key: string): void {
  if (!key) return;
  void (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const ownerId = data?.session?.user?.id;
      if (!ownerId) return;
      await supabase.from(BACKEND_KEY_TABLE).upsert(
        {
          owner_id: ownerId,
          source_collection: BACKEND_KEY_SOURCE_COLLECTION,
          source_id: PROJECT_ID,
          key_value: key,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,source_collection,source_id" },
      );
    } catch { /* offline — the browser copy stays as backup */ }
  })();
}

function refreshKey(): Promise<string> {
  if (inflight) return inflight;
  if (Date.now() - lastRefresh < 30_000) return Promise.resolve(latest);
  lastRefresh = Date.now();
  inflight = (async () => {
    try {
      const r = await ORIGINAL(KEY_ENDPOINT + "?project=" + encodeURIComponent(PROJECT_ID) + "&stale=" + encodeURIComponent(latest.slice(-10)));
      if (r.ok) {
        const j = await r.json();
        if (typeof j?.key === "string" && j.key) {
          rememberKey(j.key);
          persistKey(j.key);
        }
      }
    } catch { /* offline — keep current key */ }
    inflight = null;
    return latest;
  })();
  return inflight;
}

function withKey(req: Request, key: string): Request {
  const h = new Headers(req.headers);
  const api = h.get("apikey");
  if (api && api !== key && (api === BAKED || api.startsWith("sb_publishable_") || api.split(".").length === 3)) h.set("apikey", key);
  const auth = h.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  // A signed-in user's token is left alone; only the bare app key is swapped.
  if (bearer && bearer !== key && (bearer === BAKED || bearer === api)) {
    if (key.startsWith("sb_")) h.delete("authorization"); else h.set("authorization", "Bearer " + key);
  }
  return new Request(req, { headers: h });
}

const ORIGINAL: typeof fetch = globalThis.fetch.bind(globalThis);

async function keyedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let req: Request;
  try { req = new Request(input as any, init); } catch { return ORIGINAL(input as any, init); }
  let host = "";
  try { host = new URL(req.url).host; } catch { /* relative */ }
  if (!HOST || host !== HOST) return ORIGINAL(input as any, init);
  const spare = req.clone();
  const res = await ORIGINAL(latest && latest !== BAKED ? withKey(req, latest) : req);
  if (res.status !== 401 && res.status !== 403) return res;
  let text = "";
  try { text = await res.clone().text(); } catch { return res; }
  if (!/invalid api key|legacy api keys|api key|apikey/i.test(text)) return res;
  const before = latest;
  const next = await refreshKey();
  if (!next || next === before) return res;
  return ORIGINAL(withKey(spare, next));
}

let adopting = false;

async function adoptStoredKey(): Promise<void> {
  if (adopting) return;
  adopting = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sessionData } = await supabase.auth.getSession();
    const ownerId = sessionData?.session?.user?.id ?? null;
    if (!ownerId) return;

    const { data, error } = await supabase
      .from(BACKEND_KEY_TABLE)
      .select("key_value")
      .eq("owner_id", ownerId)
      .eq("source_collection", BACKEND_KEY_SOURCE_COLLECTION)
      .eq("source_id", PROJECT_ID)
      .maybeSingle();

    if (!error && typeof data?.key_value === "string" && data.key_value) {
      if ((!latest || latest === BAKED) && data.key_value !== latest) {
        rememberKey(data.key_value);
      }
    }

    if (latest && latest !== BAKED) {
      await supabase.from(BACKEND_KEY_TABLE).upsert(
        {
          owner_id: ownerId,
          source_collection: BACKEND_KEY_SOURCE_COLLECTION,
          source_id: PROJECT_ID,
          key_value: latest,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,source_collection,source_id" },
      );
    }
  } catch { /* keep the browser copy; retry on the next load */ }
  finally { adopting = false; }
}

const g = globalThis as any;
if (HOST && !g.__krossBackendKey) {
  g.__krossBackendKey = true;
  globalThis.fetch = keyedFetch as typeof fetch;

  const scheduleAdoption = () => { void adoptStoredKey(); };
  setTimeout(scheduleAdoption, 0);
  void (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      supabase.auth.onAuthStateChange(() => { scheduleAdoption(); });
    } catch { /* auth unavailable: retry on next load */ }
  })();
}

export {};
