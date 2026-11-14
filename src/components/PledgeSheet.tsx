import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";

import {
  formatNairaMinor,
  toNairaInputValue,
  validatePledgeAmount,
} from "@/lib/payments";

/** The single title every surface (feed deck, home deck) shows for this sheet. */
export const PLEDGE_SHEET_TITLE = "Make a pledge";

/** Label of the action that hands the validated amount to the checkout. */
export const PLEDGE_SHEET_CONTINUE_LABEL = "Continue to payment";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export type PledgeSheetProps = {
  /** Whether the sheet is on screen. */
  open: boolean;
  /** Dismiss the sheet without moving any money. */
  onClose: () => void;
  /** Verified bill the pledge is for. */
  causeId: string;
  /** Human title of the bill, shown above the form. */
  causeTitle?: string;
  /** What the bill still owes, in kobo. Never negative. */
  remainingMinor: number;
  /**
   * Optional override: receive the validated amount (kobo) instead of being
   * routed to the Paystack checkout. Used when a caller wants to handle the
   * hand-off itself.
   */
  onContinue?: (amountMinor: number) => void;
};

/**
 * "Make a pledge" sheet.
 *
 * The amount field starts at the bill's remaining balance in Naira and stays a
 * plain, editable number: what a person types is kept exactly as typed (no
 * reformatting mid-keystroke), while the formatted Naira preview and the
 * validation copy underneath update live. A valid amount continues to the
 * Paystack checkout, which is the only place a charge is ever created — so
 * opening the sheet on its own never moves money.
 */
export function PledgeSheet({
  open,
  onClose,
  causeId,
  causeTitle = "Verified bill",
  remainingMinor,
  onContinue,
}: PledgeSheetProps) {
  const navigate = useNavigate();
  const amountRef = useRef<HTMLInputElement | null>(null);

  // The first open is already correct because the ledger it reads from is
  // synchronous; the effect below only matters when the sheet is reopened after
  // another pledge has changed the balance.
  const [amountInput, setAmountInput] = useState(() => toNairaInputValue(remainingMinor));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to a clean, prefilled state every time the sheet is opened (or the
  // balance changes while it is open after another pledge settles).
  useEffect(() => {
    if (!open) return;
    setAmountInput(toNairaInputValue(remainingMinor));
    setTouched(false);
    setError(null);
  }, [open, causeId, remainingMinor]);

  // Move focus into the amount field, close on Escape, and stop the page behind
  // the sheet from scrolling while it is up.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    amountRef.current?.focus();
    amountRef.current?.select();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  const validation = useMemo(
    () => validatePledgeAmount(amountInput, remainingMinor),
    [amountInput, remainingMinor],
  );

  // An overpayment is surfaced the moment it is typed (it is never a valid
  // intermediate state); the remaining copy waits until the field is left or the
  // person tries to continue, so typing "2" does not scold anyone.
  const liveError = touched || validation.code === "exceeds-balance" ? validation.message : null;
  const shownError = error ?? liveError;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (validation.code !== "ok") {
      setError(validation.message);
      return;
    }

    if (onContinue) {
      onContinue(validation.amountMinor);
      onClose();
      return;
    }

    // Hand the validated amount to the checkout, which owns the Paystack charge.
    const amount = toNairaInputValue(validation.amountMinor);
    onClose();
    await navigate({ to: "/checkout", search: { cause: causeId, amount } });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop: clicking it dismisses the sheet, same as the close button. */}
      <div
        data-testid="pledge-sheet-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pledge-sheet-title"
        data-testid="pledge-sheet"
        className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="pledge-sheet-title"
              data-testid="pledge-sheet-title"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {PLEDGE_SHEET_TITLE}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Funding <span className="font-medium text-foreground">{causeTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pledge sheet"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 flex items-baseline justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Remaining balance</span>
          <span data-testid="pledge-sheet-remaining" className="font-semibold text-foreground">
            {formatNairaMinor(remainingMinor)}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="pledge-sheet-amount" className={labelClass}>
              Amount
            </label>
            <input
              id="pledge-sheet-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              ref={amountRef}
              value={amountInput}
              onChange={(event) => {
                // Keep exactly what was typed; the preview below formats it.
                setAmountInput(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={shownError ? true : undefined}
              aria-describedby={
                shownError ? "pledge-sheet-amount-error" : "pledge-sheet-amount-hint"
              }
              className={inputClass}
              placeholder="25000"
            />

            {validation.amountMinor > 0 ? (
              <p className="mt-1 text-sm font-medium text-primary">
                {formatNairaMinor(validation.amountMinor)}
              </p>
            ) : null}

            {shownError ? (
              <p
                id="pledge-sheet-amount-error"
                role="alert"
                data-testid="pledge-sheet-error"
                className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {shownError}
              </p>
            ) : (
              <p id="pledge-sheet-amount-hint" className="mt-1 text-xs text-muted-foreground">
                Pledge any amount from ₦100 up to the remaining balance.
              </p>
            )}
          </div>

          <button
            type="submit"
            data-testid="pledge-sheet-continue"
            className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {PLEDGE_SHEET_CONTINUE_LABEL}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Payment is completed securely with Paystack. No money moves until then.
          </p>
        </form>
      </div>
    </div>
  );
}
