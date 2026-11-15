/**
 * Payment domain types for the Paystack integration.
 *
 * These live in their own module (rather than being appended to
 * `src/types/models.ts`) so the long-standing pledge/cause/receipt types keep
 * their existing shape and every current importer of `@/types/models` continues
 * to compile untouched.
 *
 * Two shapes are modelled on purpose:
 *   * `PaymentRow`  - exactly what Postgres returns (snake_case, minor units).
 *   * `Payment`     - the app-facing camelCase view, with naira helpers.
 * Money is ALWAYS kept in minor units (kobo) in the row; naira only exists once
 * something is rendered for a human.
 */

/** Lifecycle of a single Paystack charge, mirroring the `payment_status` enum. */
export type PaymentStatus =
  | "pending"
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "refunded";

/** Currency we settle in. The migration constrains this to NGN for now. */
export type PaymentCurrency = "NGN";

/** A row exactly as stored in `public.payments`. */
export interface PaymentRow {
  id: string;
  user_id: string | null;
  pledge_reference: string;
  paystack_reference: string | null;
  cause_id: string;
  donor_name: string | null;
  donor_email: string | null;
  /** Amount charged, in kobo. */
  amount_minor: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  channel: string | null;
  gateway_response: string | null;
  receipt_reference: string | null;
  paid_at: string | null;
  verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** The safe projection returned by the `get_pledge_payment` RPC. */
export interface PaymentSummaryRow {
  id: string;
  pledge_reference: string;
  paystack_reference: string | null;
  status: PaymentStatus;
  amount_minor: number;
  currency: PaymentCurrency;
  cause_id: string;
  channel: string | null;
  gateway_response: string | null;
  receipt_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

/** App-facing payment record (camelCase, naira convenience fields). */
export interface Payment {
  id: string;
  userId: string | null;
  pledgeReference: string;
  paystackReference: string | null;
  causeId: string;
  donorName: string | null;
  donorEmail: string | null;
  amountMinor: number;
  /** Amount in naira (amountMinor / 100). */
  amount: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  channel: string | null;
  gatewayResponse: string | null;
  receiptReference: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input accepted by `begin_pledge_payment`. */
export interface BeginPaymentInput {
  pledgeReference: string;
  causeId: string;
  /** Amount in kobo. */
  amountMinor: number;
  donorName?: string | null;
  donorEmail?: string | null;
  currency?: PaymentCurrency;
}

/** Input accepted by `confirm_pledge_payment` (server / service-role only). */
export interface ConfirmPaymentInput {
  pledgeReference: string;
  paystackReference?: string | null;
  /** Amount actually charged, in kobo. */
  amountMinor: number;
  causeId?: string | null;
  userId?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  currency?: PaymentCurrency;
  channel?: string | null;
  gatewayResponse?: string | null;
  paidAt?: string | null;
  metadata?: Record<string, unknown>;
}

/** Human labels used by checkout and the receipt page. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Unpaid",
  initialized: "Unpaid",
  paid: "Paid",
  failed: "Payment failed",
  abandoned: "Payment cancelled",
  refunded: "Refunded",
};

/** True only when the money has genuinely cleared on the server. */
export function isPaid(status: PaymentStatus | null | undefined): boolean {
  return status === "paid";
}

/** True while the charge can still be attempted with the same reference. */
export function isOpen(status: PaymentStatus | null | undefined): boolean {
  return status === "pending" || status === "initialized" || status === "failed";
}

/** Convert a stored row (snake_case, kobo) into the app-facing shape. */
export function toPayment(row: PaymentRow): Payment {
  const amountMinor = Number(row.amount_minor ?? 0);

  return {
    id: row.id,
    userId: row.user_id ?? null,
    pledgeReference: row.pledge_reference,
    paystackReference: row.paystack_reference ?? null,
    causeId: row.cause_id,
    donorName: row.donor_name ?? null,
    donorEmail: row.donor_email ?? null,
    amountMinor,
    amount: amountMinor / 100,
    currency: (row.currency ?? "NGN") as PaymentCurrency,
    status: row.status,
    channel: row.channel ?? null,
    gatewayResponse: row.gateway_response ?? null,
    receiptReference: row.receipt_reference ?? null,
    paidAt: row.paid_at ?? null,
    verifiedAt: row.verified_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert the RPC's safe projection into the app-facing shape. */
export function summaryToPayment(row: PaymentSummaryRow): Payment {
  const amountMinor = Number(row.amount_minor ?? 0);

  return {
    id: row.id,
    userId: null,
    pledgeReference: row.pledge_reference,
    paystackReference: row.paystack_reference ?? null,
    causeId: row.cause_id,
    donorName: null,
    donorEmail: null,
    amountMinor,
    amount: amountMinor / 100,
    currency: (row.currency ?? "NGN") as PaymentCurrency,
    status: row.status,
    channel: row.channel ?? null,
    gatewayResponse: row.gateway_response ?? null,
    receiptReference: row.receipt_reference ?? null,
    paidAt: row.paid_at ?? null,
    verifiedAt: null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}
