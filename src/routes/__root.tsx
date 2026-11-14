import { useEffect, useRef, useState } from "react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Menu, ShieldCheck, X } from "lucide-react";

import { AuthProvider, useAuth } from "@context/AuthContext";

const NAV_LINKS = [
  { to: "/feed", label: "Bills" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/create", label: "Request help" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

/**
 * Classic Odogwu crest.
 *
 * Drawn as an engraved letterhead seal rather than a modern app icon: a
 * heraldic shield in the brand's deep navy, a double muted-gold rim inset from
 * the edge, a gold chief band carrying three bezants (the classic "coin"
 * roundels), and a serif "O" monogram below the band. Everything is expressed
 * with theme colours (primary / background) plus one restrained gold accent,
 * so it inherits the palette instead of hard-coding hex values.
 */
function BrandCrest({
  className = "h-9 w-9",
  label,
}: {
  className?: string;
  /** When supplied the crest is exposed as an image with this accessible name. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 44"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield field - the body of the crest. */}
      <path
        d="M20 1.8 36.6 7.1v14.1c0 8.6-7 15-16.6 20.1C10.4 36.2 3.4 29.8 3.4 21.2V7.1L20 1.8Z"
        className="text-primary"
        fill="currentColor"
      />

      {/* Engraved outer gold rim. */}
      <path
        d="M20 4.7 33.9 9v11.9c0 7.3-5.9 12.7-13.9 17-8-4.3-13.9-9.7-13.9-17V9L20 4.7Z"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Fine inner hairline - the second pass of an engraved seal. */}
      <path
        d="M20 7 31.6 10.5v10.4c0 6.2-4.9 11-11.6 14.7-6.7-3.7-11.6-8.5-11.6-14.7V10.5L20 7Z"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Chief band across the head of the shield. */}
      <path
        d="M9.2 16.4h21.6"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Three bezants (heraldic roundels) sitting in the chief. */}
      <g className="text-amber-400" fill="currentColor">
        <circle cx="14.1" cy="13.2" r="0.95" />
        <circle cx="20" cy="13.2" r="0.95" />
        <circle cx="25.9" cy="13.2" r="0.95" />
      </g>

      {/* Serif "O" monogram, sitting below the chief like a seal initial. */}
      <ellipse
        cx="20"
        cy="26.4"
        rx="4.6"
        ry="5.6"
        className="text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
      />
    </svg>
  );
}

/** Shared row styling for every entry inside the collapsed header menu. */
const MENU_ITEM_CLASS =
  "rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent";

/** Shared styling for every column link inside the footer. */
const FOOTER_LINK_CLASS =
  "inline-flex w-fit text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/** Small uppercase heading used above each footer column. */
function FooterHeading({ children }: { children: string }) {
  return (
    <h2 className="font-serif text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
      {children}
    </h2>
  );
}

/**
 * Small engraved ornament - a hairline rule with a centred lozenge. Used under
 * the wordmark so the lockup reads like a printed letterhead.
 */
function RuleOrnament({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 6"
      aria-hidden="true"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 3h22M40 3h22"
        className="text-border"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M32 0.8 34.4 3 32 5.2 29.6 3 32 0.8Z"
        className="text-primary"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

/**
 * The root layout mounts the session provider once, above every route, so the
 * shared header and the credential pages (login, signup, create) all read the
 * same persisted session instead of degrading to the provider-less fallback.
 */
function RootLayout() {
  return (
    <AuthProvider>
      <ShellLayout />
    </AuthProvider>
  );
}

function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const prevSignedIn = useRef(false);
  const { user, signOut } = useAuth();
  const signedIn = Boolean(user);

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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      /* keep the shell usable even if sign out fails */
    }
    setMenuOpen(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header
        ref={headerRef}
        role="banner"
        data-testid="site-header"
        className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        {/* Top bar: the brand on the left and the menu button on the right. The
            auth entry points (Sign in / Create account) live inside the menu,
            never as separate tabs in the bar itself. */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-1.5 px-4 py-3 sm:gap-3">
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 text-foreground transition-opacity hover:opacity-90 sm:gap-3.5"
            aria-label="Odogwu home"
          >
            {/* Classic lockup: crest, a hairline rule and the serif wordmark
                with a small spaced-caps subtitle over an engraved ornament,
                like a letterhead. The rule and subtitle only appear where
                there is room. */}
            <BrandCrest className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" label="Odogwu logo" />
            <span aria-hidden="true" className="hidden h-9 w-px shrink-0 bg-border sm:block" />
            <span className="flex min-w-0 flex-col justify-center leading-none">
              <span className="truncate font-serif text-xl font-semibold tracking-[0.05em] text-foreground sm:text-[1.4rem]">
                Odogwu
              </span>
              <span
                aria-hidden="true"
                className="mt-1.5 hidden truncate text-[0.58rem] font-medium uppercase tracking-[0.3em] text-muted-foreground sm:block"
              >
                Bill clearing
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {signedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-xl px-2 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent sm:px-3"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  data-testid="header-signout"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent sm:px-3"
                >
                  Sign out
                </button>
              </>
            ) : null}

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

        {/* Section tabs live inside the hamburger menu on every breakpoint. */}
        {menuOpen && (
          <nav
            id="site-menu"
            aria-label="Main"
            className="border-t border-border bg-card/95 shadow-lg backdrop-blur"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-3 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={
                    link.to === "/leaderboard" ? "nav-leaderboard" : undefined
                  }
                  onClick={() => setMenuOpen(false)}
                  className={MENU_ITEM_CLASS}
                  activeProps={{
                    className: `${MENU_ITEM_CLASS} bg-accent font-semibold text-primary`,
                  }}
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-1 h-px bg-border" aria-hidden="true" />

              {signedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  className={`${MENU_ITEM_CLASS} text-left`}
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
                    className="mt-1 inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <div className="flex-1">
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
            <p className="font-serif text-xs font-semibold uppercase tracking-[0.25em] text-primary">
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
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90">
            <BrandCrest className="h-10 w-10 shrink-0" />
            <span className="flex flex-col leading-none">
              <span className="font-serif text-xl font-semibold tracking-[0.05em]">
                Odogwu
              </span>
              <span
                aria-hidden="true"
                className="mt-1.5 text-[0.58rem] font-medium uppercase tracking-[0.3em] text-muted-foreground"
              >
                Bill clearing
              </span>
            </span>
          </Link>
          <RuleOrnament className="mt-4 h-1.5 w-20" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A Nigerian bill-clearing platform where every bill is checked by a human
            and every cleared naira produces a receipt the donor keeps.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Every bill human-verified
          </p>
        </div>

        {/* Platform */}
        <nav aria-label="Platform" className="flex flex-col gap-3">
          <FooterHeading>Platform</FooterHeading>
          <Link to="/" className={FOOTER_LINK_CLASS}>
            Home
          </Link>
          <Link to="/feed" className={FOOTER_LINK_CLASS}>
            Bills feed
          </Link>
          <Link to="/leaderboard" className={FOOTER_LINK_CLASS}>
            Leaderboard
          </Link>
          <Link to="/dashboard" className={FOOTER_LINK_CLASS}>
            My dashboard
          </Link>
          <Link to="/login" className={FOOTER_LINK_CLASS}>
            Sign in
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {year} Odogwu. All rights reserved.</p>
          <p>Built in Lagos - Every amount shown in Naira (N)</p>
        </div>
      </div>

      {/* Home doorway. It is deliberately the LAST navigation element on the
          page. It is a router link so leaving the home page records exactly one
          history entry and Back returns to the home page; pressing it while
          already home is a harmless no-op instead of pushing a duplicate
          history entry that would confuse Back and Forward. */}
      <nav aria-label="Home" className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-4">
          <RuleOrnament className="h-1.5 w-16 opacity-70" />
          <Link
            to="/"
            className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Back to home
          </Link>
        </div>
      </nav>
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
