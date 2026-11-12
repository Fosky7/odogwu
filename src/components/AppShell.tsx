import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AppShellProps = {
  /** Route content. When omitted the shell renders the current route outlet. */
  children?: ReactNode;
};

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
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              {/* Odogwu brand mark: Igbo chieftaincy cap (okpu agu) crowned by
                  a single upright eagle feather (ugo). Drawn as three stacked
                  silhouettes so it stays legible at 20px. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 32 32"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Eagle feather rising out of the crown of the cap. */}
                <path
                  d="M16.2 3.4c2 1.9 3 4.1 3 6.5 0 1.3-.3 2.5-.9 3.6h-4.2c-.6-1.1-.9-2.3-.9-3.6 0-2.4 1-4.6 3-6.5Z"
                  fill="currentColor"
                />
                {/* Okpu agu crown. */}
                <path
                  d="M9.4 16.9c0-2.6 3-4.7 6.8-4.7s6.8 2.1 6.8 4.7v2.9H9.4v-2.9Z"
                  fill="currentColor"
                />
                {/* Wide cap band, parted from the crown by the badge colour. */}
                <path
                  d="M8 21h16.4v3.2c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2V21Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="text-base font-semibold tracking-tight">Civic Ledger</span>
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
              to="/cause/$id"
              params={{ id: "1" }}
              className="rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Causes
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

      <main className="flex-1">{children ?? <Outlet />}</main>
    </div>
  );
}

export default AppShell;
