import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ShieldCheck, Trophy, X } from "lucide-react";

import {
  CURRENCY,
  createPledgeReference,
  formatNairaMinor,
  fromMinorUnits,
  toMinorUnits,
  toNairaInputValue,
  validatePledgeAmount,
} from "@/lib/payments";
import { getCurrentUser } from "@/services/auth";
import {
  LEADERBOARD_VISIBILITY_OPTIONS,
  setLeaderboardVisibility,
} from "@/services/leaderboard";
import { saveMyPledge } from "@/services/myPledges";
import { addPledge } from "@/services/pledges";

export type PledgeSheetProps = {
  causeId: string;
  causeTitle: string;
  /** Amount still owed on the bill, in Naira. */
  amountNeeded?: number;
  /** Overrides the trigger button copy. */
  triggerLabel?: string;
};

/** Where a signed-out donor's leaderboard choice is remembered. */
const GUEST_VISIBILITY_KEY = "odogwu.leaderboard-visibility.v1";

/** Default amount offered when the sheet opens, in Naira. */
const DEFAULT_PLEDGE_NAIRA_MINOR = 100000; // ₦1,000

/**
 * The label shown for a visibility choice. Shared by the radio list and the
 * confirmation panel so both always say the exact same thing.
 */
function visibilityLabel(showName: boolean): string {
  const option = LEADERBOARD_VISIBILITY_OPTIONS.find((entry) => entry.value === showName);
  return option?.label ?? (showName ? "Show my name" : "Don't rank me");
}

/** Read the remembered guest choice (default: do not rank me). */
function readGuestVisibility(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUEST_VISIBILITY_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remember the choice locally so a guest keeps it between visits. */
function writeGuestVisibility(showName: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_VISIBILITY_KEY, String(showName));
  } catch {
    /* storage can be unavailable in private mode - the session still works */
  }
}

/**
 * Persist the ranking choice.
 *
 * A signed-in donor's choice belongs to their account (the leaderboard service
 * writes it through row level security); a visitor keeps it locally until they
 * sign in. A failed write never blocks the pledge itself, but the local copy is
 * always written first so the sheet can honestly echo what was chosen.
 */
async function persistVisibility(showName: boolean): Promise<void> {
  writeGuestVisibility(showName);

  try {
    if (!getCurrentUser()) return;
    await setLeaderboardVisibility(showName);
  } catch {
    /* guest, offline or refused write: the local copy still holds the choice */
  }
}

/** Who the pledge should name on the receipt. */
function donorIdentity(): { name: string; email?: string } {
  try {
    const user = getCurrentUser();
    if (user) {
      const name = user.fullName?.trim() || user.email;
      return { name, email: user.email };
    }
  } catch {
    /* a missing session is not an error: record an anonymous donor */
  }
  return { name: "Anonymous donor" };
}

type Settlement = { amountMinor: number; reference: string };

type Status = "idle" | "processing" | "paid";

/**
 * The pledge sheet opened from a bill page.
 *
 * It collects the amount and the leaderboard privacy choice in one place, so a
 * donor decides whether their giving total is published *before* any money is
 * recorded. The chosen option is shown again on the confirmation panel, which
 * is what makes "Don't rank me" verifiable after submitting.
 */
export function PledgeSheet({
  causeId,
  causeTitle,
  amountNeeded,
  triggerLabel = "Pledge to this bill",
}: PledgeSheetProps) {
  const [open, setOpen] = useState(false);
  const [showName, setShowName] = useState<boolean>(() => readGuestVisibility());
  const [status, setStatus] = useState<Status>("idle");
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Everything the sheet reasons about is money in kobo; Naira only exists in
  // the strings printed back to the donor.
  const balanceMinor = useMemo(() => {
    const naira = Number(amountNeeded);
    if (!Number.isFinite(naira) || naira <= 0) return 0;
    return toMinorUnits(naira);
  }, [amountNeeded]);

  const hasKnownBalance = balanceMinor > 0;

  // Without a known balance the only ceiling is "more than ₦0", so the shared
  // validator still enforces the minimum pledge instead of reporting the bill
  // as fully funded.
  const ceilingMinor = hasKnownBalance ? balanceMinor : Number.MAX_SAFE_INTEGER;

  const [amountInput, setAmountInput] = useState(() =>
    hasKnownBalance
      ? toNairaInputValue(Math.min(balanceMinor, DEFAULT_PLEDGE_NAIRA_MINOR))
      : toNairaInputValue(DEFAULT_PLEDGE_NAIRA_MINOR),
  );
  const [touched, setTouched] = useState(false);

  const validation = useMemo(
    () => validatePledgeAmount(amountInput, ceilingMinor),
    [amountInput, ceilingMinor],
  );

  const liveError =
    touched || validation.code === "exceeds-balance" ? validation.message : null;
  const shownError = error ?? liveError;

  const resetSheet = () => {
    setStatus("idle");
    setSettlement(null);
    setError(null);
    setTouched(false);
    setAmountInput(
      hasKnownBalance
        ? toNairaInputValue(Math.min(balanceMinor, DEFAULT_PLEDGE_NAIRA_MINOR))
        : toNairaInputValue(DEFAULT_PLEDGE_NAIRA_MINOR),
    );
  };

  const openSheet = () => {
    resetSheet();
    setOpen(true);
  };

  const closeSheet = () => setOpen(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "processing") return;

    setTouched(true);
    setError(null);

    // Never record a pledge the shared Naira math has rejected.
    if (validation.code !== "ok") return;

    setStatus("processing");

    try {
      // A short pause mirrors the payment popup closing so the button's busy
      // state is visible rather than flickering.
      await new Promise((resolve) => setTimeout(resolve, 150));

      const reference = createPledgeReference();
      const paidAt = new Date().toISOString();
      const donor = donorIdentity();

      const writePledge = addPledge as unknown as (
        input: Record<string, unknown>,
      ) => { reference?: string } | undefined;

      const created = writePledge({
        causeId,
        amount: fromMinorUnits(validation.amountMinor),
        amountMinor: validation.amountMinor,
        currency: CURRENCY,
        reference,
        donorName: donor.name,
        donorEmail: donor.email,
        status: "paid",
        paidAt,
      });

      const settledReference = created?.reference ?? reference;

      // Keep a copy against the signed-in account so "My pledges" follows them.
      void saveMyPledge({
        causeId,
        causeTitle,
        amountNaira: fromMinorUnits(validation.amountMinor),
        reference: settledReference,
      }).catch(() => {});

      // Record the privacy choice next to the pledge it belongs to.
      await persistVisibility(showName);

      setSettlement({ amountMinor: validation.amountMinor, reference: settledReference });
      setStatus("paid");
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.trim()
          ? caught.message
          : "We could not record your pledge. Please try again.",
      );
      setStatus("idle");
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="pledge-sheet-trigger"
        onClick={openSheet}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSheet();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pledge-sheet-title"
            data-testid="pledge-sheet"
            className="max-h-dvh w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="pledge-sheet-title"
                  className="text-lg font-bold tracking-tight text-foreground"
                >
                  Pledge to {causeTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasKnownBalance
                    ? `${formatNairaMinor(balanceMinor)} still owed on this bill.`
                    : "Enter the amount you want to give towards this bill."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close pledge sheet"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {status === "paid" && settlement ? (
              <div data-testid="pledge-success" className="mt-5 space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  Pledge recorded
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You pledged{" "}
                  <span className="font-semibold text-foreground">
                    {formatNairaMinor(settlement.amountMinor)}
                  </span>{" "}
                  to {causeTitle}. Reference:{" "}
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {settlement.reference}
                  </span>
                </p>
                <p
                  data-testid="pledge-privacy-choice"
                  className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground"
                >
                  {visibilityLabel(showName)}
                </p>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="pledge-amount"
                    className="mb-1 block text-sm font-medium text-foreground"
                  >
                    Amount
                  </label>
                  <input
                    id="pledge-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountInput}
                    onChange={(event) => {
                      setAmountInput(event.target.value);
                      setError(null);
                    }}
                    onBlur={() => setTouched(true)}
                    aria-invalid={shownError ? true : undefined}
                    aria-describedby={shownError ? "pledge-amount-error" : undefined}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="1000"
                  />
                  {shownError ? (
                    <p
                      id="pledge-amount-error"
                      role="alert"
                      data-testid="pledge-error"
                      className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {shownError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pledge any amount from ₦100{hasKnownBalance ? " up to the remaining balance" : ""}.
                    </p>
                  )}
                </div>

                <fieldset className="rounded-xl border border-border bg-muted/40 p-4">
                  <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                    <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                    Leaderboard privacy
                  </legend>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Choose whether your giving total appears on the public Top Odogwus board.
                  </p>

                  <div className="mt-3 space-y-2">
                    {LEADERBOARD_VISIBILITY_OPTIONS.map((option) => (
                      <label
                        key={option.label}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent"
                      >
                        <input
                          type="radio"
                          name="leaderboard-visibility"
                          value={String(option.value)}
                          checked={showName === option.value}
                          onChange={() => setShowName(option.value)}
                          data-testid={
                            option.value
                              ? "pledge-privacy-show-name"
                              : "pledge-privacy-dont-rank"
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">
                            {option.label}
                          </span>
                          <span className="block text-xs leading-relaxed text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button
                  type="submit"
                  data-testid="pledge-submit"
                  disabled={status === "processing"}
                  aria-busy={status === "processing"}
                  className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {status === "processing" ? "Recording your pledge…" : "Pledge now"}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Your choice is saved with the pledge and can be changed later.
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default PledgeSheet;
