/**
 * Naira (NGN) formatting helpers.
 *
 * All money in Odogwu is displayed in Nigerian Naira. We format values
 * ourselves instead of relying on `Intl` currency styling so that the output
 * is deterministic across browsers and Node (SSR):
 *
 *   formatNaira(25000)   -> "₦25,000"
 *   formatNaira(25000.5) -> "₦25,000.50"
 *   formatNaira(-1500)   -> "-₦1,500"
 */

export const NAIRA_SYMBOL = "₦";

/**
 * Coerce arbitrary input (number, numeric string, null/undefined) into a
 * finite number. Anything unusable becomes 0 so the UI never renders `NaN`.
 */
export function toAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    // Allow input like "25,000", "₦25,000" or "25000.50".
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Insert thousands separators into an integer string ("25000" -> "25,000").
 */
function groupThousands(value: number, fractionDigits: number): string {
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction && fraction.length > 0 ? `${grouped}.${fraction}` : grouped;
}

/**
 * Format a monetary amount in Nigerian Naira.
 * Whole naira amounts render without decimals; amounts with kobo keep 2 places.
 */
export function formatNaira(amount: number | string | null | undefined): string {
  const numeric = toAmount(amount);
  const rounded = Math.round(numeric * 100) / 100;
  const hasFraction = Math.abs(rounded % 1) > 0;
  const body = groupThousands(rounded, hasFraction ? 2 : 0);
  return rounded < 0 ? `-${NAIRA_SYMBOL}${body}` : `${NAIRA_SYMBOL}${body}`;
}

/**
 * Parse a user-entered Naira string (e.g. "25,000") back into a number.
 * Returns `null` when the input is not a usable positive amount.
 */
export function parseNaira(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = toAmount(value);
  return parsed > 0 ? parsed : null;
}
