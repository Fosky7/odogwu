import { useState } from "react";
import { Check, FileText, X } from "lucide-react";

import { usePendingBillRequests } from "@/hooks/useBillFeed";
import { formatNairaAmount, type BillRequest } from "@/lib/billStore";
import {
  APPROVED_FLASH,
  REJECTED_FLASH,
  approveRequest,
  formatSubmittedAt,
  rejectRequest,
} from "@/services/admin";

const viewProofClass =
  "inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent";
const approveClass =
  "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90";
const rejectClass =
  "inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10";

/**
 * The admin review queue.
 *
 * Each pending request can be inspected ("View proof" reveals the submitted
 * receipt image) and then approved — which publishes it to the public feed — or
 * rejected. Because the list is read from the pending slice of the shared bill
 * ledger, a decided request disappears from the queue immediately and the feed
 * picks it up on the very next render.
 */
export function VerificationQueue() {
  const pending = usePendingBillRequests();
  const [openProofId, setOpenProofId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  /**
   * Record a decision. The store itself is synchronous, so the row is removed
   * from `pending` before this function returns; the guard only covers the
   * (impossible in practice) case of a request vanishing mid-review.
   */
  function decide(request: BillRequest, decision: "approved" | "rejected"): void {
    const updated =
      decision === "approved" ? approveRequest(request.id) : rejectRequest(request.id);

    if (!updated) {
      setFlash("That request is no longer in the queue.");
      return;
    }

    setOpenProofId((current) => (current === request.id ? null : current));
    setFlash(
      decision === "approved"
        ? `${APPROVED_FLASH} — ${request.title} is now live on the public feed.`
        : `${REJECTED_FLASH} — ${request.title} stays out of the public feed.`,
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Announcement region: a reviewer always gets an explicit confirmation
          that a decision was recorded. */}
      {flash ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="admin-flash"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
        >
          {flash}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <p
          data-testid="admin-empty"
          className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground"
        >
          No requests are waiting for review. Approved bills are already on the public feed.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pending.length} {pending.length === 1 ? "request is" : "requests are"} waiting for a
            decision.
          </p>

          <ul className="space-y-4">
            {pending.map((request) => {
              const isProofOpen = openProofId === request.id;
              const proofPanelId = `proof-${request.id}`;

              return (
                <li
                  key={request.id}
                  data-testid="verification-request"
                  data-request-id={request.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-foreground">{request.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.beneficiary} · {request.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {formatSubmittedAt(request.createdAt)} · {request.category}
                      </p>
                    </div>
                    <p className="text-base font-bold text-foreground">
                      {formatNairaAmount(request.amount)}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {request.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenProofId(isProofOpen ? null : request.id)}
                      aria-expanded={isProofOpen}
                      aria-controls={proofPanelId}
                      className={viewProofClass}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" /> View proof
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(request, "approved")}
                      className={approveClass}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(request, "rejected")}
                      className={rejectClass}
                    >
                      <X className="h-4 w-4" aria-hidden="true" /> Reject
                    </button>
                  </div>

                  {isProofOpen ? (
                    <div
                      id={proofPanelId}
                      data-testid="proof-panel"
                      className="mt-4 rounded-xl border border-border bg-background p-4"
                    >
                      <h3 className="text-sm font-semibold text-foreground">Proof of payment</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{request.proofLabel}</p>
                      {/* The receipt image attached to the submission. It is a
                          real, self-contained document so reviewers always see
                          something instead of a broken asset. */}
                      <img
                        src={request.proofUrl}
                        alt={`Proof of payment for ${request.title}`}
                        className="mt-3 w-full max-w-md rounded-lg border border-border bg-card"
                      />
                      <button
                        type="button"
                        onClick={() => setOpenProofId(null)}
                        className="mt-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Hide proof
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
