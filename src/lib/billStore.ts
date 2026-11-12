/**
 * Bill request ledger.
 *
 * Every bill that someone submits (through /create or the seeded review queue)
 * starts life as a `pending` request. Only requests an admin has `approved` are
 * allowed to reach the public feed, which is why the feed reads its deck from
 * this store instead of a hard-coded list.
 *
 * The store is a tiny observable singleton (the same pattern the pledge ledger
 * uses): mutations replace the array reference and notify subscribers, so
 * `useSyncExternalStore` in the UI re-renders exactly when a request moves
 * between states. It is intentionally in-memory — requests are disposable test
 * data and must never leak between page loads.
 */

export type BillStatus = "pending" | "approved" | "rejected";

export type BillRequest = {
  id: string;
  title: string;
  beneficiary: string;
  amount: number;
  currency: string;
  category: string;
  location: string;
  description: string;
  /** Data URL or absolute URL of the document attached to the request. */
  proofUrl: string;
  proofLabel: string;
  submittedBy: string;
  submittedByEmail: string;
  createdAt: string;
  reviewedAt: string | null;
  status: BillStatus;
};

export type NewBillInput = {
  title: string;
  amount: number;
  currency?: string;
  description?: string;
  beneficiary?: string;
  category?: string;
  location?: string;
  submittedBy?: string;
  submittedByEmail?: string;
  proofUrl?: string;
  proofLabel?: string;
};

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Naira formatting pinned to the en-NG locale so totals read the same everywhere. */
export function formatNairaAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return nairaFormatter.format(safe);
}

/**
 * A small self-contained document image, used as the attached proof so the
 * reviewer always has a real image to open (never a broken/404 asset).
 */
const PROOF_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">',
  '<rect width="640" height="420" fill="#f1f5f9"/>',
  '<rect x="40" y="28" width="560" height="364" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>',
  '<text x="76" y="96" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Payment receipt</text>',
  '<text x="76" y="132" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#475569">Submitted with the bill request for review</text>',
  '<line x1="76" y1="160" x2="564" y2="160" stroke="#e2e8f0" stroke-width="2"/>',
  '<text x="76" y="204" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#475569">Amount due</text>',
  '<text x="564" y="204" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">see request</text>',
  '<text x="76" y="248" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#475569">Hospital / school stamp</text>',
  '<text x="564" y="248" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#059669">verified</text>',
  '<line x1="76" y1="280" x2="564" y2="280" stroke="#e2e8f0" stroke-width="2"/>',
  '<text x="76" y="322" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#64748b">Odogwu verification desk — sample document</text>',
  "</svg>",
].join("");

export const SAMPLE_PROOF_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(PROOF_SVG)}`;

/**
 * Two disposable requests seeded into the review queue: one that an admin will
 * approve (and therefore publish) and one that must stay invisible on the feed
 * while it is still pending.
 */
const SEED_REQUESTS: BillRequest[] = [
  {
    id: "req-kano-clinic-roof",
    title: "Kano Clinic Roof Repair",
    beneficiary: "Halima Yusuf",
    amount: 185000,
    currency: "NGN",
    category: "Clinic repair",
    location: "Kano, Nigeria",
    description:
      "A storm tore the roof off the maternal ward of a community clinic in Kano. The contractor's invoice covers new roofing sheets, timber and labour.",
    proofUrl: SAMPLE_PROOF_IMAGE,
    proofLabel: "Roof repair invoice — Kano Community Clinic",
    submittedBy: "Halima Yusuf",
    submittedByEmail: "halima@example.com",
    createdAt: "2024-06-04T09:15:00.000Z",
    reviewedAt: null,
    status: "pending",
  },
  {
    id: "req-lagos-market-fire",
    title: "Lagos Market Fire Relief",
    beneficiary: "Balogun Market Traders",
    amount: 240000,
    currency: "NGN",
    category: "Market fire relief",
    location: "Lagos, Nigeria",
    description:
      "A fire destroyed six stalls in Balogun market and the traders need help restocking before the school term starts.",
    proofUrl: SAMPLE_PROOF_IMAGE,
    proofLabel: "Fire service report — Balogun market stalls",
    submittedBy: "Balogun Market Traders",
    submittedByEmail: "traders@example.com",
    createdAt: "2024-06-06T11:40:00.000Z",
    reviewedAt: null,
    status: "pending",
  },
];

function newestFirst(a: BillRequest, b: BillRequest): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function selectApproved(list: BillRequest[]): BillRequest[] {
  return list.filter((request) => request.status === "approved").sort(newestFirst);
}

function selectPending(list: BillRequest[]): BillRequest[] {
  return list.filter((request) => request.status === "pending").sort(newestFirst);
}

let bills: BillRequest[] = SEED_REQUESTS.map((request) => ({ ...request }));
let approvedSnapshot: BillRequest[] = selectApproved(bills);
let pendingSnapshot: BillRequest[] = selectPending(bills);

const listeners = new Set<() => void>();

/** Replace the ledger, refresh the cached snapshots and wake every subscriber. */
function replace(next: BillRequest[]): void {
  bills = next;
  approvedSnapshot = selectApproved(next);
  pendingSnapshot = selectPending(next);
  for (const listener of listeners) listener();
}

export function subscribeToBillStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* Alias kept for callers that prefer the plural naming used by other stores. */
export const subscribeToBills = subscribeToBillStore;

/** Stable reference — safe as a `useSyncExternalStore` snapshot. */
export function getBillsSnapshot(): BillRequest[] {
  return bills;
}

export function getBills(): BillRequest[] {
  return bills;
}

/** Only approved requests — this is what the public feed may show. */
export function getApprovedBillsSnapshot(): BillRequest[] {
  return approvedSnapshot;
}

/** Requests still waiting for an admin decision. */
export function getPendingBillsSnapshot(): BillRequest[] {
  return pendingSnapshot;
}

export function getBill(id: string): BillRequest | null {
  return bills.find((request) => request.id === id) ?? null;
}

/**
 * Submit a new bill. It always lands as `pending`, so nothing reaches the feed
 * until an admin approves it.
 */
export function addBill(input: NewBillInput): BillRequest {
  const request: BillRequest = {
    id: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    beneficiary: input.beneficiary?.trim() || input.submittedBy?.trim() || "Odogwu member",
    amount: Number.isFinite(input.amount) ? input.amount : 0,
    currency: input.currency ?? "NGN",
    category: input.category?.trim() || "Bill",
    location: input.location?.trim() || "Nigeria",
    description: input.description?.trim() || "No description was provided with this request.",
    proofUrl: input.proofUrl ?? SAMPLE_PROOF_IMAGE,
    proofLabel: input.proofLabel ?? `Supporting document — ${input.title.trim()}`,
    submittedBy: input.submittedBy?.trim() || "Odogwu member",
    submittedByEmail: input.submittedByEmail?.trim() || "",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    status: "pending",
  };

  replace([request, ...bills]);
  return request;
}

function setStatus(id: string, status: BillStatus): BillRequest | null {
  const target = bills.find((request) => request.id === id);
  if (!target) return null;

  const updated: BillRequest = {
    ...target,
    status,
    reviewedAt: new Date().toISOString(),
  };

  replace(bills.map((request) => (request.id === id ? updated : request)));
  return updated;
}

/** Publish a request to the feed. */
export function approveBill(id: string): BillRequest | null {
  return setStatus(id, "approved");
}

/** Keep a request out of the feed. */
export function rejectBill(id: string): BillRequest | null {
  return setStatus(id, "rejected");
}
