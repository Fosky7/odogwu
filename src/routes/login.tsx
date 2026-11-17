import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";
import { INVALID_EMAIL_MESSAGE, isValidEmail, signIn } from "@/services/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

/** Small text button inside the password field; its label is its accessible name. */
const revealButtonClass =
  "absolute inset-y-0 right-1 my-auto h-7 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60";

/** Right padding so typed characters never slide under the reveal button. */
const passwordInputClass = `${inputClass} pr-28`;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Sign in to your Odogwu account to follow your pledges, receipts and the bills you fund.",
      },
    ],
  }),
  component: LoginPage,
});

/**
 * Sign-in page.
 *
 * The form authenticates against the connected backend, and the "Forgot
 * password?" link sits directly below the Password field so somebody who
 * cannot remember their password has an obvious way forward. The typed
 * address travels with that link as `?email=`, and /forgot-password prefills
 * it so nobody has to type the same address twice.
 */
function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carry whatever has been typed so the reset page opens already filled in.
  // A plain anchor is used on purpose: the address lives in the query string,
  // so the destination renders with it even before this component re-renders.
  const trimmedEmail = email.trim().toLowerCase();
  const forgotHref = trimmedEmail
    ? `/forgot-password?email=${encodeURIComponent(trimmedEmail)}`
    : "/forgot-password";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    // Read the submitted values from the form so an autofill or a keystroke
    // that landed before React's listener is never treated as an empty form.
    const data = new FormData(event.currentTarget);
    const submittedEmail = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const submittedPassword = String(data.get("password") ?? "");
    setEmail(submittedEmail);
    setPassword(submittedPassword);

    if (!isValidEmail(submittedEmail)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    if (!submittedPassword) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: submittedEmail, password: submittedPassword });
      // The password is no longer needed once the session exists.
      setPassword("");
      setShowPassword(false);

      try {
        await navigate({ to: "/dashboard" });
      } catch {
        /* fall through to the hard navigation below */
      }
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.replace(/\/+$/, "").endsWith("/dashboard")
      ) {
        window.location.assign("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We could not sign you in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back. Sign in to follow your pledges, receipts and every bill you
        are funding.
      </p>

      {user ? (
        <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          You are already signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>.{" "}
          <Link to="/dashboard" className="font-semibold text-primary hover:underline">
            Go to your dashboard
          </Link>{" "}
          or sign out from the header to use another account.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            data-testid="login-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              data-testid="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              className={passwordInputClass}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              data-testid="login-password-toggle"
              aria-controls="login-password"
              aria-pressed={showPassword}
              disabled={submitting}
              className={revealButtonClass}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>

          {/* Recovery entry point: directly below the Password field. */}
          <div className="mt-2 flex justify-end">
            <a
              href={forgotHref}
              data-testid="login-forgot-password"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          data-testid="login-submit"
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in\u2026" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        New to Odogwu?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
