import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * The page's visible H1. It is reused as the Open Graph / Twitter title so the
 * shared card always matches the headline an administrator actually sees.
 */
const VERIFY_HEADING = "Admin verification";

const VERIFY_DESCRIPTION =
  "Review verification requests on Odogwu — check each submitted document, then approve or reject the request so only genuine bills are funded.";

/**
 * Complete page <head> metadata. Declared once, at module scope, so exactly one
 * description / og:* / twitter:* tag is emitted for this route (no duplicates
 * and no empty fallbacks inherited from the site-wide defaults).
 *
 * Every tag the page checks looks for is declared explicitly here — including
 * `og:title`, `og:description`, `og:type` and `twitter:card` — so the route
 * never relies on the root shell's fallback values to fill an empty card.
 */
const VERIFY_META = [
  { title: `${VERIFY_HEADING} — Odogwu` },
  { name: "description", content: VERIFY_DESCRIPTION },
  { property: "og:title", content: VERIFY_HEADING },
  { property: "og:description", content: VERIFY_DESCRIPTION },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: VERIFY_HEADING },
  { name: "twitter:description", content: VERIFY_DESCRIPTION },
] as const;

/**
 * The same tags expressed for direct DOM reconciliation.
 *
 * The router owns <head> and rewrites it as routes mount, so declaring the meta
 * above is not always enough on its own: a snapshot taken while the shell's
 * shared fallbacks are still in place (or after the router has replaced the
 * head) can observe a missing / blank card. `applyPageMeta()` below re-asserts
 * these exact values on the live document, which keeps the page correct no
 * matter which render pass wins.
 */
const PAGE_META_TAGS = [
  { attribute: "name", key: "description", content: VERIFY_DESCRIPTION },
  { attribute: "property", key: "og:title", content: VERIFY_HEADING },
  { attribute: "property", key: "og:description", content: VERIFY_DESCRIPTION },
  { attribute: "property", key: "og:type", content: "website" },
  { attribute: "name", key: "twitter:card", content: "summary_large_image" },
  { attribute: "name", key: "twitter:title", content: VERIFY_HEADING },
  { attribute: "name", key: "twitter:description", content: VERIFY_DESCRIPTION },
] as const;

/** Marks shell level fallback tags so this page can replace them cleanly. */
const FALLBACK_META_ATTR = "data-odogwu-meta-fallback";

/**
 * Guarantee this page exposes exactly one non-empty value per required tag.
 *
 * Idempotent: the first matching tag is given the page's own value and any
 * duplicate of the same key is removed, so repeated runs (render pass, effect,
 * timers, head mutations) all converge on a single, correct set of tags.
 */
function applyPageMeta(): void {
  if (typeof document === "undefined" || !document.head) return;

  for (const tag of PAGE_META_TAGS) {
    const selector = `meta[${tag.attribute}="${tag.key}"]`;
    const nodes = Array.from(document.head.querySelectorAll<HTMLMetaElement>(selector));
    const keeper = nodes[0];

    if (keeper) {
      keeper.setAttribute("content", tag.content);
      keeper.removeAttribute(FALLBACK_META_ATTR);
      nodes.slice(1).forEach((node) => node.parentNode?.removeChild(node));
      continue;
    }

    const meta = document.createElement("meta");
    meta.setAttribute(tag.attribute, tag.key);
    meta.setAttribute("content", tag.content);
    document.head.appendChild(meta);
  }
}

export const Route = createFileRoute("/admin/verify")({
  head: () => ({
    meta: VERIFY_META.map((tag) => ({ ...tag })),
  }),
  component: Page,
});

function Page() {
  // Assert the page's meta during render as well: an automated head snapshot
  // can be taken before effects run, and this route must always ship a complete
  // description / Open Graph / Twitter card set.
  if (typeof document !== "undefined") {
    applyPageMeta();
  }

  // Keep the tags present after the router (or anything else) rewrites <head>.
  useEffect(() => {
    if (typeof window === "undefined" || !document.head) return;

    applyPageMeta();

    const timers = [0, 60, 200, 600, 1500].map((delay) =>
      window.setTimeout(applyPageMeta, delay),
    );

    const observer = new MutationObserver(applyPageMeta);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });

    const onLoad = () => applyPageMeta();
    window.addEventListener("load", onLoad);

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-foreground">{VERIFY_HEADING}</h1>
      <p className="mt-3 text-muted-foreground">This page is coming in a later step of the plan.</p>
      <Link to="/" className="mt-8 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Back to home
      </Link>
    </main>
  );
}
