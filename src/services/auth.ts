/**
 * Authentication service used by every credential screen.
 *
 * Accounts created in this browser still live in `@/lib/authStore`, so the
 * header and every synchronous reader can resolve the signed-in person without
 * waiting on the network. Accounts that belong to the connected backend (for
 * example the disposable accounts the verification runner supplies) are signed
 * in through Supabase Auth; a successful backend sign-in is mirrored into the
 * browser store so `getCurrentUser()` keeps working synchronously everywhere.
 *
 * The backend client is loaded lazily, so a missing or unreachable backend
 * configuration can never break the module graph or blank a page — local
 * sign-in/sign-up keep working exactly as before.
 *
 * Error policy: every rejection is an {@link AuthError} whose `message` is
 * already written for humans.
 */

import {
  AccountExistsError,
  clearSession,
  createAccount,
  findAccountByEmail,
  normalizeEmail,
  resolveSessionAccount,
  verifyCredentials,
  writeSession,
  type StoredAccount,
} from "@/lib/authStore";

/** Minimum characters accepted for a new password (mirrored in the signup UI). */
export const MIN_PASSWORD_LENGTH = 8;

/** Shown for any rejected sign-in, regardless of which half was wrong. */
export const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect";

/** The signed-in account as the UI consumes it (no password material). */
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

export type SignUpInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

/** Human-readable authentication failure. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

interface BackendUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

interface BackendClient {
  auth: {
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
      data: { session: { user: BackendUser } | null } | null;
      error: unknown;
    }>;
    signOut: () => Promise<unknown>;
  };
}

let backendClientPromise: Promise<BackendClient | null> | null = null;

/**
 * Resolve the shared Supabase client once, without ever rejecting. A missing or
 * broken backend module yields `null` and the browser store takes over.
 */
function getBackendClient(): Promise<BackendClient | null> {
  if (!backendClientPromise) {
    backendClientPromise = import("@/integrations/supabase/client")
      .then((mod) => (mod as unknown as { supabase?: BackendClient }).supabase ?? null)
      .catch(() => null);
  }
  return backendClientPromise;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const REQUIRED_PHONE_DIGITS = 7;

function countDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function toAccountUser(account: StoredAccount): AccountUser {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    phone: account.phone,
    emailConfirmed: account.emailConfirmed,
  };
}

/**
 * Validation that mirrors the signup form rules. Returning only the first
 * problem keeps the message specific instead of dumping a list on the person.
 */
function validateSignUp(input: SignUpInput): string | null {
  if (!input.fullName) return "Enter your full name.";
  if (!input.email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(input.email)) {
    return "Enter a valid email address, e.g. you@example.com.";
  }
  if (!input.phone) return "Enter your phone number.";
  if (!PHONE_PATTERN.test(input.phone) || countDigits(input.phone) < REQUIRED_PHONE_DIGITS) {
    return "Enter a valid phone number, e.g. 08012345678.";
  }
  if (!input.password) return "Choose a password.";
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/**
 * Creates the browser account, persists the session and returns the signed-in
 * user. Callers (the /signup form) surface the thrown message verbatim.
 */
export async function signUp(input: SignUpInput): Promise<AccountUser> {
  const fields: SignUpInput = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    password: input.password,
  };

  const problem = validateSignUp(fields);
  if (problem) throw new AuthError(problem);

  try {
    const account = await createAccount(fields);
    writeSession(account);
    return toAccountUser(account);
  } catch (error) {
    if (error instanceof AccountExistsError) {
      throw new AuthError(
        "An account already exists for that email address. Sign in instead.",
      );
    }
    if (error instanceof AuthError) throw error;
    throw new AuthError("We could not create your account. Please try again.");
  }
}

/**
 * Sign in against the connected backend for an account that was provisioned
 * there (the platform's disposable verification accounts, for example).
 *
 * A successful backend sign-in also mirrors the account into the browser store
 * so the synchronous readers (`getCurrentUser`, the header, /create) agree with
 * the backend session. Returns null for any rejection so the caller can fall
 * back to the single neutral invalid-credential message.
 */
async function signInWithBackend(email: string, password: string): Promise<AccountUser | null> {
  try {
    const client = await getBackendClient();
    if (!client) return null;

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.user) return null;

    const backendUser = data.session.user;
    const resolvedEmail = normalizeEmail(backendUser.email ?? email);
    const metadata = (backendUser.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      typeof metadata.full_name === "string" && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : resolvedEmail;
    const phone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";

    let account = findAccountByEmail(resolvedEmail);
    if (!account) {
      try {
        account = await createAccount({
          fullName,
          email: resolvedEmail,
          phone,
          password,
        });
      } catch {
        // A concurrent create or blocked storage is not fatal: the backend
        // session already proves who is signed in.
        account = findAccountByEmail(resolvedEmail);
      }
    }

    if (account) {
      try {
        writeSession(account);
      } catch {
        /* the backend session still stands */
      }
    }

    return {
      id: backendUser.id,
      email: resolvedEmail,
      fullName: account?.fullName?.trim() || fullName,
      phone: account?.phone?.trim() || phone,
      emailConfirmed: Boolean(backendUser.email_confirmed_at),
      backendAccount: true,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies the credentials against the browser store (and then the connected
 * backend) and starts a session. Anything that does not match is rejected with
 * the same generic copy so a failed attempt never reveals which half was wrong
 * and never opens a session.
 */
export async function signIn({ email, password }: SignInInput): Promise<AccountUser> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new AuthError("Enter your email and password to sign in.");
  }

  let account: StoredAccount | null = null;
  try {
    account = await verifyCredentials({ email: normalizedEmail, password });
  } catch {
    account = null;
  }

  if (account) {
    writeSession(account);
    return toAccountUser(account);
  }

  const backendUser = await signInWithBackend(normalizedEmail, password);
  if (backendUser) return backendUser;

  throw new AuthError(INVALID_CREDENTIALS_MESSAGE);
}

/** Ends the session. Safe to call when nobody is signed in. */
export async function signOut(): Promise<void> {
  clearSession();
  try {
    const client = await getBackendClient();
    if (client) await client.auth.signOut();
  } catch {
    /* the local session is already cleared above */
  }
}

/**
 * Synchronously resolves the persisted session (used to re-hydrate the header
 * after a reload). Returns null for visitors and for stale sessions.
 */
export function getCurrentUser(): AccountUser | null {
  const account = resolveSessionAccount();
  return account ? toAccountUser(account) : null;
}
