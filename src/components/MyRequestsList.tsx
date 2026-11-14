import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import type { DashboardRequest } from "@/services/users";

export type MyRequestsListProps = {
  /** Requests the signed-in beneficiary submitted, newest first. */
  requests: DashboardRequest[];
};

/** Friendly, stable date copy for a request row. */
function submittedLabel(value: string | null): string {
  if (!value) return "Submitted recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Submitted recently";
  return `Submitted ${date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
}

/** Friendly verification label, so a raw status never leaks into the UI. */
function statusLabel(status: string): string {
  const key = status.toLowerCase();
  if (key.includes("pending") || key.includes("review")) {
    return "Pending verification";
  }
  if (key.includes("verified") || key.includes("approved")) {
    return "Verified";
  }
  if (key.includes("reject")) {
    return "Rejected";
  }
  return status;
}

/** Status pill colours, driven by the design tokens only. */
function statusClassName(status: string): string {
  const key = status.toLowerCase();
  if (key.includes("verified") || key.includes("approved")) {
    return "bg-primary/10 text-primary";
  }
  if (key.includes("reject")) {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-accent text-accent-foreground";
}

function RequestRow({ request }: { request: DashboardRequest }) {
  const progress = Math.max(0, Math.min(100, request.percentFunded));

  return (
    <li
      data-testid="request-row"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            data-testid="request-title"
            className="truncate text-base font-semibold text-foreground"
          >
            {request.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {submittedLabel(request.createdAt)}
            {request.proofFileName ? ` · Proof: ${request.proofFileName}` : ""}
          </p>
        </div>

        <span
          data-testid="request-status"
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(
            request.status,
          )}`}
        >
          {statusLabel(request.status)}
        </span>
      </div>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={`Funding progress for ${request.title}`}
          data-testid="request-progress"
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress}% funded</p>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Raised</dt>
            <dd
              data-testid="request-raised"
              className="font-semibold text-foreground"
            >
              {request.raisedLabel}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd
              data-testid="request-remaining"
              className="font-semibold text-foreground"
            >
              {request.remainingLabel}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Amount owed</dt>
            <dd
              data-testid="request-amount-owed"
              className="font-semibold text-foreground"
            >
              {request.amountOwedLabel}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

/**
 * "My requests" for the beneficiary dashboard: each submitted bill shows its
 * verification status plus a funding progress bar with the Raised, Remaining
 * and Amount owed totals in Naira.
 */
export function MyRequestsList({ requests }: MyRequestsListProps) {
  return (
    <section aria-labelledby="my-requests-heading" data-testid="my-requests">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="my-requests-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          My requests
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Bills you submitted for verification and how much of each one donors have
        funded so far.
      </p>

      {requests.length === 0 ? (
        <div
          data-testid="my-requests-empty"
          className="mt-4 rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">No requests yet</p>
          <p className="mt-1">
            Submit an unpaid bill with proof and it will appear here while a
            verifier reviews it.{" "}
            <Link to="/create" className="font-semibold text-primary hover:underline">
              Create a request
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default MyRequestsList;
