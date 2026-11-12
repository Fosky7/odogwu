/**
 * Browser-local account and session store for Odogwu.
 *
 * This project ships without a server database, so accounts live in the
 * visitor's own browser (localStorage). That keeps sign-up, sign-in and the
 * "session survives a reload" behaviour working against real persisted data
 * without a backend client.
 *
 * Passwords are never written in plain text: only a salted SHA-256 digest is
 * stored (with a deterministic fallback for contexts where Web Crypto is not
 * available, e.g. a non-secure origin). Everything here is defensive — a
 * corrupted or hand-edited storage entry is treated as "no data" instead of
 * throwing into the React tree.
 */

export type StoredAccount = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  /** Salted digest of the password — never the password itself. */
  passwordDigest: string;
  emailConfirmed: boolean;
  createdAt: string;
};

export type StoredSession = {
  accountId: string;
  email: string;
  issuedAt: string;
};

export type NewAccountInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type CredentialsInput = {
  email: string;
  password: string;
};

/** Storage keys are versioned so a future shape change can migrate cleanly. */
export const ACCOUNTS_STORAGE_KEY = "odogwu.auth.accounts.v1";
export const SESSION_STORAGE_KEY = "odogwu.auth.session.v1";

/**
 * Fired on `window` whenever the accounts or the session change, so the
 * AuthProvider can re-read state after a write from anywhere in the app.
 */
export const AUTH_CHANGE_EVENT = "odogwu:auth-changed";

/** Thrown when a sign-up targets an email that already has an account. */
export class AccountExistsError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}.`);
    this.name = "AccountExistsError";
  }
}

/** Lower-cased, trimmed form used for every lookup so casing never matters. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * localStorage is unavailable during server rendering and in privacy modes, so
 * every access goes through this guard and callers degrade to "no data".
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    const probeKey = "__odogwu_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // A missing dispatcher must never break a completed write.
  }
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredAccount>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.fullName === "string" &&
    typeof candidate.phone === "string" &&
    typeof candidate.passwordDigest === "string" &&
    typeof candidate.emailConfirmed === "boolean" &&
    typeof candidate.createdAt === "string"
  );
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredSession>;

  return (
    typeof candidate.accountId === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.issuedAt === "string"
  );
}

function readAccounts(): StoredAccount[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(ACCOUNTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredAccount);
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  notifyAuthChanged();
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // randomUUID needs a secure context — fall back to a random id below.
    }
  }

  return `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deterministic, non-reversible digest used only when Web Crypto is missing.
 * FNV-1a over four seeded passes gives a 32-character hex string.
 */
function fallbackDigest(value: string): string {
  let result = "";

  for (let round = 0; round < 4; round += 1) {
    let hash = (0x811c9dc5 ^ Math.imul(round, 0x01000193)) >>> 0;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    result += hash.toString(16).padStart(8, "0");
  }

  return result;
}

/** Salted password digest; the email is the salt so identical passwords differ. */
export async function digestPassword(email: string, password: string): Promise<string> {
  const material = `${normalizeEmail(email)}:${password}`;
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;

  if (subtle && typeof subtle.digest === "function") {
    try {
      const bytes = new TextEncoder().encode(material);
      const hash = await subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fall through to the deterministic digest.
    }
  }

  return fallbackDigest(material);
}

/** Persist a brand new account. Throws {@link AccountExistsError} on duplicates. */
export async function createAccount(input: NewAccountInput): Promise<StoredAccount> {
  const email = normalizeEmail(input.email);
  const accounts = readAccounts();

  if (accounts.some((account) => account.email === email)) {
    throw new AccountExistsError(email);
  }

  const account: StoredAccount = {
    id: createId(),
    email,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    passwordDigest: await digestPassword(email, input.password),
    emailConfirmed: false,
    createdAt: new Date().toISOString(),
  };

  writeAccounts([...accounts, account]);
  return account;
}

/** Returns the matching account, or null when the pair is wrong/unknown. */
export async function verifyCredentials({
  email,
  password,
}: CredentialsInput): Promise<StoredAccount | null> {
  const normalizedEmail = normalizeEmail(email);
  const account = readAccounts().find((candidate) => candidate.email === normalizedEmail);

  if (!account) return null;

  const digest = await digestPassword(normalizedEmail, password);
  return digest === account.passwordDigest ? account : null;
}

export function findAccountByEmail(email: string): StoredAccount | null {
  const normalizedEmail = normalizeEmail(email);
  return readAccounts().find((candidate) => candidate.email === normalizedEmail) ?? null;
}

export function findAccountById(id: string): StoredAccount | null {
  return readAccounts().find((candidate) => candidate.id === id) ?? null;
}

/** Store the signed-in session so it survives a full page reload. */
export function writeSession(account: StoredAccount): StoredSession {
  const session: StoredSession = {
    accountId: account.id,
    email: account.email,
    issuedAt: new Date().toISOString(),
  };

  const storage = getStorage();
  if (storage) {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  notifyAuthChanged();
  return session;
}

export function readSession(): StoredSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(SESSION_STORAGE_KEY);
  }

  notifyAuthChanged();
}

/**
 * Reads the session and resolves the account behind it. A session whose
 * account no longer exists (storage wiped, different browser profile) is
 * discarded instead of leaving a half signed-in header behind.
 */
export function resolveSessionAccount(): StoredAccount | null {
  const session = readSession();
  if (!session) return null;

  const account = findAccountById(session.accountId);
  if (!account) {
    clearSession();
    return null;
  }

  return account;
}
