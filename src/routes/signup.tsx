import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";
import { MIN_PASSWORD_LENGTH } from "@/services/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

/**
 * Small text button that sits inside the password field. The visible label is
 * also the accessible name, so screen readers announce "Show password" /
 * "Hide password" without needing an extra aria-label.
 */
const revealButtonClass =
  "absolute inset-y-0 right-1 my-auto h-7 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60";

/** Right padding so typed characters never slide under the reveal button. */
const passwordInputClass = `${inputClass} pr-28`;

/** Digits plus the separators people commonly type for phone numbers. */
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum digits a Nigerian-style phone number must contain. */
const REQUIRED_PHONE_DIGITS = 7;

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function countDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

type SignUpFields = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

/**
 * Client-side checks that mirror the service rules. Returning only the first
 * problem keeps the message specific instead of dumping a list on the person.
 */
function validateSignUpForm({
  fullName,
  email,
  phone,
  password,
  confirmPassword,
}: SignUpFields): string | null {
  if (!fullName) return "Enter your full name.";
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address, e.g. you@example.com.";
  if (!phone) return "Enter your phone number.";
  if (!PHONE_PATTERN.test(phone) || countDigits(phone) < REQUIRED_PHONE_DIGITS) {
    return "Enter a valid phone number, e.g. 08012345678.";
  }
  if (!password) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  // The confirmation is optional; when somebody fills it in, it has to match.
  if (confirmPassword && confirmPassword !== password) {
    return "Passwords do not match.";
  }
  return null;
}

function SignUpPage() {
  const { signUp, user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Each password field reveals independently, so somebody can confirm the
  // repeat entry without exposing the original at the same time.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  // The name shown in the signed-in welcome heading. Falls back to the email
  // address when the person somehow signed up without a name.
  const displayName = fullName.trim() || email.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    // Read what was actually submitted from the form itself. A keystroke that
    // lands before React attaches its listener would otherwise leave component
    // state behind the visible fields, and the form would be rejected as empty.
    const data = new FormData(event.currentTarget);
    const submitted = {
      fullName: String(data.get("fullName") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    // Keep the controlled fields (and the phone preview) in step with what was
    // sent, so the confirmation names the account that really exists.
    setFullName(submitted.fullName);
    setEmail(submitted.email);
    setPhone(submitted.phone);
    setPassword(submitted.password);
    setConfirmPassword(submitted.confirmPassword);

    const fields: SignUpFields = {
      fullName: submitted.fullName,
      email: submitted.email.toLowerCase(),
      phone: submitted.phone,
      password: submitted.password,
      confirmPassword: submitted.confirmPassword,
    };

    const problem = validateSignUpForm(fields);
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      // The service stores the full name and phone number with the account, so
      // the profile survives reloads and shows on the dashboard.
      await signUp({
        fullName: fields.fullName,
        email: fields.email,
        phone: fields.phone,
        password: fields.password,
      });
      // The account now exists and the session is live, so the shared header
      // swaps its doorways for a "Sign out" button while this confirmation
      // welcomes the new account (it links on to the dashboard).
      setCreated(true);
      setPassword("");
      setConfirmPassword("");
      // Fields are cleared and masked again, so a leftover reveal state would
      // be meaningless for the fresh session.
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      // Service errors are already written for people; only fall back to
      // generic copy when something unexpected surfaces.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We could not create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      {created ? (
        <div
          data-testid="signup-success"
          role="status"
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
        >
          <h1
            data-testid="signup-welcome"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Welcome, {displayName}
          </h1>
          <p className="mt-2" data-testid="signup-status">
            Signed in as{" "}
            <span className="font-medium text-foreground">{email.trim().toLowerCase()}</span>. Open
            your dashboard to follow every pledge and receipt.{" "}
            <Link to="/dashboard" className="font-semibold text-primary hover:underline">
              Go to your dashboard
            </Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track verified bills, fund what matters and keep every receipt.
          </p>
        </>
      )}

      {user && !created ? (
        <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          You are signed in as <span className="font-medium text-foreground">{user.email}</span>.{" "}
          <Link to="/dashboard" className="font-semibold text-primary hover:underline">
            Go to your dashboard
          </Link>{" "}
          or sign out from the header to create another account.
        </p>
      ) : null}

      {created ? null : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="signup-name" className={labelClass}>
              Full name
            </label>
            <input
              id="signup-name"
              name="fullName"
              type="text"
              autoComplete="name"
              data-testid="signup-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={submitting}
              className={inputClass}
              placeholder="Chidi Okonkwo"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className={labelClass}>
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              data-testid="signup-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-phone" className={labelClass}>
              Phone number
            </label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              data-testid="signup-phone"
              // The value is kept exactly as typed (no formatting while typing),
              // so the person can see and correct their own digits.
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={submitting}
              aria-describedby="signup-phone-hint"
              className={inputClass}
              placeholder="08012345678"
            />
            {/* Echo of the number exactly as typed, so a dropped digit is obvious. */}
            {phone.trim() ? (
              <p
                data-testid="signup-phone-preview"
                className="mt-1 text-xs font-medium text-foreground"
              >
                {phone.trim()}
              </p>
            ) : null}
            <p id="signup-phone-hint" className="mt-1 text-xs text-muted-foreground">
              We use this number only for delivery updates on bills you fund.
            </p>
          </div>

          <div>
            <label htmlFor="signup-password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                // Masked by default; the toggle beside it flips only this field.
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                data-testid="signup-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                aria-describedby="signup-password-hint"
                className={passwordInputClass}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                data-testid="signup-password-toggle"
                aria-controls="signup-password"
                aria-pressed={showPassword}
                disabled={submitting}
                className={revealButtonClass}
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>
            <p id="signup-password-hint" className="mt-1 text-xs text-muted-foreground">
              {`At least ${MIN_PASSWORD_LENGTH} characters.`}
            </p>
          </div>

          <div>
            <label htmlFor="signup-confirm-password" className={labelClass}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                // Independent from the field above, so the repeat entry can be
                // checked without revealing the original password.
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                data-testid="signup-confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
                className={passwordInputClass}
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                data-testid="signup-confirm-password-toggle"
                aria-controls="signup-confirm-password"
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
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            data-testid="signup-submit"
            className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
