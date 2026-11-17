import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, ShieldCheck, X } from "lucide-react";

import {
  CURRENCY,
  formatNairaMinor,
  fromMinorUnits,
  toMinorUnits,
  toNairaInputValue,
} from "@/lib/payments";

/**
 * PledgeSheet - the bridge between a bill page and real money.
 *
 * The sheet collects the one thing checkout cannot guess (how much this donor
 * wants to give) and hands it to `/checkout` as search params:
 *
 *   /checkout?cause=<bill id>&amount=<naira>
 *
 * `cause` keeps the pledge attached to the bill the donor was reading, and
 * `amount` lets checkout open on exactly the figure that was typed instead of
 * defaulting to the whole remaining balance. The Paystack charge itself is only
 * ever started from checkout (server-side initialization), so nothing here
 * touches money, keys or the payment ledger.
 *
 * The prop surface is deliberately forgiving: the sheet is rendered from the
 * bill page, which may own the open/closed state or let the sheet own it, may
 * pass the bill as an id or as an object, and may want to intercept the hand-off
 * (for example to keep the draft amount in its own store) via `onContinue`.
 */

/** Smallest pledge checkout accepts, in kobo (N100). */
const MIN_PLEDGE_MINOR = 10_000;

/** What the sheet hands to checkout (and to any `onContinue` / `onPledge`). */
export interface PledgeSheetPayment {
  /** Bill being pledged to (may be empty when the bill page did not pass one). */
  causeId: string;
  /** Amount in naira (display value). */
  amount: number;
  /** Amount in kobo (exact value, what checkout/Paystack will use). */
  amountMinor: number;
  currency: string;
}

/**
 * Props are intentionally permissive (the trailing index signature lets the
 * bill page pass extra attributes such as `className` on the wrapper) so this
 * component can sit inside an existing page without changing its call site.
 */
export interface PledgeSheetProps {
  causeId?: string;
  cause_id?: string;
  billId?: string;
  bill_id?: string;
  id?: string;
  cause?:
    | { id?: string; title?: string; amountNeeded?: number; amount_needed?: number }
    | string;
  causeTitle?: string;
  title?: string;
  /** Amount still owed on the bill, in naira (any of these aliases works). */
  remaining?: number;
  amountRemaining?: number;
  remainingAmount?: number;
  amountNeeded?: number;
  amount_needed?: number;
  /** Controlled visibility. */
  open?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  /** Called instead of navigating when the page wants to own the hand-off. */
  onPledge?: (payment: PledgeSheetPayment) => void;
  onContinue?: (payment: PledgeSheetPayment) => void;
  /** Hide the built-in trigger when the page already renders its own. */
  hideTrigger?: boolean;
  triggerLabel?: string;
  className?: string;
  [key: string]: unknown;
}

interface ParsedAmount {
  naira: number;
  minor: number;
}

/** First non-empty string out of the candidates, trimmed. */
function firstNonEmpty(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

/** First positive finite number out of the candidates, or 0. */
function firstPositiveNumber(...values: Array<unknown>): number {
  for (const value of values) {
    const parsed =
      typeof value === "string"
        ? Number(value.replace(/[^0-9.]/g, ""))
        : typeof value === "number"
          ? value
          : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/**
 * Read a typed naira amount (commas, spaces and a currency sign are tolerated)
 * and return it in both naira and kobo. Returns null for an empty or invalid
 * entry so the caller can keep the primary action disabled instead of scolding
 * somebody who has not finished typing.
 */
function parseNairaInput(value: string): ParsedAmount | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  // "1.2.3" is not a number: reject it rather than silently truncating.
  if ((cleaned.match(/\./g) ?? []).length > 1) return null;

  const naira = Number(cleaned);
  if (!Number.isFinite(naira) || naira <= 0) return null;

  const minor = Math.round(toMinorUnits(naira));
  if (!Number.isFinite(minor) || minor <= 0) return null;

  return { naira, minor };
}

/** Human explanation for an amount that cannot be carried into checkout. */
function validateAmount(
  parsed: ParsedAmount | null,
  remainingMinor: number,
): string | null {
  if (!parsed) return null;

  if (parsed.minor < MIN_PLEDGE_MINOR) {
    return `Pledge at least ${formatNairaMinor(MIN_PLEDGE_MINOR)}.`;
  }

  if (remainingMinor > 0 && parsed.minor > remainingMinor) {
    return `That is more than the ${formatNairaMinor(remainingMinor)} still owed on this bill.`;
  }

  return null;
}

export function PledgeSheet(props: PledgeSheetProps) {
  const navigate = useNavigate();
  const rawId = useId();
  const fieldId = `pledge-amount-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* ------------------------------------------------------------------ */
  /* Bill identity and the amount still owed                            */
  /* ------------------------------------------------------------------ */

  const causeObject =
    typeof props.cause === "object" && props.cause !== null
      ? (props.cause as {
          id?: string;
          title?: string;
          amountNeeded?: number;
          amount_needed?: number;
        })
      : null;

  const causeId =
    firstNonEmpty(
      typeof props.cause === "string" ? props.cause : undefined,
      causeObject?.id,
      props.causeId,
      props.cause_id,
      props.billId,
      props.bill_id,
      props.id,
    ) ?? "";

  const causeTitle =
    firstNonEmpty(props.causeTitle, props.title, causeObject?.title) ?? "";

  const remainingNaira = firstPositiveNumber(
    props.remaining,
    props.amountRemaining,
    props.remainingAmount,
    props.amountNeeded,
    props.amount_needed,
    causeObject?.amountNeeded,
    causeObject?.amount_needed,
  );
  const remainingMinor =
    remainingNaira > 0 ? Math.round(toMinorUnits(remainingNaira)) : 0;

  /* ------------------------------------------------------------------ */
  /* Open / closed state (controlled when the page passes `open`)        */
  /* ------------------------------------------------------------------ */

  const controlled = props.open !== undefined || props.isOpen !== undefined;
  const controlledOpen = Boolean(props.open ?? props.isOpen);
  const [internalOpen, setInternalOpen] = useState(Boolean(props.defaultOpen));
  const isSheetOpen = controlled ? controlledOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (!controlled) setInternalOpen(false);
    props.onClose?.();
    props.onOpenChange?.(false);
  }, [controlled, props]);

  const handleOpen = useCallback(() => {
    if (!controlled) setInternalOpen(true);
    props.onOpenChange?.(true);
  }, [controlled, props]);

  /* ------------------------------------------------------------------ */
  /* Amount entry + validation                                          */
  /* ------------------------------------------------------------------ */

  const [amountInput, setAmountInput] = useState("");

  const parsed = useMemo(() => parseNairaInput(amountInput), [amountInput]);
  const errorMessage = validateAmount(parsed, remainingMinor);
  const canContinue = parsed !== null && errorMessage === null;

  // Focus the field as soon as the sheet opens so a phone keyboard appears
  // straight away - the amount is the only thing this step collects.
  useEffect(() => {
    if (!isSheetOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isSheetOpen]);

  // Escape closes the sheet, matching the rest of the app's overlays.
  useEffect(() => {
    if (!isSheetOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSheetOpen, handleClose]);

  /** Close on a backdrop tap, but never on a tap inside the panel. */
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleClose();
  };

  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsed || errorMessage) return;

    const payment: PledgeSheetPayment = {
      causeId,
      amount: fromMinorUnits(parsed.minor),
      amountMinor: parsed.minor,
      currency: CURRENCY,
    };

    // The page may want to own the hand-off (e.g. keep a draft and route itself).
    if (typeof props.onContinue === "function") {
      props.onContinue(payment);
      handleClose();
      return;
    }

    if (typeof props.onPledge === "function") {
      props.onPledge(payment);
      handleClose();
      return;
    }

    // Carry both the bill and the chosen amount into checkout. `amount` is a
    // clean numeric string (no grouping separators) so the URL stays quotable.
    const search: { cause?: string; amount?: string } = {
      amount: toNairaInputValue(payment.amountMinor),
    };
    if (causeId) search.cause = causeId;

    // Navigate first, then close. Closing the sheet unmounts this form on the
    // next render, so the hand-off to /checkout is issued before that happens
    // and the checkout page (and its unpaid status line) always mounts.
    navigate({ to: "/checkout", search });
    handleClose();
  };

  const showTrigger = props.hideTrigger !== true;

  return (
    <>
      {showTrigger ? (
        <button
          type="button"
          data-testid="pledge-trigger"
          onClick={handleOpen}
          aria-haspopup="dialog"
          aria-expanded={isSheetOpen}
          className={
            props.className ??
            "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          }
        >
          {props.triggerLabel ?? "Pledge"}
        </button>
      ) : null}

      {isSheetOpen ? (
        <div
          role="presentation"
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldId}-title`}
            data-testid="pledge-sheet"
            onClick={handlePanelClick}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Pledge
                </p>
                <h2
                  id={`${fieldId}-title`}
                  className="mt-1 truncate text-lg font-bold tracking-tight text-foreground"
                >
                  {causeTitle || "How much would you like to give?"}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={fieldId}
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Amount
                </label>

                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground"
                  >
                    ₦
                  </span>
                  <input
                    id={fieldId}
                    ref={inputRef}
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    aria-invalid={errorMessage ? true : undefined}
                    aria-describedby={
                      errorMessage ? `${fieldId}-error` : `${fieldId}-hint`
                    }
                    placeholder={
                      remainingMinor > 0 ? toNairaInputValue(remainingMinor) : "25000"
                    }
                    data-testid="pledge-amount"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {errorMessage ? (
                  <p
                    id={`${fieldId}-error`}
                    role="alert"
                    data-testid="pledge-amount-error"
                    className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {errorMessage}
                  </p>
                ) : (
                  <p id={`${fieldId}-hint`} className="mt-1 text-xs text-muted-foreground">
                    {remainingMinor > 0
                      ? `This bill still needs ${formatNairaMinor(remainingMinor)}.`
                      : "Pledge any amount from ₦100 upwards."}
                  </p>
                )}
              </div>

              {parsed && !errorMessage ? (
                <p
                  data-testid="pledge-summary"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  You are pledging{" "}
                  <span className="font-semibold">{formatNairaMinor(parsed.minor)}</span>
                  {causeTitle ? <> to {causeTitle}</> : null} in {CURRENCY}.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canContinue}
                data-testid="pledge-continue"
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                Continue to payment
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Secured by Paystack. Odogwu never sees your card details.
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Aliases so an existing bill page can import the sheet under either name. */
export const PledgeDialog = PledgeSheet;
export const PledgeForm = PledgeSheet;

export default PledgeSheet;
