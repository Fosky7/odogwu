import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { useAuth } from "@context/AuthContext";

const NAV_LINKS = [
  { to: "/feed", label: "Bills" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/create", label: "Request help" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

/**
 * Classic Odogwu crest - a heraldic shield in the brand navy with a fine gold
 * inner rule and a serif "O" monogram, matching the lockup used by the live
 * root header so every shell renders the same engraved seal.
 */
function BrandCrest({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 44"
      aria-hidden="true"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield field */}
      <path
        d="M20 2.4 36.2 7.5v13.9c0 8.4-6.8 14.7-16.2 19.6C10.6 36.1 3.8 29.8 3.8 21.4V7.5L20 2.4Z"
        className="text-primary"
        fill="currentColor"
      />
      {/* Inset gold hairline */}
      <path
        d="M20 5.5 33.3 9.6v11.6c0 7-5.7 12.3-13.3 16.3-7.6-4-13.3-9.3-13.3-16.3V9.6L20 5.5Z"
        className="text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Serif "O" monogram */}
      <ellipse
        cx="20"
        cy="19.4"
        rx="5.3"
        ry="6.3"
        className="text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

/**
 * Reusable application shell.
 *
 * The root layout owns the live header for the router, but this component is
 * kept as the shared shell for any page that needs to render the same brand,
 * navigation (including the Top Odogwus board) and footer in isolation.
 */
export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const signedIn = Boolean(user);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header
        role="banner"
        data-testid="site-header"
        className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 text-foreground transition hover:opacity-90"
            aria-label="Odogwu home"
          >
            {/* Classic lockup: crest, hairline rule, serif wordmark. */}
            <BrandCrest className="h-9 w-9 shrink-0" />
            <span
              aria-hidden="true"
              className="hidden h-7 w-px shrink-0 bg-border sm:block"
            />
            <span className="truncate font-serif text-xl font-semibold tracking-tight">
              Odogwu
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <button
                type="button"
                data-testid="header-signout"
                onClick={() => {
                  void signOut();
                }}
                className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent sm:px-3"
              >
                Sign out
              </button>
            ) : null}

            <button
              type="button"
              data-testid="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
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
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  activeProps={{
                    className:
                      "rounded-xl px-3 py-2.5 text-sm font-semibold text-primary bg-accent",
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
                    void signOut();
                  }}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
        ) : null}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border bg-card text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {new Date().getFullYear()} Odogwu. All rights reserved.</p>
          <p>Every amount shown in Naira (\u20a6)</p>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
