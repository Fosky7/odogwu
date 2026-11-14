import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. What a pledge means",
    paragraphs: [
      "A pledge is your commitment to give a specific amount towards a specific verified bill. The amount is taken at checkout through our payment partner, so a pledge is only recorded once the payment has actually cleared.",
    ],
  },
  {
    heading: "2. Where the money sits",
    paragraphs: [
      "Pledged money is held by Odogwu until the bill is fully funded. Once it is, we pay the provider directly (hospital, school, landlord or utility) or release the funds to the beneficiary's verified bank account where direct payment is not possible.",
    ],
  },
  {
    heading: "3. When a bill is not fully funded",
    paragraphs: [
      "If a bill does not reach its target before its closing date, or if verification fails after pledges have been taken, donors are refunded to the original payment method within ten business days. We email every donor before that happens.",
    ],
  },
  {
    heading: "4. When we refund",
    bullets: [
      "A duplicate or accidental charge — refunded in full.",
      "A payment you did not authorise — refunded once the investigation confirms it.",
      "A bill that turns out to be cancelled, already settled, or materially different from what was described.",
      "A change of mind reported within 24 hours, where the bill has not yet been funded or paid out.",
    ],
  },
  {
    heading: "5. When we cannot refund",
    paragraphs: [
      "Once a bill has been paid out and the receipt issued, the money has left the platform and reached the provider, so a change of mind can no longer be refunded. Refunds are also not available where the pledge was made fraudulently.",
    ],
  },
  {
    heading: "6. Fees",
    paragraphs: [
      "Odogwu does not charge donors a platform fee. Where a payment processor charges for handling a card transaction, that fee is shown at checkout before you confirm, and it is never deducted from the bill you are funding.",
    ],
  },
  {
    heading: "7. Chargebacks and reversed payments",
    paragraphs: [
      "If a payment is reversed by the bank or card issuer, the related receipt is voided and the amount is removed from the bill's funding total. We may ask you for information before restoring the pledge.",
    ],
  },
  {
    heading: "8. Failed payments",
    paragraphs: [
      "A pledge that fails at checkout creates no commitment and no receipt. You can retry with the same or a different payment method at any time while the bill is open.",
    ],
  },
];

function DonationRefundPolicyPage() {
  return (
    <LegalDocument
      title="Donation & Refund Policy"
      eyebrow="Pledges"
      lastUpdated="1 February 2025"
      intro="How pledges are held, when money is released to a beneficiary or a provider, and exactly when a donation is returned to the donor."
      sections={sections}
      contactNote="Include your receipt reference so we can find the pledge immediately."
    />
  );
}

export const Route = createFileRoute("/legal/donations")({
  component: DonationRefundPolicyPage,
});
