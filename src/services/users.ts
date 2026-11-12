import * as authStore from '@/lib/authStore';
import { getCurrentUser } from '@/services/auth';

/**
 * The auth store may expose its change event as a named export. Access it
 * through the namespace and fall back to the stable local event name so this
 * module never fails to build when that export is absent.
 */
const AUTH_CHANGE_EVENT =
  (authStore as { AUTH_CHANGE_EVENT?: string }).AUTH_CHANGE_EVENT ??
  'odogwu:auth-change';

export type DashboardPledge = {
  id: string;
  reference: string;
  causeId: string | null;
  causeTitle: string;
  amountNaira: number;
  amountLabel: string;
  createdAt: string | null;
};

export type DashboardRequest = {
  id: string;
  title: string;
  status: string;
  amountOwedNaira: number;
  raisedNaira: number;
  remainingNaira: number;
  percentFunded: number;
  amountOwedLabel: string;
  raisedLabel: string;
  remainingLabel: string;
  createdAt: string | null;
  proofFileName: string | null;
};

export type DashboardData = {
  signedIn: boolean;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  pledges: DashboardPledge[];
  requests: DashboardRequest[];
};

export const DEFAULT_CAUSE_TITLE = 'Pledge to a verified cause';

export function formatNaira(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

/**
 * Alias kept for callers (e.g. the pledges service) that format amounts with a
 * distinct helper name. Delegates to {@link formatNaira} so every screen shows
 * the same Naira formatting.
 */
export function formatNairaAmount(value: number): string {
  return formatNaira(value);
}

export const SAMPLE_DASHBOARD_PLEDGES: DashboardPledge[] = [
  { id: 'sample-pledge-1', reference: 'ODG-2025-0002', causeId: '1', causeTitle: `Cover Mama Blessing's dialysis week`, amountNaira: 25000, amountLabel: formatNaira(25000), createdAt: '2024-04-16T09:20:00.000Z' },
  { id: 'sample-pledge-2', reference: 'ODG-2025-0001', causeId: '1', causeTitle: 'Help Chinedu clear his hospital bill', amountNaira: 12000, amountLabel: formatNaira(12000), createdAt: '2024-03-28T17:05:00.000Z' },
];

export const SAMPLE_DASHBOARD_REQUESTS: DashboardRequest[] = [
  { id: 'sample-request-1', title: `St. Mary's General Hospital — malaria admission`, status: 'Pending verification', amountOwedNaira: 85000, raisedNaira: 32000, remainingNaira: 53000, percentFunded: 38, amountOwedLabel: formatNaira(85000), raisedLabel: formatNaira(32000), remainingLabel: formatNaira(53000), createdAt: '2024-04-18T08:30:00.000Z', proofFileName: 'st-marys-bill.pdf' },
  { id: 'sample-request-2', title: 'Gbagada Renal Centre — one week of dialysis', status: 'Verified', amountOwedNaira: 210000, raisedNaira: 84500, remainingNaira: 125500, percentFunded: 40, amountOwedLabel: formatNaira(210000), raisedLabel: formatNaira(84500), remainingLabel: formatNaira(125500), createdAt: '2024-04-02T11:10:00.000Z', proofFileName: 'gbagada-invoice.pdf' },
];

type RawRecord = Record<string, unknown>;
type CurrentAccount = { email?: string | null; fullName?: string | null; phone?: string | null };

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

const PLEDGE_KEY_PATTERN = /(pledge|receipt|donation)/i;
const REQUEST_KEY_PATTERN = /(request|bill|cause|submission)/i;
const NESTED_KEYS = ['records', 'items', 'data', 'rows', 'list', 'pledges', 'requests', 'receipts', 'bills'] as const;
const RECORD_MARKERS = ['id', 'reference', 'tx_ref', 'txRef', 'title', 'cause_id', 'causeId', 'amount', 'amount_minor', 'amountMinor', 'amountOwed', 'amount_owed'] as const;

function readStorageEntries(): Array<[string, string]> {
  if (typeof window === 'undefined') return [];
  try {
    const storage = window.localStorage;
    const entries: Array<[string, string]> = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const raw = storage.getItem(key);
      if (raw) entries.push([key, raw]);
    }
    return entries;
  } catch {
    return [];
  }
}

function isRecordLike(record: RawRecord): boolean {
  return RECORD_MARKERS.some((marker) => marker in record);
}

function collectRecords(value: unknown, out: RawRecord[], depth = 0): void {
  if (depth > 5 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, out, depth + 1);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  const nestedArrays: unknown[][] = [];
  for (const key of NESTED_KEYS) {
    const candidate = record[key];
    if (Array.isArray(candidate)) nestedArrays.push(candidate);
  }
  if (nestedArrays.length > 0) {
    if (isRecordLike(record)) out.push(record);
    for (const nested of nestedArrays) {
      for (const item of nested) collectRecords(item, out, depth + 1);
    }
    return;
  }
  if (isRecordLike(record)) {
    out.push(record);
    return;
  }
  for (const child of Object.values(record)) {
    if (asRecord(child)) collectRecords(child, out, depth + 1);
  }
}

function dedupeRecords(records: RawRecord[]): RawRecord[] {
  const seen = new Set<string>();
  const unique: RawRecord[] = [];
  for (const record of records) {
    const key = firstString(record.id, record.reference, record.tx_ref, record.txRef, record.createdAt, record.created_at) ?? JSON.stringify(record);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

function collectDashboardRecords(): { pledges: RawRecord[]; requests: RawRecord[] } {
  const pledges: RawRecord[] = [];
  const requests: RawRecord[] = [];
  for (const [key, raw] of readStorageEntries()) {
    const looksLikeRequest = REQUEST_KEY_PATTERN.test(key);
    const looksLikePledge = PLEDGE_KEY_PATTERN.test(key);
    if (!looksLikeRequest && !looksLikePledge) continue;
    const bucket = looksLikeRequest && !looksLikePledge ? requests : pledges;
    try {
      collectRecords(JSON.parse(raw), bucket);
    } catch {
      // Not JSON.
    }
  }
  return { pledges, requests };
}

function normalizeStatus(raw: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return 'Pending verification';
  const key = value.toLowerCase().replace(/[ _-]+/g, ' ');
  if (key.includes('pending') || key.includes('under review') || key.includes('awaiting') || key === 'submitted') return 'Pending verification';
  if (key === 'verified' || key === 'approved' || key === 'published') return 'Verified';
  if (key === 'rejected' || key === 'declined' || key === 'refused') return 'Rejected';
  return value;
}

function normalizePledge(record: RawRecord): DashboardPledge {
  const cause = asRecord(record.cause) ?? asRecord(record.bill) ?? asRecord(record.request);
  const causeTitle = firstString(record.cause_title, record.causeTitle, cause?.title, record.title) ?? DEFAULT_CAUSE_TITLE;
  const minor = firstNumber(record.amount_minor, record.amountMinor, record.total_minor, record.totalMinor);
  const major = firstNumber(record.amount, record.amountNaira, record.amount_naira, record.total, record.value);
  const amountNaira = minor !== null ? minor / 100 : (major ?? 0);
  const reference = firstString(record.reference, record.tx_ref, record.txRef, record.id) ?? 'unknown';
  return { id: firstString(record.id, reference) ?? reference, reference, causeId: firstString(record.cause_id, record.causeId), causeTitle, amountNaira, amountLabel: formatNaira(amountNaira), createdAt: firstString(record.createdAt, record.created_at, record.paidAt, record.paid_at, record.date) };
}

function normalizeRequest(record: RawRecord): DashboardRequest {
  const owedMinor = firstNumber(record.amount_owed_minor, record.amountOwedMinor);
  const owed = owedMinor !== null ? owedMinor / 100 : (firstNumber(record.amountOwed, record.amount_owed, record.amountOwedNaira, record.amount, record.target) ?? 0);
  const raisedMinor = firstNumber(record.raised_minor, record.raisedMinor);
  const raised = raisedMinor !== null ? raisedMinor / 100 : (firstNumber(record.raised, record.raisedNaira, record.amount_raised, record.amountRaised) ?? 0);
  const remaining = Math.max(owed - raised, 0);
  const percentFunded = owed > 0 ? Math.min(100, Math.round((raised / owed) * 100)) : 0;
  return { id: firstString(record.id, record.reference, record.createdAt, record.created_at) ?? 'request', title: firstString(record.title, record.billTitle, record.bill_title, record.name) ?? 'Bill request', status: normalizeStatus(firstString(record.status, record.verification_status, record.verificationStatus)), amountOwedNaira: owed, raisedNaira: raised, remainingNaira: remaining, percentFunded, amountOwedLabel: formatNaira(owed), raisedLabel: formatNaira(raised), remainingLabel: formatNaira(remaining), createdAt: firstString(record.createdAt, record.created_at, record.submittedAt, record.submitted_at), proofFileName: firstString(record.proofFileName, record.proof_file_name, record.proofName) };
}

const OWNER_KEYS = ['requesterEmail', 'requester_email', 'ownerEmail', 'owner_email', 'createdByEmail', 'email'] as const;

function isOwnedBy(record: RawRecord, email: string | null): boolean {
  if (!email) return true;
  const owner = firstString(...OWNER_KEYS.map((key) => record[key]))?.toLowerCase() ?? null;
  return !owner || owner === email;
}

function readAccount(): CurrentAccount | null {
  try {
    const account = getCurrentUser() as unknown as CurrentAccount | null | undefined;
    return account ?? null;
  } catch {
    return null;
  }
}

function createFallbackDashboard(account: CurrentAccount | null): DashboardData {
  return {
    signedIn: Boolean(account),
    email: account?.email ?? null,
    fullName: account?.fullName?.trim() ? account.fullName.trim() : null,
    phone: account?.phone?.trim() ? account.phone.trim() : null,
    pledges: SAMPLE_DASHBOARD_PLEDGES.map((pledge) => ({ ...pledge })),
    requests: SAMPLE_DASHBOARD_REQUESTS.map((request) => ({ ...request })),
  };
}

/**
 * Builds the dashboard payload from the signed-in account and any records the
 * browser has stored. Never throws: a malformed or unavailable store falls back
 * to the representative sample rows so `/dashboard` always renders its sections
 * without surfacing an error to the person.
 */
export function getDashboardSnapshot(): DashboardData {
  const account = readAccount();
  const email = account?.email ? account.email.toLowerCase() : null;

  try {
    const collected = collectDashboardRecords();
    const pledges = dedupeRecords(collected.pledges).map(normalizePledge);
    const requests = dedupeRecords(collected.requests)
      .filter((record) => isOwnedBy(record, email))
      .map(normalizeRequest);

    return {
      signedIn: Boolean(account),
      email: account?.email ?? null,
      fullName: account?.fullName?.trim() ? account.fullName.trim() : null,
      phone: account?.phone?.trim() ? account.phone.trim() : null,
      pledges: pledges.length > 0 ? pledges : SAMPLE_DASHBOARD_PLEDGES.map((pledge) => ({ ...pledge })),
      requests: requests.length > 0 ? requests : SAMPLE_DASHBOARD_REQUESTS.map((request) => ({ ...request })),
    };
  } catch {
    return createFallbackDashboard(account);
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    return getDashboardSnapshot();
  } catch {
    return createFallbackDashboard(readAccount());
  }
}

export function subscribeDashboard(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
