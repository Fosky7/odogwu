import { useEffect, useRef, useState } from "react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Menu, ShieldCheck, X } from "lucide-react";

import { AuthProvider, useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { to: "/feed", label: "Bills" },
  { to: "/create", label: "Request help" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

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
      className={`${className} shrink-0 text-primary`}
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

/** Shared row styling for every entry inside the collapsed header menu. */
const MENU_ITEM_CLASS =
  "rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent";

/** Shared styling for every column link inside the footer. */
const FOOTER_LINK_CLASS =
  "inline-flex w-fit text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/**
 * Editorial wordmark treatment shared by the header and the footer: a serif
 * face with a whisper of extra tracking so the name reads as a masthead rather
 * than a UI label. Layout and sizing are unchanged.
 */
const WORDMARK_CLASS =
  "truncate font-serif font-semibold tracking-[0.02em]";

/** Small uppercase heading used above each footer column. */
function FooterHeading({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
      {children}
    </h2>
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
            className="flex min-w-0 items-center gap-2 text-foreground transition hover:opacity-90 sm:gap-2.5"
            aria-label="Odogwu home"
          >
            {/* Phone keeps the original 16px logo / 28px name lockup; desktop
                keeps the larger brand mark. */}
            <BrandLogo className="h-4 w-4 shrink-0 sm:h-8 sm:w-8" />
            <span className={`${WORDMARK_CLASS} text-lg leading-7 tracking-tight`}>
              Odogwu
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

        {/* Platform */}
        <nav aria-label="Platform" className="flex flex-col gap-3">
          <FooterHeading>Platform</FooterHeading>
          <Link to="/feed" className={FOOTER_LINK_CLASS}>
            Bills feed
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
