import "./lib/krossBackendKey";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles.css";
import "./lib/krossRuntimeBeacon";
import { startLegacyBrowserCopy } from "./lib/authStore";

// Bootstrap ordering: start once hydration is known, then paint.
// `startLegacyBrowserCopy` waits for the hydrated backend session, adopts any
// bill requests that only exist in this browser through owner-scoped,
// idempotent upserts (unique on owner + source collection + source id) and
// re-runs on every signed-in auth event. Records that fail stay pending with
// the browser copy retained and are retried on the next load — never dropped
// and never duplicated. It must never block or break rendering.
try {
  startLegacyBrowserCopy();
} catch {
  /* retried on the next successful load */
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
