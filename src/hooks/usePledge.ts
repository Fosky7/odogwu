import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  CURRENCY,
  FALLBACK_DONOR_EMAIL,
  PAYSTACK_CHANNELS,
  loadPaystackInline,
  readPaystackPublicKey,
  type PaystackSuccessResponse,
} from "@/lib/payments";
import { getCurrentUser } from "@/services/auth";
import {
  PledgePaymentError,
  recordConfirmedPledge,
  startPledgePayment,
  verifyPledgePayment,
  type PledgePayment,
  type Receipt,
} from "@/services/pledges";

/** Lifecycle of one pledge attempt as the UI understands it. */
export type PledgeFlowStatus =
  | "idle"
  | "processing"
  | "paid"
  | "cancelled"
  | "failed";

/** Options accepted by the `usePledge` hook. */
export interface UsePledgeOptions {
  /** The verified bill the pledge belongs to. */
  causeId: string;
  /** Amount to charge, in kobo. */
  amountMinor: number;
  /** Signed-in donor name, when known. */
  donorName?: string | null;
  /** Signed-in donor email, when known. */
  donorEmail?: string | null;
  /** Where Paystack should redirect after the popup closes. */
  callbackUrl?: string;
  /** Navigate to `/receipt/:id` as soon as the server confirms payment. */
  navigateOnSuccess?: boolean;
  /** Called after Postgres has stored the payment as paid. */
  onPaid?: (receipt: Receipt, payment: PledgePayment) => void;
  /** Called when the donor closes the Paystack popup without paying. */
  onCancelled?: () => void;
  /** Called when the charge cannot start or cannot be verified. */
  onFailed?: (message: string) => void;
}

/** State and actions returned by `usePledge`. */
export interface UsePledgeResult {
  status: PledgeFlowStatus;
  /** Human-readable outcome, ready to print under the Pay button. */
  message: string | null;
  /** Technical detail for logs; never required to render the error. */
  error: string | null;
  payment: PledgePayment | null;
  receipt: Receipt | null;
  isProcessing: boolean;
  pay: () => Promise<void>;
  reset: () => void;
}

/** Resolve the donor identity from the session, falling back to the caller. */
async function resolveDonor(input: {
  donorName?: string | null;
  donorEmail?: string | null;
}): Promise<{ name: string | null; email: string | null }> {
  const providedName = (input.donorName ?? "").trim() || null;
  const providedEmail = (input.donorEmail ?? "").trim() || null;

  if (providedName && providedEmail) {
    return { name: providedName, email: providedEmail };
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      const accountName = (user.fullName ?? "").trim() || user.email;
      return {
        name: providedName ?? accountName,
        email: providedEmail ?? user.email,
      };
    }
  } catch {
    /* a missing/unreadable session is not an error: guest checkout is valid */
  }

  return { name: providedName, email: providedEmail };
}

/** Turn any thrown/invoked error shape into something worth logging. */
function describeError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      "";
    if (message) return message;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Drive one Paystack pledge from "Pay" to a server-confirmed receipt.
 *
 * Flow:
 *   1. The publishable key is resolved locally and a secret key is refused, so a
 *      misconfigured deployment never opens a half-configured popup.
 *   2. `paystack-initialize` creates the pending ledger row and returns the
 *      server-issued Paystack reference.
 *   3. Paystack Inline opens with only the publishable key, the amount in kobo
 *      and that reference (the loader lives in `@/lib/payments`).
 *   4. Closing the popup leaves the pledge unpaid and reports "Payment
 *      cancelled".
 *   5. A successful charge is verified by `paystack-verify`, which is the only
 *      path that can store the payment as paid. Only after that does the hook
 *      mint the local receipt and open `/receipt/:id`.
 *   6. Any failure keeps the Pay button available and reports "Could not start
 *      payment" or "Payment failed" without writing a paid pledge.
 */
export function usePledge(options: UsePledgeOptions): UsePledgeResult {
  const {
    causeId,
    amountMinor,
    donorName,
    donorEmail,
    callbackUrl,
    navigateOnSuccess = true,
    onPaid,
    onCancelled,
    onFailed,
  } = options;

  const navigate = useNavigate();

  const [status, setStatus] = useState<PledgeFlowStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PledgePayment | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus("idle");
    setMessage(null);
    setError(null);
    setPayment(null);
    setReceipt(null);
  }, []);

  const pay = useCallback(async () => {
    if (processingRef.current) return;
    if (!mountedRef.current) return;

    const trimmedCauseId = (causeId ?? "").trim();
    const roundedAmount = Math.round(Number(amountMinor ?? 0));

    if (!trimmedCauseId || !Number.isFinite(roundedAmount) || roundedAmount <= 0) {
      setStatus("failed");
      setMessage("Could not start payment");
      setError("A bill and a positive amount are required before a charge can start.");
      onFailed?.("Could not start payment");
      return;
    }

    // Only the publishable key may ever reach the browser. It is resolved (and a
    // secret key refused) BEFORE the server opens a charge, so a misconfigured
    // deployment cannot leave behind a pending row it can never complete.
    const publicKey = readPaystackPublicKey();
    if (!publicKey) {
      const detail =
        "Paystack is not configured for this deployment: set VITE_PAYSTACK_PUBLIC_KEY to the publishable key (pk_...).";
      setStatus("failed");
      setMessage("Could not start payment");
      setError(detail);
      onFailed?.("Could not start payment");
      return;
    }

    processingRef.current = true;
    setStatus("processing");
    setMessage(null);
    setError(null);
    setPayment(null);
    setReceipt(null);

    /** Which half of the flow failed, so checkout prints the right message. */
    let phase: "start" | "verify" = "start";

    try {
      const donor = await resolveDonor({ donorName, donorEmail });

      const started = await startPledgePayment({
        causeId: trimmedCauseId,
        amountMinor: roundedAmount,
        donorName: donor.name,
        donorEmail: donor.email,
        callbackUrl,
      });

      const inline = await loadPaystackInline();
      const reference = started.paystackReference ?? started.pledgeReference;
      const email = donor.email ?? FALLBACK_DONOR_EMAIL;

      const result = await new Promise<PaystackSuccessResponse | "cancelled">(
        (resolve) => {
          const handler = inline.setup({
            key: publicKey,
            email,
            amount: started.amountMinor > 0 ? started.amountMinor : roundedAmount,
            currency: started.currency || CURRENCY,
            ref: reference,
            channels: PAYSTACK_CHANNELS,
            metadata: {
              pledge_reference: started.pledgeReference,
              cause_id: trimmedCauseId,
              source: "odogwu-checkout",
            },
            callback: (response) => resolve(response ?? {}),
            onClose: () => resolve("cancelled"),
          });

          handler.openIframe();
        },
      );

      if (result === "cancelled") {
        if (!mountedRef.current) return;
        setStatus("cancelled");
        setMessage("Payment cancelled");
        onCancelled?.();
        return;
      }

      phase = "verify";
      const verificationReference = result.reference ?? reference;
      const verified = await verifyPledgePayment(
        started.pledgeReference,
        verificationReference,
      );

      if (!mountedRef.current) return;
      setPayment(verified);

      if (!verified.paid) {
        if (verified.status === "abandoned") {
          setStatus("cancelled");
          setMessage("Payment cancelled");
          onCancelled?.();
        } else {
          setStatus("failed");
          setMessage("Payment failed");
          onFailed?.("Payment failed");
        }
        return;
      }

      const confirmedReceipt = recordConfirmedPledge(verified);
      if (!mountedRef.current) return;

      setReceipt(confirmedReceipt);
      setStatus("paid");
      setMessage("Paid");
      onPaid?.(confirmedReceipt, verified);

      if (navigateOnSuccess) {
        navigate({ to: "/receipt/$id", params: { id: confirmedReceipt.id } });
      }
    } catch (caught) {
      if (!mountedRef.current) return;

      const isStart = phase === "start";
      const safeMessage =
        caught instanceof PledgePaymentError && isStart
          ? caught.message
          : isStart
            ? "Could not start payment"
            : "Payment failed";

      setStatus("failed");
      setMessage(safeMessage);
      setError(describeError(caught) || null);
      onFailed?.(safeMessage);
    } finally {
      processingRef.current = false;
    }
  }, [
    amountMinor,
    callbackUrl,
    causeId,
    donorEmail,
    donorName,
    navigate,
    navigateOnSuccess,
    onCancelled,
    onFailed,
    onPaid,
  ]);

  return {
    status,
    message,
    error,
    payment,
    receipt,
    isProcessing: status === "processing",
    pay,
    reset,
  };
}
