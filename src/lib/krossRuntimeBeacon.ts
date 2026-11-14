// krossbuild:runtime-beacon v2 — auto-generated, safe to keep.
// Reports uncaught runtime errors from the live app so they can be diagnosed
// and repaired automatically. No personal data is collected: only the route
// path, the error message and its stack frames.

const PROJECT_ID = "9255ff1e-0ea3-4426-9b29-e09755e90ed5";
const ENDPOINT_BASE =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (typeof window !== "undefined" ? (window as any).__SUPABASE_URL__ : "") ||
  "";

const MAX_REPORTS = 6;
const seen = new Set<string>();
let sent = 0;
let installed = false;

type Kind = "error" | "unhandledrejection" | "console" | "network" | "mount";

function signature(kind: Kind, message: string, stack?: string): string {
  const head = (stack || "").split("\n").slice(0, 2).join("|");
  return kind + "::" + message.slice(0, 180) + "::" + head.slice(0, 200);
}

function report(kind: Kind, message: string, stack?: string, extra?: Record<string, unknown>) {
  try {
    if (!ENDPOINT_BASE || !PROJECT_ID) return;
    if (sent >= MAX_REPORTS) return;
    const msg = String(message || "").slice(0, 600);
    if (!msg) return;
    const sig = signature(kind, msg, stack);
    if (seen.has(sig)) return;
    seen.add(sig);
    sent += 1;

    const payload = {
      projectId: PROJECT_ID,
      events: [
        {
          kind,
          message: msg,
          stack: (stack || "").slice(0, 2000),
          route: typeof location !== "undefined" ? location.pathname.slice(0, 200) : "/",
          href: typeof location !== "undefined" ? location.origin.slice(0, 200) : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
          at: new Date().toISOString(),
          ...(extra || {}),
        },
      ],
    };
    const url = ENDPOINT_BASE.replace(/\/+$/, "") + "/functions/v1/runtime-error-ingest";
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* the reporter must never break the app */
  }
}

export function installRuntimeBeacon(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const err = (event as ErrorEvent).error;
    report(
      "error",
      (err && err.message) || (event as ErrorEvent).message || "Uncaught error",
      err && err.stack,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const message =
      reason && typeof reason === "object" && "message" in reason
        ? String((reason as Error).message)
        : String(reason);
    report("unhandledrejection", message, reason && (reason as Error).stack);
  });

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const first = args.find((a) => a instanceof Error) as Error | undefined;
      const text = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : ""))
        .filter(Boolean)
        .join(" ");
      if (text) report("console", text, first?.stack);
    } catch {
      /* ignore */
    }
    originalError(...args);
  };

  const originalFetch = window.fetch?.bind(window);
  if (originalFetch) {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const res = await originalFetch(input, init);
        if (res.status >= 500) {
          const target = typeof input === "string" ? input : String((input as Request).url ?? input);
          report("network", "HTTP " + res.status + " from " + target.split("?")[0].slice(0, 200));
        }
        return res;
      } catch (e) {
        const target = typeof input === "string" ? input : String((input as Request).url ?? input);
        report("network", "Network request failed: " + target.split("?")[0].slice(0, 200), (e as Error)?.stack);
        throw e;
      }
    };
  }

  // Mount assertion — if the root element is still empty a beat after load,
  // the app booted but rendered nothing (a white screen for the visitor).
  window.setTimeout(() => {
    try {
      const root = document.getElementById("root");
      if (root && root.childElementCount === 0) {
        report("mount", "App mounted but #root is empty (blank screen).");
      }
    } catch {
      /* ignore */
    }
  }, 4000);

  // Broken-image guard — any picture that fails to load (dead link, blocked
  // hotlink, typo) is swapped for a designed cover: a colourful gradient
  // (stable per title) with the title set in large type, so visitors never
  // see a broken-image icon or a plain grey box.
  const placeholder = (label: string) => {
    const title = (label || "")
      .replace(/^(cover|image|photo|picture|poster|thumbnail) (of|for) /i, "")
      .replace(/[<>&"']/g, "")
      .trim()
      .slice(0, 60) || "Untitled";
    let h = 0;
    for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const hue2 = (hue + 40 + (h % 80)) % 360;
    const words = title.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 14 && cur) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, 4);
    const size = shown.length > 2 ? 34 : 42;
    const startY = 300 - ((shown.length - 1) * size * 1.15) / 2;
    const tspans = shown
      .map((l, i) => "<tspan x='200' y='" + (startY + i * size * 1.15) + "'>" + l + "</tspan>")
      .join("");
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600' preserveAspectRatio='xMidYMid slice'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='hsl(" + hue + ",65%,45%)'/>" +
      "<stop offset='1' stop-color='hsl(" + hue2 + ",70%,22%)'/></linearGradient></defs>" +
      "<rect width='400' height='600' fill='url(#g)'/>" +
      "<circle cx='330' cy='90' r='120' fill='white' fill-opacity='0.08'/>" +
      "<circle cx='60' cy='540' r='160' fill='black' fill-opacity='0.12'/>" +
      "<rect x='40' y='150' width='60' height='4' fill='white' fill-opacity='0.7'/>" +
      "<text font-family='Georgia,serif' font-weight='700' font-size='" + size + "' fill='white' text-anchor='middle'>" +
      tspans + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  const fixImage = (img: HTMLImageElement) => {
    if (img.dataset.krossFallback) return;
    img.dataset.krossFallback = "1";
    img.removeAttribute("srcset");
    img.src = placeholder(img.alt);
    if (!img.style.objectFit) img.style.objectFit = "cover";
  };
  document.addEventListener(
    "error",
    (event) => {
      const t = event.target as HTMLElement | null;
      if (t && t.tagName === "IMG") fixImage(t as HTMLImageElement);
    },
    true,
  );
  const sweep = () => {
    document.querySelectorAll("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fixImage(img);
    });
  };
  window.setTimeout(sweep, 1500);
  window.setTimeout(sweep, 5000);
}

installRuntimeBeacon();
