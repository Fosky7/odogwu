import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Menu, ShieldCheck, X } from "lucide-react";

import { AuthProvider, useAuth } from "@/context/AuthContext";

/**
 * Site-wide metadata defaults.
 *
 * These live on the root route so every page in the app inherits a non-empty
 * `description`, Open Graph and Twitter card set, even when the page's own
 * `head()` only declares a title. TanStack Router merges root meta with the
 * leaf route's meta and de-duplicates by `name` / `property`, keeping the
 * deepest (most specific) tag, so a page can still override any of these
 * without producing duplicate tags in the document head.
 */
const SITE_TITLE = "Odogwu - clear a bill, prove every Naira";
const SITE_DESCRIPTION =
  "Odogwu connects verified Nigerian hospital, school and rent bills with donors who can see exactly where every naira lands - down to the receipt.";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/**
 * Primary section links rendered inside the collapsed header menu.
 *
 * The menu is mounted by the root shell, so these entries are available on
 * every route in the app (home, /login, /feed, /bills, /leaderboard, ...).
 * `Leaderboard` points at the existing /leaderboard page so it is reachable
 * from any screen without needing a dedicated entry elsewhere.
 */
const NAV_LINKS = [
  { to: "/cause", label: "Causes" },
  { to: "/feed", label: "Bills" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/create", label: "Request a bill" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

/**
 * Odogwu brand mark - a classic medallion rather than a filled app icon.
 *
 * A hairline outer ring frames a slightly heavier inner ring, and inside sits a
 * line-drawn Igbo chieftaincy cap (okpu agu) crowned by a single upright eagle
 * feather (ugo). Everything is stroked in `currentColor` so the emblem inherits
 * the surrounding text colour in the header, the footer and on dark surfaces,
 * and the thin, unfilled linework still reads at the 16px header size.
 */
function BrandLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Odogwu logo"
      viewBox="0 0 40 40"
      width={32}
      height={32}
      className={`${className} shrink-0 text-primary`}
      // Inline max-width keeps the global `svg { max-width: 100% }` guard in
      // index.css from ever squeezing the brand mark inside a tight header,
      // so the emblem keeps its exact 32x32 drawing at every breakpoint.
      style={{ maxWidth: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
    >
      {/* Classic double rule framing the mark. */}
      <circle cx="20" cy="20" r="18.6" strokeWidth={0.9} opacity={0.5} />
      <circle cx="20" cy="20" r="15.6" strokeWidth={1.2} />

      {/* Eagle feather (ugo) rising out of the crown of the cap. */}
      <path d="M20 6.9c1.8 1.9 2.7 3.9 2.7 5.9 0 1.2-.3 2.3-.8 3.4h-3.8c-.5-1.1-.8-2.2-.8-3.4 0-2 .9-4 2.7-5.9Z" />
      <path d="M20 8.6v7.4" strokeWidth={0.9} opacity={0.7} />

      {/* Okpu agu crown - a restrained dome that tapers into the band. */}
      <path d="M12.7 20.9c0-2.9 3.3-5.2 7.3-5.2s7.3 2.3 7.3 5.2" />

      {/* Wide cap band, parted from the crown by a hairline seam. */}
      <rect x="11.7" y="20.9" width="16.6" height="5.1" rx="1.5" />
      <path d="M13 23.4h14" strokeWidth={0.9} opacity={0.7} />
    </svg>
  );
}

/**
 * Shared row styling for every entry inside the collapsed header menu.
 *
 * 320px-wide phones are the tightest target: the row is `w-full` with
 * `min-w-0`/`max-w-full` so it can never be wider than the menu column, and
 * `whitespace-normal break-words` lets a long label ("Request a bill",
 * "Leaderboard") wrap onto a second line inside the row instead of being
 * clipped at the right edge or pushing the column sideways. The horizontal
 * padding steps down to `px-2.5` on the narrowest screens (back to `px-3` from
 * `sm`), which buys the label the extra few pixels it needs to sit on one line
 * where the viewport allows it.
 *
 * The row also carries a visible keyboard focus treatment (`focus-visible`
 * ring drawn inside the header), so tabbing to any section link - including
 * "Leaderboard" - always shows which row currently owns focus. The ring is
 * only rendered for keyboard focus, so pointer users see no extra chrome.
 */
const MENU_ITEM_CLASS =
  "block w-full min-w-0 max-w-full whitespace-normal break-words rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3";

/** Shared styling for every column link inside the footer. */
const FOOTER_LINK_CLASS =
  "inline-flex w-fit text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/**
 * Editorial wordmark treatment shared by the header and the footer: a serif
 * face with a whisper of extra tracking so the name reads as a masthead rather
 * than a UI label. Layout and sizing are unchanged.
 */
const WORDMARK_CLASS = "truncate font-serif font-semibold tracking-tight";

/** Small uppercase heading used above each footer column. */
function FooterHeading({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
      {children}
    </h2>
  );
}

/**
 * `useLayoutEffect` runs before the browser paints, which is what we want for
 * a scroll reset (it avoids a visible flash of the previous scroll offset).
 * During server rendering there is no DOM, so fall back to `useEffect` to keep
 * React from warning about a layout effect on the server.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RouteMetaTag = {
  title?: string;
  name?: string;
  property?: string;
  httpEquiv?: string;
  charSet?: string;
  content?: string;
};

const ROUTE_META_ATTR = "data-odogwu-route-meta";

/**
 * TanStack Router 1.95 computes each matched route's head metadata but does
 * not ship the later HeadContent component. Write that route data to the
 * browser here: deepest title wins, and named/property tags are de-duplicated
 * in favour of the deepest page. Root tags remain defaults for omitted fields.
 */
function RouteHead() {
  const matches = useRouterState({ select: (state) => state.matches });

  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined" || !document.head) return;

    let title = SITE_TITLE;
    const tags = new Map<string, RouteMetaTag>();

    for (const match of matches) {
      for (const tag of (match.meta ?? []) as Array<RouteMetaTag | undefined>) {
        if (!tag) continue;
        if (tag.title?.trim()) {
          title = tag.title;
          continue;
        }

        const key = tag.name
          ? `name:${tag.name}`
          : tag.property
            ? `property:${tag.property}`
            : tag.httpEquiv
              ? `http-equiv:${tag.httpEquiv}`
              : tag.charSet
                ? "charset"
                : null;
        if (key) tags.set(key, tag);
      }
    }

    document.title = title;
    document.head
      .querySelectorAll(`meta[${ROUTE_META_ATTR}]`)
      .forEach((node) => node.parentNode?.removeChild(node));

    for (const tag of tags.values()) {
      const meta = document.createElement("meta");
      meta.setAttribute(ROUTE_META_ATTR, "");
      if (tag.name) meta.setAttribute("name", tag.name);
      if (tag.property) meta.setAttribute("property", tag.property);
      if (tag.httpEquiv) meta.setAttribute("http-equiv", tag.httpEquiv);
      if (tag.charSet) meta.setAttribute("charset", tag.charSet);
      meta.setAttribute("content", tag.content ?? "");
      document.head.appendChild(meta);
    }
  }, [matches]);

  return null;
}

/**
 * The root layout mounts the session provider once, above every route, so the
 * shared header and the credential pages (login, signup, create) all read the
 * same persisted session instead of degrading to the provider-less fallback.
 */
function RootLayout() {
  return (
    <>
      <RouteHead />
      <AuthProvider>
        <ShellLayout />
      </AuthProvider>
    </>
  );
}

/**
 * Bring the viewport back to the very first pixel without any animation.
 *
 * The document itself is the scroll container for the whole app (the shell is a
 * normal-flow column, never a nested scroller), so the reset targets the window
 * and the document's scrolling element. `instant` is used explicitly so a
 * `scroll-behavior: smooth` stylesheet rule cannot turn the reset into a
 * visible upward glide. Any element that ever opts into owning its own scroll
 * (`data-scroll-container`) is reset too, so a future nested scroller cannot
 * silently keep the old offset.
 */
function scrollPageToTop(): void {
  if (typeof window === "undefined") return;

  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }

  // Belt and braces: some browsers ignore the options object above, and the
  // document scrolling element can differ from `documentElement` (body in
  // quirks mode), so both are sent back to their origin.
  const scrollingElement = document.scrollingElement;
  if (scrollingElement) scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  document.querySelectorAll<HTMLElement>("[data-scroll-container]").forEach((node) => {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  });
}

function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const prevSignedIn = useRef(false);
  const { user, signOut } = useAuth();
  const signedIn = Boolean(user);

  // The current location, so the shell can react to every navigation (link tap,
  // redirect or browser back/forward) no matter which link produced it. The
  // pathname drives the scroll reset; the hash is honoured so /page#section
  // links still land on their section instead of the top.
  const locationPathname = useRouterState({ select: (state) => state.location.pathname });
  const locationHash = useRouterState({ select: (state) => state.location.hash ?? "" });

  // Close the menu on Escape or on a click/tap outside the header so the
  // collapsed bar never traps the rest of the page.
  useEffect(() => {
    if (!menuOpen) return;

    const close = () => setMenuOpen(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (headerRef.current && !headerRef.current.contains(target)) close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  // The "Sign in" / "Create account" doorways live inside the menu, so the menu
  // is reopened the moment a session ends (making them reachable straight away)
  // and closed again as soon as somebody is signed in.
  useEffect(() => {
    if (signedIn) {
      setMenuOpen(false);
    } else if (prevSignedIn.current) {
      setMenuOpen(true);
    }
    prevSignedIn.current = signedIn;
  }, [signedIn]);

  // Browsers restore the last scroll offset on back/forward by default, which
  // fights the "every link opens at the top" rule. Take manual control once on
  // mount so the reset below is always the only scroll source of truth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Every internal link opens its destination at the top of the page, so the
  // offset is reset whenever the location changes. The reset runs before the
  // first paint, then again over the next two frames (content that renders a
  // tick later cannot leave the viewport part-way down), and once more after a
  // short settle window so late data, images or fonts that grow the document
  // during hydration still leave the reader at the top.
  //
  // The late settle pass is skipped as soon as the reader interacts with the
  // page (wheel, touch, key or pointer), because at that point a scroll change
  // is intentional - e.g. a pledge sheet opening over the feed must not yank
  // the feed back to the top when it closes.
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const hash = locationHash.replace(/^#/, "");

    const reset = () => {
      if (hash) {
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      }
      scrollPageToTop();
    };

    let interacted = false;
    const markInteracted = () => {
      interacted = true;
    };

    // Passive listeners: this only observes intent, it never blocks scrolling.
    window.addEventListener("wheel", markInteracted, { passive: true, once: true });
    window.addEventListener("touchstart", markInteracted, { passive: true, once: true });
    window.addEventListener("keydown", markInteracted, { once: true });
    window.addEventListener("pointerdown", markInteracted, { passive: true, once: true });

    // Immediate pass plus the next two frames must always win: the new page has
    // not been seen yet, so landing at the top is the expected behaviour.
    reset();

    const firstFrame = window.requestAnimationFrame(() => {
      reset();
    });
    const secondFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!interacted) reset();
      });
    });
    const settleTimer = window.setTimeout(() => {
      if (!interacted) reset();
    }, 150);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("wheel", markInteracted);
      window.removeEventListener("touchstart", markInteracted);
      window.removeEventListener("keydown", markInteracted);
      window.removeEventListener("pointerdown", markInteracted);
    };
  }, [locationPathname, locationHash]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      /* keep the shell usable even if sign out fails */
    }
    setMenuOpen(true);
  };

  return (
    // The shell is a normal-flow column inside the document: it never owns a
    // scrollbar, so `window`/the document element stays the one and only scroll
    // container. The sticky header below therefore sticks to the viewport while
    // the page (content + footer) scrolls as one continuous document.
    <div
      data-testid="app-shell"
      className="flex min-h-dvh flex-col bg-background text-foreground"
    >
      <header
        ref={headerRef}
        role="banner"
        data-testid="site-header"
        className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        {/* Top bar: the brand on the left and the menu button on the right.

            The bar deliberately carries NO account actions. "Dashboard" and
            "Sign out" (and the signed-out "Sign in" / "Create account"
            doorways) exist exactly once, inside the hamburger menu below, so
            a signed-in reader never sees a duplicated Dashboard link or a
            duplicated Sign out control compete with the menu entries.

            At 320px the bar has very little room, so the horizontal gutter
            steps down to `px-3` (back to `px-4` from the `sm` breakpoint) and
            the actions group is `shrink-0`, which means the menu button can
            never be squeezed off-screen. The brand lockup absorbs the
            remaining space and truncates its own name instead of pushing the
            controls out of the bar. */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-1.5 px-3 py-3 sm:gap-3 sm:px-4">
          <Link
            to="/"
            data-testid="brand-lockup"
            className="flex shrink-0 items-center gap-2 text-foreground transition hover:opacity-90"
            aria-label="Odogwu home"
          >
            {/* The header brand lockup keeps its original, compact measurement
                on every breakpoint: the same 28px mark and the same small serif
                name, separated by an 8px gap, so the lockup stays ~84x28px on a
                phone exactly as it is on desktop. */}
            <BrandLogo className="h-7 w-7 shrink-0" />
            {/* The wordmark never shrinks or truncates: the brand lockup keeps
                its original measurement (28px mark + 8px gap + the same serif
                name) even when the signed-in actions grow. */}
            <span
              className={`${WORDMARK_CLASS} shrink-0 whitespace-nowrap text-sm leading-7 tracking-tight`}
            >
              Odogwu
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              data-testid="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Section tabs live inside the hamburger menu on every breakpoint. The
            rows are stacked vertically and wrap their own label, so every entry
            - including "Request a bill" and "Leaderboard" - stays fully
            visible and tappable even on a 320px-wide screen. The row for the
            page you are on is marked with `aria-current="page"` and a primary
            coloured, accented background so it reads as current next to the
            others. */}
        {menuOpen && (
          <nav
            id="site-menu"
            data-testid="site-menu"
            aria-label="Main"
            className="border-t border-border bg-card/95 shadow-lg backdrop-blur"
          >
            {/* `min-w-0` on the column (and on each row) keeps the stacked
                menu exactly as wide as the viewport minus the 8px gutter at
                320px, so no section label can ever be clipped on the right. */}
            <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-1 px-2 py-3 sm:px-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={MENU_ITEM_CLASS}
                  activeProps={{
                    className: `${MENU_ITEM_CLASS} bg-accent font-semibold text-primary`,
                    "aria-current": "page",
                  }}
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-1 h-px bg-border" aria-hidden="true" />

              {/* The one and only account action in the shell. It is never
                  repeated in the header bar above. */}
              {signedIn ? (
                <button
                  type="button"
                  data-testid="menu-sign-out"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  className={MENU_ITEM_CLASS}
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className={MENU_ITEM_CLASS}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 inline-flex w-full min-w-0 max-w-full items-center justify-center rounded-xl bg-primary px-2.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* The routed page is a plain block in normal document flow: the document
          itself (not this wrapper) is the scroll container, so the header can
          stay sticky and the footer scrolls as one continuous page. `min-w-0`
          keeps wide tables/cards from forcing horizontal nesting. */}
      <div className="min-w-0 flex-1" data-testid="page-content">
        <Outlet />
      </div>

      <SiteFooter />
    </div>
  );
}

/**
 * Full site footer. It is the single source of truth for the legal surface of
 * the product: every policy that governs pledges, receipts and data handling is
 * reachable from here in one tap, on phone and on desktop.
 */
function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid="site-footer"
      className="border-t border-border bg-card text-foreground"
    >
      {/* Closing call to action - gives the footer a purpose, not just links. */}
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:py-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Odogwu
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Clear a bill. Prove every Naira.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Verified bills from real people, funded by donors who can see exactly
              where their money lands - down to the receipt.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link
              to="/feed"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Browse verified bills
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Request help
            </Link>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand + promise */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90">
            <BrandLogo />
            <span className={`${WORDMARK_CLASS} text-lg`}>Odogwu</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A Nigerian bill-clearing platform where every bill is checked by a human
            and every cleared naira produces a receipt the donor keeps.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Every bill human-verified
          </p>
        </div>

        {/* Platform. The auth doorways live in the header menu; the footer only
            repeats the section links, so "Sign in" is declared exactly once on
            the page and a role query for it resolves to a single element. */}
        <nav aria-label="Platform" className="flex flex-col gap-3">
          <FooterHeading>Platform</FooterHeading>
          <Link to="/feed" className={FOOTER_LINK_CLASS}>
            Bills feed
          </Link>
          <Link to="/leaderboard" className={FOOTER_LINK_CLASS}>
            Leaderboard
          </Link>
          <Link to="/dashboard" className={FOOTER_LINK_CLASS}>
            My dashboard
          </Link>
          <Link to="/signup" className={FOOTER_LINK_CLASS}>
            Create account
          </Link>
        </nav>

        {/* Legal */}
        <nav aria-label="Legal" className="flex flex-col gap-3">
          <FooterHeading>Legal</FooterHeading>
          <Link to="/legal/terms" className={FOOTER_LINK_CLASS}>
            Terms of Service
          </Link>
          <Link to="/legal/privacy" className={FOOTER_LINK_CLASS}>
            Privacy Policy
          </Link>
          <Link to="/legal/cookies" className={FOOTER_LINK_CLASS}>
            Cookie Policy
          </Link>
          <Link to="/legal/donations" className={FOOTER_LINK_CLASS}>
            Donation &amp; Refund Policy
          </Link>
          <Link to="/legal/accessibility" className={FOOTER_LINK_CLASS}>
            Accessibility Statement
          </Link>
        </nav>

        {/* Support */}
        <div className="flex flex-col gap-3">
          <FooterHeading>Support</FooterHeading>
          <a
            href="mailto:support@odogwu.ng"
            className={`${FOOTER_LINK_CLASS} items-center gap-2`}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            support@odogwu.ng
          </a>
          <Link to="/legal/contact" className={FOOTER_LINK_CLASS}>
            Contact &amp; complaints
          </Link>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We reply within two business days, Monday to Friday, 9:00-17:00 WAT.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {year} Odogwu. All rights reserved.</p>

          {/* The last navigation in the document points back to the home page,
              so a reader who has finished with the link columns is always one
              tap from the starting page and browser history stays coherent
              after following the media/legal links above. */}
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
            <Link to="/" className={FOOTER_LINK_CLASS}>
              Home
            </Link>
          </nav>

          <p>Built in Lagos - Every amount shown in Naira (N)</p>
        </div>
      </div>
    </footer>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page you were looking for does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
      >
        Back to the home page
      </Link>
    </main>
  );
}
