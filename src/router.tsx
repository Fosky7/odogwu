import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/**
 * Put the document back at its very first pixel.
 *
 * `behavior: "instant"` is deliberate: a tapped link must show the top of the
 * destination immediately, so the reset is never animated and never inherits a
 * `scroll-behavior: smooth` rule from the stylesheet. Every plausible scroll
 * container is reset because browsers disagree about which element actually owns
 * the offset (`scrollingElement` vs `documentElement` vs `body`).
 */
function resetDocumentScroll(): void {
  if (typeof window === "undefined") return;

  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  } catch {
    // Very old engines reject the options bag - fall back to the positional API.
    window.scrollTo(0, 0);
  }

  const scrollingElement = document.scrollingElement;
  if (scrollingElement) scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
}

// Never let the browser restore a previous offset on back/forward or reload:__
// every page is meant to be read from the top.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // The router's own bookkeeping must not scroll back to a remembered position
  // after a navigation either - the top of the page is always the landing spot.
  scrollRestoration: false,
});

/**
 * Reset the viewport for every completed navigation: link taps, `<Link>`
 * redirects and the browser's back/forward buttons (all of them resolve through
 * the router).
 *
 * The reset runs immediately and again on the next animation frame, so content
 * that renders a tick later (lazy images, measured lists) cannot leave the page
 * part-way down. Hash targets are skipped because those genuinely point at a
 * section of the page rather than its start.
 */
router.subscribe("onResolved", (event) => {
  const hash = (event as unknown as { toLocation?: { hash?: string } } | undefined)
    ?.toLocation?.hash;
  if (hash) return;

  resetDocumentScroll();

  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      resetDocumentScroll();
    });
  }
});

/** Convenience factory so both router mounting styles keep working. */
export function getRouter() {
  return router;
}

export default router;

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
