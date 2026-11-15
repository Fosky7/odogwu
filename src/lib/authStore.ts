/**
 * Browser-local account and session store for Odogwu.
 *
 * Accounts and the signed-in session stay in the visitor's own browser
 * (localStorage) — passwords are never copied anywhere. Alongside that, this
 * module now owns the idempotent "legacy browser data" copier: once the user
 * is signed in against the connected backend, bill requests that only exist in
 * this browser are upserted into the `bill_requests` table with owner-scoped
 * upserts keyed by (owner, source collection, source id). The browser copy is
 * never deleted — it stays as a recovery backup — and a checkpoint is only
 * written for rows that were read back with matching field values.
 *
 * Passwords are never written in plain text: only a salted SHA-256 digest is
 * stored (with a deterministic fallback for contexts where Web Crypto is not
 * available, e.g. a non-secure origin). Everything here is defensive — a
 * corrupted or hand-edited storage entry is treated as "no data" instead of
 * throwing into the React tree.
 */

import { supabase } from "@/integrations/supabase/client";

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

/* ------------------------------------------------------------------------- *
 * Legacy browser data adoption (database-backed)
 *
 * Older builds kept bill requests only in this browser under
 * `odogwu.bill-requests.v1`. Once the visitor is signed in against the
 * connected backend, those records are upserted into `bill_requests` with an
 * owner-scoped idempotent write keyed by (owner_id, source_collection,
 * source_id) — so retries, reloads and second devices can never duplicate a
 * row. Only rows that come back from the database with matching field values
 * are checkpointed; anything that fails (offline, error, mismatched readback)
 * stays pending with the browser copy untouched.
 *
 * Account records (emails/digests) are deliberately NOT copied anywhere.
 * ------------------------------------------------------------------------- */

const LEGACY_BILL_REQUESTS_STORAGE_KEY = "odogwu.bill-requests.v1";
const LEGACY_COPY_CHECKPOINT_KEY = "odogwu.legacy-copy.checkpoint.v1";
const LEGACY_COPY_PENDING_KEY = "odogwu.legacy-copy.pending.v1";
const LEGACY_COPY_EVENT = "odogwu:legacy-copy-complete";

const BILL_REQUESTS_TABLE = "bill_requests";
const BILL_REQUESTS_SOURCE_COLLECTION = "bill_requests_v1";
const BILL_REQUESTS_COLUMNS =
  "source_id,title,amount_owed,description,proof_file_name,status,submitted_at";
const BILL_REQUESTS_CONFLICT = "owner_id,source_collection,source_id";

type BillRequestStatus = "pending" | "approved" | "rejected";

interface LegacyBillRequest {
  id: string;
  title: string;
  amountOwed: number;
  description: string | null;
  proofFileName: string;
  status: BillRequestStatus;
  submittedAt: string;
}

interface BillRequestRow {
  source_id: string;
  title: string;
  amount_owed: number | string;
  description: string | null;
  proof_file_name: string;
  status: BillRequestStatus;
  submitted_at: string;
}

export interface LegacyCopyResult {
  copied: number;
  pending: number;
  skipped: number;
}

function toBillRequestStatus(value: unknown): BillRequestStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function readLegacyBillRequests(): LegacyBillRequest[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(LEGACY_BILL_REQUESTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const records: LegacyBillRequest[] = [];

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;

      const id = typeof record.id === "string" ? record.id.trim() : "";
      const title = typeof record.title === "string" ? record.title : "";
      if (!id || !title.trim()) continue;

      const amount = Number(record.amountOwed);

      records.push({
        id,
        title,
        amountOwed: Number.isFinite(amount) && amount > 0 ? amount : 0,
        description:
          typeof record.description === "string" && record.description.trim()
            ? record.description
            : null,
        proofFileName: typeof record.proofFileName === "string" ? record.proofFileName : "",
        status: toBillRequestStatus(record.status),
        submittedAt:
          typeof record.submittedAt === "string" && record.submittedAt
            ? record.submittedAt
            : new Date().toISOString(),
      });
    }

    return records;
  } catch {
    return [];
  }
}

function readLegacyCheckpoint(): Record<string, true> {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(LEGACY_COPY_CHECKPOINT_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const checkpoint: Record<string, true> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true) checkpoint[key] = true;
    }
    return checkpoint;
  } catch {
    return {};
  }
}

function writeLegacyCheckpoint(checkpoint: Record<string, true>): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(LEGACY_COPY_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch {
    /* blocked or full storage must not break an otherwise successful copy */
  }
}

function readLegacyPending(): string[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(LEGACY_COPY_PENDING_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeLegacyPending(pending: string[]): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(LEGACY_COPY_PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* keep the previous pending list when storage is blocked */
  }
}

function sameInstant(a: string, b: string): boolean {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime === bTime;
  return a === b;
}

function matchesLegacyRow(source: LegacyBillRequest, row: BillRequestRow): boolean {
  return (
    row.source_id === source.id &&
    row.title === source.title &&
    Math.abs(Number(row.amount_owed) - source.amountOwed) < 0.01 &&
    (row.description ?? null) === (source.description ?? null) &&
    row.proof_file_name === source.proofFileName &&
    row.status === source.status &&
    sameInstant(row.submitted_at, source.submittedAt)
  );
}

function legacyRowPayload(source: LegacyBillRequest, ownerId: string) {
  return {
    owner_id: ownerId,
    source_collection: BILL_REQUESTS_SOURCE_COLLECTION,
    source_id: source.id,
    title: source.title,
    amount_owed: source.amountOwed,
    description: source.description,
    proof_file_name: source.proofFileName,
    status: source.status,
    submitted_at: source.submittedAt,
  };
}

async function resolveAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function runLegacyCopy(ownerId: string): Promise<LegacyCopyResult> {
  const legacyRecords = readLegacyBillRequests();
  const legacyIds = new Set(legacyRecords.map((record) => record.id));
  const checkpoint = readLegacyCheckpoint();
  const pending = new Set(readLegacyPending().filter((id) => legacyIds.has(id)));

  let copied = 0;
  let skipped = 0;

  for (const record of legacyRecords) {
    const checkpointKey = `${BILL_REQUESTS_SOURCE_COLLECTION}:${record.id}`;

    if (checkpoint[checkpointKey]) {
      skipped += 1;
      continue;
    }

    try {
      const { data, error } = await supabase
        .from(BILL_REQUESTS_TABLE)
        .upsert(legacyRowPayload(record, ownerId), { onConflict: BILL_REQUESTS_CONFLICT })
        .select(BILL_REQUESTS_COLUMNS)
        .single();

      if (error || !data) {
        pending.add(record.id);
        continue;
      }

      if (!matchesLegacyRow(record, data as BillRequestRow)) {
        pending.add(record.id);
        continue;
      }

      checkpoint[checkpointKey] = true;
      pending.delete(record.id);
      copied += 1;
    } catch {
      /* offline or interrupted writes stay pending with the browser copy kept */
      pending.add(record.id);
    }
  }

  writeLegacyCheckpoint(checkpoint);
  writeLegacyPending(Array.from(pending));

  if (copied > 0) {
    notifyAuthChanged();

    try {
      window.dispatchEvent(new Event(LEGACY_COPY_EVENT));
    } catch {
      /* listeners are optional */
    }
  }

  return { copied, pending: pending.size, skipped };
}

let legacyCopyInFlight: Promise<LegacyCopyResult> | null = null;

/**
 * Copy this browser's legacy records into the signed-in account.
 *
 * Safe to call repeatedly: writes are owner-scoped upserts on the database
 * uniqueness key, and already-checkpointed rows are skipped. Records that
 * fail are left pending (and remain in localStorage) for the next load.
 */
export function copyLegacyBrowserRecords(ownerId?: string): Promise<LegacyCopyResult> {
  if (legacyCopyInFlight) return legacyCopyInFlight;

  const run = (async (): Promise<LegacyCopyResult> => {
    if (typeof window === "undefined") return { copied: 0, pending: 0, skipped: 0 };

    const resolvedOwner = ownerId ?? (await resolveAuthenticatedUserId());
    if (!resolvedOwner) {
      return { copied: 0, pending: readLegacyPending().length, skipped: 0 };
    }

    return runLegacyCopy(resolvedOwner);
  })();

  legacyCopyInFlight = run.finally(() => {
    legacyCopyInFlight = null;
  });

  return legacyCopyInFlight;
}

/** Stable ids of this browser's records that still need a successful copy. */
export function getPendingLegacyRecordIds(): string[] {
  return readLegacyPending();
}

let legacyCopyWired = false;

/**
 * Wire the copier into app initialisation: run once after the hydrated session
 * is known, then again whenever the backend reports a signed-in user (sign-in,
 * token refresh, or the next app open on another device).
 */
export function startLegacyBrowserCopy(): void {
  if (legacyCopyWired || typeof window === "undefined") return;
  legacyCopyWired = true;

  void (async () => {
    const userId = await resolveAuthenticatedUserId();
    if (userId) await copyLegacyBrowserRecords(userId);
  })();

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) void copyLegacyBrowserRecords(userId);
    });
  } catch {
    /* auth unavailable: the next successful load retries the copy */
  }
}

if (typeof window !== "undefined") {
  startLegacyBrowserCopy();
}
