import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AppShellProps = {
  /** Route content. When omitted the shell renders the current route outlet. */
  children?: ReactNode;
};

/**
 * Classic brand emblem: a double-ruled medallion holding a line-drawn Igbo
 * chieftaincy cap (okpu agu) crowned by a single upright eagle feather (ugo).
 *
 * Kept in `currentColor` and stroke-only so it matches the mark used by the
 * root header/footer and stays crisp at small sizes.
 */
function BrandEmblem({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hairline outer rule plus a slightly heavier inner ring. */}
      <circle cx="20" cy="20" r="18.6" strokeWidth={0.9} opacity={0.5} />
      <circle cx="20" cy="20" r="15.6" strokeWidth={1.2} />

      {/* Eagle feather rising out of the crown of the cap. */}
      <path d="M20 6.9c1.8 1.9 2.7 3.9 2.7 5.9 0 1.2-.3 2.3-.8 3.4h-3.8c-.5-1.1-.8-2.2-.8-3.4 0-2 .9-4 2.7-5.9Z" />
      <path d="M20 8.6v7.4" strokeWidth={0.9} opacity={0.7} />

      {/* Okpu agu crown. */}
      <path d="M12.7 20.9c0-2.9 3.3-5.2 7.3-5.2s7.3 2.3 7.3 5.2" />

      {/* Wide cap band, parted from the crown by a hairline seam. */}
      <rect x="11.7" y="20.9" width="16.6" height="5.1" rx="1.5" />
      <path d="M13 23.4h14" strokeWidth={0.9} opacity={0.7} />
    </svg>
  );
}

/**
 * Height (in px) of the sticky header, used as `scroll-padding-top` so focused
 * fields are not scrolled underneath the banner.
 */
const HEADER_CLEARANCE = 80;

/**
 * Selectors for a page-level action / footer bar that is pinned to the bottom
 * of the viewport. When one of these is present the shell reserves its height
 * so it can never cover (or steal taps from) the end of the page content.
 */
const BOTTOM_BAR_SELECTOR = [
  '[data-fixed-action-bar]',
  '[data-action-bar]',
  '[data-testid="create-action-bar"]',
  '[data-testid="form-action-bar"]',
  '[data-slot="fixed-bottom-bar"]',
  '[class*="fixed"][class*="bottom-0"]',
].join(",");

/**
 * Global application shell: sticky header plus the routed page content.
 *
 * The header bar intentionally keeps the auth entry points ("Sign in" /
 * "Create account") out of the visible bar. They live inside the header menu
 * so the bar only shows the logo and the primary navigation.
 */
export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Measured height of a bottom-pinned action bar on the current page (0 when
  // the page has none). Reserved as padding on <main> so nothing is covered.
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  // Mirror of `bottomBarHeight` readable from event handlers without making
  // the focus-guard effect re-subscribe on every measurement.
  const bottomBarHeightRef = useRef(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Track the current session so the menu can offer "Sign out" to signed-in
  // users instead of the anonymous auth entry points. Session failures are
  // non-fatal: the shell simply falls back to the anonymous menu.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (active) setUserEmail(data.session?.user?.email ?? null);
        })
        .catch(() => {
          /* no session available - stay anonymous */
        });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setUserEmail(session?.user?.email ?? null);
      });

      unsubscribe = () => {
        data?.subscription?.unsubscribe();
      };
    } catch {
      // Auth is optional for the shell; ignore initialisation failures.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  // Close the menu when the user taps outside of it or presses Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /**
   * Accessibility fix: a bottom-pinned action bar must never cover page
   * content or a focused input.
   *
   * 1. We measure any bottom-pinned bar rendered by the current route and
   *    reserve that height as padding on <main>, so the last field and the
   *    primary action of the page always sit fully above the bar — including
   *    after scrolling to the very end of the form.
   * 2. We add the same clearance as `scroll-padding-bottom` (plus the sticky
   *    header height as `scroll-padding-top`) on the document so that the
   *    browser's focus scrolling keeps a focused input, its label and any
   *    validation message inside the visible area on short viewports.
   *
   * Routes without such a bar are untouched (clearance stays 0).
   */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    const measure = () => {
      let height = 0;
      const bars = document.querySelectorAll<HTMLElement>(BOTTOM_BAR_SELECTOR);
      bars.forEach((bar) => {
        const style = window.getComputedStyle(bar);
        if (style.position !== "fixed") return;
        const rect = bar.getBoundingClientRect();
        if (rect.height > 0) height = Math.max(height, Math.ceil(rect.height));
      });

      bottomBarHeightRef.current = height;
      setBottomBarHeight((current) => (current === height ? current : height));

      const clearance = height > 0 ? height + 16 : 0;
      root.style.scrollPaddingBottom = clearance > 0 ? `${clearance}px` : "";
      root.style.scrollPaddingTop = `${HEADER_CLEARANCE}px`;
    };

    measure();

    const observer = new MutationObserver(() => {
      measure();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-fixed-action-bar"],
    });

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.scrollPaddingBottom = "";
      root.style.scrollPaddingTop = "";
      bottomBarHeightRef.current = 0;
    };
  }, []);

  /**
   * Accessibility fix (step 2): guarantee a focused field is actually visible.
   *
   * Recentring relies on the browser honouring `scroll-padding`, which it does
   * not always do on reduced-height phone viewports where the on-screen
   * keyboard shrinks the visual viewport. After any focus change (and whenever
   * the visual viewport resizes/scrolls, e.g. when the keyboard opens) we check
   * whether the focused field still sits inside the safe area — below the
   * sticky header and above both the pinned bottom bar and the visual viewport
   * edge — and, only when it does not, scroll it back to the middle of the
   * usable area. Fields that are already visible are never moved.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;

    let frame = 0;

    const keepFocusedFieldVisible = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const tag = active.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;

      const rect = active.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const viewport = window.visualViewport;
      const visibleTop = viewport ? viewport.offsetTop : 0;
      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;

      const safeTop = visibleTop + HEADER_CLEARANCE;
      const reserved = bottomBarHeightRef.current > 0 ? bottomBarHeightRef.current + 16 : 16;
      const safeBottom = visibleBottom - reserved;

      if (rect.top < safeTop || rect.bottom > safeBottom) {
        active.scrollIntoView({ block: "center", inline: "nearest" });
      }
    };

    const scheduleCheck = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = 0;
          keepFocusedFieldVisible();
        });
      });
    };

    document.addEventListener("focusin", scheduleCheck);
    window.addEventListener("resize", scheduleCheck);
    window.visualViewport?.addEventListener("resize", scheduleCheck);
    window.visualViewport?.addEventListener("scroll", scheduleCheck);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("focusin", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
      window.visualViewport?.removeEventListener("resize", scheduleCheck);
      window.visualViewport?.removeEventListener("scroll", scheduleCheck);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network/auth errors - the local session is cleared by the SDK.
    }
    setUserEmail(null);
    try {
      await navigate({ to: "/" });
    } catch {
      window.location.assign("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            data-testid="site-logo"
            aria-label="Home"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {/* Medallion mark in place of the old filled badge; the 9x9 box is
                preserved so the header rhythm does not shift. */}
            <span className="flex h-9 w-9 items-center justify-center text-primary">
              <BrandEmblem className="h-8 w-8" />
            </span>
            <span className="truncate font-serif text-base font-semibold tracking-[0.02em]">
              Civic Ledger
            </span>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
            <Link
              to="/bills"
              className="rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Bills
            </Link>
            <Link
              to="/feed"
              className="rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Feed
            </Link>
            <Link
              to="/leaderboard"
              className="rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Leaderboard
            </Link>
          </nav>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              data-testid="header-menu-button"
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
              <span className="hidden sm:inline">{userEmail ? "Account" : "Menu"}</span>
            </button>

            {menuOpen && (
              <div
                id="header-menu"
                data-testid="header-menu"
                aria-label="Account menu"
                className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
              >
                <div className="flex flex-col gap-1 p-2">
                  {userEmail ? (
                    <>
                      <p className="truncate px-3 pt-1 pb-2 text-xs text-muted-foreground">
                        Signed in as {userEmail}
                      </p>
                      <button
                        type="button"
                        data-testid="header-menu-signout"
                        onClick={handleSignOut}
                        className="rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/signup"
                        onClick={closeMenu}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Create account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/*
        Bottom clearance: when the current route pins an action bar to the
        bottom of the viewport we reserve exactly that height (plus a small
        breathing gap) so the bar never covers the end of the form, the
        "Create cause" button or a focused input. Routes without a bottom bar
        keep zero extra padding.
      */}
      <main
        className="flex-1"
        style={
          bottomBarHeight > 0
            ? { paddingBottom: `${bottomBarHeight + 16}px` }
            : undefined
        }
      >
        {children ?? <Outlet />}
      </main>

      <div
        aria-hidden="true"
        data-testid="shell-bottom-clearance"
        style={{
          height: bottomBarHeight > 0 ? `${bottomBarHeight + 16}px` : 0,
          flex: "0 0 auto",
        }}
      />
    </div>
  );
}

export default AppShell;
