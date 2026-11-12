import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReceiptCard, type ReceiptCardData } from "@/components/ReceiptCard";
import { getReceipt, getReceiptsSnapshot } from "@/services/pledges";

export const Route = createFileRoute("/receipt/$id")({
  head: () => ({
    meta: [
      { title: "Payment receipt \u2014 Odogwu" },
      {
        name: "description",
        content:
          "Your payment receipt for a pledge made on Odogwu, including amount, reference and bill.",
      },
    ],
  }),
  component: ReceiptPage,
});

/**
 * Resolve the receipt shown for the `$id` segment.
 *
 * A dashboard pledge row links with the quotable payment reference, while a
 * freshly settled pledge links with the receipt id, so both are accepted. If the
 * reference is unknown the card still renders (with the reference echoed) so
 * "View receipt" is never a dead end.
 */
function resolveReceipt(id: string): ReceiptCardData {
  const direct = getReceipt(id);
  if (direct) return direct;

  const reference = String(id ?? "").trim();
  const matched = getReceiptsSnapshot().find(
    (receipt) => receipt.id === reference || receipt.reference === reference,
  );
  if (matched) return matched;

  return {
    id: reference || "unknown",
    amount: 0,
    reference: reference || "unknown",
    donorName: "Anonymous donor",
    paidAt: null,
    causeId: "1",
  };
}

function ReceiptPage() {
  const { id } = Route.useParams();
  const receipt = resolveReceipt(id);
  const causeId = receipt.causeId ?? "1";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <a
          href={`/cause/${causeId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Back to cause
        </a>
      </div>

      <ReceiptCard receipt={receipt} />
    </main>
  );
}
