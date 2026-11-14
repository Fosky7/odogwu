import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";
import { AuthError, INVALID_CREDENTIALS_MESSAGE } from "@/services/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

/**
 * Small inline button that flips the password field between masked and
 * readable text. It is a plain `type="button"` so pressing it (or hitting
 * Enter/Space while it has focus) never submits the sign-in form.
 */
function PasswordVisibilityToggle({
  visible,
  onToggle,
  controls,
}: {
  visible: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      data-testid="toggle-password-visibility"
      onClick={onToggle}
      aria-pressed={visible}
      aria-controls={controls}
      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {visible ? "Hide password" : "Show password"}
    </button>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

/**
 * Normalise whatever the auth service throws into copy we can safely show a
 * person.
 *
 * `signIn` from `@/services/auth` already throws an {@link AuthError} whose
 * message is written for humans, so those pass straight through. Any other
 * Error keeps its message only if it actually has one, and anything
 * unrecognisable falls back to the standard invalid-credential copy — never a
 * bare technical string.
 */
function toDisplayMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.message.trim() || INVALID_CREDENTIALS_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return INVALID_CREDENTIALS_MESSAGE;
}

function LoginPage() {
  // `signIn` takes the same object shape as the auth service, so a valid pair
  // writes the session in the AuthProvider and the shared header immediately
  // switches to its signed-in state ("Sign out" button).
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Purely presentational: whether the password field is masked or readable.
  // Toggling it never touches the typed value, the form state or the request.
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef<HTMLParagraphElement | null>(null);

  // Move focus to the error so keyboard and screen-reader users hear why the
  // attempt failed instead of silently staying on the submit button.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    // Read the credentials straight from the submitted form. Taking them from
    // the DOM keeps the attempt correct even if a keystroke landed before
    // React attached its change listener (state would otherwise lag behind the
    // visible fields and the form would be submitted empty).
    const data = new FormData(event.currentTarget);
    const emailValue = String(data.get("email") ?? "").trim();
    const passwordValue = String(data.get("password") ?? "");

    // Mirror the submitted email into state so the field stays controlled, and
    // drop the secret from the field immediately — it must never linger on
    // screen while the request is in flight or after a rejection.
    setEmail(emailValue);
    setPassword("");
    setPasswordVisible(false);

    if (!emailValue || !passwordValue) {
      setError("Enter your email and password to sign in.");
      return;
    }

    setSubmitting(true);
    try {
      // Real sign-in against the browser account store (or the connected
      // backend for a platform-supplied account). A rejected pair throws an
      // AuthError carrying the friendly invalid-credential copy handled below,
      // and no session is written, so the header stays in its visitor state.
      const signedIn = await signIn({ email: emailValue, password: passwordValue });
      setError(null);

      // An account validated by the connected backend lands on its dashboard;
      // an account kept in this browser stays here so the signed-in panel
      // confirms who is now signed in (and the header shows "Sign out").
      if (signedIn.backendAccount && typeof window !== "undefined") {
        try {
          await navigate({ to: "/dashboard" });
        } catch {
          /* fall through to the hard navigation below */
        }
        if (!window.location.pathname.replace(/\/+$/, "").endsWith("/dashboard")) {
          window.location.assign("/dashboard");
        }
      }
    } catch (err) {
      setError(toDisplayMessage(err));
    } finally {
      // Belt and braces: the secret never lingers in the field.
      setPassword("");
      setPasswordVisible(false);
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to follow verified bills and see how your naira is spent.
      </p>

      {/* Only shown once the persisted session has been read, so the page does
          not flash a signed-in card for a visitor. */}
      {!loading && user ? (
        <div
          data-testid="signin-success"
          className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
        >
          <p>
            You are already signed in as{" "}
            <span data-testid="signed-in-email" className="font-medium text-foreground">
              {user.email}
            </span>
            .
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to="/dashboard"
              data-testid="signin-dashboard"
              className="font-semibold text-primary hover:underline"
            >
              Dashboard
            </Link>
            <span>or use the "Sign out" button in the header to switch accounts.</span>
          </p>
        </div>
      ) : null}

      <form
        data-testid="signin-form"
        aria-label="Sign in"
        onSubmit={handleSubmit}
        className="mt-8 space-y-4"
        noValidate
      >
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            data-testid="login-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          {/* The input and its reveal toggle share one relative wrapper so the
              button sits inside the field's right edge on every breakpoint. */}
          <div className="relative">
            <input
              id="password"
              name="password"
              // Only the visible mask changes; the controlled value is kept, so
              // revealing and re-hiding never loses typed characters.
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              data-testid="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-32`}
              placeholder="Your password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
            <PasswordVisibilityToggle
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((current) => !current)}
              controls="password"
            />
          </div>
        </div>

        {/* The rejected-attempt copy is stated once on the page: as a quiet
            security note before an attempt, and as the alert afterwards (the
            note is swapped out, so the sentence never appears twice). */}
        {error ? (
          <p
            id="login-error"
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            data-testid="signin-error"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive outline-none"
          >
            {error}
          </p>
        ) : (
          <p
            id="login-error-help"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground"
          >
            Security note: a rejected attempt always shows "{INVALID_CREDENTIALS_MESSAGE}", so this
            page never reveals whether an email is registered. Once you are signed in, the shared
            header replaces these doorways with a Dashboard link and a "Sign out" button.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          data-testid="login-submit"
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          Already set up?{" "}
          <Link to="/dashboard" className="font-semibold text-primary hover:underline">
            Open your Dashboard
          </Link>
        </p>
      </div>
    </section>
  );
}
