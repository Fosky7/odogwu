import { supabase } from "@/integrations/supabase/client";

export interface CauseProof {
  id: string;
  label: string;
  imageUrl: string;
  caption?: string;
  uploadedAt?: string;
}

export interface Cause {
  id: string;
  title: string;
  patientName: string;
  relationship: string;
  hospital: string;
  location: string;
  category: string;
  summary: string;
  story: string;
  whyThisBill: string;
  amountNeeded: number;
  amountRaised: number;
  donors: number;
  verified: boolean;
  coverImage: string;
  proof: CauseProof[];
  createdAt: string;
}

export interface CauseFunding {
  raised: number;
  target: number;
  remaining: number;
  percent: number;
  donors: number;
  isFullyFunded: boolean;
  formattedRaised: string;
  formattedTarget: string;
  formattedRemaining: string;
}

/**
 * Format an amount as Naira, e.g. 480000 -> "₦480,000".
 */
export function formatNaira(amount: number, options?: { withDecimals?: boolean }): string {
  const value = Number.isFinite(amount) ? Number(amount) : 0;
  const withDecimals = options?.withDecimals ?? false;
  const formatted = value.toLocaleString("en-NG", {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
  return `₦${formatted}`;
}

const CAUSES: Cause[] = [
  {
    id: "1",
    title: "Help Chinedu clear his hospital bill",
    patientName: "Chinedu Okeke",
    relationship: "Son of a widow who sells akara in Ajegunle",
    hospital: "St. Mary's General Hospital",
    location: "Ajegunle, Lagos",
    category: "Emergency care",
    summary:
      "Chinedu spent nine days on admission for severe malaria and typhoid. The bill is settled in full by 12 neighbours and strangers.",
    story:
      "Chinedu is nine years old and was admitted on a Tuesday night with a fever that had climbed past 40 degrees. His mother, Ngozi, stayed on the bench outside the children's ward for nine nights because she could not afford the ₦4,000 bed space. The hospital kept treating him anyway. When the final bill came, Ngozi had ₦3,200 in her purse and a receipt she could not read. We photographed the bill, verified it with the hospital records desk, and put it here.",
    whyThisBill:
      "This bill is the difference between a child going back to school next term and a family losing the small shop that feeds them. Every line item on the receipt is a real service that was already delivered — nothing here is an estimate or a future cost.",
    amountNeeded: 480000,
    amountRaised: 480000,
    donors: 12,
    verified: true,
    coverImage:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    proof: [
      {
        id: "1-proof-1",
        label: "Bill proof",
        imageUrl:
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
        caption:
          "St. Mary's General Hospital final bill — total ₦480,000, stamped by the records desk on 14 March.",
        uploadedAt: "2024-03-14",
      },
    ],
    createdAt: "2024-03-14",
  },
  {
    id: "2",
    title: "Cover Mama Blessing's dialysis week",
    patientName: "Blessing Adeyemi",
    relationship: "Grandmother of three",
    hospital: "Gbagada Renal Centre",
    location: "Gbagada, Lagos",
    category: "Chronic care",
    summary:
      "Three dialysis sessions a week keep Mama Blessing alive while she waits for a transplant slot. This bill covers one full week.",
    story:
      "Mama Blessing has been on dialysis since January. Her granddaughter Tola, a 200-level student, brings her in on the 6:20 bus every Monday, Wednesday and Friday. The centre has agreed to hold the next week of sessions while this bill is funded; after that, sessions get rescheduled.",
    whyThisBill:
      "Dialysis is not optional and it is not cheap. The receipt attached is for one week of sessions already scheduled, priced by the centre itself rather than by us.",
    amountNeeded: 210000,
    amountRaised: 84500,
    donors: 6,
    verified: true,
    coverImage:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    proof: [
      {
        id: "2-proof-1",
        label: "Bill proof",
        imageUrl:
          "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80",
        caption: "Gbagada Renal Centre invoice for three sessions — ₦210,000.",
        uploadedAt: "2024-04-02",
      },
    ],
    createdAt: "2024-04-02",
  },
  {
    id: "3",
    title: "Set Amina's broken arm at the teaching hospital",
    patientName: "Amina Bello",
    relationship: "Daughter of a Kano taxi driver",
    hospital: "Aminu Kano Teaching Hospital",
    location: "Kano",
    category: "Trauma",
    summary:
      "A fall from a danfo left Amina with a compound fracture. The cast, X-rays and two nights of observation are already done.",
    story:
      "Amina is fourteen and wants to be a nurse. The fracture was set on the night she arrived, and the X-ray films are attached to her file. Her father has paid the consultation fee; the surgical package is what remains.",
    whyThisBill:
      "Everything on this bill has been carried out already — the hospital will not release her file or schedule the follow-up review until it is cleared.",
    amountNeeded: 165000,
    amountRaised: 165000,
    donors: 9,
    verified: true,
    coverImage:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
    proof: [
      {
        id: "3-proof-1",
        label: "Bill proof",
        imageUrl:
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
        caption: "Aminu Kano Teaching Hospital surgical package receipt — ₦165,000.",
        uploadedAt: "2024-04-08",
      },
    ],
    createdAt: "2024-04-08",
  },
];

export function getCauses(): Cause[] {
  return CAUSES;
}

export function getCause(id: string | number | undefined | null): Cause | undefined {
  if (id === undefined || id === null) return undefined;
  const key = String(id);
  return CAUSES.find((cause) => cause.id === key);
}

export function getCauseFunding(cause: Cause): CauseFunding {
  const target = Math.max(0, cause.amountNeeded);
  const raised = Math.max(0, cause.amountRaised);
  const remaining = Math.max(0, target - raised);
  const percent = target === 0 ? 100 : Math.min(100, Math.round((raised / target) * 100));
  return {
    raised,
    target,
    remaining,
    percent,
    donors: cause.donors,
    isFullyFunded: remaining === 0 || raised >= target,
    formattedRaised: formatNaira(raised),
    formattedTarget: formatNaira(target),
    formattedRemaining: formatNaira(remaining),
  };
}

/* ------------------------------------------------------------------------- *
 * Bill requests (Supabase-backed)
 *
 * Requests are stored in the `bill_requests` table, owned by the signed-in
 * account. The exported API is unchanged: `getBillRequestsSnapshot()` still
 * returns a stable array for `useSyncExternalStore`, and `createBillRequest()`
 * still returns the stored record synchronously (optimistically) while the
 * authenticated upsert runs in the background.
 *
 * Existing records that live in this browser under
 * `odogwu.bill-requests.v1` are adopted once, after the user signs in, through
 * owner-scoped idempotent upserts keyed by (owner, source collection, source
 * id). The browser copy is never modified and serves as a recovery backup.
 * ------------------------------------------------------------------------- */

export type BillRequestStatus = "pending" | "approved" | "rejected";

export interface BillRequestRecord {
  id: string;
  title: string;
  amountOwed: number;
  description: string | null;
  proofFileName: string;
  status: BillRequestStatus;
  submittedAt: string;
}

export interface NewBillRequestInput {
  title: string;
  amountOwed: number;
  description?: string | null;
  proofFileName: string;
}

export const BILL_REQUESTS_STORAGE_KEY = "odogwu.bill-requests.v1";
export const BILL_REQUESTS_TABLE = "bill_requests";
export const BILL_REQUESTS_SOURCE_COLLECTION = "bill_requests_v1";

const LEGACY_MIGRATION_CHECKPOINT_KEY = "odogwu.bill-requests.adopted.v1";
const SIGN_IN_REQUIRED_MESSAGE = "Please sign in to submit a bill request";
const BILL_REQUEST_COLUMNS =
  "source_id,title,amount_owed,description,proof_file_name,status,submitted_at";
const BILL_REQUEST_CONFLICT = "owner_id,source_collection,source_id";

interface BillRequestRow {
  source_id: string;
  title: string;
  amount_owed: number | string;
  description: string | null;
  proof_file_name: string;
  status: BillRequestStatus;
  submitted_at: string;
}

let serverRequests: BillRequestRecord[] = [];
let pendingRequests: BillRequestRecord[] = [];
let billRequestsSnapshot: BillRequestRecord[] = [];
let pendingBillRequestsSnapshot: BillRequestRecord[] = [];

const requestListeners = new Set<() => void>();

let currentUserId: string | null = null;
let refreshInFlight: Promise<void> | null = null;
// Until the persisted session has been read once, a temporarily missing user id
// only means "not hydrated yet" — not "signed out".
let authHydrated = false;

function compareNewestFirst(a: BillRequestRecord, b: BillRequestRecord): number {
  const aTime = Date.parse(a.submittedAt);
  const bTime = Date.parse(b.submittedAt);
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

function mergeRequests(): BillRequestRecord[] {
  const byId = new Map<string, BillRequestRecord>();
  for (const record of serverRequests) byId.set(record.id, record);
  for (const record of pendingRequests) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return Array.from(byId.values()).sort(compareNewestFirst);
}

function recomputeSnapshots(): void {
  billRequestsSnapshot = mergeRequests();
  pendingBillRequestsSnapshot = billRequestsSnapshot.filter(
    (record) => record.status === "pending",
  );
}

function notifyListeners(): void {
  recomputeSnapshots();
  for (const listener of requestListeners) listener();
}

recomputeSnapshots();

function readStoredRequests(): BillRequestRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(BILL_REQUESTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is BillRequestRecord => {
      if (!entry || typeof entry !== "object") return false;
      const record = entry as Partial<BillRequestRecord>;
      return typeof record.id === "string" && typeof record.title === "string";
    });
  } catch {
    return [];
  }
}

function makeRequestId(): string {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `request-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function rowToRecord(row: BillRequestRow): BillRequestRecord {
  return {
    id: row.source_id,
    title: row.title,
    amountOwed: Number(row.amount_owed) || 0,
    description: row.description ?? null,
    proofFileName: row.proof_file_name,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

function recordToRow(record: BillRequestRecord, ownerId: string) {
  return {
    owner_id: ownerId,
    source_collection: BILL_REQUESTS_SOURCE_COLLECTION,
    source_id: record.id,
    title: record.title,
    amount_owed: record.amountOwed,
    description: record.description,
    proof_file_name: record.proofFileName,
    status: record.status,
    submitted_at: record.submittedAt,
  };
}

function sameInstant(a: string, b: string): boolean {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime === bTime;
  return a === b;
}

function matchStoredRecord(stored: BillRequestRecord, source: BillRequestRecord): boolean {
  return (
    stored.title === source.title &&
    Math.abs(stored.amountOwed - source.amountOwed) < 0.01 &&
    (stored.description ?? null) === (source.description ?? null) &&
    stored.proofFileName === source.proofFileName &&
    stored.status === source.status &&
    sameInstant(stored.submittedAt, source.submittedAt)
  );
}

function readMigrationCheckpoint(): Record<string, boolean> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LEGACY_MIGRATION_CHECKPOINT_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true) result[key] = true;
    }
    return result;
  } catch {
    return {};
  }
}

function writeMigrationCheckpoint(checkpoint: Record<string, boolean>): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LEGACY_MIGRATION_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch {
    /* a full or blocked storage must not break the adoption run */
  }
}

async function adoptLegacyBillRequests(ownerId: string): Promise<void> {
  const legacyRecords = readStoredRequests();
  if (!legacyRecords.length) return;

  const checkpoint = readMigrationCheckpoint();
  let checkpointChanged = false;

  for (const legacy of legacyRecords) {
    if (checkpoint[legacy.id]) continue;

    try {
      const { data, error } = await supabase
        .from(BILL_REQUESTS_TABLE)
        .upsert(recordToRow(legacy, ownerId), { onConflict: BILL_REQUEST_CONFLICT })
        .select(BILL_REQUEST_COLUMNS)
        .single();

      if (error || !data) continue;

      const stored = rowToRecord(data as BillRequestRow);
      if (!matchStoredRecord(stored, legacy)) continue;

      checkpoint[legacy.id] = true;
      checkpointChanged = true;

      if (!serverRequests.some((record) => record.id === stored.id)) {
        serverRequests = [stored, ...serverRequests];
      }
    } catch {
      /* offline or failed writes stay pending with the browser copy retained */
    }
  }

  if (checkpointChanged) {
    writeMigrationCheckpoint(checkpoint);
    notifyListeners();
  }
}

async function refreshFromServer(): Promise<void> {
  const ownerId = currentUserId;

  if (!ownerId) {
    if (serverRequests.length) {
      serverRequests = [];
      notifyListeners();
    }
    return;
  }

  try {
    const { data, error } = await supabase
      .from(BILL_REQUESTS_TABLE)
      .select(BILL_REQUEST_COLUMNS)
      .eq("owner_id", ownerId)
      .eq("source_collection", BILL_REQUESTS_SOURCE_COLLECTION)
      .order("submitted_at", { ascending: false });

    if (error) return;

    serverRequests = (data ?? []).map((row) => rowToRecord(row as BillRequestRow));
    pendingRequests = pendingRequests.filter(
      (pending) => !serverRequests.some((stored) => stored.id === pending.id),
    );
    notifyListeners();
  } catch {
    /* keep the current cache when the network cannot be reached */
  }
}

function ensureServerRefresh(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = refreshFromServer().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function flushPendingRequests(): Promise<void> {
  const ownerId = currentUserId;
  if (!ownerId || !pendingRequests.length) return;

  const records = [...pendingRequests];
  let changed = false;

  for (const record of records) {
    try {
      const { data, error } = await supabase
        .from(BILL_REQUESTS_TABLE)
        .upsert(recordToRow(record, ownerId), { onConflict: BILL_REQUEST_CONFLICT })
        .select(BILL_REQUEST_COLUMNS)
        .single();

      if (error || !data) continue;

      const stored = rowToRecord(data as BillRequestRow);
      if (!matchStoredRecord(stored, record)) continue;

      pendingRequests = pendingRequests.filter((entry) => entry.id !== record.id);
      if (!serverRequests.some((entry) => entry.id === stored.id)) {
        serverRequests = [stored, ...serverRequests];
      }
      changed = true;
    } catch {
      /* the record stays pending and is retried on the next load */
    }
  }

  if (changed) notifyListeners();
}

function handleAuthUser(userId: string | null): void {
  if (userId === currentUserId) {
    if (userId) void ensureServerRefresh();
    return;
  }

  currentUserId = userId;
  serverRequests = [];
  if (!userId) pendingRequests = [];
  notifyListeners();

  if (!userId) return;

  const ownerId = userId;
  void (async () => {
    try {
      await adoptLegacyBillRequests(ownerId);
      await ensureServerRefresh();
      await flushPendingRequests();
    } catch {
      /* whatever failed stays pending and retries on the next load */
    }
  })();
}

async function initialiseBillRequestStore(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    handleAuthUser(data.session?.user?.id ?? null);
  } catch {
    handleAuthUser(null);
  }
  authHydrated = true;

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthUser(session?.user?.id ?? null);
    });
  } catch {
    /* auth unavailable: reads stay empty until the next successful load */
  }
}

/** Stable snapshot of every bill request, newest first. */
export function getBillRequestsSnapshot(): BillRequestRecord[] {
  return billRequestsSnapshot;
}

/** The pending requests a verifier still has to look at, newest first. */
export function getPendingBillRequestsSnapshot(): BillRequestRecord[] {
  return pendingBillRequestsSnapshot;
}

/** Subscribe to request changes; returns the unsubscribe function. */
export function subscribeToBillRequests(listener: () => void): () => void {
  requestListeners.add(listener);
  if (currentUserId) void ensureServerRefresh();

  return () => {
    requestListeners.delete(listener);
  };
}

/**
 * Record a new bill request (status `pending`) and return the stored record.
 * Throws an Error with human-readable copy when the input is impossible, so the
 * form can surface `error.message` directly. Saving requires a signed-in
 * account; the authenticated write runs in the background.
 */
export function createBillRequest(input: NewBillRequestInput): BillRequestRecord {
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Please enter a bill title");

  const amountOwed = Number(input.amountOwed);
  if (!Number.isFinite(amountOwed) || amountOwed <= 0) {
    throw new Error("Please enter the amount owed");
  }

  const proofFileName = String(input.proofFileName ?? "").trim();
  if (!proofFileName) throw new Error("Please upload your bill proof");

  // A visitor cannot save a request; but a request filled in before the
  // persisted session finished hydrating is queued instead of rejected, and
  // flushed by the auth handler as soon as the owner id is known.
  if (!currentUserId && authHydrated) throw new Error(SIGN_IN_REQUIRED_MESSAGE);

  const record: BillRequestRecord = {
    id: makeRequestId(),
    title,
    amountOwed,
    description: input.description ? String(input.description).trim() : null,
    proofFileName,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  pendingRequests = [record, ...pendingRequests.filter((entry) => entry.id !== record.id)];
  notifyListeners();
  void flushPendingRequests();

  return record;
}

if (typeof window !== "undefined") {
  void initialiseBillRequestStore();
}
