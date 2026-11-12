import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AUTH_CHANGE_EVENT } from "@/lib/authStore";
import { getCurrentUser, type AccountUser } from "@/services/auth";
import { createBillRequest } from "@/services/causes";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Request a bill \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Submit an unpaid bill with proof so a verified cause can fund it with transparent, receipted pledges.",
      },
    ],
  }),
  component: CreateRequestPage,
});

function formatNairaPreview(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return `\u20A6${Number(digits).toLocaleString("en-US")}`;
}

function digitsOnly(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

type FormErrors = {
  proof?: string;
  title?: string;
  amount?: string;
  form?: string;
};

type SubmitStatus = "idle" | "submitting" | "submitted";

/**
 * Read the signed-in account straight from the browser account store.
 *
 * The page deliberately does not depend on a provider being mounted above it:
 * the store is the source of truth for the session, and listening to its change
 * event keeps the notice in step with a sign-in or sign-out in another tab.
 */
function readAccount(): AccountUser | null {
  try {
    return getCurrentUser();
  } catch {
    return null;
  }
}

function CreateRequestPage() {
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [proofName, setProofName] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  // The visible "Choose file" button drives the hidden file input.
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate after mount and stay in step with the account store.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => setAccount(readAccount());
    sync();

    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signedIn = Boolean(account);
  const preview = formatNairaPreview(amount);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProofName(file ? file.name : null);
    setErrors((prev) => ({ ...prev, proof: undefined }));
  };

  const removeProof = () => {
    setProofName(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: FormErrors = {};
    if (!proofName) next.proof = "Please upload your bill proof";
    if (!title.trim()) next.title = "Please enter a bill title";
    const amountValue = digitsOnly(amount);
    if (!amountValue) next.amount = "Please enter the amount owed";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!signedIn) {
      setErrors({ form: "Please sign in before submitting your request." });
      return;
    }

    setStatus("submitting");

    try {
      createBillRequest({
        title: title.trim(),
        amountOwed: amountValue,
        description: description.trim() || null,
        proofFileName: proofName ?? "",
      });
    } catch (error) {
      // A rejected save must not look like a successful submission: keep the
      // requester on the form with the exact reason so the request is never
      // silently dropped before it reaches the queue.
      setStatus("idle");
      setErrors({
        form:
          error instanceof Error && error.message
            ? error.message
            : "We could not save your request. Please try again.",
      });
      return;
    }

    setStatus("submitted");
  };

  if (status === "submitted") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">Pending verification</h1>
        <p className="mt-3 text-slate-600">
          Your request <span className="font-medium text-slate-900">{title.trim()}</span> for{" "}
          <span className="font-medium text-slate-900">{preview}</span> has been submitted with your
          bill proof. A verifier reviews it before it appears in the feed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to home
          </Link>
          <Link
            to="/feed"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Browse bills
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        Request a bill
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Upload proof of an unpaid bill. Once a verifier confirms it, donors can fund it through
        verified causes and every pledge gets a receipt.
      </p>

      {/* The sign-in notice sits above the form: a visitor can see and fill the
          request straight away, but only a signed-in account can submit it. */}
      {!signedIn ? (
        <div
          data-testid="create-signin-gate"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
        >
          <h2 className="font-semibold">Sign in to create a request</h2>
          <p className="mt-1 leading-relaxed text-emerald-800">
            You can fill in the bill details below, but the request is only submitted from your
            account so verifiers can reach you about the bill.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/login"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Create an account
            </Link>
          </div>
        </div>
      ) : (
        <p
          data-testid="create-signed-in"
          className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          Signed in as <span className="font-medium text-slate-900">{account?.email}</span>. This
          request will be linked to your account.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="bill-title" className="block text-sm font-medium text-slate-800">
            Bill title
          </label>
          <input
            id="bill-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Lagos General Hospital — malaria treatment"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="amount-owed" className="block text-sm font-medium text-slate-800">
            Amount owed
          </label>
          <input
            id="amount-owed"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="25000"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {preview && (
            <span className="block text-sm font-medium text-emerald-700">{preview}</span>
          )}
          {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="bill-description" className="block text-sm font-medium text-slate-800">
            What is this bill for?
          </label>
          <textarea
            id="bill-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short note about the treatment, the hospital and what is still unpaid."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-slate-800">Bill proof</span>
          <div
            data-testid="proof-upload"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
          >
            <button
              type="button"
              onClick={() => proofInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Choose file
            </button>
            <input
              ref={proofInputRef}
              id="bill-proof"
              type="file"
              accept="image/*,application/pdf"
              aria-label="Bill proof"
              onChange={handleFile}
              className="sr-only"
            />
            {proofName ? (
              <span
                data-testid="proof-upload-status"
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span data-testid="proof-uploaded" className="font-medium text-emerald-700">
                  Proof uploaded
                </span>
                <span data-testid="proof-file-name" className="text-slate-600">
                  {proofName}
                </span>
                <button
                  type="button"
                  onClick={removeProof}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Remove proof
                </button>
              </span>
            ) : (
              <span className="text-sm text-slate-500">
                No file chosen yet — PNG, JPG or PDF up to 10 MB
              </span>
            )}
          </div>
          {errors.proof && <p className="text-sm text-red-600">{errors.proof}</p>}
        </div>

        {errors.form && <p className="text-sm font-medium text-red-600">{errors.form}</p>}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Submit for verification
        </button>
      </form>
    </div>
  );
}