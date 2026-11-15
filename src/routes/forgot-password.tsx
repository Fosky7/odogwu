import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import {
  INVALID_EMAIL_MESSAGE,
  PASSWORD_RESET_CONFIRMATION,
  isValidEmail,
  requestPasswordReset,
} from "@/services/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

/**
 * Route shell for the password-reset request page.
 *
 * TanStack Router registers this file automatically (the route tree is
 * generated from src/routes/*), so a direct visit to /forgot-password renders
 * this component without any manual wiring in __root.tsx.
 */
export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Request a password reset link for your Odogwu account and set a new password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

/**
 * Forgot-password page.
 *
 * The form only ever asks the connected backend to send a reset link, then
 * shows the same neutral confirmation for every address. That keeps the page
 * useful for real donors without turning it into a way to find out who has an
 * Odogwu account.
 */
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Holds the address a link was sent to; null means nothing sent yet.
  const [sentTo, setSentTo] = useState<string | null>(null);

  // The sign-in page hands the typed address over as ?email=... so nobody has
  // to retype it. Read after mount because the server render has no window.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const carried = new URLSearchParams(window.location.search).get("email");
    const trimmed = String(carried ?? "").trim();
    if (trimmed) {
      setEmail((current) => (current ? current : trimmed));
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    // Read the submitted value from the form itself so an autofill or a
    // keystroke that beat React's listener is never mistaken for an empty form.
    const data = new FormData(event.currentTarget);
    const submitted = String(data.get("email") ?? "").trim();
    setEmail(submitted);

    if (!isValidEmail(submitted)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }

    setSubmitting(true);
    setSentTo(null);
    try {
      const result = await requestPasswordReset(submitted);
      // Neutral on purpose: the same confirmation for known and unknown mailboxes.
      setSentTo(result.email);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We could not send the reset link. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the email address on your Odogwu account and we will send you a link to
        set a new password.
      </p>

      {sentTo ? (
        <>
          <div
            data-testid="forgot-confirmation"
            role="status"
            className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
          >
            {PASSWORD_RESET_CONFIRMATION}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            If <span className="font-medium text-foreground">{sentTo}</span> has an Odogwu
            account, the link is on its way. It can only be used once and expires within
            the hour.
          </p>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className={labelClass}>
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            data-testid="forgot-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder="you@example.com"
          />
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
          data-testid="forgot-submit"
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}

export default ForgotPasswordPage;
