import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. What this policy covers",
    paragraphs: [
      "This policy explains how Odogwu collects, uses and protects personal data when you visit the site, create an account, pledge towards a bill, or submit a bill for verification. It is written to align with the Nigeria Data Protection Act 2023.",
    ],
  },
  {
    heading: "2. What we collect",
    bullets: [
      "Account details: your name, email address and a securely hashed password.",
      "Bill details: the beneficiary name, the amount owed, the provider, supporting documents and the story you choose to publish.",
      "Pledge details: the amount, the bill it supports and the reference our payment partner returns. We never see or store your full card number.",
      "Technical data: device type, browser, approximate location and pages visited, used to keep the platform fast and safe.",
    ],
  },
  {
    heading: "3. How we use your data",
    bullets: [
      "To verify bills and publish them on the feed.",
      "To process pledges, issue receipts and show funding totals.",
      "To detect fraud, duplicate bills and payment abuse.",
      "To answer support, legal and privacy questions.",
      "To meet our record-keeping and tax obligations.",
    ],
  },
  {
    heading: "4. Lawful bases",
    paragraphs: [
      "We rely on contract where the processing is needed to run your pledge or your bill, on legal obligation for financial records, on legitimate interests for fraud prevention and platform security, and on your consent for anything optional such as product updates.",
    ],
  },
  {
    heading: "5. Who we share with",
    paragraphs: [
      "We share the minimum necessary data with the payment processor that takes pledges, with hosting and monitoring providers that run the site, and with the reviewers who verify bills. We do not sell personal data, and we do not share your contact details with other donors or beneficiaries.",
    ],
  },
  {
    heading: "6. What is public by design",
    paragraphs: [
      "A published bill is public: its beneficiary first name, amount, verified status, story and funding total are visible to everyone, because that is what lets donors trust the platform. Never put information in a bill story that you would not want publicly read.",
    ],
  },
  {
    heading: "7. How long we keep data",
    paragraphs: [
      "We keep account data while your account is open. Pledge and payout records are kept for seven years to satisfy financial record-keeping rules. Verification documents are kept only as long as needed to defend a bill and are then deleted or anonymised.",
    ],
  },
  {
    heading: "8. Your rights",
    bullets: [
      "Ask for a copy of the personal data we hold about you.",
      "Correct anything inaccurate, or ask us to delete data we no longer need.",
      "Object to processing based on legitimate interests.",
      "Withdraw consent for optional communications at any time.",
      "Complain to the Nigeria Data Protection Commission if we do not resolve your concern.",
    ],
  },
  {
    heading: "9. How we protect data",
    paragraphs: [
      "Data is encrypted in transit, access is limited to the people who need it, and administrative actions are logged. If a breach affects your rights we will notify you and the regulator without undue delay.",
    ],
  },
  {
    heading: "10. Children",
    paragraphs: [
      "Odogwu is not for children. A bill for a child's hospital treatment or school fees is submitted and managed by a parent or guardian who holds the account.",
    ],
  },
];

function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      eyebrow="Privacy"
      lastUpdated="1 February 2025"
      intro="What we collect, why we collect it, who we share it with, and the choices you have over your own data on Odogwu."
      sections={sections}
      contactNote="Write to our data protection contact for access, correction or deletion requests."
    />
  );
}

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPolicyPage,
});
