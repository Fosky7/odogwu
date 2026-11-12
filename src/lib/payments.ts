import type { CheckoutSummary, Currency, PledgeValidation } from "@/types/models";

/**
 * Naira payment math shared by the pledge sheet and the Paystack checkout.
 *
 * Two rules keep this file honest:
 *  1. Every amount that leaves this module for storage is an INTEGER number of
 *     kobo. Only `formatNairaMinor` and `toNairaInputValue` turn money back into
 *     something a person reads or types.
 *  2. Validation returns a stable, machine-readable code plus human copy, so the
 *     UI can show the right message and the tests can assert on real words
 *     (for example "Amount exceeds the remaining balance").
 */

export const CURRENCY: Currency = "NGN";

/** Kobo in one Naira. */
export const KOBO_PER_NAIRA = 100;

/** Smallest pledge we accept — ₦100, which also clears Paystack's floor. */
export const MIN_PLEDGE_MINOR = 10_000;

/** Paystack refuses charges below ₦100, so the pledge floor matches it. */
export const PAYSTACK_MIN_CHARGE_MINOR = 10_000;

/** Copy shared with the checkout summary and the specs. */
export const AMOUNT_DUE_LABEL = "Amount due";
export const AMOUNT_REQUIRED_MESSAGE = "Enter the amount you want to pledge";
export const AMOUNT_INVALID_MESSAGE = "Enter a valid amount, e.g. 5000";
export const AMOUNT_EXCEEDS_BALANCE_MESSAGE = "Amount exceeds the remaining balance";
export const FULLY_FUNDED_MESSAGE = "This bill is already fully funded.";
export const AMOUNT_BELOW_MINIMUM_MESSAGE = `Pledges start at ${formatNairaMinor(
  MIN_PLEDGE_MINOR,
)}.`;

/** Naira (a number, e.g. 25000) → whole kobo (2_500_000). */
export function toMinorUnits(naira: number): number {
  if (!Number.isFinite(naira)) return 0;
  return Math.round(naira * KOBO_PER_NAIRA);
}

/** Whole kobo (2_500_000) → Naira (25000). */
export function fromMinorUnits(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return Math.round(minor) / KOBO_PER_NAIRA;
}

/**
 * Print kobo as Naira for humans: 2_500_000 → "₦25,000", 2_550_050 → "₦25,500.50".
 *
 * The symbol and the grouping are built by hand (rather than trusting the
 * browser's ICU currency data) so the same string appears in every browser and
 * in assertions.
 */
export function formatNairaMinor(minor: number): string {
  const safeMinor = Number.isFinite(minor) ? Math.round(minor) : 0;
  const naira = safeMinor / KOBO_PER_NAIRA;
  const hasKobo = safeMinor % KOBO_PER_NAIRA !== 0;

  const printed = naira.toLocaleString("en-US", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `\u20A6${printed}`;
}

/**
 * Read what a person typed into the amount field.
 *
 * Accepts the things people actually type — "25000", "25,000", "₦ 25,000",
 * "25000.50" — and returns kobo, or null when the text is not a number at all
 * (for example "12.3.4" or "abc"). Empty text returns null; the caller decides
 * whether that means "required" or "use the suggested amount".
 */
export function parseNairaInput(raw: string): number | null {
  const cleaned = (raw ?? "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split(".");
  // More than one decimal point ("1.2.3") is not a number.
  if (parts.length > 2) return null;

  const whole = parts[0] ?? "";
  const fraction = (parts[1] ?? "").slice(0, 2);
  if (!whole && !fraction) return null;

  const naira = Number(`${whole || "0"}.${fraction || "0"}`);
  if (!Number.isFinite(naira)) return null;

  return toMinorUnits(naira);
}

/**
 * Render kobo back into the plain digits the amount field shows, so a prefilled
 * editable value stays a number instead of a formatted currency string.
 * 2_500_000 → "25000", 2_550_050 → "25500.50".
 */
export function toNairaInputValue(minor: number): string {
  const safeMinor = Number.isFinite(minor) ? Math.max(0, Math.round(minor)) : 0;
  if (safeMinor % KOBO_PER_NAIRA === 0) return String(safeMinor / KOBO_PER_NAIRA);
  return (safeMinor / KOBO_PER_NAIRA).toFixed(2);
}

/**
 * Build the checkout summary from a bill's goal and cleared total.
 * The remaining balance never goes negative, so an over-funded bill reads as
 * "fully funded" instead of showing a credit.
 */
export function buildCheckoutSummary(input: {
  causeId: string;
  causeTitle: string;
  goalMinor: number;
  raisedMinor: number;
}): CheckoutSummary {
  const goalMinor = Math.max(0, Math.round(input.goalMinor || 0));
  const raisedMinor = Math.max(0, Math.round(input.raisedMinor || 0));
  const remainingMinor = Math.max(0, goalMinor - raisedMinor);

  return {
    causeId: input.causeId,
    causeTitle: input.causeTitle,
    goalMinor,
    raisedMinor,
    remainingMinor,
    formattedGoal: formatNairaMinor(goalMinor),
    formattedRaised: formatNairaMinor(raisedMinor),
    formattedRemaining: formatNairaMinor(remainingMinor),
    isFullyFunded: remainingMinor === 0,
  };
}

/**
 * Validate a typed pledge amount against what is still owed on the bill.
 *
 * Order matters: an amount above the balance is reported before the minimum
 * rule, because "you cannot pay more than is owed" is the more useful message
 * for someone typing a large number by mistake.
 */
export function validatePledgeAmount(
  rawInput: string,
  remainingMinor: number,
): PledgeValidation {
  const trimmed = (rawInput ?? "").trim();

  if (!trimmed) {
    return { code: "empty", message: AMOUNT_REQUIRED_MESSAGE, amountMinor: 0 };
  }

  const amountMinor = parseNairaInput(trimmed);
  if (amountMinor === null) {
    return { code: "invalid", message: AMOUNT_INVALID_MESSAGE, amountMinor: 0 };
  }

  const remaining = Number.isFinite(remainingMinor) ? Math.max(0, Math.round(remainingMinor)) : 0;

  if (remaining === 0) {
    return { code: "fully-funded", message: FULLY_FUNDED_MESSAGE, amountMinor };
  }

  if (amountMinor > remaining) {
    return {
      code: "exceeds-balance",
      message: AMOUNT_EXCEEDS_BALANCE_MESSAGE,
      amountMinor,
    };
  }

  if (amountMinor < MIN_PLEDGE_MINOR) {
    return { code: "below-minimum", message: AMOUNT_BELOW_MINIMUM_MESSAGE, amountMinor };
  }

  return { code: "ok", message: null, amountMinor };
}

/** A short, quotable Paystack reference for a fresh pledge. */
export function createPledgeReference(now: number = Date.now()): string {
  const stamp = now.toString(36).toUpperCase();
  const noise = Math.floor(Math.random() * 36 ** 3)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `ODG-${stamp}-${noise}`;
}
