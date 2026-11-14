import { createFileRoute } from "@tanstack/react-router";

// Kept: still used by other files.
export interface FundingSummary {
  causeId: string;
  currency: Currency;
  raised: number;
  target: number;
  remaining: number;
  /** Whole-number percentage, clamped to 0–100. */
  percent: number;
  /** Distinct donors behind the settled pledges. */
  donors: number;
  /** Number of settled pledges counted in `raised`. */
  pledges: number;
  formattedRaised: string;
  formattedTarget: string;
  formattedRemaining: string;
  latestPledgeAt: string | null;
  isFullyFunded: boolean;
}

/** Proof that money actually cleared for a pledge. */

export interface Pledge {
  id: string;
  /** Quotable Paystack reference, also shown on the receipt. */
  reference: string;
  causeId: string;
  /** Amount in kobo. */
  amountMinor: number;
  currency: Currency;
  status: PledgeStatus;
  donorName?: string;
  donorEmail?: string;
  /** ISO timestamp of when the pledge was created. */
  createdAt: string;
  /** ISO timestamp of settlement, or null until the charge clears. */
  paidAt: string | null;
}

/**
 * Everything the checkout summary needs, already normalised to minor units and
 * pre-formatted Naira strings so the page never formats money itself.
 */

export interface Receipt {
  id: string;
  pledgeId: string;
  causeId: string;
  donorName: string;
  /** Amount in Naira (what the receipt prints). */
  amount: number;
  currency: Currency;
  reference: string;
  paidAt: string;
}

export interface CheckoutSummary {
  causeId: string;
  causeTitle: string;
  /** Total bill amount in kobo. */
  goalMinor: number;
  /** Already-cleared pledges in kobo. */
  raisedMinor: number;
  /** What is still owed in kobo (never negative). */
  remainingMinor: number;
  formattedGoal: string;
  formattedRaised: string;
  formattedRemaining: string;
  isFullyFunded: boolean;
}

/** Machine-readable outcome of validating a typed amount. */

export type Currency = "NGN";

/**
 * Lifecycle of a single pledge.
 *
 * `draft`      — the person is still in the sheet/checkout and nothing is owed yet.
 * `processing` — Paystack has been asked to charge the amount.
 * `paid`       — the charge cleared and a receipt exists for it.
 * `failed`     — the charge was refused or the person abandoned the checkout.
 */

export interface PledgeValidation {
  code: PledgeValidationCode;
  /** Human copy for the error, or null when `code` is "ok". */
  message: string | null;
  /** Parsed amount in kobo (0 when the input could not be parsed). */
  amountMinor: number;
}

/** Payload handed to the Paystack checkout initialiser. */

export function formatNaira(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe);
  const negative = rounded < 0;
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}\u20A6${grouped}`;
}

export interface Cause {
  id: string;
  title: string;
  summary: string;
  category: string;
  /** The hospital, school or landlord the money is owed to. */
  hospital: string;
  location: string;
  patientName: string;
  relationship: string;
  amountNeeded: number;
  coverImage: string;
  whyThisBill: string;
  story: string;
  createdAt: string;
  proof: unknown;
}

/** A donor's promise to fund part of a bill, summarised for the UI. */

// Kept: still used by other files.
export type PledgeStatus = "draft" | "processing" | "paid" | "failed";

/** What the pledge sheet collects before any money moves. */

export type PledgeValidationCode =
  | "ok"
  | "empty"
  | "invalid"
  | "below-minimum"
  | "exceeds-balance"
  | "fully-funded";

/** Result of checking what someone typed into the amount field. */
