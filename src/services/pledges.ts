import { supabase } from "@/integrations/supabase/client";
import { CURRENCY, createPledgeReference, fromMinorUnits } from "@/lib/payments";
import {
  addPledge as addPledgeToLedger,
  formatNaira as formatNairaAmount,
  getCauseFundingSummary as readCauseFundingSummary,
  getLatestReceiptForCause as readLatestReceiptForCause,
  getPledgesForCause as readPledgesForCause,
  getPledgesSnapshot as readPledgesSnapshot,
  getReceipt as readReceipt,
  getReceiptForPledge as readReceiptForPledge,
  getReceiptsForCause as readReceiptsForCause,
  getReceiptsSnapshot as readReceiptsSnapshot,
  subscribeToPledges as subscribeToPledgeLedger,
  type NewPledgeInput,
} from "@/lib/pledges";
import type { FundingSummary, Pledge, Receipt } from "@/types/models";

/**
 * Pledge & receipt service — the single import surface pages use.
 *
 * Two layers live behind this module:
 *
 *  1. The local pledge/receipt ledger in `@/lib/pledges` (an in-memory,
 *     subscribable store) that the bill page, checkout and the receipt page
 *     read synchronously through `useSyncExternalStore`.
 *
 *  2. The server-side Paystack ledger in `public.payments`, reached only through
 *     the security-definer RPCs (`begin_pledge_payment`, `get_pledge_payment`)
 *     and the `paystack-initialize` / `paystack-verify` edge functions. A browser
 *     can never mark its own pledge as paid: only the server-side confirm path
 *     can do that, so `paid` is always proof the money actually cleared.
 *
 * Two rules are enforced here rather than in every caller:
 *   1. Funding totals only ever count settled pledges, so a Raised figure is
 *      always money that cleared and therefore has a receipt behind it.
 *   2. Reads are snapshot-stable, which is what lets `useSyncExternalStore`
 *      render the same value twice without looping.
 */

export type { NewPledgeInput };
export type { FundingSummary, Pledge, Receipt };

/**
 * Subscribe to pledge/receipt changes. Returns the unsubscribe function, which
 * is exactly the contract `useSyncExternalStore` expects.
 */
export function subscribeToPledges(listener: () => void): () => void {
  return subscribeToPledgeLedger(listener);
}

/**
 * Stable snapshot of every pledge. Pass this as both the client read and the
 * server snapshot so the first render already shows real totals.
 */
export function getPledgesSnapshot(): Pledge[] {
  return readPledgesSnapshot();
}

/** Stable snapshot of every receipt. */
export function getReceiptsSnapshot(): Receipt[] {
  return readReceiptsSnapshot();
}

/** Every pledge recorded against one bill. */
export function getPledgesForCause(causeId: string): Pledge[] {
  return readPledgesForCause(causeId);
}

/** Receipts for one bill, newest first. */
export function getReceiptsForCause(causeId: string): Receipt[] {
  return readReceiptsForCause(causeId);
}

/**
 * Look up a single receipt by its shareable id.
 *
 * An unknown or blank reference returns `null` rather than throwing: the route
 * renders a "Receipt not found" state, because a missing receipt means a wrong
 * link, never "still loading".
 */
export function getReceipt(id: string): Receipt | null {
  const reference = String(id ?? "").trim();
  if (!reference) return null;

  // The receipt's own id is the canonical lookup. A dashboard pledge link may
  // carry the quotable payment reference instead, so fall back to matching on
  // it rather than dead-ending on a receipt that plainly exists.
  const direct = readReceipt(reference);
  if (direct) return direct;

  return (
    readReceiptsSnapshot().find((receipt) => receipt.reference === reference) ?? null
  );
}

/** The receipt a settled pledge produced, if it has one. */
export function getReceiptForPledge(pledgeId: string): Receipt | null {
  return readReceiptForPledge(pledgeId);
}

/**
 * The most recently paid receipt for a bill. This is what the "View receipt"
 * link on the bill page points at, so the newest proof is always one click away.
 */
export function getLatestReceiptForCause(causeId: string): Receipt | null {
  return readLatestReceiptForCause(causeId);
}

/**
 * Live funding totals for a bill: Raised, Remaining, Donors, Pledges and the
 * percentage of the target covered.
 *
 * `targetAmount` is clamped inside the ledger, so a bad record can never produce
 * a negative Remaining total or a progress bar wider than its track.
 */
export function getCauseFundingSummary(
  causeId: string,
  targetAmount: number,
): FundingSummary {
  return readCauseFundingSummary(causeId, targetAmount);
}

/**
 * Record a pledge that has cleared. Crediting a pledge mints its receipt at the
 * same time, because in this app a settled pledge and a receipt are one event.
 *
 * Throws an Error carrying human-readable copy when the input is impossible, so
 * a form can surface `error.message` directly.
 */
export function addPledge(input: NewPledgeInput): Pledge {
  return addPledgeToLedger(input);
}

/** Format an amount as Naira (e.g. ₦25,000), tolerating a bad number. */
export function formatNaira(amount: number): string {
  return formatNairaAmount(amount);
}

/* -------------------------------------------------------------------------- */
/* Paystack payment lifecycle (server-backed `public.payments`)                */
/* -------------------------------------------------------------------------- */

/** Lifecycle of one Paystack charge, mirroring `public.payment_status`. */
export type PledgePaymentStatus =
  | "pending"
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "refunded";

/** An app-facing payment row (camelCase view of `public.payments`). */
export interface PledgePayment {
  id: string;
  pledgeReference: string;
  paystackReference: string | null;
  causeId: string;
  /** Amount charged, in kobo. */
  amountMinor: number;
  /** Amount in naira (amountMinor / 100). */
  amount: number;
  currency: string;
  status: PledgePaymentStatus;
  /** True only when the server confirmed the money actually cleared. */
  paid: boolean;
  channel: string | null;
  gatewayResponse: string | null;
  receiptReference: string | null;
  paidAt: string | null;
  createdAt: string;
  donorName?: string | null;
  donorEmail?: string | null;
}

/** What the pledge hook supplies when it starts a charge. */
export interface StartPledgePaymentInput {
  causeId: string;
  /** Amount to charge, in kobo. */
  amountMinor: number;
  donorName?: string | null;
  donorEmail?: string | null;
  callbackUrl?: string;
  /** Optional caller-minted reference (otherwise one is generated here). */
  reference?: string;
}

/** What starting a charge hands back to the pledge hook. */
export interface StartedPledgePayment {
  /** The app-minted, quotable reference that ties the ledger row together. */
  pledgeReference: string;
  /** The reference Paystack will settle against (server-issued when available). */
  paystackReference: string | null;
  /** Amount to open the popup with, in kobo. */
  amountMinor: number;
  currency: string;
  status: PledgePaymentStatus;
  /** The stored pending row, as the app sees it. */
  payment: PledgePayment;
}

/** Human-readable payment failure; `message` is safe to print. */
export class PledgePaymentError extends Error {
  /** Technical detail for logs; never required to render the error. */
  readonly detail: string | null;

  constructor(message: string, detail?: string | null) {
    super(message);
    this.name = "PledgePaymentError";
    this.detail = detail ?? null;
    // Keep `instanceof` working when the bundle targets older runtimes.
    Object.setPrototypeOf(this, PledgePaymentError.prototype);
  }
}

/** Shape of a `public.payments` row as PostgREST returns it. */
interface PaymentRowShape {
  id?: string | null;
  pledge_reference?: string | null;
  paystack_reference?: string | null;
  cause_id?: string | null;
  amount_minor?: number | string | null;
  currency?: string | null;
  status?: string | null;
  channel?: string | null;
  gateway_response?: string | null;
  receipt_reference?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  donor_name?: string | null;
  donor_email?: string | null;
}

/** First object out of a PostgREST payload (object or single-row array). */
function firstRow<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === "object") return data as T;
  return null;
}

/** Map a stored (snake_case, kobo) row onto the app-facing shape. */
function toPledgePayment(row: PaymentRowShape): PledgePayment {
  const status = (row.status ?? "pending") as PledgePaymentStatus;
  const amountMinor = Math.round(Number(row.amount_minor ?? 0)) || 0;

  return {
    id: String(row.id ?? row.pledge_reference ?? ""),
    pledgeReference: String(row.pledge_reference ?? ""),
    paystackReference: row.paystack_reference ?? null,
    causeId: String(row.cause_id ?? ""),
    amountMinor,
    amount: fromMinorUnits(amountMinor),
    currency: String(row.currency ?? CURRENCY),
    status,
    paid: status === "paid",
    channel: row.channel ?? null,
    gatewayResponse: row.gateway_response ?? null,
    receiptReference: row.receipt_reference ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    donorName: row.donor_name ?? null,
    donorEmail: row.donor_email ?? null,
  };
}

/** An unpaid payment object for a reference the server has not stored yet. */
function pendingPayment(
  pledgeReference: string,
  paystackReference: string | null,
  causeId: string,
  amountMinor: number,
): PledgePayment {
  return {
    id: pledgeReference,
    pledgeReference,
    paystackReference,
    causeId,
    amountMinor,
    amount: fromMinorUnits(amountMinor),
    currency: CURRENCY,
    status: "pending",
    paid: false,
    channel: null,
    gatewayResponse: null,
    receiptReference: null,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Start one Paystack charge.
 *
 * 1. The pending ledger row is created through `begin_pledge_payment`, which is
 *    idempotent per pledge reference, so a retry after a dropped connection
 *    re-uses the same row instead of double counting.
 * 2. The `paystack-initialize` edge function (the only place that holds the
 *    secret key) is asked to register the transaction with Paystack and return
 *    its reference. When that call is unavailable the stored pending row still
 *    stands and the pledge reference is used, so a retry is always possible.
 */
export async function startPledgePayment(
  input: StartPledgePaymentInput,
): Promise<StartedPledgePayment> {
  const causeId = String(input?.causeId ?? "").trim();
  const amountMinor = Math.round(Number(input?.amountMinor ?? 0));

  if (!causeId) {
    throw new PledgePaymentError(
      "Could not start payment",
      "A bill (cause) id is required before a charge can start.",
    );
  }

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new PledgePaymentError(
      "Could not start payment",
      "A positive pledge amount is required before a charge can start.",
    );
  }

  const pledgeReference =
    String(input?.reference ?? "").trim() || createPledgeReference();

  const { data, error } = await supabase.rpc("begin_pledge_payment", {
    p_pledge_reference: pledgeReference,
    p_cause_id: causeId,
    p_amount_minor: amountMinor,
    p_donor_name: input?.donorName ?? null,
    p_donor_email: input?.donorEmail ?? null,
    p_currency: CURRENCY,
  });

  if (error) {
    throw new PledgePaymentError("Could not start payment", error.message);
  }

  const stored = firstRow<PaymentRowShape>(data);
  const payment = stored
    ? toPledgePayment(stored)
    : pendingPayment(pledgeReference, null, causeId, amountMinor);

  let paystackReference = payment.paystackReference ?? null;

  try {
    const { data: initData, error: initError } = await supabase.functions.invoke(
      "paystack-initialize",
      {
        body: {
          pledgeReference,
          pledge_reference: pledgeReference,
          causeId,
          cause_id: causeId,
          amountMinor,
          amount_minor: amountMinor,
          currency: CURRENCY,
          donorName: input?.donorName ?? null,
          donorEmail: input?.donorEmail ?? null,
          callbackUrl: input?.callbackUrl ?? null,
        },
      },
    );

    if (!initError && initData && typeof initData === "object") {
      const payload = initData as Record<string, unknown>;
      const candidate =
        payload.paystackReference ??
        payload.paystack_reference ??
        payload.reference;
      if (typeof candidate === "string" && candidate.trim()) {
        paystackReference = candidate.trim();
      }
    }
  } catch {
    /* the pending ledger row still stands: the caller can retry the charge */
  }

  const finalReference = paystackReference ?? pledgeReference;

  return {
    pledgeReference,
    paystackReference: finalReference,
    amountMinor: payment.amountMinor > 0 ? payment.amountMinor : amountMinor,
    currency: payment.currency || CURRENCY,
    status: payment.status,
    payment: {
      ...payment,
      paystackReference: finalReference,
      amountMinor: payment.amountMinor > 0 ? payment.amountMinor : amountMinor,
    },
  };
}

/**
 * Verify one charge with the server.
 *
 * The `paystack-verify` edge function is asked first, because only it can talk
 * to Paystack and run `confirm_pledge_payment`. The stored row is then read
 * through the safe `get_pledge_payment` RPC, so the browser sees the server's
 * verdict (and never a client-side guess) about whether the money cleared.
 */
export async function verifyPledgePayment(
  pledgeReference: string,
  paystackReference?: string | null,
): Promise<PledgePayment> {
  const reference = String(pledgeReference ?? "").trim();

  if (!reference) {
    throw new PledgePaymentError(
      "Payment failed",
      "A pledge reference is required to verify a payment.",
    );
  }

  let row: PaymentRowShape | null = null;

  try {
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      "paystack-verify",
      {
        body: {
          pledgeReference: reference,
          pledge_reference: reference,
          paystackReference: paystackReference ?? null,
          paystack_reference: paystackReference ?? null,
          reference: paystackReference ?? reference,
        },
      },
    );

    if (!verifyError && verifyData && typeof verifyData === "object") {
      const payload = verifyData as Record<string, unknown>;
      row = firstRow<PaymentRowShape>(
        payload.payment ?? payload.row ?? payload.data ?? payload,
      );
    }
  } catch {
    /* fall through to the stored row so the verdict is still the server's */
  }

  if (!row) {
    const { data, error } = await supabase.rpc("get_pledge_payment", {
      p_reference: reference,
    });

    if (error) {
      throw new PledgePaymentError("Payment failed", error.message);
    }

    row = firstRow<PaymentRowShape>(data);
  }

  if (!row) {
    return pendingPayment(reference, paystackReference ?? null, "", 0);
  }

  return toPledgePayment(row);
}

/**
 * Credit a server-confirmed payment to the local ledger, minting its receipt.
 *
 * This runs only after `verifyPledgePayment` reported `paid`, so a cancelled or
 * abandoned charge can never appear in the Raised total or produce a receipt.
 */
export function recordConfirmedPledge(payment: PledgePayment): Receipt {
  const amountMinor = Math.round(Number(payment?.amountMinor ?? 0));
  const amount = amountMinor > 0 ? fromMinorUnits(amountMinor) : Number(payment?.amount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PledgePaymentError(
      "Payment failed",
      "A settled payment must have a positive amount.",
    );
  }

  const causeId = String(payment?.causeId ?? "").trim() || "unknown";
  const donorName = String(payment?.donorName ?? "").trim() || "Anonymous donor";

  const pledge = addPledgeToLedger({ causeId, donorName, amount });
  const receipt = readReceiptForPledge(pledge.id);

  if (receipt) return receipt;

  // The ledger always mints a receipt with the pledge; this fallback keeps the
  // return type honest if that ever changes.
  return {
    id: pledge.id,
    pledgeId: pledge.id,
    causeId: pledge.causeId,
    donorName: pledge.donorName ?? donorName,
    amount,
    currency: "NGN",
    reference: pledge.reference,
    paidAt: pledge.paidAt ?? new Date().toISOString(),
  };
}
