import { supabase } from "@/integrations/supabase/client";

/**
 * Auth service for Odogwu.
 *
 * Every call goes through the shared Supabase client (the connected backend),
 * so accounts, sessions and password-reset emails are real. Failures are
 * thrown as `AuthError` with copy that can be shown to a person directly.
 */

/** Shortest password the backend accepts when an account is created or reset. */
export const MIN_PASSWORD_LENGTH = 8;

/** Copy shown for any malformed or missing email address. */
export const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

/**
 * Neutral confirmation for a reset request. The same sentence is shown whether
 * or not an account exists for the address, so the form can never be used to
 * discover who has an Odogwu account.
 */
export const PASSWORD_RESET_CONFIRMATION = "Check your inbox for a password reset link.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Thrown for anything the person can fix (bad input) or retry (backend error). */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Trim and lower-case an address so `A@B.com` and `a@b.com` are one account. */
export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/** Client-side shape check; the backend still validates the address itself. */
export function isValidEmail(email: string | null | undefined): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

/** Pull a human-readable message out of anything a client can throw. */
function messageFrom(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message && error.message.trim()) {
    return error.message.trim();
  }
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

/**
 * Supabase deliberately answers the same way for an unknown address, but some
 * deployments still surface a "user not found" style error. Such an answer is
 * treated as accepted so the confirmation stays neutral.
 */
const UNKNOWN_ACCOUNT_HINTS = [
  "user not found",
  "no user found",
  "user does not exist",
  "not registered",
  "unable to find user",
];

function isUnknownAccountError(error: unknown): boolean {
  const text = messageFrom(error, "").toLowerCase();
  return UNKNOWN_ACCOUNT_HINTS.some((hint) => text.includes(hint));
}

/** Minimal structural shape of the account object the SDK returns. */
interface SupabaseUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Flattened account details the UI is allowed to read. */
export interface AuthUserSummary {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
}

function toUserSummary(
  user: SupabaseUserLike | null | undefined,
): AuthUserSummary | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.fullName === "string"
        ? meta.fullName
        : null;
  const phone = typeof meta.phone === "string" ? meta.phone : null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    phone,
  };
}

/** Where the confirmation email should land somebody after they sign up. */
function defaultSignUpRedirect(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  return origin ? `${origin}/dashboard` : undefined;
}

/** Where the password-reset email should land somebody. */
function defaultResetRedirect(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  return origin ? `${origin}/reset-password` : undefined;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface SignUpResult {
  user: AuthUserSummary | null;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
  /** True when the backend still wants the address confirmed by email. */
  needsEmailConfirmation: boolean;
}

/**
 * Create an account on the connected backend. The full name and phone number
 * travel as user metadata so they survive reloads and can be read by a
 * profile trigger on the database side.
 *
 * Accepts either `signUp({ email, password, fullName, phone })` or the
 * positional `signUp(email, password, fullName)` form.
 */
export async function signUp(
  paramsOrEmail: SignUpParams | string,
  maybePassword?: string,
  maybeFullName?: string,
): Promise<SignUpResult> {
  const params: SignUpParams =
    typeof paramsOrEmail === "string"
      ? {
          email: paramsOrEmail,
          password: maybePassword ?? "",
          fullName: maybeFullName,
        }
      : paramsOrEmail;

  const email = normalizeEmail(params.email);
  const password = String(params.password ?? "");
  const fullName = String(params.fullName ?? "").trim();
  const phone = String(params.phone ?? "").trim();

  if (!email) throw new AuthError("Enter your email address.");
  if (!isValidEmail(email)) throw new AuthError(INVALID_EMAIL_MESSAGE);
  if (!password) throw new AuthError("Choose a password.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const redirectTo = defaultSignUpRedirect();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
    },
  });

  if (error) {
    throw new AuthError(
      messageFrom(error, "We could not create your account. Please try again."),
    );
  }

  return {
    user: toUserSummary(data.user),
    session: data.session ?? null,
    needsEmailConfirmation: !data.session,
  };
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignInResult {
  user: AuthUserSummary | null;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
}

/**
 * Sign in with email and password. Accepts either
 * `signIn({ email, password })` or `signIn(email, password)`.
 */
export async function signIn(
  paramsOrEmail: SignInParams | string,
  maybePassword?: string,
): Promise<SignInResult> {
  const params: SignInParams =
    typeof paramsOrEmail === "string"
      ? { email: paramsOrEmail, password: maybePassword ?? "" }
      : paramsOrEmail;

  const email = normalizeEmail(params.email);
  const password = String(params.password ?? "");

  if (!email) throw new AuthError("Enter your email address.");
  if (!isValidEmail(email)) throw new AuthError(INVALID_EMAIL_MESSAGE);
  if (!password) throw new AuthError("Enter your password.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AuthError(messageFrom(error, "We could not sign you in. Please try again."));
  }

  return { user: toUserSummary(data.user), session: data.session ?? null };
}

/** Alias kept for callers that use the SDK's own wording. */
export const signInWithPassword = signIn;

/** Clear the stored session on this device. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthError(messageFrom(error, "We could not sign you out. Please try again."));
  }
}

/** Current session, or null when nobody is signed in. */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new AuthError(messageFrom(error, "We could not read your session."));
  }
  return data.session ?? null;
}

/** Current account read from the backend, or null when signed out. */
export async function getCurrentUser(): Promise<AuthUserSummary | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return toUserSummary(data.user);
}

export interface PasswordResetRequestResult {
  /** The backend accepted the request (or was treated as accepting it). */
  accepted: boolean;
  /** Neutral copy that is safe to display. */
  message: string;
  /** The normalised address the request was made for. */
  email: string;
}

/**
 * Ask the backend to email a password-reset link.
 *
 * The answer is always the neutral `PASSWORD_RESET_CONFIRMATION`, whether or
 * not the address belongs to an account. Genuine transport problems (rate
 * limits, offline, misconfiguration) are thrown so the person is not told to
 * check an inbox that will never receive anything.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<PasswordResetRequestResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new AuthError(INVALID_EMAIL_MESSAGE);

  const target = redirectTo ?? defaultResetRedirect();
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalized,
    target ? { redirectTo: target } : undefined,
  );

  if (error && !isUnknownAccountError(error)) {
    throw new AuthError(
      messageFrom(error, "We could not send the reset link. Please try again."),
    );
  }

  return {
    accepted: true,
    message: PASSWORD_RESET_CONFIRMATION,
    email: normalized,
  };
}

/** Aliases so any caller naming convention reaches the same real request. */
export const sendPasswordResetEmail = requestPasswordReset;
export const forgotPassword = requestPasswordReset;

/**
 * Set a new password for the account behind the current recovery session.
 * The recovery link the person clicked creates that session, so this updates
 * the real account rather than a local copy.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const password = String(newPassword ?? "");

  if (!password) throw new AuthError("Choose a new password.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new AuthError(
      messageFrom(error, "We could not update your password. Please request a new link."),
    );
  }
}

/** Alias used by the reset form. */
export const resetPassword = updatePassword;

// Kept: still used by other files.
export type AccountUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  emailConfirmed: boolean;
  /**
   * Kept for callers that distinguish a freshly validated session from a
   * browser-stored one. Local sign-in leaves it unset.
   */
  backendAccount?: boolean;
};

export type SignInInput = {
  email: string;
  password: string;
};

/** Human-readable authentication failure. */

export type SignUpInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect";

/** The signed-in account as the UI consumes it (no password material). */
