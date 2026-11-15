import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { MIN_PASSWORD_LENGTH, getSession, resetPassword } from "@/services/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

/**
 * Small text button that sits inside the password field. Its visible label is
 * also the accessible name, so screen readers announce "Show password" /
 * "Hide password" without needing an extra aria-label.
 */
const revealButtonClass =
  "absolute inset-y-0 right-1 my-auto h-7 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60";

/** Right padding so typed characters never slide under the reveal button. */
const passwordInputClass = `${inputClass} pr-28`;

/** Shown only after the backend has really accepted the new password. */
const PASSWORD_UPDATED_MESSAGE = "Password updated. You can now sign in.";

/**
 * Shown when there is no recovery session on this device. A reset link can only
 * be used once and expires within the hour, so an old or already-used link has
 * to be replaced instead of silently doing nothing.
 */
const EXPIRED_LINK_MESSAGE =
  "This reset link is invalid or has expired. Request a new link to continue.";

const GENERIC_FAILURE_MESSAGE =
  "We could not update your password. Please request a new link and try again.";

/**
 * Route shell for the "set a new password" page.
 *
 * The route tree is generated from src/routes/*, so a signed-out visitor who
 * opens /reset-password directly gets this component with no extra wiring in
 * __root.tsx.
 */
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Choose a new password for your Odogwu account after following the reset link we emailed you.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

/**
 * Reset-password page.
 *
 * The reset email sent from /forgot-password lands people here with a recovery
 * link, and the Supabase client turns that link into a short-lived session on
 * this device. The form checks the new password locally first, then hands it to
 * the connected backend, so the account's real password changes and the person
 * can sign in with it straight away.
 */
function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Each field reveals independently so the repeat entry can be checked
  // without exposing the original at the same time.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    // Read what was actually submitted from the form itself. An autofill, or a
    // keystroke that lands before React attaches its listener, would otherwise
    // leave component state behind the visible fields.
    const data = new FormData(event.currentTarget);
    const submitted = String(data.get("password") ?? "");
    const submittedConfirm = String(data.get("confirmPassword") ?? "");
    setPassword(submitted);
    setConfirmPassword(submittedConfirm);

    // Inline rules run before anything leaves the browser, so an invalid entry
    // never reaches the backend.
    if (!submitted) {
      setError("Choose a new password.");
      return;
    }
    if (submitted.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!submittedConfirm) {
      setError("Repeat your new password.");
      return;
    }
    if (submitted !== submittedConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setUpdated(false);
    try {
      // The recovery link creates a short-lived session on this device. Without
      // one the backend cannot know whose password to change, so say that
      // plainly rather than pretending the update happened.
      const session = await getSession();
      if (!session) {
        setError(EXPIRED_LINK_MESSAGE);
        return;
      }

      await resetPassword(submitted);

      // Only a real backend confirmation reaches this point.
      setUpdated(true);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      // Service errors are already written for people; fall back to generic
      // copy only for something unexpected.
      setError(
        err instanceof Error && err.message ? err.message : GENERIC_FAILURE_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a new password for your Odogwu account. You can sign in with it as soon
        as it is saved.
      </p>

      {updated ? (
        <div
          data-testid="reset-password-success"
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
        >
          {PASSWORD_UPDATED_MESSAGE}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="reset-password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              name="password"
              // Masked by default; the toggle beside it flips only this field.
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              data-testid="reset-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              aria-describedby="reset-password-rules"
              className={passwordInputClass}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              data-testid="reset-password-toggle"
              aria-controls="reset-password"
              aria-pressed={showPassword}
              disabled={submitting}
              className={revealButtonClass}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          <ul
            id="reset-password-rules"
            className="mt-1 space-y-0.5 text-xs text-muted-foreground"
          >
            <li>{`At least ${MIN_PASSWORD_LENGTH} characters.`}</li>
            <li>Repeat it in the second field so a typo cannot lock you out.</li>
          </ul>
        </div>

        <div>
          <label htmlFor="reset-confirm-password" className={labelClass}>
            Confirm password
          </label>
          <div className="relative">
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              // Independent from the field above, so the repeat entry can be
              // checked without revealing the original password.
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              data-testid="reset-confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting}
              className={passwordInputClass}
              placeholder="Repeat your new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              data-testid="reset-confirm-password-toggle"
              aria-controls="reset-confirm-password"
              aria-pressed={showConfirmPassword}
              disabled={submitting}
              className={revealButtonClass}
            >
              {showConfirmPassword ? "Hide password" : "Show password"}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            data-testid="reset-password-error"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          data-testid="reset-password-submit"
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Updating password..." : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Link already used or expired?{" "}
        <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
          Request a new link
        </Link>
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}

export default ResetPasswordPage;
