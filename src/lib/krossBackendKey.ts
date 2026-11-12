// krossbuild:backend-key v1 — auto-generated, safe to keep.
// Keeps this app on the current database key even after the key changes,
// without a rebuild. Only the public browser key is ever fetched.
const PROJECT_ID = "9255ff1e-0ea3-4426-9b29-e09755e90ed5";
const KEY_ENDPOINT = "https://krossbuild.com/api/public/backend-key";
const env: any = (import.meta as any)?.env || {};
const BAKED: string = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
let HOST = "";
try { HOST = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host : ""; } catch { HOST = ""; }
const STORE = "kross:backend-key:" + PROJECT_ID;

let latest = BAKED;
try { const s = typeof localStorage !== "undefined" ? localStorage.getItem(STORE) : null; if (s) latest = s; } catch { /* storage blocked */ }

let inflight: Promise<string> | null = null;
let lastRefresh = 0;

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
          latest = j.key;
          try { localStorage.setItem(STORE, latest); } catch { /* ignore */ }
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

const g = globalThis as any;
if (HOST && !g.__krossBackendKey) {
  g.__krossBackendKey = true;
  globalThis.fetch = keyedFetch as typeof fetch;
}

export {};
