import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. Accepting these terms",
    paragraphs: [
      "These terms are the agreement between you and Odogwu when you browse the feed, pledge money towards a bill, or ask us to publish a bill of your own. By using the platform you accept them in full.",
      "If you do not accept these terms, please stop using Odogwu. If you are using Odogwu on behalf of an organisation, you confirm you are allowed to accept these terms for that organisation.",
    ],
  },
  {
    heading: "2. Who can use Odogwu",
    bullets: [
      "You must be at least 18 years old and legally able to enter a binding agreement.",
      "Donors must pledge with a payment method that belongs to them, or that they are authorised to use.",
      "Beneficiaries must own the bill they submit, or have written authority from the person who owns it.",
      "Beneficiaries must be able to receive funds into a Nigerian bank account in their own name.",
    ],
  },
  {
    heading: "3. How a bill becomes verified",
    paragraphs: [
      "Every bill is reviewed by a person before it appears on the feed. We ask for the documents behind the bill — for example a hospital statement, a school fee invoice, a tenancy demand or a utility bill — and we check that the amount, the beneficiary and the provider match.",
      "Verification is a good-faith check on the evidence available to us. It is not a guarantee, a credit rating or an audit of the beneficiary, so please read each bill carefully before you pledge.",
    ],
  },
  {
    heading: "4. Pledges, payments and receipts",
    paragraphs: [
      "A pledge is a commitment to give the amount you enter at checkout. Payments are processed by our payment partner, and no money is taken unless the checkout completes successfully.",
      "A receipt is issued only when the money has actually cleared. The receipt shows the amount, the reference and the bill it counts towards, and that amount is added to the bill's funding total.",
      "Funds for a bill that is still short of its target are held by Odogwu and released to the beneficiary once the bill is fully funded, or returned under the Donation & Refund Policy if it is not.",
    ],
  },
  {
    heading: "5. What we expect from beneficiaries",
    bullets: [
      "Use the funds only for the bill you submitted — never for a different purpose.",
      "Post honest updates, and tell us immediately if the bill is cancelled, reduced or paid by someone else.",
      "Cooperate with our verification and audit requests, including proof of settlement from the hospital, school, landlord or utility.",
      "Return any overpayment or misapplied funding when we ask for it.",
    ],
  },
  {
    heading: "6. Content you post",
    paragraphs: [
      "You keep ownership of the story, photos and documents you upload. You give Odogwu a licence to display them next to your bill so donors can see what they are funding, and to keep a record for audit purposes.",
      "Do not upload another person's private information, medical records or identity documents unless they have agreed and it is needed to verify the bill.",
    ],
  },
  {
    heading: "7. Prohibited use",
    bullets: [
      "Submitting a fake, inflated or duplicated bill, or inventing a beneficiary.",
      "Collecting pledges for a purpose other than the verified bill, or for anything illegal.",
      "Harassing donors or beneficiaries, or pressuring anyone for more money after a bill clears.",
      "Attempting to break, scrape, overload or reverse engineer the platform or its payment flow.",
    ],
  },
  {
    heading: "8. Suspension and removal",
    paragraphs: [
      "We may pause a bill, hide a story, or suspend an account while we investigate a complaint, a suspicious payment or a verification failure. Where money is involved we will tell you what happens next and, when appropriate, return it to donors.",
    ],
  },
  {
    heading: "9. Liability and governing law",
    paragraphs: [
      "Odogwu is provided as-is. To the extent the law allows, we are not liable for indirect losses, and our total liability for any claim is limited to the amount you pledged or received through the platform in the twelve months before the claim.",
      "These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Lagos State have jurisdiction over any dispute.",
    ],
  },
  {
    heading: "10. Changes to these terms",
    paragraphs: [
      "We update these terms when the product or the law changes. Material changes are announced on this page with a new date, and continued use after that date means you accept the update.",
    ],
  },
];

function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      eyebrow="Legal"
      lastUpdated="1 February 2025"
      intro="These terms explain how Odogwu verifies bills, handles pledges and releases money, and what we expect from every donor and every beneficiary on the platform."
      sections={sections}
    />
  );
}

export const Route = createFileRoute("/legal/terms")({
  component: TermsOfServicePage,
});
